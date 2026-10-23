# The billing run (v2)

A **billing run** prices a period from the fee-schedule versions in force and writes one invoice per
learner, in one transaction, with the journal entries posted. This module composes the frozen
primitives rather than re-deriving anything: the schedule matrix resolves the cell, the money module
multiplies and rounds, the sequences module issues the numbers, and the ledger posts the entries.

```ts
import { BillingRunService } from '@/domain/finance/billing';

const service = new BillingRunService({ store: repository, actor: currentUserId });

const preview = await service.preview({ scope: { periodId } });
// preview.lines[i].reasons — why this learner is billed what they are billed
// preview.skips — why a learner in scope was not billed, by name

const outcome = await service.post({ scope: { periodId } });
// outcome.invoicesCreated, outcome.ledgerEntries, outcome.replayed
// outcome.invoices — one entry per invoice written: the learner, the number the sequence issued,
// and whether it is supplementary to an invoice the learner already held
```

## What already existed, and what this module changes

The finance module already carried a billing run: `canonicalFinanceService.generateInvoices` in
`src/modules/finance/services/`, the `BillingRunPanel` that both fee-structure entry points mount,
and the legacy `src/domain/finance/billingService.ts` (fee *templates*, not schedules). The run v2
reuses all three rather than building a parallel system:

- **`generateInvoices` is left in place and unchanged.** It is the v1 canonical run: it prices the
  published schedules, writes one invoice per learner and reports who was already billed. Its
  behaviour is still covered by `canonicalFinanceService.test.ts`.
