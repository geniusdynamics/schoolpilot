# Akademico Finance audit and gap analysis

Date: 2026-11-01
Old system source: `docs/AkademicoNotes/Akademico_Finance/Finance` (C# WinForms/DevExpress forms, `OriginalCodes`, and a live copy of the old database `schoolss` on the local MariaDB instance).
New system: `src/modules/finance` and `src/domain/finance` on `feat/finance-module` (base `ca472b4`).

This is a Finance-specific continuation of `docs/audits/akademico-gap-analysis-2026-10-31.md`. It covers operations, data grids, workflows and reports, and it separates what the new system already does from what is genuinely missing.

The live old database was inspected read-only. It is useful because it shows what the forms actually wrote, not only what the decompiled code intended. The finance tables with data at the time of the audit were:

| Table | Rows | What it is |
|---|---:|---|
| `students` | 1,400 | learner master, class/stream/category/status |
| `detailed_transaction` | 51,193 | one row per debit or credit line, the event ledger |
| `votehead_transactions` | 35,166 | the vote-head side of each payment/receipt |
| `previous_fee_structure` | 11,018 | one row per learner per term/year/category/class |
| `fee_structure` | 184 | class/category/term/year/vote-head prices |
| `exemptions` | 1,324 | per learner, term, year, vote head |
| `penalities` | 610 | per learner, term, year, vote head |
| `excess_votehead_amount` | 146 | overpayments/prepayments available to the learner |
| `budget` | 97 | vote-head budgets |
| `vote_heads` | 52 | vote-head flags for reporting |
| `journals` | 14 | account-category journal mapping |
| `chart_of_accounts` | 8 | cash/bank plus sundry debtor/creditor per category |
| `invoice_accounts` / `lpo` | 2 / 4 | supplier/customer invoice side |

## 1. Executive summary

The old Finance module was not an invoicing system in the modern sense. It was an **event ledger plus a rebuild engine**:

- A fee structure only *priced* a class/category/term/year. It did not create a document per learner.
- "Effecting" a fee structure marked the prices usable and copied a `previous_fee_structure` row per continuing learner, which was the learner's enrolment in that term's price book.
- Money was recorded as debit/credit rows in `detailed_transaction`; every payment was immediately split across vote heads into `votehead_transactions`.
- Penalties, exemptions, refunds and opening balances were more event rows, not invoice documents.
- Every report re-derived the position from the base rows. The student statement, fee balance, detailed balances, collection per vote head, vote-head statement and financial statements all rebuilt the same arithmetic independently.
- Overpayment was held in `excess_votehead_amount` and reused by the next payment/distribution.
- Distribution had two axes: **termly vs yearly** (which term(s) the money is spread over) and **priority vs weighted** (how the money is split across vote heads). The configuration lived in one `excess_votehead` row plus one `fee_arrears` row.
- SMS was a first-class finance output: a fee-balance message to the parent's phone, sent through `sms.genius.ke` or a GSM modem, with failures written to `failed_messages`.

The new system is materially stronger where it matters: canonical invoices and invoice lines, exact minor-unit money, posted journal entries, a real allocation engine with four strategies, statements built from the ledger, billing runs with skip reasons, adjustments as credit notes, and reconciliation. The gaps are not the accounting model. They are the **operational wrappers** the old bursar used every day:

1. **Payment distribution is not a configured, visible policy.** The new payment service auto-allocates oldest-invoice-first by default; the cashier screen neither chooses nor shows the distribution, and `vote_head_priority` currently cannot be requested through the service because no priority lookup is supplied.
2. **Mass penalties/exemptions do not exist.** The old `frmMassPenaltiesExemptions` wrote a penalty/exemption for every learner in a class, either a common amount or a per-learner entry. The new fines and credit-note pages are one learner at a time.
3. **The old "enrolled / expected / paid / balance" report is only partly rebuilt.** `StudentFinancialSummaryPage` is per learner; `FeeCollectionSummaryPage` is per vote head; there is no report that groups expected, collected and outstanding by class, stream, category and vote head with an enrolled count, which is what `frmCollectionPerVotehead` and `frmViewStudentFeeBalance` did.
4. **No fee-balance SMS action.** The collections module can schedule reminders and has an SMS channel, but no page uses it, and there is no "send balance to these guardians now" action.
5. **No fee register / vote-head register grid.** The old `frmFeeRegister` and `frmStudentVoteheadBalances` gave a class-wide matrix of vote heads with paid and balance columns. The new vote-head statement is per learner/invoice.
6. **No mass balance B/F import grid.** The new opening-balance page is one learner at a time (or inside the billing run); the old `frmBalanceBF` was a class grid with Excel import/export and negative amounts treated as prepayments.
7. **No cash-analysis by payment channel.** The old `frmCashAnalysisReport` filtered receipts/payments by transaction type and date. The new cash book and bank book are ledger-based; a channel/type analysis is not exposed.
8. **Receipt/layout configuration is a stub.** `FeesReceiptTemplatePage` still carries `GAP(P1-E03)` and is not a real template editor, while the old `frmReceiptConfig` chose A5/A4/thermal and table/report layout.

The rest of this document records the evidence, the old algorithms, the mapping, and the implementation order.

## 2. The old data model

### 2.1 Price book and enrolment

`fee_structure` columns (live schema):

```
id, student_category, class, term, year, account_category, votehead,
amount, effected (yes/no), active (yes/no)
```

A price row is keyed by **student category + class + term + year + vote head**. `effected = yes` means the row may be transacted with; `active = yes` is set when the structure is effected. The code comment itself admits the two flags were not well understood:

> "effected school fee means that it can be transacted with but active means that is has been transacted with and can not be changed i don't know how true that is" — `frmFeeStructure.cs`

`previous_fee_structure` columns:

```
id, admin_no, class, stream, student_category, term, year
```

This is the learner's term enrolment in the price book. Every report that needed "what was this learner supposed to pay in term X" joined this table to `fee_structure` on class/category/term/year. This is the old equivalent of the new `enrolment` + `fee_schedule` + `invoice` chain.

### 2.2 The event ledger

`detailed_transaction` (the centre of the old system):

```
admin_no, entity_type, sundry_creditor, sundry_debtor,
amount_issued, amount_received,
account_category, account_chart, votehead,
details, receipt_no, mydescription, link,
student_category, term_year, transaction_type,
transaction_date, invoice_no, balance_bf, voucher_no, stud_balance
```

- `amount_received` is money in (a receipt); `amount_issued` is money out (a payment/refund).
- `mydescription` is the event type: `Payment Received`, `Payment Issued`, `Fee Refund`, and supplier/customer variants.
- `transaction_type` is the channel: `Cash`, `Cheque`, `Bank Slip`, `M-pesa`, `Money Order`.
- `link` groups the two sides of one event (and links to `votehead_transactions`).
- `term_year` is the pricing period the event belongs to, written as `"One 2017"`.
- `receipt_no` is the receipt/voucher number; `invoice_no` is only used on the supplier/customer side.

`votehead_transactions` is the distribution side of a fee payment:

```
account_category, account, vote_head, amount, amount_issued,
admin_no, student, partner, link, mydescription, transaction_date, term, year
```

A single receipt therefore produces one `detailed_transaction` credit row for the receipt and N `votehead_transactions` rows for the vote-head split. The old student statement and vote-head statement read these tables directly.

### 2.3 Penalties and exemptions

Both are simple event tables, not documents:

```
penalities: id, admission_no, class, stream, amount, description, date, term, year, link, acc_category, votehead
exemptions: id, admin_no,    class, stream, amount, date, description, term, year, acc_category, votehead
```

`link = 'Opening Balance'` distinguishes an opening balance from a live penalty in `getFeeStructure`; `link = '--'` is the normal penalty. There is no invoice, no approval and no reversal document. A penalty is added to the vote-head amount before distribution; an exemption is subtracted. A mass form writes one row per learner per selected vote head.

### 2.4 Overpayment, prepayment and arrears

- `excess_votehead_amount`: `admin_no, amount, description, date, link, used`. The running overpayment/prepayment balance. The payment form reduces it when the next payment is distributed and writes the remainder back.
- `excess_votehead` (one row): `type` (`priority` or `weighted`), `account_category`, `votehead`, `mode` (`termly` or `yearly`). This is the global distribution policy.
- `fee_arrears` (one row): `account_category`, `votehead`. This is the pseudo-vote-head used to carry an old balance into term one / a new year.
- `term_dates`: `term, year, startDate, endDate, active`. The active term/year is required before a payment can be distributed.

The old system had no "credit note". A correction was another event row, and the reports had to net it out.

### 2.5 Chart of accounts and journals

`chart_of_accounts` is only eight rows in the live copy: a sundry debtor and sundry creditor per account category (`MAIN ACCOUNT`, `OPERATIONS`, `TUITION ACCOUNT`), plus Cash and Bank. `journals` maps an account category and transaction nature (`receipt`/`payment`) to the account to increase and the account to decrease. The new ledger's chart and posting rules are a strict improvement; the important old idea is that **every event names both sides**, which the new `journal_entry` / `journal_line` pair now does properly.

## 3. Operations

### 3.1 Fee structure entry and effecting (`frmFeeStructure.cs`)

The grid columns are account category, vote head, amount and the effected/active flags. The operator chooses year, term, class and student category; the grid loads existing rows; Save writes `fee_structure`.

Effect performs:

1. validate the grid and the arrears account configuration;
2. `bulkDistribution.verify()` checks the active term dates and distribution policy;
3. `update fee_structure set effected='yes', active='yes'` for the class/category/term/year;
4. `setPreviousFeeStructure()` writes a `previous_fee_structure` row for each continuing learner who does not already have one;
5. a confirmation dialog and a "complex computation" wait.

The effect does **not** create an invoice. It only makes the prices usable, and the learner's statement is rebuilt on demand from the price book and the payment events.

New equivalent: `FeeConfigurationPage → Structures` renders `BillingRunPanel`, which previews and posts canonical invoices (one per learner) with skip reasons. This is better than the old flag, but the **prepayment/arrears distribution that used to happen around effecting** is not part of the run. The prior audit already recommended a separate, reversible "carry forward balances" step; that recommendation still stands. `PreviousSessionFeesPage` now has a selectable **Carry forward selected** action that posts opening-balance invoices, which covers the manual part but not the automatic termly/yearly policy.

### 3.2 Fee payment (`frmFeePayment.cs`)

This is the heart of the old system, and it is 2,650 lines. The operator searches a learner, sees the current balance, enters an amount and a payment channel, and the form builds a distribution grid with five columns:

```
Account Category | Votehead | Votehead Total | Votehead Paid | Votehead Balance
```

The grid is built from:

- the learner's `previous_fee_structure` rows (all terms up to the active one, or the whole year);
- the effected `fee_structure` rows for each class/category/term/year;
- penalties for the learner/term/year (added to the vote-head amount, or inserted as separate rows);
- exemptions for the learner/term/year (subtracted from the vote-head amount);
- the arrears pseudo-vote-head in term one / a new year;
- already-paid amounts from `detailed_transaction` (`amount_received > 0` by vote head).

The operator can choose four algorithms through two configuration axes.

#### Axis 1: termly vs yearly

- **Termly** distributes the payment only into the active term.
- **Yearly** loops term one, two and three in order and spreads the same payment across the year. It stops at the selected term (the form lets the operator choose the term in yearly mode), respects per-term already-paid amounts, and carries the remainder forward.

#### Axis 2: priority vs weighted

**Priority** fills each vote head in fee-structure order, up to that vote head's outstanding balance, then moves to the next. The arrears pseudo-vote-head is handled first. The first row of each term receives the remainder of the term's allocation. If money is left after every vote head is covered, it becomes overpayment.

**Weighted** splits the payment in proportion to each vote head's amount:

```
share = round((votehead amount / total term fee) * amount issued, 0, AwayFromZero)
```

It then adjusts the first row by the rounding difference so the shares sum to the amount issued. If the payment exceeds the total fee, the excess becomes overpayment. The old code rounds to whole shillings; the new money module allocates exact minor units by largest remainder, which is strictly better.

The yearly+weighted path applies the same weighted split term by term, resetting `totalFee` for each term, respecting prior payments, and carrying the unused amount into the next term.

#### Arrears, prepayments and overpayment

- In term one (or a new year) the old balance is inserted as a pseudo-vote-head (`fee_arrears`).
- If the learner has `excess_votehead_amount`, it is used before the new payment, up to the term fee; any remainder is written back.
- If the payment is larger than the outstanding balance, `excess_votehead_amount` grows; the grid shows an **Over Payment** row using the configured excess vote-head.
- A refund is `amount_received` with `mydescription = 'Fee Refund'`, which reduces the paid total.

#### What gets written

The save path writes, in one user action:

1. a `detailed_transaction` credit row for the receipt (`Payment Received`, `amount_received`, channel, receipt number, date, term/year);
2. one `votehead_transactions` row per vote-head share (`amount`, `amount_issued = 0`, link to the receipt);
3. a `detailed_transaction` debit row per vote-head share (`Payment Issued`, `amount_issued`, same link);
4. any overpayment row in `excess_votehead_amount`;
5. optionally an SMS to the payer.

This double-entry shape is why the old student statement can show a payment and its vote-head distribution separately. The new `payment` + `payment_allocation` pair is the cleaner equivalent, but the current cashier writes the payment and allocations without showing the distribution to the operator.

### 3.3 Bulk fee payment (`frmBulkFeePayment.cs`)

A class/stream grid of learners with an amount and a receipt number per learner, plus a journal, account category and date. Before showing the grid it verifies, per learner, that an effected fee structure exists for the same term/year/category; missing structures are listed as errors and the operator can still proceed only after fixing them. The distribution logic is the same as the single payment, but repeated per row. This is the old "bank the whole class's cash" workflow.

New state: `CashierPage` is one learner at a time; `PaymentsPage` and `PaymentAllocationPage` are separate. There is no bank-deposit/class-batch grid that records many learners in one cashier action. This is a real operational gap for schools that receive a teacher's or a bank's bulk collection.

### 3.4 Mass penalties and exemptions (`frmMassPenaltiesExemptions.cs`)

The operator chooses class and optional stream, loads all learners, and then either:

- ticks "blank" and enters one common amount for every learner, or
- enters an amount per learner in the grid;

selects one or more account category/vote-head pairs, enters a description, date, term and year, and saves. For each learner and each selected vote head it inserts one `penalities` row (title "Mass Fee Penalties") or one `exemptions` row (title "Mass Fee Exemptions"). There is no approval and no reversal; a correction is another row.

New state: `FeesFinesPage` creates a one-line charge invoice for one learner; `FeeAdjustmentsPage` creates a credit note for one learner. The single-record model is correct, but the class-wide action is missing. A faithful new implementation is a **bulk application page** that previews one fine/credit note per selected learner and posts them as canonical documents, with the same common-amount/per-learner choice.

### 3.5 Balance B/F and prepayments (`frmBalanceBF.cs`, `frmAdvancePayment.cs`)

`frmBalanceBF` loads a class/stream grid with an Amount column, supports Excel import/export, and saves each non-zero amount:

- positive → arrears (a `penalities` row linked to `Opening Balance`, using the configured arrears vote head);
- negative → prepayment (an `excess_votehead_amount` row).

The active term/year and the arrears vote-head account must be configured first. This is the old opening-balance import.

`frmAdvancePayment` is a staff advance against payroll, not a student prepayment: it checks the maximum advance from `partner_payroll_detials`, the already-paid advance for the period, and inserts into `processed_payroll`. It belongs to payroll, not fee billing; the new system's payroll module is the right home.

New state: `StudentOpeningBalancesPage` posts a canonical `opening_balance` invoice line; `BillingRunPanel` accepts opening balances in the run; `PreviousSessionFeesPage` now carries selected prior balances forward. The missing piece is the **class-grid import** with a dry-run and a per-row error report, not the accounting.

### 3.6 Receipts, refunds and invoice status

- `frmReceiptConfig` stores one row in `receipt_config`: receipt size (`A4`/`A5`/`A6`/thermal) and report type (`Table View`/`Report View`). `generateReports.getReceiptConfig()` reads it when printing.
- `frmFeePayment.feeRefund()` writes a `Fee Refund` event and reverses the vote-head distribution.
- `frmInvoiceStatus` is the supplier/customer side: it loads an LPO/invoice, shows the total, records a payment or receipt against it, and writes `detailed_transaction` plus `votehead_transactions`. It is not a student fee invoice.
- `frmReviewRecipts` and `frmAuditReceipts` review/reprint receipts; `frmReviewIncomeExpenditure` reviews the income/expenditure report.

New state: receipts are canonical `receipt` rows and a `ReceiptView`; `FeesReceiptTemplatePage` is a stub carrying `GAP(P1-E03)`. The old receipt-size/layout choice is a genuine gap, but it is a presentation feature, lower priority than distribution and the reports.

### 3.7 Accounting operations

The old accounting forms are conventional and mostly covered by the new ledger:

| Old form | What it did | New equivalent |
|---|---|---|
| `frmChartOfAccounts` | account categories and named accounts | `ChartOfAccountsPage`, canonical `ledger_account` |
| `frmJournals` | map category + nature to increase/decrease accounts | `accountingConfig` / posting rules |
| `frmAccountCategories` | revenue/expense categories | `fee_category`, ledger chart |
| `frmAccountBalances` | receipts/payments by category and date | ledger account ledger |
| `frmGeneralLedger` | grouped ledger by link/receipt | `AccountLedgerPage` |
| `frmCashBookReport` | cash book with running balance | `accounting/AccountingReportsPage` cash book |
| `frmBankReconciliation` / `frmViewBankReconciliation` | statement import and match | `reconciliation` module |
| `frmFundsTransfer` / `frmAuditFundsTransfer` | transfer between accounts, audited | ledger transfer (needs a page-level check) |
| `frmBudget` | vote-head budgets | `budget` table + budget-vs-actual report |
| `frmFinancialStatement` | income/expenditure and trial balance | `TrialBalancePage`, `IncomeStatementPage`, `BalanceSheetPage` |
| `frmCharting` | simple charts | dashboard charts |
| `frmCustomers` / `frmSupplier` / `frmCustomerSupplierInvoice` / `frmViewLPO` | customer/supplier ledger and LPO invoices | `CustomerInvoicesPage`, `SupplierInvoicesPage`, `SuppliersPage` |
| `frmPayrollPeriod` / `frmProcessPayroll` / `frmStaffPaymentSettings` | payroll | payroll module |

The old financial statements were **rebuilt from `detailed_transaction`** and `vote_heads` flags (`revenue`, `expenditure`, `funded`, `Income_expenditure`, `trial_balance`, `balance_sheet`). The new statements are ledger-based, which is the right model; the old flags are still a useful **classification** idea for fee items (which vote heads count as revenue, which as expenditure, which are funded). The new `fee_item` has `category` and `funding_source`, which covers most of it.

## 4. Reports

The old report set, with the exact arithmetic:

### 4.1 Student fee statement (`frmFeeStatement.cs`)

Rebuilds from base for one learner:

- for each `previous_fee_structure` row: the fee-structure total (one "Fee Invoice For Term X Y" row);
- each penalty (a "Fee Penalty" row, adding to the required total);
- each exemption (a "Fee Exemption" row, adding to the paid total);
- each `Payment Issued` receipt (a "Fee Payment" row, adding to paid);
- each `Fee Refund` (a "Fee Refund" row, subtracting from paid);
- running balance column (`formatBalance`): fees and penalties add, payments and exemptions subtract;
- final `TOTAL` and `FEE BALANCE` or `OVER PAYMENT`.

New equivalent: `src/domain/finance/statements` and `src/modules/finance/pages/statements/StatementsPage.tsx` build a learner/household/sponsor statement from posted ledger entries, with opening balance, invoice, allocation, credit, credit note, refund and adjustment movements, running balance, aging and clearance. This is stronger than the old statement. It does not show a fee-structure row that has not been billed, because the new model bills first; that is correct behaviour, not a gap.

### 4.2 Vote-head statement (`frmVoteheadStatement.cs`)

For one account category and vote head, over a date range:

- balance B/F = `sum(amount_received) - sum(amount_issued)` before the from date;
- each receipt/payment line with date, receipt number, payer or `getWho(link)`, receipt and payment columns;
- `BALANCE C/D`, `TOTAL`, `BALANCE B/F` to close the account.

New equivalent: `VoteheadStatementPage` reads canonical invoice lines and payment allocations with billed/paid/outstanding per line; `StudentVoteheadStatementPage` is the period-based statement. The old "vote-head as a cash account with B/F and C/D" view is not exactly reproduced because the new model does not post every allocation to a vote-head ledger account. If a true vote-head ledger is wanted, it should be built from the ledger's fee-item revenue accounts, not by re-reading invoices.

### 4.3 Student vote-head balances (`frmStudentVoteheadBalances.cs`)

A class-wide matrix: one row per learner, one column per vote head, plus Total. Options: class, stream, year, term, vote head, criteria (`>`, `<`, `=`, `>=`, `<=`) and amount. It computes each learner's fee amount per vote head, paid per vote head, and the balance; if no payment exists it shows the full fee. A totals row sums every column.

New equivalent: none. `VoteheadStatementPage` is one learner/invoice at a time. This is the single most useful old grid that is missing, because a bursar uses it to see which vote head a class is short on. It can be rebuilt from canonical `invoice_line` + `payment_allocation` grouped by learner and fee item, with class/stream filters and a criteria filter.

### 4.4 Fee balance / "enrolled, expected, paid, balance" (`frmViewStudentFeeBalance.cs`)

The operator chooses class, optional stream, year, term (yearly mode), optionally alumni, and a balance filter (`Greater Than`, `Less Than`, `Equal To`). For each continuing learner it sums, across every `previous_fee_structure` row up to the active term:

```
feeRequired = sum(fee_structure.amount) + sum(penalities.amount)
feePaid     = sum(exemptions.amount) + sum(Payment Issued receipts) - sum(Fee Refunds)
balance     = feeRequired - feePaid
```

and shows either a balance or an overpayment column. `sumTotal()` totals both columns.

New equivalent: `StudentFinancialSummaryPage` is per learner with billed, collected, credit notes and balance, class filter and arrears/settled/overpaid filters. It does not show an **enrolled count** or a class/stream *summary* row; it is a learner list, not a class report. The old report's filter vocabulary (greater/less/equal) is also missing.

### 4.5 Collection per vote head (`frmCollectionPerVotehead.cs`)

This is the old "expected vs paid vs arrears" report. For each vote head, for each student category, for each class:

```
expected = number of learners in previous_fee_structure × fee_structure amount for that vote head
paid     = sum(amount_received) - sum(amount_issued) for that vote head and term/year and those learners
arrears  = expected - paid
```

It prints a vote-head total, a category section, and a grand total. This is exactly the report the user described as "enrolled expected and paid, and balance."

New equivalent: `FeeCollectionSummaryPage` groups canonical invoice lines by description and shows billed, collected and arrears, with period and level filters. It is close but not the same: it does not group by class/stream/category, does not show an enrolled count, and its "expected" is whatever was billed rather than the price book × enrolment. For a school that has not run billing yet, it shows nothing; the old report showed the entitlement from the price book. Both views are useful and should be offered explicitly: **Billed** (document-based) and **Expected** (price-book × enrolment).

### 4.6 Fee register (`frmFeeRegister.cs`)

For a year/term/class/stream/category and one vote head: one row per learner, with the number of times the vote head was paid and the total paid, plus a total row. It is a vote-head collection register, not a document register.

New equivalent: none. Can be built from `payment_allocation` joined to `invoice_line.fee_item_id`, grouped by learner and fee item.

### 4.7 Detailed balances (`frmDetailedBalances.cs` + `studentBalances.cs`)

A school-wide or class-wide grid with one row per learner and the columns:

```
Adm No | Name | Class | Stream | Fee Amount | Fee Exemption | Fee Penalty |
Amount Paid | Balance | Overpay | Refund
```

It is computed learner by learner, supports refresh, export to Excel, and is persisted to `stud_balance_temp_table` so the next open is fast. The live table has 886 rows and exactly those columns. This is the old "fee status" spreadsheet.

New equivalent: `StudentFinancialSummaryPage` has billed/collected/credit/balance but not the exemption/penalty/refund split. `FeeAdjustmentsPage` and `FeesFinesPage` have the raw adjustments but not the combined grid. A single "Fee status" report with those columns is a strong, low-risk improvement.

### 4.8 Cash analysis (`frmCashAnalysisReport.cs`)

Receipts or payments, filtered by transaction type (channel) and date, grouped by receipt number, with date, description, receipt number and amount, plus a total. It is a channel analysis, not a ledger report.

New equivalent: the cash book and bank book are ledger-based and can be filtered by account/period, but there is no explicit **channel** analysis. The `payment.channel` field makes this easy to add to the accounting reports hub.

### 4.9 Financial statements (`frmFinancialStatement.cs`)

- **Income and expenditure**: for an account category, list vote heads with `revenue = yes` and sum `amount_received`; list vote heads with `expenditure = yes` and sum `amount_issued`; show totals and the difference.
- **Trial balance**: opening cash and bank; revenue/expenditure vote heads with budget, debit, credit, commitment and balance; balance-sheet vote heads; a balancing total.
- **Budget**: budget amount per vote head, and a comparison with actual.

New equivalent: the ledger trial balance, income statement, balance sheet, cash book, bank book and budget-vs-actual reports. This is covered, and better.

## 5. Data-grid conventions worth keeping

The old grids were not just tables; they encoded the workflow:

- **Editable amount columns** with per-row validation and an error list (`frmMassPenaltiesExemptions`, `frmBalanceBF`, `frmBulkFeePayment`). The operator could fix one row without losing the batch.
- **A "common amount" shortcut** plus per-learner override (`cbBlank` in mass penalties).
- **Class + optional stream** filters everywhere, and a status filter (`continuing`/`Alumni`).
- **Criteria filters** (`>`, `<`, `=`, `>=`, `<=`) on the balance column.
- **Export/import** on the balance B/F grid, and export on detailed balances.
- **Totals rows** that recompute over visible rows only (`sumTotal` in `frmViewStudentFeeBalance` skips hidden rows).
- **Progress** for learner-by-learner computation; the old reports were slow because they rebuilt everything.
- **Print** from the grid and a receipt/report layout configuration.

The new `DataGrid` gives sorting, filtering, pagination and selection. The missing pieces are bulk-edit cells, a per-row error summary, and a totals row that is part of the report rather than the grid.

## 6. SMS

The old finance module had three SMS paths:

1. **HTTP gateway** (`SendSMS.cs`): `https://sms.genius.ke/api/send/sms` with `secret`, `mode`, `message`, `gateway`, `phone`. It also fetched credits, rates and devices for `frmSMSConfiguration`.
2. **GSM modem** (`frmSendSMS.cs`): a COM port and a PDU submit; a phone number had to be 10 digits, and failures were written to `failed_messages` (`type`, `partner_id`, `reason`, `date`).
3. **Fee-balance message** (`frmSendSMS.Button1_Click`): for each row of the selected balances table, build `txtPretext + " Fee Balance For "` and send to `row["number"]`, keyed by `admin_no`.

New state: the SMS plugin interface exists (`SMSPlugin.send/bulkSend/sendTemplate/getDeliveryStatus`), a built-in `sms-gateway` plugin exists, and `src/domain/finance/collections` has templates, selection, quiet hours, opt-outs, promise-to-pay, pay links, schedules and an SMS channel. **No page uses the collections module.** This is a high-value, mostly assembled feature waiting for a UI: a "Fee reminders" tab that selects learners with a balance, previews the message, respects opt-outs/quiet hours, sends through the plugin, and records delivery.

## 7. New-system mapping

| Old concept | New equivalent | Status |
|---|---|---|
| `fee_structure` price row | `fee_schedule` + `fee_schedule_line`, `fee_item` | present |
| `effected` flag | schedule `status` + billing run | present |
| `previous_fee_structure` enrolment | `enrolment` + `learner` placement | present |
| fee structure effect creates learner rows | billing run creates `invoice` + `invoice_line` | present, better |
| `detailed_transaction` event ledger | `journal_entry` + `journal_line`, `payment`, `payment_allocation` | present |
| `votehead_transactions` distribution | `payment_allocation` to `invoice_line` | present |
| distribution priority/weighted | allocation strategies `vote_head_priority`, `proportional`, `oldest_first`, `manual` | engine present, UI/config missing |
| termly/yearly | invoice periods / allocation across invoices | partly; no termly/yearly switch |
| `penalities` | one-line `invoice` of kind `fine` (`FeesFinesPage`) | present, single learner |
| `exemptions` | `credit_note` (`FeeAdjustmentsPage`) | present, single learner |
| mass penalties/exemptions | none | **missing** |
| `excess_votehead_amount` | learner credit / overpayment in allocation | present, no dedicated grid |
| `fee_arrears` pseudo-vote-head | opening-balance invoice / arrears invoice | present |
| balance B/F grid | `StudentOpeningBalancesPage` one at a time; `PreviousSessionFeesPage` carry-forward | partial |
| student statement | ledger `StatementsPage` | present, better |
| vote-head statement | `VoteheadStatementPage`, `StudentVoteheadStatementPage` | present, invoice-based |
| class vote-head matrix | none | **missing** |
| fee balance / enrolled-expected-paid | `StudentFinancialSummaryPage`, `FeeCollectionSummaryPage` | partial |
| collection per vote head | `FeeCollectionSummaryPage` | partial |
| fee register | none | **missing** |
| detailed balances spreadsheet | `StudentFinancialSummaryPage` | partial |
| cash analysis by channel | cash book / bank book | partial |
| financial statements | ledger trial balance / income / balance sheet | present, better |
| receipt size/layout config | `FeesReceiptTemplatePage` stub | **missing** |
| fee-balance SMS | collections module + SMS plugin, no UI | **missing UI** |
| bulk class payment | cashier one at a time | **missing** |

## 8. Ranked gaps

### P0 — daily money workflow

1. **Configured payment distribution.** Support `vote_head_priority` end to end (the payments service currently cannot supply the priority lookup), expose the strategy on the cashier/payment screen, show the resulting allocation, and persist the school's default strategy.
2. **Receipt distribution breakdown.** A bursar and a parent need to see which vote head the money went to. The payment service already returns `plan.allocations`; the cashier receipt does not show them.
3. **Bulk class payment.** A class/stream grid that records one receipt per learner in a single action, with per-row validation and a bank-slip/date/channel header.

### P1 — reports and bulk adjustments

4. **Fee status report** with enrolled, expected, paid, balance, exemption, penalty and refund columns, class/stream/category filters and a criteria filter.
5. **Class vote-head matrix** and **fee register** (one row per learner, one column per vote head / one row per vote-head collection).
6. **Mass penalties/exemptions** with a common amount or per-learner amounts, preview, post and per-row errors.
7. **Balance B/F grid** with import/export and dry-run.
8. **Fee reminder UI** over the existing collections module.

### P2 — presentation and analysis

9. **Cash analysis by channel** in the accounting reports hub.
10. **Receipt layout configuration** (A4/A5/A6/thermal, table/report) and a real template editor.
11. **Vote-head as a ledger account** if the school wants a true vote-head statement with B/F/C/D rather than an invoice-line view.

### Deliberately not copied

- The `effected`/`active` flag pair. Schedules have a status and billing runs are idempotent; two booleans with an unclear meaning are not worth reproducing.
- The single-row `excess_votehead`/`fee_arrears` configuration table. A typed policy (strategy + scope) is clearer.
- Rebuilding financial statements from `detailed_transaction` strings. The ledger is the source of truth.
- Unvalidated SQL string concatenation. Every new query uses the repository.

## 9. What this pass implements

- **Distribution strategy at the counter.** `PaymentsService` now accepts a `defaultStrategy` and, when `vote_head_priority` is requested, builds the allocation engine's priority lookup from `fee_item.priority`. The cashier screen has a **Distribution** selector (vote-head priority, oldest invoice first, proportional) and sends the choice with the payment. The receipt already prints the resulting allocation by vote head, so the operator and the parent see where the money went.
- **Fee status by class and vote head.** A new **Fee Status** tab under Reports → Finance groups posted invoice lines by class and vote head and shows learners, billed, collected, outstanding and collected percentage, with period/class/vote-head filters, an arrears-only switch, CSV export and print. The arithmetic is a pure function (`feeStatus.ts`) with its own test.
- **Bulk penalties and exemptions.** A new **Bulk apply** tab under Finance → Fee Rules loads a class grid, accepts one common amount or an amount per learner, and posts one canonical `fine` invoice or one posted `credit_note` per learner. Rows with no tick apply the whole visible cohort, matching the old class-grid workflow.
- **Class payment grid.** A new **Bulk payment** tab under Finance → Payments records one payment per priced learner in a batch, with a shared channel, slip/reference, date and distribution policy. Each learner gets their own canonical payment, allocation and receipt; a refused row keeps its amount and shows the refusal in the grid.
- **Class vote-head matrix.** A new **Vote-head Matrix** tab under Reports → Finance shows one row per learner with one outstanding balance column per vote head and a total, with period/class filters, CSV and print. It is the modern form of the old `frmStudentVoteheadBalances` grid.
- **Cash analysis by channel.** A new **Cash Analysis** tab under Reports → Finance lists the payments in a date range with receipt, learner, channel, reference and status, plus a per-channel total. It replaces the old `frmCashAnalysisReport` read of `detailed_transaction`.
- **Bulk opening balances.** A new **Bulk Opening Balances** tab under Student Fee History takes a class grid of signed amounts: a positive amount posts an `opening_balance` invoice, a negative amount posts a posted credit note as a prepayment. It is the old `frmBalanceBF` grid without the raw arrears/penalty rows.

Not implemented in this pass: the fee-balance SMS screen, the automatic prepayment distribution on fee effecting, and the receipt layout editor. They remain the next items in the ranked list.

## 10. Verification

- `PaymentsService` priority test: a newer tuition invoice (priority 1) is paid before an older lunch invoice (priority 2), proving the strategy overrides invoice date; the written allocation is the same invoice.
- Cashier test: the chosen distribution travels with the payment.
- Fee status pure test: grouping, distinct learners, draft exclusion, class/vote-head filter, arrears filter, exact minor-unit totals.
- Vote-head matrix pure test: one column per vote head, exact per-cell balance, class filter and draft exclusion.
- Bulk adjustment tests: common-amount fines and exemption credit notes post one document per learner.
- Bulk payment test: one payment per priced learner, with the batch channel and distribution, and the receipt shown per row.
- Cash analysis pure test: date/channel filtering, void exclusion, newest-first order and per-channel totals.
- Bulk opening-balance test: a positive amount posts an opening-balance invoice and a negative one a prepayment credit note.
- Typecheck, ESLint on the changed files, and the full PRD gate are run before the PR is opened.
