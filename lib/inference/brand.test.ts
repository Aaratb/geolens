import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { inferBrand, __testing } from "./brand";

const { fallbackBrandFromHost, guessCategoryFromDescription, pickShortest } = __testing;

describe("fallbackBrandFromHost", () => {
  it("strips www and capitalizes", () => {
    expect(fallbackBrandFromHost("www.acme.example")).toBe("Acme");
    expect(fallbackBrandFromHost("vercel.com")).toBe("Vercel");
  });
});

describe("guessCategoryFromDescription", () => {
  it("matches CRM phrases", () => {
    expect(guessCategoryFromDescription("Modern CRM for sales teams")).toBe("CRM software");
  });
  it("matches no-code", () => {
    expect(guessCategoryFromDescription("A no-code platform")).toBe("no-code platforms");
  });
  it("returns undefined for unknown text", () => {
    expect(guessCategoryFromDescription("the quick brown fox")).toBeUndefined();
  });
});

describe("pickShortest", () => {
  it("returns the shortest distinct candidate", () => {
    expect(pickShortest(["Acme Corporation", "Acme", "ACME"])).toBe("Acme");
  });
  it("returns null for empty input", () => {
    expect(pickShortest([])).toBeNull();
  });
});

describe("inferBrand", () => {
  it("uses JSON-LD Organization name when present", async () => {
    const ld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Acme Corp",
      description: "Modern CRM for growing teams",
    });
    const html = `<html><head>
      <title>Acme Corp · CRM</title>
      <script type="application/ld+json">${ld}</script>
    </head><body></body></html>`;
    const result = await inferBrand({
      $: load(html),
      hostname: "acme.example",
      llm: async () => ({ brandName: "WRONG", category: "WRONG" }),
    });
    expect(result.brandName).toBe("Acme Corp");
    expect(result.category).toBe("CRM software");
    expect(result.llmFallback).toBe(false);
  });

  it("falls back through OG → title → host", async () => {
    const html = `<html><head>
      <meta property="og:site_name" content="OG Site">
      <title>Page Title - OG Site</title>
    </head><body></body></html>`;
    const result = await inferBrand({
      $: load(html),
      hostname: "ogsite.example",
      llm: async () => ({ brandName: "ignored", category: "ignored" }),
    });
    expect(result.brandName).toBe("OG Site");
  });

  it("invokes LLM fallback when heuristics fail", async () => {
    const html = `<html><head>
      <title></title>
    </head><body></body></html>`;
    let llmCalled = false;
    const result = await inferBrand({
      $: load(html),
      hostname: "mystery.example",
      llm: async () => {
        llmCalled = true;
        return { brandName: "Mystery Inc", category: "AI tools" };
      },
    });
    expect(llmCalled).toBe(true);
    expect(result.brandName).toBe("Mystery Inc");
    expect(result.category).toBe("AI tools");
    expect(result.llmFallback).toBe(true);
  });

  it("recovers when LLM fallback throws", async () => {
    const html = `<html><head><title>Acme</title></head><body></body></html>`;
    const result = await inferBrand({
      $: load(html),
      hostname: "acme.example",
      llm: async () => {
        throw new Error("rate limited");
      },
    });
    expect(result.brandName.length).toBeGreaterThan(0);
    expect(result.category).toBe("company");
    expect(result.llmFallback).toBe(false);
  });
});
