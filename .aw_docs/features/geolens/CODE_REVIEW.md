# GEOlens — Phase 7 Code Review

> Consolidated output of 8 specialist reviewers run in parallel: security, legal, typescript, database, code, architect, reliability, performance. Synthesized 2026-05-04.

## Verdict

**CHANGES_REQUESTED — block public launch / paid distribution on the 11 CRITICAL findings.** The system is architecturally sound and 96 tests pass, but the live deployment has a paywall bypass, financial-exposure paths, false-advertising surface, and operational hazards that compound under any real traffic. Estimated 1.5–3 hours to clear the entire CRITICAL list; the HIGH list is another 3–5 hours.

## Convergence — multiple reviewers caught the same thing

High signal where independent reviewers landed on the same finding:

| Convergence | Reviewers | Severity |
|---|---|---|
| `runScan()` fire-and-forget needs `waitUntil()` | architect, reliability | **CRITICAL** |
| Final persist phase needs a single transaction | database, reliability | **CRITICAL** |
| `pg.Pool` max + Neon ceiling mismatch | architect, database | **CRITICAL** |
| Cost-guard fail-open + observed-only ceiling = financial risk | security, reliability, architect | **HIGH** |
| `IP_HASH_SALT` public fallback | security, legal | **HIGH** / **CRITICAL** in legal |
| `share.ts` view-counter unhandled rejection | reliability, typescript | **CRITICAL** / **MED** |
| Phantom `aeo.probe.started` / `scan.timeout` event contract drift | code, typescript | **HIGH** |

## CRITICAL findings — block launch

| # | ID | Owner | File | Issue |
|---|---|---|---|---|
| 1 | S-CRIT-1 | security | `app/api/v1/scans/[id]/stream/route.ts` | SSE stream has no authorization — paywalled full report leaks via `curl` to anyone who knows a scan UUID |
| 2 | ARCH-S-1 / REL-C-1 | architect, reliability | `app/api/v1/scans/route.ts:99–111` | Vercel can freeze instance after `runScan(...).catch()` returns 202, killing in-flight scans. Use `waitUntil()` |
| 3 | S-CRIT-2 | security | `app/api/internal/{cleanup,budget-check}/route.ts` | Cron bearer token compared with `===` — timing side-channel on destructive endpoint |
| 4 | L-CRIT-1 | legal | `app/page.tsx:64–65` | Hardcoded fabricated stats ("64 · average AEO score in our index", "23% · valid llms.txt") — false advertising under FTC/UCPD/CAP |
| 5 | L-CRIT-2 | legal | `app/privacy/page.tsx` | Privacy policy materially non-compliant with GDPR (no lawful basis, data subject rights, SCCs, undisclosed UTM/anonId tracking) |
| 6 | DB-CRIT-1 / REL-H-3 | database, reliability | `lib/scan/run.ts` (persist phase) | 4 sequential writes (gaps→probes→pages→setCompleted) without a transaction. Crash between = scan stuck in "running" with partial data |
| 7 | DB-CRIT-2 / ARCH-S-3 | database, architect | `lib/db/client.ts` | `pg.Pool max:10` per worker × N workers exhausts Neon's per-project connection ceiling under SSE load. Switch to Neon pooler URL + max:3 |
| 8 | PERF-CRIT-1 | performance | `app/share/[token]/opengraph-image.tsx` | OG image regenerated on every social-crawler hit — no cache headers; Twitter/Slack/LinkedIn each hit it independently |
| 9 | PERF-CRIT-2 | performance | `app/api/v1/scans/[id]/stream/route.ts` | SSE poll cost shape: 200 qps + 100 long-lived Node fns at 100 concurrent scans. Hard cliff at scale |
| 10 | REL-C-3 | reliability | (missing) `app/error.tsx` | No error boundary; Drizzle/Neon throws leak stack traces to user |
| 11 | REL-C-2 | reliability | `lib/scan/share.ts:19` | `void db.update(...)` with no `.catch()` → unhandled rejection on share-view click |

## HIGH findings — fix before paid distribution

