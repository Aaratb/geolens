/**
 * GET /api/v1/scans/[id]
 *
 * Returns the scan. If the requester is the owner OR the scan is anonymous
 * AND the scan_id was created on this same IP, returns full details.
 * Otherwise returns the public summary (header + top-3 findings only).
 *
 * Spec §5: anonymous users see executive summary; sign-in unlocks full report.
 */
import { NextResponse, type NextRequest } from "next/server";
import { extractIp, hashIp } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getScanWithDetails, getPublicSummary } from "@/lib/scan/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  const ipHash = hashIp(extractIp(req.headers));

  const summary = await getPublicSummary(id);
  if (!summary) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isOwner = user && summary.header.userId === user.id;
  const isAnonOwnerOnSameIp = !summary.header.userId && summary.header.ipHash === ipHash;

  if (isOwner || isAnonOwnerOnSameIp) {
    const full = await getScanWithDetails(id);
    return NextResponse.json({ scope: "full", ...full });
  }

  return NextResponse.json({
    scope: "summary",
    header: redactHeader(summary.header),
    topThree: summary.topThree,
  });
}

/** Strip ip_hash and user_id from the public summary view. */
function redactHeader<T extends { ipHash?: string; userId?: string | null }>(h: T) {
  const { ipHash: _ip, userId: _u, ...rest } = h;
  void _ip;
  void _u;
  return rest;
}
