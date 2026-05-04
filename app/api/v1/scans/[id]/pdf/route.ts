/**
 * POST /api/v1/scans/[id]/pdf
 *
 * v1 stub — PDF export is queued for v1.1. We collect the email here, log
 * intent for prioritization, and return a "coming soon" payload that the UI
 * surfaces in a confirmation toast.
 *
 * Real PDF generation (Puppeteer or hosted) lands post-launch once we know
 * actual demand from this stub's telemetry.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scans, waitlistEntries } from "@/lib/db/schema";
import { extractIp, hashIp } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { track } from "@/lib/telemetry/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(254).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const ipHash = hashIp(extractIp(req.headers));

  const [scan] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isOwner = user && scan.userId === user.id;
  const isAnonOwner = !scan.userId && scan.ipHash === ipHash;
  if (!isOwner && !isAnonOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const email =
    body.data.email ??
    user?.email ??
    null;

  if (!email) {
    return NextResponse.json(
      { error: "email_required", message: "Provide an email so we can notify you when PDF export lands." },
      { status: 400 },
    );
  }

  // Best-effort dedupe: store as a pdf_stub waitlist source so we can email
  // these users when the real PDF feature ships.
  await db
    .insert(waitlistEntries)
    .values({
      email: email.toLowerCase(),
      scanId: scan.id,
      source: "pdf_stub",
    })
    .onConflictDoNothing();

  track({
    event: "pdf.export.queued",
    userId: user?.id ?? null,
    props: { scanId: scan.id, email },
  });

  return NextResponse.json({
    ok: true,
    status: "queued",
    message: "PDF export ships in v1.1 — we'll email you the moment it's live.",
  });
}
