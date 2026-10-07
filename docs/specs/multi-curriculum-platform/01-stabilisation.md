# 01 — Stabilisation (Phase 0)

Phase 0 makes the **existing** feature set work end-to-end on real persistence. It
deliberately introduces no new domain concepts except where an audit blocker cannot be
fixed without one (financial years UI, academic period list). Finding ids (`SO-nn`) refer
to the [audit](../../audit/2026-10-school-operations/README.md).

**Exit gate:** `node scripts/audit/school-ops-probe.mjs` reports 16/16 PASS, the crawl reports
0 crashes/404s, `node scripts/audit/contract-scan.cjs` reports zero in every section, and the
golden-path Playwright suite (08 §3) is green in CI on SQLite-WASM and PouchDB.

---

## WS1 — Persistence, configuration, authentication (SO-01, SO-02, SO-03, SO-04)

### WS1.1 Persistent SQLite in the browser
- Move `SQLiteWASMProvider` into a dedicated Web Worker using the `opfs` VFS, **or** call `await sqlite3.installOpfsSAHPoolVfs({ name: 'schoolpilot' })` before opening `file:/<name>.sqlite3?vfs=opfs-sahpool`.
- Request durable storage: `await navigator.storage.persist()`; show the result in Settings › System.
- Remove the silent `new oo1.DB()` fallback. If no persistent VFS is available, initialisation **fails** with an actionable screen ("This browser cannot store data offline. Use Chrome/Edge ≥ 109, or connect to the school server").
- Development may opt into memory explicitly with `VITE_DB_ALLOW_MEMORY=true`; the header then shows a red "TEMPORARY DATA" badge.

**Acceptance**
- Given a fresh profile, when a student is created and the page is reloaded, then the student is still listed.
- Given OPFS is unavailable, when the app starts, then a blocking error is shown and no write is possible.

### WS1.2 One configuration source
- `initUnifiedConfig()` is awaited in `src/index.tsx` **before** rendering `AppProviders`.
- `UnifiedConfigContext.updateConfig` delegates to `unifiedConfigManager.updateConfig` (single writer, single `localStorage` key). Delete `app_data_mode` as a separate key or make it derived.
- `AppDataContext` seeds demo data **only** when `dataMode === 'demo'` is read from the initialised manager *and* the user explicitly chose demo in onboarding.

**Acceptance**: choosing "Production" then reloading yields 0 students, 0 staff, 0 invoices (probe C03).

### WS1.3 Onboarding → wizard ordering and correctness
- Production path: `await UnifiedDatabaseManager.getInstance().initialize()` (with progress UI) **before** rendering `SetupWizard`.
- Wizard writes through repositories (06 §2) to defined collections: school profile → `school_details` (single row), period definitions → `academic_period_definitions` (with `structure_id`, `sequence_order`), terms → `school_periods` with real string ids, streams with `class_id` = created class id (no `Number()`).
- Each step writer is **idempotent**: it upserts by natural key (year name, class name, subject code) and records created ids in the draft so Back/Next does not duplicate.
- Term dates are entered per term (pre-filled from the curriculum pack calendar, editable) — no "divide the year by three".
- Financial year is created implicitly (calendar year or user-chosen) so terms can reference it.
- Fee step either links the template to Term 1 and selected levels or is removed from the wizard until Phase 3.
- Wizard is re-openable from Settings › School until marked complete; completion state lives in the database (`school_details.setup_completed_at`), not only `localStorage`.
- Curriculum choice is driven by the pack registry (initially: Kenya CBE, Kenya 8-4-4, British) — see 03.

**Acceptance**: walking the wizard with Back/Next twice per step produces exactly one year, three terms, N classes, M streams, the selected subjects, and a school profile shown on the dashboard header (probe C02).

### WS1.4 Authentication fails closed
- Remove `loginDemo` from production builds; in development it requires `VITE_ENABLE_DEMO_LOGIN=true` and shows a banner.
- `authService` never switches to demo mode on DB errors; it returns `{ success: false, reason: 'storage-unavailable' }`.
- First-run wizard **creates the administrator** (username, display name, password ≥ 10 chars, confirm) — no shipped `admin/admin123`. Seed users exist only in demo mode.
- Login page shows demo accounts only in demo mode.

**Acceptance**: wrong password is rejected (probe C04); with an empty `users` table the login page offers "Create administrator" only on a fresh install, never "demo".

---

## WS2 — One data API for pages (SO-11, SO-23, SO-24, SO-25, SO-26)

The full target is 06 §2. Phase 0 does the minimum to make pages correct:

