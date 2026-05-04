/**
 * AEO probe types. Mirrors lib/db/schema.ts so the orchestrator can persist
 * probes without remapping shape.
 */
import type { Engine, ProbeKind, ProbeStatus, Position, Sentiment, Accuracy } from "@/lib/db/schema";

export type { Engine, ProbeKind, ProbeStatus, Position, Sentiment, Accuracy };

/** Default model per engine. Override via ENGINE_MODEL_MAP env if needed. */
export const DEFAULT_MODEL_PER_ENGINE: Record<Engine, string> = {
  openai: "openai/gpt-4o-mini",
  anthropic: "anthropic/claude-3-5-haiku-latest",
  perplexity: "perplexity/sonar", // Sonar has built-in web search — essential for AEO probes
  gemini: "google/gemini-2.0-flash",
};

/** The cheap parser model used to convert prose responses to structured fields. */
export const PARSER_MODEL = "openai/gpt-4o-mini";

export interface ProbeInput {
  scanId: string;
  engine: Engine;
  probeKind: ProbeKind;
  /** The actual prompt sent to the engine. */
  prompt: string;
  /** The brand name we're looking for in the response. */
  brandName: string;
  /** The hostname we're checking citation for. */
  hostname: string;
  /** Per-call timeout (default 25s per spec §5). */
  timeoutMs?: number;
}

export interface ParsedProbeFields {
  brandMentioned: boolean;
  urlCited: boolean;
  position: Position;
  sentiment: Sentiment;
  accuracy: Accuracy;
}

export interface ProbeResult {
  scanId: string;
  engine: Engine;
  probeKind: ProbeKind;
  prompt: string;
  response: string | null;
  parsed: ParsedProbeFields | null;
  baseScore: number; // 0-100 before multipliers
  weightedScore: number; // 0-100 after Position × Sentiment × Accuracy
  latencyMs: number;
  costCents: number;
  status: ProbeStatus;
  error?: string;
}

export interface BrandContext {
  brandName: string;
  category: string;
  hostname: string;
  /** True if either field was inferred via LLM fallback (not heuristics). */
  llmFallback: boolean;
}
