# Requirements: GEOlens (SEO + AEO/GEO Reviewer)

> Status: Locked in Phase 2 of `/feature-pro`. Source of truth for PRD and downstream artifacts.

## Vision
A chatbot-styled landing page where any user pastes a website URL and gets a streaming, deep-dive review covering classical SEO (Lighthouse-grade) and AEO (how the site performs across major LLM search engines + AEO-specific on-page checks). Each gap is paired with a soft CTA toward a future autonomous fixer agent (out of scope for v1).

## Users
- **P1 — Marketer / Founder:** non-technical, wants verdict + plain-English fixes
- **P2 — SEO/AEO Pro:** wants raw scores, technical detail, exportable data
- **UX answer:** layered report — executive summary on top, drill-downs below

## Core Flow
1. Land on chatbot-style page (single URL input, hero-centric)
2. Submit URL → anonymous scan kicks off immediately
3. Executive summary streams in (top-3 gaps + overall scores) — visible without sign-in
4. Detailed drill-downs are visible but blurred behind a "Sign in to unlock" overlay
5. After sign-in, full report streams in: full SEO breakdown → per-engine AEO probes → on-page AEO checklist → consolidated gap list
6. Every gap card surfaces a soft CTA: "Fix this with our agent (join waitlist)"

## Audit Surface
- **SEO** — Google PageSpeed Insights API (hosted Lighthouse): Performance, Accessibility, Best Practices, SEO category scores + audit failures + opportunities
- **AEO live engine probes** — query each of OpenAI (ChatGPT), Anthropic (Claude), Perplexity, Gemini for the user's brand/domain; parse for visibility, citation presence, sentiment, position, accuracy
- **AEO on-page checks** — `llms.txt` / `llms-full.txt`, JSON-LD structured data, semantic HTML, content extractability, robots.txt directives for AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, anthropic-ai), Open Graph, canonical/meta hygiene, content chunking
- **Multi-page crawl** — submitted URL + up to 5 internal pages discovered from homepage nav/sitemap (depth 1)

## Auth & Gating
- Anonymous can submit a URL and start a scan
- Anonymous sees executive summary (overall scores + top-3 gaps)
- Sign-in required to unlock detailed drill-downs, scan history, share, PDF export
- Rate limit: 1–2 free anonymous scans per IP per 24h, then sign-in is forced earlier
- Sign-in: email OTP or OAuth (provider TBD Phase 5; recommendation: Clerk)

## Deliverables Per Scan
- Interactive in-app report (free executive summary; full report sign-in gated)
- Persistent scan history per signed-in user
- Shareable public URL (read-only) with "Run your own scan" CTA
- PDF export — paid, post sign-in
- Soft CTA + waitlist signup attached to every identified gap

## Cut from v1
- Competitor comparison (the incumbents charge for it; we revisit once free tier is validated)
- The actual fixer agent (suggestion only)

## Non-Goals
- Continuous monitoring / scheduled rescans (post-v1)
- White-label / agency multi-tenant (post-v1)
- Browser extension, public API (post-v1)

## North-Star Metric
**Scans completed per week.** Sign-in conversion is supporting metric.

## Stack (locked in Phase 1)
- Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- Vercel AI SDK for streaming UI
- Google PageSpeed Insights API for SEO
- Direct LLM provider APIs for AEO probes
- Zod for validation
- Deploy: TBD Phase 5 (likely Vercel)

## Success Criteria (v1)
- Scan starts within 2s of URL submit; streaming begins
- Full report streams to completion within 90s p95
- ≥99% of valid public URLs produce a non-error report
- Per-scan LLM cost ≤ $0.20 (constrains engine probe design)
- Sign-in conversion ≥ 25% of anonymous scan-starters

## Edge Cases / Risks
- URLs that block crawlers (Cloudflare, paywall, login wall) → graceful fallback report
- URLs that 404 / are not real → input validation + friendly error
- Very large sites → cap crawl depth & page count
- LLM API outages → degrade gracefully; mark engine "unavailable", do not fail the whole scan
- Cost runaway from abuse → IP rate limit + per-day global budget circuit breaker
- PII / private URLs → ToS + robots.txt respect

## Open Items Carried Forward
- Auth provider final pick (Phase 5)
- Database choice — Vercel Postgres (Neon) vs Supabase (Phase 5)
- LLM provider keys procurement (Phase 5)
- PDF pricing model (pre-launch decision; not blocking v1 build)
