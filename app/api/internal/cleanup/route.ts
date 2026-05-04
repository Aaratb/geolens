/**
 * GET /api/internal/cleanup — daily Vercel Cron
 *
 * Deletes anonymous scans older than 30 days (PRD §13 retention) and
 * expired share tokens. Authenticated by CRON_SECRET in the auth header.
 */
import { NextResponse, type NextRequest } from "next/server";
import { and, isNull, lt, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scans, shareTokens } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deletedScans = await db
    .delete(scans)
    .where(and(isNull(scans.userId), lt(scans.createdAt, cutoff)))
    .returning({ id: scans.id });

  const deletedShares = await db
    .delete(shareTokens)
    .where(lt(shareTokens.expiresAt, sql`now()`))
    .returning({ token: shareTokens.token });

  // Drop expired (no-op if expiresAt is NULL — those don't expire)
  void eq;

  return NextResponse.json({
    ok: true,
    deletedAnonScans: deletedScans.length,
    deletedSharesExpired: deletedShares.length,
    cutoff: cutoff.toISOString(),
  });
}