1. **Stop the type lie.** Remove `as any as EnhancedAppDataContextType` in `AppDataContext.tsx`; type `contextValue` explicitly. Every missing function then becomes a compile error.
2. **Route page calls to the implementing provider.** For each of the 40 pages listed by `contract-scan`, switch from `useAppData()` to the module hook that implements the function (`useFinance()`, `useAdministration()`, `useAcademics()`, …) **or** add the function to `AppDataContext` by delegating to the module provider. Prefer the module hook; `useAppData()` keeps read-only shared lookups.
3. **Normalise mutator signatures** to `create(data)`, `update(id, patch)`, `remove(id)` across providers; fix the 36 single-argument call sites.
4. **Delete mock-backed hooks** used by UI (Departments, Designations, Partners, School Periods + its year/period pickers, Communication Templates, Message Campaigns, Health Records, Customers, inventory Items) and point those pages at database collections.
5. **Collection registry.** Export `type CollectionName = keyof typeof collectionsDefinition` and make `useDatabaseCollection<T>(name: CollectionName)` reject unknown names at compile time. Resolve the 10 undefined names: rename (`period_definitions` → `academic_period_definitions`, `timetable_period_defs` → `timetable_period_definitions`, `settings` → `school_details`/`app_settings`), or define (`student_class_history` → superseded by `enrolments` in Phase 1 but defined now; `book_loans` → `loans`; `library_members`, `health_incident_reports`, `staff_salary_components`), or remove (`fee_template_items`, `exam_paper_settings` are nested).
6. **Live queries for shared lookups.** `AppDataContext` subscribes to collection change streams (already emitted by the providers) and refreshes the affected key, so any write from any hook updates every combobox.

**Acceptance**: `contract-scan` reports 0 missing functions, 0 single-arg updates, 0 undefined collections, 0 mock hooks in UI. Creating an academic year, class, department or financial year makes it appear immediately in every dependent picker without reload.

---

## WS3 — Academic structure (SO-05, SO-06, SO-07)

- **Classes page:** render "Add Class" and "Add Stream" as explicit buttons in the card header (pattern used for Add Student). Delete `usePageActions`/ActionBar registry or mount it in `Layout` — not both.
- **Bulk streams:** use the real class list only (remove hard-coded Form 1–4), call `addClassStream({ class_id, name })`, prevent duplicates per class, show created rows.
- **Repair data:** one-off migration removes streams with `name IS NULL OR class_id IS NULL` after offering to reassign students.
- **Financial years:** add Finance › Settings › Financial Years (CRUD; one "current"). Seed one financial year when a school is created.
- **School periods tab:** database-backed; academic year and period definition pickers read the database; validation: start < end, within the academic year, no overlap with sibling periods, at most one `is_current` per programme.
- **Academic years:** validation start < end, no overlap; "current year" flag.

**Acceptance**: a new school can create year 2027, Terms 1–3 with real dates, classes "Grade 7"/"Grade 8" and streams "Blue"/"Green", all visible in every picker (probe C05, C06).

---

## WS4 — Students & staff (SO-12, SO-17, SO-20, SO-21, SO-31)

- **Routes:** add `routes: def.routes || []` in `convertToLoadedModule` (`src/core/moduleRegistration.ts`). Add a routing test asserting every `routes[].path` of every module renders a non-404 page.
- **Guardians:** the directory modal (and Edit) create/update a `parents_guardians` row and a `student_guardian_relationships` row (`is_primary`, `relationship_type`, `receives_communication`, `is_fee_payer`); Edit pre-fills the existing guardian.
- **Display names at read time:** grids resolve class, stream, category, period names via lookup maps built from live collections (a shared `useLookups()` selector). Stop writing `*_name` fields; leave them in old records but never read them.
- **Student detail:** loads by id from the repository (no `getStudentDetailsById` on `useAppData`).
- **Staff CRUD:** wired to the administration provider; form adds email, gender, national ID, employer number (e.g. TSC), employment type and start date.
- **School profile:** Settings › School Profile writes `school_details` (name, code(s), motto, address, phone, email, logo, county/region, ownership, gender, boarding type).

**Acceptance**: probe C07, C08, C09, C15 pass; a student created in the UI shows class, stream and guardian in the directory, profile and attendance.

---

## WS5 — Finance (SO-08, SO-09, SO-10, SO-28)

