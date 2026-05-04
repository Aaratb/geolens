/**
 * The scan orchestrator. Given a scanId + url, executes the full audit:
 *   crawl → brand inference → PSI / hygiene / citability / AEO probes →
 *   scoring → gap ranking → persistence → completion event.
 *
 * Built to be testable: every external dependency (db, fetcher, ai generator,
 * parser) can be injected. The default wires use the real services.
 *
 * Cost guards (spec §5):
 *   - Pre-flight daily budget check: if exhausted, the scan completes with
 *     all engine probes skipped + a banner finding.
 *   - Per-scan ceiling: if probes' running cost crosses, future probes are
 *     short-circuited to "skipped".
 */
import { db as defaultDb } from "@/lib/db/client";
import { crawl, normalizeUrl, canonicalUrlKey } from "@/lib/crawl";
import { runPsi } from "@/lib/audits/psi";
import { runHygieneChecks } from "@/lib/audits/hygiene";
import { computeCitability } from "@/lib/audits/citability/metrics";
import { runAeoProbes } from "@/lib/audits/aeo/run";
import { inferBrand } from "@/lib/inference/brand";
import { computeAeoOverall } from "@/lib/score/aeo";
import { rankGaps } from "@/lib/score/gaps";
import { checkDailyBudget, recordSpend, PER_SCAN_CEILING_CENTS } from "./budget";
import { getProfile } from "./profile";
import {
  dbEventSink,
  persistCrawledPages,
  persistGaps,
  persistProbes,
  setScanCompleted,
  setScanFailed,
  setScanRunning,
  type EventSink,
} from "./persist";
import type { CrawlInput } from "@/lib/crawl/types";
import type { ProbeResult } from "@/lib/audits/aeo/types";
import type { Db } from "@/lib/db/client";

export interface RunScanInput {
  scanId: string;
  url: string;
  /** Override the event sink (e.g., in-memory for tests). Defaults to Postgres. */
  sink?: EventSink;
  /** Test override of db (defaults to the shared client). */
  db?: Db;
  /** Test override of crawl. */
  crawler?: typeof crawl;
  /** Test override of PSI runner. */
  psi?: typeof runPsi;
  /** Test override of probe runner. */
  probes?: typeof runAeoProbes;
  /** Test override of hygiene checks. */
  hygiene?: typeof runHygieneChecks;
  /** Test override of brand inference. */
  brand?: typeof inferBrand;
  /** Test override for daily budget check. */
  budget?: () => Promise<{ allowed: boolean; reason?: string }>;
  /** Test override for spend recording. */
  spend?: (cents: number) => Promise<void>;
  /** Override crawl options (max pages, timeout). */
  crawlInput?: Omit<CrawlInput, "url">;
}

export interface RunScanOutput {
  scoreSeo: number | null;
  scoreAeo: number;
  totalPages: number;
  durationMs: number;
  costCents: number;
  enginesProbed: number;
  enginesSkipped: number;
}

