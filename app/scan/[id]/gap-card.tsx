"use client";

import { useState } from "react";
import type { Gap } from "@/lib/score/gaps";
import { WaitlistDialog } from "./waitlist-dialog";

const SEVERITY_COLOR: Record<Gap["severity"], string> = {
  critical: "var(--color-score-bad-dark)",
  high: "var(--color-score-bad-dark)",
  medium: "var(--color-score-warn-dark)",
  low: "var(--color-score-good-dark)",
};

export function GapCard({ gap, scanId }: { gap: Gap; scanId?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="surface rounded-xl p-4 flex items-start gap-4">
        <span className="font-mono-tabular text-[11px] marginalia mt-0.5 shrink-0">#{gap.id}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {gap.title}
          </div>
          <div className="text-[13px] marginalia mt-1">{gap.why}</div>
          <div className="mt-2 font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[12px] whitespace-nowrap hover:opacity-80"
          style={{ color: "var(--color-accent-soft)" }}
        >
          Fix with our agent →
        </button>
      </div>

      <WaitlistDialog
        open={open}
        onOpenChange={setOpen}
        scanId={scanId}
        gapTitle={gap.title}
        source="gap_cta"
      />
    </>
  );
}
