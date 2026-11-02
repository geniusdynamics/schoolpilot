# Setup completion, the sample school, and the defaults a school needs

Date: 2026-11-01
Build: `consolidation` after PR #67. Nothing is in production anywhere, so seed data and defaults were
changed freely and no migration was written.

## What "set up" means

A school can open the app with the database initialized and still have nothing a page can use. The
checklist the app now reads is the five rows the wizard writes, counted in the canonical tables:

| Item | Proof the row exists |
|---|---|
| School profile | `school_details.name` is not blank |
| Education system | at least one `programme` |
| Academic year and terms | at least one `academic_year` **and** one `academic_period` |
| Classes and streams | at least one `class_group` |
| Subjects | at least one `learning_area` |

It is read from the rows, not from `setup_completed_at`: a demo database that already holds a whole
school is complete without anyone pressing Finish, and a database whose rows were removed is
incomplete even if the flag survived.

## The header nag

- `src/hooks/useSetupChecklist.ts` counts the rows and combines them with the live `school_details`
  row the header already reads. A database that cannot be read yet is reported as *unreadable* and
  does not nag.
- `src/components/setup/SetupNag.tsx` renders a compact amber button in the main window header -
  "Finish setup · 2/5", with the missing items in its tooltip - and opens `/setup`. It is shown only
  to a login that can change settings (super administrator, administrator, or a login holding a
  `settings.*` permission); a teacher or student does not see it.
- `/setup` (`src/components/setup/SetupPage.tsx`) renders the existing seven-step wizard outside
  first-run onboarding. Every step writes through the idempotent writers, so re-running it reuses what
  exists. Finishing records `school_details.setup_completed_at` and reloads into the dashboard.

Before this, the wizard was reachable only during first-run onboarding; an administrator who skipped
it or lost the tab had no way back to it.

## The sample school

### Where the scenarios come from

The notes of the old system (`docs/AkademicoNotes/Note 2025-06-18 01h05s56`, `01h06s47`, `01h06s51`,
`01h08s09`) list what a "living" test school must hold: family shapes, fee standings, fates, staff,
exams in every state, procurement, library, pocket money. The old school's database dump
(`context/akademico_sample_db.sql`, 105 tables) was read for *shape only*: its vote heads, its
journals, its class and stream naming, its fee book's composition, its payment modes and its status
vocabulary (`continuing`, `Alumni`, `Transfered`, brought-forward `B/F` entries). **It holds a real
school's records, so no name, number or contact detail was copied; every person in the sample school
is invented.**

### What was built, and how each scenario is shown

`src/domain/demo/` writes last year and this year of a school of 33 learners, driven through the
services the pages use (see its README). Each note's scenario maps onto a canonical shape:

| Scenario of the notes | In the sample school |
|---|---|
| Two students sharing the same parents | Amani and Baraka Wekesa: one mother, one father, one household, different classes |
| Siblings in the same class | the Mwangi twins |
| Each with their own mother and father | David Otieno, Esther Njeri |
| Single mother / single father | Farida, Imani / Joseph, Liam |
| Only a guardian, no parent | Kendi Kimani, with her grandmother |
| A teacher's child pays half; other staff's pays a quarter; the owner's child is not billed | Brian Kiptoo (guardian is staff member EMP/004), Zawadi Abdi (the storekeeper), Tumaini Kamau: credit notes of 50% / 25% of tuition and 100% of the invoice |
| Cleared; balance this term; balance across terms; across years; overpaid; paid ahead | Amani; Chloe; David; Esther; Farida; Imani |
| Priority vs weighted allocation of a payment | a lump sum clears Esther's oldest balance first (`oldest_first`); the twins' payments use `proportional`; Nadia's `vote_head_priority` |
| Instalments, a bounced cheque | Joseph pays in three; Liam's cheque bounces and its allocations are reversed |
| Transferred, alumni, expelled, suspended with a discipline record | Sharon, Tom; six graduates; Victor; Kevin (incident, disciplinary leave, suspended register days) |
| Refunds to alumni who overpaid; write-offs; clearance | one refund paid (maker-checker), one requested; one write-off requested, one approved; one cleared to leave, one refused |
| Uniform bought from the school, library fine, transport, an opening balance | ad-hoc charges and a brought-forward balance on the invoices that carry them; the unsettled ones are what is left owing |
| Medical conditions; sports and clubs (Girl Guides girls only) | five learners with allergies or conditions and clinic visits; seven co-curricular learning areas with members |
| Teachers: both sexes, several subjects, one subject school-wide, class teachers, heads of department, paid by government or board, more or less than a year | the 18-person roster (`cast.ts`) |
| Split subjects (papers) | English (3 papers) and Science (2) as `component` rows |
| Elective subjects, not everyone takes everything | three electives, ten `learning_area_enrolment` rows |
| An exam complete and published; one in progress, one subject entered for one stream only | past terms published; this term's end-of-term exam open: six areas in, one for the first stream, two not at all |
| Fee structures created, pending, approved, draft | this and last year published; next year's at draft, submitted, approved |
| Balanced double-entry for every financial event, sourced | 319 journal entries; the trial balance balances; every learner's documents equal the ledger |
| Two curriculum models in parallel (CBC and 8-4-4) | **not covered**: one programme (CBC junior school); the pack library chooses others |
| Boarding, dormitories, meal plans | **not covered**: day school; see "What stays legacy" |
| Library, procurement and requisitions, pocket money, payroll runs, communication log | **not covered**: not canonical entities yet |

