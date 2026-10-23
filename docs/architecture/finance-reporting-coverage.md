# Finance reporting coverage: what the real implementations replace, and what they do not

This is the decision record for the follow-up to P3-E03. The owner asked, for the finance reports:

> "For the finance reports, if the new implementations carry the actual true data implementations, let's
> retire the old ones, **only if everything in the old mock versions has been reimplemented with actual
> data**; otherwise, retain them, for manual verifications."

So the bar is **complete coverage of everything the old page does** — every KPI, tile, column, filter,
date range, drill-down, export and action read from the old page's source, not from its title. A page
with any item the real implementation lacks is **retained**, and the missing item is named below.

**The verdict: no page is retired.** Every candidate legacy page has at least one KPI, column, filter or
action that the real implementation does not provide. The full comparison is in the tables below; the
consolidated list of what to verify by hand is in [Retained](#retained--what-to-verify-by-hand).

Two things make the "retain" verdict the safe one as well as the honest one:

1. **Feature gaps.** The ledger-backed accounting hub is a *table* of code/account/amount figures. The
   legacy pages carry filters (account type, category, status, payment method, free-text search), derived
   ratios (profit margin, working capital, debt ratio, % of total) and per-row columns the hub does not
   render. None of those are covered.
2. **The ledger is not connected yet.** The accounting hub takes the ledger as a prop and, in the running
   app, renders *"The ledger is not connected"* (`accounting/AccountingReportsPage.tsx:130-139`). Retiring
   a book now would replace a page showing **wrong** numbers with a page showing **no** numbers. See
   [The ledger dependency](#the-ledger-dependency).

---

## The verdict at a glance

| Candidate (legacy / placeholder) | The real implementation | Verdict | What the real one lacks |
| --- | --- | --- | --- |
| `finance/pages/TrialBalancePage.tsx` | Trial balance panel, `/finance/accounting-reports` | **Retained** | account-type filter and column; free-text account search; per-column sort/filter |
| `finance/pages/IncomeStatementPage.tsx` | Income & expenditure panel | **Retained** | "Compare with previous period"; profit margin; "% of total" column |
| `finance/pages/BalanceSheetPage.tsx` | Balance sheet panel | **Retained** | category filter; free-text search; working capital; debt ratio; subcategory column; "% of category" column |
| `finance/pages/CashBookPage.tsx` | Cash book panel | **Retained** | free-text search; transaction count; payment-method column |
| `finance/pages/DayBookPage.tsx` | *(none — the hub has no day book)* | **Retained** | everything: no real day book exists |
| `finance/pages/JournalRegisterPage.tsx` | *(none — the hub has no journal register)* | **Retained** | everything: no real journal register exists |
| `finance/pages/AccountLedgerPage.tsx` | *(none — the hub has no account ledger)* | **Retained** | everything: no real account ledger exists |
| `finance/pages/FinancialStatementsPage.tsx` | hub over the three placeholders | **Retained** | its tabs are the retained pages above |
| `finance/pages/AccountingOperationsPage.tsx` | hub over four placeholders | **Retained** | its tabs are the retained pages above |
| `reports/pages/FeeCollectionSummaryPage.tsx` | `finance/pages/FeeCollectionSummaryPage.tsx` | **Retained** | class filter; Print; Export CSV |
| `reports/pages/StudentFinancialSummaryPage.tsx` | `finance/pages/StudentFinancialSummaryPage.tsx` | **Retained** | period filter; stream filter; adjustments column |
| `reports/pages/StudentVoteheadStatementPage.tsx` | `finance/pages/VoteheadStatementPage.tsx` | **Retained** | per-student statement; opening/closing balance; letterhead; debit/credit columns; receipt no; Print/PDF |
| `reports/pages/AccountLedgerPage.tsx` | *(none)* | **Retained** | everything: no real account ledger exists |
| `reports/pages/ReportsPage.tsx` (CFO view) | *(none)* | **Retained** | everything: models no ledger concept (see note) |
| `reports/pages/ReportsDashboardPage.tsx` | *(none)* | **Retained** | everything; also rendered by a live test asserting its behaviour |

`reports/pages/FinancialReportsHubPage.tsx` is **real** (a hub over the canonical finance pages) and was
never a retirement candidate.

---

## What the real implementations provide

### The ledger-backed accounting hub (P3-E03)

`src/modules/finance/pages/accounting/`, routed at `/finance/accounting-reports`:

- `AccountingReportsPage.tsx` — the hub. Tabs at `:90-117`; the shared **From / To** date range and
  **Period** select at `:195-223`; the panels at `:163-179`; the not-connected state at `:130-139`.
- `reportPanels.tsx` — one panel per book, each with a tie badge, figure cards and the shared table:
  - `TrialBalancePanel` `:73-97` — figures Total debits / Total credits / Balanced / Net `:84-93`.
  - `IncomeExpenditurePanel` `:99-122` — Total revenue / Total expenses / Net `:107-115`.
  - `BalanceSheetPanel` `:124-144` — Total assets / Total liabilities / Total equity / Result `:130-135`.
  - `BookPanel` `:146-165` — Opening / Receipts / Payments / Closing `:157-162` (cash book and bank book).
  - `BudgetVsActualPanel` `:167-193`; `PeriodClosePanel` `:195-253`.
- `accountingReports.ts` — the pure derivations and the report tables:
  - trial balance columns **Code / Account / Debit / Credit / Balance** `:226-232`;
  - income & expenditure columns **Section / Code / Account / Amount** `:358-364`;
  - balance sheet columns **Section / Code / Account / Amount** `:510-516`;
  - cash/bank book columns **Date / Reference / Particulars / Receipt / Payment / Balance** `:690-698`;
  - budget vs actual columns **Code / Account / Budget / Actual / Variance / Variance %** `:856-864`;
  - period close columns `:941-954`.
- `ReportTableView.tsx` — a plain `<table>` (`:19-62`) plus one **Export CSV** button (`:77-103`). It has
  **no search, no sort, no per-column filter**; the CSV export (`reportTableToCsv`, `accountingReports.ts:156-162`)
  is the only export, and there is no PDF path (`accounting/README.md:90-96`).

### The canonical finance pages (real, ledger/canonical-backed)

| Page | Source | Notes |
| --- | --- | --- |
| `finance/pages/FeeCollectionSummaryPage.tsx` | `useCanonicalFinance()` `:22` | period + level pickers `:100-121`; columns Votehead/Billed/Collected/Arrears `:54-90`; **no Print, no export** |
| `finance/pages/StudentFinancialSummaryPage.tsx` | `useCanonicalFinance()` `:28` | totals cards `:158-166`; search/class/balance filters `:172-202`; columns `:110-153`; **no period filter** |
| `finance/pages/VoteheadStatementPage.tsx` | `useCanonicalFinance()` `:34` | search + period pickers `:134-152`; **invoice-line** columns `:76-121` |
| `finance/pages/StudentsPaidBookPage.tsx` | `useCanonicalFinance()` `:32` | date range + search `:102-117`; columns `:69-90` |
| `finance/pages/FeesDueReportPage.tsx` | `useStudentFinancialSummary()` `:15` | aging buckets |
| `finance/pages/PreviousSessionFeesPage.tsx` | `useCanonicalFinance()` `:32` | |
| `reports/pages/FinancialReportsHubPage.tsx` | hub over FeesDue / StudentsPaidBook / VoteheadStatement `:16-18` | real |

---

## The comparison, page by page

### 1. `finance/pages/TrialBalancePage.tsx` — **Retained**

Reads the demo-seeded `trial_balance_items` (`:15`, header `GAP(P1-E03)` `:1`). Replacement: the trial
balance panel of the accounting hub.

| The old page shows / does | Source | Covered? |
| --- | --- | --- |
| As-of date filter | `:140-147` | **Yes** — the hub's range end is the as-of date (`AccountingReportsPage.tsx:195-223`) |
| Account-type filter (Asset/Liability/Equity/Revenue/Expense) | `:148-159`, list `:103` | **No** |
| Search by account name or code | `:160-169` | **No** |
| Card: Total Accounts (count) | `:174-182` | **Yes** — "N account(s)" (`reportPanels.tsx:80-83`) |
| Card: Total Debits | `:183-191` | **Yes** (`reportPanels.tsx:85`) |
| Card: Total Credits | `:192-200` | **Yes** (`reportPanels.tsx:86`) |
| Card: Balance Status (Balanced/Unbalanced + diff) | `:201-214` | **Yes** — "Balanced Yes/No" + Net (`reportPanels.tsx:87-92`) |
| Column: Account Code | `:66-71` | **Yes** — "Code" (`accountingReports.ts:227`) |
| Column: Account Name | `:72-77` | **Yes** — "Account" (`accountingReports.ts:228`) |
| Column: Account Type (badge) | `:78-84` | **No** |
| Column: Debit Balance | `:85-92` | **Yes** — "Debit" (`accountingReports.ts:229`) |
| Column: Credit Balance | `:93-100` | **Yes** — "Credit" (`accountingReports.ts:230`) |
| Per-column sort / filter | `sortable`/`filterable` on the columns | **No** — the hub table is a plain `<table>` |
| Export | `exportable={true}` `:222` | n/a — `exportable` is not a DataGrid prop and does nothing (see [Note on `exportable`](#note-on-exportable)); the hub's CSV export is a real gain |

### 2. `finance/pages/IncomeStatementPage.tsx` — **Retained**

Reads `income_statement_items` (`:14`, `GAP(P1-E03)` `:1`). Replacement: the income & expenditure panel.

| The old page shows / does | Source | Covered? |
| --- | --- | --- |
| Start / End date filter | `:124-141` | **Yes** — From/To (`AccountingReportsPage.tsx:195-213`) |
| "Compare with Previous Period" checkbox | `:142-152` | **No** |
| Card: Total Revenue | `:157-165` | **Yes** (`reportPanels.tsx:108`) |
| Card: Total Expenses | `:166-174` | **Yes** (`reportPanels.tsx:109`) |
| Card: Net Income | `:175-183` | **Yes** (`reportPanels.tsx:110-114`) |
| Card: Profit Margin | `:184-192` | **No** |
| Panel: Revenue Breakdown (per revenue account) | `:197-207` | **Yes** — the table's Revenue rows (`accountingReports.ts:365-377`) |
| Panel: Expense Breakdown (per expense account) | `:208-218` | **Yes** — the table's Expense rows (`accountingReports.ts:378-389`) |
| Column: Category (Revenue/Expense) | `:58-65` | **Yes** — "Section" (`accountingReports.ts:359`) |
| Column: Account | `:66-71` | **Yes** (`accountingReports.ts:361`) |
| Column: Amount | `:72-81` | **Yes** (`accountingReports.ts:363`) |
| Column: % of Total | `:82-88` | **No** |

### 3. `finance/pages/BalanceSheetPage.tsx` — **Retained**

Reads `balance_sheet_items` (`:16`, local variable literally `mockBalanceSheet` `:22`, `GAP(P1-E03)` `:1`).
Replacement: the balance sheet panel.

| The old page shows / does | Source | Covered? |
| --- | --- | --- |
| As-of date filter | `:153-161` | **Yes** — the range end (`AccountingReportsPage.tsx:195-223`) |
| Category filter (Asset/Liability/Equity) | `:162-174` | **No** |
| Search (account or subcategory) | `:175-184` | **No** |
| Card: Total Assets | `:189-197` | **Yes** (`reportPanels.tsx:131`) |
| Card: Total Liabilities | `:198-206` | **Yes** (`reportPanels.tsx:132`) |
| Card: Total Equity | `:207-215` | **Yes** (`reportPanels.tsx:133`) |
| Card: Working Capital | `:216-224` | **No** |
| Card: Debt Ratio | `:225-233` | **No** |
| Panel: Assets Breakdown | `:238-254` | **Yes** — the table's Asset rows (`accountingReports.ts:517-529`) |
| Panel: Liabilities & Equity | `:255-271` | **Yes** — the Liability and Equity rows (`accountingReports.ts:530-559`) |
| Column: Category | `:87-93` | **Yes** — "Section" (`accountingReports.ts:511`) |
| Column: Subcategory | `:94-99` | **No** |
| Column: Account | `:100-105` | **Yes** (`accountingReports.ts:513`) |
| Column: Amount | `:106-115` | **Yes** (`accountingReports.ts:515`) |
| Column: % of Category | `:116-121` | **No** |

### 4. `finance/pages/CashBookPage.tsx` — **Retained**

Reads `cash_book_entries` (`:14`, local variable `mockCashBookEntries` `:20`, `GAP(P1-E03)` `:1`).
Replacement: the cash book panel (`BookPanel` + `cashBookReport`).

| The old page shows / does | Source | Covered? |
| --- | --- | --- |
| Start / End date filter | `:126-141` | **Yes** — From/To (`AccountingReportsPage.tsx:195-213`) |
| Search by description or reference | `:143-152` | **No** |
| Card: Total Cash Out | `:157-165` | **Yes** — "Payments" (`reportPanels.tsx:160`) |
| Card: Total Cash In | `:166-174` | **Yes** — "Receipts" (`reportPanels.tsx:159`) |
| Card: Transactions (count) | `:175-183` | **No** |
| Card: Cash Balance | `:184-192` | **Yes** — "Closing balance" (`reportPanels.tsx:161`) |
| Column: Date | `:41-46` | **Yes** (`accountingReports.ts:692`) |
| Column: Reference | `:47-52` | **Yes** (`accountingReports.ts:693`) |
| Column: Description | `:53-58` | **Yes** — "Particulars" (`accountingReports.ts:694`) |
| Column: Payment Method | `:59-64` | **No** |
| Column: Debit (Out) | `:65-72` | **Yes** — "Payment" (`accountingReports.ts:696`) |
| Column: Credit (In) | `:73-80` | **Yes** — "Receipt" (`accountingReports.ts:695`) |
| Column: Balance | `:81-88` | **Yes** (`accountingReports.ts:697`) |

### 5. `finance/pages/DayBookPage.tsx` — **Retained**

Reads `dayBookEntries` (`:14`, `mockDayBookEntries` `:19`, `GAP(P1-E03)` `:1`). **The accounting hub has no
day book**, so nothing is covered. The page shows a Select-Date filter (`:123-131`), a search
(`:132-141`), four cards — Total Debits / Total Credits / Transactions / Net Position (`:146-181`) — and
a grid with Date / Reference / Description / Account / Debit / Credit / Source columns (`:41-86`). The
ledger can answer a day book (`LedgerService.listEntries`) but P3-E03 did not build one; the README says so
(`accounting/README.md:25`).

### 6. `finance/pages/JournalRegisterPage.tsx` — **Retained**

Reads `journalEntries` (`:15`, `GAP(P1-E03)` `:1`). **The hub has no journal register.** The page shows
Start/End date (`:167-184`), Status filter (`:185-196`) and search (`:197-206`); four cards — Journal
Entries count / Total Debits / Total Credits / Balance (`:211-246`); and columns Voucher No / Date /
Description / Reference / Debit Account / Credit Account / Debit / Credit / Status (`:70-128`). None
covered.

### 7. `finance/pages/AccountLedgerPage.tsx` — **Retained**

`useAccountLedger()` reads the legacy `general_ledger_entries` collection (`:40`; `useAppData()` for the
chart `:41`; `GAP(P1-E03)` `:3`). **The hub has no per-account ledger.** The page shows a search
(`:224-229`), an account select (`:230-241`), a date range (`:242-257`), a Refresh action (`:259-268`),
Total Debit / Total Credit / Net Balance cards (`:272-287`), Print (`:291-298`) and Export CSV (`:299-307`),
and columns Date / Description / Particulars / Debit / Credit / Account (`:89-145`). None covered.

### 8. `finance/pages/FinancialStatementsPage.tsx` — **Retained**

A hub (`/finance/financial-statements`) whose three tabs render the retained placeholders
`TrialBalancePageContent`, `BalanceSheetPageContent`, `IncomeStatementPageContent` (`:10-12`, `:26-45`).
It is only "covered" to the extent its tabs are, and they are not. It also owns the deprecated routes
`/finance/trial-balance`, `/finance/income-statement`, `/finance/balance-sheet` (see
[Where each page is referenced](#where-each-page-is-referenced)).

### 9. `finance/pages/AccountingOperationsPage.tsx` — **Retained**

A hub (`/finance/accounting-ops`) over `AccountLedgerPageContent`, `CashBookPageContent`,
`DayBookPageContent`, `JournalRegisterPageContent` (`:9-12`, `:26-51`). Same reasoning.

### 10. `reports/pages/FeeCollectionSummaryPage.tsx` — **Retained**

A legacy copy reading `useAppData()` (`:24-32`); it is named in the reports canonical-data guard
(`reports/pages/__tests__/canonicalDataAccess.test.ts:105`). Replacement:
`finance/pages/FeeCollectionSummaryPage.tsx` (canonical).

| The old page shows / does | Source | Covered by the canonical page? |
| --- | --- | --- |
| School Period filter | `:144-147` | **Yes** — period picker (`finance/.../FeeCollectionSummaryPage.tsx:100-108`) |
| Class filter (via class streams) | `:148-151` | **No** — the canonical filters by **level**, not class |
| "Generate Summary" button | `:152-154` | n/a — the canonical recomputes reactively; no capability lost |
| Column: Votehead | `:91` | **Yes** (`:56-61`) |
| Column: Expected Amount | `:92` | **Yes** — "Billed" (`:62-68`) |
| Column: Paid Amount | `:93` | **Yes** — "Collected" (`:69-75`) |
| Column: Arrears | `:94` | **Yes** (`:76-89`) |
| Print | `:165` | **No** |
| Export CSV | `:166` (handler `:103-134`) | **No** |

### 11. `reports/pages/StudentFinancialSummaryPage.tsx` — **Retained**

Legacy copy reading `useAppData()` (`:26-35`); named in the reports guard (`:106`). Replacement:
`finance/pages/StudentFinancialSummaryPage.tsx`.

| The old page shows / does | Source | Covered? |
| --- | --- | --- |
| School Period filter | `:131-134` | **No** — the canonical aggregates every period; no period filter |
| Class filter | `:135-138` | **Yes** (`finance/.../StudentFinancialSummaryPage.tsx:179-189`) |
| Stream filter | `:139-142` | **No** |
| "Generate Report" button | `:143-145` | n/a — reactive in the canonical |
| Column: Adm No | `:112` | **Yes** (`:111`) |
| Column: Student Name | `:113` | **Yes** — "Learner" (`:112-118`) |
| Column: Class | `:114` | **Yes** (`:119`) |
| Column: Total Billed | `:115` | **Yes** — "Billed" (`:120-126`) |
| Column: Total Paid | `:116` | **Yes** — "Collected" (`:127-133`) |
| Column: Adjustments | `:117` | **No** — the canonical shows **Credit notes**, a different document |
| Column: Balance | `:118` | **Yes** (`:141-151`) |
| Print / Export CSV | `:155-158` | n/a — the old buttons only `alert("to be developed")`, so they are not real features |

### 12. `reports/pages/StudentVoteheadStatementPage.tsx` — **Retained**

Legacy copy reading `useAppData()` (`:24-33`), with the statement math in a pure builder
(`src/modules/reports/utils/studentVoteheadStatement.ts`); named in the reports guard (`:107`).
Replacement: `finance/pages/VoteheadStatementPage.tsx` — but they are **different reports**: the legacy
one is a *per-student statement with a running balance*, the canonical one is a *flat list of invoice
lines*.

| The old page shows / does | Source | Covered? |
| --- | --- | --- |
| Student selector (required) | `:113-116` | **No** — the canonical has a free-text search, not a per-student statement |
| School Period filter | `:117-120` | **Yes** (`finance/.../VoteheadStatementPage.tsx:142-152`) |
| "Generate Statement" button | `:121-123` | n/a — reactive in the canonical |
| School letterhead | `:133` | **No** |
| Header: student, period, **opening balance** | `:134-138` | **No** |
| Column: Date | `:91` | **No** |
| Column: Description | `:92` | **Yes** — "Votehead" (`:87-93`) |
| Column: Invoice/Receipt No | `:93` | **Partial** — invoice number only; receipt number is not shown |
| Column: Debit | `:94` | **No** |
| Column: Credit | `:95` | **No** |
| Column: Balance (running) | `:96` | **Partial** — the canonical balance is per line, not running |
| **Closing balance** footer | `:144-146` | **No** |
| Print / Export PDF | `:139-142` | **No** |

### 13. `reports/pages/AccountLedgerPage.tsx` — **Retained**

Legacy copy reading `useAppData()` (`:23`; header `GAP(P1-E05)` `:20-22`). **There is no real account
ledger anywhere** (the `finance/` one is also a placeholder). It shows an account select (`:117-120`), a
date range (`:121-122`), a Generate button (`:123-125`), a running-balance grid Date / Description /
Source / Debit / Credit / Balance (`:60-67`), and Print / Export CSV (`:136-137`). Nothing is covered.

### 14. `reports/pages/ReportsPage.tsx` (the "All Reports" / CFO view) — **Retained**

This is the page the owner singled out. It has **no data source at all**: `kpiData` (`:11-20`),
`summaryData` (`:22-30`) and `workingCapitalTrend` (`:32-39`) are hard-coded arrays. It renders a **CFO**
KPI table (Type / Amount / Previous Period / Change, `:62-84`), a working-capital bar chart (`:86-100`) and
seven summary tiles (`:104-111`). The accounting hub covers *none* of these concepts: it has no
Accounts-Receivable / Creditors / Fixed-Assets / Cost-of-Sales / Gross-Margin / Gross-Profit / Net-Profit
KPI table, no previous-period comparison, no working-capital trend. The README already recorded that this
page "models no ledger concepts" and "needs its own task" (`accounting/README.md:19`).

### 15. `reports/pages/ReportsDashboardPage.tsx` — **Retained**

Reads `useAppData()` collections (`:17-28`) and a hard-coded `recentActivity` (`:213-218`); named in the
reports guard (`:102`). It shows metrics (`:54-99`), readiness banners (`:102-131`), quick actions
(`:134-183`), notifications (`:185-210`) and data-readiness / recent-activity / quick-overview panels
(`:233-332`). Nothing in the finance hub covers it. It is also rendered by a live test that asserts its
behaviour — `src/modules/__tests__/ModuleDashboardsModernization.test.tsx:216` inside
"renders all modernized module dashboards" (`:204-228`) — so retiring it would break a test asserting real
behaviour, which the brief forbids.

---

## Retired

**None.** No candidate met the bar. Consequently no page, route, navigation entry, exemption, guard map,
i18n key or test was removed or changed, and the accounting hub's replacement route was not wired in as a
redirect target.

The three legacy copies the P3-E03 README recommended retiring
(`accounting/README.md:33`) are each retained for the concrete reasons in sections 10–12: the real fee
collection summary filters by **level** and has no **Print/CSV**; the real student financial summary has
no **period** or **stream** filter and no **adjustments** column; the real votehead statement is a
different shape of report (invoice lines, not a per-student statement). "A similar page exists" is not the
bar.

---

## Retained — what to verify by hand

Grouped so the owner can walk them:

**A. Ledger books with a real replacement that is feature-incomplete (verify the gap, then decide)**

- `finance/pages/TrialBalancePage.tsx` — missing account-type filter/column and free-text search.
- `finance/pages/IncomeStatementPage.tsx` — missing compare-with-previous-period, profit margin, % of total.
- `finance/pages/BalanceSheetPage.tsx` — missing category filter, search, working capital, debt ratio, subcategory, % of category.
- `finance/pages/CashBookPage.tsx` — missing search, transaction count, payment-method column.

**B. Ledger books with no real replacement at all**

- `finance/pages/DayBookPage.tsx`, `finance/pages/JournalRegisterPage.tsx`,
  `finance/pages/AccountLedgerPage.tsx`, `reports/pages/AccountLedgerPage.tsx`.

**C. Hubs over the above (retained because their tabs are retained)**

- `finance/pages/FinancialStatementsPage.tsx`, `finance/pages/AccountingOperationsPage.tsx`.

**D. Reports-module legacy copies of canonical finance pages**

- `reports/pages/FeeCollectionSummaryPage.tsx` — missing class filter, Print, Export CSV.
- `reports/pages/StudentFinancialSummaryPage.tsx` — missing period filter, stream filter, adjustments column.
- `reports/pages/StudentVoteheadStatementPage.tsx` — missing the whole per-student statement: opening/closing balance, letterhead, debit/credit columns, receipt no, Print/PDF.

**E. Pure mock pages with no real counterpart**

- `reports/pages/ReportsPage.tsx` (CFO view) — hard-coded KPIs, trend and tiles; no ledger concepts.
- `reports/pages/ReportsDashboardPage.tsx` — legacy collections + hard-coded recent activity.

---

## The ledger dependency

The accounting hub is ledger-backed, but **the app does not open the ledger on its own**. The ledger's DDL
has no canonical migration yet, so `AccountingReportsPage` takes the ledger (or the SQLite adapter) as a
prop and the routing shell renders it without one, showing *"The ledger is not connected"* with the reason
(`AccountingReportsPage.tsx:48-53`, `:130-139`; `accounting/README.md:113-121`). Opening the ledger is
P3-A04's migration path, outside this task's files.

**Consequence for any future retirement:** retiring a book (trial balance, income statement, balance
sheet, cash book) replaces a page showing **wrong (mock)** numbers with a page showing **no** numbers until
P3-A04 lands. If the owner wants the mock books gone before then, that is a sequencing decision: either
retire them *after* P3-A04 wires the ledger, or accept an empty accounting hub for the interim. The feature
gaps above (account type, profit margin, working capital, payment method, search) are independent of that
sequencing and remain open regardless.

---

## Where each page is referenced

So a future retirement knows every place to update. (Nothing here was changed.)

- **Deprecated routes already exist** for the finance books, in
  `src/modules/finance/moduleDefinition.tsx` as `deprecated: true` nav entries with `redirectTo`:
  `dayBook` `:44`, `cashBook` `:45`, `journalRegister` `:49`, `trialBalance` `:50`, `incomeStatement`
  `:51`, `balanceSheet` `:52`, `accountLedger` `:58`, `feeCollectionSummary` `:55`,
  `studentFinancialSummary` `:56`, `voteheadStatement` `:57`. Their `redirectTo` points at the **old
  placeholder hubs** (`/finance/financial-statements`, `/finance/accounting-ops`, `/finance/payments`), not
  at `/finance/accounting-reports`. The same paths also appear in
  `src/routing/redirectMap.ts:51-59`.
- **The page-route exemption registry** lists each as "deprecated route: its path redirects to …":
  `src/routing/__tests__/pageRouteExemptions.ts:102-132` (`AccountLedgerPage`, `BalanceSheetPage`,
  `CashBookPage`, `DayBookPage`, `IncomeStatementPage`, `JournalRegisterPage`, `TrialBalancePage`,
  `FeeCollectionSummaryPage`, `StudentFinancialSummaryPage`, `VoteheadStatementPage`). The guard requires
  every entry to name a real file, so a retirement must delete the matching entry.
- **The canonical-data guards** name the reports copies in `PENDING_CANONICAL_MIGRATION`:
  `reports/pages/__tests__/canonicalDataAccess.test.ts:105-107`. The finance guard uses the
  `GAP(P1-E03)` header comment instead (`finance/pages/__tests__/canonicalDataAccess.test.ts:148-154`).
- **Hubs** import the `*PageContent` exports: `FinancialStatementsPage.tsx:10-12`,
  `AccountingOperationsPage.tsx:9-12`, `PaymentsPage.tsx:15-19`.
- **Barrel** `finance/pages/index.ts:20-31` (unreferenced elsewhere).
- **Mock seed data / types** name the pages in comments only: `finance/data/types.ts:486-596`,
  `finance/data/mockData.ts:346-371`.
- **Live routes** for the reports copies (non-deprecated nav): `reports/moduleDefinition.tsx:43,45,46,48`.

### Note on `exportable`

The ledger placeholder pages pass `exportable={true}` to `DataGrid`
(`TrialBalancePage.tsx:222`, `IncomeStatementPage.tsx:226`, `BalanceSheetPage.tsx:278`,
`CashBookPage.tsx:200`, `DayBookPage.tsx:189`, `JournalRegisterPage.tsx:254`). `DataGrid` has **no
`exportable` prop** (`src/components/ui/data/DataGrid.tsx:53-78`; the prop is not destructured at
`:109-126`), so the prop does nothing and is already a TypeScript error counted in the gate baseline. The
legacy pages therefore have **no working export**; the accounting hub's CSV export is a genuine gain, not a
loss. This is why "Export" is marked n/a rather than "missing" for the books, and why it *is* missing for
the reports copies, which build their CSV by hand.

---

## Evidence and tests

- **Routing suite:** `src/routing/__tests__/pageRouteCoverage.test.ts`,
  `src/routing/__tests__/moduleRoutesCoverage.test.tsx`, `src/routing/__tests__/moduleRoutes.test.tsx`,
  `src/routing/__tests__/redirectMap.test.ts` — all pass unchanged (nothing was removed).
- **Canonical-data guards:** `src/modules/finance/pages/__tests__/canonicalDataAccess.test.ts` and
  `src/modules/reports/pages/__tests__/canonicalDataAccess.test.ts` — pass unchanged.
- **Finance / reports page tests:** unchanged and passing.

## What I could not verify

- I could not confirm the ledger-backed figures render **in the running app**, because the app cannot open
  the ledger until P3-A04 (above). The accounting hub's numbers are exercised only by its fixture and
  component tests, which supply a ledger.
- The legacy pages' numbers are mock-seeded, so their on-screen values are not evidence of anything; only
  their controls, columns and actions were read (from source) for this comparison.
- No browser pass was run: nothing was deleted, so there is no user-visible change to check.
