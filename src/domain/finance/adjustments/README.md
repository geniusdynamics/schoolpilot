# The adjustments module

Credit notes, refunds with a maker-checker approval, write-offs and their recovery, exit clearance,
and the balance explanation that makes a parent's complaint answerable. The module **composes the
frozen primitives** rather than re-deriving anything: the ledger derives and posts the credit note
and the refund, the sequences module issues the numbers, the allocation engine places a credit
against an invoice, the workflow engine's guard decides the maker-checker moves, and the canonical
registry holds the documents.

```ts
import { AdjustmentsService } from '@/domain/finance/adjustments';

const adjustments = new AdjustmentsService({ store: repository, actor: currentUserId });

const note = await adjustments.issueCreditNote({
  learnerId, amount: money(100_000), reason: 'Scholarship', issueDate: '2027-02-10',
  applyToInvoiceId: invoiceId,               // or omit it to leave a credit balance
});

const refund = await adjustments.requestRefund({
  learnerId, amount: money(50_000), reason: 'Deposit refund', channel: 'mobile_money',
});
await adjustments.approveRefund({ refundId: refund.refund.id, actor: headTeacher });

const balance = await adjustments.explainBalance(learnerId);
balance.agrees;   // the documents sum to the ledger's balance
```

## What already existed, and what this module adds

The finance module already carried the credit-note and refund **entities** and screens:
`credit_note` and `refund` in the canonical registry (`src/domain/schema/finance.ts`), the
`FeeAdjustmentsPage` that raises and posts a credit note, the `CreditNoteDialog` the fines and
opening-balance screens mount, the `postCreditNote`/`reversePayment` helpers in
`canonicalFinanceService.ts`, and the `StudentClearancePage` under `administration` (which reads its
requests from the legacy `student_clearance_requests` collection and says so in a `GAP(P1-E01)`
comment). None of them posted to the ledger, ran a maker-checker approval, wrote a balance off or
explained a balance.

This module is the domain half that was missing. It reuses all of the above rather than building a
parallel system, and adds the documents the registry does not model — a write-off, its recovery, a
clearance and a credit-note application — which it keeps in the repository's own `audit_event` table,
the convention the billing run of P3-C01 uses for its own record.

## Credit notes

A credit note reduces what a learner owes, against **a stated fee item or the account as a whole**,
with a reason and the invoice it corrects.

- **Numbering.** `CRN/{YYYY}/{SEQ:6}`, from the sequences module's `credit_note` sequence, scoped to
  the institution and the year. Nothing here invents a number, and the store's unique key refuses a
  repeat.
- **Posting.** Through the ledger's own `creditNoteEntry`: it credits receivables and debits the
  revenue account of every fee item the note names, or fee revenue (4000) as a whole when it names
  none. The note's lines must sum to it, which the ledger checks.
- **Application.** A note with an `applyToInvoiceId` is applied through the allocation engine
  (`oldest_first`) to that invoice's outstanding lines; the plan is recorded as a
  `credit_note_application` document, so the invoice's outstanding balance falls while the ledger's
  receivable was already reduced by the note. A note **without** one is left as a **credit balance**
  for the learner (`remainingCredit`), which a later plan can consume.

Both branches are tested (`__tests__/creditNotes.test.ts`), including the leftover when the note
exceeds the invoice.

## Refunds with a maker-checker approval

A refund is money going back out, so it needs a second pair of eyes (spec 05 §5.4 and §11). The
approval is a workflow, not a hand-rolled status column: `finance.refund_approval`, whose states are
**exactly the canonical `refund.status` vocabulary**, so the state a module already reads is the
state the workflow moved.

```
requested ──approve──▶ approved ──pay──▶ paid
    └─────reject (reasoned)────▶ rejected
```

- A **maker** requests it: the refund row is created `requested`, a `payment_voucher` number
  (`PV/{YYYY}/{SEQ:6}`) is issued, the payout channel is recorded, and **nothing is posted**.
