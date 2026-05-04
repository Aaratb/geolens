# Requirements: Fixer Agent Behind Waitlist Feature Flag

> Status: Locked in Phase 2 of `/feature-pro`. Source of truth for PRD and downstream artifacts.

## Vision
Turn GEOlens from a diagnostic report into the first step of a fix workflow. The v1 fixer-agent experience should not autonomously edit customer websites yet. It should generate high-quality, scan-specific fix assets, a copy-paste prompt, and a portable Markdown agent file that a selected user can run in Cursor, Claude Code, or a similar coding-agent environment.

## Users
- **Primary: technical founder / marketer-builder** who can paste a prompt into Cursor or Claude Code and apply suggested website changes.
- **Secondary: SEO/AEO operator** who wants concrete content, metadata, and technical recommendations to hand off to a developer.
- **Internal/admin testers** who can validate prompt quality before broader rollout.

## Product Shape
The first gated version is a **fixer-output generator**, not an autonomous executor.

For an eligible user and a completed scan, the product generates a “Fix Pack” for the scan’s **top three gaps**:
- Copy/paste coding-agent prompt optimized for Cursor and Claude Code
- Downloadable Markdown agent file users can add to Claude Code or Cursor as project guidance
- Metadata fix assets where relevant: title, meta description, canonical/Open Graph guidance
- `llms.txt` / AI crawler guidance where relevant
- Content rewrite or content brief guidance for AEO visibility
- Technical SEO instructions that are specific enough for a coding agent to act on

## Entry Points
The experience should be discoverable from multiple surfaces, with implementation order decided later:
- Existing report gap cards: evolve “Fix with our agent” from waitlist-only CTA into gated access when eligible.
- Scan summary / executive summary: offer “Generate fix pack for top 3 gaps.”
- Separate agent/fix page: canonical destination for the gated experience.
- Email follow-up: later channel for nudging eligible waitlisted users back to their fix pack.

## Gating & Rollout
- Access is gated to **selected waitlisted users** behind a feature flag.
- Product requirement: selected-user access must be possible without shipping a broader public launch.
- Exact eligibility mechanism is intentionally deferred to Phase 5 technical planning.
- Non-eligible users continue to see the existing waitlist experience and should not see broken or dead “agent” actions.
- The feature flag should be reversible so the team can disable the experience quickly.

## Generation Mode
Use a hybrid model:
- Deterministic structure for sections, safety disclaimers, prompt framing, and output shape.
- AI-assisted generation for tailored copy, metadata, content briefs, and prompt details when scan context is rich enough.
- Generated output must be grounded in the completed scan data and top-three findings.

## Core Flow
1. User completes or opens a GEOlens scan.
2. Product identifies the scan’s top three actionable gaps.
3. User sees either:
   - gated “Generate fix pack” affordance if eligible, or
   - existing waitlist CTA if not eligible.
4. Eligible user opens the fixer experience.
5. System generates a Fix Pack with:
   - summary of the top three gaps,
   - fix assets,
   - Cursor/Claude Code prompt,
   - downloadable Markdown agent file,
   - manual implementation notes.
6. User copies the prompt, downloads the Markdown agent file, or copies individual assets.
7. Product records agent usage events for learning and rollout decisions.

## Success Metric
Primary success metric for this phase: **agent usage**.

Track at minimum:
- eligible user sees fixer entry point,
- eligible user starts/generates a Fix Pack,
- user copies the coding-agent prompt,
- user downloads the Markdown agent file,
- user copies an individual asset,
- generation failure or disabled-state display.

Waitlist conversion remains useful, but it is secondary for this feature because the goal is to prove selected users can use the agent output.

## In Scope
- Gated Fix Pack generation for completed scans.
- Top-three gap scope only.
- Cursor/Claude Code optimized prompt.
- Downloadable Markdown agent file for iterative SEO/AEO optimization in Claude Code or Cursor.
- Metadata, `llms.txt`, technical SEO, and content brief outputs.
- Non-eligible waitlist fallback.
- Usage instrumentation.

## Out of Scope
- Direct CMS integrations.
- Direct repository access or PR creation.
- Fully autonomous website edits.
- Paid-plan entitlement logic.
- Continuous monitoring or scheduled auto-fixes.
- Full-scan remediation beyond the top three gaps.
- Auto-research capability or autonomous iterative research loops; this is a later enhancement.

## Acceptance Criteria
- Eligible selected users can access a fixer experience for a completed scan.
- Ineligible users still see the waitlist CTA with no access leak to generated Fix Pack content.
- Fix Pack output is based on the scan’s top three gaps and includes a Cursor/Claude Code prompt plus a downloadable Markdown agent file.
- Prompt and assets are copyable; the Markdown agent file is downloadable.
- Feature can be disabled without removing the waitlist path.
- Usage events are recorded for generation start, generation success, prompt copy, Markdown agent download, asset copy, and generation failure.
- The feature does not require customers to connect a CMS, repo, or external integration.

## Risks & Constraints
- Prompt quality must be high enough that users trust it, but early scope should avoid risky autonomous execution.
- Scan data may be incomplete or a gap may not map cleanly to one of the v1 fix categories; those gaps need graceful “manual review recommended” handling.
- Feature flag and selected-user gating must not create a security assumption that client-side checks alone are enough.
- LLM generation cost should stay bounded; top-three scope is the cost and complexity cap.
- Existing waitlist attribution should remain useful even after some users become eligible.

## Open Items Carried Forward
- Phase 3 PRD should decide exact user-facing copy for “Fix Pack” versus “agent” naming.
- Phase 4 should decide whether the separate fixer page is a full page, modal, or split report panel.
- Phase 5 must decide the technical eligibility mechanism and server-side authorization model.
- Phase 5 must decide whether Fix Packs are persisted or generated on demand.
- Phase 5 must decide the exact Markdown agent filename and delivery format.
