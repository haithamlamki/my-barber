# حلاقي My Barber — Project Conventions

This file is loaded into every Claude Code session for this project. It overrides global rules where they conflict.

## Project summary

Oman-only barber/shop operating system. Tech: Next.js 15 (App Router) + TypeScript (strict) + Tailwind + shadcn/ui + Supabase (Postgres + Auth + RLS + Storage) + next-intl. Default locale `ar` (RTL); secondary `en` (LTR). PRD lives at `doc/deep-research-report.md`. The active build plan is the v0.1 walking skeleton (see PRD § "MVP" but cut down to: single business + single location, guest booking, owner dashboard, fake payment + console notification adapters).

## Hard rules

1. **English-only in code.** All source code, identifiers, comments, commit messages, PR descriptions, and inline notes are written in English. The product UI ships in Arabic + English — but every Arabic string lives in `messages/ar.json`, never in `.tsx`/`.ts` files.
2. **No hardcoded user-facing strings.** Every label, button, error, toast, validation message must come from `next-intl` lookups against `messages/ar.json` and `messages/en.json`. CI/review flags any string literal in JSX that isn't an i18n key.
3. **DESIGN.md is binding.** Cal.com tokens (defined in `/DESIGN.md` at repo root) are the only source of colors, spacing, radii, typography, and component dimensions. Never inline a hex value; reference tokens (e.g. via Tailwind theme extension that maps to DESIGN.md tokens). Soft shadows only — no neumorphism, no glassmorphism.
4. **Every component must work in both RTL (ar) and LTR (en).** Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) instead of `ml-*`/`mr-*`. Test every layout in both directions before merging.
5. **Money is integers in minor units (baisa).** OMR has 1000 baisa. Never use floats for money. Column names end in `_minor`.
6. **Multi-tenant from day 1.** Every business-scoped table has `business_id` (and `location_id` where relevant). RLS is enabled on every such table. There is an integration test proving tenant A cannot read or write tenant B's rows.
7. **TDD only.** RED → GREEN → REFACTOR. Tests for `lib/` business logic are written before the implementation. Coverage on `lib/` must be ≥ 80%. Each PRD edge case (PRD §"Edge cases", lines 271–287) becomes a named test once its feature lands.
8. **Booking writes must use a row-level lock.** No two appointments can ever confirm against the same `(staff_profile_id, time-range)`. There is an integration test that fires concurrent booking writes and asserts exactly one succeeds.
9. **Append-only `appointment_events`.** Every appointment state change writes an immutable event row. The state machine lives in `lib/booking/state-machine.ts`. No table-level updates to `appointments.status` happen outside the state machine.
10. **Regenerate Supabase TS types after every schema change.** `pnpm db:types` runs after each migration. Code that uses untyped table access is rejected in review.

## Subagents to invoke

Configured at `.claude/agents/`:

- **db-architect** — schemas, RLS, migrations, seeds, Supabase TS-type regeneration
- **frontend-builder** — Next.js components strictly bound to DESIGN.md, RTL+LTR verified, no hardcoded strings
- **test-runner** — Vitest + Playwright; enforces TDD; raises any `lib/` module below 80% coverage
- **reviewer** — pre-commit gate for RLS leaks, security, integer-only money, booking concurrency lock, RTL verification, scope creep

All agents run on `model: opus`.

## Slash commands

Configured at `.claude/commands/`:

- `/test` — Vitest unit + integration; fix failures TDD-style
- `/e2e` — Playwright; runs both ar (RTL) and en (LTR) journeys
- `/migrate` — `supabase db reset` + apply migrations + regenerate TS types
- `/seed` — apply `supabase/seed.sql` to local stack
- `/coverage` — `vitest --coverage`; raise any `lib/` module below 80%

## DESIGN.md — binding summary

Full spec at `/DESIGN.md` (downloaded from VoltAgent/awesome-design-md, path `design-md/cal/DESIGN.md`). Highlights:

