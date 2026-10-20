# School Operations Audit — October 2026

**Branch audited:** `consolidation` @ `9719eae` · **Date:** 2026-10-07
**Method:** live end-to-end walk-through in Chromium (Playwright) against `pnpm dev`, a full crawl of every navigation page and hub tab, and static contract scanning of `src/`.
**Companion spec:** [`docs/specs/multi-curriculum-platform/`](../../specs/multi-curriculum-platform/README.md)

---

## 1. Verdict

**SchoolPilot cannot run a real school today.** A brand-new school that follows the
normal setup order (profile → year → terms → classes → staff → students → fees →
billing → payments → exams → reports) is blocked at **eight separate points**, and the
steps that do "succeed" frequently write corrupt or invisible data.

The good news: the failures cluster into a small number of **systemic root causes**
(§4). Most individual bugs disappear once those are fixed, so the stabilisation work is
much smaller than the bug count suggests.

| Measure | Result |
| --- | --- |
| Golden-path steps attempted | 28 |
| Steps that work (with caveats) | 3 |
| Steps that "succeed" but mislead or store wrong/invisible data | 4 |
| Steps blocked or failing outright | 21 |
| Pages/tabs crawled | 176 across 9 modules |
| Pages/tabs that crash or 404 | 11 unique (+7 sibling tabs left broken because the error boundary never resets) |
| CRUD functions pages call that do not exist at runtime | **94 across 40 pages** |
| `update(obj)` calls against an `update(id, data)` contract | 36 |
| Foreign keys coerced with `Number()`/`parseInt` | 38 writes + 28 selectors |
| Collections referenced but never defined | 10 |
| Live tabs backed by in-memory mock hooks (data never saved) | 11 hooks / 9 pages |
| Routes declared but never registered (404) | 24 |
| Source files with mojibake (double-encoded UTF-8) | 99 |
| Automated probe (`scripts/audit/school-ops-probe.mjs`) | **16 / 16 checks fail** |

Severity scale used below: **P0** = blocks a core school workflow or loses/corrupts data;
**P1** = wrong data, misleading UI or a broken secondary workflow; **P2** = quality,
UX, consistency.

---

## 2. Test scenario

Persona: *Greenfields Academy*, a new mixed day/boarding school in Nakuru setting up for
the 2027 academic year. The tester followed the order a school bursar/registrar would.

Environment: Node 22, `pnpm install --frozen-lockfile`, `pnpm dev` on :5200, headless
Chromium 1194 at 1440×900. Default `.env` (`VITE_DB_PROVIDER=sqlite-wasm`).

> Because the database silently runs in memory (SO-01), every full page reload wipes
> data. The walk-through therefore kept a single browser session alive and navigated via
> the hash router. Where a step was impossible in the UI, a record was inserted directly
> into the database **only to unblock the following steps**; this is marked *(workaround)*.

### 2.1 Golden-path results

