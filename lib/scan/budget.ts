/**
 * Cost guards (spec §5).
 *   - Daily global budget: pre-flight check via Upstash counter
 *   - Per-scan ceiling: tracked locally in the orchestrator
 *
 * Default daily ceiling is $50 (overridable via DAILY_LLM_BUDGET_USD env).
 * Default per-scan ceiling is 20 cents (PER_SCAN_COST_CEILING_CENTS).
 */
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

const DAILY_KEY = (date: string) => `geolens:spend:${date}`;

export const DAILY_BUDGET_CENTS = (() => {
  const usd = Number(process.env.DAILY_LLM_BUDGET_USD ?? "50");
  return Math.round(usd * 100);
})();

export const PER_SCAN_CEILING_CENTS = Number(process.env.PER_SCAN_COST_CEILING_CENTS ?? "20");

export interface BudgetCheck {
  allowed: boolean;
  spentCentsToday: number;
  dailyCeilingCents: number;
  reason?: string;
}

export async function checkDailyBudget(now: Date = new Date()): Promise<BudgetCheck> {
  const day = formatDay(now);
  let spent = 0;
  try {
    const v = await redis().get<number>(DAILY_KEY(day));
    spent = typeof v === "number" ? v : 0;
  } catch (err) {
    // Phase 7 review: S-HIGH-2.
    // FAIL CLOSED. A wrongly-allowed scan costs real money against upstream
    // LLM API balances; a wrongly-denied scan costs UX. The budget guard is
    // the last line of defense against a single Upstash outage draining the
    // entire daily budget unprotected.
    console.warn("[budget] Upstash unreachable, failing closed", err);
    return {
      allowed: false,
      spentCentsToday: 0,
      dailyCeilingCents: DAILY_BUDGET_CENTS,
      reason: "redis-unreachable-failing-closed",
    };
  }
  return {
    allowed: spent < DAILY_BUDGET_CENTS,
    spentCentsToday: spent,
    dailyCeilingCents: DAILY_BUDGET_CENTS,
    reason: spent >= DAILY_BUDGET_CENTS ? "daily-budget-exhausted" : undefined,
  };
}

export async function recordSpend(cents: number, now: Date = new Date()): Promise<void> {
  if (cents <= 0) return;
  const day = formatDay(now);
  try {
    await redis().incrby(DAILY_KEY(day), cents);
    // 36h TTL so day-rollover isn't fragile
    await redis().expire(DAILY_KEY(day), 60 * 60 * 36);
  } catch {
    // best-effort
  }
}

function formatDay(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const __testing = { formatDay, DAILY_KEY };
