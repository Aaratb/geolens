"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useScanStream } from "@/lib/hooks/use-scan-stream";
import { trackFixPackClientEvent } from "@/lib/telemetry/client";
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
  const router = useRouter();
  const claimedRef = useRef(false);

  // Claim anonymous scan after sign-in completes. router.refresh() forces the
  // server component shell to re-render with the now-claimed scan so any SSR
  // ownership data (e.g. share-button enablement, future user-scoped views)
  // updates without a hard reload. Guarded by claimedRef so refresh doesn't
  // loop. (Phase 7 review: TS-MED-1; v1.1 sign-in unblur fix.)
  useEffect(() => {
    if (!isLoaded || !isSignedIn || claimedRef.current) return;
    claimedRef.current = true;
    fetch(`/api/v1/scans/${scanId}/claim`, { method: "POST" })
      .then((r) => {
        if (r.ok) router.refresh();
      })
      .catch((err) => {
        console.warn("[scan] claim failed", err);
        claimedRef.current = false;
      });
  }, [isLoaded, isSignedIn, scanId, router]);

  const brand = state.brandName ?? initialBrand;
  const category = state.category ?? initialCategory;
  const showSignInWall = isLoaded && !isSignedIn;

  return (
    <div className="space-y-8">
      {/* status row */}
      <div className="flex items-center justify-between" role="status" aria-live="polite">
        <div className="font-mono-tabular marginalia flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase">
          <StatusDot status={state.status} />
          {state.status === "streaming" ? "scanning" : state.status} · {state.transportStatus}
        </div>
        {brand ? (
          <div className="marginalia text-[12px]">
            {brand}
            {category ? <span className="opacity-60"> · {category}</span> : null}
          </div>
        ) : null}
      </div>

      <OutcomeSummary state={state} />

      {/* banner */}
      {state.banner ? (
        <div className="surface flex items-start gap-3 rounded-md p-3 text-[13px]">
          <span
            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
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
              <GapCard key={g.id} gap={g} scanId={scanId} signedIn={!!isSignedIn} showAction={false} />
            ))}
          </div>
        )}
      </section>

      <ActionRail
        scanId={scanId}
        status={state.status}
        signedIn={!!isSignedIn}
        canShare={state.status === "complete" && !!isSignedIn}
      />

      {/* sign-in gated drill-down sections */}
      <DrillDown state={state} locked={showSignInWall} scanId={scanId} signedIn={!!isSignedIn} />

      {state.status === "complete" && state.durationMs !== null ? (
        <div className="rule-t marginalia flex items-center justify-between gap-4 pt-6 text-[12px]">
          <span>
            Done in{" "}
            <span className="font-mono-tabular">{Math.round(state.durationMs / 1000)}s</span>
            {" · "}
            <span className="font-mono-tabular">${(state.costCents ?? 0) / 100}</span> in AI compute
          </span>
          <span className="font-mono-tabular text-[10px] tracking-[0.22em] uppercase">scan complete</span>
        </div>
      ) : null}

      {state.status === "failed" && state.failure ? (
        <FailureCard stage={state.failure.stage} reason={state.failure.reason} />
      ) : null}
    </div>
  );
}

function OutcomeSummary({ state }: { state: ReturnType<typeof useScanStream> }) {
  if (state.status === "streaming" || state.status === "connecting") {
    return (
      <section className="surface rounded-xl p-5" role="status" aria-live="polite">
        <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">
          Outcome
        </div>
        <h1 className="font-display mt-1 text-[24px] leading-tight font-semibold">
          We are building your diagnosis.
        </h1>
        <p className="marginalia mt-2 text-[13px] leading-[1.7]">
          You will see prioritized gaps as soon as evidence is ranked. Keep this tab open while we
          finish probing engines and scoring impact.
        </p>
      </section>
    );
  }

  if (state.status === "failed") {
    return (
      <section className="surface rounded-xl p-5" role="status" aria-live="assertive">
        <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">
          Outcome
        </div>
        <h1 className="font-display mt-1 text-[24px] leading-tight font-semibold">This run did not complete.</h1>
        <p className="marginalia mt-2 text-[13px] leading-[1.7]">
          We captured partial evidence but could not finalize ranked findings. Use the guidance below
          to retry with a reachable public URL.
        </p>
      </section>
    );
  }

  return (
    <section className="surface rounded-xl p-5" role="status" aria-live="polite">
      <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">Outcome</div>
      <h1 className="font-display mt-1 text-[24px] leading-tight font-semibold">
        Diagnosis ready. Prioritize the first three gaps now.
      </h1>
      <p className="marginalia mt-2 text-[13px] leading-[1.7]">
        This report is complete. Review the top findings for fastest lift, then continue into full
        drill-down and Fix Pack actions.
      </p>
    </section>
  );
}

