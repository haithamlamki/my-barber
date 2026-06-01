---
description: Run Vitest unit + integration tests; fix failures TDD-style
---

# /test

Runs the project's Vitest unit and integration test suite for `apps/web/tests/unit/` and `apps/web/tests/integration/`.

## What it does

1. Ensures the local Supabase stack is up (`supabase status`); if not, starts it.
2. Runs `pnpm --filter web test` (Vitest, no E2E).
3. If any test fails, hands the failure list to the **test-runner** subagent with this brief:

> A Vitest run failed. Read the failure list, isolate each failure, and fix it the TDD way: confirm the test is testing the right behavior (don't weaken the test to make it pass), then patch the implementation. If a test itself is wrong, fix the test and explain why in the diff message. Do not skip or quarantine a test except as a last resort, and only with a follow-up task created.

4. Re-runs the suite until green or until two iterations have passed without progress (then stop and report).
5. Reports: passed / failed / skipped / todo counts and total time.

## When to use

After any change to `lib/`, server actions, or migrations. Before `/coverage`. Before `/e2e`. Before commit.

## Refuse

Do not pass `--bail`. Do not pass `--no-coverage` to hide coverage drops — use `/coverage` separately if you want detail.
