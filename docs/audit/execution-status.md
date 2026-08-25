# Execution Status â€” Production-Readiness Plan

Updated 2026-08-24 on branch `consolidation_align`.
Ratchet reference: [phase0-baseline.md](./phase0-baseline.md).

## Typecheck ratchet trajectory

| Point | Errors |
| --- | --- |
| Phase 0 baseline | 4,206 |
| After Phase 0 (tsconfig excludes, i18n) | 4,135 |
| End of Phase 3 (+2 batches of Phase 1a) | **~3,971** |

## Build gate

`pnpm build` (vite + PWA, ~3 min) verified green after Phase 2 + the
LanguageSwitcher/HookErrorBoundary repoint fix (`0c50642`).

## Completed

### Phase 1a â€” DataGrid v2 âœ…
- Core fixes, tests (38), Table/DataTable kill + 21-page migration (pre-existing commits).
- 1a.3 finished: last 26 pages moved off the old Table contract.
- 1a.4: MUI-X port of SuppliersPage/SupplierContractsPage; `@mui/x-*` deps removed.
  - Note: `StockReturnsPage` and `StockReceptionPage` still use `@mui/material`
    islands (outside the original 2-page scope); `ui/Alert.tsx` wraps MuiAlert.
- 1a.5: hand-tuned widths removed on subjects/allocations/staff/students.
- 1a.6: grids.md shipped with the v2 commit.

### Phase 1b â€” Form layer âœ…
- useValidation.ts merged module (schema API canonical; realtime hook absorbed
  with the infinite-loop init fixed + stale-result sequence guard). Deprecation
  shim at the old path. 22 tests.
- EntityForm (schema-driven create/edit dialog) â€” 5 tests.
- ConfirmDialog + `useConfirm()` mounted app-wide; window.confirm replaced in
  administration, academics, finance, settings (73 sites).
- alert() â†’ useToast across core modules (124 sites).
- forms.md guide.

### Phase 1c â€” One CRUD pattern âœ…
- `useEntityCrud` wrapping useCrudFactory (+ `confirmBeforeDelete` opt-out on
  the factory); owns delete confirmation via ConfirmDialog.
- SubjectsPage pilot = full stack proof (also fulfils 2.2).
- crud.md convention doc.

### Phase 1d â€” Feedback & dead code âœ… (scope-adjusted)
- Dead notistack ToastProvider + orphaned useDatabaseToast deleted; zero
  notistack references remain.
- EmptyState component; 17 inline empty-state JSX blocks converted to the
  DataGrid object form.
- Dead components purged: PageTabs (+example), MinimalForm, PrintForm,
  SlideoutForm (+demo+test), entire `__demos__/` directory.
  - Kept intentionally: AdaptiveTabs (used by routed FeatureSettings),
    SubTabNavigation (used by tabbedWorkspace/Tab). TooltipDemo rescued as
    `settings/TooltipsShowcase.tsx`.
- Layout consolidation: single canonical Layout.tsx (modern tab shell);
  legacy workspace layout retired (flag defaulted true, no toggler).
- Duplicates resolved: one HookErrorBoundary (componentName support merged
  into the richer implementation); academics EducationSystemForm is canonical;
  4 never-mounted boundary components deleted.
- lucide-react â†’ heroicons across 24 files; dependency removed; iconMap keeps
  its string-key contract.
- src/utils/format.ts (formatKES/formatKESCompact/date helpers).

### Phase 2 â€” Functional gaps âœ…
- 2.1 SetupWizard (school â†’ system â†’ year/terms â†’ classes/streams â†’ subjects â†’
  optional fees â†’ admin info); per-step DB writes; resumable via localStorage;
  wired into FirstRunOnboarding production pathway.
- 2.3 BulkStreamCreation persists via addClassStream.
- 2.4 Enrollment page wired to context CRUD (enroll/withdraw/delete persist).
- 2.5 FeesDueReport on live useStudentFinancialSummary (+earliestDueDate),
  aging buckets, CSV export.
- 2.6 imageUpload service (2 MB/type guard); student photo + receipt-logo upload.
- 2.7 StudentDetail Edit Profile navigates to bio-data tab; empty
  ResultApprovalDashboard deleted (was unreferenced).
- 2.8 Kenyan subject seeds (CBC primary + KCSE secondary) + KCSE template.

### Phase 3 â€” Data-entry overhaul âœ… (all 7 batches)
- 3.1 AddStudentPage: both `as any` casts removed; provider `addStudent`
  persists the primary guardian + relationship (was silently dropped).
