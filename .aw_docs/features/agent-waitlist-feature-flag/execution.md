# Phase 6 Build Execution

## Approved Inputs
- `.aw_docs/features/agent-waitlist-feature-flag/prd.md`
- `.aw_docs/features/agent-waitlist-feature-flag/design.md`
- `.aw_docs/features/agent-waitlist-feature-flag/phase-5-plan-api-impact.md`

## Slice 1: Eligibility And Contracts
Status: complete.

### Scope
Implemented the first reversible build slice:
- server-side Fix Pack beta eligibility helper;
- eligibility unit tests;
- `GET`/`POST` Fix Pack API route stub under completed scan ownership checks;
- `fix_pack_cta` waitlist attribution source;
- reserved Fix Pack telemetry event names;
- documented Fix Pack beta env vars.

This slice intentionally does not add persistence, generation, a Markdown download route, or UI.

### Files Changed
- `.env.example`
- `app/api/v1/scans/[id]/fix-pack/route.ts`
- `app/api/v1/waitlist/route.ts`
- `lib/fix-pack/eligibility.ts`
- `lib/fix-pack/eligibility.test.ts`
- `lib/telemetry/track.ts`
- `.aw_docs/features/agent-waitlist-feature-flag/phase-5-plan-api-impact.md`

### RED Proof
Command:

```sh
npm test -- lib/fix-pack/eligibility.test.ts
```

Result: failed because `./eligibility` did not exist.

### GREEN Proof
Command:

```sh
npm test -- lib/fix-pack/eligibility.test.ts
```

Result: passed, 5 tests.

### Expanded Evidence
Command:

```sh
npm run typecheck
```

Result: passed.

IDE lint diagnostics: no linter errors for changed files.

### Chunk Reviews
- `code-reviewer`: approved Slice 1 after review fixes; no remaining findings.
- `typescript-reviewer`: approved Slice 1; non-blocking note to keep structured logging in mind later.

### Review Fixes Applied
- Added anonymous-user eligibility test.
- Added `beforeEach` env cleanup for hermetic tests.
- Renamed telemetry events from `fix_pack.*` to `fixpack.*` before production use.
- Documented `FIX_PACK_ENABLED`, `FIX_PACK_BETA_USER_IDS`, and `FIX_PACK_BETA_EMAILS` in `.env.example`.
- Added an inline comment documenting why `GET` returns ineligible status as `200` while `POST` returns `403`.

### Simplification
Kept Slice 1 intentionally small: no shared scan-access abstraction yet, because only the new route consumes this exact ownership-plus-eligibility combination. Extract later if reused by the Markdown download route or UI server helpers.

### Save Points
No git commit was created because the user has not explicitly requested commits.

## Remaining Build Scope
- Slice 3: structured Fix Pack payload schema and scan-grounded generator.
- Slice 4: complete POST generation and `agent.md` download route.
- Slice 5: `/scan/[id]/fix-pack` page and scan report CTA.
- Slice 6: telemetry interactions and polish.

## Slice 2: Persistence
Status: complete.

### Scope
Added expansion-only persistence for one Fix Pack per completed scan:
- `scan_fix_packs` Drizzle schema;
- SQL migration;
- typed store helpers to get a pack by scan, create/upsert a generating pack, mark completed, and mark failed.

This slice intentionally does not add generation, download, or UI usage.

### Files Changed
- `lib/db/schema.ts`
- `drizzle/0004_add_scan_fix_packs.sql`
- `lib/fix-pack/store.ts`

### Pre-Change Proof
The approved Phase 5 plan identified the missing storage layer as the next build slice. Test-first behavior was not meaningful for the SQL expansion itself; the post-change proof is schema/type/lint review plus database specialist review.

### Validation
Commands:

```sh
npm run typecheck
npm test -- lib/fix-pack/eligibility.test.ts
npm run lint -- lib/db/schema.ts lib/fix-pack/store.ts lib/fix-pack/eligibility.ts lib/fix-pack/eligibility.test.ts "app/api/v1/scans/[id]/fix-pack/route.ts" app/api/v1/waitlist/route.ts lib/telemetry/track.ts
```

Results:
- Typecheck passed.
- Eligibility regression suite passed, 5 tests.
- Targeted ESLint passed.

### Chunk Reviews
- `database-reviewer`: approved; no blockers. Low notes: `requested_by` has no dedicated FK index, and `updated_at` is application-managed without a DB trigger. Both accepted for current beta scope.
- `typescript-reviewer`: approved; no blockers. Medium note for future slices: `scanFixPacks.payload` infers as `unknown`, so download/UI code must Zod-parse it before reading fields.

### Simplification
Kept persistence helpers minimal and did not introduce a repository class. The helper functions match existing Drizzle query style and accept `DbOrTx` for future transactional use.

