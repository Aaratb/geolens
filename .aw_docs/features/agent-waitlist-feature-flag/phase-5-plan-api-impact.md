# Phase 5: Plan + API Impact

## Status
Approved direction for Phase 6 implementation.

## Goal
Ship the Fix Pack as a scan-grounded, gated, reversible beta feature. The v1 feature converts a completed scan's top-three actionable gaps into:
- three implementation-ready fix cards;
- one copyable Cursor/Claude Code prompt;
- one downloadable Markdown agent guide;
- lightweight install guidance for Claude Code, Cursor, and `AGENTS.md`.

The feature must not edit the user's site, access a repository, run autonomous web research, or imply guaranteed ranking/citation outcomes.

## Existing Patterns To Reuse
- Scan ownership checks mirror `app/api/v1/scans/[id]/pdf/route.ts`: signed-in owner or anonymous scan from the same `ipHash`.
- Completed scan data comes from `lib/scan/queries.ts`, especially `getScanWithDetails`.
- Waitlist fallback reuses `waitlist_entries` via `app/api/v1/waitlist/route.ts`.
- AI calls go through `modelFor` in `lib/ai/gateway.ts`.
- Product events extend `TelemetryEvent` in `lib/telemetry/track.ts`.
- Scan UI stays on the `surface-report` visual system in `app/scan/[id]/page.tsx` and `app/scan/[id]/scan-view.tsx`.

## Key Decisions

### 1. Gating
Use a two-layer server-side gate:

1. Global kill switch: `FIX_PACK_ENABLED=true`.
2. Beta allowlist: `FIX_PACK_BETA_USER_IDS` and/or `FIX_PACK_BETA_EMAILS`, comma-separated.

If the global flag is off or the user is not allowlisted, the UI shows the existing waitlist path and does not call the LLM generator.

Why this shape:
- The repo has no general feature-flag service today.
- Env-based gates match the current small-beta operational need.
- It is reversible without data migration.
- Waitlist intent can still be captured through `waitlist_entries`.

Later upgrade path:
- Replace env allowlist with a persisted entitlement table or admin-managed Clerk metadata after beta demand is proven.

### 2. Persistence
Persist generated Fix Packs, keyed one-to-one by scan.

Why not purely on-demand:
- Avoid repeated LLM cost for refreshes/downloads.
- Keep prompt and Markdown output stable for the user.
- Support telemetry around generation, downloads, and future regeneration.
- Make retry/error states explicit.

Recommended table: `scan_fix_packs`.

```ts
scanFixPacks = pgTable("scan_fix_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id").notNull().references(() => scans.id, { onDelete: "cascade" }),
  requestedBy: text("requested_by").references(() => users.id, { onDelete: "set null" }),
  status: text("status", { enum: ["generating", "completed", "failed"] }).notNull(),
  version: text("version").notNull().default("v1"),
  payload: jsonb("payload"),
  error: text("error"),
  model: text("model"),
  costCents: integer("cost_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("scan_fix_packs_scan_id_uq").on(t.scanId),
  index("scan_fix_packs_status_idx").on(t.status),
]);
```

### 3. Generation Scope
The generator must only use scan data already in the database:
- scan header: URL, hostname, brand, category, scores;
- top-three findings: title, why, detail, fix hint, effort, severity, score impact, metadata;
- limited probe/page signals from `getScanWithDetails` when useful.

No external crawl, search, repo access, or auto-research in v1.

### 4. Canonical Route
Use a canonical Fix Pack page at:

`/scan/[id]/fix-pack`

The scan report remains the entry point. CTAs link from:
- top-three gap cards;
- scan completion footer;
- any future “Fix with our agent” panel.

## API Contracts

### GET `/api/v1/scans/[id]/fix-pack`
Returns eligibility and current persisted Fix Pack state. Does not generate.

Success, eligible and completed:

```json
{
  "eligible": true,
  "status": "completed",
  "fixPack": {
    "id": "uuid",
    "version": "v1",
    "cards": [],
    "prompt": "...",
    "agentMarkdown": "...",
    "caveats": []
  }
}
```

Success, eligible but not generated:

```json
{
  "eligible": true,
  "status": "not_generated",
  "fixPack": null
}
```

Ineligible:

```json
{
  "eligible": false,
  "reason": "feature_disabled"
}
```

or:

```json
{
  "eligible": false,
  "reason": "not_allowlisted"
}
```

