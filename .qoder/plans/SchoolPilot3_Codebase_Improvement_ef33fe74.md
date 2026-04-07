# SchoolPilot3 Codebase Improvement Plan

## Current State Summary

- **Scale**: 400+ source files, 20 modules, 127 production dependencies, React 19 + TypeScript 5.7 + Vite 6
- **Maturity**: 5.5/10 — solid modular foundation but organizational inconsistencies, oversized files, and mixed concerns
- **Critical oversized files**: `useDatabaseData.ts` (2121 lines), `unifiedConfig.ts` (1682 lines), `core/types.ts` (1665 lines), `AppDataContext.tsx` (1386 lines), `PluginManager.ts` (765 lines), `App.tsx` (662 lines)

---

## Phase 1: Foundation Cleanup (Low Risk, No Behavioral Changes)

Goal: Remove noise, enforce consistency, and establish clean baselines without changing any runtime behavior.

### Task 1.1 — Remove Dead Code and Commented-Out Imports

**Target**: `src/App.tsx` lines 39-50, 228-245, 278-309

Remove all commented-out lazy imports and route definitions:
```typescript
// REMOVE these blocks:
// const TabbedWorkspaceTestPage = lazy(() => import(...));
// const DatabaseSettingsPage = lazy(() => import(...));
// const DataManagementSettingsPage = lazy(() => import(...));
// const BackupSettingsPage = lazy(() => import(...));
```

Also scan for and remove any other commented-out code blocks across the codebase.

### Task 1.2 — Relocate Demo Components

**Current**: 10+ demo files (`ButtonDemo.tsx`, `CardDemo.tsx`, `ModalDemo.tsx`, `KanbanDemo.tsx`, etc.) scattered in `src/components/`

**Action**: Move all `*Demo.tsx` files to `src/components/__demos__/` with a barrel index:
```
src/components/__demos__/
├── index.ts
├── AnimationDemo.tsx
├── ButtonDemo.tsx
├── CardDemo.tsx
├── FormValidationDemo.tsx
├── KanbanDemo.tsx
├── LoadingStatesDemo.tsx
├── ModalDemo.tsx
├── SlideoutFormDemo.tsx
├── TabbedFormDemo.tsx
├── ToastDemo.tsx
├── TooltipDemo.tsx
├── DatePickerDemo.tsx
├── SelectDemo.tsx
└── DataGridDemo.tsx
```

Update any imports referencing these files. The `AnimationDemoPage.tsx` in `src/pages/` should import from the new location.

### Task 1.3 — Enforce Consistent Import Path Aliases

**Problem**: Mixed `@/` alias and relative imports — e.g., academics uses `../../core/types` while finance uses `@/core/types`

**Action**:
1. Add ESLint rule `no-restricted-imports` to forbid relative imports that cross module boundaries (going above `../`)
2. Convert all cross-module imports to use `@/` alias consistently
3. Allow relative imports only within the same directory or immediate parent

**Key files to fix first**: All `moduleDefinition.tsx` files across 20 modules (standardize to `@/core/types`, `@/components/ui/icons`)

### Task 1.4 — Consolidate Debug Logging

**Problem**: 30+ `debugLog()` calls in `App.tsx`, 8+ `console.log()` in `moduleRegistry.ts`, test helpers in `index.tsx`

**Action**:
1. Create `src/utils/logger.ts` with environment-aware logging levels (debug, info, warn, error)
2. Replace all direct `console.log`/`debugLog` calls with the logger
3. Move debug helpers from `index.tsx` (testLogin, testAllDemoUsers, testAuthState) to `src/utils/devTools.ts`, loaded only in development via `if (import.meta.env.DEV)`

### Task 1.5 — Clean Stale Documentation

Per the project standard: documentation must be consolidated under `docs/` with semantic subfolders (`docs/architecture/`, `docs/tabs/`, `docs/guides/`, `docs/reports/`).

**Action**: Audit for any stale `.md` files outside `docs/` (e.g., `AkademicoNotes/`) and either move them into the proper `docs/` subfolder or delete if obsolete.

---

## Phase 2: Core Architecture Refactoring

Goal: Break down the 5 critically oversized files into focused, single-responsibility modules. Each sub-task is independent and can be verified in isolation.

### Task 2.1 — Split `src/core/types.ts` (1665 lines)

**Current**: Single file mixing enums, shared DTOs, module-specific types (finance, inventory, academics re-exports)

