/**
 * POST /api/v1/scans
 *
 * Validates the URL, rate-limits the caller, inserts a `queued` scan row,
 * spawns the async scan worker (fire-and-forget), and returns { scanId }.
 *
 * The function stays alive (up to maxDuration) until the spawned worker
 * resolves, so Vercel doesn't cancel the in-flight scan. Events are written
 * to scan_events as they happen; the SSE endpoint consumes from there.
 */
import { NextResponse, type NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { scans } from "@/lib/db/schema";
import { runScan } from "@/lib/scan/run";
import { setScanFailed } from "@/lib/scan/persist";
import { canonicalUrlKey } from "@/lib/crawl";
import { normalizeUrl } from "@/lib/crawl/url";
import { extractIp, hashIp, limitScan } from "@/lib/rate-limit";
import { ensureUserSynced, getCurrentUser } from "@/lib/auth/current-user";
import { track } from "@/lib/telemetry/track";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (err) {
    // Never bubble an unhandled exception out as an empty 500 — the landing
    // form interprets any non-JSON 500 as "Network error" and confuses users.
    console.error("[POST /api/v1/scans] unhandled", err);
    return NextResponse.json(
      { error: "internal_error", message: "Could not start scan. Please try again." },
      { status: 500 },
    );
  }
}

async function handlePost(req: NextRequest) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const normalized = normalizeUrl(payload.url);
  if (!normalized) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const user = await getCurrentUser();
  // Mirror the Clerk session into our local users table so the FK on
  // scans.user_id always resolves, even if the Clerk webhook is misconfigured
  // or hasn't fired yet for this account.
  if (user) {
    try {
      await ensureUserSynced(user);
    } catch (err) {
      console.error("[POST /api/v1/scans] ensureUserSynced failed", err);
      // Fall through — we'll insert the scan as anonymous below if FK fails.
    }
  }
  const ip = extractIp(req.headers);
  const ipHash = hashIp(ip);

  const limit = await limitScan(
    user ? { kind: "user", userId: user.id } : { kind: "ip", ipHash },
  );
  if (!limit.ok) {
    track({
      event: "rate.limit.tripped",
      userId: user?.id ?? null,
      props: { route: "POST /scans", anonymous: !user },
    });
    return NextResponse.json(
      {
        error: "rate_limited",
        limit: limit.limit,
        remaining: limit.remaining,
        reset: limit.reset,
        message: user
          ? "You've hit your daily scan quota. Try again tomorrow."
          : "Anonymous scan quota reached for this IP. Sign in for a higher limit.",
      },
      { status: 429, headers: { "retry-after": String(Math.max(1, Math.floor((limit.reset - Date.now()) / 1000))) } },
    );
  }

  const url = normalized;
  const hostname = new URL(url).hostname;
  const urlHash = canonicalUrlKey(url);

  const [inserted] = await db
    .insert(scans)
    .values({
      userId: user?.id ?? null,
      ipHash,
      url,
      urlHash,
      hostname,
      status: "queued",
    })
    .returning({ id: scans.id });

  if (!inserted) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const scanId = inserted.id;

  track({
    event: "scan.started",
    userId: user?.id ?? null,
    props: { scanId, hostname, anonymous: !user },
  });

  // Spawn the worker behind waitUntil() so Vercel keeps the instance alive
  // until the scan completes. Without this, the platform may freeze or evict
  // the function after the response is returned, killing in-flight scans.
  // (Phase 7 review: ARCH-S-1 / REL-C-1)
  waitUntil(
    runScan({ scanId, url }).catch(async (err) => {
      console.error(`[scan ${scanId}] run failed`, err);
      try {
        await setScanFailed(scanId, "uncaught-error");
      } catch (persistErr) {
        console.error(`[scan ${scanId}] failed to persist failure state`, persistErr);
      }
    }),
  );

  return NextResponse.json({ scanId, url }, { status: 202 });
}
