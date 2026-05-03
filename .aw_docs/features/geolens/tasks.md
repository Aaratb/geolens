# Implementation Tasks: GEOlens v1

> Phase 5 of `/feature-pro`. Recipe-level breakdown for `aw-build` in Phase 6. Organized into 4 milestones with explicit gates between them.

## Milestones at a glance

```
M1 → Foundation        (1–2 days)   skeleton app, auth, db, ci
M2 → Scan Engine       (3–4 days)   PSI + 4 LLM probes + hygiene + scoring
M3 → Streaming UI      (3–4 days)   landing + report + sign-in unlock
M4 → Polish + Launch   (2–3 days)   share, OG, methodology, PDF, telemetry
```

Each milestone ends with a green CI run (lint + types + unit tests) and a working deploy preview.

---

## M1 — Foundation

### M1.1 Repo + Next.js skeleton
- `git init`, push to GitHub, branch protection on `main`
- `npx create-next-app@latest geolens --typescript --tailwind --app --eslint`
- Strict TypeScript (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- Add Prettier + ESLint flat config + lint-staged + husky pre-commit
- `.env.example` with every key from spec §14 (no values)

### M1.2 Vercel hookup
- Connect repo to Vercel project; production branch `main`
- Confirm Pro plan (300s function timeout)
- Set up preview env vars (separate Neon branch, Clerk dev instance)

### M1.3 Design tokens + fonts
- `next/font` self-host Fraunces + Inter + JetBrains Mono (Latin subset, only needed weights)
- Tailwind config: extend with the locked palettes (light editorial + dark interactive) as CSS variables
- `next-themes` for light/dark with manual override (system default = light editorial on landing, dark on `/scan/*`)
- shadcn/ui init: install Button, Input, Dialog, Skeleton, Tabs, Tooltip

### M1.4 Database
- Create Neon project, two branches: `main` (prod), `dev` (shared dev)
- Install Drizzle + Drizzle Kit
- Write schema from spec §4 in `db/schema.ts`
- Generate + apply first migration
- Seed script for local dev (one fake completed scan)

### M1.5 Auth (Clerk)
- Install `@clerk/nextjs`, wrap app in `<ClerkProvider>`
- Middleware: protect `/dashboard/*` and authed API routes
- Clerk dashboard: enable email + Google OAuth only (keep it lean)
- Webhook endpoint `/api/webhooks/clerk` syncing `user.created`/`user.updated` into `users` table

### M1.6 Other infra
- Upstash Redis project, paste token into env
- Vercel Blob token in env
- Vercel AI Gateway: create gateway, add OpenAI/Anthropic/Perplexity/Google keys, set $50/day cap
- PageSpeed Insights API key (free tier)

### M1.7 CI
- GitHub Actions: typecheck, lint, unit tests on every PR
- Drizzle migration check (no drift) on PR
- Vercel build preview required before merge

**M1 Gate:** clean preview deploy with empty landing + sign-in flow working end-to-end.

---

## M2 — Scan Engine

### M2.1 Crawler
- `lib/crawl/fetch.ts` — fetch with timeout, max bytes, redirect cap, user agent `GEOlensBot/1.0`
- `lib/crawl/robots.ts` — parse robots.txt with `robots-parser`, check allow/disallow per page
- `lib/crawl/discover.ts` — given a homepage HTML, find up to 5 internal pages (sitemap → nav → body)
- Unit tests with fixture HTML

### M2.2 Brand & category inference
- `lib/inference/brand.ts` — heuristic ladder from spec §6
- `lib/inference/llm-fallback.ts` — single cheap LLM call when heuristics fail
- Cache layer keyed by `url_hash` in Redis (24h TTL)

### M2.3 SEO via PageSpeed Insights
- `lib/audits/psi.ts` — wrap PSI API; one call per page; aggregate to overall SEO score per spec §6.1
- Surface the failing audits as candidate findings
- Unit test with fixture PSI responses (PSI is slow/flaky in tests)

### M2.4 AEO engine probes
- `lib/audits/aeo/prompts.ts` — the 3 probe templates (brand_recall, category_placement, citation_behavior)
- `lib/audits/aeo/parse.ts` — extract `brand_mentioned`, `url_cited`, `position`, `sentiment`, `accuracy` from response
  - Use a structured-output LLM call (`generateObject` with Zod schema) for parsing — more reliable than regex
- `lib/audits/aeo/score.ts` — apply Position × Sentiment × Accuracy multipliers per spec §6.3
- `lib/audits/aeo/run.ts` — orchestrate 4 engines × 3 probes via `Promise.allSettled`
- AI Gateway routing: one `ai` SDK config object, swap providers via `model:` string

### M2.5 AEO hygiene checks
- `lib/audits/hygiene/llms-txt.ts` — fetch + validate against llmstxt.org spec
- `lib/audits/hygiene/robots-ai-crawlers.ts` — detect rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, anthropic-ai, Bingbot
- `lib/audits/hygiene/jsonld.ts` — extract + validate JSON-LD blocks; type coverage (Organization, WebSite, Article, FAQPage, Product, BreadcrumbList)
- `lib/audits/hygiene/meta.ts` — title, description, canonical, hreflang, OG, Twitter Card
- `lib/audits/hygiene/headings.ts` — h1 uniqueness + h2/h3 structure depth
- `lib/audits/hygiene/semantic.ts` — count of `<article>`, `<section>`, `<nav>`, `<main>` vs total tags
- Each returns `HygieneCheck { id, status: pass|fail|warn, score_impact, fix_hint }`

### M2.6 Citability metrics
- `lib/audits/citability/extract.ts` — Readability-style algorithm (port `@mozilla/readability`)
- `lib/audits/citability/metrics.ts` — clean-text ratio, paragraph length distribution, sentence length, structured-list density, FAQ pattern detection, statistical density

### M2.7 Scoring + gap ranking
- `lib/score/seo.ts` — weighted PSI scores per spec §6.1
- `lib/score/aeo.ts` — weighted AEO sub-scores per spec §6.2
- `lib/score/gaps.ts` — rank failing items by `weight × severity × user_fixability`, return top-3 + full list

### M2.8 Scan orchestrator
- `lib/scan/run.ts` — entry point: takes `{ scanId, url }`, runs the whole pipeline
- Writes events to Redis pub/sub channel `scan:<id>` as it goes
- Persists findings/probes/pages to Neon
- Cost guard: pre-flight Redis check on daily budget; degrade to 1 probe per engine if per-scan cost projects over $0.20
- Marks scan `completed` or `failed` at end

### M2.9 Cost regression test
- Fixture scan against `vercel.com` with frozen mock LLM responses
- Asserts `cost_cents < 20`
- Runs in CI on every PR

**M2 Gate:** invoke `scan/run.ts` from a script with a real URL → JSON output matches expected shape, all probes complete, total cost <$0.20.

---

## M3 — Streaming UI

### M3.1 Route Handlers
- `POST /api/v1/scans` — Zod-validate URL, insert scan row, spawn `scan/run.ts`, return `{ scanId }`
- `GET /api/v1/scans/:id/stream` — SSE handler subscribed to Redis channel `scan:<id>`; auto-reconnect support
- `GET /api/v1/scans/:id` — full JSON; gates drill-down fields if `auth().userId !== scan.user_id` and scan is not anon-shared
- `POST /api/v1/scans/:id/claim` — claim an anonymous scan into the now-known user

### M3.2 Landing page (Direction C)
- `app/page.tsx` — editorial layout from `landing-direction-c.html`
- Hero with submit input, marginalia stats (hardcoded in v1, real later)
- Specimen audit (hardcoded vercel.com data) below the fold
- Comparison row vs Profound / Ahrefs Brand Radar / HubSpot Grader
- Methodology + Privacy + Terms in footer

### M3.3 Scan view (Direction A)
- `app/scan/[id]/page.tsx` — dark interactive layout
- Three score tiles (SEO / AEO / Citation Rate) — count up animation as values arrive
- Top-3 gap cards with `#GL-NN` numbering
- Below-fold: full SEO breakdown, all engine probes, hygiene checklist, citability detail
- All sections gated unless `userId === scan.user_id`; show blurred skeleton + sign-in CTA

### M3.4 Streaming hook
- `hooks/use-scan-stream.ts` — opens SSE, dispatches reducer actions per event, exposes typed state
- Idempotent: replays from current persisted state on reconnect
- Honors `prefers-reduced-motion`

### M3.5 Mode-shift transition
- Editorial → dark transition when navigating from `/` to `/scan/[id]` after submit
- 400ms ease on `<body>` background CSS variable, skipped if `prefers-reduced-motion`
- `aria-live="polite"` on streamed sections

### M3.6 Sign-in unlock flow
- Locked sections render under a frosted-glass overlay with shadcn `<Dialog>` invoking Clerk's `<SignIn>`
- On success, post-auth callback claims scan and refetches to unlock

### M3.7 Dashboard
- `app/(authed)/dashboard/page.tsx` — list of my scans with search + sort
- Empty state: "Run your first scan" CTA back to `/`

**M3 Gate:** end-to-end happy path on preview deploy: submit URL → streaming exec summary visible → sign in → drill-downs unlock.

---

## M4 — Polish + Launch

### M4.1 Sharing
- `POST /api/v1/share` — generate nanoid token, write to `share_tokens`, return URL
- `app/share/[token]/page.tsx` — public read-only report; same dark report layout but with anonymous-friendly CTA "Run your own scan"
- Edge-cached for 1h after first load

### M4.2 OG image
- `app/api/v1/scans/[id]/og/route.tsx` — `@vercel/og` generates 1200×630 image: editorial headline, hostname, three score tiles
- Cached at edge by `(scan_id, version)`
- Both landing and share pages set `<meta property="og:image">`

### M4.3 Methodology page
- `app/methodology/page.tsx` — editorial layout, full scoring formula, worked example, vocabulary glossary, link to PRD-derived FAQ
- Linked from every report and the footer

### M4.4 PDF export
- `POST /api/v1/scans/:id/pdf` — kicks off a Vercel Blob upload job; uses Puppeteer running on a Vercel serverless function (or hand off to a hosted PDF service if cold-start cost is too high)
- Decision deferred to M4: ship with stub paywall in v1, real PDF in v1.1 if launch goes well
- For v1: PDF button visible, clicking shows "Coming soon" sheet + collects email

### M4.5 Waitlist
- `POST /api/v1/waitlist` — Zod validate, dedupe per (email, gap_id), insert
- "Fix with our agent" button on every gap card → opens dialog with email field if anonymous, one-click join if signed in
- Confirmation toast

### M4.6 Telemetry
- `lib/telemetry/track.ts` — fire-and-forget insert into `events`
- Wire all events from PRD §12 + spec §10

### M4.7 Rate limiting
- `lib/rate-limit/check.ts` using `@upstash/ratelimit`
- Apply to scan creation + waitlist endpoints
- Friendly 429 response with retry-after

### M4.8 Cron jobs
- `vercel.json` cron: `/api/internal/cleanup` daily, `/api/internal/budget-check` every 5 min
- Both protected by `CRON_SECRET` header

### M4.9 SEO + accessibility for the app itself
- The reviewer must score 95+ on its own metrics (eat our own dog food)
- axe-core CI check; manual a11y pass
- Sitemap, robots, llms.txt, JSON-LD Organization, OG defaults

### M4.10 Pre-launch checks
- ToS + Privacy + AUP pages drafted and linked
- legal-reviewer agent pass (Phase 7)
- Stress test: 50 concurrent scans on preview without budget breach
- Monitoring: Vercel Analytics + Sentry (free tier) on the production project

**M4 Gate:** all routes return 2xx, all gates green, launch checklist 100% on a preview deploy that's been swapped for production.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM API outage during scan | medium | medium | `Promise.allSettled` + per-engine `status=skipped` + report banner |
| LLM cost runaway from abuse | medium | high | per-IP rate limit + daily global budget + per-scan ceiling + circuit breaker |
| Function timeout >300s on slow target sites | low | medium | per-page fetch cap 10s, total crawl cap 30s, total scan cap 120s |
| Cloudflare/bot-block on target site | high | low | graceful fallback report; don't fail the scan |
| Streaming connection drops mid-scan | medium | low | SSE reconnect; events durable in Redis pub/sub buffer |
| Scoring methodology gets dunked on | medium | high | publish methodology page transparently; cite our market-aligned vocabulary |
| Brand/category inference is wrong | medium | medium | UI lets user override and re-run |
| Race: anonymous scan claimed by wrong user | low | high | claim endpoint requires the scan's `ip_hash` to match Clerk session's ip_hash |
| Vercel function cold start hurts time-to-first-event | medium | medium | warm critical functions via cron pings; ship with edge runtime where possible |

## Out-of-band tasks (not on critical path)

- Domain purchase + DNS
- Trademark search for "GEOlens"
- Stripe setup for PDF paywall (only when M4.4 unblocks)
- Analytics dashboards (Phase 9)
- Code-of-conduct, security policy, contributors guide for the public repo (Phase 9)

## Definition of v1 done

- [ ] All four milestone gates green
- [ ] Cost regression test < $0.20 on canonical scan
- [ ] Self-scan (`geolens.app` scans `geolens.app`) returns SEO ≥ 95, AEO ≥ 80
- [ ] Dogfood pass: 5 internal users run scans, each gives a +1 thumbs up on report quality
- [ ] Methodology page published
- [ ] Phase 7 legal review clean
- [ ] Production deploy with monitoring active
