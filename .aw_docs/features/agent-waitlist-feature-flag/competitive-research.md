# Competitive Research: Fixer Agent Behind Waitlist Feature Flag

> Status: Completed in Phase 3.5 of `/feature-pro`.
> Scope: AI SEO/AEO/GEO remediation tools, AI visibility platforms, SEO audit tools with remediation, and Claude Code/Cursor-style agent guidance files.

## Executive Summary
The strongest wedge for GEOlens is a **scan-grounded implementation bridge**: turning an existing SEO/AEO scan into concrete Fix Pack artifacts users can apply in Cursor or Claude Code. Competitors cluster around dashboards, content optimization suites, AI visibility monitoring, CMS integrations, or broad autonomous agents. Few, if any, focus on a lightweight path from a completed scan to a portable coding-agent prompt and downloadable Markdown agent guide.

The recommended v1 positioning is:

> Generate a scan-grounded Fix Pack for your top three SEO/AEO gaps, including copyable assets and a Claude Code/Cursor agent guide you can drop into your project.

## Consensus Result
Phase 3.5 surfaced five viable wedges, so a five-agent stochastic consensus ranked the best product direction.

**Tier:** Strong

**Top choice:** Scan-grounded implementation bridge

**Support:** 5/5 agents, weighted score 100%

| Rank | Option | Agents | Avg Confidence | Weighted Score |
|---|---|---:|---:|---:|
| 1 | Scan-grounded implementation bridge | 5/5 | 4.6/5 | 100% |
| 2 | Builder-first no-integration adoption | 0/5 | n/a | 0% |
| 3 | AEO-specific assets | 0/5 | n/a | 0% |
| 4 | Trust through bounded scope | 0/5 | n/a | 0% |
| 5 | Prompt quality as product surface | 0/5 | n/a | 0% |

High-signal reasoning:
- The biggest product gap is not finding SEO/AEO issues; it is converting findings into implementation-ready work.
- No-integration delivery, bounded top-three scope, AEO-specific assets, and prompt instrumentation should support the wedge rather than replace it.
- The downloadable Markdown agent guide is a strong distribution mechanic because it lets users bring GEOlens intelligence into their own repo without granting GEOlens access.

Minority/novel ideas worth carrying forward:
- Package each gap as a “fix card” with rationale, asset, agent prompt, verification checklist, and manual-review state.
- Treat prompt copies, guide downloads, and asset copies as “manual integration events” that reveal which future CMS/repo integrations deserve investment.
- Frame the product as “diagnostic-to-diff intent”: GEOlens does not edit code, but it creates a high-quality change brief for Cursor/Claude Code.

## Competitor Matrix

| Product | Category | Relevant Capabilities | Public Pricing Signal | Target User | Gap vs GEOlens Fix Pack |
|---|---|---|---|---|---|
| Surfer SEO | SEO/content optimization | AI visibility tracking, content audit/editor, internal linking, WordPress/Google Docs/Contentful/Zapier integrations | $99/$182/$299 monthly annual plans | SEO/content teams | Strong optimization suite, but not scan-specific portable coding-agent guide |
| Frase | AI SEO/GEO content agent | SEO/GEO optimization, AI visibility, site audits, API/MCP, auto internal linking | $49/$129/$299 monthly | Solo creators, teams, agencies | Broad content workflow, less focused on repo-local implementation prompts |
| Semrush | SEO suite + AI visibility | Site Audit, AI Visibility Toolkit, prompt/source gaps, competitor AI mentions | $117.33/$208.33/$416.66 monthly annual plans | SMB to enterprise SEO teams | Enterprise data platform; recommendations more than implementation handoff |
| Ahrefs | SEO suite + Brand Radar | Site Audit, Brand Radar/custom prompts, AI suggestions, Content Kit, Project Boost | $129/$249/$449 monthly; Enterprise from $1,499 | SEO pros/agencies | Deep data; agent-file export is not the core workflow |
| Profound | Enterprise AEO/GEO platform | Answer Engine Insights, prompt volumes, agent analytics, marketing agents, integrations | Enterprise/custom signal | AEO/content/brand teams | Strong enterprise story, heavier than self-serve Fix Pack |
| Scrunch | AI search visibility + AXP | AI visibility audit, citations, site maps, bot traffic, AI experience delivery | Core around $250/mo, enterprise custom | Brands/agencies | Closest on AI readiness; more monitoring/AXP than portable implementation guide |
| Peec AI | AI search analytics | Prompt tracking, visibility analytics, competitor tracking, enterprise API/SSO | $95/$245/$495 monthly | Marketing/SEO teams | Analytics-focused, not fix-pack generation |
| AthenaHQ | AEO/GEO platform | GEO analysis, citation intelligence, crawler/robots/llms.txt management, optimization agents | Self-serve around $295/mo, enterprise custom | SMB to enterprise GEO teams | Strong overlap on `llms.txt`; more platform-led than copyable repo guidance |
| AirOps | AI SEO/AEO workflows | AI search insights, content refresh/creation, SEO/AEO research, CMS/SEO integrations, custom agents | Free insights; paid/custom workflow tiers | Growth/content ops teams | More automation/integration-heavy; GEOlens can win on lightweight scan-to-agent-guide |
| Writesonic | AI search visibility + SEO agent | AI search tracking, SEO/content agent, site audit, automatic AI fixes, data integrations | Paid tiers around $199-$499 monthly/annual signals | Content/SEO teams | More automated suite; broader and heavier than builder-focused Fix Pack |
| Claude Code | Coding agent runtime | `CLAUDE.md`, skills, hooks, MCP, code edits/PRs | Claude subscription or Console account | Developers | Runtime surface for GEOlens output, not a SEO competitor |
| Cursor | Coding agent runtime | `.cursor/rules`, `AGENTS.md`, MCP, skills, hooks, cloud agents | Free/Pro/Teams pricing | Developers/builders | Runtime surface for GEOlens output; no scan intelligence by itself |

