# ADR-001: Authentication provider — Clerk

- **Status:** accepted (Phase 5)
- **Date:** 2026-05-04
- **Deciders:** product owner

## Context

GEOlens v1 needs sign-in to gate the detailed report after the free executive summary, plus persistent scan history and a path to monetization (paid PDF). Auth is on the critical path of the conversion funnel: bad UX here kills the north-star metric (scans completed → sign-in → report viewed). We need:

- Email + Google OAuth (minimum)
- Drop-in UI we don't have to design (Phase 4 lock keeps design budget on landing/report)
- Server-side session helpers idiomatic for Next.js Route Handlers
- Webhook to sync user data to our `users` table for FK targets
- Free tier sufficient for v1 (target: 1k MAU in first 90 days)

## Options considered

### Clerk
- Drop-in `<SignIn />` and `<UserButton />` components with theming hooks
- First-class Next.js App Router support; `auth()` helper for Route Handlers
- Free up to 10k MAU; Pro $25/mo
- Webhooks for user lifecycle out of the box
- OAuth, magic links, MFA all included

### NextAuth (Auth.js v5)
- Open source, no per-MAU pricing
- More flexible; we own the data
- We build all UI ourselves
- More integration surface (DB adapter, providers config, JWT vs session debate)

### Firebase Auth
- Free, mature, Google ecosystem
- Drop-in UI via FirebaseUI is dated; no Next.js-idiomatic components
- Adds a vendor we wouldn't otherwise use (we picked Vercel-native stack in ADR-002)

### Supabase Auth
- Capable, free tier generous
- Tied to Supabase database; we picked Neon (ADR-002), so this would add a vendor
- Less polished Next.js DX than Clerk

## Decision

**Clerk.**

## Rationale

1. **Time-to-value.** Drop-in components mean we can land US-2 + US-3 (PRD §5) in hours, not days. Phase 4's hybrid C+A locked design treats the auth modal as a frosted overlay over the report — Clerk's components themeable to that with minimal CSS.
2. **Right-sized cost.** Free up to 10k MAU covers all of v1 plus several months of post-launch growth. If we hit Pro pricing we're already winning.
3. **Webhook reliability.** Clerk emits `user.created`/`user.updated` we sync to `users` table for FK targets. This is well-documented and we don't have to operate it.
4. **Anonymous-then-signed-in claim flow.** PRD §7 / spec §3 require claiming an anonymous scan after sign-in. Clerk's session is available immediately on next page load, simpler than NextAuth's session refresh dance.

## Consequences

### Positive
- Phase 6 ships auth in M1.5 (1–2 days budget)
- One vendor we don't have to operate
- Built-in MFA, social providers, password reset — all free

### Negative / Risks
- Vendor lock-in: migrating off Clerk requires re-issuing sessions to all users and is non-trivial. Mitigation: keep Clerk-specific code isolated to `lib/auth/clerk.ts`; everywhere else use a thin `getCurrentUser()` abstraction.
- Cost cliff at 10k MAU. Mitigation: monitor in telemetry; revisit if we cross 8k.
- Clerk webhook downtime would delay our `users` table sync. Mitigation: nightly reconciliation cron compares Clerk users to local users.

## Implementation notes

- Wrap app in `<ClerkProvider>` in `app/layout.tsx`
- Use `<SignIn />` inside a shadcn `<Dialog>` for the in-place unlock
- Server: `import { auth } from '@clerk/nextjs/server'` in Route Handlers
- Webhook endpoint: `/api/webhooks/clerk`, verify `svix` signature
- Theme Clerk components to match Direction A's dark palette via Clerk's `appearance` prop

## Revisit triggers

- Crossing 8k MAU (cost concern)
- Need for SSO/SAML at enterprise tier (Clerk Pro covers this; just confirm pricing)
- Clerk pricing changes materially
