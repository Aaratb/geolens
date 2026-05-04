import { eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db/client";
import { scanFixPacks, type ScanFixPack } from "@/lib/db/schema";

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
        error: null,
        updatedAt: now,
      },
      where: eq(scanFixPacks.status, "failed"),
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