function ActionRail({
  scanId,
  status,
  signedIn,
  canShare,
}: {
  scanId: string;
  status: ReturnType<typeof useScanStream>["status"];
  signedIn: boolean;
  canShare: boolean;
}) {
  let href: string | null = null;
  let label: string | null = null;
  let secondary: React.ReactNode = null;

  if (status === "complete" && signedIn) {
    href = `/scan/${scanId}/fix-pack`;
    label = "Open Fix Pack";
    secondary = <ShareButton scanId={scanId} enabled={canShare} />;
  } else if (status === "complete" && !signedIn) {
    href = `/sign-in?redirect_url=${encodeURIComponent(`/scan/${scanId}`)}`;
    label = "Sign in to unlock the full report";
  } else if (status === "failed") {
    href = "/";
    label = "Run another diagnosis";
  }

  if (!href || !label) return null;

  return (
    <section className="surface flex flex-col gap-4 rounded-xl p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">
          Recommended next step
        </div>
        <h2 className="font-display mt-1 text-[22px] leading-tight font-semibold">
          {status === "failed"
            ? "Retry with a public page to get complete findings."
            : "Turn these findings into concrete repair actions."}
        </h2>
        <p className="marginalia mt-2 max-w-xl text-[13px] leading-[1.7]">
          {status === "failed"
            ? "The previous run ended early. Retry to regenerate full evidence and ranked gaps."
            : "Use Fix Pack for copy-paste assets, coding-agent prompts, and downloadable repair guidance."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {secondary}
        <Link
          href={href}
          onClick={() =>
            status === "complete"
              ? trackFixPackClientEvent({
                  event: "fixpack.cta.clicked",
                  scanId,
                  source: "scan_report",
                  action: signedIn ? "open" : "sign_in",
                })
              : undefined
          }
          className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {label}
        </Link>
      </div>
    </section>
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
  if (stage.startsWith("crawl/too_large")) {
    return {
      title: "The page is too big to audit.",
      body: "We cap each page at 8MB to keep scans fast. Your homepage is over that — usually means a lot of inlined images, fonts, or preload tags that should be split off.",
      suggestion: "Audit a lighter sub-page (your blog index, a product page) for now.",
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
        className="font-mono-tabular mb-3 flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase"
        style={{ color: "var(--color-score-bad-dark)" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-score-bad-dark)" }}
        />
        Scan failed
      </div>
      <h3 className="font-display mb-2 text-[20px] font-semibold" style={{ color: "var(--ink)" }}>
        {copy.title}
      </h3>
      <p className="marginalia text-[14px] leading-[1.6]">{copy.body}</p>
      {copy.suggestion ? (
        <p className="marginalia mt-3 text-[14px] leading-[1.6]">
          <span style={{ color: "var(--ink)" }}>Try:</span> {copy.suggestion}
        </p>
      ) : null}
      <div className="font-mono-tabular marginalia mt-4 text-[10px] tracking-[0.18em] uppercase">
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
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 rounded-full ${status === "streaming" ? "animate-pulse" : ""}`}
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
    <div className="rule-b mb-5 pb-3">
      <div className="font-mono-tabular marginalia text-[10px] tracking-[0.22em] uppercase">
        {eyebrow}
      </div>
      <h2
        className="font-display mt-1 text-[20px] leading-tight font-semibold"
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
  signedIn,
}: {
  state: ReturnType<typeof useScanStream>;
  locked: boolean;
  scanId: string;
  signedIn: boolean;
}) {
  return (
    <section className="relative">
      <EditorialHeader eyebrow="Findings · Drill-down" title="The full audit, in detail." />
      {/* `inert` blocks Tab/focus on locked content; CSS pointer-events-none
          alone is keyboard-bypassable. (Phase 7 review: CR-H-3) */}
      <div
        className={
          locked
            ? "pointer-events-none select-none opacity-55 [mask-image:linear-gradient(to_bottom,black_58%,transparent_96%)]"
            : ""
        }
        // React 19 types `inert` as boolean; pass true when locked.
        inert={locked || undefined}
        aria-hidden={locked || undefined}
      >
        {state.status === "failed" ? (
          <div className="surface rounded-xl p-4">
            <p className="marginalia text-[13px] leading-[1.7]">
              Full drill-down is unavailable because this run ended early.
            </p>
          </div>
        ) : state.status !== "complete" && state.allGaps.length <= 3 ? (
          <div className="grid gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : state.status === "complete" && state.allGaps.length <= 3 ? (
          <div className="surface rounded-xl p-4">
            <p className="marginalia text-[13px] leading-[1.7]">
              This run only produced the top-priority findings. Re-run the diagnosis for deeper
              coverage.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.allGaps.slice(3).map((g) => (
              <GapCard key={g.id} gap={g} scanId={scanId} signedIn={signedIn} showAction={false} />
            ))}
          </div>
        )}
      </div>
      {locked ? <SignInOverlay scanId={scanId} /> : null}
    </section>
  );
}