| # | Step | Result | Finding |
| --- | --- | --- | --- |
| 1 | First run → "Go Direct to Production" | ⚠ Claims "All data you enter will be persistent" — DB is in-memory | SO-01 |
| 2 | Setup wizard: school profile | ❌ "Collection 'settings' not found"; wizard cannot advance | SO-02 |
| 3 | Reload → sign in | ⚠ Wizard never returns; login page says *Demo Mode* | SO-02, SO-04 |
| 4 | Sign in with a **wrong** password | ❌ Accepted ("DEMO MODE LOGIN") | SO-04 |
| 5 | Dashboard of a new production school | ❌ Shows 52 students, 25 staff, Form 1–4 exam means, "Intake: Dec 2024" | SO-03, SO-29 |
| 6 | Create academic year 2027 | ✅ Saved — but Structure column shows "—" | SO-21 |
| 7 | Edit academic year name | ❌ `Unsupported bind() argument type: object` | SO-23 |
| 8 | Create Term 1 2027 | ❌ Year 2027 missing from dropdown; Financial Year required with no options and no UI to create one; tab is mock-backed. *(Workaround: a financial year was inserted directly — it still did not appear in the dropdown, SO-26.)* | SO-07, SO-26 |
| 9 | Create class "Grade 7" | ❌ No "Add Class" button exists | SO-05 |
| 10 | Add a stream (single) | ❌ No "Add Stream" button exists | SO-05 |
| 11 | Bulk-create stream "Blue" for Form 3 | ❌ "Success", but stored `{ name: null, class_id: null }`; class list duplicated with hard-coded Form 1–4. *(Workaround: class "Grade 7" was inserted directly — it showed in the Classes grid but never in the Bulk Streams picker, SO-26.)* | SO-06, SO-26 |
| 12 | Add student (modal) with guardian + class | ⚠ Student saved; **guardian silently dropped**; directory shows Class "-" Stream "-" | SO-20, SO-21 |
| 13 | Quick-edit student (rename, move stream) | ✅ Saved; directory still shows "-"; picker shows a "null - null" stream | SO-21, SO-06 |
| 14 | Edit student, add guardian | ❌ Guardian dropped again | SO-20 |
| 15 | Open student profile (click name) | ❌ "Page not found" | SO-12 |
| 16 | Add staff (teacher) | ❌ `addStaffMember is not a function` | SO-11 |
| 17 | Add student category "Bursary" | ❌ `addStudentCategory is not a function` | SO-11 |
| 18 | Create fee template (Form 1 Boarders, Term 1) | ⚠ Saved; list shows blank term and **"All Categories"** although Boarder was chosen; no class/grade dimension exists | SO-08, SO-21 |
| 19 | Add fee items (Tuition, Boarding, Exam) | ❌ Uncaught `Update failed: Unsupported bind() argument type: object`; UI still says "No Items Defined" | SO-08 |
| 20 | Generate term invoices | ❌ `generateStudentInvoices` not provided; alternative page reads a non-existent collection | SO-09 |
| 21 | Record a KES 10,000 M-Pesa payment | ❌ First submit silent; second: `addStudentPayment is not a function` (error toast renders empty) | SO-10, SO-28 |
| 22 | Create exam session + configure a paper | ✅ Works with seeded numeric ids | — |
| 23 | Enter marks for Form 1 A | ❌ "No students in selected class stream" (stream has ~25 students) | SO-13 |
| 24 | Take attendance for Form 1 A | ❌ Roll-call shows 0 students; choosing a class empties the class list | SO-14 |
| 25 | Capture an admission application | ❌ All 4 wizard steps render zero fields; "Submit Application" submits nothing | SO-15 |
| 26 | Promote students at year end | ❌ No route/nav to the promotion page; history collection undefined | SO-16 |
| 27 | Save school profile (Settings) | ❌ `updateSchoolDetails is not a function` | SO-17 |
| 28 | Print a report card | ❌ Feature absent (button has no handler) | SO-18 |

Screenshots for the key steps are in [`evidence/`](./evidence).

---

## 3. Findings

### 3.1 P0 — Blockers

#### SO-01 · Data is never persisted (in-memory database)
- **Symptom:** console on every load: `Persistent storage unavailable ('opfs-sahpool' failed … no such vfs) … Falling back to IN-MEMORY DATABASE — ALL USER DATA WILL BE LOST ON RELOAD`. The onboarding screen simultaneously promises "Persistent local storage".
- **Root cause:** `src/services/database/SQLiteWASMProvider.ts:1014-1040`. The `opfs` VFS needs a Worker; the fallback opens `?vfs=opfs-sahpool` but `sqlite3.installOpfsSAHPoolVfs()` is never called anywhere in `src/`, so the VFS does not exist and the code drops to `new oo1.DB()` (memory).
- **Impact:** every reload, crash or closed tab erases the school's data. Also masks all other persistence bugs.
- **Fix direction:** run SQLite in a dedicated Worker with `opfs`, or install the SAH-pool VFS before opening; call `navigator.storage.persist()`; **fail loudly** (blocking banner, refuse writes) instead of silently using memory. Spec: `06-platform-architecture.md §3`.
- Evidence: probe check C01.

