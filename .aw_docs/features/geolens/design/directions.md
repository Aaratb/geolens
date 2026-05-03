# GEOlens — Design Directions

> Three distinct directions for the landing + streaming report. Pick one (or hybrid) to lock for Phase 5.

## Shared design foundations (apply to all 3)

- **System:** Tailwind CSS + shadcn/ui (Radix primitives, copy-paste components)
- **Typography:** Inter or Geist Sans for UI; JetBrains Mono / Geist Mono for scores and codes
- **Theme:** dark mode default with a flawless light mode counterpart; `next-themes` toggle
- **Motion:** Framer Motion for streaming reveal animations; `prefers-reduced-motion` honored
- **Iconography:** Lucide icons
- **Surfaces:** glassmorphic cards on dark; subtle borders on light
- **Streaming UX:** every section appears with a 200ms fade + skeleton shimmer prior; `useChat` style cursor for streaming text
- **Landing layout:** single column, centered, hero takes 70% of viewport on desktop; report takes over the same column post-scan (in-place transition, not a new page)

---

## Direction A — "Quiet Lab" (recommended)

**Vibe:** Linear / Vercel / Anthropic Console. Dense but elegant. Trust through restraint.

**Palette (dark default):**
- bg `#0A0A0B` (near-black with warm tint)
- surface `#111113`
- border `rgba(255,255,255,0.08)`
- text `#EDEDEF`
- muted `#8C8C92`
- accent `#7C5CFF` (deep iris/violet — the "lens" tint)
- success `#3CCB7F`, warn `#F5A524`, error `#F25555`

**Hero:**
- Centered logo wordmark "GEOlens" with a subtle lens/aperture mark beside it
- One sentence: *"See how AI search engines really see your site."*
- Below: a single, oversized rounded input with placeholder *"Paste a URL — yourbrand.com"* and a soft right-side arrow button
- Below input: 4 small chips listing the 4 engines we probe (ChatGPT, Claude, Perplexity, Gemini) and one chip for "Lighthouse SEO"
- Subtle micro-copy under chips: *"Free to try. Sign in to unlock the full report."*
- Below the fold: comparison row — GEOlens vs Profound, Ahrefs Brand Radar, HubSpot Grader (3-line table with check/-)

**Streaming report:**
- Replaces hero in place; URL becomes a small chip in top-left
- Three score tiles streamed first (SEO / AEO / Citation Rate) — large monospace numerals counting up
- Then the top-3 gap cards stream in below (free)
- Then a blurred preview of detailed sections with a sign-in modal sliding from right

**Strengths:** ages well, looks professional, easy to ship with shadcn defaults
**Weaknesses:** less "wow" on first visit; could read as me-too dev tool

**Inspiration:** Linear, Vercel, Anthropic Console, v0.dev

---

## Direction B — "Beam" (high-energy alternative)

**Vibe:** Perplexity / ChatGPT new tab. Conversational, magnetic, gradient-led.

**Palette:**
- bg radial gradient: `#050810` → `#0E1530` with a soft cyan beam from top-center
- accent gradient `#5BE2FF → #7C5CFF` (cyan-to-violet, used on score rings and CTA)
- accent secondary `#FF6FB5` (used very sparingly on the "Fix this" CTA)

**Hero:**
- Hero is a single floating "chat bubble" composer with a gradient ring
- Wordmark above: GEOlens with the "O" stylized as a lens aperture that subtly rotates on hover
- Placeholder cycles through example URLs every 2.5s: *"yourbrand.com" → "vercel.com" → "anthropic.com"*
- Submit triggers a beam animation — light sweeps from input down through the page as scan starts
- Engine chips are now small animated avatars (logos of OpenAI/Anthropic/Perplexity/Google) with a "thinking" pulse

**Streaming report:**
- Score tiles render as ring/donut charts that fill from 0 to value
- Section headers slide in from the left with subtle gradient underlines
- "Sign in to unlock" overlay is a frosted-glass panel with the same beam motif

**Strengths:** memorable, shareable, matches "agent tech era" brief most directly
**Weaknesses:** harder to make tasteful; risks looking like every other AI startup; gradient fatigue is real in 2026
**Risk flag:** spotted at least 4 competitors in the research with near-identical gradient direction

---

## Direction C — "Editorial Audit" (differentiated alternative)

**Vibe:** Stripe / Pitchbook / Bloomberg terminal. Information-dense, serious, almost print-publication.

**Palette:**
- bg `#FAFAF7` (warm off-white) primary; dark mode `#16161A`
- accent `#1A1A1F` (near-black) for headings — no colored accents in chrome
- score colors only: green `#157F4D`, amber `#B5760F`, red `#A8334A`
- typography: serif for h1/h2 (Fraunces or Source Serif), sans for body, mono for scores

