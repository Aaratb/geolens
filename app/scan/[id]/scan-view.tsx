"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useScanStream } from "@/lib/hooks/use-scan-stream";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreTiles } from "./score-tiles";
import { GapCard } from "./gap-card";
import { SignInOverlay } from "./sign-in-overlay";
import { ProgressTrail } from "./progress-trail";
import { ShareButton } from "./share-button";

interface Props {
  scanId: string;
  initialBrand: string | null;
  initialCategory: string | null;
}

export function ScanView({ scanId, initialBrand, initialCategory }: Props) {
  const state = useScanStream(scanId);
  const { isSignedIn, isLoaded } = useUser();

  // Claim anonymous scan after sign-in completes.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch(`/api/v1/scans/${scanId}/claim`, { method: "POST" }).catch(() => {});
  }, [isLoaded, isSignedIn, scanId]);

  const brand = state.brandName ?? initialBrand;
  const category = state.category ?? initialCategory;
  const showSignInWall = isLoaded && !isSignedIn;

  return (
    <div className="space-y-8">
      {/* status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
          <StatusDot status={state.status} />
          {state.status === "streaming" ? "scanning" : state.status}
        </div>
        {brand ? (
          <div className="text-[12px] marginalia">
            {brand}
            {category ? <span className="opacity-60"> · {category}</span> : null}
          </div>
        ) : null}
      </div>

      {/* banner */}
      {state.banner ? (
        <div className="surface rounded-md p-3 text-[13px] flex items-start gap-3">
          <span
            className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "var(--color-score-warn-dark)" }}
          />
          <span>{state.banner}</span>
        </div>
      ) : null}

      {/* progress trail — fills in as events stream */}
      <ProgressTrail state={state} />

      {/* score tiles (free, anonymous-visible) */}
      <ScoreTiles state={state} />

      {/* top-3 gaps (free) */}
      <section>
        <EditorialHeader eyebrow="Findings · Top 3" title="The three things to fix first." />
        {state.topThree.length === 0 ? (
          <div className="grid gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="space-y-2">
            {state.topThree.map((g) => (
              <GapCard key={g.id} gap={g} scanId={scanId} />
            ))}
          </div>
        )}
      </section>

      {/* sign-in gated drill-down sections */}
      <DrillDown state={state} locked={showSignInWall} scanId={scanId} />

      {state.status === "complete" && state.durationMs !== null ? (
        <div className="rule-t pt-6 marginalia text-[12px] flex items-center justify-between gap-4">
          <span>
            Done in <span className="font-mono-tabular">{Math.round(state.durationMs / 1000)}s</span>
            {" · "}
            <span className="font-mono-tabular">${(state.costCents ?? 0) / 100}</span> in AI compute
          </span>
          <div className="flex items-center gap-3">
            <ShareButton scanId={scanId} enabled={!!isSignedIn} />
            <span className="font-mono-tabular text-[10px] uppercase tracking-[0.22em]">
              scan complete
            </span>
          </div>
        </div>
      ) : null}

      {state.status === "failed" && state.failure ? (
        <div className="surface rounded-md p-4 text-sm">
          <div className="font-semibold mb-1">Scan failed at {state.failure.stage}</div>
          <div className="marginalia">{state.failure.reason}</div>
        </div>
      ) : null}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "complete"
      ? "var(--color-score-good-dark)"
      : status === "failed"
        ? "var(--color-score-bad-dark)"
        : "var(--color-accent)";
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${status === "streaming" ? "animate-pulse" : ""}`}
      style={{ background: color }}
    />
  );
}

/**
 * Editorial section header: serif title under a mono-tabular eyebrow with a
 * thin rule. Matches the specimen-audit pattern on the landing so the two
 * surfaces feel like the same publication.
 */
function EditorialHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5 rule-b pb-3">
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
        {eyebrow}
      </div>
      <h2
        className="font-display text-[20px] font-semibold leading-tight mt-1"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h2>
    </div>
  );
}

function DrillDown({
  state,
  locked,
  scanId,
}: {
  state: ReturnType<typeof useScanStream>;
  locked: boolean;
  scanId: string;
}) {
  return (
    <section className="relative">
      <EditorialHeader
        eyebrow="Findings · Drill-down"
        title="The full audit, in detail."
      />
      {/* `inert` blocks Tab/focus on locked content; CSS pointer-events-none
          alone is keyboard-bypassable. (Phase 7 review: CR-H-3) */}
      <div
        className={locked ? "pointer-events-none select-none filter blur-md" : ""}
        // React 19 types `inert` as boolean; pass true when locked.
        inert={locked || undefined}
        aria-hidden={locked || undefined}
      >
        {state.allGaps.length <= 3 ? (
          <div className="grid gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <div className="space-y-2">
            {state.allGaps.slice(3).map((g) => (
              <GapCard key={g.id} gap={g} scanId={scanId} />
            ))}
          </div>
        )}
      </div>
      {locked ? <SignInOverlay /> : null}
    </section>
  );
}
