/**
 * Convert audit results into a ranked gap list per spec §6.4.
 *   gap_priority = weight × severity × user-fixability
 *
 * The output is two lists: top-3 (free executive summary) and the full list
 * (sign-in gated). Both share the `#GL-NN` identifier scheme.
 */
import type { HygieneCheck, PsiAuditFailure } from "@/lib/audits/types";
import type { ProbeResult, BrandContext } from "@/lib/audits/aeo/types";
import type { Severity, FindingCategory } from "@/lib/db/schema";

export interface Gap {
  /** "GL-01" style identifier; assigned in order of priority. */
  id: string;
  ord: number;
  category: FindingCategory;
  severity: Severity;
  title: string;
  why: string;
  detail?: string;
  fixHint?: string;
  effort?: "30min" | "few-hours" | "days" | "weeks";
  scoreImpact: number;
  isTop3: boolean;
  meta?: Record<string, unknown>;
  /** Internal: priority score used for ranking (not surfaced). */
  _priority: number;
}

interface RankInput {
  hygieneChecks: HygieneCheck[];
  probes: ProbeResult[];
  psiFailures: { url: string; failure: PsiAuditFailure }[];
  ctx: BrandContext;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const EFFORT_FIXABILITY: Record<NonNullable<Gap["effort"]>, number> = {
  "30min": 3,
  "few-hours": 2,
  days: 1,
  weeks: 0.5,
};

export function rankGaps(input: RankInput): { topThree: Gap[]; allGaps: Gap[] } {
  const raw: Omit<Gap, "id" | "ord" | "isTop3">[] = [];

  // 1. Hygiene gaps — only fail/warn become gaps. (Passes don't lift the report.)
  for (const c of input.hygieneChecks) {
    if (c.status === "pass") continue;
    raw.push({
      category: c.category === "llms-txt" ? "hygiene" : mapHygieneCategory(c.category),
      severity: c.severity,
      title: c.title,
      why: c.why,
      fixHint: c.fixHint,
      effort: c.effort,
      scoreImpact: c.scoreImpact,
      _priority: priorityFor(c.scoreImpact, c.severity, c.effort),
      meta: c.meta,
    });
  }

  // 2. AEO probe gaps — degraded weighted scores
  for (const p of input.probes) {
    if (p.status !== "ok" || !p.parsed) continue;
    if (p.weightedScore >= 70) continue; // healthy

    const isCriticalProbe = p.weightedScore < 30;
    raw.push({
      category: "engine",
      severity: isCriticalProbe ? "high" : "medium",
      title: probeTitleFor(p, input.ctx),
      why: probeWhyFor(p, input.ctx),
      detail: p.response?.slice(0, 600),
      fixHint:
        p.parsed.brandMentioned
          ? "Improve sentiment + accuracy by publishing fresh, citation-worthy content this engine's training set can ingest (interviews, press, third-party reviews)."
          : "Build third-party authority signals so this engine's training set captures the brand: press, Wikipedia presence, podcast appearances, listicles in your category.",
      effort: "weeks",
      scoreImpact: 100 - p.weightedScore,
      _priority: priorityFor(100 - p.weightedScore, isCriticalProbe ? "high" : "medium", "weeks"),
      meta: {
        engine: p.engine,
        probeKind: p.probeKind,
        weightedScore: p.weightedScore,
        position: p.parsed.position,
        sentiment: p.parsed.sentiment,
        accuracy: p.parsed.accuracy,
      },
    });
  }

  // 3. PSI / SEO failures — only the worst 5 to keep the gap list focused
  const seoFailures = [...input.psiFailures]
    .sort((a, b) => (a.failure.score ?? 1) - (b.failure.score ?? 1))
    .slice(0, 5);
  for (const f of seoFailures) {
    raw.push({
      category: "seo",
      severity: (f.failure.score ?? 1) < 0.5 ? "high" : "medium",
      title: f.failure.title,
      why: f.failure.description.slice(0, 400),
      effort: "few-hours",
      scoreImpact: Math.round((1 - (f.failure.score ?? 1)) * 30),
      _priority: priorityFor(
        Math.round((1 - (f.failure.score ?? 1)) * 30),
        (f.failure.score ?? 1) < 0.5 ? "high" : "medium",
        "few-hours",
      ),
      meta: { auditId: f.failure.id, url: f.url },
    });
  }

  // 4. Citability is folded into hygiene scoring already; surface only if very low
  // (no extra gaps to add in v1)

  raw.sort((a, b) => b._priority - a._priority);

  const allGaps: Gap[] = raw.map((g, i) => ({
    ...g,
    id: `GL-${String(i + 1).padStart(2, "0")}`,
    ord: i + 1,
    isTop3: i < 3,
  }));

  return { topThree: allGaps.slice(0, 3), allGaps };
}

/* ---------------- helpers ---------------- */

function priorityFor(
  scoreImpact: number,
  severity: Severity,
  effort: Gap["effort"] | undefined,
): number {
  const fix = effort ? EFFORT_FIXABILITY[effort] : 1.5;
  return scoreImpact * SEVERITY_WEIGHT[severity] * fix;
}

function mapHygieneCategory(c: HygieneCheck["category"]): FindingCategory {
  // The DB enum uses "hygiene" for the AEO hygiene umbrella; "engine" for probe-derived;
  // "citability" for content-shape; "seo" for PSI. Hygiene categories all map to "hygiene".
  switch (c) {
    case "robots-ai":
    case "jsonld":
    case "meta":
    case "headings":
    case "semantic":
      return "hygiene";
    default:
      return "hygiene";
  }
}

function probeTitleFor(p: ProbeResult, ctx: BrandContext): string {
  switch (p.probeKind) {
    case "brand_recall":
      return p.parsed?.brandMentioned
        ? `${labelEngine(p.engine)} description of ${ctx.brandName} is weak`
        : `${labelEngine(p.engine)} doesn't recognize ${ctx.brandName}`;
    case "category_placement":
      return p.parsed?.brandMentioned
        ? `${ctx.brandName} appears late in ${labelEngine(p.engine)}'s ${ctx.category} list`
        : `${ctx.brandName} not listed by ${labelEngine(p.engine)} for ${ctx.category}`;
    case "citation_behavior":
      return p.parsed?.urlCited
        ? `${labelEngine(p.engine)} cites ${ctx.hostname} but framing is weak`
        : `${labelEngine(p.engine)} doesn't cite ${ctx.hostname} as a source`;
    default:
      return `${labelEngine(p.engine)} probe degraded`;
  }
}

function probeWhyFor(p: ProbeResult, ctx: BrandContext): string {
  switch (p.probeKind) {
    case "brand_recall":
      return `When asked directly about ${ctx.brandName}, ${labelEngine(p.engine)} ${
        p.parsed?.brandMentioned ? "mentioned the brand but with low salience" : "did not mention the brand at all"
      }. Position: ${p.parsed?.position}, sentiment: ${p.parsed?.sentiment}.`;
    case "category_placement":
      return `When asked for the leading ${ctx.category} options, ${labelEngine(p.engine)} ${
        p.parsed?.brandMentioned ? `placed ${ctx.brandName} in a ${p.parsed?.position} slot` : `omitted ${ctx.brandName}`
      }.`;
    case "citation_behavior":
      return `When asked about ${ctx.hostname}, ${labelEngine(p.engine)} ${
        p.parsed?.urlCited
          ? "cited the domain but with limited framing"
          : "did not cite the domain as a source"
      }. Accuracy: ${p.parsed?.accuracy}.`;
    default:
      return "";
  }
}

function labelEngine(e: ProbeResult["engine"]): string {
  switch (e) {
    case "openai":
      return "ChatGPT";
    case "anthropic":
      return "Claude";
    case "perplexity":
      return "Perplexity";
    case "gemini":
      return "Gemini";
  }
}

export const __testing = { priorityFor, EFFORT_FIXABILITY, SEVERITY_WEIGHT };