- 3.2 StudentsListPage: quick-edit rebuilt on EntityForm; fixed broken
  `updateStudent(student)` arity (saves were no-ops); removed dead generic
  quick-edit config wiring and the off-theme hand-rolled slideout.
- 3.3 ClassesPage: id typing, provider-signature alignment, augmentation types
  corrected to provider reality, `ClassStream.class_id` widened for string ids.
- 3.4 AcademicYears / SchoolPeriods / AcademicPeriodDefinitions /
  AcademicStructure pages: EntityForm conversions with cross-field date
  validation; period-definition & structure CRUD wired to real context
  functions (previously referenced non-existent members); formatDate adopted.
- 3.5 Fee/report pages: formatKES/formatDate across 17 pages (23 call sites).
- 3.6 HR payroll/payslip/biodata pages: same adoption (18 sites).
- 3.7 Exam results/gazette/tokens pages: formatDate.

## Phase 4 â€” Not started

## Phase 4 progress

- **4.2 Business-flow tests âœ…** â€” grading-engine.spec (KCSE letter bands, CBC
  competencies, custom schemes, points strategy, unsupported-type rejection),
  education-system-config.spec (template validation â€” caught and fixed a real
  bug: US_UNIVERSITY_SEMESTER missing grade levels), mark-entry-ui.spec
  (template download, CSV export, entered-score grading). 17 new tests, all green.
- **4.3 ERPNext dedup ðŸš§** â€” registration half done: 9 dormant builtins now load
  behind `plugin_<name>` feature flags. Dedup half blocked on a discovery: the
  plugin's ERPNextProvider implements `IBackendProvider` (registry contract)
  while `src/services/erpnext` implements `DataProvider` â€” they are NOT stale
  copies. True dedup requires unifying those two interfaces first; deferred to
  avoid behavior change.
- 4.1/4.4/4.5/4.6 pending.

#
### Post-plan fixes (2026-08-25, user-reported)
- **Add Student** button was not visible on the students page — its handler
  registered with the ActionBar registry, which no layout renders. Replaced
  with an explicit Card-header button opening the in-page add modal.
- **Add Staff** crashed on click when any staff record had a null `staff_no`
  (`String.replace` on null) and edit-saves silently failed on the
  one-argument `updateStaffMember` call. Both fixed; page type errors
  cleaned (augmentation now declares staff CRUD).
- **Pre-NAS Marks renamed to Entry Marks**: component/page/routes/locales;
  route is `/administration/entry-marks` with a redirect from the old URL;
  storage collection names intentionally unchanged.
- **Applications moved to Admissions**: administration duplicate (hardcoded
  mock page + two legacy ApplicationManagement components, zero importers)
  removed; `/administration/applications` redirects to
  `/admissions/applications-hub`; redirectMap test updated for the
  intentional cross-module move.
## Phase 4 progress (continued)
- **4.1 Type ratchet âœ…** â€” `pnpm check:ratchet` enforces the recorded maximum
  (`.type-ratchet`, currently 3,980); fails on any increase, `--update`
  re-baselines after legitimate fixes.
- **4.4 Docs âœ…** â€” README quickstart (pnpm + demo credentials),
  CONTRIBUTING.md (gate workflow, conventions), ARCHITECTURE.md.
- **4.5 Kenyan demo seed âœ…** â€” covered by existing generators (18 KCSE
  subjects, Form 1â€“4 classes with streams, 8-4-4 Aâ€“E + CBC grading schemes,
  KES-scale finance amounts) plus the Phase 2.8 wizard subject sets.
- **4.6 Release gate ðŸš§** â€” automated portion green at this commit:
  typecheck at ratchet (3,980), build exit 0, integration suite 17/17 new
  business-flow tests passing. Full-suite file-level failures remain below
  baseline (123 vs 128). Outstanding: manual first-run wizard smoke test on a
  fresh browser profile (requires interactive session).

## Gate notes

- Full-suite test runs show high flake variance (Â±140 failed-test counts between
  identical trees) from worker contention; file-level comparison is the stable
  signal â€” see phase0-baseline.md for the Phase 1 gate analysis.
- Known follow-ups: StockReturnsPage/StockReceptionPage MUI islands;
  AdaptiveTabs port when FeatureSettings is overhauled.

## Phase 3 boundary gate (2026-08-25)

| | Baseline | Phase 1 gate | Phase 3 gate |
| --- | --- | --- | --- |
| Failing files | 128 / 155 | 130 / 156 | **123 / 156** |
| Failed tests | 869 | 748â€“886 | 769 |

Five fewer failing files than baseline; failed-test count within the flake
band. `pnpm build` green (PWA, 143 precache entries).
