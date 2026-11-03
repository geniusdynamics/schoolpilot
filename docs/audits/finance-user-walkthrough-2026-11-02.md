# Finance, walked through as a user

Date: 2026-11-02
Build: `consolidation` at `e632f4a` (after PR #76), Vite dev server.
Companion to `academics-user-walkthrough-2026-11-02.md`, done the same way.

> **Status, 2026-11-03.** The findings below were worked. What closed them: #80 (the second set of
> financial statements retired from the menu and every old address redirected to Accounting Reports),
> #81 (expenses can be recorded and post to the ledger), #82 (learner credit in the summary, document
> numbers on the statement and receipt, the cashier states what is owed, the dashboard's loading
> state, posted payments not editable, pagination, one money format) and #84 (the learner balance in
> Fees Due and the portal no longer double-counts fines or ignores unallocated payments). Still open:
> two charts of accounts and two lists of financial years, both of which need a canonical
> `ledger_account` entity before they can be one. The running list is `.opencode/todo.md`.

## How it was tested

- A fresh browser profile, onboarding, "Explore with Demo Data" (Greenfields Academy, 33 learners, a
  year of fees, payments, credit notes, refunds and write-offs), desktop 1440x900.
- **Scripted, clicking through the UI as a user does** (Playwright, in-app navigation): all 16 Finance
  pages and their 42 in-page tabs as the demo finance officer (`finance`), recording headings, alerts,
  empty states, row counts, raw keys, controls past the right edge and console errors.
- **Workflows** as the finance officer: take a cash payment at the cashier and close the session, find
  the payment in the learner's statement, the financial summary, the payments list and the ledger
  reports; then sign in as the teacher and try the Finance pages.
- Each data-source claim was checked in the code, with the file named. Two first readings that turned
  out to be my own timing were re-checked and are recorded as such below, not as defects.