**Target structure**:
```
src/core/types/
├── index.ts              # Re-exports everything (backward compatible)
├── enums.ts              # PersonGender, StudentStatus, DayOfWeek, AttendanceStatus, etc.
├── common.ts             # ChartData, BarChartData, BaseEntity, shared interfaces
├── academic.ts           # Cross-module academic types only (used by 2+ modules)
├── finance.ts            # Cross-module finance types only
├── inventory.ts          # Cross-module inventory types (FixedAsset, StockLevel, etc.)
└── administration.ts     # Cross-module admin types (Student, Staff, Class)
```

**Rules**:
- Only types used by 2+ modules belong in `src/core/types/`
- Module-specific types stay in `src/modules/*/data/types.ts`
- The `index.ts` re-exports everything so existing `import { X } from '@/core/types'` continues to work

### Task 2.2 — Split `src/config/unifiedConfig.ts` (1682 lines)

**Target structure**:
```
src/config/
├── index.ts                    # Public API re-exports
├── core.ts                     # detectEnvironment(), getEnvironmentConfig()
├── features.ts                 # 80+ feature flags, feature groups, feature matrix
├── dataMode.ts                 # switchDataMode(), validateDataMode(), getDataModeState()
├── productionDemo.ts           # (already exists) getProductionDemoConfig()
├── databaseConfigSchema.ts     # (already exists) validation schemas
├── databaseConfigRuntime.ts    # (already exists) runtime config loading
├── dataLayerConfig.ts          # (already exists) provider mapping
├── environmentMatrix.ts        # (already exists) environment detection
├── dataModePolicies.ts         # (already exists) data mode rules
└── deployment.ts               # (already exists) deployment config
```

**Key change**: Extract from `unifiedConfig.ts` into `core.ts`, `features.ts`, and `dataMode.ts`. Keep `unifiedConfig.ts` as a thin orchestrator that composes the three, or replace it with `index.ts`.

### Task 2.3 — Split `src/App.tsx` (662 lines)

**Target structure**:
```
src/
├── App.tsx                     # Slim: Provider hierarchy + <AppInner/>
├── routing/
│   ├── index.ts                # Public exports
│   ├── routeConfig.ts          # Static route definitions (login, dashboard, settings)
│   ├── moduleRoutes.ts         # Dynamic module route generation from registry
│   └── pageLoader.ts           # import.meta.glob() logic + lazy loading helpers
```

**Before** (App.tsx, 662 lines handling providers, glob loading, route generation, navigation):
```typescript
// All in one file
const pageModules = { ...import.meta.glob('./modules/*/pages/*.tsx'), ... };
// + 50 lines of route generation
// + 100 lines of provider nesting
// + debug logging
```

**After** (App.tsx ~100 lines):
```typescript
import { AppRoutes } from '@/routing';
function App() {
  return (
    <UnifiedConfigProvider>
      <ToastProvider>
        <OnboardingGate>
          <AppRoutes />
        </OnboardingGate>
      </ToastProvider>
    </UnifiedConfigProvider>
  );
}
```

### Task 2.4 — Split `src/hooks/useDatabaseData.ts` (2121 lines)

This is the highest-impact refactoring. The hook provides CRUD for 50+ entity types.

**Target structure**:
```
src/hooks/data/
├── index.ts                    # Re-exports useDatabaseData() composed hook
├── useDatabaseData.ts          # Slim compositor that merges domain hooks
├── useAdministrationData.ts    # Students, Staff, Classes, Departments
├── useAcademicData.ts          # Subjects, Exams, Timetables, Grading
├── useFinanceData.ts           # Fees, Payments, Invoices, Ledger
├── useHRData.ts                # Payroll, Salary, Payslips
├── useInventoryData.ts         # Stock, Items, Warehouses, Requisitions
├── useLibraryData.ts           # Books, Loans, Fines
├── useNutritionData.ts         # Meals, Menus, Wallets
├── useSystemData.ts            # SchoolDetails, Roles, Users, Config
└── useLoadingState.ts          # Centralized loading/error state management
```

**Backward compatibility**: The top-level `useDatabaseData()` continues to return the same interface by spreading all domain hooks:
```typescript
export function useDatabaseData() {
  const admin = useAdministrationData();
  const academic = useAcademicData();
  const finance = useFinanceData();
  // ...
  return { ...admin, ...academic, ...finance, ... };
}
```

