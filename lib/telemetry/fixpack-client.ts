import { z } from "zod";

export const FIX_PACK_CLIENT_EVENTS = [
  "fixpack.cta.clicked",
  "fixpack.prompt.copied",
  "fixpack.install.viewed",
] as const;

export const FixPackClientTelemetryBody = z
  .object({
    event: z.enum(FIX_PACK_CLIENT_EVENTS),
    scanId: z.string().uuid().optional(),
    fixPackId: z.string().uuid().optional(),
    status: z.enum(["not_generated", "generating", "completed", "failed"]).optional(),
    source: z.enum(["scan_report", "fix_pack_page", "agent_panel", "install_panel"]).optional(),
    action: z
      .enum(["open", "sign_in", "generate", "copy_prompt", "download", "view_install"])
      .optional(),
  })
  .strict();

export type FixPackClientTelemetryInput = z.infer<typeof FixPackClientTelemetryBody>;

export function buildFixPackClientTelemetryProps(
  input: FixPackClientTelemetryInput,
): Record<string, unknown> {
  return {
    ...(input.scanId ? { scanId: input.scanId } : {}),
    ...(input.fixPackId ? { fixPackId: input.fixPackId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.action ? { action: input.action } : {}),
  };
}