**Hero:**
- Magazine-style: GEOlens in a small wordmark top-left; below a large serif headline *"A second opinion on how AI sees your site."*
- The URL input is a thin, underlined, almost invisible field — closer to a search bar in a journal than a chatbot
- Below the input: tiny line of stats *"Average AEO score in our index: 64/100. 23% of sites have a valid llms.txt."* (real-time-feeling, hardcoded for v1)

**Streaming report:**
- Renders like an editorial audit: section headings, prose summaries above each metric, scores in mono callout boxes in margin
- Each gap is a "finding" with a numbered identifier (`#GL-01`)
- Sharing is encouraged: every report has a citable URL with `<og:image>` showing the score tiles
- Dark mode flips to "research terminal" feel — same layout, very different mood

**Strengths:** strongly differentiated from every competitor in the research; instant credibility for the SEO Pro Pat persona; high virality (shareable on X/LinkedIn)
**Weaknesses:** higher design execution bar; serif typography requires care; less "agentic" first impression for Marketer Mia
**Inspiration:** Stripe Press, The Browser Company "Browse the Web Like It's 1995" launch site, FT, Bloomberg

---

## Decision (locked Phase 4) — Hybrid C+A

**Two surfaces, two moods. Each does what it does best.**

### Surface 1 — Landing & marketing (Direction C, Editorial Audit)
The acquisition surface where first impressions matter most. Editorial framing — serif headline, marginalia column, a numbered "specimen audit" of a real public site — does three things at once: differentiates GEOlens from every gradient-AI competitor in the field, telegraphs editorial credibility, and produces highly shareable report artifacts (citable URLs, OG-ready score tiles).

### Surface 2 — Live report / streaming results (Direction A, Quiet Lab)
The product surface where the user reacts to *their* scan. Dark interactive panels, score tiles, numbered finding cards, blurred locked sections behind sign-in — the exact pattern from Direction A's preview tile. This is what feels "agentic" while data streams in, and what makes the product feel modern and dev-tool-class once unlocked.

### Why this combo works
- The landing's job is **trust-building**; the report's job is **action-driving**. Different jobs deserve different visual languages.
- The shared visual currency across both surfaces is the numbered finding `#GL-NN` — used both as the editorial specimen on the landing and as the literal card format in the live report. That continuity carries the user from "this looks credible" into "this is my actionable scan" without aesthetic whiplash.
- Both surfaces honor the same type system, so the brand reads as one product despite the mode shift.

### Locked design tokens

- **Type:** Fraunces for h1/h2 display; Inter for body and UI; JetBrains Mono for scores, ids, code
- **Landing palette (light editorial):** bg `#FAFAF7`, ink `#16161A`, marginalia `#56565C`, rules `rgba(0,0,0,0.10)`
- **Report palette (dark interactive):** bg `#0A0A0B`, surface `#111113`, border `rgba(255,255,255,0.08)`, text `#EDEDEF`, muted `#8C8C92`, accent `#7C5CFF`
- **Score colors (used on both):** good `#157F4D` / `#3CCB7F`, warn `#B5760F` / `#F5A524`, bad `#A8334A` / `#F25555`
- **No gradients in chrome.** Reserved for charts and visualizations only.
- **Findings format:** numbered `#GL-NN` with severity / effort / score-impact triplet under each dek (consistent across both surfaces).
- **Share artifact:** every report URL emits an `og:image` with editorial headline + three score tiles (auto-generated via `@vercel/og`).
- **Motion:** landing is near-static (no decorative motion); report uses a 200ms fade-in per streamed section. Both honor `prefers-reduced-motion`.

### Transition between surfaces
User flow: editorial landing → submits URL → editorial layout transitions in-place to the dark report surface as streaming begins (background eases from `#FAFAF7` → `#0A0A0B` over ~400ms). No hard route change. The lens metaphor (zoom-in on the spec sheet) reinforces the visual mode shift.

### Execution risks to manage in Phase 6
1. **Two themes, twice the work.** Ship a CSS-variable token system that swaps the entire palette at the surface boundary. Test light/dark of each surface independently.
2. **Serif at mobile.** Self-host Fraunces, tight `font-feature-settings`; marginalia column collapses to a sticky top ribbon below 640px.
3. **Mode-shift accessibility.** A 400ms ease, plus `prefers-reduced-motion` skips the fade and just swaps. `aria-live="polite"` for streamed sections.
4. **Font loading without breaking Core Web Vitals.** Self-host all three families via `next/font`; subset to Latin; ship only the weights actually used.

### Carries forward to Phase 5
- Auto-OG-image route (`@vercel/og`) is a v1 build item, not nice-to-have.
- Editorial-style "Methodology" page is now in v1 scope (transparent methodology is a brand-defining surface for this product).
- Streaming UX must play nicely with the dark report layout: numbered findings stream in one at a time, not a flood of skeletons.
