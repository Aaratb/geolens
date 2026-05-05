import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessScan, claimAnonymousScanForUser } from "@/lib/fix-pack/access";
import { getFixPackEligibility } from "@/lib/fix-pack/eligibility";
import { FIX_PACK_AGENT_FILENAME, renderFixPackAgentMarkdown } from "@/lib/fix-pack/markdown";
import { parseFixPackPayload } from "@/lib/fix-pack/schema";
import { getFixPackByScanId } from "@/lib/fix-pack/store";
import { extractIp, hashIp } from "@/lib/rate-limit";
import { getScanHeader } from "@/lib/scan/queries";
import { track } from "@/lib/telemetry/track";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ScanId = z.string().uuid();

function unauthenticatedResponse(): NextResponse {
  return NextResponse.json(
    { error: "unauthenticated", message: "Sign in to download Fix Pack." },
    { status: 401 },
  );
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

  if (ownedScan.status !== "completed") {
    return NextResponse.json(
      { error: "scan_not_completed", status: ownedScan.status },
      { status: 409 },
    );
  }

  const pack = await getFixPackByScanId(ownedScan.id);
  if (!pack) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (pack.status !== "completed") {
    return NextResponse.json({ error: "fix_pack_not_ready", status: pack.status }, { status: 409 });
  }

  let markdown: string;
  try {
    markdown = renderFixPackAgentMarkdown(parseFixPackPayload(pack.payload));
  } catch {
    return NextResponse.json({ error: "invalid_fix_pack_payload" }, { status: 500 });
  }

  track({
    event: "fixpack.agent.downloaded",
    userId: user?.id ?? null,
    props: {
      scanId: ownedScan.id,
      fixPackId: pack.id,
    },
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${FIX_PACK_AGENT_FILENAME}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
