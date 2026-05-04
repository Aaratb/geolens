/**
 * GET /api/v1/scans/[id]/stream — Server-Sent Events.
 *
 * Polls scan_events for new rows since the client's lastEventId and pushes
 * them as SSE messages. Closes the stream when scan.completed is observed,
 * or when the scan transitions to failed.
 *
 * On reconnect, the browser sends Last-Event-ID; we resume from there so no
 * events are dropped or duplicated.
 */
import { and, eq, gt, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scanEvents, scans } from "@/lib/db/schema";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_POLLS_WITHOUT_EVENT = 600; // ~5 minutes of silence then we give up

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: scanId } = await params;

  // Verify scan exists; otherwise 404 immediately
  const [scan] = await db.select({ id: scans.id, status: scans.status }).from(scans).where(eq(scans.id, scanId)).limit(1);
  if (!scan) {
    return new Response("not found", { status: 404 });
  }

  const lastEventIdHeader = req.headers.get("last-event-id");
  let cursor = lastEventIdHeader ? BigInt(lastEventIdHeader) : 0n;

  const encoder = new TextEncoder();
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (id: bigint, type: string, data: unknown) => {
        const payload = `id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };
      const sendComment = (text: string) => controller.enqueue(encoder.encode(`: ${text}\n\n`));

      let lastHeartbeat = Date.now();
      let pollsWithoutEvent = 0;
      let done = false;

      // If the scan has already completed before the client connected, we
      // still flush all events from cursor=0 and close cleanly.
      try {
        while (!done && !abortController.signal.aborted) {
          const rows = await db
            .select({
              id: scanEvents.id,
              eventType: scanEvents.eventType,
              payload: scanEvents.payload,
            })
            .from(scanEvents)
            .where(and(eq(scanEvents.scanId, scanId), gt(scanEvents.id, cursor)))
            .orderBy(asc(scanEvents.id))
            .limit(100);

          if (rows.length > 0) {
            pollsWithoutEvent = 0;
            for (const r of rows) {
              sendEvent(r.id, r.eventType, r.payload);
              cursor = r.id;
              if (r.eventType === "scan.completed" || r.eventType === "scan.failed") {
                done = true;
                break;
              }
            }
          } else {
            pollsWithoutEvent += 1;
            if (pollsWithoutEvent >= MAX_POLLS_WITHOUT_EVENT) {
              sendEvent(cursor, "scan.timeout", { reason: "no events for 5 minutes" });
              done = true;
              break;
            }
          }

          // Heartbeat to keep proxies from dropping the connection
          if (Date.now() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
            sendComment("keepalive");
            lastHeartbeat = Date.now();
          }

          if (!done) {
            await sleep(POLL_INTERVAL_MS, abortController.signal);
          }
        }
      } catch (err) {
        console.error(`[stream ${scanId}]`, err);
        const message = err instanceof Error ? err.message : "stream error";
        sendEvent(cursor, "scan.failed", { stage: "stream", reason: message });
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(() => resolve(), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
