# Handoff — Form/UI Modernization (Aug 2026)

State of the system-wide CRUD form modernization on branch `consolidation_align`,
written so any agent (or human) can continue without re-discovering context.

## END-STATE NUMBERS (measured, end of Aug 2026 remediation pass)

| Metric | HEAD baseline | End state |
| --- | --- | --- |
| Passing tests | 862 | **1,576** (1,548 measured + DatePicker 28) |
| Failing tests | 783 | **~234** |
| Passing test files | 33 | **82** |
| Failing test files | 124 | **~55** |
| `tsc --noEmit` error lines | 8,175 | **3,961** |
| Full-suite wall time | ~30 min (singleFork) | ~9 min (isolated forks) |

Two config-level root-cause fixes drove most of the test improvement:
1. `src/tests/setup.ts` act-queue wedge + missing globals/providers (see below).
2. `vitest.config.ts`: `poolOptions.forks.singleFork: false` — the old singleFork
   mode caused cross-file pollution that failed ~15-40 suites per run; per-file
   isolation also parallelizes (~3× faster).
3. `tsconfig.json`: added `"vitest/globals"` to `compilerOptions.types` — wiped
   ~3,200 of the test-file "Cannot find name describe/it/expect/vi" errors.

## What is done and verified

1. **Design foundation** — one indigo `primary` scale across `tailwind.config.js`,
   `src/styles/design-system.css`, `src/utils/designTokens.ts` (all three must stay
   in sync). Inter variable font self-hosted (`@fontsource-variable/inter`, imported
   first line of `src/index.css`). `darkMode: ['class']` enabled. Semantic surface
   tokens (`bg-surface-card`, `border-surface-input`, `bg-surface-muted`,
   `text-surface-foreground`, …) registered in Tailwind and used by all form kit
   components, so forms follow the light/dark toggle.
2. **Primitives rebuilt** (`src/components/ui/`): `Input` (top-aligned labels by
   default; `floatingLabel` prop still works but is not the default), `Select`
   (trigger matches Input in both `<option>`-children and `options` modes; options
   mode fires BOTH `onValueChange(value)` and `onChange(value)` with the raw value,
   children mode fires a native-style event), `Textarea`, `Checkbox` (custom,
   error-state aware), new `Radio`/`RadioGroup` and `Switch`, `Button` (primary
   tokens, subtle hover), `Alert` (pure Tailwind, optional `onClose`).
   Control heights: sm 32 / md 40 / lg 44 px.
3. **Form framework** — `Modal` (rounded-2xl, focus trap, animations, sizes bumped:
   md→max-w-lg, lg→max-w-2xl, xl→max-w-4xl, optional `subtitle`), `DialogForm`
   (single header), `FormContainer/FormField/FormSection/FormGrid/FormActions/
   FormHeader` retuned (spacing rhythm `gap-x-4 gap-y-5`, tokenized colors).
   `EntityForm` uses the shared controls and supports `radio`/`switch` field types.
4. **Page sweeps** — 43 raw `<select>` replaced across 10 hotspot files; 57 save
   buttons across 48 pages converted from manual `<Spinner>` to Button `loading`;
   `StockReceptionPage`/`StockReturnsPage` rewritten from MUI onto the shared kit
   AND rewired onto the real data-hook API (`{ data, create, update, remove }` —
   the old code called phantom functions like `getStockTransactionsByType`);
   `@mui/*` + `@emotion/*` removed from package.json.
5. **Color unification** — ALL legacy `blue-*` Tailwind classes (≈1,130 across 195
   files), blue hex literals and blue rgba() values converted to indigo/primary.
   `index.css` neutralizes browser autofill tint (pale purple fields). The app is
   now a single indigo accent family.
6. **Fixed along the way** — `DialogForm` passed a `ref` to a non-forwardRef Modal
   (silently dropped); `FormContainer` set an invalid `disabled` attribute on
   `<form>`; `TabbedWorkspace`/`ActionBar`/`TabBar` got real `data-testid`s;
   `vitest.config.ts` test/hook timeouts raised to 20s (singleFork suite on a slow
   machine); TypeScript errors in every touched file eliminated (branch total
   went from 8,175 → ~7,860 error lines; the rest is pre-existing debt in files
   this effort never touched).

## Verification status

