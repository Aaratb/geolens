# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GEOlens (package name `geolens`) is a Next.js 16 App Router app that audits public URLs for the AI-search era: it crawls a site, runs Google PageSpeed Insights, probes ChatGPT/Claude/Perplexity/Gemini via the Vercel AI Gateway, scores AEO hygiene + citability, and streams a gap-first report. Live at https://geolens.xyz. The follow-on **Fix Pack** turns top scan gaps into copy-paste repair cards plus a downloadable `agent.md` for Claude Code/Cursor.

The canonical product/architecture sources of truth live in `.aw_docs/features/geolens/`:
- `prd.md`, `spec.md`, `requirements.md` — product + API contracts
- `adrs/` — load-bearing decisions
- `SHIP_STATUS.md` — current production state
- `competitive-research.md` — vocabulary alignment (Citation Rate, Share of Voice, Position/Sentiment/Accuracy)
- `.aw_docs/features/agent-waitlist-feature-flag/` — Fix Pack spec + Phase 8 QA

Read these before changing scan formulas, API shapes, or scoring weights.

## Commands

```bash
npm run dev            # Next dev server (Turbopack)
npm run build          # Production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest unit tests (excludes e2e/)
npm run test:cost      # Cost regression — must stay under $0.20/scan
npm run e2e            # Playwright against PLAYWRIGHT_BASE_URL (default: localhost:3000)
npm run e2e:prod       # Playwright against https://geolens.xyz (chromium-desktop only)
npm run db:generate    # Generate Drizzle migration from schema diff
npm run db:migrate     # Apply pending migrations (used in CI/prod)
npm run db:push        # Push schema to DB (first-time bring-up only)
npm run db:studio      # Drizzle Studio UI
```

Run a single Vitest file: `npx vitest run path/to/file.test.ts`. Run a single Playwright spec: `npx playwright test e2e/foo.spec.ts --project=chromium-desktop`. Playwright **does not auto-start a dev server** — start `npm run dev` first or set `PLAYWRIGHT_BASE_URL`.

## Architecture

### Scan pipeline (`lib/scan/run.ts`)
The orchestrator is the single entry point for an audit. All external dependencies (db, crawler, PSI, AI generator, parser) are **injectable** — tests pass in-memory fakes; production wires the real services. Flow:

1. Crawl + URL canonicalization (`lib/crawl/`)
2. Brand/category inference (`lib/inference/`)
3. Parallel: PSI (`lib/audits/psi.ts`), hygiene (`lib/audits/hygiene/`), citability (`lib/audits/citability/`), AEO probes via 4 LLM engines (`lib/audits/aeo/`)
4. Scoring (`lib/score/`) → gap ranking → persistence → SSE event stream

**Cost guards (spec §5)** are baked into the orchestrator: a daily-budget circuit breaker (`lib/scan/budget.ts`) skips engine probes when the daily LLM spend ceiling is hit; a per-scan ceiling (`PER_SCAN_CEILING_CENTS`) short-circuits remaining probes mid-run. Both are testable via `budget` / `spend` overrides on `runScan`. The cost regression test enforces <$0.20/scan in CI.

### API surface (`app/api/v1/`)
- `POST /api/v1/scans` inserts a `queued` row, **fires the worker via `waitUntil(runScan(...))`**, and returns `{ scanId }`. The route runtime is `nodejs` with `maxDuration = 300` (Vercel Pro). The handler keeps the function alive until the scan resolves.
- `GET /api/v1/scans/[id]/stream` is the SSE endpoint backed by `scan_events` rows.
- `GET|POST /api/v1/scans/[id]/fix-pack` and `/agent.md` — Fix Pack generation, persistence, Markdown download.
- `app/api/internal/` holds cron + budget-check endpoints (require `CRON_SECRET`).
- `app/api/webhooks/clerk` ingests Clerk lifecycle events (Svix-signed; bypasses Clerk middleware via the matcher in `proxy.ts`).

**Hard rule (learned the hard way):** every Route Handler ends in a top-level `try { return await handle(req) } catch (e) { console.error(e); return NextResponse.json({error,message}, {status:500}) }`. An unhandled exception becomes an empty 500, the client's `res.json()` throws, and users see a misleading "Network error" toast. The pattern is in `app/api/v1/scans/route.ts` — copy it.

### Auth + user sync
Clerk is the identity provider; `lib/auth/current-user.ts` exposes `getCurrentUser()` + `ensureUserSynced()`. The Clerk webhook is **best-effort, not authoritative** — every table that FKs to `users.id` must call `ensureUserSynced()` on the request path before insert. Pre-populating via webhook alone leads to FK violations (eventual vs. immediate consistency).