#### SO-02 · Production setup wizard cannot complete step 1
- **Symptom:** "Collection 'settings' not found" toast; wizard stuck. After a reload the wizard is never shown again (onboarding is marked complete in `localStorage`). ([screenshot](./evidence/01-setup-wizard-settings-collection-missing.jpg))
- **Root causes:**
  1. `src/components/FirstRunOnboarding.tsx:141-168` — the production path renders the wizard **without initialising the database**; every collection lookup returns `null`.
  2. `src/components/setup/SetupWizard.tsx:110,113` — writes to `settings` and `period_definitions`, which are not defined collections (real ones: `school_details`, `academic_period_definitions`).
  3. `SetupWizard.tsx:191,212` — `academic_year_id: Number(year.id)` and `class_id: Number(createdClass.id)` turn UUIDs into `NaN` → streams and terms orphaned.
  4. `SetupWizard.tsx:233-252` — fee template inserted without the required `school_period_id`, with non-schema fields (`currency`, `total_amount`) and items without ids.
  5. Step writers re-run on Back/Next (non-idempotent → duplicate years/classes).
  6. Curriculum choice limited to "CBC Primary" or "8-4-4 Secondary"; no Junior/Senior School, British or other systems; three equal-length terms are generated by dividing the year by 3.
- **Test gap:** `setup-wizard.spec` passes because it mocks `useDatabaseCollection`.

#### SO-03 · "Production" mode is really demo mode (auto-seeded fake data)
- **Symptom:** after choosing production, the database contains 52 students, 25 staff, 4 classes, 9 terms, invoices and payments. ([screenshot](./evidence/02-wrong-password-accepted-demo-data-in-production.jpg))
- **Root cause:** two config stores disagree. Onboarding writes `dataMode: 'production'` through `UnifiedConfigContext` to `localStorage['unified_app_config']`, but the `UnifiedConfigManager` singleton is constructed from defaults and **`init()`/`initUnifiedConfig()` is never called** (`src/config/configManager.ts:405,1084`). `getAppMode()` therefore returns `'demo'` in development builds and `AppDataContext.tsx:395-404` seeds demo data into the "production" database.

#### SO-04 · Authentication fails open
- **Symptom:** any password signs in as Super Admin; login page advertises demo accounts; the wizard tells users the admin password is `admin123`.
- **Root cause:** `src/services/auth/authService.ts:116-136` sets `isDemoMode` from the mis-initialised config (SO-03); `:431-470` additionally *switches the whole app to demo mode* whenever the DB is unavailable, the users collection is missing, or it is empty. `loginDemo` accepts any non-empty password.
- **Fix direction:** never fall back to demo on error; first-run must create the administrator with a chosen password; remove default credentials from UI. Spec: `06 §5`.

#### SO-05 · Classes and streams cannot be created
- **Symptom:** Classes & Streams page has Edit/Delete/Manage Streams but no **Add Class** or **Add Stream** button.
- **Root cause:** `src/modules/administration/pages/ClassesPage.tsx:79-104` registers both actions with `usePageActions` (ActionBar registry). The ActionBar/ContextualActionBar is not mounted by the live `Layout` (same defect previously fixed for Add Student).

#### SO-06 · Bulk stream creation stores corrupt streams
- **Symptom:** success toast; record saved as `{ name: null, class_id: null }`; it then appears as "-" and "null - null" in every class/stream picker. The class list shows every class twice. ([screenshot](./evidence/12-bulk-streams-duplicate-hardcoded-classes.jpg))
- **Root cause:** `BulkStreamCreationPage.tsx:44` calls `addClassStream(Number(classId), { name })` but `AppDataContext.addClassStream(streamData)` takes one argument, so the number is spread as the stream. Lines `91-94` hard-code `<option value="form1">Form 1</option>` … Form 4 after the real classes.

