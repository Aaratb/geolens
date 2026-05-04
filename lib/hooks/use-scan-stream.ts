"use client";

import { useEffect, useReducer, useRef } from "react";
import type { ScanEvent } from "@/lib/scan/events";
import type { CitabilityMetrics, HygieneCheck, PsiCategoryScores } from "@/lib/audits/types";
import type { Engine, ProbeKind } from "@/lib/db/schema";
import type { ParsedProbeFields } from "@/lib/audits/aeo/types";
import type { Gap } from "@/lib/score/gaps";

/* --------------------------- state shape ------------------------------- */

export interface ScanStreamState {
  status: "connecting" | "streaming" | "complete" | "failed";
  url: string | null;
  brandName: string | null;
  category: string | null;
  pages: Array<{ url: string; statusCode: number; bytes: number }>;
  psiByUrl: Record<string, { scores: PsiCategoryScores; weightedSeo: number }>;
  hygiene: HygieneCheck[] | null;
  citability: CitabilityMetrics | null;
  probes: Record<string, { engine: Engine; probeKind: ProbeKind; weightedScore: number; parsed: ParsedProbeFields }>;
  scoreSeo: number | null;
  scoreAeo: number | null;
  scoreVisibility: number | null;
  scoreHygiene: number | null;
  scoreCitability: number | null;
  citationRatePct: number | null;
  sovPct: number | null;
  topThree: Gap[];
  allGaps: Gap[];
  banner: string | null;
  failure: { stage: string; reason: string } | null;
  durationMs: number | null;
  costCents: number | null;
}

const initial: ScanStreamState = {
  status: "connecting",
  url: null,
  brandName: null,
  category: null,
  pages: [],
  psiByUrl: {},
  hygiene: null,
  citability: null,
  probes: {},
  scoreSeo: null,
  scoreAeo: null,
  scoreVisibility: null,
  scoreHygiene: null,
  scoreCitability: null,
  citationRatePct: null,
  sovPct: null,
  topThree: [],
  allGaps: [],
  banner: null,
  failure: null,
  durationMs: null,
  costCents: null,
};

function reducer(state: ScanStreamState, ev: ScanEvent): ScanStreamState {
  switch (ev.type) {
    case "scan.started":
      return { ...state, status: "streaming", url: ev.url };
    case "crawl.started":
      return state;
    case "crawl.page.fetched":
      return {
        ...state,
        pages: [...state.pages, { url: ev.url, statusCode: ev.statusCode, bytes: ev.bytes }],
      };
    case "brand.inferred":
      return { ...state, brandName: ev.brandName, category: ev.category };
    case "seo.psi.completed":
      return {
        ...state,
        psiByUrl: { ...state.psiByUrl, [ev.url]: { scores: ev.scores, weightedSeo: ev.weightedSeo } },
      };
    case "hygiene.checked":
      return { ...state, hygiene: ev.checks };
    case "citability.computed":
      return { ...state, citability: ev.metrics };
    case "aeo.probe.started":
      return state;
    case "aeo.probe.completed":
      return {
        ...state,
        probes: {
          ...state.probes,
          [`${ev.engine}:${ev.probeKind}`]: {
            engine: ev.engine,
            probeKind: ev.probeKind,
            weightedScore: ev.weightedScore,
            parsed: ev.parsed,
          },
        },
      };
    case "scores.computed":
      return {
        ...state,
        scoreSeo: ev.scoreSeo,
        scoreAeo: ev.scoreAeo,
        scoreVisibility: ev.scoreVisibility,
        scoreHygiene: ev.scoreHygiene,
        scoreCitability: ev.scoreCitability,
        citationRatePct: ev.citationRatePct,
        sovPct: ev.sovPct,
      };
    case "gaps.ranked":
      return { ...state, topThree: ev.topThree, allGaps: ev.allGaps };
    case "scan.completed":
      return { ...state, status: "complete", durationMs: ev.durationMs, costCents: ev.costCents };
    case "scan.failed":
      return { ...state, status: "failed", failure: { stage: ev.stage, reason: ev.reason } };
    case "budget.tripped":
      return { ...state, banner: ev.banner };
    default:
      return state;
  }
}

/* --------------------------- hook -------------------------------------- */

export function useScanStream(scanId: string | null): ScanStreamState {
  const [state, dispatch] = useReducer(reducer, initial);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!scanId) return;
    seenIds.current.clear();

    const url = `/api/v1/scans/${scanId}/stream`;
    const es = new EventSource(url);

    const handler = (event: MessageEvent) => {
      if (event.lastEventId && seenIds.current.has(event.lastEventId)) return;
      if (event.lastEventId) seenIds.current.add(event.lastEventId);
      try {
        const data = JSON.parse(event.data) as ScanEvent;
        dispatch(data);
      } catch (err) {
        console.error("scan stream parse error", err, event.data);
      }
    };

    // Each typed SSE event is dispatched on its own listener. Add one for
    // each scan event type plus a fallback "message" listener for safety.
    const types: ScanEvent["type"][] = [
      "scan.started",
      "crawl.started",
      "crawl.page.fetched",
      "brand.inferred",
      "seo.psi.completed",
      "hygiene.checked",
      "citability.computed",
      "aeo.probe.started",
      "aeo.probe.completed",
      "scores.computed",
      "gaps.ranked",
      "scan.completed",
      "scan.failed",
      "budget.tripped",
    ];
    for (const t of types) es.addEventListener(t, handler as unknown as EventListener);
    es.addEventListener("message", handler as unknown as EventListener);

    es.addEventListener("error", () => {
      // The browser reconnects automatically on recoverable errors. Only mark
      // failed when the stream has clearly ended without scan.completed.
    });

    return () => {
      for (const t of types) es.removeEventListener(t, handler as unknown as EventListener);
      es.close();
    };
  }, [scanId]);

  return state;
}