- **Canvas**: `colors.canvas` (#ffffff) is the dominant page background. `colors.surface-soft` (#f8f9fa) for nav-pill backgrounds. `colors.surface-card` (#f5f5f5) for feature/testimonial/pricing cards. `colors.surface-dark` (#101010) for the page-closing footer and the one featured pricing tier — nowhere else.
- **Primary action**: `colors.primary` (#111111) on white = the only primary CTA color. Press state `colors.primary-active` (#242424). Disabled `colors.primary-disabled` (#e5e7eb) with `colors.muted` text.
- **Type**: Cal Sans (custom) for display sizes — substitute Inter weight 600 with `letterSpacing: -2px → -0.5px` per size. Inter for everything else. JetBrains Mono for code. Never mix sizes within a heading.
- **Radii**: `rounded.md` (8px) for buttons + inputs; `rounded.lg` (12px) for content cards; `rounded.xl` (16px) for the hero/app-mockup container; `rounded.pill` for nav-pill-group + badges; `rounded.full` for avatars + circular icon buttons.
- **Spacing**: `spacing.section` (96px) between major bands. `spacing.lg` (24px) standard card padding. `spacing.xl` (32px) for feature-cards and pricing-tier-cards.
- **Shadows**: soft only. No drop shadows on cards by default; rely on the `colors.surface-card` background plus `colors.hairline` (#e5e7eb) borders.
- **Borders**: `colors.hairline` (#e5e7eb) for visible dividers; `colors.hairline-soft` (#f3f4f6) for low-emphasis separators.
- **Avatars**: 36px circle, `rounded.full`, `colors.surface-card` background.
- **Footer**: dark band, the only dark surface above-the-fold; closes every long-scroll page.
- **Embedded product UI**: this product showcases actual booking widgets / calendar pickers inside marketing cards — not illustrations. Marketing surfaces should reuse real product components at reduced scale.
- **RTL discipline**: all directional tokens (margins, padding, alignments, icons, animations) must be mirror-safe. Test every page with `<html dir="rtl">` before merge.

## File layout

```
my-barber/
├─ doc/                   PRD + research
├─ DESIGN.md              Cal.com tokens (binding)
├─ CLAUDE.md              this file
├─ apps/web/              Next.js 15 app
│  ├─ app/[locale]/...    locale-scoped routing (ar default, en switch)
│  ├─ lib/                pure business logic (TDD lives here)
│  ├─ messages/           ar.json, en.json (only sources of user-facing text)
│  └─ tests/              unit/integration/e2e
├─ supabase/
│  ├─ migrations/         numbered SQL migrations (0001_init.sql, ...)
│  └─ seed.sql            1 business, 1 location, 3 services, 2 barbers, 1 owner
└─ .claude/
   ├─ agents/             4 project subagents
   └─ commands/           5 slash commands
```

## v0.1 scope discipline

The active sprint plan lives in `~/.claude/plans/i-will-share-the-zazzy-koala.md`. v0.1 is a **walking skeleton**: customer guest booking + owner dashboard + Supabase RLS + RTL/LTR i18n + fake providers. **Loudly refuse scope creep** into waitlist, loyalty, gift cards, inventory, multi-location, real Thawani/WhatsApp, Hindi/Urdu, or mobile apps. Those are deferred to v0.2+. If a request seems to expand v0.1, ask the user to confirm before adding it.

## Known issues (v0.2 candidates)

- **Booking race surfaces `save_failed` instead of `slot_taken` on deadlock.** The double-booking guard is the `appointments` EXCLUDE constraint. Under a true concurrent race, Postgres usually aborts the loser with `exclusion_violation` (mapped to the friendly `slot_taken`), but *sometimes* resolves it as a deadlock (`40P01`) instead, which currently falls through to the generic `save_failed` message. Correctness is unaffected — exactly one booking ever wins. v0.2 should detect the deadlock (and retry once) to show `slot_taken`. See the `TODO(v0.2)` at the error-mapping site in `apps/web/app/[locale]/book/actions.ts` (`writeAppointment`).
