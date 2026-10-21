# M5 — the fee data into canonical finance documents

Migration M5 turns the legacy fee templates, invoices, payments, payment applications, adjustments
and opening balances into canonical **fee items**, **fee schedules** and **schedule lines**,
**invoices** and **invoice lines**, **payments**, **receipts**, **payment allocations** and **credit
notes**. Every amount is a whole minor unit. It is the migration the school's money stops being a
float in a legacy collection in: after M5 a charge is an invoice line, a receipt is a payment with
its receipt, and a learner's balance is the sum of documents rather than a number a page computed.

- The migration: `005-fees.ts` (the `Migration` object, the writer, the refusals, the rollback).
- The rules: `005-fee-rules.ts` (the decimal-to-minor-unit conversion, the status and channel
  vocabularies, the fee item codes and categories).
- The source: `005-legacy-fees.ts` (the legacy rows and the canonical rows they resolve through).
- The plan: `005-fee-plan.ts` (the legacy rows become canonical rows; the independent legacy
  ledger the acceptance compares against).
- The verification: `005-fee-verification.ts` (the counts, every document, every payment's
  allocations, every learner's balance).
- The fixture: `005-legacy-fixture.ts` (the legacy database the tests run against).
- The tests: `005-fees.test.ts`.

## The legacy rows it reads

| Legacy table | Canonical entity | Notes |
| --- | --- | --- |
| `fee_templates` (+ nested `items`) | `fee_schedule`, `fee_schedule_line`, `fee_item` | One schedule per template, one line per item, one vote head per description. |
| `fee_template_items` (when an installation holds the table) | `fee_schedule_line` | Read as well as the nested copy; an item the nested array already names is not read twice. |
| `student_invoices` (+ nested `items`) | `invoice`, `invoice_line` | The invoice's status, number, dates and lines. |
| `student_invoice_items` | `invoice_line` | Same de-duplication as the template items. |
| `student_payments` | `payment`, `receipt` | One posted payment and one issued receipt per legacy payment. |
| `invoice_payment_applications` | `payment_allocation` | The application names an invoice **item**, so the invoice is resolved through it. |
| `fee_adjustments` | `credit_note` or `invoice` + `invoice_line` | A credit reduces what is owed; a charge cannot be a credit note. |
| `student_opening_balances` | `invoice` + `invoice_line` or `credit_note` | Only when `is_billed` is false: a billed balance is already an invoice line. |

`previous_session_fees` and `student_payment_records` are the finance module's **report
collections**: they hold no money of their own, they are derived from the same invoices and
payments, so M5 does not read them.

The legacy numeric ids are stored as doubles in TEXT columns (`1.0`), so every reference is
normalised with `legacyKey` from M1 before it is resolved: a template's `school_period_id` of `1.0`
finds the academic period M1 wrote for school period `1`, and an `applicable_level_ids` entry of
`2.0` finds the level M2 wrote for class `2`.

## The money rule (acceptance 1)

`Money = { amount_minor: integer, currency }` (spec 05 §1). The legacy columns are REAL, and a
float multiplication by 100 drifts — `19.99 * 100` is `1998.9999999999998` — so **no amount is ever
multiplied**. The conversion reads the decimal text and splits it:

1. The value is taken as text. A number is read through `String(value)`, which is the shortest text
   that round-trips to the same IEEE-754 double — the same text SQLite itself prints; a string is
   trimmed.
2. The text must be a plain decimal: an optional sign, digits, and an optional fraction. `1e5`,
   `"not a number"` and an empty cell are refused, not coerced.
3. The fraction is padded to the currency's precision (`KES` 2, `UGX` 0, `KWD` 3) and the whole
   and fraction digits are read as one integer.
4. An amount finer than the currency's smallest unit is rounded **half away from zero on the
   decimal string** (`1234.567` → `123457` for KES) and reported as `amount_rounded` with the text
   it rounded. Nothing is silently dropped.
5. A value that does not fit a safe integer is refused; the canonical model has no maximum amount,
   only a whole-number one.

So `15000.05` is `1500005`, `19.99` is `1999`, and `15000.049999` is `1500005`. The rule is stored
in `_legacy_migration_notes` as an assumption, and the fixture asserts it against both the
converted rows and the conversion function.

Every document is written in the institution's `base_currency`. A legacy payment whose row names
another currency (a column an installation can carry) is written in **that** currency and left
unallocated, because the legacy row carries no exchange rate: spec 05 §1 records the rate and the
base-currency equivalent together, and the migration will not invent a rate. It is reported as
`payment_foreign_currency`, and no foreign amount settles a base-currency invoice.

## The templates (acceptance 2)

A legacy template is one school period's bill for one population, and the school billed from it,
so it becomes a `fee_schedule` with `status: 'published'`, `version: 1`, the academic year of the
period its school period became, and that period in `academic_period_ids`. Its items become
`fee_schedule_line` rows with `frequency: 'per_term'` and `proration_rule: 'full'`.

The legacy template carries a free-text item description and no vote head, so:

- **One description is one fee item.** "Tuition" in Term 1 and "Tuition" in Term 2 are one vote
  head with one code; the amounts are the two schedule lines.
- The **code** is the description reduced to upper case, letters, digits and underscores; a
  collision gets a numeric suffix.
- The **category** is read from the words of the description (`tuition`, `board` → boarding,
  `meal`/`lunch` → meals, `transport`, `exam`, `levy`, `uniform`/`book`, `deposit`, `fine`), and
  an item whose words name none is `other`. A deposit is `refundable`.
- The **residence statuses** of the schedule are read from the template's `student_category_name`
  (`Day Scholar` → `day`, `Boarder` → `boarder`), and its **levels** from
  `applicable_level_ids` through M2's class-to-level map. A class M2 did not map is reported and
  dropped from the list, which widens the schedule rather than narrowing it silently.

A template whose school period M1 did not map cannot be a schedule: the template and each of its
items are reported, and no schedule, line or vote head is written for it.

## The invoices and their lines

A legacy invoice keeps the status the school recorded:

| Legacy status | Canonical status |
| --- | --- |
| `Draft` | `draft` |
| `Due`, `Overdue` | `posted` |
| `Partially Paid` | `partially_paid` |
| `Paid` | `paid` |
| `Voided` | `void` |

**The total follows the lines.** A canonical invoice's `total` is the sum of its lines, so the
legacy `total_amount_billed` is compared with that sum: when they differ the lines are the charge
and the invoice total follows them, reported as `invoice_total_differs_from_lines`. A legacy
invoice with no items but a billed total is one synthesised line for that total (reported), so the
charge is not lost.

An invoice whose learner migration M3 could not migrate cannot say whose money it is: the invoice
and each of its lines are reported, and no allocation that settles it is written.

`due_date` is dropped (and reported) when it falls before `issue_date`, because the canonical
schema refuses that shape. An unreadable issue date is taken from the row's own `created_at`, and
then from the migration's clock, and reported either way.

## The payments, receipts and allocations

- A payment is written `posted`, in the channel the legacy method names (`Cash` → `cash`,
  `M-Pesa`/mobile → `mobile_money`, `Cheque` → `cheque`, card/aggregator → `card`, bank/transfer →
  `bank_deposit`, in-kind → `in_kind`), and a method the vocabulary does not name is written as
  `cash` and reported. `received_at` is the legacy `transaction_date` as an ISO timestamp.
- A receipt is `issued`, numbered from `receipt_no` when that number is usable and unique; a
  missing or duplicated number is replaced by `RCT-LEGACY-000001`-style numbers and reported.
- An application names an invoice **item**, so the invoice is resolved through the item. The
  allocation is written against that invoice, at the moment the payment was received. It is
  refused — reported in `_legacy_unmappable` — when:
  - the item does not exist, or its invoice could not be written;
  - the invoice is a **draft** or **void**: the canonical model refuses an allocation to either, and
    the money stays on the payment as learner credit (spec 05 §5.3);
  - the amount is zero or negative;
  - the payment has no money left to apply.
- **An allocation never exceeds its payment** (spec 02 §12.8). Applications are applied in order
  and each is capped at what the payment still has; the excess is reported as
  `payment_over_allocated` with both amounts. It is not written, because money that was never
  received cannot settle a charge.

A payment whose learner M3 could not migrate is written **without** a learner and reported: the
money was received, and a payment that belongs to nobody is a smaller problem than a receipt that
vanished.

## The adjustments and the opening balances

`fee_adjustments` has no status and no document number, and its six types move the balance in two
directions, so it becomes the closest canonical document for each direction:

| Legacy adjustment | Canonical document | Why |
| --- | --- | --- |
| `Scholarship`, `Discount`, `Exemption` | posted `credit_note` | A credit reduces what is owed. |
| `Fine`, `Penalty`, a positive `Other` | one-line posted `invoice` (`kind` `fine` / `adjustment`) | A fine adds to what is owed, and a credit note cannot. |
| a negative `Other` | posted `credit_note` | The sign says it is a credit. |

An adjustment that names an invoice (`applied_invoice_id`) gets that invoice on its credit note.
It is not folded into the invoice's lines: a posted invoice's lines already total its frozen total,
so rewriting that total is exactly the edit the posted freeze forbids.

An opening balance is the money a learner brought forward: a **`Debit`** is a charge (a one-line
posted invoice, `kind` `opening_balance`) and a **`Credit`** is a posted credit note. A balance with
`is_billed = true` was already carried into an invoice as a "balance brought forward" item in the
legacy system, and the legacy statement excludes it; M5 excludes it too and reports
`opening_balance_already_billed`, or the charge would be counted twice.

## Posted documents are frozen (acceptance 4)

Spec 02 §12.7 makes a posted invoice, payment, credit note and refund immutable, and the repository
enforces it (`finance.posted_immutable`). A migration that wrote a document as a draft and then
posted it with an update would have to walk through that rule, and one that wrote a posted
document and then corrected it would be refused outright.

M5 therefore writes **every document once, in its final state**: every row it creates is an insert,
and its `created_at` equals its `updated_at` because nothing ever touches it again. The verification
checks that equality on every migrated document, so a future edit to the migration that posts by
update fails the run. The fixture goes further and drives the real repository: an update to a
migrated posted invoice raises `finance.posted_immutable`, and the migrated draft still updates.

The one legacy state that is not final is `Draft`. A legacy draft was never billed, so it is
written as a canonical `draft` — the one state the model still lets an operator edit — and an
allocation to it is refused rather than written. It is not posted to make the migration simpler,
because that would claim the school billed a document it had not.

## The id map

M5 appends to M1's `_legacy_id_map`:

| `legacy_table` | `legacy_id` | `canonical_entity` | `canonical_id` |
| --- | --- | --- | --- |
| `fee_templates` | the template id | `fee_schedule` | the schedule id |
| `fee_template_items` | the item id | `fee_item` | the vote head the first item with that description created |
| `fee_template_items` | the item id | `fee_schedule_line` | the line id |
| `student_invoices` | the invoice id | `invoice` | the invoice id |
| `student_invoice_items` | the item id | `invoice_line` | the line id |
| `student_payments` | the payment id | `payment` | the payment id |
| `student_payments` | the payment id | `receipt` | the receipt id |
| `invoice_payment_applications` | the application id | `payment_allocation` | the allocation id |
| `fee_adjustments` | the adjustment id | `credit_note` or `invoice` (+ `invoice_line`) | the document the direction chose |
| `student_opening_balances` | the balance id | `credit_note` or `invoice` (+ `invoice_line`) | the document the direction chose |

A canonical row appears in the map once: the map's unique index is on `canonical_id`, so the vote
head the second "Tuition" item reuses is mapped under the item that created it.

## The acceptance: the balance per learner is equal before and after

A learner's balance is the money the canonical pages show: **charges − credits**, where a charge is
an invoice that is not void, a credit is an allocation against one of those invoices, and a posted
credit note is a credit of its own. In whole minor units of the base currency:

```
balance(learner) = Σ invoice.total (status ≠ void)
                 − Σ payment_allocation.amount (of those invoices)
                 − Σ credit_note.amount (status = posted)
```

The migration computes the same number **twice, independently**:

- **Before**, from the legacy rows: the invoice items (not `total_amount_billed`, which is a
  denormalised cache the legacy statement does not use either), plus a debit opening balance, plus
  a charged adjustment, minus a credit adjustment, minus a credit opening balance, minus the
  applications the payment can cover. `legacyLedger` and `legacyFeeBalances` in
  `005-fee-plan.ts` are a second reading of the legacy rows: they share the conversion rules with
  the plan but not its aggregation, so a plan that drops, doubles or mis-signs an amount disagrees
  with them.
- **After**, from the canonical tables the migration wrote, read back through SQL.

Every learner — including the ones with no fee data at all, whose balance is `0` before and `0`
after — is compared to the minor unit. A difference of one cent is a conversion that drifted, a
dropped row or a doubled one. `assertFeeBalances` refuses the run and names every learner and both
amounts:

```
Migration M5 moved 1 learner balance(s) out of balance:
ADM004: 65000 before, 75000 after
```

The run stops before it commits, so the database keeps the state it had. The fixture proves it by
moving a draft invoice's total (a write the model still allows) and reading the report back.

The awkward cases the fixture holds, and what each one does:

| Case | What happens |
| --- | --- |
| A payment with no allocation | Written as a posted payment and a receipt; it credits no invoice, so it moves no balance (it is learner credit). |
| An allocation that over-allocates its payment | Written up to the amount paid; the excess is reported as `payment_over_allocated` and moves no balance. |
| An allocation to a draft invoice | Refused and reported; the money stays on the payment. |
| An allocation whose invoice item is gone | Refused and reported. |
| An invoice with no learner | Refused with each of its lines; it belongs to no learner's balance. |
| A payment in another currency | Written in its own currency, unallocated, and reported. |
| A discount, a scholarship, an exemption, a fine, a negative `Other` | Four posted credit notes and one posted charge invoice. |
| An opening balance of each direction | A charge invoice and a credit note; the billed one is reported and not written twice. |
| A learner with no fee data at all | No documents, and a balance of `0` on both sides. |

## What it refuses to do

- **No learners**: the migration refuses to run before M3. A fee document belongs to a learner, and
  migrating a database without them would write invoices nobody owns.
- **No canonical tables, no report tables**: it refuses a database that has not applied the
  canonical schema and run M1.
- **A fee table that already holds a row**: the canonical data is newer than the legacy data, so
  there is nothing to migrate.
- **No fee row at all**: an empty migration is a migration that silently lost the school's fees.
- **A legacy row it cannot map** is reported in `_legacy_unmappable`, never dropped, and every line
  of a refused document is reported with it, so the counts add up.
- **A warning is reported and the migration still commits**; an error stops it. M5 writes the
  report and then verifies it, so a report that does not add up fails the run.

## The report and the verification

`readFeeMigrationReport(reader)` reads the database back and re-derives the report from the legacy
rows. The counts are:

| Entity | Before | After | Unmapped |
| --- | --- | --- | --- |
| `fee_schedule` | the legacy templates | the schedule map rows | the templates whose period M1 did not map |
| `fee_schedule_line` | the legacy template items | the line map rows | the items of a refused template |
| `fee_item` | the distinct descriptions the migration wrote a vote head for | the vote head map rows | — (a description is one row, so `before = after`) |
| `invoice` | the legacy invoices + the charged adjustments + the unbilled debit balances | the invoice map rows | the invoices with no learner, and the charges that could not be written |
| `invoice_line` | every invoice item (or one, for an invoice with no items) + one per charge | the line map rows | the lines of a refused invoice |
| `payment`, `receipt` | the legacy payments | the payment and receipt map rows | the payments whose amount cannot be read |
| `payment_allocation` | the legacy applications | the allocation map rows | the applications the canonical model refuses |
| `credit_note` | the credit adjustments + the unbilled credit balances | the credit note map rows | the credits that could not be written |

`before = after + unmapped` holds for every entity. Every mapping row is checked back for its
amount, currency, learner, status, invoice and payment; every invoice is checked that its total
equals the sum of its lines; every payment is checked that its allocations do not exceed it; every
document is checked that it was written once; and a stray row (one the map does not name) is an
error.

## The rollback

`down` removes exactly what the migration created. Every canonical row M5 writes is recorded in
M2's `_legacy_migration_created` under version 5, so the rollback deletes the allocations, receipts,
credit notes, invoice lines, invoices, payments, schedule lines, schedules and fee items it wrote,
in the order the foreign keys need, and leaves a row it found alone. It also deletes its id-map
rows, its unmappable rows and its notes, and its own rows in the created-rows table. The table
itself stays: M1's, M2's and M3's rows live in it, and a rollback to version 3 must leave M3 able to
undo its own rows later. The legacy tables are never written.

## The modules it does not own

- `fee_category`, `discount_rule`, `sponsorship` and `installment_plan` have no legacy source: the
  legacy data names no fee category, no discount rule and no plan, so M5 writes none of them and
  the schedules carry an empty category list.
- The legacy revenue account ids are not carried: the chart of accounts is not modelled yet (P3).
- `journal_entry` and `journal_line` are outside the registry (P3-A02), so no ledger entry is
  written. The balances above are the documents' balances, which is what the finance pages show.
