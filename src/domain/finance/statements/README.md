# The statements module

A **statement** is a running account: an opening balance, then each movement in date order with the
balance after it, closing with the closing balance. This module builds the three the spec asks for
(spec 05 §6) — a **learner**, a **household** and a **sponsor** — ages what is outstanding, and reads
a learner's clearance. Its acceptance is one sentence: **the statement equals the ledger.**

```ts
import { createSqliteLedgerStore, LedgerService } from '@/domain/finance/ledger';
import { StatementService } from '@/domain/finance/statements';

const statements = new StatementService({
  ledger: new LedgerService({ store: createSqliteLedgerStore(adapter) }),
  store: repository,                 // the canonical rows the subjects are resolved from
  institutionId,
  currency: 'KES',
});

const statement = await statements.learnerStatement(learnerId, { from: '2027-01-01', to: '2027-06-30' });
statement.closingBalance;  // the ledger's balance for this learner
statement.ledger.agrees;   // true: the acceptance
statement.aging.buckets;   // current, 1-30, 31-60, 61-90, 90+ days past due
statement.clearance?.state; // cleared | on_plan | in_arrears
```

## A statement equals the ledger

The movements are derived from the ledger's **own entries** (`LedgerService.listEntries`), never by
re-deriving a balance from invoice rows. One movement per line on a **statement account**, in the
ledger's own line order:

| Ledger line | Movement kind | Amount |
| --- | --- | --- |
| an invoice's receivable line (1100) | `invoice` | the invoice's net total |
| a payment's receivable line (1100) | `allocation` | the allocation |
| a payment's learner-credit line (2150) | `credit` | the money left unallocated |
| a credit note's receivable line | `credit_note` | the note |
| an opening balance's receivable line | `opening_balance` | the carried balance |
| the mirror of a reversal | `adjustment` | the original, negated |
| a refund's refunds-payable line (2100) | `refund` | the refund — only when the caller's account set names 2100 |

The amount is `weight × (debit − credit)` for the account. **The default account set** is
`receivables (1100) +1` and `learner credit (2150) +1`: a learner's balance is the receivable *net
of the credit held*, so a credit to 2150 is already a negative `(debit − credit)`. The set is a
**policy the caller may state** (`accounts`), because the ledger's refund debit account is one (its
own README says so): `refundEntry` debits refunds payable (2100) and never releases learner credit,
so weighting 2100 into the balance would **double-count a refund of credit**. A school whose refunds
are posted differently states its own set.

Two invariants hold, and both are reported rather than assumed:

1. `statement.movementsAgree` — the movements sum to closing minus opening.
2. `statement.ledger.agrees` — the closing balance equals the ledger's weighted account balance for
   the same entries, computed through the ledger's own `deriveTrialBalance`. That is deliberately a
   **second derivation over the same entries** (per-account sums rather than running movements), so
   the two agreeing is a check and not a tautology. The service tests assert the stronger form as
   well: the closing balance equals `LedgerService.accountBalance` for each statement account.

**A discount is a detail, not a movement.** The ledger's `invoiceEntry` nets a negative invoice line
into the invoice's receivable line, so a discount is shown as a `discount` detail of the invoice
movement (and the fee lines as `fee` details) rather than counted twice. The details of an invoice or
a credit note sum to that movement's amount.

## The three kinds

| Kind | Includes | Excludes |
| --- | --- | --- |
| **learner** | every invoice, payment allocation, credit note, refund and opening balance the ledger holds for the learner | a sponsor's share — the sponsored part is the sponsor's own invoice |
| **household** | the documents of every learner under one household (`learner.household_id`), plus the household's own invoices and payments, so a household payment across siblings reaches each child | nothing of the family's: the split is shown beside the ledger balance |
| **sponsor** | the sponsor invoices issued to the sponsor and the receipts against them, named by the caller | the family residual |

A payment belongs to a learner when it names them **or** when one of its allocations clears one of
their invoices; a credit note likewise. That is what makes a one-payment-across-siblings household
statement possible.

**The household split is visible, not netted.** `Statement.split` carries, per child, the family's
residual and each sponsor's share, read from the discounts module's `planLearnerBill(...).split`
(`memberSplitFromBillPlan`) and totalled by `householdSplit`. The running balance is still the
ledger's; the split sits beside it.

## Aging

The buckets are the spec's own (spec 05 §6): **current, 1-30, 31-60, 61-90, 90+ days past due**,
counted from the **due date, not the issue date** (a due date in the future, or none, is current).

