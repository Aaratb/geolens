/**
 * Crawl pipeline types. Strict separation between "in-flight HTML" (held only
 * inside a CrawledPage during scan execution) and "computed signals" (the
 * subset of data that may be persisted per PRD §13).
 */
import type { CheerioAPI } from "cheerio";

export type CrawlError =
  | { kind: "invalid_url"; reason: string }
  | { kind: "robots_disallowed"; userAgent: string }
  | { kind: "timeout"; afterMs: number }
  | { kind: "too_large"; bytes: number }
  | { kind: "non_html"; contentType: string | null }
  | { kind: "http_error"; status: number }
  | { kind: "network"; message: string }
  | { kind: "redirect_loop"; followed: number };

/**
 * A successfully fetched page. The `$` cheerio handle is the canonical way
 * downstream auditors read page content; raw HTML is intentionally NOT
 * exposed on this type to discourage persistence.
 */
export interface CrawledPage {
  url: string;
  finalUrl: string;
  statusCode: number;
  bytes: number;
  fetchMs: number;
  contentType: string;
  /** Parsed cheerio document. Use this in lieu of raw HTML. */
  $: CheerioAPI;
}

export type FetchResult = { ok: true; page: CrawledPage } | { ok: false; error: CrawlError };

export interface CrawlInput {
  url: string;
  /** Max internal pages to discover beyond the seed URL. Default 5. */
  maxInternalPages?: number;
  /** Per-page hard timeout in ms. Default 10_000. */
  perPageTimeoutMs?: number;
  /** Total crawl wall-time cap in ms. Default 30_000. */
  totalBudgetMs?: number;
  /** Max bytes per page. Default 2 MB. */
  maxBytes?: number;
  /** User-agent identifier. Default GEOlensBot/1.0. */
  userAgent?: string;
  /**
   * Optional fetch override for testing. Defaults to global fetch.
   * Tests inject a mock to avoid hitting the real internet.
   */
  fetcher?: typeof fetch;
}

export interface CrawlOutput {
  /** The seed homepage. Always present if the seed succeeded. */
  homepage: CrawledPage | null;
  /** Successfully fetched additional internal pages (up to maxInternalPages). */
  internalPages: CrawledPage[];
  /** robots.txt text body, or null if no robots.txt. */
  robotsTxt: string | null;
  /** Per-URL fetch errors collected during the crawl (homepage + internals). */
  errors: { url: string; error: CrawlError }[];
  /** Total ms spent fetching. */
  totalMs: number;
  /** True if we hit the total budget and stopped early. */
  budgetExceeded: boolean;
}

export const DEFAULT_USER_AGENT = "GEOlensBot/1.0 (+https://geolens.app/bot)";
