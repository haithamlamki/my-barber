---
description: Apply supabase/seed.sql to the local database (1 business, 1 location, 3 services, 2 barbers, 1 owner)
---

# /seed

Applies `supabase/seed.sql` to the running local Supabase stack. The seed defines the single demo tenant used for development and tests.

## Seed content (v0.1)

- 1 business — "حلاقي Demo Barbershop" (`default_locale = 'ar'`, `vat_status = 'not_registered'`)
- 1 location in Muscat
- 3 services — classic cut, beard trim, cut + beard combo (durations 30 / 20 / 45 min; prices in baisa)
- 2 staff profiles — two barbers, assigned to the single location, each offering all 3 services
- 1 owner user — email-OTP auth, role `owner`, scoped to the demo business

## What it does

1. Confirms the local stack is up and the migrations are applied (calls `/migrate` if needed).
2. Runs `supabase db reset --no-seed` is **not** used — `db reset` already runs `seed.sql`. If you want to re-apply seed without resetting schema, run `psql "$SUPABASE_DB_URL" -f supabase/seed.sql` (idempotency depends on `ON CONFLICT DO NOTHING` in the seed file — verify before re-running).
3. Reports the IDs of the seeded business, location, services, barbers, and owner so the next agent can use them in tests.

## When to use

After `/migrate`. Before running tests that depend on the demo tenant. To restore a known-good fixture state after manual experimentation in psql.
