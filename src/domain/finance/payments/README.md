# The payments core

Spec 05 §5: a payment taken at the counter, its receipt, its allocation, its posting, and - for a
cheque - the lifecycle from the piece of paper to the bank balance and, sometimes, back again. The
cashier's screen is built on it, and the twenty-second keyboard flow of §5.2 is a measured number.

```ts
import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository } from '@/data/repository';
import { LedgerService, createLedgerAccountMapping, createSqliteLedgerStore, ensureLedgerSchema } from '@/domain/finance/ledger';
import { SequenceService, createSqliteSequenceStore, ensureSequenceSchema } from '@/domain/sequences';
import {
  CashierSessionService,
  PaymentsService,
  PAYMENTS_SEQUENCE_CATALOG,
  createSqliteCashierSessionStore,
  ensureCashierSchema,
} from '@/domain/finance/payments';

const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
await adapter.open();
const repository = createRepository({ adapter });
await repository.setup();                 // the canonical tables, the audit trail
await ensureSequenceSchema(adapter);      // P3-A03
await ensureLedgerSchema(adapter);        // P3-A02
await ensureCashierSchema(adapter);       // this module's own table

const payments = new PaymentsService({
  store: repository,
  numbers: new SequenceService({
    store: createSqliteSequenceStore(adapter),
    definitions: PAYMENTS_SEQUENCE_CATALOG,
  }),
  ledger: new LedgerService({
    store: createSqliteLedgerStore(adapter),
    mapping: createLedgerAccountMapping(),
  }),
  sessions: new CashierSessionService({ store: createSqliteCashierSessionStore(adapter) }),
});

const recorded = await payments.recordPayment({
  learnerId,
  amount: fromMinor(300_000, 'KES'),      // 3,000.00
  channel: 'cash',
  receivedAt: '2027-02-10T09:00:00.000Z',
});
recorded.receipt.number;                  // "RCT/2027/000001", from the sequences module
recorded.plan.unallocated;                // the rest, which becomes learner credit
recorded.entry;                           // the journal entry the posting engine derived
```

## What already existed, and what this module adds

The canonical registry already modelled `payment`, `payment_allocation` and `receipt`, and the
finance module already had the pages that write them (`StudentPaymentsPage`, `PaymentsPage`,
`PaymentAllocationPage`, `GeneralReceiptsPage`, `StudentsPaidBookPage`) and a service
(`canonicalFinanceService.recordPayment`) that numbers a receipt by counting the rows it can see.
This module does **not** replace any of that. It reuses the same entities, the same channel
vocabulary and the same page patterns, and it adds:

| Added | Why |
| --- | --- |
| the **cheque lifecycle** as a state machine | the canonical statuses existed; the moves between them did not |
| a **cashier session** with a reconciliation and a Z-report | no entity models a drawer, so the module keeps its own table |
| the **receipt view** of §5.2, including the amount in words | the receipt row held only a number |
| the **keyboard flow** as a pure reducer | the screen's acceptance is a keystroke path with a time budget |
| a service that **composes** the allocation engine, the ledger and the sequences | those modules existed; nothing joined them at the counter |

`src/domain/finance/payments/service.ts` is the only place that composes them. Every write of a
document (payment, receipt, allocation) goes through the canonical repository, so the audit trail,
the optimistic concurrency counter and the posting freeze are the repository's own. The session's
own rows go through a store of this module's, and their audit events are ordinary `audit_event`
rows written with the repository's `writeAuditEvent`.

## Channels

`PAYMENT_CHANNEL_VALUES` is `PAYMENT_CHANNELS` from the canonical schema - the six channels of
spec 05 §5.1, not a second vocabulary:

| Channel | Drawer? | Reference? |
| --- | --- | --- |
| `cash` | yes | no |
| `bank_deposit` | no | yes (slip number) |
| `cheque` | no | yes (cheque number) |
| `mobile_money` | no | yes (provider transaction id) |
| `card` | no | yes |
| `in_kind` | no | yes |

Only cash is counted in the drawer. A cheque is a promise until it clears, a mobile-money or card
payment settles into its own clearing account, and an in-kind payment is goods; counting any of
them as cash would make the reconciliation a fiction.

## The cheque lifecycle

```
received ──deposit──▶ deposited ──clear──▶ cleared
    │                     │
    └──────bounce─────────┴──bounce──▶ bounced
```

- `received` is a cheque handed over at the counter; the canonical status is `pending` and nothing
  is posted, because the money is not in the bank yet.
- `deposited` is it paid into the bank; the canonical status is `posted` and the payment entry is
  posted (`Dr bank / Cr receivables` and `Cr learner credit` for the rest).
- `cleared` is the bank honouring it; the canonical status is `cleared` and the posting stands.
- `bounced` is the bank refusing it; the canonical status is `bounced`.

`cleared` and `bounced` are final. `assertChequeTransition` refuses every other move with
`cheque_transition_invalid`, names the moves that were available, and says a terminal state is
final. A non-cheque payment is refused on the lifecycle with `not_a_cheque`.

**The bounce path is a reversal, never an edit.** `bounceCheque`:

1. soft-deletes the payment's `payment_allocation` rows (the repository's `remove`, so the audit
   records it), and moves each affected invoice's status back from `paid`/`partially_paid`;
