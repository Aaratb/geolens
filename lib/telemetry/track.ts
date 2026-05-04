/**
 * Fire-and-forget telemetry helper. Writes a row to the `events` table
 * without blocking the caller (uses void on the promise so async errors
 * don't propagate up to the user-facing path).
 *
 * Event taxonomy from PRD §12 + spec §10. Keep names dot-separated and
 * stable; UIs and dashboards will key on them.
 */
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema";

export type TelemetryEvent =
  | "scan.started"
  | "scan.completed"
  | "scan.failed"
  | "scan.section.rendered"
  | "signin.wall.shown"
  | "signin.completed"
  | "gap.cta.clicked"
  | "waitlist.joined"
  | "share.link.created"
  | "share.link.opened"
  | "fixpack.cta.clicked"
  | "fixpack.waitlist.clicked"
  | "fixpack.generation.started"
  | "fixpack.generation.completed"
  | "fixpack.generation.failed"
  | "fixpack.prompt.copied"
  | "fixpack.agent.downloaded"
  | "fixpack.install.viewed"
  | "cost.fixpack"
  | "pdf.export.started"
  | "pdf.export.queued"
  | "rate.limit.tripped"
  | "cost.scan"
  | "error.api";

interface TrackInput {
  event: TelemetryEvent;
  userId?: string | null;
  anonId?: string | null;
  props?: Record<string, unknown>;
}

export function track(input: TrackInput): void {
  // Fire-and-forget — never await, never throw.
  void db
    .insert(events)
    .values({
      userId: input.userId ?? null,
      anonId: input.anonId ?? null,
      event: input.event,
      props: input.props ?? null,
    })
    .catch((err) => {
      console.warn("[telemetry] write failed", input.event, err);
    });
}