- Form/UI kit suites all green standalone: Button, Input, InputGlow, Select,
  SelectBasic, Modal, EntityForm, SwitchRadio, Card, TabbedWorkspace (9/9),
  FeatureSettings (4/4).
- `npx tsc --noEmit`: zero new errors vs HEAD; zero errors in all touched files.
- App boots clean (verified headless: welcome/setup gate renders, no page errors).
- **The full vitest suite is NOT green and was not green before this work**:
  ~120 test files are pre-existing broken at HEAD (stale mocks for moved hooks,
  missing `@/contexts/RBACContext`, assertions for removed UI, deprecated
  components). Because the suite runs `singleFork`, failure counts also swing
  run-to-run from cross-file pollution. Judge changes with per-file runs of the
  suites you touch + a tsc diff against HEAD, not by full-suite counts.

## Known gotchas

- **Class-stream comboboxes empty across the app (FIXED Aug 2026 — WRITE-path twin of the row-shape bug)**:
  demo docs carried keys that are not table columns (`classes.streams` nested array,
  `class_code`, `stream_code`) → per-doc INSERTs failed with "no such column" and
  `insertMany` collected the errors silently, while `demoDataSeed` counted attempted
  rows as inserted. Result: `classes:0`, `class_streams:0` in the DB with 52 students
  and 58 allocations referencing them → every stream combobox (Add Student, allocations,
  timetable, marks entry, promotion, campaigns…) had no options. Fixes:
  `SQLiteWASMCollection.writableColumns()` intersects doc keys with `PRAGMA table_info`
  columns in insert/insertMany/update; `insertMany` logs partial failures; the seeder
  counts successes and logs failure details; `AppDataContext.loadAllCollections` derives
  `class_name`/`class_teacher_name` on stream rows so labels read "Form 1 - A" everywhere.
  Regression tests: SQLiteWASMProvider.test.ts ("write column filtering"); E2E check via
  headless journey → allocations Add dialog stream select. Also fixed the "Select select
  class stream / subject / academic year" i18n typos (en + fr).

- **Data layer row shape (FIXED Aug 2026 — root cause of "grids full of — / empty comboboxes")**:
  sqlite-wasm's `exec()` returns rows as POSITIONAL arrays. `SQLiteWASMCollection.find()/findOne()`
  previously pushed those through `deserializeDocument`, whose `Object.entries` turned arrays into
  index-keyed objects (`{"0":…,"1":…}`) — every UI reading `d.first_name` / `dept.name` got
  `undefined`: correct row/option COUNTS, no values. Fixed with `getColumnNames()`
  (cached `PRAGMA table_info`, invalidated in `createTable`) + `deserializeRow()` used by
  find/findOne (`count()`/`getDatabaseSize()` were already positional; other providers return
  named docs; HybridProvider inherits the fix). Regression tests live in
  `src/services/database/__tests__/SQLiteWASMProvider.test.ts` ("positional-row regression").
  E2E: headless journey (welcome → Explore with Demo Data → Load Demo Data → admin/admin login →
  `#/administration/staff`) verifies grid values + combobox labels. This was the blocker for
  data visibility in the demo environment; production build verified (`vite build` exit 0, PWA
  precache generated).
- Empty/dead test artifacts retired in the same pass: `DatabaseManager.test.ts`,
  `UnifiedDatabaseManager.test.ts` (0 bytes) and jest-era `ProviderIntegration.test.ts`
  (vitest could not load it; coverage duplicated by the passing database suites).

- **React context duplication ELIMINATED (Aug 2026)**: six modules (Administration,
  Finance, HR, Inventory, Library, Nutrition) had TWO same-named context objects —
  one in `XDataContext.tsx` (the canonical, barrel-exported one mounted in
  `AppDataContext.tsx`) and a dead duplicate inside `XDataProvider.tsx` (each with
  its own provider + hook throwing "must be used within XDataProvider"). Nothing
  imported the dead files; they were deleted. If you ever see
  "useX must be used within Y Provider" again, check for a second `createContext`
  of the same name — `src/tests/ContextIdentity.test.tsx` guards this regression
  for AppData + all six domain contexts.