- **A missing due date** ages from the item's **issue date** by default (`missingDueDate:
  'issue_date'`, the conservative reading: an item with no stated terms is due when it is raised).
  A caller states `'current'` instead, and the summary reports the convention it used.
- **A partially paid invoice ages only the outstanding part**: `outstandingItemsFromInvoices`
  subtracts what has been allocated and what a credit note names, so a half-paid invoice contributes
  its remaining half, not the whole invoice. A paid or void invoice contributes nothing.

The aging is the one figure the ledger does not carry (the ledger holds a balance, not a per-invoice
due date), so it is derived from the canonical invoice rows. The service tests tie it back:
`aging.total` equals the receivable balance the ledger reports, which is `closing + credit` when a
credit is held.

## Clearance

`clearanceStatus` is the statement-side view of the exit-clearance question (spec 05 §6 and §7):

- a **settled** account (zero) or a **credit balance** is `cleared` — a credit balance clears,
  because the school holds the learner's money rather than the other way round;
- an amount owed is `on_plan` when a payment plan is in force and `in_arrears` otherwise;
- a **sponsor's unpaid share does not block** clearance under the default sponsor-liability policy
  (the learner owes only the residual the family invoice carries). A school whose agreement makes the
  family guarantee the sponsored part sets `sponsorBlocksClearance`, and the shortfall is reported as
  a reason.

**P3-C02 owns exit clearance as a document.** That document — the clearance certificate — should
read `StatementService.clearanceOf(learnerId)` rather than recompute a balance, so the certificate
and the statement cannot disagree. The vocabulary is the spec's own (`cleared`, `on_plan`,
`in_arrears`); this module supplies the state, P3-C02 supplies the document.

## The page

`src/modules/finance/pages/statements/StatementsPage.tsx` is routed at **`/finance/statements`** (the
route and the navigation entry are in `moduleDefinition.tsx`, and the page-reachability guard
`src/routing/__tests__/pageRouteCoverage.test.ts` passes). It offers the learner/household/sponsor
selector, a from/to range, the running balance with its discount and fee detail rows, the aging
summary, the clearance badge, the family-versus-sponsor split table, and a **print** and **CSV**
path. The CSV is built from the same `Statement` the screen renders (`statementCsv`), so a file
cannot carry a figure the screen does not.

The ledger has no canonical migration yet, so — like the accounting reports of P3-E03 — the page
takes the ledger (or the SQLite adapter it is built over) as a **prop**; the routing shell renders it
without one and the page says the ledger is not connected.

## What existed, and what this adds

The finance module already had the statement screens this module's vocabulary follows:
`StudentFinancialSummaryPage`, `VoteheadStatementPage`, `FeesDueReportPage`,
`PreviousSessionFeesPage`, and the hooks behind them (`useStudentFinancialSummary`,
`useVoteheadStatement`). Those pages read the **canonical rows** and derive billed/paid/balance per
invoice or votehead; none of them is a running account, and none ties to the ledger. The legacy
`src/modules/reports/pages/StudentVoteheadStatementPage.tsx` is a copy the owner is deciding whether
to retire, and was not touched.

What this adds is the running account itself (opening, movements with a balance after each, closing),
the tie that proves it equals the ledger, the three subject scopes, the aging buckets and the
clearance rule — plus the page that shows them.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | the vocabulary: the statement accounts, the movements and their detail, the aging, the clearance, the household split, the statement, and the ports |
| `errors.ts` | `StatementError` and its codes |
| `movements.ts` | the movements derived from the ledger's entries, and the weighted account balance the tie uses |
| `runningBalance.ts` | the ordering, the opening and closing balances, and what each kind totalled |
| `aging.ts` | the buckets, the due-date rule, the missing-due-date convention, and the outstanding part of an invoice |
| `clearance.ts` | the clearance rule |
| `split.ts` | the household split, read from the discounts module's bill plan |
| `statement.ts` | `buildStatement`, the pure assembly and the tie |
| `service.ts` | `StatementService`: the ledger and canonical reads, and the three subjects |
| `csv.ts` | `statementCsv` |
| `index.ts` | the public API; a caller imports from here |

## The tests

| File | Guards |
| --- | --- |
| `__tests__/aging.test.ts` | the hand-computed buckets, the due-date rule, the missing-due-date convention, the outstanding part of a partly paid invoice, the boundaries |
| `__tests__/clearance.test.ts` | the rule: settled, credit, on plan, in arrears, and a sponsor's shortfall under both policies |
| `__tests__/statement.test.ts` | the running balance and its two invariants, the discount detail, a credit note, an opening balance, a reversal, the household split, the CSV |
| `__tests__/service.test.ts` | the statement-equals-ledger tie for each kind against **real SQLite** (`LedgerService.accountBalance`), the aging tie, the clearance |

## Not here

- **No sponsor invoice or sponsor receipt entity.** The platform models neither, so a sponsor's
  documents are named by the caller (`SponsorSubject.documents`). The split billing of P3-B04 issues
  the sponsor invoice; where that document is stored is not modelled. The page says so when no
  sponsor documents are supplied. This is reported, not worked around by inventing an entity.
- **A refund is a ledger policy, not a fact.** The ledger's `refundEntry` debits refunds payable
  (2100) and does not release learner credit (2150), and its own README flags the debit account as a
  policy. The default account set therefore **excludes 2100**: a refund does not move the running
  account, and weighting 2100 in would double-count a refund of credit. A school whose refunds
  release credit (or a deposit liability) states its own account set; the refund is still visible in
  the ledger and in the accounting reports.
- **The aging is derived from the canonical rows.** A per-invoice due date is not in the ledger;
  the ledger carries a balance. The tie back to the ledger is asserted in the tests.
- **No new dependency.** No charting and no PDF library: the page prints with the repository's own
  `printReport` and exports CSV with a Blob.