## Feature Comparison

| Product | Audit | AEO/GEO | Fix Generation | Prompt Export | Agent/Guide File | Autonomous Edits | Repo/CMS Integration |
|---|---:|---:|---:|---:|---:|---:|---:|
| GEOlens Fix Pack v1 | Yes | Yes | Top 3 gaps | Yes | Yes | No | No |
| Surfer SEO | Yes | Yes | Content fixes | No | No | Limited | Yes |
| Frase | Yes | Yes | Yes | No | No | Partial | Yes |
| Semrush | Yes | Yes | Recommendations | No | No | No | API/reporting |
| Ahrefs | Yes | Yes | Patches/add-ons | No | No | Partial | API/MCP |
| Profound | Partial | Yes | Agents | No | No | Partial | Yes |
| Scrunch | Yes | Yes | Recommendations/AXP | No | No | AXP | Edge/CMS/API |
| Peec AI | Limited | Yes | Recommendations | No | No | No | Enterprise API |
| AthenaHQ | Yes | Yes | Agents | No | No | Partial | Shopify/Webflow/API |
| AirOps | Partial | Yes | Yes | No | No | Workflow automation | CMS/SEO tools |
| Writesonic | Yes | Yes | Yes | No | No | Yes | SEO/CMS/data |
| Claude Code | No | No | If prompted | Native | `CLAUDE.md` | Yes | Repo |
| Cursor | No | No | If prompted | Native | `AGENTS.md` / rules | Yes | Repo |

## Methodology & Vocabulary

Recommended terms:
- **Fix Pack:** concrete, bounded, avoids implying GEOlens edits the site.
- **SEO remediation:** useful for technical/content fixes.
- **AI visibility:** user-friendly umbrella for being discoverable and citable in AI-assisted search.
- **AEO / Answer Engine Optimization:** use as answer-friendly content structure, not guaranteed placement.
- **GEO / Generative Engine Optimization:** acceptable when defined.
- **AI crawler guidance:** covers `robots.txt`, crawler user agents, preview controls, and optional `llms.txt`.
- **Agent guide:** clear name for the downloadable Markdown file.

Use carefully:
- **LLMO:** less standardized; mention only as “sometimes called LLM optimization.”
- **`llms.txt`:** frame as a proposed LLM-friendly guidance file, not a universally honored ranking standard.

Avoid:
- “Rank in ChatGPT”
- “Guaranteed AEO/GEO improvement”
- “Autonomous fixer agent” for v1
- “AI crawlers will obey this”

Recommended product copy:
- Primary CTA: **Generate Fix Pack for top 3 gaps**
- Result heading: **Your Fix Pack is ready**
- Download CTA: **Download agent guide (.md)**
- Prompt CTA: **Copy Cursor/Claude Code prompt**
- Caveat: “These recommendations can improve crawlability, answer-readiness, and AI visibility signals, but AI answer inclusion and citations are controlled by each platform.”

## Downloadable Agent Guide Requirements

Recommended filename: `geolens-fix-pack-agent.md`