#### SO-07 · Terms (school periods) cannot be created
- **Symptom:** "Financial Year is required" with an empty dropdown; newly created academic years are missing from the year dropdown. ([screenshot](./evidence/03-term-blocked-financial-year-required.jpg))
- **Root causes:**
  1. The School Periods tab uses `useSchoolPeriodData`, `useAcademicYearData` and `useAcademicPeriodDefinitionData` from `administration/data/`, which hold **hard-coded mock arrays in React state** — the list is fake and "saved" terms vanish on navigation.
  2. There is **no UI anywhere to create a Financial Year**, and the demo seed does not populate `financial_years` either, yet `financial_year_id` is required.
  3. `SchoolPeriodsPage.tsx:65-67` coerces `academic_year_id`/`financial_year_id` with `Number()`.
  4. No validation that term dates sit inside the year, do not overlap, or that only one term is active.
- **Impact:** without terms there are no fee templates, invoices, exam sessions or attendance periods for the current year.

#### SO-08 · Fee structures cannot be defined
- **Symptom:** adding a vote-head throws an uncaught `Update failed: Unsupported bind() argument type: object`; the item list stays empty. Editing a template fails the same way. ([screenshot](./evidence/10-fee-template-wrong-category-blank-period.jpg))
- **Root cause:** `FeeTemplatesPage.tsx:121,141,306` call `updateFeeTemplate(template)` while the provider is `updateFeeTemplate(id, data)` → the whole object is bound as the SQL id.
- **Domain gaps:** a template is keyed only by term + student category — there is **no class/grade dimension** (Form 1 and Form 4 fees differ), no optional items (transport, lunch), no one-off charges (admission, caution money), no installment plan link.

#### SO-09 · Term billing (invoice generation) does not work
- `EffectFeeStructuresPage.tsx:21,54` uses `generateStudentInvoices` from `useAppData()` — not provided. The finance-module implementation (`useFinanceData.ts:291`) inserts **one record into `customer_invoices`** instead of generating student invoices.
- `InvoiceGenerationPage.tsx:55,63` filters templates with `school_period_id === parseInt(...)` (string vs number → never matches) and reads items from `fee_template_items`, which is not a collection (items are nested in `fee_templates`).

#### SO-10 · Fee payments cannot be recorded
- `StudentPaymentsPage.tsx:85` → `TypeError: addStudentPayment is not a function`. With a missing receipt number the form silently does nothing (validation toast renders empty — SO-28). Receipt numbers are typed by hand; the student picker is a non-searchable `<select>`.

#### SO-11 · 94 CRUD functions used by 40 pages do not exist at runtime
- **Root cause:** pages destructure functions such as `addStaffMember`, `addStudentCategory`, `addGradingScheme`, `addClassSubjectAllocation`, `addStudentPayment`, `updateSchoolDetails` from `useAppData()`. `AppDataContext` only provides ~40 CRUD functions and is cast `as any as EnhancedAppDataContextType` (`src/contexts/AppDataContext.tsx:1783`), so TypeScript believes the rest exist. Module providers (`FinanceDataProvider`, …) expose their own contexts and are never merged into `useAppData()`.
- **Affected school workflows include:** Add/Edit/Delete Staff (still broken after the 2026-08-25 fix, which addressed a different crash), student categories, dormitories, grading schemes, education systems, subject papers, class–subject allocations, teacher assignments, student subject enrolment, opening balances, fee adjustments/fines, general receipts, transport routes, customer/supplier invoices, school profile, student detail/financial detail loaders. Full list: [`contract-scan-2026-10-07.md`](./contract-scan-2026-10-07.md).

#### SO-12 · Student profile and 23 other routes are never registered
- **Symptom:** clicking a student's name, `/administration/students/add`, `/administration/students/:id/financial`, admissions application detail/review/tracking/form builder, several HR and library pages → "Page not found". ([screenshot](./evidence/05-student-detail-404.jpg))
- **Root cause:** `src/core/moduleRegistration.ts:56-80` (`convertToLoadedModule`) copies `navigation` but **not `routes`** into module metadata; `src/routing/moduleRoutes.tsx:229` reads `metadata.routes` → always empty. One-line fix.