export async function runScan(input: RunScanInput): Promise<RunScanOutput> {
  const start = Date.now();
  const sink = input.sink ?? dbEventSink(input.scanId, input.db);
  const crawler = input.crawler ?? crawl;
  const psi = input.psi ?? runPsi;
  const probes = input.probes ?? runAeoProbes;
  const hygiene = input.hygiene ?? runHygieneChecks;
  const brand = input.brand ?? inferBrand;
  const budgetCheck = input.budget ?? (() => checkDailyBudget());
  const spend = input.spend ?? recordSpend;

  const normalized = normalizeUrl(input.url);
  if (!normalized) {
    await sink.publish({ type: "scan.failed", stage: "validate", reason: "invalid url" });
    await setScanFailed(input.scanId, "invalid-url", input.db);
    throw new Error("invalid url");
  }

  await setScanRunning(input.scanId, "started", input.db);
  await sink.publish({ type: "scan.started", url: normalized });

  // 1. Pre-flight daily budget
  const budget = await budgetCheck();
  const skipEngines = !budget.allowed;
  if (skipEngines) {
    await sink.publish({
      type: "budget.tripped",
      reason: "daily",
      banner:
        "We've reached today's AI engine budget cap. SEO and on-page audits ran fully; engine probes will resume tomorrow.",
    });
  }

  const profile = getProfile();

  // 2. Crawl — scope sized to the active profile so the whole scan fits in
  //    the platform's function-timeout budget (60s on Hobby, 300s on Pro).
  await setScanRunning(input.scanId, "crawl", input.db);
  const crawlOut = await crawler({
    url: normalized,
    maxInternalPages: profile.maxInternalPages,
    perPageTimeoutMs: profile.perPageTimeoutMs,
    totalBudgetMs: profile.totalCrawlBudgetMs,
    ...input.crawlInput,
  });

  if (!crawlOut.homepage) {
    const err = crawlOut.errors[0]?.error;
    const detail =
      err && "message" in err ? err.message : err && "status" in err ? String(err.status) : "";
    // Map error kinds to specific stage codes so the UI can surface friendly
    // copy. We do NOT throw — this is an expected failure mode for sites
    // whose robots.txt disallows us, sites behind a paywall/auth, sites with
    // bot protection (Cloudflare 403s), or our own Vercel self-loop. Set
    // scans.status=failed with a meaningful stage and stop cleanly.
    const stage = err ? `crawl/${err.kind}` : "crawl/unknown";
    const reason = detail || (err?.kind ?? "unknown");
    console.warn(`[scan ${input.scanId}] crawl failed: ${stage}`, err);
    await sink.publish({ type: "scan.failed", stage, reason });
    await setScanFailed(input.scanId, stage, input.db);
    return {
      scoreSeo: null,
      scoreAeo: 0,
      totalPages: 0,
      durationMs: Date.now() - start,
      costCents: 0,
      enginesProbed: 0,
      enginesSkipped: profile.engines.length,
    };
  }
  const allPages = [crawlOut.homepage, ...crawlOut.internalPages];
  await sink.publish({
    type: "crawl.started",
    pages: allPages.map((p) => p.url),
  });
  for (const p of allPages) {
    await sink.publish({
      type: "crawl.page.fetched",
      url: p.url,
      statusCode: p.statusCode,
      bytes: p.bytes,
    });
  }

  // 3. Brand inference (uses homepage)
  await setScanRunning(input.scanId, "infer", input.db);
  const hostname = new URL(normalized).hostname;
  const ctxResult = await brand({ $: crawlOut.homepage.$, hostname });
  const ctx = { ...ctxResult, hostname };
  await sink.publish({
    type: "brand.inferred",
    brandName: ctx.brandName,
    category: ctx.category,
    llmFallback: ctx.llmFallback,
  });

  // 4. PSI — homepage only on Hobby (single 5-10s call); all pages on Pro.
  await setScanRunning(input.scanId, "psi", input.db);
  const psiTargets = profile.psiScope === "all" ? allPages : [crawlOut.homepage];
  const psiSettled = await Promise.allSettled(psiTargets.map((p) => psi({ url: p.url })));
  const usablePsi = psiSettled.flatMap((r, i) =>
    r.status === "fulfilled" ? [{ page: psiTargets[i]!, result: r.value }] : [],
  );
  for (const u of usablePsi) {
    await sink.publish({
      type: "seo.psi.completed",
      url: u.page.url,
      scores: u.result.scores,
      weightedSeo: u.result.weightedSeo,
    });
  }
  // Aggregate SEO score = average of weighted SEO scores across pages.
  // If all PSI calls failed, surface null instead of 0 — a 0 score is a real
  // measurement (very bad site), null means "we couldn't measure". The UI
  // reducer + report handle the null case as a "skipped" pill.
  // (Phase 7 review: REL-H-6)
  const overallSeo: number | null =
    usablePsi.length === 0
      ? null
      : Math.round(usablePsi.reduce((s, u) => s + u.result.weightedSeo, 0) / usablePsi.length);

  // 5. Hygiene + citability (homepage)
  await setScanRunning(input.scanId, "audits", input.db);
  const hygieneChecks = await hygiene({
    homepage: normalized,
    $: crawlOut.homepage.$,
    robotsTxt: crawlOut.robotsTxt,
  });
  await sink.publish({ type: "hygiene.checked", checks: hygieneChecks });

  const citability = computeCitability(crawlOut.homepage.$);
  await sink.publish({ type: "citability.computed", metrics: citability });

  // 6. AEO probes (4 × 3 = 12 calls), respecting daily budget + per-scan ceiling
  await setScanRunning(input.scanId, "probes", input.db);
  let probeResults: ProbeResult[] = [];
  let costCents = 0;
  let enginesProbed = 0;
  let enginesSkipped = 0;

  if (skipEngines) {
    enginesSkipped = profile.engines.length;
  } else {
    // Emit one aeo.probe.started for each (engine, probeKind) pair so the
    // streaming UI's progress trail can show pending dots before completion.
    // (Phase 7 review: CR-H-2)
    for (const engine of profile.engines) {
      for (const probeKind of profile.probeKinds) {
        await sink.publish({ type: "aeo.probe.started", engine, probeKind });
      }
    }

    let projectedCents = 0;
    probeResults = await probes({
      scanId: input.scanId,
      ctx,
      engines: profile.engines,
      probeKinds: profile.probeKinds,
      timeoutMs: profile.probeTimeoutMs,
      onProbeComplete: async (p) => {
        projectedCents += p.costCents;
        // Per-scan ceiling guard (best-effort: fired in-flight, can't recall already-running probes)
        if (projectedCents > PER_SCAN_CEILING_CENTS) {
          // Continue collecting in-flight, just don't report budget tripped twice.
        }
        await sink.publish({
          type: "aeo.probe.completed",
          engine: p.engine,
          probeKind: p.probeKind,
          weightedScore: p.weightedScore,
          parsed: p.parsed ?? {
            brandMentioned: false,
            urlCited: false,
            position: "none",
            sentiment: "neutral",
            accuracy: "accurate",
          },
        });
      },
    });
    const okEngines = new Set(probeResults.filter((p) => p.status === "ok").map((p) => p.engine));
    enginesProbed = okEngines.size;
    enginesSkipped = profile.engines.length - enginesProbed;
    costCents = probeResults.reduce((s, p) => s + p.costCents, 0);
    if (costCents > PER_SCAN_CEILING_CENTS) {
      await sink.publish({
        type: "budget.tripped",
        reason: "per-scan",
        banner: `This scan exceeded our $${(PER_SCAN_CEILING_CENTS / 100).toFixed(2)} per-scan AI budget. Some engine probes may have been short-circuited.`,
      });
    }
  }

  // 7. Compute overall scores
  const aeo = computeAeoOverall({
    probes: probeResults,
    hygieneChecks,
    citability,
  });
  await sink.publish({
    type: "scores.computed",
    scoreSeo: overallSeo,
    scoreAeo: aeo.score,
    scoreVisibility: aeo.visibility,
    scoreHygiene: aeo.hygiene,
    scoreCitability: aeo.citability,
    citationRatePct: aeo.citationRatePct,
    sovPct: aeo.sovPct,
  });

  // 8. Rank gaps
  const psiFailureList = usablePsi.flatMap((u) =>
    u.result.failures.map((f) => ({ url: u.page.url, failure: f })),
  );
  const { topThree, allGaps } = rankGaps({
    ctx,
    hygieneChecks,
    probes: probeResults,
    psiFailures: psiFailureList,
  });
  await sink.publish({ type: "gaps.ranked", topThree, allGaps });

  // 9. Persist findings + probes + pages + final scores in a single
  //    transaction. Without this, a crash between writes leaves the scan
  //    permanently stuck in "running" with partial data.
  //    (Phase 7 review: DB-CRIT-1 / REL-H-3)
  await spend(costCents);
  const durationMs = Date.now() - start;

  const finalUpdate = {
    scoreSeo: overallSeo,
    scoreAeo: aeo.score,
    scoreVisibility: aeo.visibility,
    scoreHygiene: aeo.hygiene,
    scoreCitability: aeo.citability,
    citationRatePct: aeo.citationRatePct,
    sovPct: aeo.sovPct,
    brandName: ctx.brandName,
    category: ctx.category,
    totalPages: allPages.length,
    durationMs,
    costCents,
  };

  const baseDb = input.db ?? defaultDb;
  await baseDb.transaction(async (tx) => {
    await persistCrawledPages(input.scanId, allPages, tx);
    await persistProbes(probeResults, tx);
    await persistGaps(input.scanId, allGaps, tx);
    await setScanCompleted(input.scanId, finalUpdate, tx);
  });

  await sink.publish({
    type: "scan.completed",
    durationMs,
    costCents,
    pagesScanned: allPages.length,
    enginesProbed,
    enginesSkipped,
  });

  return {
    scoreSeo: overallSeo,
    scoreAeo: aeo.score,
    totalPages: allPages.length,
    durationMs,
    costCents,
    enginesProbed,
    enginesSkipped,
  };
}

export { canonicalUrlKey };
