/**
 * GET /api/internal/cleanup — daily Vercel Cron
 *
 * Deletes anonymous scans older than 30 days (PRD §13 retention) and
 * expired share tokens. Authenticated by CRON_SECRET in the auth header.
 */
import { NextResponse, type NextRequest } from "next/server";
import { and, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scans, scanEvents, shareTokens } from "@/lib/db/schema";
import { isAuthorizedCron } from "@/lib/auth/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANON_SCAN_RETENTION_DAYS = 30;
// Phase 7 review ARCH-H-3: scan_events table grows unboundedly because the
// signed-in scan retention is "until the user deletes". Events are ephemeral
// progress signals and don't need to live as long as findings/probes — purge
// after 14 days regardless of scan status.
const SCAN_EVENT_RETENTION_DAYS = 14;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const anonCutoff = new Date(Date.now() - ANON_SCAN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const eventCutoff = new Date(Date.now() - SCAN_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deletedScans = await db
    .delete(scans)
    .where(and(isNull(scans.userId), lt(scans.createdAt, anonCutoff)))
    .returning({ id: scans.id });

  const deletedShares = await db
    .delete(shareTokens)
    .where(lt(shareTokens.expiresAt, sql`now()`))
    .returning({ token: shareTokens.token });

  const deletedEvents = await db
    .delete(scanEvents)
    .where(lt(scanEvents.createdAt, eventCutoff))
    .returning({ id: scanEvents.id });

  return NextResponse.json({
    ok: true,
    deletedAnonScans: deletedScans.length,
    deletedSharesExpired: deletedShares.length,
    deletedOldEvents: deletedEvents.length,
    anonCutoff: anonCutoff.toISOString(),
    eventCutoff: eventCutoff.toISOString(),
  });
}