### Size and time

About 4,500 rows, each with its audit trail: 33 learners, 151 invoices with 820 lines, 145 receipted
payments, 21 credit notes, 319 journal entries, 850 marks, 60 registers. It seeds in about **5 seconds** in Node and about **24 seconds** in the
browser's worker (measured through the real onboarding). The button now names the step it is on
("Setting up: admitting the learners and their families...").

### The day it is set on

The seed takes `today`. Terms that ended before it are billed, paid and examined; the term holding it is
current; a leaver's story is told only when the term it ends after is over. Seeded in the first term it
holds last year and one term; seeded after the last term, two full years.

## Default records and workflows

**A blank school** (production initialization, before the wizard completes) holds the institution,
campus, calendar, financial year, academic year with three terms, one programme, the levels and a
class group per stream: `seedDemoSchool` with `demo: false`. Terms are now numbered from 1.

**Written by the wizard, not the seed:** `school_details`, the chosen programme from the packs, the
academic year and its financial year, classes and streams, subjects, the first administrator.

**Not invented by the seed, and a school must create:**

- **Fee items, schedules and the fee book.** Finance is a school's own policy. The sample school shows
  the shape: twelve items with GL accounts and a payment order, a schedule per year, discount rules.
- **A grading scale**, from the chosen pack; a school that installs no pack has none until it creates one
  in Academics -> Grading.
- **Staff and learners**, admitted through their own pages.
- **Document numbering sequences, the ledger's tables and notice templates**, created lazily by the
  features that need them (the billing run applies their DDL on first post).

**Workflows.** The engine's catalogue (`src/domain/workflows/catalogue.ts`: marks lifecycle, promotion
run, fee-schedule approval, document posting, the two approval ladders, the draft-active-closed life)
is code-defined and runs without rows. Settings -> Workflows lists the *legacy* `workflows` collection,
which started empty and read as if the school had no workflows. The demo seed now writes the seven
system definitions into it as rows (the catalogue key as the id, the states inline), so the page shows
what actually governs the school. The rows are records of definitions the code owns: the engine never
reads them back, and the page's editor edits the copy, not the behaviour. The sample school holds
instances of the ones with documents: refunds requested and paid, write-offs requested and approved,
clearances cleared and refused, schedules at three steps of approval, and exams at every step of the
marks lifecycle.

## What the volume exposed in the product

A school of 33 learners is a hundred times thinner than a real one, and it was still enough to show
these. Each is recorded with what was done.

| # | Finding | Evidence | Done |
|---|---|---|---|
| 1 | **Every canonical read stopped at the first page** (50 rows by default, 500 at most). The finance screens asked for no limit, so with 151 invoices the dashboard counted six overdue ones; the academics hook read at most 500 marks, so Term 3's marks (read last) vanished and the term's results read zero. A class of 40 sitting nine subjects three times already exceeds 500 marks. | Finance dashboard: 6 overdue, 6 unsettled -> 44 and 44, KES 2,763,445.00 collected across 145 payments. Term 3 analysis: zero for every subject -> English, Mathematics, Religious Education in full, Agriculture partly, Kiswahili none. | **Fixed.** `useEntityQuery` takes `allPages`, which follows the cursor to the end (`readEveryPage`); the finance hook and the growing tables of the academics hook use it. It is not kept by the watch stream (which delivers one page): it refreshes when its entity changes. Other modules still read one page and need the same. |
| 2 | **A bounced cheque's fee is an invoice that never reaches the ledger.** `PaymentsService.addBounceFee` creates the invoice and its line but posts no journal entry, so the learner's documents and the ledger disagree by the fee. | `explainBalance` for the learner: balance 10,400.00, ledger 9,900.00, `agrees: false`. | **Fixed**: the fee invoice posts through the ledger's invoice derivation; the regression test fails with 0 entries before the fix. |
| 3 | **A paid refund does not release the learner's credit.** `refundEntry` debits *Refunds payable* and credits the bank, but nothing earlier moves the credit from *Learner credit* to *Refunds payable*, so the statement still shows the credit after the money has gone. | A graduate whose refund was paid still shows -6,000.00; the trial balance has a debit on 2100 and a credit on 2150 for the same amount. | **Decision 2026-11-02: documented, deliberately not implemented yet.** The right release differs by origin - *Learner credit* (2150) for an unallocated payment, the receivable (1100) for an unapplied credit note - so the fix is a **caller-stated release account** on `RefundPostingInput` (default stays `refunds payable`), with `AdjustmentsService` choosing per learner from the ledger balance by account, and the balance documents treating a paid refund as consuming the credit. To be implemented test-first in a focused finance PR. |
| 4 | **The results page counts every teaching group of a class against every learner of it.** An elective or a club on a class makes everyone "incomplete" for a subject most of the class does not take. | Before the electives and clubs were left off the class groups, "Complete 0" for Grade 8 in every term. | **Not fixed**; the sample school keeps them off the class groups. |
| 5 | **The billing run bills only learners whose status is `enrolled`.** A suspended learner is skipped by the next run. | `facts.ts` reads `learner` where `status = 'enrolled'`. | **Not fixed**; observed, may be intended. |
| 6 | **The legacy demo seed fails on a fresh install.** The demo pathway calls `seedDatabase` before the provider is initialized ("Database provider is not initialized", caught and ignored), so the legacy modules (library, inventory, nutrition, payroll) fill from their own mocks, and the library is empty. | Console on every fresh demo; `/library/books` shows no rows. | **Fixed.** The demo pathway opens the database before it seeds (the production pathway already did), and the three library hooks that read a dead RxDB-style `find().$` read the provider's live `subscribe()` instead. Fresh-install probe, before: books empty, `Database provider is not initialized`; after: books 4, categories 5, loans 2, fines 2, inventory items 35, stock levels 27, requisitions 4, purchase orders 4, meal plans 3, payroll periods 3, payslips 1, transport routes 1, plus the catalogue's 7 system workflows in `workflows`. |
| 7 | **Invoice numbers printed the term as 0** (`INV/2026/0/000001`): the seed numbered terms from 0 and the number prints the raw sequence. | Billing writer: `term: facts.period.sequence`. | **Fixed** in the seed (terms from 1). |
| 8 | **Two cashiers both print `RCT/{year}/000001`.** The receipt number has no cashier segment but the sequence was scoped by cashier, and `receipt` is unique on institution and number, so a second cashier's first receipt fails the constraint. A demo that seeds receipted payments makes it immediate. | Taking a payment as another cashier after the seed: `receipt breaks the unique constraint on institution_id, number`. | **Fixed**: the sequence is scoped to institution and year; a regression test numbers two cashiers' receipts consecutively. |

