import { describe, expect, it } from "vitest";
import { rankGaps } from "./gaps";
import type { HygieneCheck } from "@/lib/audits/types";
import type { ProbeResult, BrandContext } from "@/lib/audits/aeo/types";

const ctx: BrandContext = {
  brandName: "Acme",
  category: "CRM software",
  hostname: "acme.example",
  llmFallback: false,
};

function hygiene(over: Partial<HygieneCheck>): HygieneCheck {
  return {
    id: "h.x",
    category: "meta",
    status: "fail",
    title: "x",
    why: "y",
    severity: "medium",
    scoreImpact: 5,
    ...over,
  };
}

function probe(over: Partial<ProbeResult>): ProbeResult {
  return {
    scanId: "s",
    engine: "openai",
    probeKind: "brand_recall",
    prompt: "",
    response: "x",
    parsed: {
      brandMentioned: false,
      urlCited: false,
      position: "none",
      sentiment: "neutral",
      accuracy: "accurate",
    },
    baseScore: 0,
    weightedScore: 0,
    latencyMs: 0,
    costCents: 0,
    status: "ok",
    ...over,
  };
}

describe("rankGaps", () => {
  it("ranks higher-impact + higher-severity + lower-effort gaps first", () => {
    const { topThree, allGaps } = rankGaps({
      ctx,
      hygieneChecks: [
        hygiene({
          id: "low",
          severity: "low",
          scoreImpact: 5,
          effort: "weeks",
          title: "Long-effort low-severity",
        }),
        hygiene({
          id: "high",
          severity: "high",
          scoreImpact: 30,
          effort: "30min",
          title: "Quick-win high-severity",
        }),
        hygiene({
          id: "med",
          severity: "medium",
          scoreImpact: 10,
          effort: "few-hours",
          title: "Medium",
        }),
      ],
      probes: [],
      psiFailures: [],
    });
    expect(topThree[0]?.title).toBe("Quick-win high-severity");
    expect(topThree[0]?.id).toBe("GL-01");
    expect(topThree[2]?.id).toBe("GL-03");
    expect(allGaps).toHaveLength(3);
    expect(allGaps[0]?.isTop3).toBe(true);
    expect(allGaps[2]?.isTop3).toBe(true);
  });

  it("excludes passing hygiene checks from gaps", () => {
    const { allGaps } = rankGaps({
      ctx,
      hygieneChecks: [hygiene({ id: "ok", status: "pass", severity: "low" })],
      probes: [],
      psiFailures: [],
    });
    expect(allGaps).toHaveLength(0);
  });

  it("includes degraded probes as gaps with engine context", () => {
    const { allGaps } = rankGaps({
      ctx,
      hygieneChecks: [],
      probes: [
        probe({
          engine: "perplexity",
          weightedScore: 0,
          parsed: {
            brandMentioned: false,
            urlCited: false,
            position: "none",
            sentiment: "neutral",
            accuracy: "accurate",
          },
        }),
      ],
      psiFailures: [],
    });
    expect(allGaps).toHaveLength(1);
    expect(allGaps[0]?.title).toMatch(/Perplexity/);
    expect(allGaps[0]?.meta).toMatchObject({ engine: "perplexity" });
  });

  it("excludes healthy probes", () => {
    const { allGaps } = rankGaps({
      ctx,
      hygieneChecks: [],
      probes: [
        probe({ weightedScore: 90, parsed: { ...probe({}).parsed!, brandMentioned: true, position: "primary" } }),
      ],
      psiFailures: [],
    });
    expect(allGaps).toHaveLength(0);
  });

  it("assigns sequential GL-NN ids", () => {
    const { allGaps } = rankGaps({
      ctx,
      hygieneChecks: [
        hygiene({ id: "a", severity: "high", scoreImpact: 30, effort: "30min" }),
        hygiene({ id: "b", severity: "high", scoreImpact: 30, effort: "30min" }),
        hygiene({ id: "c", severity: "high", scoreImpact: 30, effort: "30min" }),
        hygiene({ id: "d", severity: "high", scoreImpact: 30, effort: "30min" }),
      ],
      probes: [],
      psiFailures: [],
    });
    expect(allGaps.map((g) => g.id)).toEqual(["GL-01", "GL-02", "GL-03", "GL-04"]);
    expect(allGaps[0]?.isTop3).toBe(true);
    expect(allGaps[3]?.isTop3).toBe(false);
  });
});