### Save Points
No git commit was created because the user has not explicitly requested commits.

## Remaining Build Scope After Slice 2
- Slice 4: complete POST generation and `agent.md` download route.
- Slice 5: `/scan/[id]/fix-pack` page and scan report CTA.
- Slice 6: telemetry interactions and polish.

## Slice 3: Generator
Status: complete.

### Scope
Added the scan-grounded Fix Pack generator layer:
- Zod schema for generated Fix Pack payloads;
- prompt builder that serializes only selected scan header, top-three findings, and bounded engine signals;
- AI SDK v6 default generator using `generateText` + `Output.object` through `modelFor`;
- injectable generator path for deterministic tests;
- cost estimate helper for generated packs.

This slice intentionally does not wire generation into the API route, download route, or UI.

### Files Changed
- `lib/fix-pack/schema.ts`
- `lib/fix-pack/prompt.ts`
- `lib/fix-pack/generate.ts`
- `lib/fix-pack/generate.test.ts`

### Validation
Commands:

```sh
npm test -- lib/fix-pack/generate.test.ts
npm run typecheck
npm run lint -- lib/fix-pack/schema.ts lib/fix-pack/prompt.ts lib/fix-pack/generate.ts lib/fix-pack/generate.test.ts
```

Results:
- Generator unit suite passed, 6 tests.
- Typecheck passed.
- Targeted ESLint passed.

### Chunk Reviews
- `typescript-reviewer`: approved. Confirmed AI SDK v6 `generateText` + `Output.object` usage, Zod schema constraints, timeout handling, and injectable generator design.
- `security-reviewer`: approved. Confirmed output validation, probe error suppression, `<scan_data>` delimiters, bounded free-text/meta fields, no raw page data, and text-only handling warnings for AI-authored Markdown/assets.

### Security Boundaries Added
- AI output is parsed with `FixPackPayloadSchema` before use.
- Prompt builder ignores accidental wide page/raw HTML data.
- Non-top findings are excluded.
- Probe `error` values are suppressed before prompting.
- Finding `why`, `detail`, `fixHint`, and `meta` are length-bounded before prompting.
- Model override is documented as server-owned and not HTTP-derived.

### Simplification
Kept generation independent from persistence/API wiring. Future Slice 4 can compose `store.ts` and `generate.ts` without widening either module.

### Save Points
No git commit was created because the user has not explicitly requested commits.

## Remaining Build Scope After Slice 3
- Slice 4: complete POST generation and `agent.md` download route.
- Slice 5: `/scan/[id]/fix-pack` page and scan report CTA.
- Slice 6: telemetry interactions and polish.

## Slice 4: API Completion And Markdown Download
Status: complete.

### Scope
Completed the server API surface for generated Fix Packs:
- `POST /api/v1/scans/[id]/fix-pack` now generates or reuses a persisted Fix Pack after ownership, completed-scan, and feature-eligibility checks;
- `GET /api/v1/scans/[id]/fix-pack` now returns persisted generation state and Zod-parsed payloads;
- `GET /api/v1/scans/[id]/fix-pack/agent.md` returns a downloadable Markdown attachment for completed packs;
- shared scan-access, generation orchestration, Markdown rendering, and service tests were added.

This slice intentionally does not add the `/scan/[id]/fix-pack` page, scan-report CTA, or browser visual QA.

### Files Changed
- `app/api/v1/scans/[id]/fix-pack/route.ts`
- `app/api/v1/scans/[id]/fix-pack/agent.md/route.ts`
- `lib/fix-pack/access.ts`
- `lib/fix-pack/markdown.ts`
- `lib/fix-pack/service.ts`
- `lib/fix-pack/service.test.ts`
- `lib/fix-pack/store.ts`
- `lib/scan/queries.ts`

### RED Proof
Command:

```sh
npm test -- lib/fix-pack/service.test.ts
```

Result: new service and Markdown contract tests were introduced for reuse-vs-generate behavior, in-progress generation, failure marking, and Markdown rendering.

### GREEN Proof
Command:

```sh
npm test -- lib/fix-pack/service.test.ts
```

Result: passed, 7 tests.

### Expanded Evidence
Commands:

```sh
npm test -- lib/fix-pack/eligibility.test.ts lib/fix-pack/generate.test.ts lib/fix-pack/service.test.ts
npm run typecheck
npm run lint -- lib/fix-pack/access.ts lib/fix-pack/markdown.ts lib/fix-pack/service.ts lib/fix-pack/store.ts lib/fix-pack/service.test.ts lib/fix-pack/schema.ts lib/fix-pack/prompt.ts lib/fix-pack/generate.ts "app/api/v1/scans/[id]/fix-pack/route.ts" "app/api/v1/scans/[id]/fix-pack/agent.md/route.ts" lib/scan/queries.ts
```

