import { and, eq, lt, or } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db/client";
import { scanFixPacks, type ScanFixPack } from "@/lib/db/schema";

export const STALE_FIX_PACK_GENERATION_MS = 10 * 60 * 1000;

export async function getFixPackByScanId(
  scanId: string,
  client: DbOrTx = db,
): Promise<ScanFixPack | null> {
  const [row] = await client
    .select()
    .from(scanFixPacks)
    .where(eq(scanFixPacks.scanId, scanId))
    .limit(1);

  return row ?? null;
}

export async function startGeneratingFixPack(
  input: {
    scanId: string;
    requestedBy?: string | null;
    version?: string;
  },
  client: DbOrTx = db,
): Promise<{ row: ScanFixPack; started: boolean }> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_FIX_PACK_GENERATION_MS);
  const [row] = await client
    .insert(scanFixPacks)
    .values({
      scanId: input.scanId,
      requestedBy: input.requestedBy ?? null,
      status: "generating",
      version: input.version ?? "v1",
      error: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: scanFixPacks.scanId,
      set: {
        requestedBy: input.requestedBy ?? null,
        status: "generating",
        payload: null,
        error: null,
        model: null,
        costCents: null,
        updatedAt: now,
      },
      where: or(
        eq(scanFixPacks.status, "failed"),
        and(eq(scanFixPacks.status, "generating"), lt(scanFixPacks.updatedAt, staleBefore)),
      ),
    })
    .returning();

  if (row) {
    return { row, started: true };
  }

  const existing = await getFixPackByScanId(input.scanId, client);
  if (!existing) {
    throw new Error("FIX_PACK_CREATE_FAILED");
  }

  return { row: existing, started: false };
}

export async function markFixPackFailed(
  input: {
    id: string;
    error: string;
  },
  client: DbOrTx = db,
): Promise<ScanFixPack> {
  const [row] = await client
    .update(scanFixPacks)
    .set({
      status: "failed",
      error: input.error,
      updatedAt: new Date(),
    })
    .where(eq(scanFixPacks.id, input.id))
    .returning();

  if (!row) {
    throw new Error("FIX_PACK_NOT_FOUND");
  }

  return row;
}

export async function markFixPackCompleted(
  input: {
    id: string;
    payload: unknown;
    model?: string | null;
    costCents?: number | null;
  },
  client: DbOrTx = db,
): Promise<ScanFixPack> {
  const [row] = await client
    .update(scanFixPacks)
    .set({
      status: "completed",
      payload: input.payload,
      error: null,
      model: input.model ?? null,
      costCents: input.costCents ?? null,
      updatedAt: new Date(),
    })
    .where(eq(scanFixPacks.id, input.id))
    .returning();

  if (!row) {
    throw new Error("FIX_PACK_NOT_FOUND");
  }

  return row;
}
