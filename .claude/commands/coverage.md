---
description: Run Vitest with coverage; raise any lib/ module below 80% (and lib/pricing/ below 100%)
---

# /coverage

Runs the full Vitest suite with coverage collection and enforces the project's coverage gates.

## Gates

- `apps/web/lib/` — statements, branches, functions, lines all ≥ 80%
- `apps/web/lib/pricing/` — 100% (money math is critical)
- New files in `lib/` introduced in the current diff must come with tests that exercise them

## What it does

1. Runs `pnpm --filter web test:coverage` (Vitest with V8 coverage).
2. Parses the coverage summary.
3. For each `lib/` module below its gate:
   - Reads the source file.
   - Hands it to the **test-runner** subagent with a brief:
     > Module `<path>` is at `<percent>%` coverage (gate `<gate>%`). Identify uncovered branches/lines from the coverage report (`apps/web/coverage/coverage-final.json`) and write failing tests for them. Run, confirm RED, then confirm GREEN once they pass (they should pass immediately if the code is correct — if not, fix the code, not the test).
4. Re-runs coverage. Stops when all gates are met or after two iterations without progress.
5. Reports: per-module coverage delta, modules still below gate (if any), HTML report path (`apps/web/coverage/index.html`).

## When to use

Before commit. Before merging a feature branch. After any non-trivial change to `lib/`.

## Refuse

Do not weaken a gate to make the suite pass. If a module legitimately doesn't need 80% (e.g. a thin type-only file), exclude it explicitly in `vitest.config.ts` with a comment explaining why — never lower the global threshold.
