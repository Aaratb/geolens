import { describe, expect, it } from "vitest";
import { crawl } from "./index";
import {
  HOMEPAGE_HTML,
  PAGE_HTML_MIN,
  ROBOTS_ALLOWING,
  ROBOTS_DISALLOW_ALL,
  ROBOTS_DISALLOW_BLOG,
  makeMockFetch,
} from "./test-fixtures";

const SEED = "https://acme.example/";

describe("crawl", () => {
  it("rejects an invalid URL without making any requests", async () => {
    const fetcher = makeMockFetch({});
    const out = await crawl({ url: "not a url at all !!!", fetcher });
    expect(out.homepage).toBeNull();
    expect(out.errors[0]?.error.kind).toBe("invalid_url");
  });

  it("returns the homepage and discovers internal pages from nav", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_ALLOWING },
      "https://acme.example/sitemap.xml": { status: 404 },
      "https://acme.example/sitemap_index.xml": { status: 404 },
      [SEED]: { body: HOMEPAGE_HTML },
      "https://acme.example/about": { body: PAGE_HTML_MIN },
      "https://acme.example/products": { body: PAGE_HTML_MIN },
      "https://acme.example/blog/launch": { body: PAGE_HTML_MIN },
      "https://acme.example/contact?ref=home": { body: PAGE_HTML_MIN },
    });

    const out = await crawl({ url: SEED, fetcher, maxInternalPages: 5 });
    expect(out.homepage?.statusCode).toBe(200);
    expect(out.robotsTxt).toContain("User-agent");
    const urls = out.internalPages.map((p) => p.url).sort();
    expect(urls).toContain("https://acme.example/about");
    expect(urls).toContain("https://acme.example/products");
    expect(urls).toContain("https://acme.example/blog/launch");
    // External Twitter link is skipped
    expect(urls.some((u) => u.includes("twitter.com"))).toBe(false);
  });

  it("respects sitemap.xml when present", async () => {
    const sitemap = `<?xml version="1.0"?>
<urlset>
  <url><loc>https://acme.example/sitemap-priority-1</loc></url>
  <url><loc>https://acme.example/sitemap-priority-2</loc></url>
</urlset>`;
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_ALLOWING },
      "https://acme.example/sitemap.xml": { body: sitemap, contentType: "application/xml" },
      [SEED]: { body: HOMEPAGE_HTML },
      "https://acme.example/sitemap-priority-1": { body: PAGE_HTML_MIN },
      "https://acme.example/sitemap-priority-2": { body: PAGE_HTML_MIN },
      "https://acme.example/about": { body: PAGE_HTML_MIN },
      "https://acme.example/products": { body: PAGE_HTML_MIN },
      "https://acme.example/blog/launch": { body: PAGE_HTML_MIN },
    });

    const out = await crawl({ url: SEED, fetcher, maxInternalPages: 2 });
    const urls = out.internalPages.map((p) => p.url);
    expect(urls).toContain("https://acme.example/sitemap-priority-1");
    expect(urls).toContain("https://acme.example/sitemap-priority-2");
  });

  it("aborts the crawl when robots.txt disallows the homepage", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_DISALLOW_ALL },
      [SEED]: { body: HOMEPAGE_HTML },
    });

    const out = await crawl({ url: SEED, fetcher });
    expect(out.homepage).toBeNull();
    expect(out.errors[0]?.error.kind).toBe("robots_disallowed");
  });

  it("filters disallowed internal pages but keeps allowed ones", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_DISALLOW_BLOG },
      "https://acme.example/sitemap.xml": { status: 404 },
      "https://acme.example/sitemap_index.xml": { status: 404 },
      [SEED]: { body: HOMEPAGE_HTML },
      "https://acme.example/about": { body: PAGE_HTML_MIN },
      "https://acme.example/products": { body: PAGE_HTML_MIN },
      "https://acme.example/contact?ref=home": { body: PAGE_HTML_MIN },
    });

    const out = await crawl({ url: SEED, fetcher });
    const urls = out.internalPages.map((p) => p.url);
    expect(urls.some((u) => u.includes("/blog/"))).toBe(false);
    expect(urls).toContain("https://acme.example/about");
  });

  it("records http errors per page without failing the scan", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_ALLOWING },
      "https://acme.example/sitemap.xml": { status: 404 },
      "https://acme.example/sitemap_index.xml": { status: 404 },
      [SEED]: { body: HOMEPAGE_HTML },
      "https://acme.example/about": { status: 500 },
      "https://acme.example/products": { body: PAGE_HTML_MIN },
      "https://acme.example/blog/launch": { body: PAGE_HTML_MIN },
      "https://acme.example/contact?ref=home": { body: PAGE_HTML_MIN },
    });

    const out = await crawl({ url: SEED, fetcher });
    expect(out.homepage?.statusCode).toBe(200);
    expect(out.errors.some((e) => e.error.kind === "http_error")).toBe(true);
    expect(out.internalPages.length).toBeGreaterThanOrEqual(1);
  });

  it("truncates oversized pages and proceeds with partial body", async () => {
    // Modern marketing sites routinely exceed 2MB; we cap the read but use
    // what we got rather than aborting. The first ~50KB has all the
    // structural signals we audit anyway.
    const huge = "a".repeat(10);
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_ALLOWING },
      [SEED]: { body: huge },
    });
    const out = await crawl({ url: SEED, fetcher, maxBytes: 5, maxInternalPages: 0 });
    expect(out.homepage).not.toBeNull();
    expect(out.homepage?.bytes).toBeLessThanOrEqual(5);
  });

  it("rejects non-html content types", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_ALLOWING },
      [SEED]: { body: "{}", contentType: "application/json" },
    });
    const out = await crawl({ url: SEED, fetcher, maxInternalPages: 0 });
    expect(out.errors[0]?.error.kind).toBe("non_html");
  });

  it("times out a hung request and reports it", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_ALLOWING },
      [SEED]: { hang: true },
    });
    const out = await crawl({
      url: SEED,
      fetcher,
      perPageTimeoutMs: 50,
      totalBudgetMs: 200,
      maxInternalPages: 0,
    });
    expect(out.homepage).toBeNull();
    expect(out.errors[0]?.error.kind).toBe("timeout");
  });

  it("treats missing robots.txt as fully allowed", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { status: 404 },
      "https://acme.example/sitemap.xml": { status: 404 },
      "https://acme.example/sitemap_index.xml": { status: 404 },
      [SEED]: { body: HOMEPAGE_HTML },
      "https://acme.example/about": { body: PAGE_HTML_MIN },
      "https://acme.example/products": { body: PAGE_HTML_MIN },
      "https://acme.example/blog/launch": { body: PAGE_HTML_MIN },
      "https://acme.example/contact?ref=home": { body: PAGE_HTML_MIN },
    });
    const out = await crawl({ url: SEED, fetcher, maxInternalPages: 2 });
    expect(out.robotsTxt).toBeNull();
    expect(out.homepage?.statusCode).toBe(200);
    expect(out.internalPages.length).toBe(2);
  });

  it("runs internal page fetches in parallel", async () => {
    const fetcher = makeMockFetch({
      "https://acme.example/robots.txt": { body: ROBOTS_ALLOWING },
      "https://acme.example/sitemap.xml": { status: 404 },
      "https://acme.example/sitemap_index.xml": { status: 404 },
      [SEED]: { body: HOMEPAGE_HTML },
      "https://acme.example/about": { body: PAGE_HTML_MIN, delayMs: 100 },
      "https://acme.example/products": { body: PAGE_HTML_MIN, delayMs: 100 },
      "https://acme.example/blog/launch": { body: PAGE_HTML_MIN, delayMs: 100 },
    });
    const start = Date.now();
    const out = await crawl({ url: SEED, fetcher, maxInternalPages: 3 });
    const elapsed = Date.now() - start;
    // 3 sequential 100ms requests would be ≥300ms; parallel should be ~100ms.
    expect(elapsed).toBeLessThan(280);
    expect(out.internalPages.length).toBe(3);
  });
});
