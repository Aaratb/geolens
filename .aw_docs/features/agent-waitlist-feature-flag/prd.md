# PRD: Fixer Agent Behind Waitlist Feature Flag

> Status: Locked in Phase 3 of `/feature-pro`. Built from `requirements.md`; technical mechanisms are intentionally deferred to Phase 5.

## 1. Summary
GEOlens already diagnoses SEO and AEO gaps and captures demand through “Fix with our agent” waitlist CTAs. This feature turns that demand into a controlled early-access experience: selected waitlisted users can generate a scan-specific **Fix Pack** for the top three gaps in a completed report.

The v1 Fix Pack is not an autonomous website editor. It produces copyable assets, a Cursor/Claude Code optimized prompt, and a downloadable Markdown agent file users can add to Claude Code or Cursor as project guidance. This lets GEOlens validate agent usage, prompt quality, and fix intent before taking on higher-risk CMS integrations, repository access, automated pull requests, or autonomous research loops.

**Competitive wedge:** GEOlens is the scan-grounded implementation bridge from diagnosis to action. The core product promise is not “another AI SEO dashboard” or a generic prompt pack; it is a repair brief generated from the user’s actual scan, scoped to the top three gaps, and packaged for immediate use in a coding-agent workflow.

## 2. Goals & Non-Goals

**Goals**
- Convert selected waitlist demand into real fixer-agent usage.
- Generate actionable fix assets for the scan’s top three gaps.
- Provide a high-quality copy-paste prompt optimized for Cursor and Claude Code.
- Provide a downloadable Markdown agent file for iterative SEO/AEO optimization inside Claude Code or Cursor.
- Package each top-three gap as an implementation-ready fix card with rationale, assets, prompt guidance, confidence/manual-review state, and verification checklist.
- Preserve the current waitlist experience for users who are not eligible.
- Keep rollout reversible through a feature flag and server-side eligibility.
- Instrument the full usage funnel from entry-point exposure through prompt copy.

**Non-Goals**
- Direct CMS edits.
- Direct repository access.
- Pull request creation.
- Fully autonomous website changes.
- Paid-plan entitlement logic.
- Full-scan remediation beyond the top three gaps.
- Scheduled monitoring or repeated auto-fix runs.
- Auto-research capability, including autonomous external research loops or Andrew Karpathy-style research workflows.

## 3. Personas

- **Technical Founder / Marketer-Builder:** can paste a prompt into Cursor or Claude Code, add a Markdown agent file to the project, and apply generated website changes.
- **SEO/AEO Operator:** wants concrete assets and implementation instructions to hand off to a developer.
- **Internal/Admin Tester:** validates output quality and rollout safety before broader access.

## 4. North-Star & Supporting Metrics

- **North star for this feature:** Fix Pack generations by eligible users.
- **Supporting metrics:** eligible entry-point impressions, generation starts, generation successes, prompt copies, Markdown agent downloads, individual asset copies, generation failures, disabled-state impressions, waitlist joins from ineligible users.

Waitlist conversion remains useful, but it is secondary for this phase. The product question is whether selected users can use and trust generated agent outputs.

The Markdown agent guide download is a distinct product behavior from prompt copy and should be tracked separately. It signals that the user wants persistent project guidance, not just one-off output.

## 5. User Stories & Acceptance Criteria

**US-1 / Ineligible user joins or remains on the waitlist**
- Given a user is not eligible for the fixer feature, when they click a fixer CTA from a gap card or scan surface, then they see the existing waitlist experience.
- Given the feature flag is disabled, when any user clicks a fixer CTA, then no Fix Pack content or generation action is exposed.
- Given an ineligible user joins the waitlist, when the signup succeeds, then the existing scan/gap attribution is preserved where available.

**US-2 / Eligible user discovers the Fix Pack**
- Given a selected eligible user opens a completed scan, when top-three gaps are available, then they can see an affordance to generate a Fix Pack.
- Given top-three gaps are still loading or the scan has failed, when the user views the scan, then the fixer action is unavailable or explained without producing broken UI.
- Given a completed scan has fewer than three actionable gaps, when the user opens the fixer experience, then it generates from the available actionable gaps and explains the reduced scope.

**US-3 / Generate a Fix Pack for top-three gaps**
- Given an eligible user starts generation for a completed scan, when generation succeeds, then the Fix Pack includes a summary of the selected gaps, fix assets, a Cursor/Claude Code prompt, and a downloadable Markdown agent file.
- Given a top-three gap does not map cleanly to v1 fix categories, when the Fix Pack is generated, then that gap is represented with manual-review guidance instead of hallucinated implementation steps.
- Given generation fails, when the user views the result, then they see a recoverable error state and the failure is tracked.

