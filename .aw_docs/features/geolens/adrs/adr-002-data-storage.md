# ADR-002: Data storage — Neon Postgres + Vercel Blob + Upstash Redis

- **Status:** accepted (Phase 5)
- **Date:** 2026-05-04

## Context

GEOlens needs three storage roles:
1. **Relational data** — scans, findings, engine probes, pages crawled, share tokens, waitlist, events. Schema is genuinely relational (one-to-many between scan and findings/probes/pages); strong typing and joins are wins.
2. **Blob** — generated PDFs, optional cached OG images, future fixer agent attachment storage.
3. **Hot key/value** — rate limiting, daily budget counter, scan event pub/sub for SSE streaming, brand inference cache.

## Options considered

### Postgres (relational)
- **Neon** — serverless, branching per preview deploy, auto-suspend (cheap when idle), generous free tier, native Vercel integration.
- **Supabase** — Postgres + Auth + Storage + Realtime bundled. We don't need bundled Auth (ADR-001) so we'd be paying for surface we ignore.
- **Vercel Postgres (powered by Neon)** — same DB, marginally tighter integration, slightly more expensive at scale.
- **PlanetScale (MySQL)** — strong DX but MySQL, and PlanetScale removed free tier.

### NoSQL (alternative shape)
- **Firestore** — would force denormalization of scan→findings→probes, which fights our schema. Rejected in the Vercel-vs-Firebase discussion.

### Blob
- **Vercel Blob** — one-call API, native to our deploy, edge-cached. Free tier sufficient.
- **Cloudflare R2** — cheaper at scale, more setup.
- **AWS S3** — overkill for v1.

### Hot KV
- **Upstash Redis** — REST API works in edge runtime, native Vercel integration, free tier is 10k commands/day.
- **Vercel KV (powered by Upstash)** — same backend.
- **Cloudflare KV** — eventually consistent, doesn't fit our pub/sub need.

## Decision

- **Relational:** Neon Postgres + Drizzle ORM
- **Blob:** Vercel Blob
- **Hot KV / pub-sub:** Upstash Redis (`@upstash/redis` + `@upstash/ratelimit`)

## Rationale

### Why Neon
1. **Branching per preview.** Every PR gets an isolated DB branch with realistic data — eliminates the "works locally, fails on staging" class of bugs.
2. **Auto-suspend.** v1 traffic will be spiky; auto-suspend keeps cost near $0 between scans.
3. **Drizzle ORM.** Type-safe, lightweight (no Prisma client codegen pain), works in edge runtime, migration tooling we control.
4. **Genuinely relational.** Scan → many findings → many probes is exactly what Postgres is for. JSONB columns cover the few unstructured fields (`scan_findings.meta`, `scan_pages_crawled.signals`).
5. **No bundled features we'd ignore.** Supabase bundles Auth/Storage/Realtime; we already picked Clerk + Vercel Blob + Upstash so we'd be paying for unused surface.

### Why Vercel Blob
1. One vendor for hosting + blob; one API call to upload, presigned URLs for the OG image cache.
2. Edge-cached automatically.
3. Free tier covers v1 PDF + OG storage easily.

### Why Upstash Redis (not just Postgres for everything)
1. **Pub/sub for streaming.** Spec §5 decouples the scan worker from connected clients via `scan:<id>` channel. Postgres LISTEN/NOTIFY is an option but every Vercel function getting its own connection is wasteful; Upstash's REST pub/sub is fire-and-forget.
2. **Rate limiting.** Postgres-based rate limiting requires careful indexing and cleanup; `@upstash/ratelimit` is one line.
3. **Brand inference cache.** 24h TTL cache keyed by `url_hash` — exactly what KV is for.

## Consequences

### Positive
- Three small bills, all with free tiers covering v1
- Strong typing end-to-end via Drizzle
- Preview deploys get isolated DB and rate-limit state
- Streaming and pub/sub solved without ops work

### Negative / Risks
- **Three vendors instead of one.** Mitigation: free tiers across all three; consolidating would mean Firebase, which we rejected for the relational schema mismatch.
- **Drizzle is younger than Prisma.** Mitigation: it's hit critical mass for serverless TS projects; no migration risk in v1.
- **Vercel Blob is Vercel-locked.** Mitigation: blob is the easiest layer to migrate (presigned URLs work the same on R2/S3); kept thin abstraction in `lib/storage/blob.ts`.
- **Upstash REST adds 30–80ms latency vs node-redis.** Mitigation: only the hot paths use Redis, and SSE pub/sub doesn't care about that small overhead.

## Schema highlights

See spec.md §4 for full schema. Notable choices:
- `users.id` is `text` (Clerk's user ID format), not UUID we generate
- `scans.url_hash` indexed for dedupe + abuse prevention
- `scans.ip_hash` is `sha256(ip + IP_HASH_SALT)`, never plaintext IP
- `scan_findings.ord` is the source of truth for `#GL-NN` numbering
- `scan_pages_crawled.signals` is `jsonb`, **never** raw HTML (PRD §13)

## Migration policy

- Drizzle migrations are checked into `db/migrations/` and applied via `drizzle-kit migrate`
- CI verifies no schema drift on every PR
- Production migrations: on PR merge to `main`, GitHub Action runs `drizzle-kit migrate` against prod with auto-rollback on failure

## Revisit triggers

- Daily Upstash command count > 8k (close to free-tier ceiling)
- Neon storage > 3GB (free tier limit)
- Need for full-text search (would consider Postgres `pg_trgm` first, then OpenSearch)
