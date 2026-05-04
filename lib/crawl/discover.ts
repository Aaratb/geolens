/**
 * Page discovery. Given a fetched homepage, pick up to N internal pages to
 * also audit. Strategy from spec §7:
 *   1. /sitemap.xml entries (top N most recent)
 *   2. <nav> internal links
 *   3. Body internal links
 * Dedupe across all sources; keep the seed homepage out of the result list.
 */
import type { CheerioAPI } from "cheerio";
import { dropQueryAndHash, isInternalLink, resolveAgainst } from "./url";
import { DEFAULT_USER_AGENT } from "./types";
import { selfFetchHeaders } from "./fetch-helpers";

interface DiscoverOptions {
  homepage: string;
  $: CheerioAPI;
  max: number;
  fetcher?: typeof fetch;
  userAgent?: string;
}

export async function discoverInternalPages({
  homepage,
  $,
  max,
  fetcher = globalThis.fetch,
  userAgent = DEFAULT_USER_AGENT,
}: DiscoverOptions): Promise<string[]> {
  const seen = new Set<string>([dropQueryAndHash(homepage)]);
  const ordered: string[] = [];

  // 1) Sitemap-derived URLs
  for (const url of await fetchSitemapUrls(homepage, fetcher, userAgent)) {
    if (ordered.length >= max) break;
    const normalized = dropQueryAndHash(url);
    if (!seen.has(normalized) && isInternalLink(url, homepage)) {
      seen.add(normalized);
      ordered.push(url);
    }
  }

  // 2) <nav> links
  if (ordered.length < max) {
    $("nav a[href], header a[href]").each((_, el) => {
      if (ordered.length >= max) return false;
      const href = $(el).attr("href");
      if (!href) return;
      const abs = resolveAgainst(homepage, href);
      if (!abs) return;
      const normalized = dropQueryAndHash(abs);
      if (seen.has(normalized) || !isInternalLink(abs, homepage)) return;
      seen.add(normalized);
      ordered.push(abs);
    });
  }

  // 3) Body links (best-effort fallback)
  if (ordered.length < max) {
    $("main a[href], article a[href], a[href]").each((_, el) => {
      if (ordered.length >= max) return false;
      const href = $(el).attr("href");
      if (!href) return;
      const abs = resolveAgainst(homepage, href);
      if (!abs) return;
      const normalized = dropQueryAndHash(abs);
      if (seen.has(normalized) || !isInternalLink(abs, homepage)) return;
      seen.add(normalized);
      ordered.push(abs);
    });
  }

  return ordered.slice(0, max);
}

async function fetchSitemapUrls(
  homepage: string,
  fetcher: typeof fetch,
  userAgent: string,
): Promise<string[]> {
  const candidates = ["/sitemap.xml", "/sitemap_index.xml"];
  for (const path of candidates) {
    try {
      const url = new URL(path, homepage).toString();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      try {
        const res = await fetcher(url, {
          headers: {
            "user-agent": userAgent,
            accept: "application/xml,text/xml",
            ...selfFetchHeaders(url),
          },
          signal: controller.signal,
          redirect: "follow",
        });
        if (!res.ok) continue;
        const xml = await res.text();
        const urls = extractLocs(xml);
        if (urls.length > 0) return urls;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      /* try next candidate */
    }
  }
  return [];
}

/**
 * Lightweight <loc> extractor. Avoids pulling in an XML parser dep for what
 * is consistently regular markup. Returns up to 50 URLs.
 */
function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && out.length < 50) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}
