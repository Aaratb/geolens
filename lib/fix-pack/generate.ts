import { generateText, Output } from "ai";
import { PARSER_MODEL } from "@/lib/audits/aeo/types";
import { modelFor } from "@/lib/ai/gateway";
import { buildFixPackPrompt, FIX_PACK_SYSTEM_PROMPT, type FixPackPromptInput } from "./prompt";
import { FixPackPayloadSchema, parseFixPackPayload, type FixPackPayload } from "./schema";

const FIX_PACK_MAX_OUTPUT_TOKENS = 4000;

export interface FixPackGeneratorArgs {
  model: string;
  system: string;
  prompt: string;
  timeoutMs: number;
}

export interface FixPackGeneratorResult {
  payload: unknown;
  usage: { tokens: number };
}

export interface GenerateFixPackOptions {
  /**
   * Internal override for tests or controlled rollout only. Never derive this
   * from HTTP input; production model selection must stay server-owned.
   */
  model?: string;
  timeoutMs?: number;
  generator?: (args: FixPackGeneratorArgs) => Promise<FixPackGeneratorResult>;
}

export interface GeneratedFixPack {
  payload: FixPackPayload;
  prompt: string;
  model: string;
  costCents: number;
}

export async function generateFixPackPayload(
  input: FixPackPromptInput,
  opts: GenerateFixPackOptions = {},
): Promise<GeneratedFixPack> {
  const model = opts.model ?? PARSER_MODEL;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const prompt = buildFixPackPrompt(input);
  const generator = opts.generator ?? defaultGenerator;
  const result = await generator({
    model,
    system: FIX_PACK_SYSTEM_PROMPT,
    prompt,
    timeoutMs,
  });

  return {
    payload: parseFixPackPayload(result.payload),
    prompt,
    model,
    costCents: estimateFixPackCostCents(model, result.usage.tokens),
  };
}

async function defaultGenerator(args: FixPackGeneratorArgs): Promise<FixPackGeneratorResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);

  try {
    const result = await generateText({
      model: modelFor(args.model),
      system: args.system,
      prompt: args.prompt,
      output: Output.object({
        schema: FixPackPayloadSchema,
        name: "geolens_fix_pack",
      }),
      abortSignal: controller.signal,
      maxOutputTokens: FIX_PACK_MAX_OUTPUT_TOKENS,
    });

    return {
      payload: result.output,
      usage: { tokens: result.usage?.totalTokens ?? 0 },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function estimateFixPackCostCents(model: string, totalTokens: number): number {
  // Cents per 1,000 total tokens, using conservative blended estimates.
  const ratesPer1k: Record<string, number> = {
    "openai/gpt-4o-mini": 0.06,
    "anthropic/claude-3-5-haiku-latest": 0.1,
    "google/gemini-2.0-flash": 0.04,
  };
  const rate = ratesPer1k[model];
  if (rate === undefined) {
    console.warn("[fix-pack] unknown model cost rate, using fallback", model);
  }
  const effectiveRate = rate ?? 0.1;
  return Math.ceil((totalTokens / 1000) * effectiveRate);
}
