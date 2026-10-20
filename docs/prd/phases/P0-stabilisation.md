# Phase 0 — Stabilise

**Goal:** the features that already exist work end-to-end on persistent storage, with no fake
data, no fail-open auth and no crashing pages. **No new domain concepts** except where a
blocker cannot be fixed without one (financial-year UI, sequences, billing service, report card v0).

**Inputs:** [Audit](../../audit/2026-10-school-operations/README.md) · [Spec 01 — Stabilisation](../../specs/multi-curriculum-platform/01-stabilisation.md)
**Depends on:** nothing · **Unblocks:** P1 (and P5-W1 i18n infrastructure)
**Estimated duration:** 2–3 weeks with up to 8 parallel implementer agents and one human reviewer.

## Exit criteria (all required)

1. `scripts/audit/school-ops-probe.mjs` → **16/16 PASS**, C16 crawl reports **0** broken pages.
2. `scripts/audit/contract-scan.cjs` → **every section 0**.
3. Typecheck: `missingNames` (TS2304/TS2552 in `src/`) **= 0**; total below 3,056; `.type-ratchet` lowered to the measured count.
4. Full vitest suite: **0 failed files** (the 4 pre-existing load failures fixed, nothing skipped).
5. `pnpm lint` runs; gate G7 enforced (`lintRequired: true`).
6. `tests/e2e/gp1-lite.spec.ts` green on persistent SQLite-WASM.
7. `node scripts/prd/gate.mjs phase --probe` → **GATE PASSED**; baseline tightened; phase-complete log written.

## Audit finding → task map

| Finding | Task(s) | Probe check |
| --- | --- | --- |
| SO-01 in-memory DB | P0-A01 | C01 |
| SO-02 setup wizard | P0-A04, P0-A05 | C02 |
| SO-03 demo data in production | P0-A02 | C03 |
| SO-04 fail-open auth | P0-A03 | C04 |
| SO-05 no Add Class/Stream | P0-C01 | C05 |
| SO-06 corrupt bulk streams | P0-C04 | — |
| SO-07 terms/financial years | P0-C02, P0-C03 | C06 |
| SO-08 fee items | P0-E01 | C10 |
| SO-09 billing | P0-E03 | — |
| SO-10 payments | P0-E02 | C11 |
| SO-11 94 missing functions | P0-B02 + page tasks C06, C07, D05, D06, E04, E05, F04, H01–H04, then P0-B05 | C09, C15 |
| SO-12 unregistered routes | P0-D01, P0-D04 | C08 |
| SO-13 marks entry | P0-F01 | C12 |
| SO-14 attendance | P0-F02 | C13 |
| SO-15 admissions form/review | P0-D02, P0-G02 | C14, C16 |
| SO-16 promotion | P0-F03 | — |
| SO-17 school profile | P0-D06 | C15 |
| SO-18 report cards | P0-F05 | — |
| SO-20 guardians dropped | P0-D03 | C07 |
| SO-21 blank names | P0-D03, P0-C05 (lookups) | — |
| SO-22 numeric ids | P0-F01, P0-D03, E04, E05, F04, H01, H03, H04 | — |
| SO-23 update arity | P0-B02 + page tasks | — |
| SO-24 undefined collections | P0-B01, P0-B02, H02, H04 | — |
| SO-25 mock hooks | P0-C03, C06, C07, H01 | — |
| SO-26 stale pickers | P0-B03 | — |
| SO-27 crashes, error boundary | P0-G02, P0-G03, P0-G09 | C16 |
| SO-28 silent failures | P0-E02, E04, G10 | — |
| SO-29 hard-coded dashboard | P0-G06 | — |
| SO-30 workspace tabs | P0-G08 | — |
| SO-31 missing form fields | P0-D05 (staff); learners in P1 | — |
| SO-32 date picker | P0-G07 | — |
| SO-35 seed data | P0-G11 | — |
| P2 mojibake, lint, secrets | P0-G00, P0-G01, P0-G13 | — |

