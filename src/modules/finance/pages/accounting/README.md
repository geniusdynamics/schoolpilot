# The accounting reports

The reports of spec 05 section 8 that the ledger can answer: the trial balance, the income-and-
expenditure statement, the balance sheet, the cash book, the bank book, budget versus actual and the
period-close view. Every figure is derived from the ledger's **posted journal entries** through the
ledger's own derivations (`deriveTrialBalance`, `netOfTrialBalance`, `LedgerService.trialBalance`,
`accountBalance`, `listEntries`, `periods`); nothing here recomputes a balance from raw rows.

The hub is `AccountingReportsPage.tsx`, routed at `/finance/accounting-reports`.

## The inventory the task asked for first

The owner warned that the finance reports and grids, and especially the main reports view with the
CFO view, are largely dummy views. This is what is actually there, and what this task did about it.
**No existing page was deleted, and no placeholder was silently swapped for real data.**

| Page | Real or placeholder | Evidence | What this task did |
| --- | --- | --- | --- |
| `reports/pages/ReportsPage.tsx` — the "All Reports" landing with the **CFO** KPI table | **Placeholder** | `kpiData`, `summaryData` and `workingCapitalTrend` are hard-coded arrays in the file (Accounts Receivable 8,532,465.94 …); no data source at all | Left as is; recorded here. It is the "main reports view / CFO view" the owner named. It needs its own task: it models no ledger concepts. |
| `reports/pages/ReportsDashboardPage.tsx` | **Placeholder** | reads legacy `useAppData()` collections (`staff`, `classes`, `subjects`, `feeStructures`, `invoices`, `payments`, `exams`, `departments`) and a hard-coded `recentActivity` | Left as is; recorded. |
| `finance/pages/TrialBalancePage.tsx` | **Placeholder** | `const { trialBalanceItems } = useAppData()` — the demo-seeded `trial_balance_items` table; header comment `GAP(P1-E03)` | Superseded for ledger-backed figures by the trial balance panel of the new hub. Not deleted; it is the deprecated route `/finance/trial-balance` (redirects to the statements hub). |
| `finance/pages/IncomeStatementPage.tsx` | **Placeholder** | `incomeStatementItems` from `useAppData()` (`income_statement_items`); `GAP(P1-E03)` | Superseded by the income-and-expenditure panel. |
| `finance/pages/BalanceSheetPage.tsx` | **Placeholder** | `balanceSheetItems` from `useAppData()` (`balance_sheet_items`); `GAP(P1-E03)`; the local variable is literally named `mockBalanceSheet` | Superseded by the balance sheet panel. |
| `finance/pages/CashBookPage.tsx` | **Placeholder** | `cashBookEntries` from `useAppData()` (`cash_book_entries`); local variable `mockCashBookEntries`; `GAP(P1-E03)` | Superseded by the cash book panel. |
| `finance/pages/DayBookPage.tsx` | **Placeholder** | `dayBookEntries` from `useAppData()`; `mockDayBookEntries`; `GAP(P1-E03)` | Left as is (a day book is the journal filtered to a day; the ledger can answer it, but it is not one of this task's named reports). |
| `finance/pages/JournalRegisterPage.tsx` | **Placeholder** | `journalEntries` from `useAppData()`; `GAP(P1-E03)` | Left as is; the ledger's `listEntries` is the real source for a later task. |
| `finance/pages/AccountLedgerPage.tsx` | **Placeholder** | `useAccountLedger()` reads the legacy `general_ledger_entries` collection, not the ledger; `GAP(P1-E03)` | Left as is. |
| `finance/pages/FinancialStatementsPage.tsx` | Hub over the three placeholders above | renders `TrialBalancePageContent`, `BalanceSheetPageContent`, `IncomeStatementPageContent` | Left as is; the new hub is the ledger-backed route. |
| `finance/pages/AccountingOperationsPage.tsx` | Hub over placeholder ledger / cash book / day book / journal register | imports `CashBookPageContent`, `DayBookPageContent`, `JournalRegisterPageContent` | Left as is. |
| `finance/pages/FinanceDashboardPage.tsx` | **Real** | reads canonical data (listed in the migration guard `canonicalDataAccess.test.ts`) | Untouched. |
| `finance/pages/VoteheadStatementPage.tsx`, `FeeCollectionSummaryPage.tsx`, `StudentFinancialSummaryPage.tsx`, `StudentsPaidBookPage.tsx`, `FeesDueReportPage.tsx`, `PreviousSessionFeesPage.tsx` | **Real** | read `useCanonicalFinance()` (canonical `invoice_line`, `payment_allocation`, …) in exact minor units | Untouched. |
| `reports/pages/FinancialReportsHubPage.tsx` | Hub over the real finance pages above | imports the canonical `*PageContent` from the finance module | Untouched. |
| `reports/pages/FeeCollectionSummaryPage.tsx`, `StudentVoteheadStatementPage.tsx`, `StudentFinancialSummaryPage.tsx` | **Placeholder** | read legacy `useAppData()` collections (`studentInvoices`, `invoicePaymentApplications`, …) — duplicates of the canonical finance pages | Left as is; recorded. These are the reports-module copies that should be retired in favour of the finance canonical ones. |

**Nothing was replaced silently.** The six ledger books this task owns are new and ledger-backed; the
placeholders above are listed, not overwritten. The one honest gap is stated in the next section.

## The reports

Each report is a pure derivation in `accountingReports.ts` over the entries the ledger returns. Each
returns a `ReportTable` — the columns and the display text of every cell — and the screen and the CSV
export both render that one table, so they cannot disagree.

| Report | Source | Filter | The tie asserted |
| --- | --- | --- | --- |
| **Trial balance** `trialBalanceReport` | `deriveTrialBalance(entries, currency)` + `netOfTrialBalance` | as of the range's end (cumulative) | `balanced`; `totalDebit` = the journal's debits, `totalCredit` = the journal's credits; the rows net to zero; and it equals `LedgerService.trialBalance` row for row |
| **Income & expenditure** `incomeExpenditureReport` | revenue/expense accounts of the trial balance, classified by the chart (control accounts) then the code's first digit | the `from..to` range | `net` = the negation of the movement in the revenue and expense accounts (`revenueAndExpenseMovement`); every revenue/expense account of the trial balance appears (`coversEveryAccount`) |
| **Balance sheet** `balanceSheetReport` | asset/liability/equity accounts of the trial balance + the I&E result | as of the range's end | `totalAssets + totalUnclassified = totalLiabilities + totalEquity + retainedEarnings`; the result equals the I&E net over the same entries |
| **Cash book** `cashBookReport` | account `1010` (`CONTROL_ACCOUNTS.cash`) | the `from..to` range decides the lines; the opening is the balance before `from` | `closing` = `LedgerService.accountBalance('1010')`; opening + receipts − payments = closing |
| **Bank book** `bankBookReport` | account `1020` (`CONTROL_ACCOUNTS.bank`) | as the cash book | `closing` = `LedgerService.accountBalance('1020')` |
| **Budget vs actual** `budgetVsActualReport` | actual from the I&E statement; **the budget is a stored figure** the caller supplies | the `from..to` range | every row's actual equals the I&E line for the same account (`actualsEqualLedger`); the total equals the sum of those lines |
| **Period close** `periodCloseReport` | `LedgerService.periods(institutionId)` | — | no closed period is presented as editable (`noClosedPeriodEditable`) |

### Where the budget comes from

The budget side is a **stored figure supplied to the report** (`BudgetLine[]`, `budgetSource` says so
on screen). The platform models no budget entity — spec 05 section 8 names the budget-versus-actual
report but no budget document — and the canonical schema has no `budget` table, so the report takes
the budget as an input rather than inventing a store. The actual side always comes from the ledger.

## The fixture, and how each expected number was derived

`__tests__/accountingReports.test.ts` posts six entries through the **real ledger** (better-sqlite3,
no storage double) and states the hand-derivation in the file:

| # | date | debit | credit | minor units |
| --- | --- | --- | --- | --- |
| 1 | 2027-01-05 | 1100 Fee receivables | 3000 Opening balances | 500 000 |
| 2 | 2027-01-10 | 1100 Fee receivables | 4000 Fee revenue | 600 000 |
| 3 | 2027-01-12 | 1010 Cash | 1100 Fee receivables | 200 000 |
| 4 | 2027-01-15 | 1020 Bank | 1100 Fee receivables | 150 000 |
| 5 | 2027-01-20 | 5000 Salaries | 1020 Bank | 120 000 |
| 6 | 2027-01-21 | 5100 Bank charges | 1020 Bank | 5 000 |

Entries 1–4 are posted through the ledger's own derivations (`postOpeningBalance`, `postInvoice`,
`postPayment`); entries 5 and 6 are validated manual journals (`createJournalEntry` + `post`),
because the ledger derives no expense document (spec 05 section 8 lists none). The expected figures —
trial balance totals 1 575 000 each side; revenue 600 000, expenses 125 000, net 475 000; assets
975 000, equity 500 000, result 475 000; cash closing 200 000, bank closing 25 000 — are computed by
hand in the test and asserted, and the tie is asserted both as a flag and against the ledger service.