### Task 2.5 — Split `src/contexts/AppDataContext.tsx` (1386 lines)

**Target structure**:
```
src/contexts/
├── AppDataContext.tsx           # Slim compositor (100 lines) wrapping domain contexts
├── data/
│   ├── AdministrationDataContext.tsx
│   ├── AcademicDataContext.tsx
│   ├── FinanceDataContext.tsx
│   ├── HRDataContext.tsx
│   ├── InventoryDataContext.tsx
│   └── SystemDataContext.tsx
├── appData/                    # (existing) collection definitions, helpers
├── AuthContext.tsx              # (existing)
├── UnifiedConfigContext.tsx     # (existing)
├── SyncContext.tsx              # (existing)
├── NetworkContext.tsx           # (existing)
└── ActionProvider.tsx           # (existing)
```

Each domain context manages only its entity types, loading states, and CRUD operations. `AppDataContext` composes them into the existing interface for backward compatibility.

---

## Phase 3: Module-Level Enhancements

Goal: Standardize the internal structure of all 20 modules and enforce dependency contracts.

### Task 3.1 — Define and Enforce Module Template

Every module MUST contain these directories (even if initially empty with an `index.ts`):

```
src/modules/{moduleName}/
├── moduleDefinition.tsx        # Required: navigation, deps, RBAC, features
├── index.ts                    # Required: barrel exports
├── pages/                      # Required: route-level components
│   └── index.ts
├── components/                 # Required: module-specific UI
│   └── index.ts
├── services/                   # Required: business logic
│   └── index.ts
├── data/                       # Required: types, schemas, constants
│   ├── types.ts
│   └── index.ts
├── hooks/                      # Required: module-specific hooks
│   └── index.ts
└── i18n/                       # Required: translation files
    └── en.json
```

**Action**: Scaffold missing directories for non-conforming modules (finance, hr, library, nutrition, administration). Move any service logic currently embedded in pages/ into the module's services/ directory.

### Task 3.2 — Evaluate Module Consolidation

**Candidates for consolidation**:
- `houses/` (46-line definition) → merge into `administration` as a sub-feature
- `pickup/` → merge into `administration` or `finance` depending on domain
- `portal/` → evaluate if it should be a standalone module or part of `settings`

**Action**: For each candidate, analyze usage and imports. If the module has <5 pages and no external dependents, consolidate it into its parent module with a feature flag.

### Task 3.3 — Enforce Module Dependencies at Runtime

**Current**: Dependencies declared in `moduleDefinition.tsx` but only soft-validated.

**Action**: In `src/core/moduleRegistry.ts`, add strict dependency checking in `registerModule()`:
```typescript
registerModule(module: ModuleDefinition) {
  for (const dep of module.dependencies.filter(d => d.required)) {
    if (!this.isRegistered(dep.moduleId)) {
      throw new Error(`Module "${module.id}" requires "${dep.moduleId}" which is not registered`);
    }
  }
  // ... proceed with registration
}
```

### Task 3.4 — Add Module-Level Barrel Exports

Each module's `index.ts` should export:
```typescript
export { default, moduleDefinition } from './moduleDefinition';
export * from './data/types';
export * from './services';
export * from './hooks';
```

This enables clean cross-module imports: `import { StudentType } from '@/modules/administration'`

---

## Phase 4: Service Layer Reorganization

Goal: Transform the flat 49-file service directory into a domain-organized hierarchy.

### Task 4.1 — Reorganize Service Directory

**Current**: 36+ files at `src/services/` root + 10 partial subdirectories

**Target**:
```
src/services/
├── index.ts                    # Public API
├── database/                   # (existing, keep) UnifiedDatabaseManager, providers
├── sync/                       # (existing, keep) sync services
├── backend/                    # (existing, keep) BackendAPIService, adapters
├── auth/
│   └── authService.ts          # Move from root
├── ui/
│   ├── TabStateManager.ts      # Move from root
│   ├── TabAccessibilityManager.ts
│   ├── TabPerformanceManager.ts
│   └── ActionRegistry.ts
├── performance/
│   ├── performanceEventManager.ts
│   ├── performanceBenchmark.ts  # Move from root
│   ├── memoryManager.ts
│   └── bundleAnalyzer.ts
├── data/                       # (existing, keep) data processing
├── consistency/
│   ├── DataConsistencyService.ts
│   ├── DataSyncMonitoringService.ts
│   └── DataStrategyManager.ts
└── module/
    ├── moduleConfigService.ts
    └── moduleHealthMonitor.ts
```