## Wave plan and lanes

```
W0  G00 encoding ─┐  G01 eslint
                  ▼
W1  A01 A02 │ B01 B02 │ C01 C02 │ D01 D02 │ E01 E02 │ F01 F02 │ G02 G03 G04 G05      (16 tasks, all independent)
                  ▼
W2  A03 A04 │ B03 │ C03 C04 C05 │ D03 D04 D05 D06 │ E03 │ F03 │ G06 G07                (14 tasks)
                  ▼
W3  A05 │ C06 C07 │ E04 E05 │ F04 F05 │ H01 H02 H03 H04 │ G08                           (12 tasks)
                  ▼
W4  B05 contract lock │ G10 │ G11 │ G13                                               (4 tasks)
                  ▼
W5  G09 zero missing names │ G12 GP-1-lite suite │ Z01 i18n/doc integration → phase exit
```

**Critical path:** G00 → A01/A02 → A03/A04 → A05 → G12 → phase exit.
**Highest risk:** A01 (browser storage VFS), B02 (signature normalisation across providers), A05 (wizard rebuild).

### File ownership highlights (full lists in `tasks.json`)

| Wave | Hot file | Owner |
| --- | --- | --- |
| W1 | `src/modules/*/data/use*Data.ts` (module providers) | B02 |
| W1 | `src/services/database/collections.ts`, module `collections.ts` | B01 |
| W1 | `src/modules/finance/moduleDefinition.tsx` | C02 |
| W1 | Crash pages (AccountLedger, PaymentAllocation, FeesDue, Transport, Books, Fines, Kitchen, AnalyticsSubject, AuditLog, ApplicationReview, ExamAnalysisContent) | G02 |
| W2 | `src/contexts/AppDataContext.tsx` | B03 |
| W2 | `src/modules/administration/moduleDefinition.tsx` | F03 |
| W2 | Settings pages using `settings` | D06 |
| W3 | `src/components/setup/**` | A05 |
| W3 | `src/modules/academics/moduleDefinition.tsx` | F05 |
| W4 | `src/contexts/AppDataContext.tsx`, `useDatabaseCollection.ts` | B05 |

### Notes for implementers
- **A01:** prefer `installOpfsSAHPoolVfs()` on the main thread first (smallest change); move to a worker only if needed. Keep `VITE_DB_ALLOW_MEMORY` for tests.
- **B02:** do not change call sites in pages (owned by other lanes) — add/normalise functions on module hooks only, keeping old names as aliases until P0-B05.
- **D03:** create `src/hooks/useLookups.ts` (id → label maps) and use it in the directory; other lanes adopt it in their own pages.
- **E03:** the billing service is pure TypeScript under `src/domain/finance/` so P3 can extend it.
- **G00:** must run alone (touches ~99 files); everything else branches after it lands.
- **Pages fixed in W3** switch from `useAppData()` to `useAdministration()/useFinance()/useAcademics()` and fix arity/id coercion in the same task.

## Tasks

The table is a snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**
(`node scripts/prd/status.mjs`). Full fields per task (files, test, requirements, findings, spec links) are in the ledger.

