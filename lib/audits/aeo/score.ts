/**
 * Probe scoring per spec §6.3.
 *   probe_score = base × position_multiplier × sentiment_multiplier × accuracy_multiplier
 *
 * Multipliers sourced from competitive-research.md (Eclipse Pulse + Discovered Labs):
 *   - Position:  primary 1.0, secondary 0.7, tertiary 0.4, none 0.0
 *   - Sentiment: positive 1.2, neutral 1.0, negative 0.5
 *   - Accuracy:  accurate 1.0, partial 0.7, misattributed 0.3
 *
 * Engine Visibility (60% of AEO score) = average of all weighted probe scores
 * across engines × probes.
 */
import type {
  Accuracy,
  Engine,
  ParsedProbeFields,
  Position,
  ProbeKind,
  ProbeResult,
  Sentiment,
} from "./types";

export const POSITION_MULTIPLIER: Record<Position, number> = {
  primary: 1.0,
  secondary: 0.7,
  tertiary: 0.4,
  none: 0.0,
};

export const SENTIMENT_MULTIPLIER: Record<Sentiment, number> = {
  positive: 1.2,
  neutral: 1.0,
  negative: 0.5,
};

export const ACCURACY_MULTIPLIER: Record<Accuracy, number> = {
  accurate: 1.0,
  partial: 0.7,
  misattributed: 0.3,
};

export function baseScoreFor(kind: ProbeKind, parsed: ParsedProbeFields): number {
  switch (kind) {
    case "brand_recall":
      return parsed.brandMentioned ? 100 : 0;
    case "category_placement":
      // Category placement scales by position; the base is 100 if mentioned at all.
      return parsed.brandMentioned ? 100 : 0;
    case "citation_behavior":
      // Citation is the strongest signal: full credit for a real URL cite,
      // half credit for a name mention without link, none for absent.
      if (parsed.urlCited) return 100;
      if (parsed.brandMentioned) return 50;
      return 0;
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      return 0;
    }
  }
}

export function applyMultipliers(base: number, parsed: ParsedProbeFields): number {
  const weighted =
    base *
    POSITION_MULTIPLIER[parsed.position] *
    SENTIMENT_MULTIPLIER[parsed.sentiment] *
    ACCURACY_MULTIPLIER[parsed.accuracy];
  return Math.min(100, Math.max(0, Math.round(weighted)));
}

/**
 * Aggregate weighted probe scores into the Engine Visibility sub-score
 * (the 60% component of the AEO score per spec §6.2).
 */
export function aggregateVisibility(probes: ProbeResult[]): {
  visibility: number;
  citationRatePct: number;
  sovPct: number;
  perEngine: Record<Engine, number>;
} {
  const ok = probes.filter((p) => p.status === "ok" && p.parsed);
  if (ok.length === 0) {
    return {
      visibility: 0,
      citationRatePct: 0,
      sovPct: 0,
      perEngine: { openai: 0, anthropic: 0, perplexity: 0, gemini: 0 },
    };
  }

  const visibility = Math.round(ok.reduce((s, p) => s + p.weightedScore, 0) / ok.length);

  // Citation rate: % of probes where url_cited or brand_mentioned (per market vocab).
  const cited = ok.filter((p) => p.parsed?.brandMentioned).length;
  const citationRatePct = Math.round((cited / ok.length) * 100);

  // Share of voice: % of category_placement probes that named the brand at all.
  const categoryProbes = ok.filter((p) => p.probeKind === "category_placement");
  const sovHits = categoryProbes.filter((p) => p.parsed?.brandMentioned).length;
  const sovPct =
    categoryProbes.length === 0 ? 0 : Math.round((sovHits / categoryProbes.length) * 100);

  // Per-engine averages
  const perEngine: Record<Engine, number> = {
    openai: 0,
    anthropic: 0,
    perplexity: 0,
    gemini: 0,
  };
  for (const e of ["openai", "anthropic", "perplexity", "gemini"] as const) {
    const engineProbes = ok.filter((p) => p.engine === e);
    if (engineProbes.length === 0) continue;
    perEngine[e] = Math.round(
      engineProbes.reduce((s, p) => s + p.weightedScore, 0) / engineProbes.length,
    );
  }

  return { visibility, citationRatePct, sovPct, perEngine };
}
