# PRD: GEOlens (SEO + AEO/GEO Reviewer) — v1

> Status: Locked through Phase 3.5 of `/feature-pro`. Reflects competitive research findings (see `competitive-research.md`).

## 1. Summary
A chatbot-styled web app where a visitor pastes any public URL and receives a streaming, deep-dive review of the site's classical SEO (Lighthouse-grade) and AEO (Answer Engine Optimization, a.k.a. GEO) posture across major AI search engines and on-page AEO best practices. Every identified gap is paired with a soft "fix this with our agent" CTA that captures interest for a future fixer agent (out of v1 scope).

**Brand:** GEOlens — "Generative Engine Optimization, brought into focus." The name leans into the rising GEO terminology and pairs the magnifying-lens metaphor with the chatbot-style hero.

**Wedge:** the only free, full-stack SEO + AEO reviewer with a chatbot UX, streaming results, and a gap-first report. Incumbents (Profound, AthenaHQ, Peec, Ahrefs Brand Radar) are dashboards starting at $99–$700/mo and ignore classical SEO. Free tools (HubSpot Grader, check.aeojs.org, FastAEOCheck) cover only AEO or only on-page checks — none combine PSI-grade SEO + live multi-engine AEO probes + on-page AEO hygiene in a single streaming report.

## 2. Goals & Non-Goals

**Goals**
- Make AEO readiness as legible as Lighthouse made SEO readiness
- Build a top-of-funnel acquisition surface for the future fixer agent
- Establish a credible technical brand by *measuring* what others only talk about
- Capture qualified leads via a sign-in wall on the detailed report (executive summary stays free)

**Non-Goals (v1)**
- The fixer agent itself
- Continuous monitoring / scheduled rescans (incumbent moat)
- Competitor comparison with user-supplied competitor lists
- Live Google AI Overviews probe (requires paid SerpAPI-class data)
- White-label, agency multi-tenant
- Browser extension, public API
- 200M+ prompt database (Profound / Ahrefs moat — we use 3 well-chosen probes per engine instead)

## 3. Personas
- **Marketer Mia** — non-technical founder/marketer; wants a clear verdict and plain-English next steps
- **SEO Pro Pat** — technical specialist; wants raw scores, audit IDs, exportable data

UX answer: **layered report** — exec summary surfaced on top, technical drill-downs below.

## 4. North-Star & Supporting Metrics
- **North star:** scans completed per week
- **Supporting:** sign-in conversion rate, waitlist sign-ups per scan, time-to-first-result, p95 scan duration, scans per IP (abuse signal), per-scan LLM cost

## 5. User Stories & Acceptance Criteria

**US-1 / Submit a URL**
- Given an empty landing page, when the user pastes a URL and presses enter, the scan starts within 2s and the user sees streaming progress
- Invalid URLs (malformed, non-HTTP/HTTPS, local) show a friendly inline error and do not consume quota

**US-2 / View the free executive summary (anonymous)**
- After scan starts, the user sees streaming output: overall SEO score, overall AEO score, top-3 gaps — without signing in
- Below the fold, locked sections are visible but blurred with a "Sign in to unlock" overlay

**US-3 / Unlock the full report (signed in)**
- After sign-in, all sections render: full SEO category breakdown, per-engine AEO probe results, AEO hygiene checklist, citability detail, all gap drill-downs, share URL, PDF export entry point
- Recent and prior scans are visible in `/dashboard`

**US-4 / Share a report**
- A signed-in user can generate a public shareable URL; viewers see a read-only version with a "Run your own scan" CTA, no sign-in required to view

**US-5 / Export PDF (paid)**
- A signed-in user can purchase a PDF export of any of their scans (one-time fee or subscription — pricing decision pre-launch, not blocking v1 build)

**US-6 / Soft CTA on every gap**
- Every gap card surfaces "Fix with our agent (join waitlist)"
- Clicking adds the user (or their captured email) to the fixer-agent waitlist with the gap's `gap_id` for future targeting

