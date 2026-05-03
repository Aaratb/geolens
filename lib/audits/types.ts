/**
 * Shared types across the audit pipeline. Keeps the contract uniform so the
 * scan orchestrator can collect heterogeneous audit results into a single
 * findings stream without per-module branching.
 */

export type HygieneStatus = "pass" | "fail" | "warn";

export type HygieneCategory =
  | "llms-txt"
  | "robots-ai"
  | "jsonld"
  | "meta"
  | "headings"
  | "semantic";

export interface HygieneCheck {
  /** Stable id like "llms-txt.present", "robots-ai.gptbot.allowed" */
  id: string;
  category: HygieneCategory;
  status: HygieneStatus;
  /** One-line title surfaced in the report. */
  title: string;
  /** Plain-English explanation of why this matters. */
  why: string;
  /** Suggested fix when status !== "pass". */
  fixHint?: string;
  /** 0-100 contribution to the AEO Hygiene sub-score. */
  scoreImpact: number;
  /** Severity for gap ranking. */
  severity: "critical" | "high" | "medium" | "low";
  /** Effort estimate as a rough magnitude string. */
  effort?: "30min" | "few-hours" | "days" | "weeks";
  /** Arbitrary structured payload for drill-downs. */
  meta?: Record<string, unknown>;
}

/* ---------------- PSI ---------------- */

export interface PsiCategoryScores {
  performance: number; // 0-100
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface PsiAuditFailure {
  id: string;
  title: string;
  description: string;
  scoreDisplayMode: string; // "binary" | "numeric" | "informative" | ...
  score: number | null;
}

export interface PsiResult {
  /** The URL audited. */
  url: string;
  scores: PsiCategoryScores;
  /** Top failed audits surfaced as candidate findings. */
  failures: PsiAuditFailure[];
  /** Overall weighted SEO score per spec §6.1. */
  weightedSeo: number;
  /** Raw fetch latency in ms (for telemetry). */
  fetchMs: number;
}

/* ---------------- Citability ---------------- */

export interface CitabilityMetrics {
  /** Length of extracted main content in characters. */
  mainContentChars: number;
  /** Total text content of the page in characters. */
  totalTextChars: number;
  /** mainContentChars / totalTextChars (0..1). Higher = less boilerplate. */
  cleanTextRatio: number;
  /** Median paragraph length in words. */
  paragraphMedianWords: number;
  /** % of paragraphs in the 40-80 word "ideal" range. */
  idealParagraphPct: number;
  /** Median sentence length in words. */
  sentenceMedianWords: number;
  /** Count of <ul>/<ol>/<table> elements in main content. */
  structuredElements: number;
  /** True if FAQ-like Q&A patterns detected (in HTML or JSON-LD). */
  hasFaqPattern: boolean;
  /** Density of numeric/statistical content (numbers per 1000 words). */
  statisticalDensity: number;
  /** 0-100 overall citability score. */
  score: number;
}
