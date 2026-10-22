# The posting engine

The double-entry ledger of spec 05 section 8: the journal entries derived from the finance
documents, the trial balance they add up to, and the periods they may land in. A posted entry is
immutable; a correction is a reversal plus the corrected entry.

```ts
import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import {
  LedgerService,
  createLedgerAccountMapping,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';

const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
await adapter.open();
await ensureLedgerSchema(adapter);                                   // the ledger's DDL, once

const ledger = new LedgerService({
  store: createSqliteLedgerStore(adapter),
  mapping: createLedgerAccountMapping({
    feeItemRevenueAccounts: { 'fee-tuition': '4100' },               // the seam P3-B01 fills
  }),
  actor: currentUserId,
});

await ledger.postInvoice({ invoice: { id, number: 'INV/2027/T1/000123', institutionId, issueDate,
  lines: [{ feeItemId: 'fee-tuition', amount: fromMinor(600000, 'KES') }] } });

const balance = await ledger.trialBalance({ institutionId, currency: 'KES' });
balance.balanced;   // always true
```

## The entry

A `JournalEntry` is a date, a reference to its source document, a narration, and two or more
lines. Every line carries an account code and exactly one of a `Money` debit and a `Money` credit,
a positive amount.

```ts
createJournalEntry({
  institutionId, entryDate: '2027-02-10',
  source: { kind: 'invoice', id, number: 'INV/2027/T1/000123' },
  narration: 'Invoice posted',
  lines: [
    { accountCode: '1100', accountName: 'Fee receivables', debit: fromMinor(600000, 'KES') },
    { accountCode: '4100', accountName: 'Tuition revenue', credit: fromMinor(600000, 'KES') },
  ],
});
```

`createJournalEntry` refuses, and **an unbalanced entry cannot be created at all**, not merely
refused at save time:

| Code | Rule |
| --- | --- |
| `empty_entry` | at least two lines |
| `single_line` | a double entry needs two sides |
| `both_sides` | a line carries exactly one of a debit and a credit |
| `no_side` | neither is a refusal too |
| `zero_line` | a journal line is a positive amount on one side |
| `currency_mismatch` | one entry is counted in one currency |
| `unbalanced` | the debits equal the credits |
| `invalid_entry` | an ISO day, a narration, a source id |

## The postings

One derivation per source document. Each returns the entry; the service posts it.

| Derivation | Debits | Credits | Mapping source |
| --- | --- | --- | --- |
| `invoiceEntry` | receivables = the invoice total; a **negative line** (a discount) debits its revenue account | the revenue account of every positive line | the fee item's GL mapping, fee revenue when the item has none |
| `paymentEntry` | the account of the channel the money arrived through (cash, bank, mobile-money clearing, card, in-kind) | receivables, one line per allocation; the unallocated rest as **learner credit** | control accounts |
| `refundEntry` | refunds payable | the channel the money leaves through (bank by default) | control accounts |
| `creditNoteEntry` | the revenue account of each fee item it names, fee revenue as a whole when it names none | receivables | the fee item's GL mapping |
| `openingBalanceEntry` | the receivable (or the account it names) on a debit balance | opening-balance equity | control accounts |

Every derivation validates what it can: an allocation cannot exceed its payment, an invoice total
must equal its lines, an invoice must not net to zero, a refund is posted when it is paid, a credit
note's lines must sum to it, a document is counted in one currency.

**The chart of accounts is a seam.** `LedgerAccountMapping` is two methods - the revenue account of
a fee item, and an account by code - and `createLedgerAccountMapping` builds one from a record, a
resolver, or nothing (the control accounts alone). The real fee-item GL mapping belongs to the fee
item registry (**P3-B01**, `src/domain/finance/feeItems/*`); it lands beside this module without
this module changing. A fee item with no mapping posts to fee revenue (4000), unless the chart was
built with `requireFeeItemMapping`, and then the posting is refused with `no_mapping`.

## Immutability and reversal

A posted entry is never edited and never deleted. Two guards, one of them in the database:

1. **No method offers it.** `LedgerStore` has `insertEntry` and reads; there is no `updateEntry`
   and no `deleteEntry`.
2. **The database refuses it.** Four `BEFORE UPDATE`/`BEFORE DELETE` triggers on `journal_entry`
   and `journal_line` `RAISE(ABORT, ...)`, so a raw statement is refused whoever asks.

A correction is therefore a **reversal** plus the corrected entry:

```ts
const { reversal, corrected } = await ledger.correct(entryId, {
  narration: 'Corrected invoice', lines: [...],
}, { reason: 'the boarding charge belonged to another learner' });
```

- `reverseJournalEntry` mirrors the entry line for line, swapping each side, and references it
  (`reversesEntryId`). The narration names what it reverses and why.
- `correct` posts the reversal and the corrected entry in **one transaction**, so a failure leaves
  neither. The corrected entry names the entry it replaces (`correctsEntryId`), so the history
  reads `original <- reversed by <- corrected`.
- An entry is reversed once and a document is corrected once: partial unique indexes on
  `reverses_entry_id` and `corrects_entry_id` make that a property of the database, and the engine
  reports it as `already_reversed`.

A reversal with the original's date nets the account balances back to where they were. A reversal
dated in a later, open period is how an entry is corrected **after its period was closed**.

## The trial balance

`deriveTrialBalance(entries, currency)` gives, per account, the total debits, the total credits and
the balance, plus the totals of each and a `balanced` flag. `netOfTrialBalance` is the sum of the
row balances.