- **Vite HMR + context identity**: after editing a provider/context module while
  the dev server and a browser tab are live, the mounted provider chain can keep
  the OLD context object while lazily-loaded route chunks import the NEW one —
  pages visited afterwards throw "useX must be used within Y Provider" until a
  FULL RELOAD of the tab. This is dev-only; a hard reload fixes it (don't chase it
  as a code bug unless it survives reload).
- Tests that `import { render } from '@testing-library/react'` directly bypass the
  global ToastProvider+FullWidthProvider wrapper in `src/tests/setup.ts`; if the
  rendered tree reaches `useToast`, wrap the render locally (see
  `src/contexts/data/__tests__/AdministrationDataContext.test.tsx` for the
  single-point wrapper pattern).

- **Error display convention (fixed Aug 2026)**: the wrapper `FormField` renders the error
  *message*; controls render the error *state*. Controls have `error?: string` (message +
  state — standalone use) and `errorState?: boolean` (state only — red border/ring,
  aria-invalid, trailing icon, NO message). In `FormField`-based layouts pass `error` to
  `FormField` and `errorState` to the control. Passing `error` to both caused duplicated
  messages + icons (EntityForm and SettingsUsersPage had this; both fixed, per-field
  message counts verified = 1).

- **DARK MODE IS DISABLED SYSTEM-WIDE (Aug 2026)** until it is properly
  implemented. Single kill-switch: `DARK_MODE_ENABLED = false` in
  `src/hooks/useTheme.tsx`. While false: the app always resolves light (OS
  `prefers-color-scheme` ignored), a stored 'dark'/'system' preference is cleared
  on boot, `setTheme`/`toggleTheme` are no-ops, the overflow-menu toggle item is
  hidden (it used to be a rogue inline `classList.toggle('dark')` — removed), and
  Toast's OS-based dark detection is gated. `initializeTheme()` is called at the
  app entry (`src/index.tsx`) so light is applied before first paint (adds the
  `light` class, drops any stray `dark`). To re-enable: flip the flag — all
  token/`dark:` plumbing is intact. VERIFIED under emulated OS-dark + a planted
  stored-dark preference: renders light, zero errors.
- The same shell suites `LayoutNewModuleTransitions`, `LayoutNewTabSession`,
  `PrimarySecondaryNavigation` (+SettingsPopupNavigation) fail with
  "useSecondarySidebar/useFullWidth must be used within a ...Provider" —
  pre-existing test-provider-wrapping staleness; wrap their renders with
  SecondarySidebarProvider/FullWidthProvider.
- After `pnpm add/remove`, a running Vite server serves 504 "Outdated Optimize
  Dep" and the app renders blank/spins: kill the node process (TaskStop doesn't
  kill the child on Windows — use `netstat -ano | grep :5199` + `taskkill //F`),
  `rm -rf node_modules/.vite`, restart. First load after mass file edits or cache
  clear can take 60–90s while Vite re-transforms; subsequent loads are fast.
- Tailwind 3: no opacity modifiers on the var()-based `surface-*` colors
  (`bg-surface-muted/70` silently generates nothing); never compose class names
  dynamically — JIT only sees literal strings.
- Mass file rewrites on Windows can hit transient "device or resource busy"
  (antivirus); the Node codemod pattern in this session (write + retry) works.

## Remaining work (in rough priority order)

> Progress update (same session, later pass): items 2 and 4 are DONE, item 3 is
> partially done, item 1's collect-error layer is being remediated. Details below.