- A **checker** approves it. The engine's guard owns the roles (the `head_teacher`/`administrator`
  approval role of spec 05 §11) and the transition; the module adds the one rule the engine has no
  concept of: **a maker may not approve their own request** (`assertMakerIsNotDecider`, tested).
  On approval the payout posts through the ledger's `refundEntry`, the channel deciding where the
  money leaves (cash, bank, mobile-money clearing, …).
- A **checker rejects** it, and a rejection **needs a reason** — the engine's guard refuses one
  without. **What a rejected request leaves behind: nothing posted, and the request recorded** as
  `rejected`. That is tested.

`availableRefundMoves` does not offer the maker the decision they may not make.

## Write-offs

An uncollectable balance is written off with a reason, and approved the same way above a threshold.

- **Threshold.** `writeOffApprovalThresholdMinor`, in minor units of the institution currency.
  **The default is zero: every write-off is approved by a second pair of eyes.** A school raises it
  to let a bursar write off a small balance directly; at or below it the write-off posts immediately.
- **Account.** The posting debits **`5100 Bad debts written off`** (an expense) and credits
  **`1100 Fee receivables`**. A write-off is a loss, not revenue given back, so debiting an expense
  and crediting the receivable removes the debt and records the loss in the period it is recognised
  (spec 05 §8's "automatic double entry from … write-offs").
- **The debt is never deleted.** The write-off is a document; the balance stays explainable as the
  write-off that removed it (`explainBalance` lists it).
- **A recovery is a new posting, not a reversal.** `recoverWriteOff` debits the receivable again and
  credits **`5101 Bad debts recovered`**, so the debt is owed again and the write-off stays in the
  history; the test asserts the write-off's entry is still there and un-reversed.

The maker-checker rule applies to a write-off exactly as to a refund: a maker may not approve their
own, and a rejection needs a reason.

## Exit clearance

A learner leaving is cleared when the stated conditions hold (spec 05 §7, spec 04 §6):

1. the **balance is settled or written off** (nothing outstanding), and
2. **no library book** is still out, and
3. **no school property** is still out.

Clearance is a **document with a state**, `finance.clearance`: `pending → cleared | refused`. The
rule is carried by the engine's **transition condition**, not by a check written beside it, so the
guard refuses a `clear` of a learner who still owes; a `refuse` needs a reason. The document is kept
in the audit trail, so the sign-off survives.

**Compatibility with P3-E01.** The rule is a **pure exported function**, `evaluateClearance(facts)`,
and the states and assessment are exported types. P3-E01's statement-side clearance status must read
the same function — or the same predicate — so the status a statement shows and the certificate a
bursar issues cannot disagree. This module does not edit P3-E01's files; the shared surface is
`evaluateClearance`, `ClearanceAssessment`, `ClearanceCheck` and `ClearanceState`.

## Balances explainable — the acceptance

`explainBalance(learnerId)` returns the learner's balance as **a list of documents summing to it**,
and the same balance read back from the ledger:

```ts
const explanation = await adjustments.explainBalance(learnerId);
// explanation.documents — an invoice, a credit note, a payment, a write-off, an opening balance
// explanation.balance      — the sum of the documents
// explanation.ledgerBalance — the receivable + learner-credit lines of the learner's own entries
explanation.agrees;        // balance === ledgerBalance — the acceptance
```

A document's amount is its **signed effect** on what the learner owes: an invoice adds, a credit
note, a write-off and a payment reduce, a recovery adds the debt back. The ledger's balance is the
**receivable (1100) and learner-credit (2150) lines of the learner's own journal entries** — an
invoice debits the receivable, a credit note, a write-off and an allocated payment credit it, and an
unallocated payment credits the learner-credit liability, which reduces what the learner owes just
the same. `__tests__/balance.test.ts` asserts the two agree for a debt, for a credit, for an opening
balance, after a recovery, and as at an earlier day.

**Refunds are not in the explanation**, and that is deliberate: the acceptance names the documents a
balance is traceable to (an invoice line, a credit note, a payment, a write-off, an opening balance),
and a refund settles a payable rather than the fee balance (the ledger's `refundEntry` debits refunds
payable and credits the payout channel, touching neither the receivable nor the learner credit).

## The module

| File | Holds |
| --- | --- |
| `types.ts` | the vocabulary: the credit note and its application, the refund and its decision, the write-off and its recovery, the clearance document, the balance explanation, the store port |
| `errors.ts` | `AdjustmentError` and its codes |
| `definitions.ts` | the three workflow definitions and the maker-may-not-decide rule |
| `support.ts` | the transaction handle, the DDL, the chart of accounts, the two bad-debt accounts, the audit-trail documents |
| `balance.ts` | the balance explanation and the ledger-side balance |
| `service.ts` | `AdjustmentsService` and the pure `evaluateClearance` rule |
| `index.ts` | the public API; a caller imports from here |

## The tests

Everything that persists runs against a real SQLite database through the repository harness; there
is no storage double anywhere in the suite.

| File | Guards |
| --- | --- |
| `__tests__/creditNotes.test.ts` | the number, the posting against a fee item and the account as a whole, the refusal of broken lines, the application and the leftover credit balance |
| `__tests__/refunds.test.ts` | the request posting nothing, the maker cannot approve their own, the role guard, the approval posting the payout, the reasoned rejection posting nothing, the available moves, the channel |
| `__tests__/writeOffs.test.ts` | the request awaiting approval, the maker-checker rule, the reasoned rejection, the bad-debt posting, the threshold, the debt staying explainable, the recovery as a new posting |
| `__tests__/clearance.test.ts` | the rule (settled, written off, a book out), the document's states, the refusal of a clear who still owes, the reasoned refusal |
| `__tests__/balance.test.ts` | the documents summing to the ledger's balance, a debt, an opening balance, a recovery, the as-of day |

## Known limits

- **The ledger's `SourceDocumentKind` is a closed union.** It has `invoice`, `payment`, `refund`,
  `credit_note` and `opening_balance`, but no `write_off` or `recovery`. The write-off posts under
  the nearest kind, `credit_note` (a credit against the receivable), and the recovery under
  `payment`; the narration and the document type name them plainly. Adding the two variants to the
  frozen ledger's union is the clean fix and is outside this task's files.
- **A write-off has no canonical entity.** Its state lives in the module's own audit-trail document,
  and the workflow's transitions are recorded in the repository's `audit_event` trail. Adding a
  `write_off` entity to the registry would let the engine's repository store host it directly.
- **A clearance has no canonical entity either.** The same posture: the document is kept in the
  audit trail. The legacy `student_clearances` collection is not canonical.
- **A write-off's number comes from the `credit_note` sequence** (`CRN/…`), because the sequences
  catalogue has no `write_off` sequence and it is frozen. A `write_off` sequence is the clean fix.
- **The refund's payout channel is not a canonical column.** `refund` has no `channel`, so the
  channel the request names is recorded in a `refund_request` audit-trail document and read back at
  approval.
- **The ledger's `refundEntry` does not move learner credit to refunds payable.** It debits refunds
  payable and credits the payout channel, which is the ledger's own stated policy gap; this module
  does not paper over it.
- **The library is not modelled.** `libraryBooksOut`/`propertyItemsOut` are stated by the caller; a
  library module would supply them.

## The pages

No page is added by this task: its files are `src/domain/finance/adjustments/*`. The existing
`FeeAdjustmentsPage` and `StudentClearancePage` are the screens a later task wires to this service
(their route entries live in `src/modules/finance/moduleDefinition.tsx`, which is not this task's
file), so no route or page-route guard is touched.
