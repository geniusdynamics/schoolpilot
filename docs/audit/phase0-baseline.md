# Phase 0 Baseline — Ratchet Reference

Captured 2026-08-22 on branch `consolidation_align` at commit `1c9e6b9`
(before landing the ~700 in-flight modified files).

These numbers are the ratchet: `pnpm typecheck` error count and failing-test
count must never increase beyond them; every task and phase should hold or
reduce them.

## Summary

| Gate | Result |
| --- | --- |
| `pnpm typecheck` | **4,206 errors** (exit 2) |
| `pnpm test:run` | **869 failed / 791 passed** of 1,660 tests — 128 failed / 27 passed of 155 files (exit 1) |
| `pnpm build` | **Success** — vite + PWA, ~11 min |

## Gate policy (timing reality)

Full `pnpm test:run` takes ~30 min and `pnpm build` ~11 min. Running both
after every task is impractical. Policy:

- **Per task:** `pnpm typecheck` (error count vs this baseline) + targeted
  `pnpm vitest run <touched paths>` + commit.
- **Per phase boundary:** full `pnpm test:run` (failed-test count vs this
  baseline) + full `pnpm build`.

## Typecheck error breakdown (top codes)

| Code | Count | Meaning |
| --- | --- | --- |
| TS2339 | 792 | Property does not exist on type |
| TS6133 | 744 | Unused declaration |
| TS2322 | 439 | Type not assignable |
| TS7006 | 263 | Implicit any parameter |
| TS2304 | 227 | Cannot find name |
| TS2345 | 224 | Argument type mismatch |
| TS18046 | 168 | Value is of type 'unknown' |
| TS2353 | 160 | Object literal type error |
| TS2554 | 140 | Expected N arguments, got M |
| TS2308/TS2305 | 150 | Missing exports (incl. broken imports) |

Top directories: administration (631), services/database (411), finance (290),
services/dataGeneration (268), inventory (246), reports (149), nutrition (121),
settings (117), components/ui (108).

## Known test-failure pattern

Several failures stem from stringified enum references in test fixtures
(e.g. `balance_type: 'FinOpeningBalanceTypeEnum.CREDIT'` where the enum value
is expected) — consistent with the pre-phase1 id-normalization codemods.
Full triage of the 869 failures happens in Phase 4; Phase 0–3 must not grow
the count.
