# Legacy pages: what is retired and what still has to move

Date: 2026-11-03. Source: the Academics and Finance user walkthroughs
(`docs/audits/academics-user-walkthrough-2026-11-02.md`, `docs/audits/finance-user-walkthrough-2026-11-02.md`).

Two data layers live side by side: the canonical model in each browser's SQLite database, which the
register, the ledger, the results and the reports read, and the older demo collections, which part of
the interface still reads and writes. On a demo the old pages show an invented school; on a real
install they show nothing. Either way nothing you do on them reaches the rest of the app.

**Retired.** These pages had a working canonical replacement, so their navigation entry is gone and
their address redirects to it. Their page files are still in the tree, unreachable, until someone
deletes them.

| Retired page | Was | Address now lands on |
|---|---|---|
| Financial Statements hub | Trial balance, balance sheet, income statement from the old collections; the trial balance read "Unbalanced" | Accounting Reports (the ledger's own reports) |
| Accounting Ops hub | Account ledger, cash book, day book, journal register from the old collections | Accounting Reports |
| Marks Verification hub | Cross check and by-structure verification of the old collections | Results |
| Results Distribution hub | Exam gazette, distribution counts, board results (IGCSE, SAT) for a CBE school | Report publishing |
| Report Cards | A second report-card screen | Report publishing |
| Marks entry by token | Token entry against the old exam sessions | Marks entry |
| Student Analysis | Per-learner analysis of the old collections | Results |

**Kept, and marked.** These have no canonical replacement yet. They keep their menu entry and carry
"Not connected to your school's records yet" at the top of the page. Each one is a migration todo:

| Page | What it holds today | What moving it means |
|---|---|---|
| Accounting Config > Chart of accounts | A legacy chart the ledger does not post to (`1001 School Bank Account - KCB`, …) | The ledger's own chart is the only one; the page should read and edit that, or be removed |
| Accounting Config > Banks | Legacy bank accounts | Bank accounts belong to the ledger's cash and bank accounts |
| Financial years | Legacy `financial_years` collection with Close and Reopen that close nothing in the books | The ledger's periods and Period Close are the truth; this page should either drive them or go |
| Invoicing > Customer invoices | Legacy `customers` invoices (`CI/2024/001`) that post nothing | Either a canonical invoice for a non-learner customer, or removal |
| Invoicing > Supplier invoices | Legacy supplier invoices that post nothing | Needs the expense/voucher model (expense entry is being built) |
| Transport > Routes and assignments | Legacy routes (one with no name, KES 0.00) and assignments | Transport charges must bill a learner: fee item + invoice line |
| Exam Setup > Scheduling | Legacy `exam_schedule` rows | The canonical assessment model is what marks are entered against; scheduling must create or point at an assessment |
| Exam Setup > Exam sessions | Legacy exam sessions | Same: one session model, the canonical one |
| Timetable > Periods | Legacy period definitions | Periods must agree with the school calendar the canonical model keeps |
| Timetable > Entries | Legacy timetable entries | A canonical timetable entity does not exist yet |
| Events manager | Legacy `events` collection | The school calendar needs one source |

Assignments and lesson plans were not examined in this pass; they are not part of this retirement.

Whoever moves one of these removes its notice in the same change, and removes its row here.
