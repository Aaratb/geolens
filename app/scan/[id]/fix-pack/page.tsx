import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccessScan } from "@/lib/fix-pack/access";
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
  if (!canAccessScan(scan, user, ipHash)) notFound();

  const auditNo = id.split("-")[0]?.toUpperCase().slice(0, 8) ?? "";
  const notCompleted = scan.status !== "completed";
  const eligibility = getFixPackEligibility(user);
  const existing = notCompleted ? null : await getFixPackByScanId(scan.id);
  const initial = getInitialFixPackState(existing);

  return (
    <div className="surface-report min-h-screen scan-fade-in">
      <ScanMasthead
        url={scan.url}
        hostname={scan.hostname}
        auditNo={auditNo}
        label="Fix Pack"
      />
      <main className="max-w-5xl mx-auto px-8 pt-10 pb-24">
        <div className="mb-8">
          <Link
            href={`/scan/${scan.id}`}
            className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia hover:underline"
          >
            Back to scan report
          </Link>
          <div className="rule-b pb-5 mt-4">
            <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
              Fix Pack · Agent-ready remediation
            </div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-2">
              <div>
                <h1 className="font-display text-[42px] md:text-[54px] leading-[0.95] font-semibold">
                  The three fixes to hand your coding agent.
                </h1>
                <p className="text-[15px] marginalia leading-[1.7] max-w-2xl mt-4">
                  A scan-grounded pack of implementation briefs, copy-paste assets, validation
                  steps, and a downloadable Markdown agent file for Claude Code or Cursor.
                </p>
              </div>
              <div className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia">
                {scan.hostname}
              </div>
            </div>
          </div>
        </div>

        {notCompleted ? (
          <NotCompletedState scanId={scan.id} status={scan.status} />
        ) : (
          <FixPackClient
            scanId={scan.id}
            eligible={eligibility.eligible}
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

function NotCompletedState({ scanId, status }: { scanId: string; status: string }) {
  return (
    <div className="surface rounded-xl p-6">
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
        Scan not ready
      </div>
      <h2 className="font-display text-[24px] leading-tight font-semibold mt-2">
        Finish the audit before generating a Fix Pack.
      </h2>
      <p className="text-[14px] marginalia leading-[1.7] mt-3">
        Fix Pack generation uses completed scan findings and engine probes. Current status:{" "}
        <span className="font-mono-tabular">{status}</span>.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href={`/scan/${scanId}`}>Return to scan report</Link>
      </Button>
    </div>
  );
}
