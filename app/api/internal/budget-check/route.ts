/**
 * GET /api/internal/budget-check — every 5 min Vercel Cron
 *
 * Reads the daily LLM spend counter and logs warnings when usage approaches
 * the configured ceiling. The actual circuit-breaker check is performed
 * pre-flight in the scan worker (lib/scan/budget.ts), so this endpoint is
 * for observability — it surfaces alerts in Vercel logs without making
 * decisions.
 */
import { NextResponse, type NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { DAILY_BUDGET_CENTS } from "@/lib/scan/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const now = new Date();
  const day = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const spent = (await redis.get<number>(`geolens:spend:${day}`)) ?? 0;
  const pct = (spent / DAILY_BUDGET_CENTS) * 100;

  let level: "ok" | "warn" | "alert" = "ok";
  if (pct >= 90) level = "alert";
  else if (pct >= 70) level = "warn";

  console.log(
    `[budget-check] day=${day} spent=${spent}c budget=${DAILY_BUDGET_CENTS}c pct=${pct.toFixed(1)} level=${level}`,
  );

  return NextResponse.json({ ok: true, day, spentCents: spent, budgetCents: DAILY_BUDGET_CENTS, pct, level });
}
