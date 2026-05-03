import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { extractMainContent } from "./extract";
import { computeCitability } from "./metrics";

const RICH_PAGE = `<!doctype html>
<html><body>
  <nav><a>Home</a><a>About</a><a>Products</a></nav>
  <main>
    <article>
      <h1>How to optimize for answer engines</h1>
      <p>Answer Engine Optimization (AEO) is the practice of structuring your website so that AI search engines like ChatGPT and Perplexity can find, understand, and cite your content. This guide walks through the seven highest-leverage interventions, each with a concrete example you can ship today.</p>
      <p>The first lever is structured data. Adding JSON-LD Organization, WebSite, and Article blocks tells engines exactly which entity owns the page and what kind of content it is. Sites that ship structured data see a measurable lift in citation rate within four to six weeks of indexing.</p>
      <p>The second lever is the llms.txt file at the root of your domain. This emerging standard, modeled on robots.txt, lets you advertise the canonical map of your site to AI crawlers in a machine-readable format. Adoption is climbing 40% quarter-over-quarter.</p>
      <ul>
        <li>Add Organization JSON-LD</li>
        <li>Add llms.txt at root</li>
        <li>Audit robots.txt for AI crawlers</li>
      </ul>
      <h2>Frequently asked questions</h2>
      <details><summary>Is AEO different from SEO?</summary><p>Yes. SEO targets ranking; AEO targets citation.</p></details>
      <details><summary>Does Google AI Overviews count?</summary><p>It does, but live probing requires SerpAPI.</p></details>
    </article>
  </main>
  <footer><a>Privacy</a><a>Terms</a></footer>
</body></html>`;

const SPARSE_PAGE = `<!doctype html><html><body><div><div><p>Hi.</p></div></div></body></html>`;

describe("extractMainContent", () => {
  it("prefers the <main> block over nav/footer", () => {
    const $ = load(RICH_PAGE);
    const r = extractMainContent($);
    expect(r.text).toContain("Answer Engine Optimization");
    expect(r.text).not.toContain("Privacy");
  });

  it("handles minimal pages without throwing", () => {
    const $ = load(SPARSE_PAGE);
    const r = extractMainContent($);
    expect(typeof r.text).toBe("string");
  });
});

describe("computeCitability", () => {
  it("scores a well-structured article highly", () => {
    const $ = load(RICH_PAGE);
    const m = computeCitability($);
    expect(m.score).toBeGreaterThan(50);
    expect(m.hasFaqPattern).toBe(true);
    expect(m.structuredElements).toBeGreaterThan(0);
    expect(m.cleanTextRatio).toBeGreaterThan(0);
    expect(m.paragraphMedianWords).toBeGreaterThan(20);
  });

  it("scores a sparse page low", () => {
    const $ = load(SPARSE_PAGE);
    const m = computeCitability($);
    expect(m.score).toBeLessThan(30);
  });

  it("detects FAQPage JSON-LD", () => {
    const html = `<html><head>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}
      </script></head><body><main>${"a ".repeat(300)}</main></body></html>`;
    const $ = load(html);
    const m = computeCitability($);
    expect(m.hasFaqPattern).toBe(true);
  });
});
