import type { CurrentUser } from "@/lib/auth/current-user";
import { ensureUserSynced } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { scans } from "@/lib/db/schema";
import type { getScanHeader } from "@/lib/scan/queries";
import { and, eq, isNull } from "drizzle-orm";

export type FixPackScanHeader = NonNullable<Awaited<ReturnType<typeof getScanHeader>>>;

export function canAccessScan(
  scan: FixPackScanHeader,
  user: CurrentUser | null,
  ipHash: string,
): boolean {
  const isOwner = user !== null && scan.userId === user.id;
  const isAnonOwner = scan.userId === null && scan.ipHash === ipHash;
  return isOwner || isAnonOwner;
}

export async function claimAnonymousScanForUser(
  scan: FixPackScanHeader,
  user: CurrentUser | null,
  ipHash: string,
): Promise<FixPackScanHeader> {
  if (!user || scan.userId === user.id || scan.userId !== null || scan.ipHash !== ipHash) {
    return scan;
  }

  await ensureUserSynced(user);
  const [claimed] = await db
    .update(scans)
    .set({ userId: user.id })
    .where(and(eq(scans.id, scan.id), isNull(scans.userId), eq(scans.ipHash, ipHash)))
    .returning();

  return claimed ?? scan;
}
