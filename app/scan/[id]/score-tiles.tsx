"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toneFor } from "@/lib/score/tone";
import type { ScanStreamState } from "@/lib/hooks/use-scan-stream";

export function ScoreTiles({ state }: { state: ScanStreamState }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Tile label="SEO score" value={state.scoreSeo} suffix="" />
      <Tile label="AEO score" value={state.scoreAeo} suffix="" />
      <Tile label="Citation rate" value={state.citationRatePct} suffix="%" kind="rate" />
    </div>
  );
}

function Tile({
  label,
  value,
  suffix,
  kind = "score",
}: {
  label: string;
  value: number | null;
  suffix: string;
  kind?: "score" | "rate";
}) {
  if (value === null) {
    return (
      <div className="surface rounded-xl p-4">
        <div className="font-mono-tabular text-[11px] uppercase tracking-wider marginalia">{label}</div>
        <Skeleton className="h-8 mt-2" />
      </div>
    );
  }
  const tone = toneFor(value, kind);
  return (
    <div className="surface rounded-xl p-4">
      <div className="font-mono-tabular text-[11px] uppercase tracking-wider marginalia">{label}</div>
      <div
        className="mt-2 font-mono-tabular text-3xl font-semibold"
        style={{ color: "var(--ink)" }}
      >
        <CountUp to={value} />
        {suffix}
      </div>
      <div className="text-[11px] mt-1" style={{ color: tone.color }}>
        {tone.label}
      </div>
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setN(Math.round(to * easeOutQuad(t)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