#### SO-13 · Marks cannot be entered
- `StudentExamResultsEntryPage.tsx:201` stores `parseInt(streamId)` (number) and `src/utils/api.ts:13` filters with `student.current_class_stream_id === classStreamId` (string vs number) → always empty. ([screenshot](./evidence/07-marks-entry-no-students.jpg)) The same coercion pattern exists in exam analysis, timetable entries and 25 other selectors.

#### SO-14 · Daily attendance cannot be taken
- `ManualAttendancePage.tsx:168-171,273-281`: class options use the **name** as value, the filter compares against the **stream id** → zero rows; because options are derived from the filtered rows, the dropdown then empties itself. Students created via the UI are excluded entirely (their denormalised class names are null). ([screenshot](./evidence/08-attendance-zero-students.jpg))

#### SO-15 · Admissions: application form is blank; review queue crashes
- `ApplicationFormPage.tsx:19-24` passes `{ id, name, icon }` steps to `WizardForm`, whose contract is `{ id, title, content }` → no fields on any step; "Submit Application" submits an empty record. ([screenshot](./evidence/09-application-form-has-no-fields.jpg))
- Applications Hub › Review Queue: `TypeError: Cannot read properties of undefined (reading 'charAt')` at `ApplicationReviewPage.tsx:166` (applications without `firstName`).

#### SO-16 · No year-end promotion / class progression
- `StudentPromotionPage.tsx` is not referenced by any route or navigation item. `useStudentPromotion` depends on `student_class_history`, which is not a defined collection. Students only have `current_class_stream_id` — there is no per-year enrolment record, so history, repeaters, and "who was in Form 2 East in 2025" cannot be answered.

#### SO-17 · The school's own profile cannot be saved
- Settings › School Profile → `updateSchoolDetails is not a function`; the wizard path is broken (SO-02). Receipts, report cards and letters therefore have no school name, logo, code or address.

#### SO-18 · No report cards
- The only "Report Card" control (`StudentDetailPage.tsx:264`) has no handler (and the page is unreachable, SO-12). There is no report-card template, comment bank, class teacher/principal remarks, or term summary — the primary output parents expect.

### 3.2 P1 — Major