**US-4 / Copy and use generated output**
- Given a Fix Pack exists on screen, when the user clicks copy on the coding-agent prompt, then the prompt is copied and a prompt-copy event is recorded.
- Given a Fix Pack includes a Markdown agent file, when the user downloads it, then the file download succeeds and a Markdown-agent-download event is recorded.
- Given the Fix Pack contains individual assets, when the user copies an asset, then that asset is copied and an asset-copy event is recorded.
- Given the output is intended for Cursor/Claude Code, then the prompt should include enough context for a coding agent to identify the target site files, apply changes, and verify them without implying GEOlens has direct repo access.

**US-5 / Rollout can be controlled safely**
- Given the team needs to pause the feature, when the feature flag is disabled, then eligible users fall back to the waitlist or disabled-state path.
- Given selected-user access is required, then eligibility must be enforced server-side in addition to any client-side affordance.
- Given a user is not signed in, then they cannot access generated Fix Pack content through direct navigation alone.

## 6. Fix Pack Output Requirements

Each Fix Pack should include:
- **Top-three gap summary:** gap title, why it matters, expected impact, and implementation priority.
- **Three fix cards:** one per selected gap, each containing rationale, recommended fix assets, coding-agent instructions, confidence or manual-review state, and verification checklist.
- **Copy-paste coding-agent prompt:** optimized for Cursor and Claude Code, with clear role, context, target outcome, constraints, files-to-look-for guidance, verification steps, and “do not” instructions.
- **Downloadable Markdown agent file:** a portable `.md` file users can place into Claude Code or Cursor project guidance. It should encode GEOlens SEO/AEO best practices, the scan’s top-three gaps, an iterative optimization loop, verification checklist, and guardrails against unsafe or ungrounded edits.
- **Metadata assets where relevant:** title, meta description, canonical, Open Graph, and social preview recommendations.
- **`llms.txt` / AI crawler guidance where relevant:** suggested content or instructions for adding/updating AI-readable guidance.
- **Content brief where relevant:** AEO-focused rewrite brief, headings, FAQ opportunities, citation-friendly structure, and source-of-truth notes.
- **Technical SEO guidance where relevant:** implementation instructions for performance, accessibility, semantic HTML, crawlability, headings, sitemap, robots, or structured markup issues.
- **Manual-review fallback:** concise explanation when a gap should not be auto-prescribed from available scan data.

## 7. Markdown Agent Requirements

The downloadable Markdown agent is the basic version of the future fixer agent. It should be useful when inserted into Claude Code or Cursor as an instruction file, without requiring GEOlens to connect to the user’s repo.

The file should include:
- Role definition: “You are an SEO/AEO optimization agent working from a GEOlens scan.”
- Scan context: target URL, brand/category when available, top-three gaps, relevant scores, and fix priorities.
- Best-practice operating loop: inspect repo/page structure, locate metadata/content/robots/llms/structured-data files, propose changes, implement small slices, verify with local tests or build commands, then summarize.
- SEO/AEO checklist: metadata, canonical, Open Graph, `llms.txt`, structured data, headings, semantic HTML, robots/crawler policy, performance/accessibility guardrails, and citation-friendly content structure.
- Safety constraints: do not invent private facts, do not remove analytics/auth/payment code, do not expose secrets, do not make broad rewrites without user approval, and do not claim changes are deployed unless verified.
- Output contract: files changed, rationale, verification performed, follow-up recommendations.

The initial version should not include autonomous web research. Research-assisted iteration is a future enhancement after the basic file generation, download, and usage loop is proven.

Recommended download/install UX:
- Filename: `geolens-fix-pack-agent.md`.
- Claude Code guidance: add `@docs/geolens-fix-pack-agent.md` to an existing `CLAUDE.md`, or paste the content into `CLAUDE.md` if the project has no import pattern.
- Cursor guidance: save as `.cursor/rules/geolens-seo-aeo.mdc`, or reference from `AGENTS.md` when the project uses agent guidance files.
- Product must warn users not to overwrite existing project guidance blindly.

## 8. Generation Principles

- Hybrid generation: deterministic shell, AI-assisted tailoring.
- Ground output in stored scan data and top-three findings.
- Prefer actionable specificity over generic SEO advice.
- Do not claim that GEOlens edited the site, opened a PR, or connected to a repository.
- Do not fabricate site internals that were not observed in the scan.
- Make the prompt safe to paste into a coding agent without granting credentials or secrets.
- Keep top-three scope as the cost, latency, and quality boundary.
- Use language like “improve readiness,” “improve crawlability,” and “make content more citation-friendly”; do not promise rankings, AI answer inclusion, or citations.