- **`BillingRunPanel` is extended, not replaced.** It now calls `BillingRunService`, so the existing
  screens (`/finance/invoice-generation`, the fee-configuration hub's structures tab) gained the
  reasons, the exceptions panel, one-off charges, opening balances and the real post. The panel's
  pickers and its `compact` prop are unchanged.
- **A dedicated route** `/finance/billing-runs` hosts the same panel:
  `src/modules/finance/pages/billing/BillingRunsPage.tsx`, named by the finance module definition,
  so `src/routing/__tests__/pageRouteCoverage.test.ts` reaches it.

What v1 could not do, and v2 does: it re-derived the price per learner through a per-learner
`resolveForBilling` (two queries per learner), it read at most the first 50 rows of every table
(the repository's default page), it never wrote a journal entry, it had no run identity, and it had
no proration, ad-hoc charges or opening balances.

## The preview, and the reasons a bursar reads

`preview` reads and writes nothing. For every learner in scope it reports:

- **the schedule version and the cell**: `priced from 2027 Term 1 Fees v2 (published), cell level
  …, residence day, category …, campus …` — the exact output of the matrix module's `resolveCell`,
  so a bursar reads the same resolution the run priced from;
- **each fee item**: its vote head, its amount, and the proration that scaled it;
- **each one-off charge** and **each opening balance**, with the reason it is there;
- **each line that is not billed this period** and why (a `one_off_at_admission` line for a
  continuing learner, a `per_year` line outside the year's first billing period, a line prorated to
  nothing, a fee item the learner's posted invoice already bills).

**The skips are named**, never folded into an "unmatched" count:

| Code | Meaning |
| --- | --- |
| `no_enrolment` | no enrolment this academic year covers the period |
| `not_enrolled_in_period` | the enrolment's dates fall outside the period |
| `no_schedule` | no approved or published version applies (the detail names the rejection) |
| `cell_unresolved` | the matrix cannot resolve the learner's cell: ambiguous, undeclared, unknown or unpriced — never guessed |
| `already_billed` | the learner's live invoice for the period already bills every item this run would add |
| `zero_total` | every applicable line prorated to nothing |
| `out_of_scope` | a charge or opening balance names a learner outside the run's cohort |

### A dimension the learner does not name

A cell is level × residence × fee category. An enrolment names its level and programme and the learner
names their residence, but **nothing in the app names a fee category yet**: the admission form does not
collect one. A dimension the address omits is resolved when the schedule declares exactly one value for
it, and refused with a stated reason when it declares none (`cell_dimension_undeclared`) or several
(`cell_ambiguous`). A schedule that declares one category therefore prices every learner whose enrolment
names none — the school prices one category, so that is the one they are in — and only a category the
learner *names* can be one the schedule does not price.

## The post: one transaction

`post` opens **one** transaction on the canonical repository and does everything inside it: the
invoice rows, their lines, the sequence numbers, the journal entries and the run's own record. A
failure part-way through rolls the whole run back — no invoice, no line, no entry, no run record —
so a run can be retried once its cause is fixed. The test `posts nothing when a learner fails`
proves it by making the last learner's line break a foreign key.

**The transaction is the repository's**, and the ledger's and the sequences' stores are bound to it
through a small handle (`transactionAdapter`) rather than opening transactions of their own, which
the adapter refuses. `ensureRunSchema` applies `LEDGER_DDL`, `SEQUENCE_DDL` and `AUDIT_DDL` through
the same transaction — every statement is `CREATE ... IF NOT EXISTS` — because the canonical registry
models neither journal entries nor sequence counters and no migration owns them yet. This is the
same posture `useAccountingReports` takes for the ledger.

**Invoice numbers come from the sequences module**, the `invoice` sequence
(`INV/{YYYY}/{TERM}/{SEQ:6}`, scoped to the institution, the year and the period's term). Nothing
here invents a number, and the store's unique index refuses a repeat.

**The schedule version is not a column, and that is reported rather than papered over.** Neither
`invoice` nor `invoice_line` has a `fee_schedule_id` column and both are `strictObject` schemas with
no `attributes` field, so neither can carry the version:

- the **preview** carries it (`BillingPreviewItem.scheduleId` / `scheduleVersion`), which is the
  deliverable a bursar reviews;
- the **invoice line's description** carries it for a human (`Tuition (2027 Term 1 Fees v2)`);
- the **run's audit row** carries the pins (`[{feeScheduleId, name, version, status}]`).

**Gap:** recording the version on the line itself needs one additive column on `invoice_line`
(`fee_schedule_id`) plus a migration; that is a schema change outside this task's files and is not
made silently here.

## Idempotency

The run identity is `billingRunKey`, a 64-bit FNV-1a digest of exactly four things:

1. the **period**;
2. the **schedule versions in force** it prices from, `feeScheduleId@version`, sorted;
3. the **cohort** — the ids of the learners the run considered, sorted and digested. The cohort is
   the *resolved* set, not the filter that produced it, so admitting five learners and re-running is
   a different run, which is what lets the second run bill only the five (spec 05 §4.3);
4. the **one-off inputs** — the ad-hoc charges and opening balances, sorted and digested, so a run
   that carries a new fine is a different run rather than a replay that drops it.

A post records the identity as an `audit_event` row (entity `billing_run`), the convention the
ledger uses for its own journal entities. Posting the same run again **replays** it: the recorded
result comes back, `replayed: true`, and nothing is written. The proof is in
`__tests__/service.test.ts`: the second post reports 0 invoices, 0 journal entries and 0 amount, and
the learner's invoice count is unchanged.

A learner who is **already billed** and gains a missing item does not have their invoice edited — a
posted invoice is immutable, so the run writes a **supplementary invoice** holding only the missing
items. That is the "re-running adds only missing lines" of the spec, expressed without editing.

## Proration on enrolment changes

A learner who joins or leaves mid-period is billed pro rata by the rule the **schedule line** names
(`fee_schedule_line.proration_rule`), against the days the learner was billable inside the period:

| Rule | What it bills |
| --- | --- |
| `full` | the whole amount |
| `none` | nothing |
| `pro_rata_days` | `days enrolled / days in the period`, both counted inclusively |
| `pro_rata_weeks` | `whole weeks enrolled / whole weeks in the period` |
| `from_half_term` | the whole amount when the learner joined on or before the period's midpoint, half after it |

**Rounding is `half_up` and is explicit**: every amount goes through the money module's
`multiplyRational(amount, numerator, denominator, 'half_up')`, so the arithmetic is in `bigint` and
only the final fraction of a minor unit is rounded. `PRORATION_ROUNDING` is the one rule, and
`__tests__/proration.test.ts` asserts the exact amounts: `6,000.00 × 89/120 = 4,450.00`,
`5,500.00 × 89/120 = 4,079.17` (not a whole minor unit, rounded half up), and
`6,000.00 × 12/17 weeks = 4,235.29`.

**A schedule version that changes mid-period does not re-price anything already billed.** A
published version is immutable and a posted invoice is immutable, so:

- a learner billed from v1 keeps the v1 amounts on that invoice, whatever is published later;
- the new version applies to the items a later run adds, on a supplementary invoice;
- the run identity changes with the version pins, so the later run is a *different* run, not a
  replay — and the learners it finds nothing missing for are reported `already_billed`.

A correction to what was billed is a credit note or an adjustment invoice (P3-C02), never an edit.

## Ad-hoc charges

A one-off charge (a fine, a trip, a damage fee) is `AdHocChargeInput`: a learner, a fee item, a
description, an amount and a kind (`fine` / `adjustment` / `other`). It is visible in the preview
with its reason, and it becomes an `invoice_line` of the learner's invoice carrying **its own fee
item**, so the ledger posts it to that item's own GL account rather than to tuition. A learner who
has no schedule line but has a charge is still billed: the charge stands alone on an invoice.

A charge is identified by its **description**, so a re-run does not bill the same fine twice; two
identical fines for one learner must be named apart. That is stated rather than guessed at.

## Opening balances

A learner arriving from a previous system carries an `OpeningBalanceInput`: an amount, a side
(`debit` = the learner owes) and an as-of date. It is billed as an **invoice whose single line is
`kind = opening_balance`** (spec 05 §4.6's migration line, so the learner's statement and balance
show it) and **posted through the ledger's `openingBalanceEntry`**, not `invoiceEntry`.

**Why that path:** an opening balance is not revenue. `invoiceEntry` would credit the fee item's
revenue account and overstate the period's income for a balance the school merely carried forward;
`openingBalanceEntry` debits receivables against **opening-balance equity** (3000), which is the
correct double entry for a migrated balance. The invoice carries the line, the entry carries the
right accounts, and the test asserts both sides (`1100` debited, `3000` credited).

## Performance, measured

`__tests__/performance.test.ts` seeds 1,000 learners with enrolments and a published schedule of
four fee items, then measures the preview and the post and prints both durations. On the author's
machine:

```
[billing perf] 1000 learners: preview 0.55s (budget 30.00s), post 21.05s (budget 120.00s)
               — 1000 invoices, 1000 journal entries
[billing perf] idempotent re-run: 0.87s, 0 invoices
```

**The bottleneck is the canonical repository's own write path** (~4–5 ms per `create`: zod
validation, the invariant guards and an audit row), not a query per learner. The run issues no query
per learner at all: the learners, their enrolments, the schedule versions with their cells, the fee
items and the period's invoices are read once, in pages of 500, and indexed in memory; the cell is
resolved by the matrix module's own pure `resolveCell`. Two things were changed to get there, and
both are worth naming:

- **every read pages.** The repository caps a page at 500 rows, so a single `list` silently returns
  a fraction of a school's learners. `readAll` follows `hasMore` until the rows run out. (The v1 run
  read one default page of 50 and billed at most 50 learners — a real defect, not a nuance.)
- **the cell is resolved in memory, once per learner**, from the header and lines loaded once per
  version, rather than through a per-learner `resolveForBilling` that fetches the version and its
  lines again for every learner.

If the machine cannot hit the budget, the test reports the measured figure rather than relaxing the
number.

## The page

`src/modules/finance/pages/billing/BillingRunsPage.tsx` — the dedicated route, hosting the extended
`BillingRunPanel`:

- the period, schedule and level pickers (the same `EntityPicker`s the panel always had);
- a collapsible editor for one-off charges (learner, vote head, description, amount, kind) and
  opening balances (learner, amount, side, as-of date);
- **Preview**, which renders per learner the invoice they would get, the amount, and the reasons —
  the schedule version, the cell, each item, each proration, each charge;
- an **Exceptions** panel grouping the skips by code with the learner and the detail;
- the **run identity** and the versions priced from;
- **Post the run**, which reports the invoices written, the journal entries posted and the amount
  added, and says plainly when a run was already posted.

Reachability: the page is named by the route entry `/finance/billing-runs` in
`src/modules/finance/moduleDefinition.tsx`; `pageRouteCoverage.test.ts` passes.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | the vocabulary: the scope, the preview with its items and skips, the one-off inputs, the outcome, the store port |
| `errors.ts` | `BillingError` and its codes |
| `proration.ts` | the proration rules over the money module, and the one rounding rule |
| `identity.ts` | the run identity: what it is derived from, and the digest |
| `facts.ts` | loading what a run reads, once and in pages, indexed for the per-learner loop |
| `plan.ts` | the per-learner plan: the cell, the proration, the one-off items, the reasons, the skips |
| `write.ts` | the writes: the transaction-bound ledger and sequence stores, the invoices, the postings, the run's audit row |
| `service.ts` | `BillingRunService`: `preview` and `post` |
| `index.ts` | the public API; a caller imports from here |

## The tests

| File | Guards |
| --- | --- |
| `__tests__/proration.test.ts` | every rule, the exact amounts, the rounding rule, the clipping, and the description |
| `__tests__/service.test.ts` | the preview and its reasons, each skip, the post with numbering and journal entries, transactionality, idempotency and the replay, the supplementary invoice, proration on a join and a departure, ad-hoc charges, opening balances |
| `__tests__/performance.test.ts` | 1,000 learners: the measured preview and post against the acceptance |
| `pages/billing/__tests__/BillingRunsPage.test.tsx` | the page previews, shows the reasons, the exceptions panel and the run identity, and writes nothing |

Everything that persists runs against a real SQLite database through the repository harness; there
is no storage double in the service tests.
