/**
 * Drizzle schema — translates spec.md §4 into Postgres.
 *
 * Privacy lock from PRD §13: scan_pages_crawled.signals stores ONLY computed
 * metrics. Raw HTML must never land in this table.
 */
import {
  pgTable,
  text,
  uuid,
  integer,
  bigserial,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ---------- enums via text + zod-validated app layer ---------- */

export const SCAN_STATUSES = ["queued", "running", "completed", "failed"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const ENGINES = ["openai", "anthropic", "perplexity", "gemini"] as const;
export type Engine = (typeof ENGINES)[number];

export const PROBE_KINDS = ["brand_recall", "category_placement", "citation_behavior"] as const;
export type ProbeKind = (typeof PROBE_KINDS)[number];

export const PROBE_STATUSES = ["ok", "skipped", "errored"] as const;
export type ProbeStatus = (typeof PROBE_STATUSES)[number];

export const POSITIONS = ["primary", "secondary", "tertiary", "none"] as const;
export type Position = (typeof POSITIONS)[number];

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const ACCURACIES = ["accurate", "partial", "misattributed"] as const;
export type Accuracy = (typeof ACCURACIES)[number];

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const FINDING_CATEGORIES = ["seo", "hygiene", "engine", "citability"] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

/* ---------- tables ---------- */

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    ipHash: text("ip_hash").notNull(),
    url: text("url").notNull(),
    urlHash: text("url_hash").notNull(),
    hostname: text("hostname").notNull(),
    brandName: text("brand_name"),
    category: text("category"),
    status: text("status", { enum: SCAN_STATUSES }).notNull().default("queued"),
    stage: text("stage"),
    scoreSeo: integer("score_seo"),
    scoreAeo: integer("score_aeo"),
    scoreVisibility: integer("score_visibility"),
    scoreHygiene: integer("score_hygiene"),
    scoreCitability: integer("score_citability"),
    citationRatePct: integer("citation_rate_pct"),
    sovPct: integer("sov_pct"),
    totalPages: integer("total_pages"),
    durationMs: integer("duration_ms"),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("scans_user_created_idx").on(t.userId, t.createdAt),
    index("scans_url_hash_idx").on(t.urlHash),
    index("scans_ip_created_idx").on(t.ipHash, t.createdAt),
  ],
);

export const scanFindings = pgTable(
  "scan_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    ord: integer("ord").notNull(),
    category: text("category", { enum: FINDING_CATEGORIES }).notNull(),
    severity: text("severity", { enum: SEVERITIES }).notNull(),
    title: text("title").notNull(),
    why: text("why").notNull(),
    detail: text("detail"),
    fixHint: text("fix_hint"),
    effort: text("effort"),
    scoreImpact: integer("score_impact"),
    isTop3: boolean("is_top3").default(false).notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("findings_scan_ord_idx").on(t.scanId, t.ord)],
);

export const scanEngineProbes = pgTable(
  "scan_engine_probes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    engine: text("engine", { enum: ENGINES }).notNull(),
    probeKind: text("probe_kind", { enum: PROBE_KINDS }).notNull(),
    prompt: text("prompt").notNull(),
    response: text("response"),
    brandMentioned: boolean("brand_mentioned"),
    urlCited: boolean("url_cited"),
    position: text("position", { enum: POSITIONS }),
    sentiment: text("sentiment", { enum: SENTIMENTS }),
    accuracy: text("accuracy", { enum: ACCURACIES }),
    baseScore: integer("base_score"),
    weightedScore: integer("weighted_score"),
    latencyMs: integer("latency_ms"),
    costCents: integer("cost_cents"),
    status: text("status", { enum: PROBE_STATUSES }).notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("probes_scan_engine_idx").on(t.scanId, t.engine, t.probeKind)],
);

export const scanPagesCrawled = pgTable(
  "scan_pages_crawled",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    statusCode: integer("status_code"),
    bytes: integer("bytes"),
    fetchMs: integer("fetch_ms"),
    /**
     * COMPUTED SIGNALS ONLY. Never raw HTML. PRD §13.
     */
    signals: jsonb("signals"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pages_scan_idx").on(t.scanId)],
);

export const shareTokens = pgTable("share_tokens", {
  token: text("token").primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    scanId: uuid("scan_id").references(() => scans.id, { onDelete: "set null" }),
    gapId: uuid("gap_id").references(() => scanFindings.id, { onDelete: "set null" }),
    source: text("source"),
    utm: jsonb("utm"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("waitlist_email_gap_uq").on(t.email, t.gapId)],
);

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: text("user_id"),
    anonId: text("anon_id"),
    event: text("event").notNull(),
    props: jsonb("props"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("events_event_created_idx").on(t.event, t.createdAt)],
);

/**
 * Streaming scan events. One row per emitted event during a scan; consumed by
 * the SSE endpoint via id-based polling. Cleared when the parent scan is
 * deleted (cascade). See ADR-003 implementation note: we chose Postgres
 * polling over Redis pub/sub for v1 because Upstash's REST API doesn't expose
 * blocking subscribe; revisit if scan latency drops below ~30s.
 */
export const scanEvents = pgTable(
  "scan_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("scan_events_scan_seq_idx").on(t.scanId, t.id)],
);

/* ---------- type exports for app layer ---------- */
export type User = typeof users.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type ScanFinding = typeof scanFindings.$inferSelect;
export type ScanEngineProbe = typeof scanEngineProbes.$inferSelect;
export type ScanPageCrawled = typeof scanPagesCrawled.$inferSelect;
export type ShareToken = typeof shareTokens.$inferSelect;
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type ScanEventRow = typeof scanEvents.$inferSelect;
export type NewScanEvent = typeof scanEvents.$inferInsert;
