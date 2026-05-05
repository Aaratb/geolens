"use client";

import Link from "next/link";
import type { Gap } from "@/lib/score/gaps";

const SEVERITY_COLOR: Record<Gap["severity"], string> = {
  critical: "var(--color-score-bad-dark)",
  high: "var(--color-score-bad-dark)",
  medium: "var(--color-score-warn-dark)",
  low: "var(--color-score-good-dark)",
};

export function GapCard({
  gap,
  scanId,
  signedIn = false,
  showAction = true,
}: {
  gap: Gap;
  scanId?: string;
  signedIn?: boolean;
  showAction?: boolean;
}) {
  const fixPackHref = scanId
    ? signedIn
      ? `/scan/${scanId}/fix-pack`
      : `/sign-in?redirect_url=${encodeURIComponent(`/scan/${scanId}/fix-pack`)}`
    : null;

  return (
    <div className="surface flex items-start gap-4 rounded-xl p-4">
      <span className="font-mono-tabular marginalia mt-0.5 shrink-0 text-[11px]">#{gap.id}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          {gap.title}
        </div>
        <div className="marginalia mt-1 text-[13px]">{gap.why}</div>
        <div className="font-mono-tabular marginalia mt-2 flex flex-wrap items-center gap-3 text-[10px] tracking-[0.18em] uppercase">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: SEVERITY_COLOR[gap.severity] }}
            />
            {gap.severity}
          </span>
          {gap.effort ? <span>· effort {gap.effort}</span> : null}
          {gap.scoreImpact ? <span>· +{gap.scoreImpact} pts</span> : null}
          {gap.category === "engine" ? (
            <span title="This finding is derived from AI engine probe responses, which may be inaccurate or biased.">
              · AI-derived
            </span>
          ) : null}
        </div>
      </div>
      {showAction && fixPackHref ? (
        <Link
          href={fixPackHref}
          className="text-[12px] whitespace-nowrap hover:opacity-80"
          style={{ color: "var(--color-accent-soft)" }}
        >
          {signedIn ? "Fix with our agent →" : "Sign in to fix →"}
        </Link>
      ) : showAction ? (
        <span
          className="text-[12px] whitespace-nowrap opacity-60"
          style={{ color: "var(--color-accent-soft)" }}
        >
          Fix with our agent →
        </span>
      ) : null}
    </div>
  );
}