| ID | Finding | Evidence / location |
| --- | --- | --- |
| SO-20 | **Guardian data silently dropped** when adding or editing a student from the directory modal; no `parents_guardians` or relationship row is written. | `StudentsListPage.tsx` handleSubmit → `AppDataContext.addStudent` ignores guardian payload |
| SO-21 | **Records created in the UI render blank.** Lists show denormalised `*_name` fields (`structure_name`, `current_class_name`, `school_period_name`, `student_category_name` …) that only seed data contains. New students show Class "-"; new fee templates show "All Categories" even when a category was chosen (misleading). | `AcademicYearsPage`, `StudentsListPage`, `FeeTemplatesPage`, `ManualAttendancePage` |
| SO-22 | **Foreign keys coerced to numbers.** 38 write sites (`*_id: Number(...)`) and 28 selectors (`parseInt(e.target.value)`). Seeded ids are `"1"`, so demo works; every UI-created record has a UUID → `NaN`/`null`, or `parseInt("874b9758-…") = 874` (wrong record). `Number(uuid) \|\| undefined` makes UUID options impossible to select. | `contract-scan` §Numeric id coercions |
| SO-23 | **36 `update(obj)` calls against `update(id, data)` contracts** (academic years, departments, designations, dormitories, categories, banks, chart of accounts, suppliers, transport, timetable, library, inventory, nutrition…). Confirmed: academic-year edit and fee templates. | `contract-scan` §Single-argument update calls |
| SO-24 | **10 collections referenced but not defined:** `settings`, `period_definitions`, `student_class_history`, `fee_template_items`, `exam_paper_settings`, `timetable_period_defs`, `health_incident_reports`, `staff_salary_components`, `book_loans`, `library_members`. | `contract-scan` |
| SO-25 | **Live tabs backed by mock hooks** (data held in React state, never saved): Departments, Designations, Partners, School Periods (+ its year/period-definition pickers), Communication Templates, Message Campaigns, Student Health Records, Customers, inventory items for stock reception/returns. Departments created there never appear in the Staff form, which reads the database. | `contract-scan` §Mock-backed hooks |
| SO-26 | **Stale comboboxes.** `AppDataContext` holds a snapshot loaded at start-up; writes made through `useDatabaseCollection`, `useEntityCrud` or direct collection calls do not refresh it. New academic years, financial years and classes are missing from dropdowns until reload (which, with SO-01, deletes them). | term form, Bulk Streams |
| SO-27 | **Page crashes (error boundary / 404)** — Finance › Accounting Ops (duplicate `formatDate` in `AccountLedgerPage.tsx:25`; Babel/dev only, prod build tolerates it), Finance › Transport (`toFixed` of undefined, `TransportRoutesPage.tsx:105`), Finance › Payments › Payment Allocation (`usePaymentAllocation` not imported), Reports › Finance (`formatDate` not imported, `FeesDueReportPage.tsx:154`), Reports › Analytics › Subject Analysis (`AnalyticsSubjectPage.tsx:317`), Library › Resources (`LibBookStatusEnum` not imported), Library › Fines (`FinesPage.tsx:122`), Settings › Audit Log (`ResetIcon` not imported), Nutrition › Kitchen (`DataGrid` not imported), Academics › Exam Analysis › Create Exam (navigates to 404), Admissions › Review Queue (SO-15). **The hub error boundary is never reset when switching tabs**, so one crashing tab also blanks its siblings (Applications Hub › Form Builder/Tracking, Payments › General Receipts, Analytics › Class Analysis/Exports/Trends, School › Tab Settings/Settings Dashboard) until the user navigates away. `tsc` reports 138 "Cannot find name" errors in `src/`; the ratchet (3,980 allowed vs 3,056 actual) lets them through. | crawl, `pnpm typecheck` |
| SO-28 | **Silent failures.** `showToast('message', 'error')` is called with a string where an options object is expected → empty toast (12 sites). Several forms keep the dialog open with no message on failure; the fee-item failure surfaces only as an uncaught page error. | `StudentPaymentsPage.tsx`, `GeneralReceiptsPage.tsx` |
| SO-29 | **Hard-coded dashboard figures** shown to every school: Form 1–4 mean points/marks (e.g. `4.8904`, `46.3%`), "Intake: Dec 2024", department split, applicant totals (440 = 240 male / 120 female / 80 others), and the Pending/Overdue/Approvals task counters (`count={15}` etc.). Fee card shows `$0` instead of KES. | `src/modules/dashboard/pages/DashboardPage.tsx:160-165,683-687,797-830` |
| SO-30 | **Workspace tab strip is unreliable.** Hub sub-tabs are added as top-level tabs with invalid paths (`/bulk-streams`, `/school-periods`) that open "Page not found"; the highlighted tab often does not match the page shown; 404 pages accumulate as tabs. | crawl |
| SO-31 | **Student forms miss core fields** — the directory modal has no birth-certificate/assessment numbers, no boarding status, no medical/allergy, no sibling link, no second guardian, no fee-payer flag; the "previous exam" block is hard-coded to KCPE subjects (English, Kiswahili, Maths, Science, SSRE). Staff form lacks email, gender, national ID, TSC number, KRA PIN, employment terms, teaching subjects. | Add Student / Add Staff dialogs |
| SO-32 | **Date picker cannot jump months/years and cannot be typed into.** Entering a 12-year-old's date of birth needs ~150 clicks; dates display as MM/DD/YYYY (US) while lists use "4 Jan 2027". Some forms use the native `type=date` instead — inconsistent. | `src/components/ui/forms/DatePicker.tsx:350` (`readOnly`) ([screenshot](./evidence/11-datepicker-no-year-navigation.jpg)) |
| SO-33 | **Non-searchable selects for large lists** (student picker in payments lists every student; stream pickers repeat "A", "A", "B" without class prefix on reports — duplicate options on Student Reports, Exam Results Horizontal, Student Financial Summary). | crawl `dupSelects` |
| SO-34 | **Four different id formats** in one database: UUIDs, `Date.now()` strings (`1791380657788`), prefixed (`FTI_…`, `exam-session-…`, `paper-setting-…`) and seeded `"1"`/`"S001"`. The Classes grid shows raw ids to users. | DB inspection |
| SO-35 | **Seed data is internally inconsistent** — terms extend past their academic year (Term 3 2022/23 ends 26 Jul 2023, year ends 30 Jun); terms reference "FY 2022" while `financial_years` is empty; students are their own guardians; academic years run Sep–Jun (not the Kenyan Jan–Nov calendar the product targets). | DB inspection |

