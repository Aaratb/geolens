# Screen Plan: GEOlens Fix Pack

## Flow
`scan-report/default.html` -> `fix-pack/default.html`

Branches:
- Ineligible or feature disabled -> `fix-pack/disabled.html`
- Generation in progress -> `fix-pack/loading.html`
- Generation failure -> `fix-pack/error.html`
- Agent guide preview/download -> `fix-pack/modal-agent-guide.html`
- Install instructions -> `fix-pack/modal-install.html`

## Screens

### Scan Report Entry
Purpose: show the completed scan and eligible CTA into Fix Pack.
States: default only for Phase 4 prototype.

### Fix Pack Default
Purpose: canonical command-center page for selected early-access users.
Core layout: scan-report-native masthead, editorial hero, three fix cards, sticky right rail with prompt/download/install/scope.

### Loading
Purpose: reassure users that generation is scan-grounded and bounded to top-three gaps.

### Disabled / Ineligible
Purpose: preserve waitlist path without leaking generated content.

### Error
Purpose: recover from generation failure without breaking the scan report.

### Modals
- Agent guide preview/download
- Install guide instructions for Claude Code, Cursor, and AGENTS.md

## Stitch Reference
Project: `projects/17003303864460879520`
Primary screen: `projects/17003303864460879520/screens/7d21e578d93e4df6a0fbf75fa428b6d1`
Screenshot URL retained in Stitch metadata.