## Period close

`PeriodClosePanel` surfaces the ledger's period state: name, range, open/closed, when and by whom it
was closed, the reason, and the reopen's actor, time and reason. A closed period renders as a badge
and a sentence, and `PeriodRow.editable` is false for it; the page offers no edit control. The close
itself is the ledger's (`LedgerService.closePeriod` / `reopenPeriod`) and is **not reimplemented**
here; the fixture asserts that a posting into a closed period is refused with `period_closed`.

## Exports

CSV at minimum, and only CSV: the repo's `src/domain/reports/**` is a print/PDF layout domain with no
renderer the app can drive from a page, and this task may add no dependency, so no PDF path is added.
`reportTableToCsv` renders the same `ReportTable` the screen renders, RFC 4180 (comma separator, CRLF,
quoted when needed). The fixture test parses the CSV back and compares it to the table; the component
test captures the downloaded Blob and compares the CSV body to the rendered rows cell for cell.

## Reachability

The hub is named by a route and a navigation entry in `finance/moduleDefinition.tsx`:
`/finance/accounting-reports` → `accounting/AccountingReportsPage`. `pageLoader.ts` globs
`modules/*/pages/**/*.tsx`, so the nested path resolves, and
`src/routing/__tests__/pageRouteCoverage.test.ts` passes (11 tests) with the new page discovered and
reached.

## Tests

| File | Guards |
| --- | --- |
| `__tests__/accountingReports.test.ts` | 17 fixture tests: every report's hand-derived figures and its tie, the ranged book's opening, the period-close presentation, and that the ledger refuses a posting into a closed period |
| `__tests__/AccountingReportsPage.test.tsx` | 6 component tests: the not-connected state, each report drawn, the tie badge, a closed period read-only, and the export equal to the screen |

## The honest gap

The reports read the ledger, but **the app does not open the ledger on its own**: the ledger's DDL
(`LEDGER_DDL`) has no canonical migration yet (the ledger README names this limit), and the canonical
repository does not expose its adapter. So `AccountingReportsPage` takes the ledger — or the SQLite
adapter it is built over — as a prop, exactly as `DataIntegrityPage` does, and the routing shell
renders it without one, showing "The ledger is not connected" with the reason. The fixture and
component tests supply a ledger, so the reports are exercised end to end. Wiring the app to the
ledger is a migration task outside this one's files; it is reported, not worked around.