**US-7 / Rate-limited anonymous scans**
- Anonymous users get up to 2 scans per IP per 24h, then any further scan attempt forces sign-in before the scan begins
- Signed-in users get a higher quota (default 10/day, tunable)

## 6. Scoring Methodology

> Vocabulary aligned with market consensus (see `competitive-research.md`).

### 6.1 Overall SEO Score (0–100)
Weighted average of Google PageSpeed Insights category scores:
- **Performance 25%, Accessibility 25%, Best Practices 20%, SEO 30%**

### 6.2 Overall AEO Score (0–100)
Weighted average of three sub-scores:

| Sub-score | Weight | What it measures |
|---|---|---|
| **Engine Visibility** | 60% | Citation Rate + Mention Rate + Category Share of Voice across the 4 probe engines |
| **AEO Hygiene** | 25% | On-page checklist (llms.txt, structured data, robots.txt for AI crawlers, semantic HTML, OG, canonical) |
| **Citability** | 15% | Quantitative content extractability (clean-text ratio, paragraph length, structured lists, FAQ patterns) |

### 6.3 Engine Visibility — full formula

For each engine `e` ∈ {ChatGPT, Claude, Perplexity, Gemini} and each probe `p` ∈ {brand_recall, category_placement, citation_behavior}:

```
probe_score(e, p) = base_score
                  × position_multiplier
                  × sentiment_multiplier
                  × accuracy_multiplier
```

Multipliers (market-standard, sourced from Eclipse Pulse + Discovered Labs):
- **Position:** primary 1.0x, secondary 0.7x, tertiary 0.4x, not mentioned 0.0x
- **Sentiment:** positive 1.2x, neutral 1.0x, negative 0.5x
- **Accuracy:** fully accurate + correctly attributed 1.0x, partial 0.7x, misattributed 0.3x

Base score:
- **Brand recall** probe: 100 if brand named, else 0
- **Category placement** probe: 100 if listed primary, scaled by position
- **Citation behavior** probe: 100 if URL cited as a source, 50 if domain mentioned without link, 0 otherwise

`Engine Visibility = average(probe_score across all engines × probes)`. Includes a derived **Category Share of Voice** stat: brand mentions / total brand mentions across the same category-placement responses.

### 6.4 Top-3 Gaps
Highest-impact failed/low-scoring items ranked by `(weight × severity × user-fixability)`. Each gap has: title, plain-English why, technical drill-down, suggested fix, waitlist CTA.

## 7. AEO Engine Probes (v1)

**Engines:** ChatGPT (OpenAI), Claude (Anthropic), Perplexity, Gemini.

**Probe set per engine** (3 prompts per scan, cost-bounded):
1. **Brand recall:** "What is `<inferred brand>` and what do they do?"
2. **Category placement:** "Best `<inferred category>` tools/services" (does the brand appear, in what position?)
3. **Citation behavior:** "Tell me about `<URL hostname>`" (is the URL cited as a source?)

**Brand & category inference:** parse `<title>`, meta description, h1, JSON-LD `Organization`/`WebSite`, Open Graph; if ambiguous, run one cheap LLM call to summarize. Cache per domain for 24h.

**Per probe we capture:** model, prompt, response, brand mention y/n, citation y/n, sentiment, position, accuracy, latency, cost.

**Cost guardrails:** 4 engines × 3 prompts × ~500 output tokens ≈ ~$0.05–$0.15/scan with mid-tier models. Hard ceiling: **$0.20/scan**. Daily global circuit breaker on total spend.

**Engine selection note:** explicitly NOT probing Google AI Overviews live in v1 (requires SerpAPI-class paid data). Defer to post-launch.

## 8. AEO Hygiene Checklist (Static)

