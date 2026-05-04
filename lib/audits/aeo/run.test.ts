import { describe, expect, it } from "vitest";
import { runAeoProbes } from "./run";
import { __testing as runInternals } from "./run";
import type { BrandContext } from "./types";
import { heuristicParser } from "./parse";

const ctx: BrandContext = {
  brandName: "Acme Corp",
  category: "CRM software",
  hostname: "acme.example",
  llmFallback: false,
};

describe("runAeoProbes", () => {
  it("runs 4 engines × 3 probes = 12 probes", async () => {
    let calls = 0;
    const results = await runAeoProbes({
      scanId: "test-1",
      ctx,
      generator: async ({ engine, probe }: { engine: string; probe?: string }) => {
        void engine;
        void probe;
        calls++;
        return {
          text: `Acme Corp is a CRM tool used by acme.example customers.`,
          usage: { tokens: 200 },
        };
      },
      parser: async ({ ctx: c, responseText }) => heuristicParser(c, responseText),
    });

    expect(results).toHaveLength(12);
    expect(calls).toBe(12);
    const okCount = results.filter((r) => r.status === "ok").length;
    expect(okCount).toBe(12);
    // Every engine should appear 3 times
    const byEngine = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.engine] = (acc[r.engine] ?? 0) + 1;
      return acc;
    }, {});
    expect(byEngine.openai).toBe(3);
    expect(byEngine.anthropic).toBe(3);
    expect(byEngine.perplexity).toBe(3);
    expect(byEngine.gemini).toBe(3);
  });

  it("scores probes correctly when the brand is mentioned", async () => {
    const results = await runAeoProbes({
      scanId: "test-2",
      ctx,
      generator: async () => ({
        text: `Acme Corp is the leading CRM. They run acme.example as their main domain.`,
        usage: { tokens: 100 },
      }),
      parser: async ({ ctx: c, responseText }) => heuristicParser(c, responseText),
    });
    const brandRecall = results.find((r) => r.probeKind === "brand_recall");
    expect(brandRecall?.parsed?.brandMentioned).toBe(true);
    expect(brandRecall?.weightedScore).toBeGreaterThan(0);
  });

  it("survives generator failures by marking the probe errored", async () => {
    let nthCall = 0;
    const results = await runAeoProbes({
      scanId: "test-3",
      ctx,
      generator: async () => {
        nthCall++;
        if (nthCall === 5) throw new Error("rate limited");
        return { text: "Acme Corp is a CRM.", usage: { tokens: 100 } };
      },
      parser: async ({ ctx: c, responseText }) => heuristicParser(c, responseText),
    });
    const errored = results.filter((r) => r.status === "errored");
    expect(errored).toHaveLength(1);
    expect(errored[0]?.error).toContain("rate limited");
    expect(results.filter((r) => r.status === "ok")).toHaveLength(11);
  });

  it("invokes onProbeComplete for streaming UX", async () => {
    const seen: string[] = [];
    await runAeoProbes({
      scanId: "test-4",
      ctx,
      onProbeComplete: (p) => seen.push(`${p.engine}:${p.probeKind}`),
      generator: async () => ({ text: "Acme Corp is a CRM.", usage: { tokens: 100 } }),
      parser: async ({ ctx: c, responseText }) => heuristicParser(c, responseText),
    });
    expect(seen).toHaveLength(12);
  });
});

describe("estimateCostCents", () => {
  it("returns nonzero for known models", () => {
    expect(runInternals.estimateCostCents("openai/gpt-4o-mini", 1500)).toBeGreaterThan(0);
    expect(runInternals.estimateCostCents("anthropic/claude-3-5-haiku-latest", 1500)).toBeGreaterThan(0);
  });
  it("rounds up", () => {
    // 100 tokens × 0.06¢/1k = 0.006¢ → ceil → 1¢
    expect(runInternals.estimateCostCents("openai/gpt-4o-mini", 100)).toBe(1);
  });
});
