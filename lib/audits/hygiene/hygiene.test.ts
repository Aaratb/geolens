import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { checkRobotsAiCrawlers } from "./robots-ai";
import { checkJsonLd } from "./jsonld";
import { checkMeta } from "./meta";
import { checkHeadings } from "./headings";
import { checkSemantic } from "./semantic";
import { aggregateHygieneScore } from "./index";
import type { HygieneCheck } from "../types";

describe("checkRobotsAiCrawlers", () => {
  it("warns when no robots.txt is present", () => {
    const checks = checkRobotsAiCrawlers(null);
    expect(checks).toHaveLength(1);
    expect(checks[0]?.id).toBe("robots-ai.no-robots");
  });

  it("flags missing AI crawler rules", () => {
    const robots = `User-agent: *\nDisallow:`;
    const checks = checkRobotsAiCrawlers(robots);
    const missingGpt = checks.find((c) => c.id === "robots-ai.gptbot.missing");
    expect(missingGpt?.status).toBe("warn");
  });

  it("passes when major AI crawlers have explicit rules", () => {
    const robots = `User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Disallow: /`;
    const checks = checkRobotsAiCrawlers(robots);
    expect(checks.find((c) => c.id === "robots-ai.gptbot.blocked")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "robots-ai.claudebot.allowed")?.status).toBe("pass");
  });
});

describe("checkJsonLd", () => {
  it("fails when no JSON-LD present", () => {
    const $ = load("<html><body></body></html>");
    const checks = checkJsonLd($);
    expect(checks[0]?.id).toBe("jsonld.absent");
  });

  it("flags malformed JSON-LD", () => {
    const html = `<html><head><script type="application/ld+json">{ broken</script></head></html>`;
    const $ = load(html);
    const checks = checkJsonLd($);
    expect(checks[0]?.id).toBe("jsonld.parse-error");
  });

  it("recognizes Organization + WebSite + thin coverage", () => {
    const ld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Acme",
    });
    const ld2 = JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Acme" });
    const html = `<html><head>
      <script type="application/ld+json">${ld}</script>
      <script type="application/ld+json">${ld2}</script>
    </head><body></body></html>`;
    const $ = load(html);
    const checks = checkJsonLd($);
    const org = checks.find((c) => c.id === "jsonld.organization");
    const cov = checks.find((c) => c.id === "jsonld.coverage");
    expect(org?.status).toBe("pass");
    expect(cov?.status).toBe("warn");
  });

  it("rewards rich coverage", () => {
    const blocks = [
      { "@type": "Organization", name: "Acme" },
      { "@type": "WebSite", name: "Acme" },
      { "@type": "Article", headline: "x" },
      { "@type": "FAQPage" },
    ].map((o) => JSON.stringify(o));
    const html = `<html><head>${blocks
      .map((b) => `<script type="application/ld+json">${b}</script>`)
      .join("")}</head><body></body></html>`;
    const $ = load(html);
    const checks = checkJsonLd($);
    expect(checks.find((c) => c.id === "jsonld.coverage")?.status).toBe("pass");
  });

  it("walks @graph nodes", () => {
    const ld = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "Organization", name: "Acme" }, { "@type": "WebSite", name: "Acme" }],
    });
    const html = `<html><head><script type="application/ld+json">${ld}</script></head><body></body></html>`;
    const $ = load(html);
    const checks = checkJsonLd($);
    expect(checks.find((c) => c.id === "jsonld.organization")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "jsonld.website")?.status).toBe("pass");
  });
});

describe("checkMeta", () => {
  it("flags missing title and description", () => {
    const $ = load("<html><head></head><body></body></html>");
    const checks = checkMeta($);
    expect(checks.find((c) => c.id === "meta.title-missing")?.status).toBe("fail");
    expect(checks.find((c) => c.id === "meta.description-missing")?.status).toBe("fail");
  });

  it("passes a well-formed head", () => {
    const html = `<html><head>
      <title>Acme · Premium widgets for the enterprise</title>
      <meta name="description" content="Acme delivers premium widgets to teams that care about quality across global supply chains every day.">
      <link rel="canonical" href="https://acme.example/">
      <meta property="og:title" content="Acme">
      <meta property="og:description" content="Premium widgets">
      <meta property="og:image" content="https://acme.example/og.png">
      <meta name="twitter:card" content="summary_large_image">
    </head><body></body></html>`;
    const $ = load(html);
    const checks = checkMeta($);
    expect(checks.find((c) => c.id === "meta.title-ok")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "meta.opengraph")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "meta.twitter-card")?.status).toBe("pass");
  });
});

describe("checkHeadings", () => {
  it("fails on missing H1", () => {
    const $ = load("<html><body><h2>x</h2></body></html>");
    const checks = checkHeadings($);
    expect(checks[0]?.id).toBe("headings.no-h1");
  });

  it("warns on multiple H1s", () => {
    const $ = load("<html><body><h1>a</h1><h1>b</h1></body></html>");
    const checks = checkHeadings($);
    expect(checks[0]?.id).toBe("headings.multiple-h1");
  });

  it("warns on skipped levels", () => {
    const $ = load("<html><body><h1>a</h1><h3>x</h3></body></html>");
    const checks = checkHeadings($);
    expect(checks.find((c) => c.id === "headings.skipped-level")).toBeTruthy();
  });
});

describe("checkSemantic", () => {
  it("flags div soup", () => {
    const $ = load(`<html><body>${"<div></div>".repeat(50)}</body></html>`);
    const checks = checkSemantic($);
    expect(checks.find((c) => c.id === "semantic.density")?.status).toBe("fail");
  });

  it("rewards landmarks", () => {
    const $ = load(
      `<html><body><nav></nav><main><article><section></section></article></main><footer></footer></body></html>`,
    );
    const checks = checkSemantic($);
    expect(checks.find((c) => c.id === "semantic.main-landmark")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "semantic.density")?.status).toBe("pass");
  });
});

describe("aggregateHygieneScore", () => {
  it("returns 0 for empty input", () => {
    expect(aggregateHygieneScore([])).toBe(0);
  });

  it("returns 100 when all checks pass", () => {
    const checks: HygieneCheck[] = [
      { id: "a", category: "meta", status: "pass", title: "", why: "", scoreImpact: 10, severity: "low" },
      { id: "b", category: "meta", status: "pass", title: "", why: "", scoreImpact: 5, severity: "low" },
    ];
    expect(aggregateHygieneScore(checks)).toBe(100);
  });

  it("treats warns as half credit", () => {
    const checks: HygieneCheck[] = [
      { id: "a", category: "meta", status: "warn", title: "", why: "", scoreImpact: 10, severity: "low" },
    ];
    expect(aggregateHygieneScore(checks)).toBe(50);
  });

  it("returns 0 when all fail", () => {
    const checks: HygieneCheck[] = [
      { id: "a", category: "meta", status: "fail", title: "", why: "", scoreImpact: 10, severity: "high" },
    ];
    expect(aggregateHygieneScore(checks)).toBe(0);
  });
});