| ID | Owner | File | Issue |
|---|---|---|---|
| S-HIGH-1 | security | `lib/rate-limit/index.ts:13` | `IP_HASH_SALT` falls back to public-source default — verify Vercel prod env has it set; fail-fast in non-dev otherwise |
| S-HIGH-2 | security | `lib/{rate-limit,scan/budget}` | Rate limiter + budget guard both fail-open on Upstash outage = simultaneous removal of all cost controls |
| S-HIGH-3 | security | `lib/rate-limit/index.ts:71–79` | `x-forwarded-for` checked before `cf-connecting-ip` — wrong order under Cloudflare; collapses rate-limit + claim-ownership |
| ARCH-H-3 | architect | `scan_events` table | Unbounded growth — cleanup cron deletes scans cascading to events, but no separate event-only retention |
| TS-H-1 | typescript | `lib/audits/aeo/run.ts` | `onProbeComplete` typed `void` but callers pass async fns — `sink.publish` failures silently dropped mid-scan |
| TS-H-2 | typescript | `lib/scan/run.ts:155–169` | Dead `psiResults` accumulator with unsound `unknown` type annotation |
| TS-H-3 | typescript | `lib/audits/aeo/run.ts` | `as Engine` index-arithmetic cast in error-path bypasses `noUncheckedIndexedAccess` |
| TS-H-4 | typescript | `lib/score/gaps.ts` | `mapHygieneCategory` non-exhaustive — new variant silently mis-maps |
| CR-H-1 | code | scan-view + stream | `scan.timeout` emitted by SSE server but unhandled by client — UI hangs forever |
| CR-H-2 | code | events.ts | `aeo.probe.started` declared in union but never emitted — contract drift |
| CR-H-3 | code | scan-view | Blur paywall is keyboard-bypassable; CSS `pointer-events-none` doesn't block Tab/focus. Add `inert=""` |
| CR-H-4 | code | gap-card → waitlist | `gapId` never threaded to `GapCard` — north-star waitlist attribution permanently null |
| REL-H-1 | reliability | `lib/scan/run.ts:198–234` | Per-scan cost ceiling is observed-only; daily cap is racy |
| REL-H-2 | reliability | `lib/inference/brand.ts` | Uncaught path possible if both heuristics + LLM fail; brand falls to host fallback OK but error-shape inconsistent |
| REL-H-5 | reliability | `lib/hooks/use-scan-stream.ts` | No polling fallback — corp proxies stripping `text/event-stream` leave users stuck on `connecting` |
| REL-H-6 | reliability | `lib/scan/run.ts` | All-PSI-failed scans silently report `scoreSeo=0` instead of marking the SEO subsystem skipped |
| DB-H-1 | database | `lib/db/schema.ts` | `waitlistEntries` UNIQUE(email, gap_id) doesn't prevent duplicate general-waitlist signups when gap_id IS NULL — partial index needed |
| DB-H-2 | database | scan_events | SSE polling needs `INCLUDE (event_type, payload)` for covering index — eliminates heap fetches |
| DB-H-3 | database | schema | Missing indexes on `share_tokens(scan_id)`, `waitlist_entries(scan_id, gap_id)`, `share_tokens(expires_at)` — cascade ops are O(table_size) |
| PERF-H-1 | performance | `app/layout.tsx` | Fraunces ships full weight axis (~150–200 KB recoverable); restrict weights to those actually used |
| PERF-H-2 | performance | `lib/db/schema.ts` | Mixes runtime + types without `verbatimModuleSyntax` enforcement; risk of value imports leaking to client |
| PERF-H-3 | performance | scan worker | ~25–35 serialized event-publish round-trips inside the scan; batch where possible |
| PERF-H-4 | performance | PSI fan-out | Unthrottled across concurrent scans — risk of 25k/day quota burn under any spike |

## MEDIUM (12) and LOW (15)

Full per-finding details preserved in subagent transcripts. Headlines:

- Email PII written to `events` table (S-MED-3), share token logged verbatim (S-MED-4), no HTTP security headers (S-MED-1), SSRF gap on hostnames resolving to private IPs (S-MED-2)
- AI-content disclosure labels missing per EU AI Act (legal MED)
- LensMark + score-threshold tone logic duplicated across landing/scan/share (CR-M-2/3)
- Trademark search outstanding for "GEOlens" (legal LOW)

## Open questions surfaced for product owner

1. **Should anonymous viewers of a `/share/[token]` URL see the full report or top-3 only?** Current code shows full; security review assumed full is intended; legal didn't flag — but this is the only mass-shared surface so it warrants a clear policy.
2. **Hobby plan acceptable for v1 or upgrade to Pro?** Two reviewers (architect, reliability) noted the 60s timeout produces silent hangs on real scans. Sticking with Hobby = scans don't work in production.
3. **Daily LLM budget set at $50** — adequate for waitlist phase, but the fail-open behavior on Upstash outage means a single Upstash incident could drain the entire upstream API balance, not just $50. Worth capping at the gateway layer too.
4. **AI-generated probe responses shown verbatim in the report** — under EU AI Act, may need a "AI-generated content" label adjacent to the engine probe sections. Legal review flagged.

## Recommended ship path

**Three-tier landing plan:**

### Tier 1 — Fix this turn (~1.5 hours): the 11 CRITICALs
1. Lock `runScan` with `waitUntil()` (1-line fix)
2. Add SSE auth check (mirror /scans/[id] auth logic)
3. Switch cron auth to `timingSafeEqual` (3 lines × 2 routes)
4. Remove the fabricated landing stats (delete 2 spans)
5. Rewrite `app/privacy/page.tsx` to be GDPR-compliant (template from current language)
6. Wrap final persist phase in `db.transaction()` (orchestrator already accepts a `db` param)
7. Move `DATABASE_URL` to Neon pooler endpoint, set `max:3`
8. Add cache headers to OG image route
9. Add `app/error.tsx` boundary
10. Catch the `share.ts` view-counter promise
11. SSE polling cost — partial fix today (covering index from DB-H-2), full fix is the move to LISTEN/NOTIFY (post-Pro)

### Tier 2 — Before paid distribution (~3 hours): the highest-leverage HIGHs
- IP_HASH_SALT fail-fast in prod
- Fail-closed budget guard on Upstash outage
- IP extraction order swap
- TS-H-1, TS-H-4 (quick wins)
- CR-H-1, CR-H-3, CR-H-4 (UI correctness)
- DB-H-1 partial unique index
- DB-H-3 FK indexes
- PERF-H-1 Fraunces weight axis trim
- REL-H-5 polling fallback

### Tier 3 — Quality polish (~1 hour): MEDs that bite later
- Email PII out of telemetry
- HTTP security headers
- AI-content disclosure label

## Artifacts

- This file: `.aw_docs/features/geolens/CODE_REVIEW.md`
- Raw reviewer transcripts: `agent-transcripts/.../subagents/*.jsonl`
- 8 reviewers ran read-only against commit `7d7ca55e` of `Aaratb/geolens`
