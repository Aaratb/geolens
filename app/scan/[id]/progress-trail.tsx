"use client";

import type { ScanStreamState } from "@/lib/hooks/use-scan-stream";
import type { Engine, ProbeKind } from "@/lib/db/schema";

const ENGINES: { id: Engine; label: string; tone: string }[] = [
  { id: "openai", label: "ChatGPT", tone: "var(--color-score-good-dark)" },
  { id: "anthropic", label: "Claude", tone: "#F5A524" },
  { id: "perplexity", label: "Perplexity", tone: "#5BE2FF" },
  { id: "gemini", label: "Gemini", tone: "var(--color-accent-soft)" },
];

const PROBES: { id: ProbeKind; short: string }[] = [
  { id: "brand_recall", short: "brand" },
  { id: "category_placement", short: "category" },
  { id: "citation_behavior", short: "citation" },
];

/**
 * Fills in section-by-section as the SSE stream arrives. Replaces the long
 * "blank → suddenly everything" UX. Hides itself once the scan is complete.
 */
export function ProgressTrail({ state }: { state: ScanStreamState }) {
  if (state.status === "complete" || state.status === "failed") return null;

  const totalProbes = 12;
  const completedProbes = Object.keys(state.probes).length;
  const pagesFetched = state.pages.length;

  return (
    <div className="surface rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "var(--color-accent)" }}
          />
          Live · {currentStage(state)}
        </div>
        <div className="font-mono-tabular text-[11px] marginalia">
          {pagesFetched > 0 ? `${pagesFetched} pages · ` : ""}
          {completedProbes}/{totalProbes} probes
        </div>
      </div>

      {/* Brand & category, shown the moment they're known */}
      {state.brandName ? (
        <Row label="Detected">
          <span className="font-medium">{state.brandName}</span>
          {state.category ? <span className="marginalia"> · {state.category}</span> : null}
        </Row>
      ) : null}

      {/* Pages crawled — last 4 visible */}
      {state.pages.length > 0 ? (
        <Row label="Crawled">
          <ul className="font-mono-tabular text-[12px] space-y-1">
            {state.pages.slice(-4).map((p) => (
              <li key={p.url} className="flex items-center gap-2 marginalia truncate">
                <span style={{ color: p.statusCode === 200 ? "var(--color-score-good-dark)" : "var(--color-score-warn-dark)" }}>
                  {p.statusCode}
                </span>
                <span className="truncate" title={p.url}>{p.url}</span>
              </li>
            ))}
            {state.pages.length > 4 ? (
              <li className="marginalia text-[11px]">...and {state.pages.length - 4} earlier</li>
            ) : null}
          </ul>
        </Row>
      ) : null}

      {/* AEO probe grid — 4 engines × 3 probes, fills in as each completes */}
      <Row label="AEO probes">
        <div className="space-y-1.5">
          {ENGINES.map((engine) => (
            <div key={engine.id} className="flex items-center gap-3 text-[12px]">
              <span className="font-mono-tabular w-20 marginalia">{engine.label}</span>
              <div className="flex items-center gap-1.5">
                {PROBES.map((probe) => {
                  const key = `${engine.id}:${probe.id}`;
                  const done = state.probes[key];
                  const score = done?.weightedScore ?? 0;
                  return (
                    <ProbeDot key={probe.id} done={!!done} score={score} engineTone={engine.tone} title={probe.short} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Row>

      {/* Hygiene + citability completion */}
      {(state.hygiene !== null || state.citability !== null) && (
        <Row label="Audits">
          <div className="flex items-center gap-3 font-mono-tabular text-[11px]">
            <Pill done={state.hygiene !== null}>hygiene</Pill>
            <Pill done={state.citability !== null}>citability</Pill>
            <Pill done={Object.keys(state.psiByUrl).length > 0}>seo (lighthouse)</Pill>
          </div>
        </Row>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia w-20 pt-0.5 shrink-0">
        {label}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function ProbeDot({
  done,
  score,
  engineTone,
  title,
}: {
  done: boolean;
  score: number;
  engineTone: string;
  title: string;
}) {
  if (!done) {
    return (
      <span
        className="block w-2.5 h-2.5 rounded-full border"
        style={{ borderColor: "var(--rule)" }}
        aria-label={`${title} pending`}
      />
    );
  }
  const tone =
    score >= 70
      ? "var(--color-score-good-dark)"
      : score >= 30
        ? "var(--color-score-warn-dark)"
        : "var(--color-score-bad-dark)";
  return (
    <span
      className="block w-2.5 h-2.5 rounded-full"
      style={{ background: tone, boxShadow: `0 0 8px ${engineTone}40` }}
      title={`${title}: ${score}`}
      aria-label={`${title} score ${score}`}
    />
  );
}

function Pill({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full uppercase tracking-[0.16em] text-[10px]"
      style={{
        background: done ? "var(--surface-muted)" : "transparent",
        border: `1px solid var(--rule)`,
        color: done ? "var(--color-score-good-dark)" : "var(--marginalia)",
      }}
    >
      {done ? "✓ " : ""}
      {children}
    </span>
  );
}

function currentStage(state: ScanStreamState): string {
  if (state.allGaps.length > 0) return "ranking gaps";
  if (state.scoreSeo !== null) return "computing scores";
  if (Object.keys(state.probes).length > 0) return "running AEO probes";
  if (state.citability !== null) return "computing citability";
  if (state.hygiene !== null) return "checking hygiene";
  if (Object.keys(state.psiByUrl).length > 0) return "running Lighthouse";
  if (state.brandName) return "auditing pages";
  if (state.pages.length > 0) return "crawling";
  if (state.url) return "starting";
  return "connecting";
}