The guide should include:
- Role definition: “You are a scan-grounded SEO/AEO optimization agent working from a GEOlens Fix Pack.”
- Scan context: URL, date, brand/category if known, top-three gaps, observed evidence, priority, and confidence.
- Scope boundary: fix only listed gaps unless the user asks for more.
- Repo discovery loop: inspect framework, routes, metadata files, content files, sitemap, robots, structured data, package scripts, and build/test commands.
- Iterative loop: explore -> plan -> implement small changes -> run available verification -> summarize.
- SEO/AEO checklist: metadata, canonical, Open Graph/Twitter, headings, semantic HTML, structured data, crawlability, internal links, page experience, accessibility, citation-friendly answers/FAQs, `llms.txt` where useful.
- Safety constraints: do not invent claims, sources, schema fields, or deployed status; do not remove auth, analytics, payments, tracking consent, env vars, or security headers.
- Output contract: files changed, rationale, verification run, manual review needs, and suggested next scan.

Install guidance:
- Claude Code: add `@docs/geolens-fix-pack-agent.md` to `CLAUDE.md`, or paste into an existing `CLAUDE.md`.
- Cursor: save as `.cursor/rules/geolens-seo-aeo.mdc` or reference from `AGENTS.md`.
- Multi-agent repos: paste into or reference from `AGENTS.md`.

## Wedge Opportunities

1. **Scan-grounded implementation bridge:** make the scan actionable with prompt, assets, and agent guide.
2. **Builder-first no-integration adoption:** users do not need to connect a CMS or repo; they bring the guide into their existing agent workflow.
3. **AEO-specific assets:** first-class support for `llms.txt`, AI crawler guidance, structured data notes, and citation-ready content.
4. **Trust through bounded scope:** top-three gaps, source scan context, and manual-review fallbacks create credible early output.
5. **Prompt quality as product surface:** measure copies/downloads to learn before building autonomous integrations.

## Recommended PRD/Design Adjustments

- Make “scan-grounded implementation bridge” the primary wedge in PRD/design language.
- Add install guidance for Claude Code and Cursor directly in the Fix Pack UI.
- Make included versus excluded gaps visible so users understand top-three scope.
- Represent each gap as a fix card with rationale, asset, prompt fragment, verification checklist, and confidence/manual-review state.
- Track Markdown agent downloads separately from prompt copies.
- Add caveat copy around AEO/GEO probabilism and `llms.txt` standardization.
- Defer auto-research workflows until after the basic guide generation and usage loop is proven.

## Sources

- Surfer SEO pricing: https://surferseo.com/pricing/
- Frase pricing/features: https://www.frase.io/pricing, https://www.frase.io/features/seo-content-optimization
- Semrush pricing / AI SEO: https://www.semrush.com/pricing/, https://www.semrush.com/ai-seo/overview/
- Ahrefs pricing: https://ahrefs.com/pricing
- Profound: https://www.tryprofound.com/, https://www.tryprofound.com/pricing
- Scrunch: https://scrunch.com/, https://scrunch.com/pricing/
- Peec AI pricing: https://peec.ai/pricing
- AthenaHQ plans: https://athenahq.ai/plans
- AirOps pricing: https://www.airops.com/pricing
- Writesonic pricing: https://writesonic.com/pricing
- Cursor rules: https://cursor.com/docs/rules
- Cursor pricing: https://cursor.com/pricing
- Claude Code overview/memory: https://code.claude.com/docs/en/overview, https://docs.anthropic.com/en/docs/claude-code/memory
- Claude Code best practices: https://www.anthropic.com/engineering/claude-code-best-practices
- OpenAI Codex `AGENTS.md`: https://developers.openai.com/codex/guides/agents-md
- AGENTS.md format: https://agents.md/
- `llms.txt` proposal: https://llmstxt.org/
- Google AI features and websites: https://developers.google.com/search/docs/appearance/ai-features
- Google generative AI content guidance: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- OpenAI crawler docs: https://developers.openai.com/api/docs/bots
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a

## Methodology

Two research tracks were run:
- Landscape scan: competitor and adjacent product review across AI SEO remediation, AEO/GEO platforms, and coding-agent runtimes.
- Methodology scan: vocabulary, `llms.txt`, crawler guidance, Claude Code/Cursor guidance-file conventions, and AEO/GEO caveats.

Because multiple viable wedges surfaced, a five-agent consensus ranked them. All five independent lenses selected the scan-grounded implementation bridge as the strongest v1 wedge.
