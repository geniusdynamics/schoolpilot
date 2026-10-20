# Architecture

SchoolPilot3 is a React + TypeScript + Vite single-page application for Kenyan
school administration. This document explains the moving parts and the rules
that keep them coherent.

## High-level layers

```
┌─────────────────────────────────────────────────┐
│ UI: modules/*/pages + components/ui             │
│     (DataGrid, EntityForm, ConfirmDialog, …)    │
├─────────────────────────────────────────────────┤
│ State & data hooks                              │
│     useAppData → AppDataContext                 │
│         └─ composed from modules/*/data/*       │
│            (useDatabaseCollection per table)    │
│     useEntityCrud → useCrudFactory              │
├─────────────────────────────────────────────────┤
│ Services                                        │
│     databaseService → UnifiedDatabaseManager    │
│         ├─ providers: PouchDB / SQLite(WASM) /  │
│         │   backend-API / ERPNext …             │
│         └─ ICollection<T> contract              │
├─────────────────────────────────────────────────┤
│ Config & plugins                                │
│     UnifiedConfigContext · featureFlagStore ·   │
│     plugin registry (BuiltinLoader)             │
└─────────────────────────────────────────────────┘
```

## Data modes

`UnifiedConfigContext.dataMode` selects between:

- **production** — empty persistent database; users create real records.
- **demo** — seeded sample data (`seedDatabase({ volume, dataMode })`) for
  evaluation.

First run goes through `OnboardingGate` → `FirstRunOnboarding`; production-path
users continue into the setup wizard (`src/components/setup/SetupWizard.tsx`)
which writes school profile, education system, academic year/terms, classes,
streams and subjects directly via collections. Progress persists in localStorage.

## Database access

All persistence funnels through `databaseService.getDatabase()`, which returns a
provider-agnostic handle (a Proxy over `UnifiedDatabaseManager`). Collections
expose `ICollection<T>`: `find/insert/update/remove/subscribe/…`.

Two consumption styles:

1. **Context style** — module data providers compose `useDatabaseCollection`
   per collection and expose `{ students, addStudent, … }` through
   `AppDataContext`. Types are extended by per-module
   `appDataAugmentation.ts` declaration-merging files.
2. **Entity style** — pages own their data via `useEntityCrud`
   (`useCrudFactory` underneath): optimistic updates with rollback, toasts,
   and ConfirmDialog-driven deletes. See docs/contributing/crud.md.

> Ids are strings at runtime (PouchDB-style document ids). Some legacy type
> declarations still say `number` — treat string as truth when touching ids.

## Routing

`src/routing` owns URL→page mapping: `routeConfig` / `moduleRoutes` /
`ModuleRouteLoader`, plus a legacy `redirectMap`. The authenticated shell is a
single `components/Layout.tsx` using the URL-driven tab system
(`services/tabs`, `hooks/tabs`). A legacy workspace-tab layout existed until it
was retired in Phase 1d (see git history).

## Modules vs plugins

- **Modules** (`src/modules/<name>`) are first-party feature areas compiled
  into the app. Each has `data/`, `pages/`, optional `components/` and i18n.
- **Plugins** (`src/plugins/builtin/*`) extend the backend/UI surface at
  runtime via manifests. Three are always registered (whitelabel,
  grading-engine, fee-calculator); the rest are dormant behind
  `plugin_<name>` feature flags in `featureFlagStore`.

## Error handling

Error boundaries are mounted inside Layout/tabbedWorkspace, not globally:
`ErrorBoundary`, `HookErrorBoundary` (hook-order violations, auto-retry),
`PageErrorBoundary`, `TabWorkspaceErrorBoundary`.

## Key invariants

1. The typecheck ratchet never grows: `pnpm check:ratchet`.
2. No `window.confirm` / `alert` / `prompt`.
3. `AppDataContext`, routing, module registry: additive changes only.
4. Collection ids are strings; comparisons use `String(x) === String(y)`.
5. Money renders via `formatKES`, dates via `formatDate`.

## Where to look

| Topic | File |
| --- | --- |
| Table contract | `docs/contributing/grids.md` |
| Form stack | `docs/contributing/forms.md` |
| List-page pattern | `docs/contributing/crud.md` |
| Typecheck ratchet | `.type-ratchet`, `scripts/check-type-ratchet.cjs` |
| Provider contracts | `src/services/database/interfaces.ts` |
| Feature flags | `src/stores/featureFlagStore.ts` |