Each item: pass / fail / warn + remediation hint.
- `llms.txt` and `llms-full.txt` presence and validity (per llmstxt.org spec)
- `robots.txt` rules for `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`, `anthropic-ai`, `Bingbot`
- JSON-LD: count, types present (Organization, WebSite, Product, Article, FAQPage, BreadcrumbList, etc.), Schema.org validation
- Open Graph + Twitter Card completeness
- `<title>`, meta description, canonical, hreflang
- Heading hierarchy (h1 uniqueness, h2/h3 structure, depth)
- Semantic HTML usage ratio (`<article>`, `<section>`, `<nav>`, `<main>`)
- HTTPS, HTTP/2 or 3, response headers (`X-Robots-Tag`, `Content-Type`)
- Sitemap presence and validity

## 9. Citability Checks (Quantitative)

- **Clean-text ratio:** main content / boilerplate (Readability-style algorithm)
- **Paragraph length distribution:** ideal 40–80 words for AI extraction
- **Sentence length distribution:** ideal 12–25 words
- **Structured-list presence:** `<ul>`, `<ol>`, table density
- **FAQ / Q&A pattern detection:** in HTML and JSON-LD
- **Statistical / data point density** (numbers + units in body text)
- **Internal link graph signals** for pages in scope

## 10. Crawl Behavior
- v1 crawl scope: submitted URL **+ up to 5 internal pages** discovered via homepage nav/sitemap (depth 1)
- Respects `robots.txt`
- Total crawl wall-time capped at 30s; per-page fetch capped at 10s; total scan capped at 120s
- User agent: `GEOlensBot/1.0 (+https://<our-domain>/bot)`

## 11. Screen Inventory
1. **Landing** — chatbot-style URL input, value props below the fold, light/dark, mobile-first, comparison row vs incumbents
2. **Scanning / Streaming Results** — single-column report skeleton fills in section-by-section as data arrives
3. **Sign-in Wall** — modal overlay on streaming view once exec summary is rendered
4. **Full Report** — exec summary, SEO breakdown, AEO engine probes, AEO hygiene checklist, citability detail, gap list with CTAs, share + export controls
5. **Dashboard** (signed-in) — list of past scans, search, open any
6. **Public Share View** — read-only report with "run your own scan" CTA
7. **Waitlist confirmation** — minimal modal/toast after CTA click
8. **Auth screens** — sign-in / sign-up (provider TBD Phase 5; recommendation Clerk)
9. **404 / error / rate-limit** — friendly states

## 12. Telemetry (v1)
- `scan_started` (anonymous_id, url_hash, has_account)
- `scan_section_rendered` (section, latency_ms)
- `scan_completed` (duration_ms, total_cost_cents, score_seo, score_aeo, citation_rate, sov_pct)
- `scan_error` (stage, error_code)
- `signin_wall_shown`, `signin_completed` (provider)
- `gap_cta_clicked` (gap_id), `waitlist_joined`
- `share_link_created`, `share_link_opened`
- `pdf_export_started`, `pdf_export_completed`

## 13. Privacy, Legal, Compliance
- Terms of service + acceptable-use policy required pre-launch
- Honor `robots.txt`; never store full page HTML beyond scan duration; persist only computed signals + raw LLM responses
- Public share URLs use unguessable IDs (UUIDv4)
- No scanning of private/auth-walled URLs without owner consent
- Phase 7 will run `legal-reviewer` over the final implementation

## 14. Out-of-Scope Reminders
- Fixer agent (CTA only)
- Competitor comparison
- Continuous monitoring
- Multi-tenant / agency
- Public API
- Live AI Overviews probe
- 200M+ search-backed prompt database

## 15. Open Decisions (resolve before Phase 5 Plan)
- **Auth provider:** Clerk vs NextAuth (email OTP + Google OAuth) — recommendation: Clerk for speed
- **DB:** Vercel Postgres (Neon) vs Supabase — recommendation: Neon to stay all-Vercel
- **Object storage** for PDFs / share snapshots: Vercel Blob (recommendation: lock)
- **PageSpeed Insights API key** procurement (free tier sufficient for v1)
- **LLM provider keys:** OpenAI, Anthropic, Google, Perplexity — accounts pre-Phase 6
- **PDF pricing:** confirm or defer past v1 launch
  - **Brand name:** locked as **GEOlens** (Phase 3.5). Domain availability check + trademark search before launch.