It always balances, because every entry in the ledger was validated to have equal debits and
credits and the sum of equal sums is equal. The per-account sums are accumulated in `bigint`, so a
year of postings cannot drift on the way to the total. A trial balance is kept **per currency**: an
entry counted in another currency is left out rather than coerced.

The invariant is property-tested (`__tests__/trialBalance.property.test.ts`, seeded fast-check):
for randomly generated balanced entries the debits equal the credits, the trial balance nets to
zero, reversing an entry returns every account to zero, and a batch of mixed currencies and amounts
balances in each currency.

## Period close

`closePeriod` defines a period by a date range and starts it closed. An entry dated inside it is
refused with `period_closed`, and the refusal carries the period name, its range and why it was
closed. A range overlapping a period the institution already keeps is refused with
`period_overlap`.

`reopenPeriod` opens a closed period again. **Spec 05 section 8 asks for period locking, not for an
immovable lock**, so reopening is allowed: it requires a reason, it records who reopened the books
and when, and both the close and the reopen stay in the audit trail. An entry posted after a reopen
is not marked in any way; the trail is where the history lives.

The period an entry lands in is resolved from its date at posting time and stored on the row, so
`listEntries({ periodId })` and `trialBalance({ periodId })` are plain filters.

## The audit trail

Every posting appends a row to the repository's own `audit_event` table (spec 02 section 1.5: actor,
entity, id, before, after, reason) through the repository's `writeAuditEvent`, so the ledger reuses
the audit convention rather than inventing one. A period close and a reopen append their own rows.
`auditTrail(subjectId)` reads one entry's or one period's history; `auditLog()` reads the ledger's
recent history.

`readAuditEvents` of the repository types its `entity` filter to the closed `EntityName` union, and
the ledger's journal entities are not in that registry, so the ledger reads its own rows with the
same table's SQL. The rows it writes are ordinary `audit_event` rows.

## The store

| Table | Holds |
| --- | --- |
| `journal_entry` | one row per entry: date, source, narration, currency, both totals, period, reversal and correction links |
| `journal_line` | the lines of an entry, keyed by `(entry_id, line_number)` |
| `ledger_period` | the periods, their range and their open/closed state |

`LEDGER_DDL` creates them, `ensureLedgerSchema(adapter)` applies them (and the repository's
`AUDIT_DDL`) and is safe to call repeatedly. **A canonical migration must apply `LEDGER_DDL`** (or
call `ensureLedgerSchema`) - there is no migration for these tables yet, the same posture the
sequences module of P3-A03 takes. Turn `PRAGMA foreign_keys` on (the Node adapter's
`foreignKeys: true`): `journal_line` and the reversal links are foreign keys.

The three partial unique indexes are the invariants in the database:

- `journal_entry_one_original` - one original posting per document, so a replayed billing run
  cannot post an invoice twice;
- `journal_entry_one_reversal` - an entry is reversed once;
- `journal_entry_one_correction` - a document is corrected once.

## The module

| File | Holds |
| --- | --- |
| `types.ts` | the vocabulary: accounts, lines, sources, entries, periods, the trial balance, the audit row |
| `errors.ts` | `LedgerError` and its codes |
| `chart.ts` | the control accounts, the channel accounts, and the `LedgerAccountMapping` seam |
| `entry.ts` | `createJournalEntry` (the validation) and `reverseJournalEntry` (the mirror) |
| `postings.ts` | one derivation per source document |
| `trialBalance.ts` | the per-account derivation |
| `store.ts` | the DDL, the triggers, the port and the SQLite implementation |
| `engine.ts` | `LedgerService`: post, reverse, correct, the trial balance, the periods, the audit |
| `index.ts` | the public API; a caller imports from here |

## Known limits

- **Journal entities are not in the canonical registry.** `src/domain/schema` is closed and does not
  model `journal_entry`/`journal_line`, so the ledger keeps its own DDL and store, the way the
  sequences module of P3-A03 does. The repository's deferred table names this task as the owner of
  "journal entries are immutable after posting"; that is enforced here, in the ledger's own tables.
- **The refund debit account is a policy, not a fact.** A refund debits refunds payable (2100) and
  credits the payout channel. A deposit refund that should instead release a deposit liability, or
  one that releases learner credit, needs a policy the spec does not state; the account is
  configurable through the chart when that lands.
- **The commit sequence of an audit row is `MAX(commit_sequence) + 1`** over `audit_event`, taken
  inside the posting's transaction. The repository allocates its own sequence from the same table's
  maximum, so the two writers agree on the next number as long as they do not write concurrently;
  the ledger uses the sequence only to order its own trail.
- **A period is created closed and opened by `reopenPeriod`.** There is no "declare an open period"
  call; an entry dated where no period exists is simply posted with no period. A period is a lock,
  and the ledger only needs the locks.
- **Multi-currency postings are per entry.** A payment in another currency records its rate and its
  base-currency equivalent on the payment (spec 05 section 1); the ledger posts the base-currency
  entry. A journal entry itself holds one currency.

## The tests

`__tests__/` runs against a real `better-sqlite3` database for everything that persists - there is
no storage double anywhere in the suite - and pure for the constructor, the derivations and the
trial balance.

| File | Guards |
| --- | --- |
| `entry.test.ts` | every refusal of the constructor, and the mirror a reversal is |
| `postings.test.ts` | what each source derivation debits and credits, and its refusals |
| `ledger.test.ts` | posting, double-posting, the trial balance after every kind of operation, immutability, reversal, correction, period close and reopen, the audit trail, a reopen of the database file |
| `trialBalance.property.test.ts` | the trial balance invariant as a seeded fast-check property |
