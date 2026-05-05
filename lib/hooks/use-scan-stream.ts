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
  transportStatus: "connecting" | "live" | "reconnecting" | "stalled" | "resolved";
  lastEventAtMs: number | null;
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
  transportStatus: "connecting",
  lastEventAtMs: null,
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

type StreamEvent =
  | ScanEvent
  | { type: "stream.reset" }
  | { type: "stream.live" }
  | { type: "stream.reconnecting" }
  | { type: "stream.stalled" };

function reducer(state: ScanStreamState, ev: StreamEvent): ScanStreamState {
  switch (ev.type) {
    case "stream.reset":
      return initial;
    case "stream.live":
      return {
        ...state,
        transportStatus: state.status === "complete" || state.status === "failed" ? "resolved" : "live",
        lastEventAtMs: Date.now(),
      };
    case "stream.reconnecting":
      return {
        ...state,
        transportStatus: state.status === "complete" || state.status === "failed" ? "resolved" : "reconnecting",
      };
    case "stream.stalled":
      return {
        ...state,
        transportStatus: state.status === "complete" || state.status === "failed" ? "resolved" : "stalled",
      };
    case "scan.started":
      return {
        ...state,
        status: "streaming",
        transportStatus: "live",
        lastEventAtMs: Date.now(),
        url: ev.url,
      };
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
      return {
        ...state,
        status: "complete",
        transportStatus: "resolved",
        lastEventAtMs: Date.now(),
        durationMs: ev.durationMs,
        costCents: ev.costCents,
      };
    case "scan.failed":
      return {
        ...state,
        status: "failed",
        transportStatus: "resolved",
        lastEventAtMs: Date.now(),
        failure: { stage: ev.stage, reason: ev.reason },
      };
    case "scan.timeout":
      return {
        ...state,
        status: "failed",
        transportStatus: "resolved",
        lastEventAtMs: Date.now(),
        failure: { stage: "stream", reason: ev.reason },
      };
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
  const lastEventAt = useRef<number>(Date.now());
  const statusRef = useRef<ScanStreamState["status"]>("connecting");

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (!scanId) return;
    dispatch({ type: "stream.reset" });
    seenIds.current.clear();
    lastEventAt.current = Date.now();

    const url = `/api/v1/scans/${scanId}/stream`;
    const es = new EventSource(url);

    const handler = (event: MessageEvent) => {
      if (event.lastEventId && seenIds.current.has(event.lastEventId)) return;
      if (event.lastEventId) seenIds.current.add(event.lastEventId);
      lastEventAt.current = Date.now();
      dispatch({ type: "stream.live" });
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
      "scan.timeout",
      "budget.tripped",
    ];
    for (const t of types) es.addEventListener(t, handler as EventListener);
    es.addEventListener("message", handler as EventListener);
    es.addEventListener("open", () => {
      lastEventAt.current = Date.now();
      dispatch({ type: "stream.live" });
    });

    es.addEventListener("error", () => {
      if (statusRef.current === "streaming" || statusRef.current === "connecting") {
        dispatch({ type: "stream.reconnecting" });
      }
    });

    const stallTimer = window.setInterval(() => {
      if (statusRef.current !== "streaming" && statusRef.current !== "connecting") return;
      if (Date.now() - lastEventAt.current > 12000) {
        dispatch({ type: "stream.stalled" });
      }
    }, 2000);

    return () => {
      for (const t of types) es.removeEventListener(t, handler as EventListener);
      window.clearInterval(stallTimer);
      es.close();
    };
  }, [scanId]);

  return state;
}

export const __testing = { initial, reducer };