2. sets the payment's status to `bounced` - a status the canonical freeze permits;
3. reverses the journal entry through the ledger's own `reverse`, dated on the bounce day, with the
   reason on the reversal;
4. optionally raises the fee §5.1 allows, a posted one-line `fine` invoice numbered from the
   `invoice` sequence.

## Cashier sessions and the Z-report

A session is an opening float, the payments attached to it, and a close that reconciles. It closes
**once**: `close` refuses an already-closed session with `session_already_closed`, the store's only
update moves open→closed, and `attach` refuses a closed session with `session_closed`. A payment
is attached once (the link table's primary key says so), and `recordPayment` refuses a payment
naming a closed session **before it writes anything**.

The reconciliation is exact minor units through the money module:

```
expected cash = opening float + the cash-channel payments of the session
variance      = counted cash - expected cash        // stated, never hidden
```

The Z-report groups the session's payments by channel - count and amount, cash marked as the
drawer's - and states the total, the cash total, the expected cash, the counted cash and the
variance. An open session's report has no counted cash; a closed one has both.

## The receipt of §5.2

`buildReceiptView` produces what the receipt prints: the number, the payer, the learners, the
amount in figures and in words (`amountInWords`, exact, from integer minor units), the channel and
its label, the reference, the allocation by vote head, the balance after the payment and the
cashier. `voidReceipt` keeps the number and sets the status to `void`, and a second void is refused.

## The keyboard flow, measured

`keyboard.ts` is the flow as a pure reducer: `learner → amount → channel → reference → save →
print`. Its action union has **no pointer action at all**, so the model cannot express a click; the
scripted path takes 13 keystrokes (`cashierFlowScript`) and no step needs a mouse. The channel is
chosen by the digit hotkeys 1-6, the learner list by the arrow keys, and Enter moves on; Enter on
the reference saves.

The screen instruments the flow rather than asserting it: it records `performance.now()` at the
first keystroke and again when the save resolves, and renders the difference in
`data-testid="cashier-flow-elapsed"` (with `data-elapsed-ms` and `data-within-budget`). The end-to-end
suite drives the real keystrokes and reads that figure; the measured number and the method are
reported with the task.

## Posting and allocation

- **Allocation** is the allocation engine's plan: `planAllocation` receives the learner's
  outstanding invoice lines (balances split through the money module's `allocate`, so the parts sum
  to what was paid exactly) and decides where the money goes. This module writes the plan's
  per-invoice totals as `payment_allocation` rows and nothing else.
- **Posting** is the ledger's payment derivation: `postPayment` hands the payment and its
  allocations to `LedgerService.postPayment`, which debits the channel account and credits
  receivables per allocation, with the unallocated rest as learner credit. No journal line is built
  here. A payment that already has an entry returns it instead of posting a second one, so a retry
  after a failure is safe.

## The store

| Table | Holds |
| --- | --- |
| `cashier_session` | one row per session: float, status, open/close times, counted, expected, variance, reason |
| `cashier_session_payment` | the payments attached to a session, keyed by `(session_id, payment_id)` |

`CASHIER_DDL` creates them and `ensureCashierSchema(adapter)` applies it (and the repository's
`AUDIT_DDL`); **a canonical migration must apply it**, the same posture the ledger and the
sequences module take.

## Known limits

- **The receipt partition.** The built-in `receipt` sequence is per institution and year. The spec
  asks for per year/campus/cashier; `PAYMENTS_SEQUENCE_CATALOG` widens it to the cashier, but a
  payment carries **no campus**, so a campus in the scope would make every counter payment fail.
  A school that needs per-campus runs widens `RECEIPT_SEQUENCE` with the campus its screen holds.
- **The cashier on a payment row.** `payment.cashier_user_id` is a foreign key to the canonical
  `user`. The app's sign-in reads the legacy `users` collection, whose ids are not canonical user
  rows, so the screen does **not** write `cashier_user_id`; it takes the cashier's name from a
  prop the app shell can supply, records it on the receipt view, and uses the session id (which has
  no foreign key) as the session's owner. Wiring the auth user to a canonical `user` row is a
  follow-up; without a name the receipt's cashier line is blank.
- **Two stores, two transactions.** The canonical rows commit in one transaction; the session
  attachment and the ledger posting follow it, because they are different stores and the adapter
  refuses a public call while another transaction is open. A failure between them leaves a recorded
  payment that is not attached or not posted; `postPayment(id)` is the retry, and it is safe.
- **The screen posts against the control accounts.** The cashier screen's runtime builds the ledger
  with `createLedgerAccountMapping()` - the control accounts alone. A payment needs no fee-item
  mapping, but a chart with real revenue accounts is what invoices and credit notes need, and that
  configuration is not modelled in the app yet.

## The tests

| File | Guards |
| --- | --- |
| `__tests__/cheque.test.ts` | the four states, the four permitted moves, and every refusal |
| `__tests__/keyboard.test.ts` | the flow is pointer-free, the scripted path's keystroke count, the refusals, the timing helpers |
| `__tests__/payments.test.ts` | real SQLite: a payment recorded and read back, its receipt number from the sequences module, the plan, the posting and the trial balance, the cheque lifecycle and a bounce's reversal, a session opened/reconciled/closed, and no payment into a closed session |
