# حلاقي My Barber

Oman-only barber/shop operating system. Next.js 15 + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres + Auth + RLS + Storage) + next-intl. Default locale `ar` (RTL); secondary `en` (LTR).

> Project conventions live in `CLAUDE.md`. Cal.com design tokens live in `DESIGN.md` and are bound via `apps/web/tailwind.config.ts`. The active PRD is at `doc/deep-research-report.md`. The v0.1 plan is "walking skeleton" — see `CLAUDE.md` for hard scope rules.

## Prerequisites

- Node.js ≥ 20 (this project tested on Node 24)
- pnpm ≥ 10
- Supabase CLI ≥ 2.103 — `brew install supabase/tap/supabase`
- A container runtime for the local Supabase stack. Recommended on macOS: **Colima** (open-source, headless) — `brew install colima docker` then `colima start --cpu 2 --memory 4 --disk 20`. Docker Desktop and OrbStack also work.

## Quick start

```bash
# 1. Container runtime up
colima start --cpu 2 --memory 4 --disk 20    # one-time per boot

# 2. Local Supabase stack (Postgres + Auth + Realtime + Storage)
pnpm db:start                                 # supabase start

# 3. Apply schema + seed (resets local DB)
pnpm db:reset                                 # supabase db reset → runs migrations + seed.sql

# 4. Regenerate TS types from the schema
pnpm db:types                                 # → apps/web/lib/db/database.types.ts

# 5. Web app
cp .env.example .env.local                    # then paste anon key from `supabase status`
pnpm dev                                      # http://localhost:3000 → redirects to /ar
```

## Tests

```bash
pnpm test            # Vitest: unit + integration
pnpm test:coverage   # gates: lib/ ≥ 80%, lib/pricing/ = 100%
pnpm test:e2e        # Playwright: ar + en journeys
```

## Slash commands (Claude Code)

This repo ships with `.claude/agents/` (db-architect, frontend-builder, test-runner, reviewer) and `.claude/commands/` (`/test`, `/e2e`, `/migrate`, `/seed`, `/coverage`). All run on `model: opus`.

## v0.1 scope guard

If a task touches waitlist, loyalty, gift cards, inventory, multi-location switching, real Thawani/PayTabs/WhatsApp, Hindi or Urdu, or mobile apps — it's **out of v0.1**. Ask before proceeding.
