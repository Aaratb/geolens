# Design: Fixer Agent Behind Waitlist Feature Flag

## Direction
Use a scan-report-native Fix Pack layout. The design centers on the competitive wedge from Phase 3.5: GEOlens is the scan-grounded implementation bridge from diagnosis to action.

Visual direction is locked to the existing GEOlens system:
- Landing/index surfaces use the cream editorial palette: `#fafaf7`, ink text, thin rules, and publication-style spacing.
- Scan report and Fix Pack surfaces use the dark interactive report palette: `#0a0a0b`, `#111113`, muted marginalia, score colors, and sparse purple accent.
- Typography matches production: Fraunces for display headings, Inter for body/UI, JetBrains Mono for audit labels and tabular metadata.

## Screens
- `designs/index.html` is the entry point.
- `designs/scan-report/default.html` shows the report CTA.
- `designs/fix-pack/default.html` is the canonical Fix Pack page.
- `designs/fix-pack/loading.html`, `disabled.html`, and `error.html` cover core states.
- `designs/fix-pack/modal-agent-guide.html` previews the Markdown guide.
- `designs/fix-pack/modal-install.html` explains Claude Code, Cursor, and AGENTS.md install paths.

## Component Inventory
- Fix Pack hero with bounded-scope caveat.
- Three fix cards, one per top-three gap.
- Asset preview blocks for metadata, `llms.txt`, and content brief outputs.
- Sticky action rail with prompt copy, Markdown guide download, install instructions, and scope notes.
- Ineligible/waitlist fallback.
- Loading skeletons and recoverable error state.
- Copy/download success toast.

## Key Decisions
- Make the Markdown agent guide a primary deliverable, not a secondary download.
- Use three fix cards to make top-three scope visible and trustworthy.
- Pair every confidence/manual-review state with text, not color alone.
- Avoid autonomous-agent language; the page says GEOlens does not edit the site or access the repo.
- Reuse the GEOlens masthead/rule/marginalia system instead of generic dashboard navigation.
- Keep the Fix Pack on the dark report surface because it is a continuation of the scan, not a new marketing page.

## Accessibility Notes
- All copy/download actions are buttons or links with focus-visible rings.
- Disabled/ineligible state explains why the action is unavailable.
- Status indicators use dots plus text labels.
- Mobile layout stacks actions and cards; touch targets are at least 44px.

## Prototype Links
- Entry point: `designs/index.html`
- Flow map: `designs/SCREEN_PLAN.md`
- Review trail: `designs/REVIEW.md`
