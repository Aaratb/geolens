import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessScan, claimAnonymousScanForUser } from "@/lib/fix-pack/access";
import { getFixPackEligibility } from "@/lib/fix-pack/eligibility";
import { parseFixPackPayload, type FixPackPayload } from "@/lib/fix-pack/schema";
import { getFixPackByScanId } from "@/lib/fix-pack/store";
import type { FixPackUiStatus } from "@/lib/fix-pack/ui-state";
import { extractIp, hashIp } from "@/lib/rate-limit";
import { getScanHeader } from "@/lib/scan/queries";
import { FixPackClient } from "./fix-pack-client";
import { ScanMasthead } from "../scan-masthead";

export const dynamic = "force-dynamic";

export default async function FixPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [headerList, user, scan] = await Promise.all([
    headers(),
    getCurrentUser(),
    getScanHeader(id),
  ]);

  if (!scan) notFound();

  const ipHash = hashIp(extractIp(headerList));
  const ownedScan = await claimAnonymousScanForUser(scan, user, ipHash);
  if (!canAccessScan(ownedScan, user, ipHash)) notFound();

  const auditNo = id.split("-")[0]?.toUpperCase().slice(0, 8) ?? "";
  const eligibility = getFixPackEligibility(user);
  const notCompleted = ownedScan.status !== "completed";
  const existing =
    !eligibility.eligible || notCompleted ? null : await getFixPackByScanId(ownedScan.id);
  const initial = getInitialFixPackState(existing);

  return (
    <div className="surface-report scan-fade-in min-h-screen">
      <ScanMasthead
        url={ownedScan.url}
        hostname={ownedScan.hostname}
        auditNo={auditNo}
        label="Fix Pack"
      />
      <main className="mx-auto max-w-5xl px-8 pt-10 pb-24">
        <div className="mb-8">
          <Link
            href={`/scan/${ownedScan.id}`}
            className="font-mono-tabular marginalia text-[11px] tracking-[0.18em] uppercase hover:underline"
          >
            Back to scan report
          </Link>
          <div className="rule-b mt-4 pb-5">
            <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">
              Fix Pack · Agent-ready remediation
            </div>
            <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-display text-[42px] leading-[0.95] font-semibold md:text-[54px]">
                  The three fixes to hand your coding agent.
                </h1>
                <p className="marginalia mt-4 max-w-2xl text-[15px] leading-[1.7]">
                  A scan-grounded pack of implementation briefs, copy-paste assets, validation
                  steps, and a downloadable Markdown agent file for Claude Code or Cursor.
                </p>
              </div>
              <div className="font-mono-tabular marginalia text-[10px] tracking-[0.18em] uppercase">
                {ownedScan.hostname}
              </div>
            </div>
          </div>
        </div>

        {!eligibility.eligible ? (
          <SignInRequiredState scanId={ownedScan.id} />
        ) : notCompleted ? (
          <NotCompletedState scanId={ownedScan.id} status={ownedScan.status} />
        ) : (
          <FixPackClient
            scanId={ownedScan.id}
            initialStatus={initial.status}
            initialPayload={initial.payload}
            initialFixPackId={initial.fixPackId}
          />
        )}
      </main>
    </div>
  );
}

function getInitialFixPackState(row: Awaited<ReturnType<typeof getFixPackByScanId>>): {
  status: FixPackUiStatus;
  payload: FixPackPayload | null;
  fixPackId: string | null;
} {
  if (!row) return { status: "not_generated", payload: null, fixPackId: null };
  if (row.status !== "completed") return { status: row.status, payload: null, fixPackId: row.id };
  try {
    return { status: "completed", payload: parseFixPackPayload(row.payload), fixPackId: row.id };
  } catch {
    return { status: "failed", payload: null, fixPackId: row.id };
  }
}

function SignInRequiredState({ scanId }: { scanId: string }) {
  const redirectUrl = `/scan/${scanId}/fix-pack`;

  return (
    <div className="surface rounded-xl p-6">
      <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">
        Sign in required
      </div>
      <h2 className="font-display mt-2 text-[24px] leading-tight font-semibold">
        Sign in to generate your Fix Pack.
      </h2>
      <p className="marginalia mt-3 text-[14px] leading-[1.7]">
        Fix Pack is live for authenticated scan owners. Sign in and we will bring you back here.
      </p>
      <Button asChild variant="accent" className="mt-5">
        <Link href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}>
          Sign in to open Fix Pack
        </Link>
      </Button>
    </div>
  );
}

function NotCompletedState({ scanId, status }: { scanId: string; status: string }) {
  return (
    <div className="surface rounded-xl p-6">
      <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">
        Scan not ready
      </div>
      <h2 className="font-display mt-2 text-[24px] leading-tight font-semibold">
        Finish the audit before generating a Fix Pack.
      </h2>
      <p className="marginalia mt-3 text-[14px] leading-[1.7]">
        Fix Pack generation uses completed scan findings and engine probes. Current status:{" "}
        <span className="font-mono-tabular">{status}</span>.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href={`/scan/${scanId}`}>Return to scan report</Link>
      </Button>
    </div>
  );
}
