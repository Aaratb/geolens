import type { CurrentUser } from "@/lib/auth/current-user";
import type { getScanHeader } from "@/lib/scan/queries";

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