Not covered: the billing run (CI's finance golden path posts one on every pull request), refunds,
write-offs and their approvals, the cheque lifecycle, bank-statement reconciliation, period close,
reversing a payment, posting a credit note, sending fee reminders, printing, phone and tablet widths,
Firefox and Safari.

## Summary

The money core is sound: a payment taken at the cashier gets a sequence-numbered receipt, the
session's Z-report balances, the payment reaches the learner's statement, and the statement and the
ledger-backed reports tie to the journal. Finance also refuses a teacher on every page - the
permission check Academics lacks.

Around that core sit **legacy pages that contradict it**: a second set of financial statements whose
trial balance reads **"Unbalanced"**, a second chart of accounts, a second list of financial years,
and invented cash books, bank accounts, suppliers and invoices. And **expenses cannot be recorded at
all**.

| Severity | Count |
|---|---|
| Blocker | 2 |
| High | 7 |
| Medium | 8 |
| Low | 4 |

## Blockers

**B1. Two sets of financial statements that disagree, one of them unbalanced.**

| | Accounting Reports (the ledger) | Financial Statements and Accounting Ops (legacy) |
|---|---|---|
| Trial balance | "Ties to the journal", 20 accounts, total debits Ksh 6,170,170 | 12 accounts, debits KES 5,765,000, credits KES 6,520,000, **"Unbalanced"** |
| Balance sheet | ties to the journal | assets KES 21.0M against liabilities 5.6M + equity 20.9M - does not balance |
| Income statement | income and expenditure from the journal | revenue KES 3,950,000, expenses 2,485,000, "Profit Margin 37.1%" |
| Cash book | account 1010 Cash, ties to the journal | "Total Cash In KES 105,000, Out 40,000" |
| Day book / journal | - | day book "Net Position KES -50,000"; journal register 5 entries, KES 235,000 |

The legacy hubs render `TrialBalancePage`, `BalanceSheetPage`, `IncomeStatementPage`
(`FinancialStatementsPage.tsx`) and `AccountLedgerPage`, `CashBookPage`, `DayBookPage`,
`JournalRegisterPage` (`AccountingOperationsPage.tsx`), all reading the legacy collections through
`useAppData`. The accounting README lists them as placeholders superseded by the ledger panels
(`src/modules/finance/pages/accounting/README.md:23-25`) - but both hubs are still in the menu, beside
Accounting Reports. A bursar or an auditor who opens the wrong one reads invented figures and an
unbalanced trial balance.

**B2. Expenses cannot be recorded.** Expenses & Banking > Expenses is a line of text, "Expense records
will appear here" (`ExpensesPage.tsx:33`). Supplier invoices live in the legacy collections and post
nothing. The school's spending has no way into the ledger, so its income and expenditure shows income
only.

## High

**H1. Two charts of accounts.** Accounting Config edits a legacy chart - `1001 School Bank Account - KCB`,
`1002 Petty Cash`, "Accounts Receivable - Students" - through `useFinance` -> `useFinanceData`. The ledger
posts to its own control accounts (1010 Cash, 1020 Bank, 1100 Fee receivables, 4100 Tuition, which the fee
items map to). An account added or renamed in Accounting Config changes nothing the ledger posts.

**H2. Two lists of financial years.** Financial Years reads the legacy `financial_years` collection
(`useFinancialYearData.ts:11`) and lists FY 2023-2026 with Close and Reopen. The sample school's
financial years and the ledger's periods are canonical, and the ledger's close is Accounting Reports >
Period Close. Closing "FY 2026" on that page closes nothing in the books (by the data model; I did not
press Close).

**H3. More legacy pages with invented data.** On `useFinance` (legacy): Customer Invoices (`CI/2024/001`),
Supplier Invoices, Bank Accounts (KCB 1234567890), Suppliers (Text Book Centre, Nakumatt and others),
Transport Routes - one route with **no name and KES 0.00** - and Student Transport Assignments
("Michael Scofield, Route A - Westlands, Term 1 - AY 2023/2"). On a production install these pages are
empty, and they still post nothing.

**H4. The financial summary misses a learner's credit.** Amani Wekesa owed nothing; after a KES 2,500
payment that put the account in credit, Student Financial Summary still shows Collected KES 122,350 and
Balance KES 0.00, and it has no credit column (`ADM NO | LEARNER | CLASS | BILLED | COLLECTED | CREDIT
NOTES | BALANCE | EARLIEST DUE`). The learner's statement shows a closing balance of -Ksh 2,500.00. Two
pages disagree about what the school owes the learner.

**H5. The statement names internal IDs.** A line reads "allocation SLIP-765065 allocated to invoice
01a19da6-065b-79ca-9731-8b195fd4bd06", and the new payment appears as "credit 01a19da9-cdb8-... learner
credit" instead of `RCT/2026/000075`. A statement is a document for a parent; it should name invoice and
receipt numbers.

**H6. The official receipt is incomplete.** Receipt `RCT/2026/000075` prints "CASHIER —" (the signed-in
finance officer is not named) and the date as a raw timestamp, "2026-11-02T19:08:33.568Z".

**H7. The cashier takes money without saying what is owed.** Choosing the learner shows no balance; the
payment was taken and only the receipt said "Unallocated (learner credit)". A cashier cannot tell a parent
"you owe X" or notice an overpayment before taking it.

## Medium

**M1. The dashboard shows wrong totals while it loads.** Read early, it said Outstanding KES 3,158,950
(the amount billed), a 0% collection rate, KES 0 refunded and 149 overdue of 150 unsettled invoices.
Settled, it says 44 overdue, KES 440,505 outstanding, KES 6,000 refunded in 2 refunds. Invoice balances
are computed before the allocations arrive and there is no loading state, so a glance at the wrong moment
shows every invoice unpaid.

**M2. Two places to run billing and two cashiers.** Fee Configuration > Structures ("Effect Fee Structures
(Generate Student Invoices)") and Invoicing > Invoice Generation both preview and post a billing run. The
Cashier page and Payments > Cashier are both "Take a payment". Fee Configuration also has three
schedule tabs: "Templates" (which lists fee schedules), "Fee schedules (the matrix)" and "Structures".

**M3. Posted payments offer Edit.** Every posted payment has Edit beside Reverse. Money that has been
posted should be reversed and taken again, not edited; I did not test whether Edit changes a posted
amount.

**M4. Controls past the right edge at 1440 px.** Fee schedules (Edit, Lines, Delete), fee items (Edit,
Deactivate), adjustments (Edit, Void), fines (Credit note), payments (Edit, Reverse), the statement's
CSV, and "Add" on the billing-run pages.

**M5. Class filters say "East" and "West" with no grade** (Bulk apply, Bulk payment, Bulk opening
balances), as in Academics. Collection Summary opens on Term 1, not the current term.

**M6. Collection Summary has duplicate React keys** (`paidMinor`): React warns that rows may be
duplicated or dropped.

**M7. The finance officer is someone else.** The header reads "Jane Doe (Finance)", from the legacy demo
user list; the sample school's bursar is Grace Njoroge. The blank cashier on the receipt (H6) may come
from the same mismatch.

**M8. The payments list is not paginated.** All 146 payments render in one table; a real school takes
thousands a term.

## Low

- **L1. Finance is in the teacher's menu** although every Finance page answers "Access Denied" for a
  teacher.
- **L2. Mixed money formats.** "KES 2,500.00" on the pages, "Ksh 2,500.00" on the receipt and statement,
  and "KES 21.0M" on the legacy balance sheet.
- **L3. Fee items are called "vote heads" in one place only** ("Fee items (vote heads)"); the term isn't
  explained anywhere.
- **L4. The Cashier sessions page reads "No sessions yet"** on a demo with a year of payments, because the
  seeded payments are not attached to sessions. True, but it looks broken on a demo.

## Workflows

| Workflow | Role | Outcome |
|---|---|---|
| Open a cashier session (float KES 1,000) | finance | **Works** |
| Take KES 2,500 cash from Amani Wekesa | finance | **Works**: receipt `RCT/2026/000075` from the sequence. No balance shown first (H7); receipt lacks the cashier and shows a raw date (H6). |
| Close the session with KES 3,500 counted | finance | **Works**: Z-report expected KES 3,500.00, counted 3,500.00, variance 0.00. |
| The payment in the learner's statement | finance | **Works**: "Agrees with the ledger", closing balance -Ksh 2,500.00; but listed by internal ID (H5). |
| The payment in the financial summary | finance | **Missing**: no credit shown (H4). |
| The payment in the payments list | finance | **Works**: the first of 146 rows. (My first check read the page too early and reported it missing.) |
| The ledger reports | finance | **Works**: trial balance "Ties to the journal", 20 accounts, Ksh 6,170,170. |
| Finance as a teacher | teacher | **Refused** on the dashboard, cashier, payments, fee configuration and accounting reports - correct. The menu still shows Finance (L1). |

## Suggested order of work

1. B1: take Financial Statements and Accounting Ops out of the menu (or point them at the ledger panels
   that already exist); there must be one trial balance.
2. B2: an expense entry that posts to the ledger.
3. H1, H2: one chart of accounts and one list of financial years - the ledger's.
4. H4-H7: the summary shows credit; the statement and receipt name documents and people.
5. H3, then the Medium and Low items.