## Not covered, and what would add it

- A demo **parent** login. The canonical `parent` user exists (Naomi Wekesa, mother of two), the
  canonical `parent` role holds the reads of their children, and the sign-in page's demo list now
  offers `parent` - the portal resolves the children from the guardian links and the child picker
  switches between them.
- **Boarding** (a residence, beds, boarder fee cells, evening roll-call) and **meal plans**.
- **Two curriculum models** side by side.
- The **library, inventory and procurement, pocket money, payroll, communications** are seeded through
  the legacy collections (see finding 6), so every module shows a coherent dataset; they become part
  of the canonical sample school when they are canonical entities.
- **Installment plans, reminders and promises to pay, bank reconciliation**: the services exist; the
  sample school does not drive them yet.

## Verification

- `useSetupChecklist.test.ts`, `SetupNag.test.tsx`: the five items, silent when complete or loading or for
  a role that cannot change settings; the nag opens `/setup`.
- `demoSchool.test.ts`: structure, audit trail, idempotency, atomicity (a failure at the first admission
  and one at the last step both leave nothing behind), the first-term day, progress steps, and that the
  schedule bills every learner.
- `sampleSchool.test.ts` (one shared seed): the families, the fates, the staff and teaching, the exams in
  every state, the fee standings, payments by every channel, discounts, alumni settlements, registers,
  incidents; and that the ledger balances and every learner's documents equal it.
- `readEveryPage.test.tsx`: the cursor is followed to the end; the hook returns rows beyond the first
  page and refreshes when the table changes.
- `payments.test.ts`: two cashiers' receipts are numbered consecutively rather than both at 1.
- `demoDataSeed.test.ts`: a fresh school's `workflows` collection holds the catalogue's seven system
  definitions with their states, and a second run does not duplicate them.
- `FirstRunOnboarding.test.tsx` (demo path): the database opens before the legacy modules are seeded,
  and the seed runs on a live provider; a failed open seeds nothing and shows the storage screen.
- `parentRole.test.ts`: the parent role holds reads only, not the restricted medical record, and no
  canonical scope kind.
- Fresh-install probe: library 4 books / 5 categories / 2 loans / 2 fines, inventory 35 items / 27
  stock levels / 4 requisitions / 4 purchase orders, nutrition 3 meal plans, payroll 3 periods / 1
  payslip, 1 transport route - where the day before the fix the library was empty and the console
  read "Database provider is not initialized".
- Both golden paths (`gp1-lite`, `finance-billing-golden-path`) against a fresh install: setup, admission,
  billing, payment, attendance, teaching membership and mark entry, and the finance path's schedule,
  charge, run, receipts and trial balance - with the sample school's nine vote heads and KES 23,850
  first-term price.
- Browser, fresh install through the onboarding: header shows the school name and no nag; students 33;
  finance dashboard 44 overdue / KES 2,763,445.00 collected / 86% collection rate; trial balance
  balanced at KES 6,167,670.00 across 20 accounts; Term 2 results for Grade 8 East (6 of 8 complete, mean
  69.1); Term 3 results in progress; the teacher's grid scoped to 24 learners; the student portal showing
  100% attendance and KES 58,700.00 paid.
