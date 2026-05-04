/**
 * POST /api/v1/scans/[id]/claim
 *
 * After an anonymous user signs in mid-scan or post-scan, attach the scan to
 * their user_id so it appears on their dashboard. Verifies the requester's
 * IP hash matches the scan's original ip_hash so a stranger can't claim
 * someone else's anonymous scan.
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scans } from "@/lib/db/schema";
import { extractIp, hashIp } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const ipHash = hashIp(extractIp(req.headers));

  const [scan] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  if (!scan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (scan.userId === user.id) {
    return NextResponse.json({ ok: true, alreadyOwned: true });
  }
  if (scan.userId) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }
  if (scan.ipHash !== ipHash) {
    return NextResponse.json({ error: "ip_mismatch" }, { status: 403 });
  }

  await db.update(scans).set({ userId: user.id }).where(eq(scans.id, id));
  return NextResponse.json({ ok: true });
}