Results:
- Focused Fix Pack suite passed, 18 tests.
- Typecheck passed.
- Targeted ESLint passed.
- IDE lint diagnostics reported no errors for changed files.

### Chunk Reviews
- `code-reviewer`: initially found concurrency and Markdown-fence issues; final review approved with no blocking findings.
- `security-reviewer`: approved; confirmed authz/gating, payload validation, sanitized errors, `nosniff`, and concurrency mitigation. Non-blocking before-GA note: add a dedicated per-user Fix Pack generation rate limit.
- `typescript-reviewer`: approved after cleanup; confirmed App Router signatures, union result handling, typed payload parsing, and tests.

### Review Fixes Applied
- Replaced open-ended Fix Pack generation upsert with `startGeneratingFixPack`, which only takes ownership for new rows or failed rows and returns `started: false` for existing `generating`/`completed` rows.
- Added `202` response for in-progress generation so duplicate POSTs do not invoke another LLM call.
- Escaped AI-authored `assetText`, `prompt`, and `agentMarkdown` before placing them near Markdown code fences.
- Sanitized persisted/tracked generation error messages to 500 characters.
- Added `x-content-type-options: nosniff` to the Markdown download response.
- Returned `invalid_fix_pack_payload` for corrupted persisted payloads instead of a generic generation failure.
- Removed dead `createGenerating` service surface and made unexpected no-start row statuses explicit.

### Simplification
Kept the API route thin by pushing generation ownership, reuse, and failure marking into `lib/fix-pack/service.ts`. The page/UI slice can consume the route contract without knowing about database race handling.

### Save Points
No git commit was created because the user has not explicitly requested commits.

## Remaining Build Scope After Slice 4
- Slice 5: `/scan/[id]/fix-pack` page and scan report CTA.
- Slice 6: telemetry interactions and polish.

## Slice 5: Fix Pack Page And Scan CTA
Status: complete.

### Scope
Built the scan-report-native Fix Pack UI:
- owner-only `/scan/[id]/fix-pack` page using the dark report surface and shared scan masthead;
- client-side generate/poll/download controller for eligible users;
- ineligible owner state that routes to the waitlist without exposing raw gate reasons;
- scan-report CTA shown after scan completion;
- reusable UI-state helper for action labels and download hrefs;
- shared masthead extraction for `/scan/[id]` and `/scan/[id]/fix-pack`.

This slice intentionally does not complete final telemetry interaction polish or browser visual QA.

### Files Changed
- `app/scan/[id]/fix-pack/page.tsx`
- `app/scan/[id]/fix-pack/fix-pack-client.tsx`
- `app/scan/[id]/scan-view.tsx`
- `app/scan/[id]/scan-masthead.tsx`
- `app/scan/[id]/page.tsx`
- `app/scan/[id]/waitlist-dialog.tsx`
- `app/api/v1/scans/[id]/fix-pack/agent.md/route.ts`
- `lib/fix-pack/ui-state.ts`
- `lib/fix-pack/ui-state.test.ts`

### RED Proof
Command:

```sh
npm test -- lib/fix-pack/ui-state.test.ts
```

Result: failed because `./ui-state` did not exist.

### GREEN Proof
Command:

```sh
npm test -- lib/fix-pack/ui-state.test.ts
```

Result: passed, 6 tests after adding the failed-pack retry contract.

### Expanded Evidence
Commands:

```sh
npm test -- lib/fix-pack/eligibility.test.ts lib/fix-pack/generate.test.ts lib/fix-pack/service.test.ts lib/fix-pack/ui-state.test.ts
npm run typecheck
npm run lint -- "app/scan/[id]/fix-pack/page.tsx" "app/scan/[id]/fix-pack/fix-pack-client.tsx" "app/scan/[id]/scan-view.tsx" "app/scan/[id]/scan-masthead.tsx" "app/scan/[id]/page.tsx" "app/scan/[id]/waitlist-dialog.tsx" "app/api/v1/scans/[id]/fix-pack/agent.md/route.ts" lib/fix-pack/ui-state.ts lib/fix-pack/ui-state.test.ts
npm run build
```

Results:
- Focused Fix Pack suite passed, 24 tests.
- Typecheck passed.
- Targeted ESLint passed.
- Production Next build passed and listed `/scan/[id]/fix-pack` as a dynamic route.
- IDE lint diagnostics reported no errors for changed files.

### Chunk Reviews
- `code-reviewer`: initially found polling-state issues; final review approved with no blockers.
- `typescript-reviewer`: initially blocked on polling timeout; final review approved after mount polling and timeout recovery fixes.
- `security-reviewer`: approved; confirmed owner checks, eligibility checks, safe text rendering of AI-authored fields, private/no-store download headers, and waitlist email validation. Non-blocking before-GA note remains: add a dedicated Fix Pack generation rate limit.

