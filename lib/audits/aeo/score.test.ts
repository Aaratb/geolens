import { describe, expect, it } from "vitest";
import {
  POSITION_MULTIPLIER,
  SENTIMENT_MULTIPLIER,
  ACCURACY_MULTIPLIER,
  applyMultipliers,
  baseScoreFor,
  aggregateVisibility,
} from "./score";
import type { ProbeResult, ParsedProbeFields } from "./types";

const PERFECT_PARSED: ParsedProbeFields = {
  brandMentioned: true,
  urlCited: true,
  position: "primary",
  sentiment: "positive",
  accuracy: "accurate",
};

describe("multipliers match spec §6.3", () => {
  it("position multipliers", () => {
    expect(POSITION_MULTIPLIER.primary).toBe(1.0);
    expect(POSITION_MULTIPLIER.secondary).toBe(0.7);
    expect(POSITION_MULTIPLIER.tertiary).toBe(0.4);
    expect(POSITION_MULTIPLIER.none).toBe(0.0);
  });
  it("sentiment multipliers", () => {
    expect(SENTIMENT_MULTIPLIER.positive).toBe(1.2);
    expect(SENTIMENT_MULTIPLIER.neutral).toBe(1.0);
    expect(SENTIMENT_MULTIPLIER.negative).toBe(0.5);
  });
  it("accuracy multipliers", () => {
    expect(ACCURACY_MULTIPLIER.accurate).toBe(1.0);
    expect(ACCURACY_MULTIPLIER.partial).toBe(0.7);
    expect(ACCURACY_MULTIPLIER.misattributed).toBe(0.3);
  });
});

describe("baseScoreFor", () => {
  it("brand_recall: 100 if mentioned else 0", () => {
    expect(baseScoreFor("brand_recall", PERFECT_PARSED)).toBe(100);
    expect(baseScoreFor("brand_recall", { ...PERFECT_PARSED, brandMentioned: false })).toBe(0);
  });
  it("category_placement: 100 if mentioned, position handled by multiplier", () => {
    expect(baseScoreFor("category_placement", PERFECT_PARSED)).toBe(100);
    expect(baseScoreFor("category_placement", { ...PERFECT_PARSED, brandMentioned: false })).toBe(0);
  });
  it("citation_behavior: 100 url-cited, 50 brand-only, 0 absent", () => {
    expect(baseScoreFor("citation_behavior", PERFECT_PARSED)).toBe(100);
    expect(baseScoreFor("citation_behavior", { ...PERFECT_PARSED, urlCited: false })).toBe(50);
    expect(
      baseScoreFor("citation_behavior", {
        ...PERFECT_PARSED,
        urlCited: false,
        brandMentioned: false,
      }),
    ).toBe(0);
  });
});

describe("applyMultipliers", () => {
  it("clamps to 0-100", () => {
    expect(applyMultipliers(100, PERFECT_PARSED)).toBe(100); // capped at 100 even with 1.2x sentiment
    expect(
      applyMultipliers(0, { ...PERFECT_PARSED, brandMentioned: false, position: "none" }),
    ).toBe(0);
  });
  it("compounds multipliers correctly", () => {
    const tertiaryNegativePartial: ParsedProbeFields = {
      brandMentioned: true,
      urlCited: false,
      position: "tertiary",
      sentiment: "negative",
      accuracy: "partial",
    };
    // 100 × 0.4 × 0.5 × 0.7 = 14
    expect(applyMultipliers(100, tertiaryNegativePartial)).toBe(14);
  });
});

describe("aggregateVisibility", () => {
  function probe(
    engine: "openai" | "anthropic" | "perplexity" | "gemini",
    probeKind: "brand_recall" | "category_placement" | "citation_behavior",
    weighted: number,
    parsed: Partial<ParsedProbeFields> = {},
  ): ProbeResult {
    return {
      scanId: "s1",
      engine,
      probeKind,
      prompt: "",
      response: "ok",
      parsed: {
        brandMentioned: weighted > 0,
        urlCited: weighted > 50,
        position: weighted > 0 ? "primary" : "none",
        sentiment: "neutral",
        accuracy: "accurate",
        ...parsed,
      },
      baseScore: weighted,
      weightedScore: weighted,
      latencyMs: 0,
      costCents: 0,
      status: "ok",
    };
  }

  it("returns zeros when no successful probes", () => {
    const r = aggregateVisibility([]);
    expect(r.visibility).toBe(0);
    expect(r.citationRatePct).toBe(0);
  });

  it("computes per-engine averages and overall visibility", () => {
    const probes: ProbeResult[] = [
      probe("openai", "brand_recall", 100),
      probe("openai", "category_placement", 80),
      probe("anthropic", "brand_recall", 60),
      probe("perplexity", "citation_behavior", 0, {
        brandMentioned: false,
        urlCited: false,
        position: "none",
      }),
    ];
    const r = aggregateVisibility(probes);
    expect(r.perEngine.openai).toBe(90);
    expect(r.perEngine.anthropic).toBe(60);
    expect(r.perEngine.perplexity).toBe(0);
    expect(r.visibility).toBe(60); // (100+80+60+0)/4
    expect(r.citationRatePct).toBe(75); // 3/4 brandMentioned
  });

  it("excludes errored probes from aggregation", () => {
    const probes: ProbeResult[] = [
      probe("openai", "brand_recall", 100),
      {
        scanId: "s1",
        engine: "anthropic",
        probeKind: "brand_recall",
        prompt: "",
        response: null,
        parsed: null,
        baseScore: 0,
        weightedScore: 0,
        latencyMs: 0,
        costCents: 0,
        status: "errored",
        error: "rate limit",
      },
    ];
    const r = aggregateVisibility(probes);
    expect(r.visibility).toBe(100); // only the ok probe counts
    expect(r.perEngine.anthropic).toBe(0);
  });
});