#### P0-W0 — Repository hygiene that touches many files — runs alone first

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P0-G00` | G | Re-encode the 99 mojibake source files as clean UTF-8 and add an encoding check | — | M | No double-encoded UTF-8 sequences remain in src/ (script exits 0); Language switcher shows the US flag emoji; wizard copy shows an em dash; Diff is encoding-only (verified by the script's round-trip report) |
| `P0-G01` | G | Make ESLint runnable: add @eslint/js, fix config, enable lint in the gate | — | S | pnpm lint loads the config without ERR_MODULE_NOT_FOUND; Gate G7 reports PASS/FAIL instead of WARN; No rule changes beyond what is needed to load |

#### P0-W1 — Independent foundations and highest-impact single-file fixes

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P0-A01` | A | Persistent SQLite: install OPFS SAH-pool VFS (or worker OPFS), request persistent storage, fail closed | — | L | Create a student, reload: student still listed (probe C01 PASS); No in-memory fallback unless VITE_DB_ALLOW_MEMORY=true, which shows a red TEMPORARY DATA badge; navigator.storage.persist() result shown in Settings › System |
| `P0-A02` | A | Single configuration source: await initUnifiedConfig() before render; UnifiedConfigContext delegates to the manager | — | M | Choosing Production then reloading gives 0 students/staff/invoices (probe C03 PASS); getAppMode() equals the persisted onboarding choice; Only one localStorage key holds dataMode |
| `P0-B01` | B | Collection registry: define the 10 missing collections or map them, export CollectionName type, test every referenced name exists | — | M | contract-scan undefinedCollections = 0 after the rename tasks in W2/W3 land (this task defines student_class_history, library_members, health_incident_reports, staff_salary_components, book_loans alias); CollectionName union exported; useDatabaseCollection accepts it (string still allowed until P0-B05) |
| `P0-C01` | C | Classes page: explicit Add Class and Add Stream buttons; remove dead usePageActions registration | — | S | Add Class visible in the card header and creates a class (probe C05 PASS); Add Stream visible when a class is selected; created stream has name and class_id |
| `P0-C02` | C | Financial Years: database-backed CRUD page under Finance settings; seed one financial year at school creation | — | M | Financial year can be created/edited/closed; exactly one current; New financial year appears immediately in the term form picker |
| `P0-D01` | D | Register module routes: copy def.routes into module metadata; route-coverage test | — | S | /administration/students/:id, /students/add, admissions detail/review/track/form-builder, HR and library sub-routes render (probe C08 PASS); contract-scan routesOutsideNavigation = 0 |
| `P0-D02` | D | Admissions application form: pass {id,title,content,validate} steps to WizardForm; per-step validation | — | S | All four steps render their fields (probe C14 PASS); Submit stores a complete application; required fields enforced |
| `P0-E01` | E | Fee templates: updateFeeTemplate(id, patch) everywhere, stable item ids, remove 999,999.99 maximums | — | M | Adding/editing/removing fee items persists (probe C10 PASS); Template edit persists; Amounts > 1,000,000 accepted |
| `P0-E02` | E | Student payments: use recordStudentPayment/useFinance(), auto receipt numbers from a sequence, visible errors | — | M | Recording a payment persists and reduces balance (probe C11 PASS); Receipt numbers RCT/<year>/<seq> unique and gap-free per year; Every failure shows a message in the dialog |
| `P0-F01` | F | Marks entry & exam selectors: string ids, no parseInt; getStudentsByClassStream compares strings | — | S | Selecting a stream lists its active students (probe C12 PASS); Works for UUID stream ids |
| `P0-F02` | F | Attendance roll-call: stream-id option values with level prefix, options from class streams, persist marks | — | S | Choosing a class lists its learners and the dropdown keeps its options (probe C13 PASS); UI-created learners appear; Saving writes one mark per learner per date/session |
| `P0-G02` | G | Fix the 10 crashing pages (missing imports and null guards) found by the crawl | — | M | Probe C16 crawl reports 0 broken pages; Each page renders with empty and seeded data |
| `P0-G03` | G | Hub error boundaries reset when the active tab changes | — | S | A crashing tab no longer blanks sibling tabs |
| `P0-G04` | G | CI workflow: install, gate task (vs PR base), unit tests, build; probe nightly | — | S | CI runs on PRs to consolidation/main and reports gate table in the job summary; Nightly job runs the probe and uploads the report |
| `P0-G05` | G | Fix the 4 test files that fail to load (ModuleLoader, ModuleRegistry.integration, CapabilityDetector.property, SyncComponents.property) | — | S | Full suite: 0 failed files; No test skipped or deleted to achieve it |
| `P0-B02` | B | Module providers: complete and normalise CRUD (create(data)/update(id,patch)/remove(id)); add updateSchoolDetails, generateTermInvoices hook, class history | — | L | Every function listed by contract-scan missingAppDataFunctions exists on a module hook with the normalised signature; Renamed collection literals (timetable_period_defs, exam_paper_settings, fee_template_items) fixed |

