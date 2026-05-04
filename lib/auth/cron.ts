/**
 * Bearer-token authorization helper for Vercel Cron internal routes.
 * Uses timingSafeEqual to defeat byte-by-byte timing recovery of CRON_SECRET.
 *
 * Phase 7 review: S-CRIT-2.
 */
import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // length-check first (also constant-time wrt secret because expected length
  // is fixed at startup and known)
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