Route protection lives in `proxy.ts` (Next 16's renamed `middleware.ts`). Update the `isProtectedRoute` matcher there, not in individual routes.

### Database (`lib/db/`)
Neon Postgres + Drizzle ORM. Schema in `lib/db/schema.ts` is the source of truth; **enums are modeled as `text` columns + `as const` arrays + zod validation at the app layer**, not Postgres enums (cheaper migrations). Migrations are committed to `drizzle/` and applied via `db:migrate` in CI/prod. Use `db:push` only for first-time local bring-up.

**Privacy lock (PRD §13):** `scan_pages_crawled.signals` stores **only computed metrics** — never raw HTML. IPs are hashed with `IP_HASH_SALT` (rotates yearly).

### AI Gateway (`lib/ai/gateway.ts`)
A single `AI_GATEWAY_API_KEY` routes to OpenAI / Anthropic / Perplexity / Gemini through Vercel AI Gateway. Do not add per-provider keys.

### Streaming UI (`app/scan/[id]`)
Direction A (dark, editorial). Connects to the SSE endpoint, renders progress trail + numbered findings (`#GL-NN`). The landing page (`app/page.tsx`) is Direction C (light, serif, magazine-styled) — design tokens are locked in `app/globals.css` (Phase 4).

### Rate limiting + telemetry
`lib/rate-limit/` (Upstash) and `lib/telemetry/track.ts`. The scan endpoint rate-limits per-user when authenticated and per-IP-hash for anonymous traffic.

### Scan profile env switch
`SCAN_PROFILE=hobby|pro` selects scope. `hobby` is homepage-only with shorter timeouts (legacy; designed for Vercel Hobby's 60s cap). `pro` is the full 5-page crawl, all 4 engines, 25s probe timeout. **The cost ceiling stays the same in both.** Production runs `pro` on Vercel Pro.

## Conventions

- **Imports use the `@/` alias** (configured in `tsconfig.json` and `vitest.config.ts`) — `@/lib/...` not relative paths.
- **TypeScript strict** is on; `any` is banned. Use `unknown` + Zod at boundaries.
- **Module type is ESM** (`"type": "module"` in package.json). `.mjs` for scripts.
- **No mutation in `lib/`** — pure functions + immutable updates; the orchestrator depends on it for testability.
- Husky + lint-staged run `eslint --fix` + `prettier --write` on commit.
- Node `>=20`.

## Browser automation / E2E

**Default to the `chrome-devtools` MCP for any agent-driven browser work** — manual smoke checks, signed-in flow verification, debugging UI bugs, performance/Lighthouse audits, network/console inspection. It runs in `--isolated` mode (ephemeral profile, no stale-lock issues) and exposes CDP-level tools (`navigate_page`, `take_snapshot`, `evaluate_script`, `list_network_requests`, `list_console_messages`, `performance_start_trace`, `lighthouse_audit`, `take_memory_snapshot`, `emulate`, etc.).

Do **not** reach for the `playwright` MCP, the `browser-use` subagent, or `firecrawl` for ad-hoc browser control — they're fallbacks only (e.g. cross-browser engines, very long autonomous sessions, or pure scraping respectively). The committed Playwright suite under `e2e/` is still the canonical CI gate; `chrome-devtools` is for the interactive loop.

## Things future Claude has gotten wrong here

- **Engineering around a free-tier limit.** A "hobby scan profile" was built to fit Vercel Hobby's 60s cap, then thrown out hours later when the project upgraded to Pro. Decide the runtime tier from worst-case durations before writing code that's only correct on the cheaper tier.
- **`node:fs` in an edge-runtime route** to read `public/` files for self-dogfooding. Crashed at module-load. Don't ship platform-implicit hacks during a launch window — park the dogfooding bug as backlog.
- **Headless-only browser checks.** A "Sign in" link looked clickable in headless Playwright but Clerk silently bounced signed-in users home via `fallbackRedirectUrl`. For auth-shaped UX bugs, drive a real signed-in session and use `browser_evaluate` to inspect `document.cookie`, `window.Clerk`, and the actual request shape.
- **AW agents on this project.** This is **not** a GoHighLevel repo. Default to general-purpose reviewers (`code-reviewer`, `security-reviewer`, `database-reviewer`, `typescript-reviewer`, `tdd-guide`, `e2e-runner`, `architect`, `planner`). The `platform-*` / `ai-voice-*` / `crm-frontend-*` agents are GHL-tuned and will recommend HighRise/MFA/Jenkins patterns that don't apply here.
