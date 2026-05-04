/**
 * Crawl orchestrator. Given a normalized URL:
 *   1. Fetch and parse robots.txt
 *   2. Fetch the homepage (respecting robots)
 *   3. Discover up to N internal pages
 *   4. Fetch each in parallel (still respecting robots and the global budget)
 *
 * Never throws. All errors land in `output.errors` so the caller can decide
 * to keep going (e.g., scan continues with whatever pages succeeded).
 */
import {
  DEFAULT_USER_AGENT,
  type CrawlInput,
  type CrawlOutput,
  type CrawledPage,
} from "./types";
import { fetchPage } from "./fetch";
import { fetchRobots } from "./robots";
import { discoverInternalPages } from "./discover";
import { hostResolvesToPublicIp, normalizeUrl } from "./url";

export async function crawl(input: CrawlInput): Promise<CrawlOutput> {
  const start = Date.now();
  const userAgent = input.userAgent ?? DEFAULT_USER_AGENT;
  const fetcher = input.fetcher ?? globalThis.fetch;
  const maxInternalPages = input.maxInternalPages ?? 5;
  const perPageTimeoutMs = input.perPageTimeoutMs ?? 10_000;
  const totalBudgetMs = input.totalBudgetMs ?? 30_000;
  const maxBytes = input.maxBytes ?? 2 * 1024 * 1024;

  const errors: CrawlOutput["errors"] = [];
  const remainingBudget = () => Math.max(0, totalBudgetMs - (Date.now() - start));
  const out: CrawlOutput = {
    homepage: null,
    internalPages: [],
    robotsTxt: null,
    errors,
    totalMs: 0,
    budgetExceeded: false,
  };

  const url = normalizeUrl(input.url);
  if (!url) {
    errors.push({ url: input.url, error: { kind: "invalid_url", reason: "could not normalize" } });
    out.totalMs = Date.now() - start;
    return out;
  }

  // Phase 7 review S-MED-2: SSRF guard. Reject URLs whose hostname resolves
  // to a private IP range. This catches `localtest.me` (DNS-resolves to
  // 127.0.0.1) and any internal hostname that survived URL parsing.
  const hostname = new URL(url).hostname;
  if (!(await hostResolvesToPublicIp(hostname))) {
    errors.push({ url, error: { kind: "invalid_url", reason: "private-network host" } });
    out.totalMs = Date.now() - start;
    return out;
  }

  // 1. robots.txt
  const robots = await fetchRobots(url, userAgent, fetcher);
  out.robotsTxt = robots.text;

  if (!robots.isAllowed(url)) {
    errors.push({ url, error: { kind: "robots_disallowed", userAgent } });
    out.totalMs = Date.now() - start;
    return out;
  }

  // 2. Homepage
  const homepageTimeout = Math.min(perPageTimeoutMs, remainingBudget());
  if (homepageTimeout <= 0) {
    out.budgetExceeded = true;
    out.totalMs = Date.now() - start;
    return out;
  }

  const homeRes = await fetchPage({
    url,
    timeoutMs: homepageTimeout,
    maxBytes,
    userAgent,
    fetcher,
  });
  if (!homeRes.ok) {
    errors.push({ url, error: homeRes.error });
    out.totalMs = Date.now() - start;
    return out;
  }
  out.homepage = homeRes.page;

  // 3. Discover internal pages
  if (maxInternalPages > 0 && remainingBudget() > 1_000) {
    const candidates = await discoverInternalPages({
      homepage: url,
      $: homeRes.page.$,
      max: maxInternalPages,
      fetcher,
      userAgent,
    });
    const allowed = candidates.filter((c) => robots.isAllowed(c));

    // 4. Fetch internals in parallel under the remaining budget.
    const fetched = await Promise.allSettled(
      allowed.map((u) =>
        fetchPage({
          url: u,
          timeoutMs: Math.min(perPageTimeoutMs, remainingBudget()),
          maxBytes,
          userAgent,
          fetcher,
        }),
      ),
    );
    const internalPages: CrawledPage[] = [];
    fetched.forEach((r, i) => {
      const targetUrl = allowed[i] ?? "<unknown>";
      if (r.status === "rejected") {
        errors.push({ url: targetUrl, error: { kind: "network", message: String(r.reason) } });
        return;
      }
      if (!r.value.ok) {
        errors.push({ url: targetUrl, error: r.value.error });
        return;
      }
      internalPages.push(r.value.page);
    });
    out.internalPages = internalPages;
  }

  if (remainingBudget() <= 0) out.budgetExceeded = true;
  out.totalMs = Date.now() - start;
  return out;
}

export type { CrawlInput, CrawlOutput, CrawledPage };
export { normalizeUrl, canonicalUrlKey } from "./url";
