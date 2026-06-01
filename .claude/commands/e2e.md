---
description: Run Playwright E2E tests (parameterized over ar and en locales)
---

# /e2e

Runs the Playwright end-to-end suite in `apps/web/tests/e2e/`. Every journey is parameterized over `['ar', 'en']` and the suite includes the concurrent-booking-rejection scenario.

## What it does

1. Ensures the local Supabase stack is up and seeded (`/migrate` + `/seed` if needed).
2. Starts the Next.js dev server in the background if it isn't already on `:3000`.
3. Runs `pnpm --filter web test:e2e`.
4. On failure, hands artifacts (screenshots, traces, videos under `apps/web/playwright-report/`) to the **test-runner** subagent for triage.
5. Reports: per-locale results, total pass/fail, and the path to the HTML report.

## Must verify

- `<html dir>` attribute matches the locale on every journey (`rtl` for `ar`, `ltr` for `en`).
- Guest booking completes in both locales.
- Concurrent-booking scenario: exactly one success + one friendly "slot no longer available" error.
- All visible text comes from `messages/{locale}.json` (no English bleed in `ar`, no Arabic bleed in `en`).

## When to use

Before any release candidate. After any change to the booking flow or the locale switcher. Before commit if E2E coverage is the safety net for a non-trivial change.
