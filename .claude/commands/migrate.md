---
description: Reset local Supabase, apply migrations, regenerate TypeScript types
---

# /migrate

Rebuilds the local Postgres database from `supabase/migrations/` and regenerates the TypeScript types that the web code depends on.

## What it does

1. Ensures the local Supabase stack is up (`supabase status`); starts it if not.
2. Runs `supabase db reset` — this drops the public schema, replays all migrations in order, and applies `supabase/seed.sql`.
3. Regenerates TypeScript types: `supabase gen types typescript --local > apps/web/lib/db/database.types.ts`.
4. Reports: number of migrations applied, last migration timestamp, lines in the generated types file.

## When to use

After adding or editing any `supabase/migrations/*.sql` file. After pulling changes that touched migrations. Before `/test` and `/e2e` if schema may have drifted.

## Refuse

Do not edit `apps/web/lib/db/database.types.ts` by hand — it is generated. If types look wrong, fix the underlying migration and re-run `/migrate`.