Each subdirectory gets an `index.ts` barrel export. Update all import paths project-wide.

### Task 4.2 — Create Service Interfaces

For key services, define explicit interfaces in each subdirectory's `types.ts`:
```typescript
// src/services/database/types.ts
export interface IDatabaseService {
  initialize(): Promise<void>;
  getCollection<T>(name: string): Collection<T>;
  query<T>(collection: string, filter: QueryFilter): Promise<T[]>;
  // ...
}
```

This enables future dependency injection and testability.

---

## Phase 5: Component Structure Optimization

Goal: Improve component discoverability, reusability, and separation from business logic.

### Task 5.1 — Add Missing Barrel Exports

Create `index.ts` files for:
- `src/components/index.ts` — export layout, feature components
- `src/components/layout/index.ts` — Layout, Header, Sidebar exports
- `src/components/tabbedWorkspace/index.ts` — tab system exports
- `src/components/ErrorBoundary/index.ts` — error boundary exports

### Task 5.2 — Extract Business Logic from Large Components

**Target**: `SecondarySidebar.tsx` (36KB)

**Action**: Extract navigation logic, module filtering, and state management into:
- `src/hooks/useSecondarySidebar.ts` — sidebar state, filtering, navigation logic
- Keep `SecondarySidebar.tsx` as a pure presentational component receiving props

Apply the same pattern to any component exceeding 500 lines.

### Task 5.3 — Split Icon Registry

**Current**: `src/components/ui/icons.tsx` (56.3KB) — 300+ icon exports

**Action**: Split into domain-based icon files:
```
src/components/ui/icons/
├── index.ts              # Re-exports everything
├── navigation.ts         # Nav-related icons
├── actions.ts            # Action icons (edit, delete, save)
├── status.ts             # Status icons (check, warning, error)
├── module.ts             # Module-specific icons
└── misc.ts               # Remaining icons
```

This enables tree-shaking at the domain level and reduces cognitive load.

### Task 5.4 — Organize Settings Components

**Current**: `FeatureSettings.tsx` and `FeatureSettingsNew.tsx` coexist, along with `BackendConfiguration.tsx`, `DataModeSwitch.tsx`, `UnifiedModeSwitch.tsx` scattered in `src/components/`

**Action**: Consolidate into `src/components/settings/`:
```
src/components/settings/
├── index.ts
├── FeatureSettings.tsx         # Keep the newer version, deprecate old
├── BackendConfiguration.tsx
├── DataModeSwitch.tsx
├── UnifiedModeSwitch.tsx
└── SettingsLayout.tsx          # Shared layout for settings pages
```

Remove `FeatureSettings.tsx` (old version) after confirming `FeatureSettingsNew.tsx` is the active one.

---

## Phase 6: Plugin System Refinements

Goal: Ensure plugins follow the architecture spec, improve isolation, and prepare for open-source extensibility.

### Task 6.1 — Validate Builtin Plugin Compliance

Per project standard: each builtin plugin must be a self-contained package with a `plugin.json` manifest and support auto-discovery — manual registration in PluginsProvider is incorrect.

**Action**: Audit all 6 builtin plugins (`whitelabel`, `grading-engine`, `fee-calculator`, `payment-mock`, `sms-mock`, `analytics-mock`) against `PLUGIN_ARCHITECTURE_SPEC.md`. Ensure each has:
- `plugin.json` manifest (not just TypeScript exports)
- Proper directory structure per spec
- Auto-discovery via `BuiltinLoader.ts` (no manual registration)

### Task 6.2 — Split PluginManager.ts (765 lines)

**Target**:
```
src/plugins/
├── index.ts                    # Public API
├── types.ts                    # (existing) Plugin type system
├── PluginManager.ts            # Slim: lifecycle orchestration only (~200 lines)
├── PluginHookSystem.ts         # Hook registration, execution, circuit breaker
├── PluginSettingsManager.ts    # Per-plugin configuration storage
├── PluginEventSystem.ts        # Lifecycle events, tracking
├── PluginSecuritySandbox.ts    # Permission checking, sandbox enforcement
├── PluginsProvider.tsx          # (existing) React context
├── BuiltinLoader.ts            # (existing) Auto-discovery
└── usePlugins.ts               # (existing) React hook
```

