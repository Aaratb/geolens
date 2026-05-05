import { z } from "zod";

// Note: optional fields use `.nullable()` (not `.optional()`) because the LLM
// schema goes through OpenAI's strict-JSON-schema mode via the AI Gateway.
// Strict mode requires every property key to appear in `required`, so the
// model must always emit the key — `null` is the agreed "absent" sentinel.
// `.optional()` produces a JSON Schema without the key in `required`, which
// OpenAI rejects as "Invalid schema for response_format".
export const FixPackCardSchema = z.object({
  findingId: z.string().uuid().nullable(),
  displayId: z.string().min(1).max(24),
  title: z.string().min(1).max(160),
  severity: z.enum(["critical", "high", "medium", "low"]),
  confidence: z.enum(["high", "medium", "low"]),
  observedEvidence: z.string().min(1).max(1200),
  recommendedChange: z.string().min(1).max(1200),
  assetKind: z.enum(["llms_txt", "metadata", "schema", "content_brief", "technical_checklist"]),
  // Download/render as text. Do not render AI-authored assets as trusted HTML.
  assetText: z.string().min(1).max(6000),
  checklist: z.array(z.string().min(1).max(300)).min(2).max(6),
  validationSteps: z.array(z.string().min(1).max(300)).min(1).max(6),
  caveat: z.string().min(1).max(500).nullable(),
});

export const FixPackPayloadSchema = z.object({
  cards: z.array(FixPackCardSchema).length(3),
  prompt: z.string().min(1).max(8000),
  // Download/render as text. Do not render AI-authored Markdown as trusted HTML.
  agentMarkdown: z.string().min(1).max(20_000),
  install: z.object({
    claudeCode: z.string().min(1).max(1000),
    cursor: z.string().min(1).max(1000),
    agentsMd: z.string().min(1).max(1000),
  }),
  caveats: z.array(z.string().min(1).max(500)).min(1).max(5),
});

export type FixPackCard = z.infer<typeof FixPackCardSchema>;
export type FixPackPayload = z.infer<typeof FixPackPayloadSchema>;

export function parseFixPackPayload(payload: unknown): FixPackPayload {
  return FixPackPayloadSchema.parse(payload);
}
