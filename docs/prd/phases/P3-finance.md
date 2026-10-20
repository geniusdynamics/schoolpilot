# Phase 3 — Finance v2

**Goal:** a bursar can configure fees, bill a whole school, receive cash/bank/mobile money,
reconcile, produce statements and accounts — exactly, to the minor unit
([spec 05](../../specs/multi-curriculum-platform/05-finance.md)).

**Depends on:** P1 (repositories, sequences basis) · **Runs in parallel with:** P2, P4 · **Estimate:** 5–6 weeks.

## Design commitments
- `Money` in integer minor units with per-currency precision; no float arithmetic; no maximums.
- Invoices, payments and journal lines are immutable; corrections are reversals/credit notes.
- Billing runs are idempotent with a preview; proration rules explicit.
- Payment providers are plug-ins behind one interface; webhooks idempotent; unmatched items go to a suspense queue.
- Maker-checker for fee schedules, refunds, write-offs; segregation of duties enforced by scoped permissions.

## Parallelism
Lanes A (money/ledger/sequences), B (fee configuration), C (billing), D (payments/integrations), E (statements/accounting) each own `src/domain/finance/<area>/**` and matching `src/modules/finance/pages/<area>/**`, so W3–W4 run 4–5 implementers concurrently.

## Exit evidence
Fixture school of 1,000 learners: preview ≤ 30 s, post ≤ 2 min; every learner balance equals ledger; M-Pesa sandbox auto-match ≥ 95 %; finance golden paths green.

## Lanes

| Lane | Scope |
| --- | --- |
| A | Money & ledger foundations |
| B | Fee configuration |
| C | Billing & documents |
| D | Payments & integrations |
| E | Statements, collections & accounting |
| Q | Quality |

## Exit criteria

1. Bursar bills a 1,000-learner school in ≤ 2 min and every balance reconciles
2. M-Pesa sandbox C2B/STK flows auto-match ≥ 95 % of test payments
3. Statements, aging, reminders, refunds, credit notes and accounting reports correct against fixtures
4. GP-1 finance steps and GP-4 billing steps green
5. `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written.

## Waves

| Wave | Focus | Tasks (run in parallel) |
| --- | --- | --- |
| `P3-W1` | Money type and sequences | P3-A01, P3-A03 |
| `P3-W2` | Ledger, fee items, allocation engine | P3-A02, P3-B01, P3-D02 |
| `P3-W3` | Fee schedules, cashier, reconciliation, accounting reports | P3-B02, P3-D01, P3-D04, P3-E03 |
| `P3-W4` | Subscriptions, discounts, billing runs, M-Pesa, receipts | P3-B03, P3-B04, P3-C01, P3-D03, P3-D05 |
| `P3-W5` | Adjustments and statements | P3-C02, P3-E01 |
| `P3-W6` | Collections, golden paths, controls; phase exit | P3-E02, P3-Q01, P3-Q02 |

## Tasks

Snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**. Later-phase tasks are intentionally
coarser than P0: each is refined into sub-tasks (same id + suffix, e.g. `P2-C01a`) by the orchestrator at the start of its wave,
after the previous phase's learnings are logged.

#### P3-W1 — Money type and sequences

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P3-A01` | A | Money type (minor units, currency table, largest-remainder split, formatMoney) replacing formatKES | — | M | UGX 0 decimals; no float arithmetic |
| `P3-A03` | A | Named sequences (admission, invoice, receipt) with scopes, formats, device blocks for offline | — | M | Unique, never reused |

#### P3-W2 — Ledger, fee items, allocation engine

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P3-A02` | A | Posting engine: double-entry journal from invoices/payments/refunds/credit notes; immutable, reversal-only | P3-A01 | L | Trial balance always balances |
| `P3-B01` | B | Fee items / vote heads with GL mapping, priority, funding source (incl. capitation) | P3-A01 | M | CRUD + validation |
| `P3-D02` | D | Allocation engine (oldest-first, vote-head priority, proportional, manual, household split, credits) | P3-A01 | M | Property tests: sum invariants |

#### P3-W3 — Fee schedules, cashier, reconciliation, accounting reports

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P3-B02` | B | Fee schedule matrix editor (levels × residence × category × campus), versioning, maker-checker approval, copy with uplift | P3-B01 | L | Spec 05 §2.2 example reproducible |
| `P3-D01` | D | Payments core: cashier screen (keyboard flow ≤ 20 s), channels, cheque states, cashier sessions/Z-report | P3-A02, P3-A03 | L | Spec 05 §5.2 behaviour |
| `P3-D04` | D | Bank & mobile-money statement import and reconciliation | P3-D02 | M | CSV/OFX import; match/unmatch |
| `P3-E03` | E | Accounting reports: cash/bank books, trial balance, I&E, balance sheet, budget vs actual, period close, exports | P3-A02 | L | Reports tie to journal |

#### P3-W4 — Subscriptions, discounts, billing runs, M-Pesa, receipts

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P3-B03` | B | Subscriptions (transport, lunch, clubs, trips) and installment plans | P3-B02 | M | Subscriptions bill in runs |
| `P3-B04` | B | Discounts, bursaries, sponsors with split billing and budgets | P3-B02 | L | Sibling discount and sponsor split reproduce fixtures |
| `P3-C01` | C | Billing runs v2: preview with reasons, post, idempotent re-run, proration on enrolment changes, ad-hoc charges, opening balances | P3-B02, P3-A02, P3-A03 | L | 1,000 learners preview ≤ 30 s, post ≤ 2 min |
| `P3-D03` | D | PaymentProvider interface + M-Pesa Daraja plug-in (C2B, STK push, B2C refunds), webhook idempotency, suspense queue | P3-D01, P3-D02 | L | Sandbox flows auto-match |
| `P3-D05` | D | Receipt templates (80 mm thermal, A5, A4) and e-receipts with verification link | P3-D01 | M | Prints on thermal profile |

#### P3-W5 — Adjustments and statements

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P3-C02` | C | Credit notes, refunds (maker-checker), write-offs, exit clearance | P3-C01 | M | Balances explainable |
| `P3-E01` | E | Statements (learner, household, sponsor), aging buckets, clearance status | P3-C01, P3-D02 | M | Statement equals ledger |

#### P3-W6 — Collections, golden paths, controls; phase exit

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P3-E02` | E | Reminders & collections: schedules, templates, pay links, promise-to-pay | P3-E01 | M | Respects quiet hours and opt-outs |
| `P3-Q01` | Q | Finance golden paths and 1,000-learner performance test in CI | P3-C01, P3-D01, P3-E01 | M | Green; within budgets |
| `P3-Q02` | Q | Segregation-of-duties permissions and audit trail review | P3-C02 | S | Spec 05 §11 matrix enforced |
