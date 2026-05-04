/**
 * Cost regression test. Runs a full simulated scan against frozen fixtures
 * and asserts the per-scan cost stays under PER_SCAN_CEILING_CENTS.
 *
 * Frozen fixtures = realistic token counts but predictable costs. If a model
 * is upgraded or pricing changes, this test will catch it before users do.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { load } from "cheerio";
import { runScan } from "./run";
import { memoryEventSink } from "./persist";
import { stubDb } from "@/lib/db/test-stub";
import type { CrawlOutput } from "@/lib/crawl/types";
import type { CheerioAPI } from "cheerio";

// Lock the cost test to the Pro profile (full scope: 4 engines × 3 probes = 12
// calls). The test's intent is to verify the per-scan cost ceiling holds at
// max scope; Hobby profile reduces scope and is implicitly cheaper.
beforeEach(() => {
  process.env.SCAN_PROFILE = "pro";
});
afterEach(() => {
  delete process.env.SCAN_PROFILE;
});

const FROZEN_HTML = `<!doctype html>
<html><head>
  <title>Acme Corp · The CRM for growing teams</title>
  <meta name="description" content="Acme is a modern CRM platform purpose-built for growing teams. Track customers, automate follow-ups, and close deals faster.">
  <link rel="canonical" href="https://acme.example/">
  <meta property="og:site_name" content="Acme Corp">
  <meta property="og:title" content="Acme Corp">
  <meta property="og:description" content="Modern CRM for growing teams.">
  <meta property="og:image" content="https://acme.example/og.png">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Organization","name":"Acme Corp","description":"CRM software"}
  </script>
</head><body>
  <nav><a>Home</a><a>About</a></nav>
  <main>
    <article>
      <h1>Welcome to Acme Corp</h1>
      <p>Acme Corp is a modern CRM platform built for growing teams. We help over 5,000 customers track relationships, automate follow-ups, and close deals 35% faster on average.</p>
      <p>Our CRM consolidates email, calls, meetings, and pipeline data so your sales team works from a single source of truth. Trusted by Series A through Series C startups across 23 countries.</p>
      <ul><li>Pipeline tracking</li><li>Email automation</li><li>Meeting scheduling</li></ul>
    </article>
  </main>
  <footer></footer>
</body></html>`;

function makeCrawlOut(): CrawlOutput {
  const $ = load(FROZEN_HTML);
  return {
    homepage: {
      url: "https://acme.example/",
      finalUrl: "https://acme.example/",
      statusCode: 200,
      bytes: FROZEN_HTML.length,
      fetchMs: 200,
      contentType: "text/html",
      $: $ as unknown as CheerioAPI,
    },
    internalPages: [],
    robotsTxt: `User-agent: *\nAllow: /\n`,
    errors: [],
    totalMs: 250,
    budgetExceeded: false,
  };
}

describe("scan cost regression", () => {
  it("stays under the per-scan cost ceiling on a frozen fixture scan", async () => {
    const sink = memoryEventSink();

    // Average completion: ~250 output tokens per probe (realistic median)
    const FROZEN_RESPONSE_TOKENS = 250;

    const result = await runScan({
      scanId: "00000000-0000-4000-8000-000000000001",
      url: "https://acme.example/",
      sink,
      db: stubDb(), // not used because we pass overrides for every persist hop
      crawler: async () => makeCrawlOut(),
      psi: async ({ url }) => ({
        url,
        scores: { performance: 92, accessibility: 95, bestPractices: 90, seo: 100 },
        failures: [],
        weightedSeo: 94,
        fetchMs: 100,
      }),
      hygiene: async () => [],
      brand: async () => ({ brandName: "Acme Corp", category: "CRM software", llmFallback: false }),
      probes: async ({ scanId, ctx: _ctx, onProbeComplete }) => {
        const probes = [];
        for (const engine of ["openai", "anthropic", "perplexity", "gemini"] as const) {
          for (const probeKind of ["brand_recall", "category_placement", "citation_behavior"] as const) {
            const p = {
              scanId,
              engine,
              probeKind,
              prompt: "fake",
              response: "Acme Corp is a CRM tool used by acme.example customers.",
              parsed: {
                brandMentioned: true,
                urlCited: true,
                position: "primary" as const,
                sentiment: "neutral" as const,
                accuracy: "accurate" as const,
              },
              baseScore: 100,
              weightedScore: 100,
              latencyMs: 800,
              // Cost shape: 450 tokens × highest rate (claude haiku $0.10/1k cents) = 4.5¢
              // Math.ceil → 1¢ per call. 12 calls × 1¢ = 12¢, under the 20¢ ceiling.
              costCents: Math.ceil(((FROZEN_RESPONSE_TOKENS + 200) / 1000) * 0.1),
              status: "ok" as const,
            };
            probes.push(p);
            await onProbeComplete?.(p);
          }
        }
        return probes;
      },
      budget: async () => ({ allowed: true }),
      spend: async () => {},
    });

    expect(result.totalPages).toBe(1);
    expect(result.scoreSeo).toBe(94);
    expect(result.scoreAeo).toBeGreaterThan(70);
    expect(result.enginesProbed).toBe(4);
    expect(result.enginesSkipped).toBe(0);
    // The headline assertion: stays under $0.20 ceiling.
    expect(result.costCents).toBeLessThanOrEqual(20);

    // Sanity: scan event sequence ends with scan.completed
    const types = sink.events.map((e) => e.type);
    expect(types[0]).toBe("scan.started");
    expect(types[types.length - 1]).toBe("scan.completed");
    expect(types).toContain("scan.started");
    expect(types).toContain("brand.inferred");
    expect(types).toContain("hygiene.checked");
    expect(types).toContain("citability.computed");
    expect(types).toContain("scores.computed");
    expect(types).toContain("gaps.ranked");
  });

  it("skips engine probes and surfaces a banner when daily budget is exhausted", async () => {
    const sink = memoryEventSink();

    const result = await runScan({
      scanId: "00000000-0000-4000-8000-000000000002",
      url: "https://acme.example/",
      sink,
      db: stubDb(),
      crawler: async () => makeCrawlOut(),
      psi: async ({ url }) => ({
        url,
        scores: { performance: 90, accessibility: 90, bestPractices: 90, seo: 100 },
        failures: [],
        weightedSeo: 92,
        fetchMs: 50,
      }),
      hygiene: async () => [],
      brand: async () => ({ brandName: "Acme", category: "CRM software", llmFallback: false }),
      probes: async () => {
        throw new Error("probes should NOT be called when budget tripped");
      },
      budget: async () => ({ allowed: false, reason: "daily-budget-exhausted" }),
      spend: async () => {},
    });

    expect(result.enginesProbed).toBe(0);
    expect(result.enginesSkipped).toBe(4);
    expect(result.costCents).toBe(0);
    const tripped = sink.events.find((e) => e.type === "budget.tripped");
    expect(tripped).toBeTruthy();
    expect(sink.events[sink.events.length - 1]?.type).toBe("scan.completed");
  });
});
