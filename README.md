# GEOlens

> A second opinion on how AI sees your site.

GEOlens audits any public URL the way Lighthouse audits performance — but for the AI search era. It probes ChatGPT, Claude, Perplexity, and Gemini, runs full Google PageSpeed Insights, evaluates AEO hygiene (`llms.txt`, structured data, semantic HTML, AI crawler directives), and ships a streaming, gap-first report with numbered findings (`#GL-NN`).

> **Status: shipped** — live at [geolens.xyz](https://geolens.xyz). 15-phase `/feature-pro` workflow complete. See `.aw_docs/features/geolens/SHIP_STATUS.md` for the final state and `.aw_docs/features/geolens/CODE_REVIEW.md` for the Phase 7 review outcomes.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript strict
- **UI:** Tailwind CSS v4 + shadcn/ui + next-themes
- **Type system:** Fraunces (display) + Inter (UI) + JetBrains Mono (numerals)
- **Auth:** Clerk
- **Database:** Neon Postgres + Drizzle ORM
- **Cache / pub-sub:** Upstash Redis
- **Blob:** Vercel Blob
- **AI:** Vercel AI SDK + Vercel AI Gateway (routes 4 LLM engines)
- **SEO audit:** Google PageSpeed Insights API
- **Deploy:** Vercel Pro (300s function timeout)

See `.aw_docs/features/geolens/spec.md` for the full architecture and `.aw_docs/features/geolens/adrs/` for the load-bearing decisions.

## Fix Pack

Fix Pack is the live follow-on for authenticated owners of completed GEOlens scans. It turns the top scan gaps into three repair cards, a copy-paste implementation prompt, and a downloadable `agent.md` file for Claude Code or Cursor. The first version is intentionally scan-grounded and does not include autonomous web research.

Core routes:

- `GET /api/v1/scans/[id]/fix-pack` checks authenticated owner access and existing generation state.
- `POST /api/v1/scans/[id]/fix-pack` generates or returns a persisted pack, with rate limiting and stale-generation recovery.
- `GET /api/v1/scans/[id]/fix-pack/agent.md` downloads the generated Markdown agent file.
- `POST /api/v1/fix-pack/events` records narrow client interaction telemetry.

Implementation notes live in `.aw_docs/features/agent-waitlist-feature-flag/`; Phase 8 QA evidence is in `.aw_docs/features/agent-waitlist-feature-flag/verification.md`.

## Local setup

```bash
# 1. Install
npm install

# 2. Init git (if you haven't yet)
git init
git add -A
git commit -m "chore: scaffold geolens (M1)"

# 3. Provision external resources (free tiers cover everything for v1)
#    Each lives behind an env var in .env.local:
#    - Clerk:               https://clerk.com           (Publishable + Secret + Webhook secret)
#    - Neon Postgres:       https://neon.tech           (Pooled DATABASE_URL + DIRECT_URL)
#    - Upstash Redis:       https://upstash.com         (REST URL + REST Token)
#    - Vercel Blob:         https://vercel.com/dashboard/stores  (BLOB_READ_WRITE_TOKEN)
#    - Vercel AI Gateway:   https://vercel.com/dashboard/ai      (single AI_GATEWAY_API_KEY)
#    - PSI:                 https://developers.google.com/speed/docs/insights/v5/get-started

cp .env.example .env.local
# Fill in real values

# 4. Generate + apply initial migration
npm run db:generate
npm run db:push          # for first-time schema bring-up
# In CI/prod we use db:migrate against committed migration files instead

# 5. Run dev server
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script                | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Local dev server (Turbopack)                 |
| `npm run build`       | Production build                             |
| `npm run lint`        | ESLint + Next.js rules                       |
| `npm run typecheck`   | `tsc --noEmit`                               |
| `npm test`            | Vitest unit tests                            |
| `npm run test:cost`   | Cost regression test (must stay <$0.20/scan) |
| `npm run db:generate` | Generate Drizzle migration from schema diff  |
| `npm run db:migrate`  | Apply pending migrations                     |
| `npm run db:studio`   | Open Drizzle Studio UI                       |
| `npm run format`      | Prettier write                               |

## Project layout

```
app/                    Next.js App Router routes
  api/v1/               Versioned API surface (spec §3)
  scan/[id]/            Live streaming report (Direction A, dark)
  share/[token]/        Public read-only report
  methodology/          Editorial methodology page
  page.tsx              Landing (Direction C, editorial light)
  layout.tsx            Root layout with fonts + theme + Clerk
  globals.css           Design tokens (Phase 4 lock)
lib/
  audits/               PSI, AEO probes, hygiene, citability
  auth/                 Clerk abstraction (current-user.ts)
  crawl/                Fetch, robots.txt, page discovery
  db/                   Drizzle schema + client
  inference/            Brand & category inference
  scan/                 Scan orchestrator (spawn-detach + Redis pub/sub)
  score/                SEO + AEO scoring formulas
  fix-pack/             Fix Pack generator, persistence, Markdown renderer
  storage/              Vercel Blob abstraction
  ui/                   shadcn components + theme provider
middleware.ts           Clerk route protection
drizzle.config.ts       Drizzle Kit config
drizzle/                Migrations (committed, run on deploy)
.aw_docs/features/geolens/    PRD, spec, ADRs, design (source of truth)
```

## Methodology

Open-book. Read `app/methodology/page.tsx` (or visit `/methodology` on a deploy) for the full scoring formula. Vocabulary aligned with market consensus (Citation Rate, Share of Voice, Position/Sentiment/Accuracy multipliers — see `.aw_docs/features/geolens/competitive-research.md`).

## Privacy

We never persist raw HTML. `scan_pages_crawled.signals` stores computed metrics only. IPs are hashed with a rotating salt; we never store plaintext.

## Roadmap

- ✅ **M1 Foundation** — Next.js scaffold, Drizzle schema, Clerk middleware, design tokens
- ✅ **M2 Scan Engine** — crawler, PSI, 4 LLM probes via Vercel AI Gateway, hygiene, citability, scoring
- ✅ **M3 Streaming UI** — editorial landing, dark streaming report, Clerk sign-in unlock, progress trail
- ✅ **M4 Polish + Launch** — share + OG image, methodology, GDPR privacy, terms, telemetry, rate limit, daily cleanup cron
- ✅ **Fix Pack build** — live repair cards, prompt output, agent Markdown download, generation rate limit, and QA smoke coverage
- ✅ **Latest Phase 7 Review** — Fix Pack blockers repaired and approved by code, TypeScript, security, and database reviewers
- ✅ **Latest Phase 8 QA** — 148 unit tests and 42 local Playwright desktop/mobile smoke tests passing
- ⏳ **Vercel Pro upgrade** — needed to unblock scan execution (60s → 300s function timeout). Until then: landing + waitlist work; scans time out cleanly with a `failed` state.
- ⏳ **v1.5** — autonomous Fix Pack research and workflow automation; current version focuses on scan-grounded implementation assets.

See `.aw_docs/features/geolens/SHIP_STATUS.md` for full status; `tasks.md` for the original M1–M4 breakdown.
