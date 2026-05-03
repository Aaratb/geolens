/**
 * Extracts and validates JSON-LD blocks. We grade on type coverage rather
 * than schema-perfect validation — the meaningful AEO signal is whether the
 * site exposes Organization, WebSite, Article/Product/FAQPage, etc.
 */
import type { CheerioAPI } from "cheerio";
import type { HygieneCheck } from "../types";

const KEY_TYPES = new Set([
  "Organization",
  "WebSite",
  "Article",
  "BlogPosting",
  "NewsArticle",
  "FAQPage",
  "Product",
  "BreadcrumbList",
  "Person",
  "LocalBusiness",
]);

export function checkJsonLd($: CheerioAPI): HygieneCheck[] {
  const blocks: unknown[] = [];
  $("script[type='application/ld+json']").each((_, el) => {
    const text = $(el).contents().text().trim();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // ignore broken JSON; flagged separately below
    }
  });

  const totalScripts = $("script[type='application/ld+json']").length;
  const parsedCount = blocks.length;

  const out: HygieneCheck[] = [];

  if (totalScripts === 0) {
    out.push({
      id: "jsonld.absent",
      category: "jsonld",
      status: "fail",
      title: "No JSON-LD structured data found",
      why: "Without JSON-LD, AI engines rely on heuristics to understand your brand, your category, and what your pages are about.",
      fixHint:
        "Add at minimum an Organization JSON-LD block to the homepage, plus Article/Product on relevant pages.",
      scoreImpact: 25,
      severity: "high",
      effort: "few-hours",
    });
    return out;
  }

  if (parsedCount === 0) {
    out.push({
      id: "jsonld.parse-error",
      category: "jsonld",
      status: "fail",
      title: "JSON-LD blocks present but invalid JSON",
      why: "Malformed JSON-LD is silently ignored by crawlers — same effect as having none.",
      fixHint: "Validate every script[type='application/ld+json'] body parses as JSON.",
      scoreImpact: 25,
      severity: "high",
      effort: "few-hours",
    });
    return out;
  }

  const types = collectTypes(blocks);
  const present = [...types].filter((t) => KEY_TYPES.has(t));

  out.push({
    id: "jsonld.organization",
    category: "jsonld",
    status: types.has("Organization") ? "pass" : "fail",
    title: types.has("Organization")
      ? "Organization schema present"
      : "Missing Organization schema",
    why: types.has("Organization")
      ? "Engines can identify the brand entity behind your site."
      : "Without Organization, engines guess at your brand from heuristics.",
    fixHint: types.has("Organization")
      ? undefined
      : "Add a JSON-LD Organization block with name, url, logo, sameAs.",
    scoreImpact: 10,
    severity: "high",
    effort: "few-hours",
  });

  out.push({
    id: "jsonld.website",
    category: "jsonld",
    status: types.has("WebSite") ? "pass" : "warn",
    title: types.has("WebSite") ? "WebSite schema present" : "Missing WebSite schema",
    why: types.has("WebSite")
      ? "Sitelinks and search-action declarations are available to engines."
      : "Sitelinks search-action and canonical site name are not declared.",
    fixHint: types.has("WebSite")
      ? undefined
      : "Add a WebSite block with potentialAction (SearchAction) on the homepage.",
    scoreImpact: 5,
    severity: "medium",
    effort: "few-hours",
  });

  out.push({
    id: "jsonld.coverage",
    category: "jsonld",
    status: present.length >= 3 ? "pass" : "warn",
    title:
      present.length >= 3
        ? `Good schema coverage (${present.length} key types)`
        : `Thin schema coverage (${present.length} key types)`,
    why:
      "Engines use entity types to understand what kind of pages you publish (Article, Product, FAQ, etc.).",
    fixHint:
      present.length >= 3
        ? undefined
        : "Add Article on blog posts, Product on product pages, FAQPage on FAQ sections, BreadcrumbList in navigation.",
    scoreImpact: 10,
    severity: "medium",
    effort: "days",
    meta: { types: [...types], keyTypes: present },
  });

  return out;
}

function collectTypes(blocks: unknown[]): Set<string> {
  const types = new Set<string>();
  for (const b of blocks) {
    walk(b, types);
  }
  return types;
}

function walk(node: unknown, types: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, types);
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") types.add(t);
  else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") types.add(x);
  // Recurse into @graph and named arrays
  if (Array.isArray(obj["@graph"])) walk(obj["@graph"], types);
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") walk(v, types);
  }
}

export const __testing = { collectTypes, KEY_TYPES };
