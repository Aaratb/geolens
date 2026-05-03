# Competitive Research: GEOlens

> Phase 3.5 of `/feature-pro`. Inserted ad-hoc to fill the gap in the orchestrator's default phase list. Source: web research May 2026.

## Why this exists

The AEO/GEO reviewer space is already well-populated. Before locking design and scope, we mapped the landscape, the converged methodology vocabulary, and pricing benchmarks so the PRD positions Search Optimizer against real competitors rather than imagined ones.

## Landscape — Top Tools

### Paid platforms (mid-market → enterprise)

| Tool | Pricing | Audience | Engines covered | Differentiator |
|---|---|---|---|---|
| **Profound** | $99 entry → $499 pro → enterprise | Growth → enterprise | 10+ incl. AI Overviews | Citation Gap Analysis, prompt volumes (200M+ real prompts), volatility smoothing, AI bot server-log integration |
| **AthenaHQ** | $295–$595/mo | Mid-market → enterprise | ChatGPT, Gemini, Claude, Perplexity | Athena Citation Engine (ACE), automated content production pipeline |
| **Peec.ai** | ~€199/mo | Startups, SMBs, growth teams | ChatGPT, Claude, Gemini, Perplexity | Daily tactical snapshots, content ideation, transparent SaaS tiers |
| **Ahrefs Brand Radar** | €358 single-platform / €654 all-platforms | SEO incumbents pivoting | 6 indexes (AI Overviews, AI Mode, ChatGPT, Copilot, Gemini, Perplexity) | 374M+ search-backed prompts (real PAA questions, not synthetic), unlimited domains |
| **Otterly.ai** | from ~€20/mo | Small teams, agencies | ChatGPT, Claude, Gemini | Cheapest entry point, prompt-level real-time audits |
| **Writesonic GEO** | bundled in Writesonic | Content teams | Multi-engine | Tied to Writesonic content pipeline |
| **AirOps** | enterprise pricing | Marketing teams | ChatGPT, Perplexity, Gemini, Claude | Content-update → citation-impact attribution |
| **Eclipse Pulse (Omni Eclipse)** | undisclosed | Marketing leaders | Multi-engine | Sentiment + position modifiers in scoring |

### Free / freemium (the real top-of-funnel competition)

| Tool | Model | What it does |
|---|---|---|
| **HubSpot AEO Grader** | Free one-time, then $50/mo | 5-dimension brand perception across ChatGPT, Perplexity, Gemini |
| **check.aeojs.org (AEO Checker)** | Free + open source | 30+ signals across Discoverability / Content Structure / Citability; backed by `aeo.js` npm lib |
| **FastAEOCheck** | Free | 7 categories, scans up to 10 pages, no signup |
| **aeo-tools.org** | Free | llms.txt + robots + tools.json + FAQ + TTFB checks |
| **Geordy llms.txt Validator** | Free | llms.txt syntax against llmstxt.org spec |
| **llmstxtchecker.net** | Free | llms.txt validation + link checking |
| **AEO Analyzer Pro (aeotool.ai)** | Free trial | AEO-only checker |

## Methodology — converged vocabulary

The market has settled on a shared language. We MUST adopt it in product copy and scoring or we sound like an outsider.

| Term | Definition | Source consensus |
|---|---|---|
| **Citation Rate** | % of relevant queries where the AI cites your brand with a source link | Profound, AirOps, Discovered Labs |
| **Mention Rate** | % where AI mentions your brand without a citation link | Datanerds, AirOps |
| **Share of Voice (SoV)** | Your citations as a % of all brand citations in responses to a query set | Profound (signature metric), Ahrefs, AirOps |
| **Answer Position** | Where in the AI answer your brand appears (1st / 2nd / 3rd...) | Eclipse Pulse, Discovered Labs |
| **Sentiment** | positive / neutral / negative framing of the mention | All majors |
| **Accuracy** | Was the description factually correct? Was attribution to your domain correct? | Eclipse Pulse, Discovered Labs |
| **Volatility / Drift** | 40–60% monthly variance in AI answers — averaging is required | Profound (volatility smoothing is a signature feature) |
| **Search-backed prompts vs synthetic** | Real PAA / keyword-derived prompts vs LLM-invented ones | Ahrefs uses this as primary differentiator |
| **AEO vs GEO** | Used interchangeably; "GEO" (Generative Engine Optimization) is gaining ground in 2026 | Half the market uses each |
| **AI Discoverability / Content Structure / Citability** | Three on-page dimensions check.aeojs.org has popularized | check.aeojs.org, FastAEOCheck mirrors |
| **CITABLE framework** | Naming framework some tools use for content optimization | Discovered Labs |

### Scoring modifiers the market uses