HTTP behavior:
- `200` for known scan with eligibility/status payload.
- `403` for forbidden scan ownership.
- `404` for unknown scan.
- `409` for scans that are not completed.

### POST `/api/v1/scans/[id]/fix-pack`
Creates or returns a persisted Fix Pack for an eligible completed scan.

Request body:

```json
{}
```

Success:

```json
{
  "ok": true,
  "status": "completed",
  "fixPackId": "uuid"
}
```

If another request already generated the pack, return the existing row instead of regenerating.

HTTP behavior:
- `201` when generation created a new completed pack.
- `200` when an existing completed pack is returned.
- `202` only if implementation chooses background generation. Phase 6 should prefer synchronous generation with a timeout first unless latency proves unacceptable.
- `400` for invalid body.
- `403` for forbidden/ineligible.
- `404` for unknown scan.
- `409` for scans that are not completed.
- `500` for generation failure after persisting a `failed` row.

### GET `/api/v1/scans/[id]/fix-pack/agent.md`
Downloads the persisted Markdown agent file.

Response:
- `200 text/markdown`
- `Content-Disposition: attachment; filename="geolens-fix-pack-agent.md"`

Errors:
- `404` if scan or completed Fix Pack does not exist.
- `403` for forbidden/ineligible.
- `409` if the scan is not completed or the pack is not ready.

### POST `/api/v1/waitlist`
Extend the source enum with:

```ts
"fix_pack_cta"
```

Use `scanId` for attribution. Do not pass `gapId` unless the UI has the real `scan_findings.id` UUID; current `Gap.id` values are display IDs and should not be sent as UUIDs.

## Fix Pack Payload Shape

Persist `payload` as a Zod-validated JSON object. Keep it explicit so UI, download, and telemetry do not parse prose.

```ts
const FixPackPayload = z.object({
  cards: z.array(z.object({
    findingId: z.string().uuid().optional(),
    displayId: z.string(),
    title: z.string(),
    severity: z.enum(["critical", "high", "medium", "low"]),
    confidence: z.enum(["high", "medium", "low"]),
    observedEvidence: z.string(),
    recommendedChange: z.string(),
    assetKind: z.enum(["llms_txt", "metadata", "schema", "content_brief", "technical_checklist"]),
    assetText: z.string(),
    checklist: z.array(z.string()),
    validationSteps: z.array(z.string()),
    caveat: z.string().optional(),
  })).length(3),
  prompt: z.string(),
  agentMarkdown: z.string(),
  install: z.object({
    claudeCode: z.string(),
    cursor: z.string(),
    agentsMd: z.string(),
  }),
  caveats: z.array(z.string()),
});
```

Generation rules:
- Keep confidence explicit.
- Preserve manual-review warnings when the scan evidence is insufficient.
- Prefer concrete implementation assets over generic advice.
- Include a caveat that AI answer inclusion and citations are controlled by each platform.

## Telemetry

Extend `TelemetryEvent` with:
- `fixpack.cta.clicked`
- `fixpack.waitlist.clicked`
- `fixpack.generation.started`
- `fixpack.generation.completed`
- `fixpack.generation.failed`
- `fixpack.prompt.copied`
- `fixpack.agent.downloaded`
- `fixpack.install.viewed`
- `cost.fixpack`

Do not put email addresses, raw prompt outputs, or Markdown bodies into telemetry props.

Suggested props:
- `scanId`
- `fixPackId`
- `status`
- `reason`
- `anonymous`
- `cardCount`
- `costCents`
- `model`

## UI Impact

### New Page
Add `app/scan/[id]/fix-pack/page.tsx` with the same scan report shell:
- `surface-report min-h-screen scan-fade-in`;
- masthead consistent with `app/scan/[id]/page.tsx`;
- max-width content column plus optional right rail on desktop.

### New Client Components
Suggested components:
- `fix-pack-view.tsx`: fetch/generate state machine and page body.
- `fix-card.tsx`: renders one generated card.
- `agent-guide-panel.tsx`: download, prompt copy, install instructions.
- `fix-pack-cta.tsx`: lightweight CTA for the scan report.

### Scan Report Integration
In `app/scan/[id]/scan-view.tsx`:
- show Fix Pack CTA only when scan status is `complete`/`completed` according to existing state naming;
- keep non-eligible users on the waitlist dialog;
- do not blur top-three public findings.

In `app/scan/[id]/gap-card.tsx`:
- current button can remain waitlist-only until Phase 6 decides whether to link directly to `/scan/[id]/fix-pack`;
- avoid sending display IDs as `gapId`.

