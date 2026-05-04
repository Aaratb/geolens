/**
 * POST /api/v1/waitlist
 *
 * Joins the fixer-agent waitlist. Optional scanId + gapId to attribute
 * which gap drove the signup (PRD §6 north-star supporting metric).
 * Dedupes per (email, gapId).
 *
 * Rate limited per IP (5/h). Available to anon + authed alike.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { waitlistEntries } from "@/lib/db/schema";
import { extractIp, hashIp, limitWaitlist } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { track } from "@/lib/telemetry/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(254),
  scanId: z.string().uuid().optional(),
  gapId: z.string().uuid().optional(),
  source: z.enum(["landing", "gap_cta", "share_view", "pdf_stub", "fix_pack_cta"]).optional(),
});

export async function POST(req: NextRequest) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const ipHash = hashIp(extractIp(req.headers));
  const limit = await limitWaitlist(ipHash);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many waitlist signups from this IP. Try again in an hour.",
      },
      { status: 429 },
    );
  }

  const user = await getCurrentUser();

  try {
    const [inserted] = await db
      .insert(waitlistEntries)
      .values({
        email: payload.email.toLowerCase(),
        scanId: payload.scanId ?? null,
        gapId: payload.gapId ?? null,
        source: payload.source ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: waitlistEntries.id });

    if (inserted) {
      track({
        event: "waitlist.joined",
        userId: user?.id ?? null,
        props: {
          source: payload.source,
          scanId: payload.scanId,
          gapId: payload.gapId,
          anonymous: !user,
        },
      });
    }
  } catch (err) {
    console.error("[waitlist] insert failed", err);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
