import { describe, expect, it } from "vitest";
import { __testing, weightedSeoScore } from "./psi";
import type { PsiCategoryScores } from "./types";

const { parsePsi, SEO_WEIGHTS } = __testing;

describe("weightedSeoScore", () => {
  it("applies the spec weights 25/25/20/30", () => {
    const scores: PsiCategoryScores = {
      performance: 100,
      accessibility: 100,
      bestPractices: 100,
      seo: 100,
    };
    expect(weightedSeoScore(scores)).toBe(100);
  });

  it("computes a partial score correctly", () => {
    const scores: PsiCategoryScores = {
      performance: 50,
      accessibility: 80,
      bestPractices: 90,
      seo: 95,
    };
    const expected =
      50 * SEO_WEIGHTS.performance +
      80 * SEO_WEIGHTS.accessibility +
      90 * SEO_WEIGHTS.bestPractices +
      95 * SEO_WEIGHTS.seo;
    expect(weightedSeoScore(scores)).toBe(Math.round(expected));
  });
});

describe("parsePsi", () => {
  it("normalizes 0-1 PSI scores into 0-100 ints and surfaces top failures", () => {
    const fakeBody = {
      lighthouseResult: {
        categories: {
          performance: { score: 0.94 },
          accessibility: { score: 0.99 },
          "best-practices": { score: 0.83 },
          seo: { score: 1 },
        },
        audits: {
          "uses-https": { title: "Use HTTPS", description: "...", score: 1 },
          "image-alt": {
            title: "Image alt text",
            description: "Some images missing alt.",
            score: 0.5,
            scoreDisplayMode: "binary",
          },
          "meta-description": {
            title: "Has meta description",
            description: "Missing meta description.",
            score: 0,
            scoreDisplayMode: "binary",
          },
          "is-on-https": { title: "Informative", score: 0.2, scoreDisplayMode: "informative" },
        },
      },
    };
    const r = parsePsi("https://acme.example/", fakeBody, 1234);
    expect(r.scores.performance).toBe(94);
    expect(r.scores.accessibility).toBe(99);
    expect(r.scores.bestPractices).toBe(83);
    expect(r.scores.seo).toBe(100);
    expect(r.weightedSeo).toBeGreaterThan(90);
    // failures are sorted by ascending score, informative excluded
    expect(r.failures[0]?.id).toBe("meta-description");
    expect(r.failures.find((f) => f.id === "is-on-https")).toBeUndefined();
    expect(r.fetchMs).toBe(1234);
  });

  it("handles missing categories without throwing", () => {
    const r = parsePsi("https://x.com", { lighthouseResult: {} }, 0);
    expect(r.scores.performance).toBe(0);
    expect(r.scores.seo).toBe(0);
    expect(r.weightedSeo).toBe(0);
  });
});
