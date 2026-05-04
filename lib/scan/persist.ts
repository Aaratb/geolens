/**
 * Postgres persistence layer for the scan worker. Every write is idempotent
 * relative to scan_id so a retried/replayed scan won't double-insert.
 *
 * Also defines the EventSink interface — the orchestrator depends on a sink,
 * not on Postgres directly, so tests can pass an in-memory sink.
 */
import { eq, sql } from "drizzle-orm";
import { db as defaultDb, type Db } from "@/lib/db/client";
import {
  scans,
  scanEvents,
  scanFindings,
  scanEngineProbes,
  scanPagesCrawled,
  type Engine,
  type ProbeKind,
} from "@/lib/db/schema";
import type { ScanEvent, ScanEventType } from "./events";
import type { ProbeResult } from "@/lib/audits/aeo/types";
import type { CrawledPage } from "@/lib/crawl/types";
import type { Gap } from "@/lib/score/gaps";

export interface EventSink {
  publish(event: ScanEvent): Promise<void>;
}

/** Postgres-backed event sink. Inserts into scan_events with monotonic seq. */
export function dbEventSink(scanId: string, db = defaultDb): EventSink {
  let seq = 0;
  return {
    async publish(event) {
      seq += 1;
      await db.insert(scanEvents).values({
        scanId,
        seq,
        eventType: event.type,
        payload: event as unknown as Record<string, unknown>,
      });
    },
  };
}

/** In-memory sink for tests. */
export function memoryEventSink(): EventSink & { events: ScanEvent[] } {
  const events: ScanEvent[] = [];
  return {
    events,
    async publish(event) {
      events.push(event);
    },
  };
}

export async function setScanRunning(
  scanId: string,
  stage: string,
  db = defaultDb,
): Promise<void> {
  await db
    .update(scans)
    .set({ status: "running", stage })
    .where(eq(scans.id, scanId));
}

export async function setScanFailed(
  scanId: string,
  reason: string,
  db = defaultDb,
): Promise<void> {
  await db
    .update(scans)
    .set({ status: "failed", stage: reason })
    .where(eq(scans.id, scanId));
}

export interface ScanFinalUpdate {
  scoreSeo: number;
  scoreAeo: number;
  scoreVisibility: number;
  scoreHygiene: number;
  scoreCitability: number;
  citationRatePct: number;
  sovPct: number;
  brandName: string | null;
  category: string | null;
  totalPages: number;
  durationMs: number;
  costCents: number;
}

export async function setScanCompleted(
  scanId: string,
  update: ScanFinalUpdate,
  db = defaultDb,
): Promise<void> {
  await db
    .update(scans)
    .set({
      status: "completed",
      stage: null,
      completedAt: sql`now()`,
      ...update,
    })
    .where(eq(scans.id, scanId));
}

export async function persistGaps(
  scanId: string,
  gaps: Gap[],
  db = defaultDb,
): Promise<void> {
  if (gaps.length === 0) return;
  await db.insert(scanFindings).values(
    gaps.map((g) => ({
      scanId,
      ord: g.ord,
      category: g.category,
      severity: g.severity,
      title: g.title,
      why: g.why,
      detail: g.detail,
      fixHint: g.fixHint,
      effort: g.effort,
      scoreImpact: g.scoreImpact,
      isTop3: g.isTop3,
      meta: g.meta,
    })),
  );
}

export async function persistProbes(
  probes: ProbeResult[],
  db = defaultDb,
): Promise<void> {
  if (probes.length === 0) return;
  await db.insert(scanEngineProbes).values(
    probes.map((p) => ({
      scanId: p.scanId,
      engine: p.engine,
      probeKind: p.probeKind,
      prompt: p.prompt,
      response: p.response,
      brandMentioned: p.parsed?.brandMentioned ?? null,
      urlCited: p.parsed?.urlCited ?? null,
      position: p.parsed?.position ?? null,
      sentiment: p.parsed?.sentiment ?? null,
      accuracy: p.parsed?.accuracy ?? null,
      baseScore: p.baseScore,
      weightedScore: p.weightedScore,
      latencyMs: p.latencyMs,
      costCents: p.costCents,
      status: p.status,
      error: p.error,
    })),
  );
}

export async function persistCrawledPages(
  scanId: string,
  pages: CrawledPage[],
  db = defaultDb,
): Promise<void> {
  if (pages.length === 0) return;
  await db.insert(scanPagesCrawled).values(
    pages.map((p) => ({
      scanId,
      url: p.url,
      statusCode: p.statusCode,
      bytes: p.bytes,
      fetchMs: p.fetchMs,
      // Computed signals only (no raw HTML) per PRD §13. We persist a
      // structural snapshot here — auditors that need raw text re-derive
      // from cheerio in-memory.
      signals: {
        contentType: p.contentType,
        finalUrl: p.finalUrl,
        h1: p.$("h1").first().text().trim().slice(0, 200),
        title: p.$("head > title").first().text().trim().slice(0, 200),
      },
    })),
  );
}

export type { Db, Engine, ProbeKind, ScanEventType };
