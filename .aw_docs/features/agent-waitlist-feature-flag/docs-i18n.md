# Fix Pack Feature — Phase 9 Docs And i18n

> Documentation and internationalization pass for `/feature-pro` Phase 9.

## Documentation Updates

Updated `README.md` with a concise Fix Pack beta section covering:

- product behavior: scan-grounded repair cards, implementation prompt, and downloadable `agent.md`;
- v1 boundary: no autonomous web research in this release;
- server-side feature gates: `FIX_PACK_ENABLED`, `FIX_PACK_BETA_USER_IDS`, `FIX_PACK_BETA_EMAILS`;
- API surfaces: status, generation, Markdown download, and client telemetry;
- source-of-truth links to this feature folder and Phase 8 verification evidence.

The README project layout now includes `lib/fix-pack/`, and the roadmap distinguishes the shipped gated Fix Pack beta from future autonomous workflow/research work.

## i18n Assessment

This repo currently has no i18n runtime or translation message catalog:

- no `next-intl`, `react-intl`, or `i18next` dependency;
- no `messages/`, `locales/`, or app-level locale routing tree;
- existing landing, scan, legal, and methodology pages are English-only.

Phase 9 therefore does not introduce translation infrastructure. Adding i18n now would be a cross-cutting product/platform decision beyond this gated beta slice.

## User-Facing Copy Inventory

Fix Pack introduced or revised user-facing English copy in:

- `app/scan/[id]/fix-pack/fix-pack-client.tsx`;
- `app/scan/[id]/waitlist-dialog.tsx`;
- `lib/fix-pack/markdown.ts`.

Copy was reviewed in Phase 7 for legal accuracy and narrowed to describe the v1 Fix Pack as implementation assets plus an agent-ready Markdown file.

## Follow-Up Before Broad Launch

If GEOlens adopts i18n, the Fix Pack strings should be moved into the same future message catalog as the landing and scan report surfaces. Treat the current English literals as part of the existing repo convention, not as a new i18n exception.

Before enabling beyond a small beta:

- verify final public marketing/legal wording for the Fix Pack waitlist;
- add a seeded authenticated browser journey for completed-scan Fix Pack generation;
- decide whether generated `agent.md` files need locale variants or should remain English developer artifacts.
