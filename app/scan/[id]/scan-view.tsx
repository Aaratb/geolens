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

  // Claim anonymous scan after sign-in completes. Log failures so they're
  // observable rather than silently swallowed. (Phase 7 review: TS-MED-1)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch(`/api/v1/scans/${scanId}/claim`, { method: "POST" }).catch((err) => {
      console.warn("[scan] claim failed", err);
    });
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
        <FailureCard stage={state.failure.stage} reason={state.failure.reason} />
      ) : null}
    </div>
  );
}

/**
 * Map known failure stage codes to user-friendly messaging. Anything not
 * in the table renders the raw stage as a fallback.
 */
function failureCopy(stage: string): { title: string; body: string; suggestion?: string } {
  if (stage.startsWith("crawl/robots_disallowed")) {
    return {
      title: "This site disallows automated audits.",
      body: "The site's robots.txt blocks our crawler — and we respect that. We can't pull pages or run Lighthouse, but the AEO engine probes might still work for the brand.",
      suggestion: "Submit a different site you own, or we can offer a manual review at launch.",
    };
  }
  if (stage.startsWith("crawl/network")) {
    return {
      title: "We couldn't reach the site.",
      body: "The fetch failed before we got a response. This usually means the site is unreachable from our crawler — bot protection, a private network, or a self-loop (you can't audit GEOlens from inside GEOlens).",
      suggestion: "Try a publicly-resolvable URL hosted somewhere other than this deployment.",
    };
  }
  if (stage.startsWith("crawl/timeout")) {
    return {
      title: "The site was too slow to fetch.",
      body: "Our crawler waited 10 seconds and gave up. The target site might be under load or behind aggressive rate limiting.",
      suggestion: "Try again in a minute, or pick a different page.",
    };
  }
  if (stage.startsWith("crawl/http_error")) {
    return {
      title: "The site returned an error.",
      body: `The page returned a non-2xx HTTP status (${stage}). Most often this means the URL is wrong, behind a login, or returning a 403 to bots.`,
      suggestion: "Double-check the URL and that the page is publicly accessible.",
    };
  }
  if (stage.startsWith("crawl/non_html")) {
    return {
      title: "That URL isn't an HTML page.",
      body: "We can only audit HTML pages — the URL responded with a non-HTML content type (likely a PDF, image, or API).",
      suggestion: "Submit the page that links to this resource instead.",
    };
  }
  if (stage.startsWith("crawl/invalid_url")) {
    return {
      title: "That URL didn't validate.",
      body: "Either it's malformed, missing a protocol, points to a private IP, or uses an unsupported scheme.",
      suggestion: "Try the full URL with https:// prefix.",
    };
  }
  if (stage === "uncaught-error") {
    return {
      title: "Something unexpected went wrong.",
      body: "We hit an error we didn't plan for. The team has been notified.",
    };
  }
  return { title: "Scan failed.", body: stage };
}

function FailureCard({ stage, reason }: { stage: string; reason: string }) {
  const copy = failureCopy(stage);
  return (
    <div className="surface rounded-xl p-5">
      <div
        className="flex items-center gap-2 font-mono-tabular text-[11px] uppercase tracking-[0.18em] mb-3"
        style={{ color: "var(--color-score-bad-dark)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--color-score-bad-dark)" }}
        />
        Scan failed
      </div>
      <h3 className="font-display text-[20px] font-semibold mb-2" style={{ color: "var(--ink)" }}>
        {copy.title}
      </h3>
      <p className="text-[14px] marginalia leading-[1.6]">{copy.body}</p>
      {copy.suggestion ? (
        <p className="text-[14px] marginalia leading-[1.6] mt-3">
          <span style={{ color: "var(--ink)" }}>Try:</span> {copy.suggestion}
        </p>
      ) : null}
      <div className="mt-4 font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia">
        {stage} · {reason}
      </div>
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