### Review Fixes Applied
- Added mount polling for users who open the page while a Fix Pack is already `generating`.
- Made polling timeout throw and recover to a retryable state instead of leaving the CTA disabled.
- Changed completed-state download action from imperative `window.location.href` to a real link-backed button.
- Removed raw `feature_disabled` / `not_allowlisted` gate reason rendering from the client UI.
- Added client-side email validity checking and timeout cleanup in the waitlist dialog.
- Added `cache-control: private, no-store` to the Markdown download response.
- Added small accessibility cleanups: named scan masthead landmark and decorative status dot hidden from assistive tech.

### Simplification
Kept API state transitions in the Slice 4 route and service layer. The page reads a simple initial state and delegates interactive generation/polling to one client component.

### Save Points
No git commit was created because the user has not explicitly requested commits.

## Remaining Build Scope After Slice 5
- Slice 6: telemetry interactions and polish.

## Slice 6: Telemetry And Polish
Status: complete.

### Scope
Completed the remaining Fix Pack interaction instrumentation and product polish:
- narrow client telemetry endpoint at `POST /api/v1/fix-pack/events`;
- strict Zod contract for client-side Fix Pack events only;
- IP-hash rate limiting for telemetry writes;
- client telemetry helper with `sendBeacon` plus fetch fallback;
- scan-report CTA and waitlist click tracking;
- Fix Pack page tracking for generate, download, prompt copy, waitlist, and install-view interactions;
- copyable prompt panel and install guidance panel on completed packs.

This completes Phase 6 build scope. Browser visual QA remains in the later QA/verification phase.

### Files Changed
- `app/api/v1/fix-pack/events/route.ts`
- `app/scan/[id]/fix-pack/fix-pack-client.tsx`
- `app/scan/[id]/scan-view.tsx`
- `lib/rate-limit/index.ts`
- `lib/rate-limit/index.test.ts`
- `lib/telemetry/client.ts`
- `lib/telemetry/fixpack-client.ts`
- `lib/telemetry/fixpack-client.test.ts`

### RED Proof
Command:

```sh
npm test -- lib/telemetry/fixpack-client.test.ts
```

Result: failed because `./fixpack-client` did not exist.

### GREEN Proof
Command:

```sh
npm test -- lib/telemetry/fixpack-client.test.ts
```

Result: passed after adding the strict client telemetry contract.

### Expanded Evidence
Commands:

```sh
npm test -- lib/fix-pack/eligibility.test.ts lib/fix-pack/generate.test.ts lib/fix-pack/service.test.ts lib/fix-pack/ui-state.test.ts lib/telemetry/fixpack-client.test.ts lib/rate-limit/index.test.ts
npm run typecheck
npm run lint -- "app/api/v1/fix-pack/events/route.ts" "app/scan/[id]/fix-pack/fix-pack-client.tsx" "app/scan/[id]/scan-view.tsx" lib/telemetry/client.ts lib/telemetry/fixpack-client.ts lib/telemetry/fixpack-client.test.ts lib/rate-limit/index.ts lib/rate-limit/index.test.ts lib/fix-pack/ui-state.test.ts
npm run build
```

Results:
- Focused Fix Pack and telemetry suite passed, 33 tests.
- Typecheck passed.
- Targeted ESLint passed.
- Production Next build passed and listed `/api/v1/fix-pack/events`.

### Chunk Reviews
- `code-reviewer`: initially noted missing telemetry rate limiting and minor analytics clarity items; final review approved with no blockers.
- `security-reviewer`: initially flagged telemetry endpoint abuse risk; final review approved after adding rate limiting and strict schema rejection for prompt/Markdown bodies.
- `typescript-reviewer`: approved after verifying type compatibility, `sendBeacon` fallback behavior, React hooks, and build output.

### Review Fixes Applied
- Added `limitFixPackEvents` with a `30 / 10m` sliding window and applied it before tracking client events.
- Changed telemetry schema from accepting-and-dropping prompt/Markdown bodies to rejecting them via `.strict()`.
- Added `sendBeacon` return-value handling with fetch fallback.
- Deduped install-view tracking with a ref so the event fires once per rendered completed pack.
- Kept telemetry props to stable IDs/status/source/action only.

### Simplification
Kept client telemetry intentionally narrow and separate from the general `track()` helper. The endpoint accepts only four client-side Fix Pack interaction events and does not expose a generic event ingestion surface.

### Save Points
No git commit was created because the user has not explicitly requested commits.

## Phase 6 Build Status
All planned build slices are complete:
- Slice 1: Eligibility And Contracts
- Slice 2: Persistence
- Slice 3: Generator
- Slice 4: API Completion And Markdown Download
- Slice 5: Fix Pack Page And Scan CTA
- Slice 6: Telemetry And Polish
