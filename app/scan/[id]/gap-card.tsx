import type { Gap } from "@/lib/score/gaps";

const SEVERITY_COLOR: Record<Gap["severity"], string> = {
  critical: "var(--color-score-bad-dark)",
  high: "var(--color-score-bad-dark)",
  medium: "var(--color-score-warn-dark)",
  low: "var(--color-score-good-dark)",
};

export function GapCard({ gap }: { gap: Gap }) {
  return (
    <div className="surface rounded-xl p-4 flex items-start gap-4">
      <span className="font-mono-tabular text-[11px] marginalia mt-0.5 shrink-0">#{gap.id}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          {gap.title}
        </div>
        <div className="text-[13px] marginalia mt-1">{gap.why}</div>
        <div className="mt-2 font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: SEVERITY_COLOR[gap.severity] }}
            />
            {gap.severity}
          </span>
          {gap.effort ? <span>· effort {gap.effort}</span> : null}
          {gap.scoreImpact ? <span>· +{gap.scoreImpact} pts</span> : null}
        </div>
      </div>
      <button
        type="button"
        className="text-[12px] whitespace-nowrap"
        style={{ color: "var(--color-accent-soft)" }}
      >
        Fix with our agent →
      </button>
    </div>
  );
}
