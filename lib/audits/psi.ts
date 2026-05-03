/**
 * Google PageSpeed Insights v5 API client.
 *
 * Free tier: 25k queries/day. We hit it once per page in scope (homepage +
 * up to 5 internal). Hosted Lighthouse means we don't ship a Chrome runtime.
 *
 * See spec §3 (SEO via PSI) and §6.1 (weighted score).
 */
import type { PsiAuditFailure, PsiCategoryScores, PsiResult } from "./types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const SEO_WEIGHTS = {
  performance: 0.25,
  accessibility: 0.25,
  bestPractices: 0.2,
  seo: 0.3,
} as const;

interface RunPsiOptions {
  url: string;
  apiKey?: string;
  /** mobile (default) or desktop strategy. */
  strategy?: "mobile" | "desktop";
  /** Per-call timeout. PSI is occasionally slow; default 30s. */
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export async function runPsi(opts: RunPsiOptions): Promise<PsiResult> {
  const apiKey = opts.apiKey ?? process.env.PAGESPEED_INSIGHTS_API_KEY;
  if (!apiKey) throw new Error("PAGESPEED_INSIGHTS_API_KEY missing");

  const fetcher = opts.fetcher ?? globalThis.fetch;
  const strategy = opts.strategy ?? "mobile";
  const timeoutMs = opts.timeoutMs ?? 30_000;

  const url = new URL(PSI_ENDPOINT);
  url.searchParams.set("url", opts.url);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("strategy", strategy);
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
    url.searchParams.append("category", cat);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetcher(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`PSI ${res.status} for ${opts.url}`);
    }
    const json = (await res.json()) as PsiApiShape;
    const fetchMs = Date.now() - start;
    return parsePsi(opts.url, json, fetchMs);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Compute the weighted overall SEO score per spec §6.1.
 */
export function weightedSeoScore(scores: PsiCategoryScores): number {
  return Math.round(
    scores.performance * SEO_WEIGHTS.performance +
      scores.accessibility * SEO_WEIGHTS.accessibility +
      scores.bestPractices * SEO_WEIGHTS.bestPractices +
      scores.seo * SEO_WEIGHTS.seo,
  );
}

/* ---------------- internal ---------------- */

interface PsiApiShape {
  lighthouseResult?: {
    categories?: Record<string, { score: number | null }>;
    audits?: Record<string, PsiApiAudit>;
  };
}

interface PsiApiAudit {
  id?: string;
  title?: string;
  description?: string;
  score: number | null;
  scoreDisplayMode?: string;
}

function parsePsi(url: string, body: PsiApiShape, fetchMs: number): PsiResult {
  const cats = body.lighthouseResult?.categories ?? {};
  const audits = body.lighthouseResult?.audits ?? {};

  const scores: PsiCategoryScores = {
    performance: pct(cats.performance?.score),
    accessibility: pct(cats.accessibility?.score),
    bestPractices: pct(cats["best-practices"]?.score),
    seo: pct(cats.seo?.score),
  };

  // Top failed audits we surface as candidate findings.
  const failures: PsiAuditFailure[] = Object.entries(audits)
    .filter(([, a]) => a && a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative")
    .map(([id, a]) => ({
      id,
      title: a.title ?? id,
      description: a.description ?? "",
      scoreDisplayMode: a.scoreDisplayMode ?? "numeric",
      score: a.score,
    }))
    .sort((x, y) => (x.score ?? 1) - (y.score ?? 1))
    .slice(0, 25);

  return {
    url,
    scores,
    failures,
    weightedSeo: weightedSeoScore(scores),
    fetchMs,
  };
}

function pct(score: number | null | undefined): number {
  if (score === null || score === undefined) return 0;
  return Math.round(score * 100);
}

export const __testing = { parsePsi, SEO_WEIGHTS };