## Security And Privacy

- Gate before generation.
- Enforce scan ownership on every Fix Pack endpoint.
- Require completed scans before generation.
- Never persist raw crawled HTML.
- Do not include PII in telemetry.
- Do not expose Fix Packs through share links in v1 unless a separate share policy is designed.
- Markdown content must be treated as downloadable text, not rendered as trusted HTML.

## Test Plan

API contract tests:
- `GET /fix-pack` returns `404` for missing scan.
- `GET /fix-pack` returns `403` for non-owner.
- `GET /fix-pack` returns `409` for queued/running/failed scan.
- `GET /fix-pack` returns ineligible reason when feature flag is off.
- `POST /fix-pack` does not generate when ineligible.
- `POST /fix-pack` returns existing pack without a second generation.
- `GET /agent.md` returns `text/markdown` and attachment headers only when pack is complete.

Unit tests:
- eligibility helper with flag off, flag on, allowlisted user ID, allowlisted email, anonymous scan owner.
- payload Zod parser accepts valid generated output and rejects malformed output.
- prompt builder only includes scan-grounded fields.

UI tests:
- eligible completed scan can open Fix Pack page.
- ineligible user sees waitlist state.
- loading, failed, and completed states render without layout drift.
- prompt copy and Markdown download buttons are keyboard reachable.

## Implementation Slices

### Slice 1: Eligibility And Contracts
- Scope: add server-side eligibility helper, env parsing, API route stubs returning eligibility/status, waitlist source enum.
- Files: `lib/fix-pack/eligibility.ts`, `app/api/v1/scans/[id]/fix-pack/route.ts`, `app/api/v1/waitlist/route.ts`, `lib/telemetry/track.ts`.
- Validation: unit tests for eligibility; API smoke for disabled/ineligible/completed scan states.
- Risk: accidentally exposing the feature while disabled.
- Rollback: remove route and env usage; waitlist source can remain harmless.

### Slice 2: Persistence
- Scope: add `scan_fix_packs` schema and migration; create read/write helpers.
- Files: `lib/db/schema.ts`, `drizzle/*`, `lib/fix-pack/store.ts`.
- Validation: migration generation check; store helper unit tests with mocked DB where practical.
- Risk: migration mistakes.
- Rollback: drop `scan_fix_packs`; no existing user flow depends on it before Slice 3.

### Slice 3: Generator
- Scope: build scan-grounded prompt, structured payload schema, and generate-or-return-existing service.
- Files: `lib/fix-pack/schema.ts`, `lib/fix-pack/prompt.ts`, `lib/fix-pack/generate.ts`.
- Validation: parser tests, deterministic mocked generator tests, no external research inputs.
- Risk: vague or overconfident generated content.
- Rollback: keep persistence but disable `FIX_PACK_ENABLED`.

### Slice 4: API Completion And Markdown Download
- Scope: wire POST generation and `agent.md` download route.
- Files: `app/api/v1/scans/[id]/fix-pack/route.ts`, `app/api/v1/scans/[id]/fix-pack/agent.md/route.ts`.
- Validation: API contract tests for generate, reuse, failures, and download headers.
- Risk: repeated generation under concurrent requests.
- Rollback: disable flag; persisted rows remain unused.

### Slice 5: Fix Pack Page And Scan CTA
- Scope: add `/scan/[id]/fix-pack` page and link from scan report.
- Files: `app/scan/[id]/fix-pack/page.tsx`, `app/scan/[id]/fix-pack-view.tsx`, `app/scan/[id]/scan-view.tsx`, component files as needed.
- Validation: UI smoke tests; keyboard/focus checks; visual comparison against Phase 4 prototype and existing scan page.
- Risk: confusing ineligible users.
- Rollback: hide CTA behind flag and keep API disabled.

### Slice 6: Telemetry And Polish
- Scope: add copy/download/install events, caveat copy, final empty/error states.
- Files: UI components plus `lib/telemetry/track.ts`.
- Validation: interaction tests or targeted manual checks; no PII in props.
- Risk: noisy analytics.
- Rollback: remove event calls; user behavior remains intact.

## Open Questions For Phase 6
- Should generation be synchronous in the POST route or backgrounded with `waitUntil`? Recommendation: start synchronous with a timeout; switch to background if latency is poor.
- Should allowlisting use user IDs, emails, or both? Recommendation: support both for beta operations.
- Should share pages show a teaser for Fix Packs? Recommendation: no for v1; keep owner-only until share policy is explicit.
