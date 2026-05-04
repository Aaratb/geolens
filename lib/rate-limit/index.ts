/**
 * Per-IP and per-user rate limiting via Upstash Ratelimit.
 *
 * Spec §9 windows:
 *   rl:scan:ip:<hash>     2 / 24h    anonymous scans
 *   rl:scan:user:<id>     10 / 24h   authenticated scans
 *   rl:waitlist:ip:<hash> 5 / 1h     waitlist signups
 */
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createHash } from "node:crypto";

const SALT = process.env.IP_HASH_SALT ?? "dev-salt-rotate-yearly";

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

let _anon: Ratelimit | null = null;
let _user: Ratelimit | null = null;
let _waitlist: Ratelimit | null = null;

function anonScanLimiter(): Ratelimit {
  if (!_anon) {
    _anon = new Ratelimit({
      redis: redis(),
      limiter: Ratelimit.slidingWindow(2, "24 h"),
      prefix: "rl:scan:ip",
      analytics: false,
    });
  }
  return _anon;
}

function userScanLimiter(): Ratelimit {
  if (!_user) {
    _user = new Ratelimit({
      redis: redis(),
      limiter: Ratelimit.slidingWindow(10, "24 h"),
      prefix: "rl:scan:user",
      analytics: false,
    });
  }
  return _user;
}

function waitlistLimiter(): Ratelimit {
  if (!_waitlist) {
    _waitlist = new Ratelimit({
      redis: redis(),
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:waitlist:ip",
      analytics: false,
    });
  }
  return _waitlist;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex").slice(0, 32);
}

/** Best-effort IP extraction from common Vercel / proxy headers. */
export function extractIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "0.0.0.0";
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("x-vercel-forwarded-for") ??
    "0.0.0.0"
  );
}

export interface LimitResult {
  ok: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

export async function limitScan(
  identity: { kind: "ip"; ipHash: string } | { kind: "user"; userId: string },
): Promise<LimitResult> {
  const limiter = identity.kind === "ip" ? anonScanLimiter() : userScanLimiter();
  const key = identity.kind === "ip" ? identity.ipHash : identity.userId;
  try {
    const r = await limiter.limit(key);
    return { ok: r.success, remaining: r.remaining, reset: r.reset, limit: r.limit };
  } catch {
    // Fail open if Upstash is unreachable — better to let scans through than to block prod.
    return { ok: true, remaining: 999, reset: Date.now() + 86_400_000, limit: 999 };
  }
}

export async function limitWaitlist(ipHash: string): Promise<LimitResult> {
  try {
    const r = await waitlistLimiter().limit(ipHash);
    return { ok: r.success, remaining: r.remaining, reset: r.reset, limit: r.limit };
  } catch {
    return { ok: true, remaining: 999, reset: Date.now() + 3_600_000, limit: 999 };
  }
}

export const __testing = { hashIp };
