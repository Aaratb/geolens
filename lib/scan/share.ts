/**
 * Share-token resolution helpers. Lookups validate the token, increment a
 * view counter, and return the scan id (or null on miss/expired).
 */
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { shareTokens } from "@/lib/db/schema";

export async function resolveShareToken(token: string): Promise<{ scanId: string } | null> {
  const [row] = await db
    .select({ scanId: shareTokens.scanId, expiresAt: shareTokens.expiresAt })
    .from(shareTokens)
    .where(eq(shareTokens.token, token))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  // Best-effort view counter
  void db
    .update(shareTokens)
    .set({ views: sql`${shareTokens.views} + 1` })
    .where(eq(shareTokens.token, token));
  return { scanId: row.scanId };
}
