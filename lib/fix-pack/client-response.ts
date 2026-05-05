import { z } from "zod";
import { FixPackPayloadSchema } from "./schema";

export const FixPackUiStatusSchema = z.enum(["not_generated", "generating", "completed", "failed"]);

const CompletedFixPackSchema = FixPackPayloadSchema.extend({
  id: z.string().uuid(),
  version: z.string().min(1),
});

export const FixPackStatusResponseSchema = z.object({
  eligible: z.literal(true),
  status: FixPackUiStatusSchema,
  fixPack: CompletedFixPackSchema.nullable(),
});

export const FixPackGenerateResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    status: z.enum(["completed", "generating"]),
    fixPackId: z.string().uuid(),
  }),
  z.object({
    error: z.string().min(1),
    reason: z.string().optional(),
    message: z.string().optional(),
  }),
]);

export type FixPackStatusResponse = z.infer<typeof FixPackStatusResponseSchema>;
export type FixPackGenerateResponse = z.infer<typeof FixPackGenerateResponseSchema>;

export function parseFixPackStatusResponse(input: unknown): FixPackStatusResponse {
  return FixPackStatusResponseSchema.parse(input);
}

export function parseFixPackGenerateResponse(input: unknown): FixPackGenerateResponse {
  return FixPackGenerateResponseSchema.parse(input);
}
