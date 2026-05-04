/**
 * Per-IP and per-user rate limiting via Upstash Ratelimit.
 *
 * Spec §9 windows:
 *   rl:scan:ip:<hash>     2 / 24h    anonymous scans
 *   rl:scan:user:<id>     10 / 24h   authenticated scans
 *   rl:waitlist:ip:<hash> 5 / 1h     waitlist signups
 *   rl:fixpack:events:<hash> 30 / 10m client telemetry writes
 */
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createHash } from "node:crypto";

/**
 * IP_HASH_SALT must be set in any non-development environment. The fallback
 * is a known constant — if it ever runs in production, every stored ip_hash
 * becomes reversible via a precomputed table.
 *
 * Phase 7 review: S-HIGH-1.
 */
const RAW_SALT = process.env.IP_HASH_SALT;
if (!RAW_SALT && process.env.NODE_ENV === "production") {
  throw new Error("IP_HASH_SALT must be set in production");
}
const SALT = RAW_SALT ?? "local-dev-only-not-for-production";

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
let _fixPackEvents: Ratelimit | null = null;

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

function fixPackEventsLimiter(): Ratelimit {
  if (!_fixPackEvents) {
    _fixPackEvents = new Ratelimit({
      redis: redis(),
      limiter: Ratelimit.slidingWindow(30, "10 m"),
      prefix: "rl:fixpack:events",
      analytics: false,
    });
  }
  return _fixPackEvents;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Extract the client IP from common edge headers. Header preference matters:
 * `cf-connecting-ip` is the most authoritative when behind Cloudflare; XFF
 * leftmost can be spoofed and rightmost is added by the trusted proxy.
 *
 * Phase 7 review: S-HIGH-3.
 */
export function extractIp(headers: Headers): string {
  // Most specific to least: trusted proxy -> Vercel/CDN -> XFF rightmost
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",").at(-1)?.trim() ?? "0.0.0.0";
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",").at(-1)?.trim() ?? "0.0.0.0";
  return "0.0.0.0";
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

export async function limitFixPackEvents(ipHash: string): Promise<LimitResult> {
  try {
    const r = await fixPackEventsLimiter().limit(ipHash);
    return { ok: r.success, remaining: r.remaining, reset: r.reset, limit: r.limit };
  } catch {
    return { ok: true, remaining: 999, reset: Date.now() + 600_000, limit: 999 };
  }
}

export const __testing = { hashIp };