### 3.3 P2 — Quality and consistency

- **Mojibake** in 99 source files: the language switcher shows `ðŸ‡ºðŸ‡¸`, wizard copy shows `â€”`, logs show `Ã°Å¸â€`. Files were re-saved with a wrong encoding.
- **Encoding of money:** amounts are floats with `maximum: 999999.99` in schemas (`finance/data/schema.ts`), which cannot hold annual international-school fees or any UGX/TZS amount, and floats cause rounding drift in balances.
- **Console noise on every page:** duplicate React keys (HR payroll, settings, suppliers), "key spread into JSX", `<ul>` inside `<p>`, `isLoading` deprecation, "Form submission canceled because the form is not connected", repeated "Collection not found" warnings, Bugsink DSN reachable from `.env` committed to the repo.
- **Bundle weight:** the PWA precaches 9.1 MB; several chunks exceed 1 MB. Problematic for low-bandwidth schools and low-end Android devices.
- **Labels duplicated** in date fields ("Start Date*" followed by "Start Date").
- **Grid ID columns** expose internal ids (Classes, Fee Templates).
- **Attendance class filter** lists only streams that currently have students with denormalised names.
- **`pnpm lint` cannot run**: `eslint.config.js` imports `@eslint/js`, which is not a declared dependency (`ERR_MODULE_NOT_FOUND`), so lint rules are not enforced anywhere.
- **Docs index drift**: `docs/README.md` links to 10 files that no longer exist (module guides, quick reference, self-hosting guide, production-readiness assessment).

---

## 4. Systemic root causes

Fixing these eight causes resolves the large majority of the findings above.

| # | Root cause | Findings it produces | Remedy (see spec) |
| --- | --- | --- | --- |
| R1 | **Three parallel data layers** — a global `AppDataContext` snapshot, per-module provider contexts, and per-page `useDatabaseCollection`/`useEntityCrud`, plus mock hooks. They disagree on what exists and do not refresh each other; the global context is force-cast to a type it does not implement. | SO-07, SO-09–11, SO-17, SO-25, SO-26 | One repository/query layer with typed contracts and live queries (`06 §2`). Delete mock hooks. |
| R2 | **Id typing chaos** — numeric coercion of string ids, strict equality across types, four id formats. | SO-02, SO-06, SO-07, SO-13, SO-22, SO-34 | Branded `Id` string type, UUIDv7 everywhere, lint rule banning `Number(`/`parseInt(` on `*_id` (`06 §2.4`). |
| R3 | **Display depends on persisted denormalised names** that only the seed populates. | SO-21, SO-14, SO-29 (partly) | Resolve names at read time via selectors/joins; never store display names as truth (`02 §1.3`). |
| R4 | **Ad-hoc CRUD signatures** — `update(obj)` vs `update(id, data)`, one-arg vs two-arg creators. | SO-06, SO-08, SO-23 | Generated repository API with one signature per verb (`06 §2.2`). |
| R5 | **Collection names in string literals** without a registry check. | SO-02, SO-16, SO-24 | Typed collection registry; unknown names fail at build time. |
| R6 | **UI contracts not enforced** — invisible ActionBar actions, `WizardForm` step shape, toast signature, route metadata. | SO-05, SO-12, SO-15, SO-28 | Remove the ActionBar registry; strict prop types; no `as any`. |
| R7 | **Configuration and auth split-brain** with fail-open fallbacks. | SO-01, SO-03, SO-04 | Single config source, explicit modes, fail closed (`06 §3, §5`). |
| R8 | **Tests that mock the thing under test** and a type ratchet set above the actual error count. | all of the above shipped as "green" | Golden-path E2E on the real provider in CI; ratchet = current count; ban new `as any` (`08`). |

