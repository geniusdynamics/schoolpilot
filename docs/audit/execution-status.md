# Execution Status — Production-Readiness Plan

Updated 2026-08-25 on branch `consolidation_align`.
Ratchet reference: [phase0-baseline.md](./phase0-baseline.md).

## Typecheck ratchet trajectory

| Point | Errors |
| --- | --- |
| Phase 0 baseline | 4,206 |
| After Phase 0 (tsconfig excludes, i18n) | 4,135 |
| After Phases 1–3 + user-reported fixes | **~3,920** |

## Completed

### Phase 1a — DataGrid v2 ✅
- Core fixes, tests (38), Table/DataTable kill + full page migration.
- 1a.4: MUI-X port of Suppliers/SupplierContracts; `@mui/x-*` deps removed.
  - Note: `StockReturnsPage` / `StockReceptionPage` still hold `@mui/material`
    islands (outside original scope); `ui/Alert.tsx` wraps MuiAlert.
- 1a.5: hand-tuned widths removed on subjects/allocations/staff/students.
- 1a.6: grids.md.

### Phase 1b — Form layer ✅
- useValidation.ts merged module (infinite-loop init fixed, stale-result
  guard); deprecation shim at old path; 22+ tests.
- EntityForm, ConfirmDialog + `useConfirm()` mounted app-wide.
- window.confirm → useConfirm in administration/academics/finance/settings
  (73 sites). alert() → toasts in core modules (124 sites).
- forms.md.

### Phase 1c — One CRUD pattern ✅
- useEntityCrud over useCrudFactory (+ `confirmBeforeDelete` opt-out);
  SubjectsPage pilot (= 2.2); crud.md.

### Phase 1d — Feedback & dead code ✅ (scope-adjusted)
- Dead toast providers, PageTabs/MinimalForm/PrintForm/SlideoutForm,
  `__demos__/` purged. EmptyState adopted (17 conversions).
- Single canonical Layout.tsx (legacy workspace layout retired — flag
  defaulted true, no toggler).
- One HookErrorBoundary (componentName merged in); academics
  EducationSystemForm canonical; 4 never-mounted boundaries deleted.
- lucide-react → heroicons (24 files); dependency removed.
- src/utils/format.ts (formatKES/formatKESCompact/formatDate/formatDateTime).

### Phase 2 — Functional gaps ✅
- 2.1 SetupWizard (7 steps, per-step DB writes, resumable via localStorage).
- 2.3 BulkStreamCreation persists via addClassStream.
- 2.4 Enrollment wired to context CRUD (enroll/withdraw/delete persist).
- 2.5 FeesDueReport on live useStudentFinancialSummary (+earliestDueDate),
  aging buckets, CSV export.
- 2.6 imageUpload service (2 MB/type guard); student photo + receipt-logo.
- 2.7 StudentDetail Edit navigates to bio-data tab; empty
  ResultApprovalDashboard deleted.
- 2.8 Kenyan subject seeds (CBC primary + KCSE secondary) + KCSE template.

### Phase 3 — Data-entry overhaul ✅ (all batches)
- 3.1 AddStudentPage: casts removed; addStudent persists guardian +
  relationship (was silently dropped).
- 3.2 StudentsListPage: quick-edit rebuilt on EntityForm; fixed broken
  `updateStudent(student)` arity (saves were no-ops); dead generic config
  wiring removed.
- 3.3 ClassesPage: id typing + provider-signature alignment;
  ClassStream.class_id widened for string ids.
- 3.4 AcademicYears/SchoolPeriods/AcademicPeriodDefinitions/AcademicStructure:
  EntityForm conversions; period-definition & structure CRUD wired to real
  context functions (previously referenced non-existent members).
- 3.5 Finance pages: formatKES/formatDate (23 call sites, 17 pages).
- 3.6 HR payroll/payslip/biodata pages: same adoption (18 sites).
- 3.7 Exam results/gazette/tokens pages: formatDate.

### Post-plan fixes (2026-08-25, user-reported)
- **Add Student** button was not visible on the students page — its handler
  registered with the ActionBar registry, which no layout renders. Replaced
  with an explicit Card-header button opening the in-page add modal.
- **Add Staff** crashed on click when any staff record had a null `staff_no`
  (`String.replace` on null) and edit-saves silently failed on the
  one-argument `updateStaffMember` call. Both fixed; augmentation now
  declares staff CRUD.
- **Pre-NAS Marks renamed to Entry Marks**: component/page/routes/locales;
  route `/administration/entry-marks` with redirect from old URL; storage
  collection names intentionally unchanged. Orphaned duplicate deleted.
- **Applications moved to Admissions**: administration duplicate (hardcoded
  mock page + two legacy ApplicationManagement components, zero importers)
  removed; `/administration/applications` redirects to
  `/admissions/applications-hub`; redirectMap test updated for the
  intentional cross-module move.

## Phase 4 status

- **4.1 Type ratchet ✅** — `pnpm check:ratchet` enforces the recorded maximum
  (`.type-ratchet`); fails on any increase; `--update` re-baselines after
  legitimate fixes.
- **4.2 Business-flow tests ✅** — grading-engine.spec (KCSE letter bands, CBC
  competencies, custom schemes, points strategy, unsupported-type rejection),
  education-system-config.spec (template validation — caught a real bug:
  US_UNIVERSITY_SEMESTER missing grade levels), mark-entry-ui.spec (template
  download, CSV export, entered-score grading), setup-wizard.spec (full walk:
  per-step DB writes across settings/system/year/terms/classes/streams/
  subjects, resumability, validation block). 20 new tests, all green.
- **4.3 ERPNext 🚧 (registration done, dedup deferred)** — 9 dormant builtins
  load behind `plugin_<name>` feature flags. Full dedup is blocked on a real
  discovery: the plugin's ERPNextProvider implements `IBackendProvider`
  (registry contract) while `src/services/erpnext` implements `DataProvider` —
  not stale copies. Unifying those interfaces is a prerequisite; deferred to
  avoid behavior change.
- **4.4 Docs ✅** — README quickstart (pnpm + demo credentials),
  CONTRIBUTING.md, ARCHITECTURE.md.
- **4.5 Kenyan demo seed ✅** — covered by existing generators (18 KCSE
  subjects, Form 1–4 classes with streams, 8-4-4 A–E + CBC grading schemes,
  KES-scale finance amounts) plus the Phase 2.8 wizard seeds.
- **4.6 Release gate ✅ (automated portion)** — typecheck at ratchet, build
  green, integration suite green including the automated setup-wizard walk
  (per-step write verification replaces what would otherwise be a manual
  click-through). Full-suite file-level failures remain below baseline.

## Gate notes

- Full-suite test runs show flake variance (±140 failed-test counts between
  near-identical trees) from worker contention; file-level comparison is the
  stable signal — see phase0-baseline.md for both boundary analyses.
- Known follow-ups: StockReturnsPage/StockReceptionPage MUI islands;
  AdaptiveTabs port when FeatureSettings is overhauled; ERPNext interface
  unification (see 4.3).
