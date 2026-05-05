import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canAccessScan,
  claimAnonymousScanForUser,
  type FixPackScanHeader,
} from "@/lib/fix-pack/access";
import { getFixPackEligibility } from "@/lib/fix-pack/eligibility";
import {
  generateOrGetFixPack,
  InvalidPersistedFixPackError,
  safeGenerationError,
} from "@/lib/fix-pack/service";
import { parseFixPackPayload, type FixPackPayload } from "@/lib/fix-pack/schema";
import { getFixPackByScanId } from "@/lib/fix-pack/store";
import { extractIp, hashIp, limitFixPackGeneration } from "@/lib/rate-limit";
import { getScanHeader, getScanWithDetails } from "@/lib/scan/queries";
import { track } from "@/lib/telemetry/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({}).strict();
const ScanId = z.string().uuid();

function unauthenticatedResponse(): NextResponse {
  return NextResponse.json(
    { error: "unauthenticated", message: "Sign in to use Fix Pack." },
    { status: 401 },
  );
}

function assertCompletedScan(scan: FixPackScanHeader): NextResponse | null {
  if (scan.status !== "completed") {
    return NextResponse.json({ error: "scan_not_completed", status: scan.status }, { status: 409 });
  }

  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ScanId.safeParse(id).success) {
    return NextResponse.json({ error: "invalid_scan_id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const ipHash = hashIp(extractIp(req.headers));
  const scan = await getScanHeader(id);

  if (!scan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ownedScan = await claimAnonymousScanForUser(scan, user, ipHash);
  if (!canAccessScan(ownedScan, user, ipHash)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const eligibility = getFixPackEligibility(user);
  if (!eligibility.eligible) {
    return unauthenticatedResponse();
  }

  const notCompleted = assertCompletedScan(ownedScan);
  if (notCompleted) return notCompleted;

  const existing = await getFixPackByScanId(ownedScan.id);
  if (!existing) {
    return NextResponse.json({
      eligible: true,
      status: "not_generated",
      fixPack: null,
    });
  }

  if (existing.status !== "completed") {
    return NextResponse.json({
      eligible: true,
      status: existing.status,
      fixPack: null,
    });
  }

  let payload: FixPackPayload;
  try {
    payload = parseFixPackPayload(existing.payload);
  } catch {
    return NextResponse.json({ error: "invalid_fix_pack_payload" }, { status: 500 });
  }

  return NextResponse.json({
    eligible: true,
    status: "completed",
    fixPack: {
      id: existing.id,
      version: existing.version,
      ...payload,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { id } = await params;
  if (!ScanId.safeParse(id).success) {
    return NextResponse.json({ error: "invalid_scan_id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const ipHash = hashIp(extractIp(req.headers));
  const scan = await getScanHeader(id);

  if (!scan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ownedScan = await claimAnonymousScanForUser(scan, user, ipHash);
  if (!canAccessScan(ownedScan, user, ipHash)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const eligibility = getFixPackEligibility(user);
  if (!eligibility.eligible) {
    return unauthenticatedResponse();
  }

  const notCompleted = assertCompletedScan(ownedScan);
  if (notCompleted) return notCompleted;

  const limit = await limitFixPackGeneration({ userId: user?.id ?? null, ipHash });
  if (!limit.ok) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "rate_limited", message: "Too many Fix Pack generations. Try again later." },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  const details = await getScanWithDetails(ownedScan.id);
  if (!details) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const result = await generateOrGetFixPack(details, {
      requestedBy: user?.id ?? null,
      onGenerationStarted: (row) => {
        track({
          event: "fixpack.generation.started",
          userId: user?.id ?? null,
          props: { scanId: ownedScan.id, fixPackId: row.id },
        });
      },
    });

    if (result.status === "generating") {
      return NextResponse.json(
        {
          ok: true,
          status: "generating",
          fixPackId: result.fixPack.id,
        },
        { status: 202 },
      );
    }

    if (result.generated) {
      track({
        event: "fixpack.generation.completed",
        userId: user?.id ?? null,
        props: {
          scanId: ownedScan.id,
          fixPackId: result.fixPack.id,
          cardCount: result.payload.cards.length,
          costCents: result.costCents,
          model: result.model,
        },
      });
      track({
        event: "cost.fixpack",
        userId: user?.id ?? null,
        props: {
          scanId: ownedScan.id,
          fixPackId: result.fixPack.id,
          costCents: result.costCents,
          model: result.model,
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        status: "completed",
        fixPackId: result.fixPack.id,
      },
      { status: result.generated ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof InvalidPersistedFixPackError) {
      return NextResponse.json({ error: "invalid_fix_pack_payload" }, { status: 500 });
    }

    track({
      event: "fixpack.generation.failed",
      userId: user?.id ?? null,
      props: {
        scanId: ownedScan.id,
        reason: safeGenerationError(err),
      },
    });
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