1. **Test-debt remediation project** *(major progress)*: 
   - **Collect layer: FIXED** — zero import-resolution failures. 25 files repaired
     (moved-module paths repointed, `@testing-library/react-hooks` → RTL `renderHook`,
     one real source bug fixed: `CircuitBreaker.ts` contained a duplicated module),
     18 obsolete test files deleted (they tested removed settings pages/providers).
   - **Environmental root causes: FIXED** — the historic "shifting victims" flakiness
     was a single wedge: setup.ts called `vi.setSystemTime()` at module scope, which
     broke `vi.useFakeTimers()` in useSlideout.test.tsx; its abandoned async `act()`
     permanently wedged React 19's act queue in the shared singleFork worker, so all
     later files rendered null/empty. Also fixed: matchMedia mock surviving
     `restoreAllMocks`, missing `cleanup`/`renderHook` globals, global render now
     wrapped with ToastProvider+FullWidthProvider, and two real app bugs
     (`useKanban.moveCard` state mutation, `useSlideout` act abandonment).
   - **Hook-test cluster: GREEN** (useToast/useValidation/useFormValidation/
     useTooltip/useModal/useKanban×2/useDataMode/useSlideout/Toast/Tooltip/
     UnifiedModeSwitch/animations + React-19 canaries — 252/252).
   - **In flight at time of writing**: services/database + services/tabs cluster
     (CrossBrowserCompatibility, MigrationSeeding, EndToEndWorkflows,
     CapabilityDetector, TabPersistenceService…) and the UI/integration cluster
     (KanbanBoard's undefined `transitions`, DataLayerSettingsPage integration,
     configurationSwitching, TabPerformance, SettingsRedirects, DataCard,
     small tails).
   - **Wave-2 outcome (agents killed by account quota mid-flight; verified state)**:
     GREEN: KanbanBoard 32/32, CrossBrowserCompatibility 47/47,
     TabPersistenceService 30/30, configurationSwitching 17/17,
     CapabilityDetector 17/17, EndToEndWorkflows 3/3, PhaseEnhancements 31/31,
     TabPerformance 22/22, DataGridModuleSpecific 17/17.
     STILL RED (standalone-verified): `src/stores/__tests__/tabPersistence.integration.test.ts`
     (6/6 — needs the same treatment as TabPersistenceService),
     `src/tests/integration/DataLayerSettingsPage.test.tsx` (~27),
     `src/tests/DataGridTableRenderingTests.test.tsx` (2),
     FeeAdjustmentsPage (1) and StudentPaymentsPage (1) "handles loading state",
     `src/tests/DataModeSwitch.test.tsx` (~24 — deprecated component; consider
     deleting like DataModeSwitchDeprecation was, or rewriting against
     UnifiedModeSwitch), SettingsRedirects/AuthLoginRedirect/DataCard tails.
   - NOTE: batches of many files in one `vitest run` still cross-pollute
     (singleFork). Always judge by standalone runs; splitting the pool is the
     real fix (see gotchas).
2. **Dark-mode page sweep** *(DONE)*: 4,788 solid-color replacements
   (`bg-white`→`bg-surface-card`, `text-gray-900/800/700`→`text-surface-foreground`,
   `text-gray-600/500/400`→`text-surface-muted-fg`, `bg-gray-50/100`→muted/accent,
   `border|divide-gray-200/300`→`border-surface-border`) across 367 files, plus 54
   `dark:` companions added to high-opacity glass surfaces (`bg-white/90` →
   `dark:bg-slate-900/90`) in Header/sidebars/dashboards. Low-opacity white
   overlays (`/5`–`/25`) intentionally left — luminance tints work on dark.
3. **EntityForm migrations** *(partially done)*: migrated so far — DepartmentsPage,
   DesignationsPage, DormitoriesPage, StudentCategoriesPage, ClassesPage (both
   class and stream dialogs). This covers text/checkbox/number/select field types;
   use remaining pages (StaffListPage, FeeTemplatesPage nested item editor,
   SettingsUsersPage, finance dialogs) as follow-up — pattern is mechanical,
   see DepartmentsPage for the reference conversion.
4. **window.confirm → useConfirm()** *(DONE)*: all 34 call sites across 22 files
   converted (admissions, inventory, library, nutrition, HR, settings, core);
   `ConfirmDialog.tsx`'s internal fallback and one test asserting it were kept.
5. **DatePicker adoption**: NOT started. `<Input type="date">` still used widely;
   the custom `DatePicker` component exists and is tested.

### Bonus fixes discovered during this pass

- The earlier save-button codemod dropped JSX braces on **53 button labels**
  (ternaries/`t()` calls rendered as literal text, e.g. `(editingBook ? 'Save
  Changes' : 'Add Book')`). All repaired via signature scans; both scans now
  report zero. If you see a button rendering code-like text, check for this.
- `EnhancedAppDataContextType` was missing ~60 members that pages destructure
  (domain CRUD trios, sync surface, misc arrays) — interface extended, clearing
  ~370 tsc error lines. Module augmentations (`appDataAugmentation.ts`) own the
  collection arrays; don't redeclare those on the enhanced type.

— Written at the end of the Aug 2026 modernization session. Dev server was left
running on port 5199.
