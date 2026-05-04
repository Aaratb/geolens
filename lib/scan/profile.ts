/**
 * Scan profile — chooses between Hobby (60s function ceiling) and Pro
 * (300s ceiling). Drives crawl scope, PSI scope, and probe selection so the
 * scan fits inside the platform's function-timeout budget.
 *
 * Set SCAN_PROFILE=pro after upgrading the Vercel plan.
 */
import type { Engine, ProbeKind } from "@/lib/db/schema";

export type ScanProfile = "hobby" | "pro";

export interface ProfileConfig {
  /** Profile name. */
  name: ScanProfile;
  /** Internal pages to crawl beyond the homepage. */
  maxInternalPages: number;
  /** Per-page fetch timeout. */
  perPageTimeoutMs: number;
  /** Total crawl wall-time budget. */
  totalCrawlBudgetMs: number;
  /** PSI: which pages to audit. "homepage" = seed only; "all" = every crawled page. */
  psiScope: "homepage" | "all";
  /** AEO engines to probe. Hobby drops Perplexity because Sonar does live
   *  web search and routinely takes 15-25s, blowing the 60s budget. */
  engines: Engine[];
  /** Probe kinds to run per engine. */
  probeKinds: ProbeKind[];
  /** Per-LLM-call timeout. */
  probeTimeoutMs: number;
}

const HOBBY: ProfileConfig = {
  name: "hobby",
  maxInternalPages: 0,
  perPageTimeoutMs: 8_000,
  totalCrawlBudgetMs: 12_000,
  psiScope: "homepage",
  engines: ["openai", "anthropic", "gemini"],
  probeKinds: ["brand_recall", "category_placement", "citation_behavior"],
  probeTimeoutMs: 12_000,
};

const PRO: ProfileConfig = {
  name: "pro",
  maxInternalPages: 5,
  perPageTimeoutMs: 10_000,
  totalCrawlBudgetMs: 30_000,
  psiScope: "all",
  engines: ["openai", "anthropic", "perplexity", "gemini"],
  probeKinds: ["brand_recall", "category_placement", "citation_behavior"],
  probeTimeoutMs: 25_000,
};

export function getProfile(): ProfileConfig {
  const raw = (process.env.SCAN_PROFILE ?? "hobby").toLowerCase();
  return raw === "pro" ? PRO : HOBBY;
}

export const __testing = { HOBBY, PRO };
