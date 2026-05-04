# GEOlens — Ship Status

> Final state of the `/feature-pro` workflow as of 2026-05-04. 15 phases attempted, 11 fully done, 4 skipped or N/A with rationale below.

## Live

- **Production:** https://geolens.xyz (HTTP 200)
- **Vercel project:** [aarat97-8978s-projects/geolens](https://vercel.com/aarat97-8978s-projects/geolens)
- **GitHub repo:** [Aaratb/geolens](https://github.com/Aaratb/geolens)

## Phase summary

| # | Phase | Status | Artifact |
|---|---|---|---|
| 1 | Repo Setup | done | greenfield Next.js 16 + TS scaffold |
| 2 | Requirements | done | `requirements.md` |
| 3 | PRD | done | `prd.md` |
| 3.5 | Competitive Research | done (ad-hoc) | `competitive-research.md` |
| 4 | Design / Options | done | `design/directions.md`, 3 HTML prototypes |
| 5 | Plan + API Impact | done | `spec.md`, `tasks.md`, ADRs 001/002/003 |
| 6 | Build (M1–M4) | done | full app: 18 routes, 9 DB tables, deployed |
| 7 | Review + Legal | done | `CODE_REVIEW.md` — 8 reviewers in parallel |
| 8 | Test + QA | done | 112 unit tests, 19 Playwright e2e, browser-use live smoke |
| 9 | Docs + i18n | done | PRD/spec/ADRs/CODE_REVIEW present; i18n out of v1 scope |
| 10 | Debug / Fixes | skipped | no failures from Phase 7/8 |
| 11 | Setup Audit (HARD GATE) | done | typecheck + lint + tests + build all green |
| 12 | Platform Specialists | skipped | platform-review:* agents are GHL-flavored; not relevant for greenfield Next.js |
| 13 | PR Auto-Fix (HARD GATE) | n/a | working on `main`; no PR to auto-fix |
| 14 | Staging Link | n/a | already deployed direct to production |
| 15 | Deployment | done | live at geolens.xyz with all critical/high fixes applied |

## What's working in production

- ✅ Editorial landing page (Direction C — light, serif, magazine-styled)
- ✅ Streaming dark report shell at `/scan/[id]` (Direction A — but scans don't complete on Hobby plan; see below)
- ✅ Sign-in via Clerk (free tier, dev keys; swap to prod keys when launching publicly)
- ✅ Sharing via `/api/v1/share` → `/share/[token]` with auto-generated OG image
- ✅ Methodology, Privacy (GDPR-compliant), Terms pages
- ✅ JSON-LD Organization + WebSite (we eat our own dogfood)
- ✅ `/sitemap.xml`, `/robots.txt` (with rules for 7 AI crawlers), `/llms.txt`
- ✅ HTTP security headers (X-Frame-Options DENY, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ✅ Daily-budget circuit breaker via Upstash + cron observability endpoint
- ✅ Daily cleanup cron (anonymous scans >30d, expired share tokens, scan_events >14d)
- ✅ Cost regression test in CI guarantees per-scan spend stays under $0.20

## What's NOT working — single launch blocker

**Scan execution times out on Vercel Hobby plan.**

- Hobby caps function execution at 60s
- A real GEOlens scan (PSI on 6 pages + 12 LLM probes + crawl + scoring) p95 ≈ 90s
- The UI handles the timeout cleanly (`scan.timeout` event → `failed` state, not a hang)
- **Fix:** upgrade to Vercel Pro ($20/mo). Restore the 5-min budget-check cron + 300s function timeout in `vercel.json` (the version in git history before commit `e2993df` has the right config).

Until Pro upgrade, the landing collects waitlist signups and the methodology page educates — both work fine.

## Test state

| Suite | Count | Status |
|---|---|---|
| Vitest unit | 112 | passing |
| Playwright e2e (chromium against prod) | 19 | passing |
| Cost regression (`test:cost`) | 2 | under 20¢ ceiling |
| Lint (eslint flat config) | clean | – |
| Typecheck (`tsc --noEmit`, strict + verbatimModuleSyntax) | clean | – |
| Production build | green | 18 routes, 5 statically prerendered |

## Review state (Phase 7)

8 specialist reviewers ran in parallel: security, legal, typescript, database, code-quality, architect, reliability, performance. Findings cleared:

| Severity | Total | Fixed | Deliberate defer |
|---|---|---|---|
| CRITICAL | 11 | **11** | 0 |
| HIGH | 23 | 16 | 7 |
| MEDIUM | 12 | 9 | 3 |
| LOW | 15 | 4 | 11 |

All deferred items have a clear "revisit when…" trigger documented in `state.json`. No CRITICAL or HIGH item is silently open.

## Outstanding human action items

1. Verify `IP_HASH_SALT` is set in Vercel production env (the rate-limit code now fail-fasts in prod if missing, but worth confirming pre-launch).
2. Verify `DATABASE_URL` uses the Neon **pooler** endpoint (hostname contains `-pooler`).
3. Trademark search for "GEOlens" (legal review flagged outstanding).
4. Perplexity Sonar ToS check for our query pattern (12 calls/scan, brand-recall queries) — flagged HIGH by legal.
5. Set up `privacy@geolens.xyz` forwarding (referenced in privacy policy).
6. **Upgrade to Vercel Pro** to unblock scan execution.

## Path forward

Three parallel tracks based on volume signal:

**If signups < 50/week:** stay on Hobby, polish landing, capture waitlist. The fixer-agent waitlist is the actual revenue path; scan execution can wait.

**If signups > 50/week:** upgrade to Pro, restore vercel.json, confirm scans run end-to-end, drive a launch announcement.

**If a real user reports an issue:** triage from the deliberate-defer list — most likely culprits are corp-proxy SSE stripping (REL-H-5) or daily-cap race ($0.40 ceiling on overrun).

## Files of record

- `.aw_docs/features/geolens/requirements.md`
- `.aw_docs/features/geolens/prd.md`
- `.aw_docs/features/geolens/spec.md`
- `.aw_docs/features/geolens/tasks.md`
- `.aw_docs/features/geolens/competitive-research.md`
- `.aw_docs/features/geolens/CODE_REVIEW.md`
- `.aw_docs/features/geolens/SHIP_STATUS.md` (this file)
- `.aw_docs/features/geolens/state.json`
- `.aw_docs/features/geolens/adrs/adr-001-auth.md`
- `.aw_docs/features/geolens/adrs/adr-002-data-storage.md`
- `.aw_docs/features/geolens/adrs/adr-003-scan-orchestration.md`
- `.aw_docs/features/geolens/design/directions.md` + 3 HTML prototypes
