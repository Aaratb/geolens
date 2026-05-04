/**
 * AEO probe orchestrator. Runs 4 engines × 3 probes (12 calls) in parallel,
 * parses each, scores it, and returns ProbeResult[].
 *
 * Cost guards (spec §5):
 *   - Per-call timeout (default 25s)
 *   - Per-call cost estimate logged for budget aggregation
 *   - Promise.allSettled so one engine outage doesn't tank the scan
 */
import { generateText } from "ai";
import { ENGINES, PROBE_KINDS, type Engine, type ProbeKind } from "@/lib/db/schema";
import { modelFor } from "@/lib/ai/gateway";
import { buildPrompt } from "./prompts";
import { parseProbeResponse } from "./parse";
import { applyMultipliers, baseScoreFor } from "./score";
import { DEFAULT_MODEL_PER_ENGINE, type BrandContext, type ProbeResult } from "./types";

interface RunOptions {
  scanId: string;
  ctx: BrandContext;
  /** Override the model per engine (for testing or upgrades). */
  modelMap?: Partial<Record<Engine, string>>;
  /** Per-call timeout in ms. Default 25_000. */
  timeoutMs?: number;
  /** Override which engines to probe. Defaults to all four. */
  engines?: readonly Engine[];
  /** Override which probe kinds to run. Defaults to all three. */
  probeKinds?: readonly ProbeKind[];
  /**
   * Hook called after each probe completes. Used by the orchestrator to push
   * SSE events as each engine finishes (vs waiting for all 12). May be async;
   * the runner awaits the returned promise so failures (e.g. sink.publish
   * dropping) are surfaced rather than silently swallowed.
   * (Phase 7 review: TS-H-1)
   */
  onProbeComplete?: (probe: ProbeResult) => void | Promise<void>;
  /**
   * Test override: replace generateText with a stub. When provided, no real
   * API calls are made.
   */
  generator?: (args: GeneratorArgs) => Promise<{ text: string; usage: { tokens: number } }>;
  /**
   * Test override for the parser. When provided, no real parser API calls
   * are made.
   */
  parser?: Parameters<typeof parseProbeResponse>[0]["parser"];
}

export interface GeneratorArgs {
  engine: Engine;
  model: string;
  prompt: string;
  timeoutMs: number;
}

export async function runAeoProbes(opts: RunOptions): Promise<ProbeResult[]> {
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const modelMap: Record<Engine, string> = { ...DEFAULT_MODEL_PER_ENGINE, ...opts.modelMap };
  const generator = opts.generator ?? defaultGenerator;
  const engines = opts.engines ?? ENGINES;
  const probeKinds = opts.probeKinds ?? PROBE_KINDS;

  // Each task carries its own (engine, probeKind) so the error path can read
  // them from the closure rather than reconstructing via index arithmetic.
  // (Phase 7 review: TS-H-3)
  const tasks: { engine: Engine; probeKind: ProbeKind; promise: Promise<ProbeResult> }[] = [];
  for (const engine of engines) {
    for (const probeKind of probeKinds) {
      tasks.push({
        engine,
        probeKind,
        promise: runOneProbe({
          scanId: opts.scanId,
          engine,
          probeKind,
          ctx: opts.ctx,
          model: modelMap[engine],
          timeoutMs,
          generator,
          parser: opts.parser,
          onComplete: opts.onProbeComplete,
        }),
      });
    }
  }

  const settled = await Promise.allSettled(tasks.map((t) => t.promise));
  return settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const t = tasks[i]!;
    return {
      scanId: opts.scanId,
      engine: t.engine,
      probeKind: t.probeKind,
      prompt: "",
      response: null,
      parsed: null,
      baseScore: 0,
      weightedScore: 0,
      latencyMs: 0,
      costCents: 0,
      status: "errored",
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    } satisfies ProbeResult;
  });
}

interface RunOneOpts {
  scanId: string;
  engine: Engine;
  probeKind: ProbeKind;
  ctx: BrandContext;
  model: string;
  timeoutMs: number;
  generator: (args: GeneratorArgs) => Promise<{ text: string; usage: { tokens: number } }>;
  parser?: Parameters<typeof parseProbeResponse>[0]["parser"];
  onComplete?: (probe: ProbeResult) => void | Promise<void>;
}

async function runOneProbe(opts: RunOneOpts): Promise<ProbeResult> {
  const start = Date.now();
  const prompt = buildPrompt(opts.probeKind, opts.ctx);

  let result: ProbeResult;
  try {
    const { text, usage } = await opts.generator({
      engine: opts.engine,
      model: opts.model,
      prompt,
      timeoutMs: opts.timeoutMs,
    });

    const parsed = await parseProbeResponse({
      ctx: opts.ctx,
      responseText: text,
      parser: opts.parser,
    });

    const base = baseScoreFor(opts.probeKind, parsed);
    const weighted = applyMultipliers(base, parsed);

    result = {
      scanId: opts.scanId,
      engine: opts.engine,
      probeKind: opts.probeKind,
      prompt,
      response: text,
      parsed,
      baseScore: base,
      weightedScore: weighted,
      latencyMs: Date.now() - start,
      costCents: estimateCostCents(opts.model, usage.tokens),
      status: "ok",
    };
  } catch (err) {
    result = {
      scanId: opts.scanId,
      engine: opts.engine,
      probeKind: opts.probeKind,
      prompt,
      response: null,
      parsed: null,
      baseScore: 0,
      weightedScore: 0,
      latencyMs: Date.now() - start,
      costCents: 0,
      status: "errored",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Await so async sinks (Postgres event publish in production) can fail
  // loudly instead of silently dropping events. (Phase 7 review: TS-H-1)
  await opts.onComplete?.(result);
  return result;
}

async function defaultGenerator(
  args: GeneratorArgs,
): Promise<{ text: string; usage: { tokens: number } }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const result = await generateText({
      model: modelFor(args.model),
      prompt: args.prompt,
      abortSignal: controller.signal,
      maxOutputTokens: 800,
    });
    const tokens = (result.usage?.totalTokens ?? 0);
    return { text: result.text, usage: { tokens } };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Rough cost estimate per call. Uses publicly listed prices for the default
 * mid-tier models. Off by a multiplier is fine for budget guard purposes.
 */
function estimateCostCents(model: string, totalTokens: number): number {
  // Cents per 1k tokens. Conservative upper bounds for "small" tier models.
  const ratesPer1k: Record<string, number> = {
    "openai/gpt-4o-mini": 0.06,
    "anthropic/claude-3-5-haiku-latest": 0.1,
    "perplexity/sonar": 0.05,
    "google/gemini-2.0-flash": 0.04,
  };
  const rate = ratesPer1k[model] ?? 0.1; // fallback: 1 cent per 1k
  return Math.ceil((totalTokens / 1000) * rate);
}

export const __testing = { estimateCostCents };
