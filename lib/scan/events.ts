/**
 * Typed scan-event taxonomy. Same shape as spec §3 SSE schema — what the
 * worker emits, what the SSE endpoint relays, what the client renders against.
 *
 * Discriminated union so the report UI can switch(type) and TS proves
 * exhaustiveness.
 */
import type { CitabilityMetrics, HygieneCheck, PsiCategoryScores } from "@/lib/audits/types";
import type { Engine, ProbeKind } from "@/lib/db/schema";
import type { ParsedProbeFields } from "@/lib/audits/aeo/types";
import type { Gap } from "@/lib/score/gaps";

export type ScanEvent =
  | { type: "scan.started"; url: string }
  | { type: "crawl.started"; pages: string[] }
  | { type: "crawl.page.fetched"; url: string; statusCode: number; bytes: number }
  | { type: "brand.inferred"; brandName: string; category: string; llmFallback: boolean }
  | {
      type: "seo.psi.completed";
      url: string;
      scores: PsiCategoryScores;
      weightedSeo: number;
    }
  | { type: "hygiene.checked"; checks: HygieneCheck[] }
  | { type: "citability.computed"; metrics: CitabilityMetrics }
  | { type: "aeo.probe.started"; engine: Engine; probeKind: ProbeKind }
  | {
      type: "aeo.probe.completed";
      engine: Engine;
      probeKind: ProbeKind;
      weightedScore: number;
      parsed: ParsedProbeFields;
    }
  | {
      type: "scores.computed";
      // scoreSeo can be null when all PSI calls fail (REL-H-6).
      scoreSeo: number | null;
      scoreAeo: number;
      scoreVisibility: number;
      scoreHygiene: number;
      scoreCitability: number;
      citationRatePct: number;
      sovPct: number;
    }
  | { type: "gaps.ranked"; topThree: Gap[]; allGaps: Gap[] }
  | {
      type: "scan.completed";
      durationMs: number;
      costCents: number;
      pagesScanned: number;
      enginesProbed: number;
      enginesSkipped: number;
    }
  | { type: "scan.failed"; stage: string; reason: string }
  | { type: "scan.timeout"; reason: string }
  | { type: "budget.tripped"; reason: "daily" | "per-scan"; banner: string };

export type ScanEventType = ScanEvent["type"];