---

## 5. Combobox / picker inventory

| Form | Field | Source | Problem |
| --- | --- | --- | --- |
| Add School Period | Academic Year | mock `useAcademicYearData` | Shows fake years; real years missing |
| Add School Period | Period Definition | mock `useAcademicPeriodDefinitionData` | Not the DB list |
| Add School Period | Financial Year | `useAppData().financialYears` | Always empty; no creation UI |
| Bulk Streams | Select Class | `useAppData().classes` + hard-coded Form 1–4 | Duplicates; stale; hard-coded values match nothing |
| Add/Edit Student | Class Stream | `useAppData().classStreams` | Includes corrupt "-"/"null - null"; `safeParseInt` corrupts UUIDs |
| Quick Edit Student | Class Stream | same | "null - null" option |
| Add Fee Template | School Period | DB terms | Only seeded 2022–2025 terms; current year impossible (SO-07) |
| Add Fee Template | Student Category | DB | Saved value displayed as "All Categories" |
| Fee Structures (effect) | Fee Template / Period / Category / Stream | `Number(e.target.value) \|\| undefined` | UUID options cannot be selected |
| Record Payment | Student | full list `<select>` | Not searchable; no balance shown |
| Marks Entry | Class Stream | `parseInt` | Filter never matches → no students |
| Attendance | Class | names as values | Filter never matches; list self-empties |
| Student Subject Enrollment | School Period, Stream | — | Empty (no options) |
| Reports (masterlist, financial summary, exam horizontal) | Stream | streams without class prefix | Duplicate "A"/"B" options |
| Settings › System | Database Type | — | Empty |
| Staff form | Department | DB departments | Departments created on the Departments tab (mock) never appear |

---

## 6. Recommended order of work

The detailed plan, acceptance criteria and target design are in the spec. In short:

1. **Week 1 — stop data loss and fake data:** SO-01, SO-03, SO-04, SO-02 (init DB before wizard; correct collections; idempotent steps).
2. **Week 1–2 — restore the golden path:** SO-12 (routes, one line), SO-11 (merge module CRUD into one typed data API or switch pages to module hooks), SO-05, SO-06, SO-07 (financial years UI + real terms tab), SO-08, SO-10, SO-13, SO-14, SO-15, SO-17.
3. **Week 2–3 — data integrity:** R2 (ids), R3 (names at read time), R4 (signatures), R5 (collection registry), SO-20 (guardians), SO-23, SO-24, SO-25.
4. **Gate:** `scripts/audit/school-ops-probe.mjs` must report 16/16 PASS and the crawl must show 0 crashes; then grow it into the golden-path Playwright suite described in spec `08`.
5. **Then** start the multi-curriculum work (spec `01`–`05`).

---

## 7. Reproducing this audit

```bash
pnpm install && pnpm dev            # terminal 1 (port 5200)
node scripts/audit/contract-scan.cjs            # static contract scan (markdown)
node scripts/audit/contract-scan.cjs --json     # machine-readable
node scripts/audit/school-ops-probe.mjs --out probe.md   # browser probe, exits 1 on failures
# If Playwright cannot find its browser: CHROMIUM_PATH=/path/to/chrome node scripts/audit/school-ops-probe.mjs
```

Snapshots from this run: [`contract-scan-2026-10-07.md`](./contract-scan-2026-10-07.md), [`probe-2026-10-07.md`](./probe-2026-10-07.md).

### What was not covered

Teacher/finance/student role permissions (only Super Admin was exercised), inventory,
library circulation, nutrition/wallet, HR payroll calculations, PouchDB/backend-API/ERPNext
providers, mobile layouts, and printing. These deserve a follow-up pass once the golden
path is green.