- `updateFeeTemplate(id, patch)` everywhere; template items get stable ids (`uuid`), `amount` stored as integer minor units (Phase 0 may keep decimals but must remove `maximum: 999999.99`).
- Add **applicable levels** (multi-select of levels/classes) to fee templates now — required for any real school; full matrix is Phase 3 (05 §2).
- One billing service, `generateTermInvoices({ periodId, templateIds?, levelIds?, studentIds?, dryRun })`, that:
  1. selects active enrolments for the period,
  2. resolves applicable templates by level + category,
  3. creates one `student_invoices` row per learner per period with nested items,
  4. is idempotent (re-running adds only missing invoices/items),
  5. returns a preview in dry-run mode.
  Both "Fee Structures" and "Invoice Generation" pages call this service; remove the `customer_invoices` insert.
- `recordStudentPayment` (exists in `AppDataContext`) is used by Student Payments; receipt numbers auto-generated from a per-year sequence (`RCT/2027/000123`), editable only by permission.
- Fix `showToast(string, type)` call sites → `toast.showError(msg)` / `toast.showSuccess(msg)`; surface every save failure in the dialog.

**Acceptance**: probe C10, C11 pass; billing Term 1 for all Form 1 boarders creates exactly one invoice per learner with the template's items; recording KES 10,000 reduces that learner's balance and prints a receipt.

---

## WS6 — Academics & attendance (SO-13, SO-14, SO-16, SO-18)

- Replace `parseInt`/`Number` in id selectors with string state; compare ids with `===` on strings only (lint rule, 06 §2.4).
- Manual attendance: option value = stream id, label = "Grade 7 · Blue"; options come from class streams, not from filtered rows; persist via `saveStudentAttendance` with `(student_id, date, session)` uniqueness.
- Promotion: add route `/administration/students/promotion` (Bulk Operations tab "Promotion"); define the history collection (Phase 1 replaces with `enrolments`); promotion is a preview → confirm → commit batch with undo.
- Report card v0: printable per-student term report from existing results (subjects, marks/grades, class teacher & head comments, attendance summary, fee balance optional, next term date). Full engine in 03 §8.

**Acceptance**: probe C12, C13 pass; a class teacher can mark today's attendance for "Grade 7 · Blue" in under a minute; a 40-learner class prints report cards.

---

## WS7 — Admissions (SO-15)

- `ApplicationFormPage`: pass `{ id, title, content: renderStep(n) }` to `WizardForm`; validate required fields per step.
- Review queue: null-safe initials; fix `charAt` on missing names.
- "Admit" action converts an approved application into a student + guardian + enrolment (level, class group, category, admission date, admission number from sequence).

**Acceptance**: probe C14 passes; an application can be captured, reviewed, approved and admitted, and the learner appears in the class list.

---

## WS8 — Crashes, UX defects, hygiene (SO-27, SO-29, SO-30, SO-32 … SO-35, P2)

- Fix every `Cannot find name` value identifier (138 `TS2304/TS2552` in `src/`) — at minimum the 10 crash sites in the audit; then **lower `.type-ratchet` to the real count (3,056)** and fail CI on any new `TS2304`.
- Null-guard `toFixed`/`charAt`/`.length` render paths (Transport, Fines, Subject Analysis, Review Queue).
- Reset each hub's error boundary when the active tab changes (e.g. `resetKeys={[activeTab]}`) so one crashing tab no longer blanks its siblings.
- Remove hard-coded dashboard figures; widgets show live data or an empty state.
- Workspace tabs: hub sub-tabs are not separate workspace tabs; tab path = full route incl. `?tab=`; active tab follows the router.
- Date picker: typeable input with locale format (default `dd/Mm/yyyy` for en-KE/en-GB), month and year selectors, min/max; use the same component everywhere.
- Searchable async picker (07 §2) for students, staff, guardians, accounts.
- Re-encode the 99 mojibake files as UTF-8 (script + review), add an `.editorconfig` `charset = utf-8` and a CI check rejecting `Ã`, `â€`, `ðŸ` sequences.
- Remove committed `.env` secrets/DSN; keep `.env.example` only.
- Repair seed data: Kenyan calendar for KE demo; terms inside years; financial years present; real guardian links.

---

## Ownership & sequencing

```
Week 1   WS1 (all)            WS4 routes one-liner      WS8 crash fixes
Week 2   WS2 steps 1–3        WS3                       WS5 signatures + payments
Week 3   WS2 steps 4–6        WS4 rest, WS6             WS5 billing service
Week 4   WS7, WS8 rest        golden-path suite in CI   bug bash with a pilot school
```

Each workstream lands as small PRs, each with: a failing test first (CLAUDE.md TDD rule),
the fix, `contract-scan` and probe output in the PR description.
