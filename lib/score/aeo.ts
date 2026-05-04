/**
 * Overall AEO score per spec §6.2.
 *   AEO = Engine Visibility × 60% + AEO Hygiene × 25% + Citability × 15%
 */
import type { CitabilityMetrics, HygieneCheck } from "@/lib/audits/types";
import type { ProbeResult } from "@/lib/audits/aeo/types";
import { aggregateHygieneScore } from "@/lib/audits/hygiene";
import { aggregateVisibility } from "@/lib/audits/aeo/score";

export interface AeoOverall {
  score: number;
  visibility: number;
  hygiene: number;
  citability: number;
  citationRatePct: number;
  sovPct: number;
  perEngine: ReturnType<typeof aggregateVisibility>["perEngine"];
}

interface AeoInput {
  probes: ProbeResult[];
  hygieneChecks: HygieneCheck[];
  citability: CitabilityMetrics;
}

export function computeAeoOverall(input: AeoInput): AeoOverall {
  const visibilityAgg = aggregateVisibility(input.probes);
  const hygiene = aggregateHygieneScore(input.hygieneChecks);
  const citability = input.citability.score;

  const score = Math.round(visibilityAgg.visibility * 0.6 + hygiene * 0.25 + citability * 0.15);

  return {
    score,
    visibility: visibilityAgg.visibility,
    hygiene,
    citability,
    citationRatePct: visibilityAgg.citationRatePct,
    sovPct: visibilityAgg.sovPct,
    perEngine: visibilityAgg.perEngine,
  };
}
