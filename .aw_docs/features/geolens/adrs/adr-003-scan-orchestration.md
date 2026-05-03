# ADR-003: Scan orchestration — streaming Route Handlers + Promise.allSettled + Redis pub/sub

- **Status:** accepted (Phase 5)
- **Date:** 2026-05-04

## Context

A GEOlens scan does this within ~90s p95:
- Crawl 1–6 URLs (homepage + up to 5 internal pages)
- Run Google PageSpeed Insights against each page (~5–10s per page)
- Run 4 LLM engines × 3 probe prompts = 12 parallel LLM calls (~5–25s each)
- Run static AEO hygiene checks against each fetched HTML
- Compute citability metrics
- Score, rank gaps, persist findings

We need to:
1. **Stream results to the browser** as each section completes (Direction A's signature UX, locked Phase 4)
2. **Survive client disconnects** — refresh, slow networks, multi-tab. The scan must not be tied to one connection.
3. **Stay within Vercel's function budget** — Pro plan caps at 300s per function. Plenty for 90s scans, but no headroom for hung LLMs.
4. **Cap cost** — $0.20/scan ceiling, $50/day global.

## Options considered

### Option A — Single streaming Route Handler (everything in one function)
- `POST /api/v1/scans` runs the whole scan, streams events via SSE in the response.
- **Pro:** simple, one process, no separate worker.
- **Con:** if the client disconnects, the scan dies. No durability. Multi-tab impossible.

### Option B — Spawn-and-detach Route Handler + SSE subscriber
- `POST /api/v1/scans` inserts a row, **spawns a fire-and-forget async worker**, returns `{ scanId }` immediately.
- Worker writes events to **Redis pub/sub channel `scan:<id>`** as it goes.
- `GET /api/v1/scans/:id/stream` is a separate SSE Route Handler that subscribes to that channel and forwards to the browser.
- **Pro:** durable. Client can reconnect, multi-tab, share-while-running. Worker doesn't care about client lifecycle.
- **Con:** two Route Handlers, more wiring, two open functions per active scan (one worker, one SSE).

### Option C — Vercel Workflow (durable agent runtime)
- Use the WDK to define the scan as a workflow with steps; Vercel runs it durably with retries and pause/resume.
- **Pro:** crash-safe, retries baked in, future-proof for the v1.5 fixer agent.
- **Con:** WDK adds a learning curve and surface area. v1 scans are 90s — durability across crashes is overkill. Better fit for the v1.5 agent.

### Option D — Background worker on a separate runtime (Inngest / QStash / SQS)
- Push scan job to a queue, separate worker processes it.
- **Pro:** clean separation; the orchestrator is dumb.
- **Con:** adds a vendor (Inngest/QStash) we don't otherwise need; complicates streaming (worker must publish back to Redis anyway).

## Decision

**Option B — Spawn-and-detach Route Handler + Redis pub/sub for streaming.**

We reserve **Option C (Vercel Workflow)** for the v1.5 fixer agent.

## Rationale

1. **Durability without a queue.** The Redis channel is the buffer. Worker writes events fire-and-forget; SSE handler subscribes when a client connects. No client connected? Events still hit Postgres (the durable record). Client connects late? It re-reads the persisted scan state and subscribes for new events.
2. **Multi-tab and reconnect for free.** Anyone with the `scanId` can listen. Useful for the share view (someone viewing a share URL while the scan finishes).
3. **Simple within Vercel constraints.** Both Route Handlers are vanilla Next.js with `runtime = 'nodejs'` and `maxDuration = 300`. No exotic infra.
4. **Cost shape is right.** The worker function runs ~90s per scan; the SSE function runs ~90s while a client is watching. At v1 scale, this fits under Pro plan's monthly function budget by a wide margin.
5. **WDK isn't needed yet.** Workflow shines when you need pause/resume, multi-day timers, or human-in-the-loop. Our scan finishes in 90s. We adopt WDK when the fixer agent requires it.

## Implementation

### `POST /api/v1/scans`

```ts
export const maxDuration = 300;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { url } = scanInputSchema.parse(await req.json());
  const auth = await getAuthOrAnon(req);

  // Rate limit
  const ok = await rateLimit.scan(auth);
  if (!ok) return new Response('rate limited', { status: 429 });

  // Insert scan row (status=queued)
  const scan = await db.insert(scans).values({...}).returning();

  // Fire-and-forget worker. Vercel keeps the function alive until this resolves
  // OR maxDuration expires.
  runScan({ scanId: scan.id, url, auth }).catch((err) => {
    captureException(err);
    db.update(scans).set({ status: 'failed' }).where(eq(scans.id, scan.id));
  });

  return Response.json({ scanId: scan.id }, { status: 202 });
}
```

### `runScan` (the worker, in `lib/scan/run.ts`)

- Parallel work via `Promise.allSettled([crawl(), psiAll(), aeoProbes(), hygieneAll()])`
- Each subtask publishes to `redis.publish('scan:<id>', JSON.stringify(event))` as it completes
- Each subtask also writes to Postgres for durability
- At the end: compute scores, rank gaps, mark `status=completed`, publish `scan.completed`

### `GET /api/v1/scans/:id/stream`

```ts
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: Request, { params }) {
  const { id } = await params;
  const stream = new ReadableStream({
    async start(controller) {
      // 1. Replay any persisted events so a late-joining client catches up
      const persisted = await getPersistedEvents(id);
      for (const e of persisted) controller.enqueue(sse(e));

      // 2. Subscribe to live events
      const sub = await redis.subscribe(`scan:${id}`, (msg) => {
        controller.enqueue(sse(JSON.parse(msg)));
        if (msg.includes('"scan.completed"')) {
          sub.unsubscribe();
          controller.close();
        }
      });

      req.signal.addEventListener('abort', () => {
        sub.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}
```

### Cost guards

- Pre-flight: `redis.get('geolens:spend:YYYY-MM-DD')` > daily ceiling? Then run the scan with engine probes set to `status=skipped` and emit a `scan.completed` with a banner finding explaining the trip.
- Per-engine timeout: 25s. On timeout, `status=errored`, scan continues.
- Per-scan ceiling: if the projected cost (estimated from token counts so far) crosses $0.20, drop from 3 probes per engine to 1.

### AI Gateway routing

All 4 engines route through Vercel AI Gateway for:
- Single key + observability
- Failover (if `gpt-4.1-mini` is rate-limited, retry against `gpt-4o-mini`)
- Per-key daily cost cap (defense-in-depth alongside our own budget guard)

If Gateway pricing or reliability changes, swap to direct provider calls — same `ai` SDK config, one env var flip.

## Consequences

### Positive
- Streaming UX from Phase 4 design ships without exotic infra
- Scans survive client disconnects
- Cost guards are layered (per-call timeout + per-scan ceiling + daily global)
- Future-proof: if a scan grows past 300s, we lift it into Vercel Workflow without rewriting the scoring logic

### Negative / Risks
- Two simultaneous functions (worker + SSE) per active scan double our function-time spend
  - Mitigation: SSE function exits as soon as `scan.completed` fires; the bulk of the time is the worker
- Redis pub/sub messages are not durable across server restarts — we depend on persisted Postgres state for replay
  - Mitigation: every event is mirrored to Postgres before publish; replay-from-DB on subscribe handles it
- Fire-and-forget worker exception swallowed if not caught
  - Mitigation: `.catch()` always present; Sentry via Vercel integration

## Future evolution

- **v1.5 fixer agent:** runs as a **Vercel Workflow** using the same scoring/findings persistence; emits the same SSE events to a similar UI.
- **Scaling past 300s scans:** if we add deep crawls or video transcript audits later, lift the worker out of the Route Handler into Workflow.
- **Eviction policy:** anonymous scans purged after 30 days; signed-in scans retained indefinitely until user deletes.
