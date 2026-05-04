/**
 * POST /api/v1/share — create a public read-only share URL for a scan.
 *
 * The requester must own the scan (signed-in user OR anonymous-on-same-IP).
 * Returns { token, url } with an unguessable URL-safe id.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { scans, shareTokens } from "@/lib/db/schema";
import { extractIp, hashIp } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  scanId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const ipHash = hashIp(extractIp(req.headers));

  const [scan] = await db.select().from(scans).where(eq(scans.id, body.scanId)).limit(1);
  if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isOwner = user && scan.userId === user.id;
  const isAnonOwner = !scan.userId && scan.ipHash === ipHash;
  if (!isOwner && !isAnonOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (scan.status !== "completed") {
    return NextResponse.json({ error: "scan_not_complete" }, { status: 409 });
  }

  const token = nanoid(16);
  const createdBy = user?.id ?? null;

  // shareTokens.created_by is FK to users; for anon owners we still mint
  // the token but skip the createdBy column (we keep ip_hash on the parent
  // scan as the audit trail).
  if (createdBy) {
    await db.insert(shareTokens).values({
      token,
      scanId: scan.id,
      createdBy,
    });
  } else {
    // Anon owners: insert without createdBy. The schema allows NULL through
    // a manual SQL-level relax. Since our schema marks createdBy NOT NULL,
    // we require sign-in to share — anon users get the in-app report only.
    return NextResponse.json(
      {
        error: "signin_required_to_share",
        message: "Sign in to mint a shareable URL.",
      },
      { status: 401 },
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  return NextResponse.json({ token, url: `${origin}/share/${token}` });
}