#### P0-W2 — Fixes that depend on W1 foundations

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P0-A03` | A | Authentication fails closed; demo login only in demo databases; login page hides demo accounts in live mode | P0-A02 | M | Wrong password rejected in live mode (probe C04 PASS); DB error → explicit error, never demo mode; Empty users table on fresh install → 'Create administrator' path |
| `P0-A04` | A | Onboarding initialises the database (with progress UI) before the production setup wizard | P0-A01, P0-A02 | S | Wizard collections resolve on first render; Initialisation failure shows the storage error screen |
| `P0-B03` | B | Live shared lookups: AppDataContext refreshes collections on provider change events (no stale pickers) | P0-B01 | M | A record created via any hook appears in useAppData() consumers without reload |
| `P0-C03` | C | School Periods tab database-backed with validation; delete the three mock hooks it used | P0-C02 | M | Terms persist and appear in fee/exam pickers (probe C06 PASS); Validation: inside the year, no overlap, one current term; No Number() coercion of ids |
| `P0-C04` | C | Bulk streams: real classes only, addClassStream({class_id,name}), duplicate guard; repair tool removes corrupt streams | P0-C01 | S | No hard-coded Form 1–4 options; Created streams carry name and class_id; Repair offers to reassign students before deleting null streams |
| `P0-C05` | C | Academic years & period definitions: (id, patch) updates, string ids, date validation | P0-B02 | S | Editing a year persists; Start < end, no overlap; Structure name resolved at read time |
| `P0-D03` | D | Student add/edit persists guardians via a guardian service; Edit pre-fills; class/stream names resolved at read time in the directory | P0-B02 | M | Guardian and relationship rows created (probe C07 PASS); Directory shows class, stream and guardian for UI-created learners; safeParseInt removed |
| `P0-D04` | D | Student detail and financial detail pages load by id from module hooks | P0-D01, P0-B02 | S | Profile opens for seeded and UI-created learners; Edit button opens the bio-data editor |
| `P0-D05` | D | Staff CRUD through useAdministration(); add email, gender, national ID, employer number, employment type | P0-B02 | M | Add/edit/delete staff persists (probe C09 PASS) |
| `P0-D06` | D | School profile saves to school_details; all settings pages stop using the undefined 'settings' collection | P0-B02 | M | School name shows in header, receipts and reports (probe C15 PASS) |
| `P0-E03` | E | Billing service generateTermInvoices(dryRun) used by Fee Structures and Invoice Generation pages; templates gain applicable levels | P0-E01, P0-B02 | L | Billing Term 1 for Form 1 boarders creates one invoice per learner with template items; Re-running creates nothing new; Dry run returns the preview |
| `P0-F03` | F | Promotion reachable: route + Bulk Operations tab; history recorded; preview → commit → undo | P0-B01 | M | Promote a class to the next level with history entries; Undo restores the previous class |
| `P0-G06` | G | Dashboard shows live data or empty states (remove hard-coded figures, $ currency) | — | M | Empty production school shows zeros/empty states; Currency from institution settings |
| `P0-G07` | G | DateField: typeable locale input, month/year selectors, min/max; used by EntityForm date fields | — | M | Typing 15/03/2014 sets the date; Year jump to 2014 in ≤ 3 interactions; Display format follows locale (dd/mm/yyyy for en-KE); Duplicate label removed |

#### P0-W3 — Page migrations off useAppData() and mock hooks; wizard rebuild

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P0-A05` | A | Setup wizard rebuilt: correct collections, idempotent steps, per-term dates, financial year, administrator creation, re-openable from Settings | P0-A03, P0-A04, P0-B02, P0-C02, P0-C03 | L | Walking the wizard with Back/Next twice per step creates exactly one year, three terms, N classes, M streams, subjects and the profile (probe C02 PASS); Spec test no longer mocks useDatabaseCollection |
| `P0-C06` | C | Organisation & student-life pages to the database: departments, designations, dormitories, student categories (delete mock hooks, fix arity) | P0-B02 | M | CRUD persists; departments appear in the staff form |
| `P0-C07` | C | Partners, customers, communication templates, campaigns, health records to the database (delete mock hooks) | P0-B02 | M | CRUD persists across navigation and reload; contract-scan mockBackedHooksInUi decreases accordingly |
| `P0-E04` | E | Finance pages part 1 to useFinance(): general receipts, opening balances, fines/adjustments, transport routes & assignments | P0-B02 | M | CRUD persists; no Number() on ids; toast misuse fixed |
| `P0-E05` | E | Finance pages part 2 to useFinance(): customer & supplier invoices, banks, chart of accounts, suppliers | P0-B02 | M | CRUD persists; no Number() on ids |
| `P0-F04` | F | Academics configuration pages to module hooks: allocations, teacher assignments, enrolments, subject papers, grading schemes, education systems, timetable, exam sessions | P0-B02, P0-F01 | L | CRUD persists; pickers non-empty (Student Subject Enrollment period/stream); No numeric id coercion |
| `P0-F05` | F | Report card v0: printable term report per learner and per class from existing results | P0-F01, P0-D04, P0-D06 | L | Class of 40 prints in ≤ 30 s; Shows school profile, learner, subjects, grades, comments, attendance, next term date |
| `P0-H01` | H | Inventory pages to module hooks; useItemData mock removed; id coercions fixed | P0-B02 | M | contract-scan reports 0 inventory entries |
| `P0-H02` | H | Library pages to module hooks; book_loans/library_members collections resolved | P0-B02, P0-G02 | M | contract-scan reports 0 library entries |
| `P0-H03` | H | Nutrition pages to module hooks; id coercions fixed | P0-B02, P0-G02 | M | contract-scan reports 0 nutrition entries |
| `P0-H04` | H | HR salary components collection and settings role picker string ids | P0-B01 | S | Salary settings persist; Role assignment keeps string ids |
| `P0-G08` | G | Workspace tabs mirror real routes; hub sub-tabs are URL state only; 404s never become tabs | — | M | No /bulk-streams or /school-periods tabs created; Active tab always matches the router |