### Task 6.3 — Add Plugin Development Guide

Create a minimal plugin scaffold example in `src/plugins/builtin/_template/`:
```
_template/
├── plugin.json                 # Manifest template
├── index.ts                    # Entry point template
├── README.md                   # How to create a new plugin
└── types.ts                    # Plugin-specific types template
```

---

## Phase 7: Function-Level and Performance Improvements

Goal: Improve code-level maintainability, reduce bundle size, and optimize rendering.

### Task 7.1 — Implement Per-Module Code Splitting

**Current**: `App.tsx` uses `import.meta.glob()` to eagerly analyze all module pages.

**Action**: In the new `src/routing/pageLoader.ts`, implement lazy loading per module:
```typescript
// Instead of loading all pages at once:
const pageModules = import.meta.glob('../modules/*/pages/**/*.tsx');

// Load module pages only when the module route is accessed:
function getModulePages(moduleId: string) {
  return import.meta.glob(`../modules/${moduleId}/pages/**/*.tsx`);
}
```

Configure Vite manual chunks per module in `vite.config.ts`:
```typescript
manualChunks(id) {
  if (id.includes('/modules/academics/')) return 'module-academics';
  if (id.includes('/modules/finance/')) return 'module-finance';
  // ... per module
}
```

### Task 7.2 — Memoize Context Values

In each domain context (from Task 2.5), wrap the context value in `useMemo` to prevent unnecessary re-renders:
```typescript
const contextValue = useMemo(() => ({
  students, classes, addStudent, updateStudent, deleteStudent,
  loading: adminLoading,
}), [students, classes, adminLoading]);
```

### Task 7.3 — Enable Strict ESLint Rules

1. Re-enable `@typescript-eslint/no-explicit-any` as a warning (currently disabled)
2. Add `import/order` rule for consistent import ordering
3. Add `no-restricted-imports` for cross-module boundary enforcement
4. Add file size lint warning (flag files > 500 lines)

### Task 7.4 — Audit and Remove Unused Dependencies

Investigate and remove if unused:
- `react-beautiful-dnd@13.1.1` — check if any component uses it
- `@livestore/*` packages — verify usage vs. PouchDB
- `@effect/rpc@0.69.0` — unclear purpose

---

## Phase 8: Testing and Quality Gates

### Task 8.1 — Clean Test Organization

**Action**:
1. Remove obsolete test files (backup-*, debug-* patterns in `src/tests/`)
2. Move module-specific tests to `src/modules/*/__ tests__/`
3. Keep only cross-module integration tests in `src/tests/integration/`
4. Establish pattern: unit tests co-located, integration tests centralized

### Task 8.2 — Add Tests for Refactored Modules

After each Phase 2 split, add focused tests:
- Domain data hooks: test CRUD operations per domain in isolation
- Domain contexts: test provider rendering and state management
- Routing: test route generation from module registry
- Config: test feature flag resolution per environment

---

## Execution Order and Dependencies

```
Phase 1 (Cleanup)         ── no dependencies, safe to start immediately
  |
Phase 2 (Core Split)      ── depends on Phase 1 completion
  |        |
  |   Phase 3 (Modules)   ── depends on Task 2.1 (types split)
  |        |
  |   Phase 4 (Services)  ── independent of Phase 3, depends on Phase 1
  |
Phase 5 (Components)      ── depends on Phase 1 (demo relocation)
  |
Phase 6 (Plugins)         ── depends on Phase 2 (core splits)
  |
Phase 7 (Performance)     ── depends on Phases 2-5
  |
Phase 8 (Testing)         ── runs in parallel with each phase
```

**Estimated timeline**: 8-12 weeks for full execution, with Phase 1 deliverable in week 1 and each subsequent phase taking 1-2 weeks.

---

## Risk Mitigation

1. **Backward compatibility**: Every split uses barrel re-exports (`index.ts`) so existing imports continue to work. No import path breaks.
2. **Incremental verification**: Each task is independently testable. Run `tsc --noEmit` and `vitest` after each task.
3. **No behavioral changes in Phase 1**: Phase 1 is purely organizational — no runtime logic changes.
4. **Feature flag for new routing**: Phase 2.3 (App.tsx split) can be gated behind the existing `useNewTabSystem` feature flag pattern.
5. **Git strategy**: One branch per task, squash-merge to main after verification.