Eclipse Pulse and Discovered Labs both apply weighted multipliers:
- **Position multiplier:** primary citation 1.0x, secondary 0.7x, tertiary 0.4x
- **Sentiment multiplier:** positive 1.2x, neutral 0.8–1.0x, negative ≤0.5x
- **Accuracy multiplier:** fully accurate 1.0x, partial 0.7x, misattributed 0.3x

We should adopt these for the AEO sub-score because they are the closest thing to a market standard.

## Pricing benchmarks

| Tier | Price band | Player examples |
|---|---|---|
| Free one-shot | $0 | HubSpot Grader, check.aeojs.org, FastAEOCheck, aeo-tools.org |
| Cheap entry | $20–$50/mo | Otterly, HubSpot AEO ongoing |
| SMB / startup | $99–$199/mo | Peec, Profound starter |
| Pro / growth | $295–$499/mo | AthenaHQ entry, Profound pro |
| Enterprise | $499–$700+/mo | AthenaHQ enterprise, Ahrefs all-platforms, Profound enterprise |

## Wedge opportunities for GEOlens

After mapping the field, here is where the white space actually is:

1. **Combined SEO + AEO in one report.** Almost every paid AEO tool ignores classical SEO. Almost every classical SEO tool either ignores AEO or bolts on a thin module. Search Optimizer leads with both as equal peers — that is genuinely novel framing.
2. **Chatbot-style "AEO ChatGPT" entry point.** Every incumbent looks like a B2B dashboard. None look like ChatGPT / Claude / v0. Our hero design is a hook competitors literally cannot copy without a brand reset.
3. **Streaming results.** Nobody streams. They make you wait, schedule, or come back later. Streaming is the most powerful reinforcement of the "agentic" brand and is technically simple with Vercel AI SDK.
4. **Soft CTA toward an actual fixer agent.** Every tool tells you what is wrong. None ship the fix. The waitlist on every gap is our Trojan horse for the eventual agent product — and it is differentiated positioning even before the agent ships.
5. **Free anonymous executive summary, sign-in only for drill-down.** HubSpot's grader is free but requires a long form before showing results. check.aeojs.org and FastAEOCheck show the report fully but capture no email. Our gating is the optimal middle: high top-of-funnel + qualified lead capture.
6. **Gap-first framing.** Most tools lead with scores; we lead with the 3 gaps the user can act on. Marketer Mia gets a verdict, SEO Pro Pat scrolls down for the data.
7. **Auto multi-page crawl from a single URL submit.** Most free tools do single-URL only; FastAEOCheck up to 10 pages. We will do up to 5 internal pages by default — best of both worlds for speed vs depth.

## What we explicitly do NOT compete on (in v1)

- Real prompt volumes / 200M+ prompt database — that is Profound and Ahrefs' moat, and we cannot replicate it. We use 3 well-chosen probes per engine instead.
- Continuous monitoring / weekly cadence — that is the entire paid-tier value prop. We are a one-shot reviewer.
- Server-log AI bot tracking — requires customer integration; not a v1 feature.
- Citation Gap Analysis / competitor SoV — requires a competitor list; we cut competitor comparison from v1.
- Volatility smoothing across 30/60/90 days — requires repeated scans; we are a snapshot tool.

## PRD adjustments triggered by this research

These changes flow into the PRD now (see `prd.md` v2):

1. **Adopt market vocabulary in scoring** (PRD §6):
   - "Engine Visibility (60%)" → break into **Citation Rate**, **Mention Rate**, and **Share of Voice in category** (using AI's own list of competitors as the SoV denominator — no user-supplied competitor list needed)
   - Apply **Position**, **Sentiment**, **Accuracy** multipliers per probe per market convention
   - Rename "On-Page AEO Hygiene" → **AEO Hygiene** (matches market language)
   - Rename "Content Extractability" → **Citability** (matches check.aeojs.org's vocabulary)

2. **Acknowledge GEO as alternate term** in product copy. Hero subtitle: "SEO + AEO (Answer Engine Optimization, also called GEO) review."

3. **Sharpen positioning copy**: "The free, full-stack SEO + AEO reviewer that doesn't just measure — it points you to the fix."

4. **Hero comparison row** below the fold: small table of 3–4 incumbents framing Search Optimizer as the one that combines both surfaces and hands you the gaps, not the dashboard.

5. **Cost ceiling reality check**: at $0.20/scan ceiling, 4 engines × 3 probes × ~500 output tokens fits comfortably (Sonnet/GPT-4.1-mini class). Confirmed feasible.

6. **No live AI Overviews probe in v1**. Profound and Ahrefs charge for it via SerpAPI-class data. Out of v1 scope; explicitly defer to post-launch.

## Naming decision (resolved Phase 3.5)

Renamed from working name "Search Optimizer" to **GEOlens** before Phase 4. Rationale: leans into the rising GEO terminology that 2026 commentary increasingly favors over AEO, the lens metaphor pairs with the chatbot-style magnification UX, and the name is short, brandable, and not yet over-claimed in the space.