#### P0-W4 — Contract lock-down, cleanup, end-to-end suite, phase exit

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P0-B05` | B | Lock the contract: remove the `as any as` cast on AppDataContext, require CollectionName, contract-scan all zero | P0-B02, P0-B03, P0-C06, P0-C07, P0-D03, P0-D05, P0-D06, P0-E03, P0-E04, P0-E05, P0-F04, P0-H01, P0-H02, P0-H03, P0-H04 | M | contract-scan: every section 0; Typecheck catches any future missing function |
| `P0-G10` | G | Typed toast API (success/error/warning) and remaining misuse fixed | P0-E04 | S | showToast('msg','error') no longer compiles; No empty toasts |
| `P0-G11` | G | Demo seed repair: Kenyan calendar, financial years, terms inside years, real guardian links | — | M | Seed passes the integrity checks in P0-G12 |
| `P0-G13` | G | Remove committed .env values; keep .env.example; document deployment config | — | S | No DSN or secrets in the repository |

#### P0-W5 — Phase exit: zero missing names, golden path suite, wave integration

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P0-G09` | G | Zero TS2304/TS2552 in src; lower .type-ratchet to the real count; gate missingNames baseline 0 | P0-B05 | M | missingNames = 0; .type-ratchet ≤ measured total |
| `P0-G12` | G | Golden path GP-1-lite Playwright suite (probe promoted to tests) + integrity check script | P0-A05, P0-B05 | L | GP-1-lite green locally and in CI; Integrity check reports 0 orphans/invalid FKs on a fresh school |
| `P0-Z01` | Z | Wave integration: merge pending i18n keys, update docs index, regenerate PROGRESS.md | P0-B05 | S | No pending i18n files remain; Translation completeness check passes |