## 9. Entry Point Priority

Recommended product order:
1. **Separate fixer page** as the canonical gated experience.
2. **Three fix cards** anchor the page, one for each selected gap, so the user immediately sees what the Fix Pack covers.
3. **Agent guide install panel** explains how to use the Markdown file in Claude Code, Cursor rules, or `AGENTS.md`.
4. **Gap-card CTA** links eligible users into the fixer page with scan context; ineligible users keep the waitlist modal.
5. **Scan summary CTA** offers “Generate Fix Pack for top 3 gaps” after completion.
6. **Email follow-up** remains a later activation channel.

This ordering keeps the first implementation easier to test while still allowing the existing report surfaces to drive discovery.

## 10. Scope

### In Scope
- Selected waitlisted-user access behind a reversible feature flag.
- Completed-scan Fix Pack generation.
- Top-three gap scope.
- Cursor/Claude Code optimized copy-paste prompt.
- Downloadable Markdown agent file for Claude Code or Cursor.
- Metadata, `llms.txt`, technical SEO, and content brief outputs.
- Waitlist fallback for ineligible users.
- Usage instrumentation for exposure, generation, copy, failure, and disabled states.

### Out of Scope
- CMS integrations.
- Repo connections.
- PR generation.
- Paid tiers and billing.
- All-gap remediation.
- Background regeneration.
- Admin UI for managing the allowlist.
- Auto-research workflows.

## 11. Non-Functional Requirements

- **Security:** eligibility and generated content access must be enforced server-side.
- **Privacy:** Fix Pack generation must not require collecting repository credentials, CMS tokens, or private source files.
- **Reliability:** generation failure must not break the scan report or waitlist experience.
- **Cost control:** generation is limited to top-three gaps and should be designed with a bounded per-generation AI cost.
- **Accessibility:** copy actions, disabled states, loading states, and error states must be keyboard-accessible and screen-reader legible.
- **Observability:** every major funnel step must be tracked with scan and eligibility context where safe.

## 12. Test Scenarios

| ID | Acceptance Area | Given | When | Then |
|---|---|---|---|---|
| TS-1 | Waitlist fallback | User is ineligible | User clicks “Fix with our agent” | Existing waitlist flow appears and records attribution |
| TS-2 | Feature disabled | Feature flag is off | Eligible user opens a scan | Fix Pack generation is unavailable and no generated content is exposed |
| TS-3 | Eligible discovery | Eligible signed-in user opens completed scan | Top-three gaps exist | User can reach the Fix Pack experience |
| TS-4 | Successful generation | Eligible user starts generation | Generation succeeds | Fix Pack shows gap summary, assets, Cursor/Claude Code prompt, and Markdown agent download |
| TS-5 | Gap fallback | One top-three gap cannot be mapped to v1 categories | Fix Pack is generated | That gap shows manual-review guidance |
| TS-6 | Prompt copy | Fix Pack is visible | User clicks copy prompt | Clipboard copy succeeds and event is tracked |
| TS-7 | Markdown agent download | Fix Pack is visible | User downloads the Markdown agent file | File downloads and event is tracked |
| TS-8 | Asset copy | Fix Pack contains metadata or `llms.txt` asset | User copies the asset | Clipboard copy succeeds and event is tracked |
| TS-9 | Direct access protection | Ineligible or anonymous user navigates directly to fixer URL | Page/API loads | Access is denied or redirected without leaking Fix Pack content |
| TS-10 | Generation failure | AI generation or supporting service fails | User starts generation | Recoverable error appears and failure event is tracked |

## 13. Risks & Mitigations

- **Risk: generated prompts are too generic.** Mitigation: require output to reference observed scan gaps and include implementation verification steps.
- **Risk: users assume GEOlens can edit their site.** Mitigation: copy and UI must frame v1 as a copy-paste Fix Pack, not autonomous execution.
- **Risk: client-side gating leaks access.** Mitigation: Phase 5 must define server-side eligibility checks for page and API access.
- **Risk: cost or latency grows.** Mitigation: top-three scope only; no full-site remediation.
- **Risk: unmappable gaps create hallucinated fixes.** Mitigation: manual-review fallback is a first-class output state.

## 14. Open Decisions for Later Phases

- Phase 4: final UI shape for the separate fixer page and scan/report entry points.
- Phase 5: exact feature flag and selected-user eligibility mechanism.
- Phase 5: persisted Fix Pack records versus on-demand generation.
- Phase 5: exact API contract and event names.
- Phase 5: Markdown agent filename, storage/delivery approach, and whether it is generated as static text or persisted with the Fix Pack.
- Phase 6: whether the first implementation uses deterministic templates with optional AI generation or full hybrid generation from the start.
