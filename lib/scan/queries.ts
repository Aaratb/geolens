/**
 * Read-side queries for scans. Lives separate from the orchestrator so the
 * API layer doesn't pull in the full scan pipeline graph.
 */
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scans, scanFindings, scanEngineProbes, scanPagesCrawled } from "@/lib/db/schema";

export async function getScanHeader(scanId: string) {
  const [row] = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  return row ?? null;
}

export async function getScanWithDetails(scanId: string) {
  const header = await getScanHeader(scanId);
  if (!header) return null;
  const [findings, probes, pages] = await Promise.all([
    db.select().from(scanFindings).where(eq(scanFindings.scanId, scanId)).orderBy(asc(scanFindings.ord)),
    db.select().from(scanEngineProbes).where(eq(scanEngineProbes.scanId, scanId)),
    db.select().from(scanPagesCrawled).where(eq(scanPagesCrawled.scanId, scanId)),
  ]);
  return { header, findings, probes, pages };
}

/**
 * Public summary view: header + only top-3 findings, no probes, no page detail.
 * This is what anonymous viewers see before sign-in.
 */
export async function getPublicSummary(scanId: string) {
  const header = await getScanHeader(scanId);
  if (!header) return null;
  const top = await db
    .select()
    .from(scanFindings)
    .where(eq(scanFindings.scanId, scanId))
    .orderBy(asc(scanFindings.ord))
    .limit(3);
  return { header, topThree: top };
}
