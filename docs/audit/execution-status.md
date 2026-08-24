# Execution Status — Production-Readiness Plan

Updated 2026-08-24 on branch `consolidation_align`.
Ratchet reference: [phase0-baseline.md](./phase0-baseline.md).

## Typecheck ratchet trajectory

| Point | Errors |
| --- | --- |
| Phase 0 baseline | 4,206 |
| After Phase 0 (tsconfig excludes, i18n) | 4,135 |
| End of Phase 1a–1d + Phase 2 + 3.1/3.3 | **~4,025** |

## Build gate

`pnpm build` (vite + PWA, ~3 min) verified green after Phase 2 + the
LanguageSwitcher/HookErrorBoundary repoint fix (`0c50642`).

## Completed

### Phase 1a — DataGrid v2 ✅
- Core fixes, tests (38), Table/DataTable kill + 21-page migration (pre-existing commits).
- 1a.3 finished: last 26 pages moved off the old Table contract.
- 1a.4: MUI-X port of SuppliersPage/SupplierContractsPage; `@mui/x-*` deps removed.
  - Note: `StockReturnsPage` and `StockReceptionPage` still use `@mui/material`
    islands (outside the original 2-page scope); `ui/Alert.tsx` wraps MuiAlert.
- 1a.5: hand-tuned widths removed on subjects/allocations/staff/students.
- 1a.6: grids.md shipped with the v2 commit.

### Phase 1b — Form layer ✅
- useValidation.ts merged module (schema API canonical; realtime hook absorbed
  with the infinite-loop init fixed + stale-result sequence guard). Deprecation
  shim at the old path. 22 tests.
- EntityForm (schema-driven create/edit dialog) — 5 tests.
- ConfirmDialog + `useConfirm()` mounted app-wide; window.confirm replaced in
  administration, academics, finance, settings (73 sites).
- alert() → useToast across core modules (124 sites).
- forms.md guide.

### Phase 1c — One CRUD pattern ✅
- `useEntityCrud` wrapping useCrudFactory (+ `confirmBeforeDelete` opt-out on
  the factory); owns delete confirmation via ConfirmDialog.
- SubjectsPage pilot = full stack proof (also fulfils 2.2).
- crud.md convention doc.

### Phase 1d — Feedback & dead code ✅ (scope-adjusted)
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
- lucide-react → heroicons across 24 files; dependency removed; iconMap keeps
  its string-key contract.
- src/utils/format.ts (formatKES/formatKESCompact/date helpers).

### Phase 2 — Functional gaps ✅
- 2.1 SetupWizard (school → system → year/terms → classes/streams → subjects →
  optional fees → admin info); per-step DB writes; resumable via localStorage;
  wired into FirstRunOnboarding production pathway.
- 2.3 BulkStreamCreation persists via addClassStream.
- 2.4 Enrollment page wired to context CRUD (enroll/withdraw/delete persist).
- 2.5 FeesDueReport on live useStudentFinancialSummary (+earliestDueDate),
  aging buckets, CSV export.
- 2.6 imageUpload service (2 MB/type guard); student photo + receipt-logo upload.
- 2.7 StudentDetail Edit Profile navigates to bio-data tab; empty
  ResultApprovalDashboard deleted (was unreferenced).
- 2.8 Kenyan subject seeds (CBC primary + KCSE secondary) + KCSE template.

### Phase 3 — Data-entry overhaul 🚧 (2 of 7 batches)
- 3.3 ClassesPage done (id typing, provider-signature alignment, augmentation
  types corrected to provider reality, ClassStream.class_id widened for string ids).
- 3.1 AddStudentPage done: both `as any` casts removed; provider `addStudent`
  now persists the primary guardian + relationship (was silently dropped).
  Alert-validation already converted to toasts in 1b.5.
- Remaining: StudentsListPage quick-edit modal (3.2), academic-year pages
  (3.4), fee pages consistency pass (3.5), staff typed params (3.6),
  exam/marks pages (3.7).

## Phase 4 — Not started

## Gate notes

- Full-suite test runs show high flake variance (±140 failed-test counts between
  identical trees) from worker contention; file-level comparison is the stable
  signal — see phase0-baseline.md for the Phase 1 gate analysis.
- Known follow-ups: StockReturnsPage/StockReceptionPage MUI islands;
  AdaptiveTabs port when FeatureSettings is overhauled.
