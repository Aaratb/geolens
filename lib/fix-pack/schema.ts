import { z } from "zod";

export const FixPackCardSchema = z.object({
  findingId: z.string().uuid().optional(),
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
  caveat: z.string().min(1).max(500).optional(),
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
