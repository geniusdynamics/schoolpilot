# Tasks: Codebase Health Audit & Stabilization

## Task Dependencies
- Task 2 (Hook violations) depends on Task 1 (broken imports may cause false positives in linting)
- Task 8 (TypeScript strictness) depends on Task 1 (broken imports prevent TypeScript compilation)
- Task 10 (Console.log cleanup) depends on Task 3 (unused import cleanup may eliminate some console.log uses)
- All Phase 1 tasks are independent of each other
- Phase 3 tasks depend on Phase 1 completing

---

## Phase 1: Critical Fixes

- [ ] Task 1: Fix all broken imports across the codebase (16+ files)
  - [ ] SubTask 1.1: Audit and fix `src/i18n/loader.ts` locale namespace imports — ensure all referenced locale files exist at correct paths for en, fr, rw, sw
  - [ ] SubTask 1.2: Fix `src/hooks/useUnifiedConfig.ts` — create missing `@/utils/dataModeManager` module or correct import path
  - [ ] SubTask 1.3: Fix `src/components/MarketplaceDiscovery.tsx` — correct `../../services/plugin/PluginMarketplace` import path
  - [ ] SubTask 1.4: Fix `src/components/DatabaseMonitoringDashboard.tsx` — create missing `@/hooks/useDatabasePerformance` or correct import path
  - [ ] SubTask 1.5: Fix `src/services/livestore/LiveStoreProvider.tsx` — resolve `./schema` import (create schema file or fix path)
  - [ ] SubTask 1.6: Fix `src/scripts/data-migration/migrate-mock-data-to-livestore.ts` — resolve transport module import
  - [ ] SubTask 1.7: Fix `src/i18n/components/LanguageSwitcher.tsx` — correct dropdown-menu import path
  - [ ] SubTask 1.8: Fix `src/core/services/coreServices.ts` — correct moduleRegistry import path
  - [ ] SubTask 1.9: Fix `src/modules/reports/dashboards/PerformanceDashboard.tsx` — create missing AcademicCharts module or correct import path
  - [ ] SubTask 1.10: Fix `src/modules/inventory/hooks/useReorderMonitoring.ts` — create missing reorderMonitoringService module or correct import path
  - [ ] SubTask 1.11: Fix `src/modules/inventory/components/ReorderAlertsPanel.tsx` — create missing reorderMonitoringService module or correct import path
  - [ ] SubTask 1.12: Fix `src/modules/administration/pages/ClassesPage.tsx` — create missing `@/types/database` and `@/types/actions` or correct import paths
  - [ ] SubTask 1.13: Run `npx tsc --noEmit` to confirm zero import-related errors

- [ ] Task 2: Fix React Hook rule violations (35 errors)
  - [ ] SubTask 2.1: Fix `src/utils/debug/renderMonitor.ts` — move `useRef` outside conditional branches
  - [ ] SubTask 2.2: Fix `src/utils/renderLoopPrevention.ts` — move `useEffect` outside conditional branches, add missing dependencies
  - [ ] SubTask 2.3: Audit `useEffect`, `useCallback`, `useMemo` hooks across the codebase for missing dependencies (run ESLint react-hooks/exhaustive-deps)
  - [ ] SubTask 2.4: Remove unused dependencies from dependency arrays
  - [ ] SubTask 2.5: Confirm ESLint react-hooks/exhaustive-deps passes on all fixed files

- [ ] Task 3: Clean up unused imports and variables (2,000+ issues)
  - [ ] SubTask 3.1: Run ESLint with `--fix` to auto-remove unused imports where safe
  - [ ] SubTask 3.2: Manual review of remaining `no-unused-vars` warnings that cannot be auto-fixed
  - [ ] SubTask 3.3: Preserve all side-effect imports that may be needed at runtime
  - [ ] SubTask 3.4: Verify no false removals by running `npx tsc --noEmit`

- [ ] Task 4: Complete translation coverage across all 4 languages
  - [ ] SubTask 4.1: Audit all locale namespace files for rw and sw — identify missing keys compared to en (baseline)
  - [ ] SubTask 4.2: Fix `src/i18n/loader.ts` — remove any namespace references that don't have corresponding locale files
  - [ ] SubTask 4.3: Add missing translation keys to rw and sw namespaces (use en as source of truth)
  - [ ] SubTask 4.4: Implement or verify fallback strategy: missing key -> English -> key name
  - [ ] SubTask 4.5: Verify no runtime translation fallback warnings in development mode

## Phase 2: Architecture & Configuration

- [ ] Task 5: Consolidate config system — additive re-exports only, no code removal
  - [ ] SubTask 5.1: Map all configuration sources (`src/config/`, `src/core/config/`) — document overlaps and unique entries
  - [ ] SubTask 5.2: Ensure `src/core/config/` has re-export shims to `src/config/` for backward compatibility
  - [ ] SubTask 5.3: Update import references across the codebase to use `src/config/` where possible
  - [ ] SubTask 5.4: Verify `npx tsc --noEmit` passes with no broken config imports

- [ ] Task 6: Resolve dual test runner confusion
  - [ ] SubTask 6.1: Choose Vitest as the primary test runner (already configured and working)
  - [ ] SubTask 6.2: Fix `jest.config.js` — correct `moduleNameMapping` to `moduleNameMapper` if Jest is still needed, or remove the file if entirely unused
  - [ ] SubTask 6.3: Update any CI/package.json scripts that reference Jest to use Vitest instead
  - [ ] SubTask 6.4: Verify `npm test` runs successfully using Vitest only

## Phase 3: Quality & Security

- [ ] Task 7: Enforce TypeScript strictness
  - [ ] SubTask 7.1: Add `noUnusedLocals: true` and `noUnusedParameters: true` to `tsconfig.json` compilerOptions
  - [ ] SubTask 7.2: Run `npx tsc --noEmit` and fix all resulting errors
  - [ ] SubTask 7.3: Ensure no `any` types are introduced solely to bypass strict checks
  - [ ] SubTask 7.4: Verify compilation passes with the new strict flags

- [ ] Task 8: Remediate security exposures
  - [ ] SubTask 8.1: Audit source code for hardcoded credentials (search for DSN, API key, secret, token patterns)
  - [ ] SubTask 8.2: Move Bugsink DSN to environment variable with no hardcoded fallback value
  - [ ] SubTask 8.3: Audit `localStorage` usage for sensitive data (tokens, PII)
  - [ ] SubTask 8.4: Verify no credentials are exposed in error logs or sentry breadcrumbs

- [ ] Task 9: Replace console.log with proper logger utility
  - [ ] SubTask 9.1: Search for all `console.log`, `console.warn`, `console.error`, `console.info` in production source files (exclude test files and config files)
  - [ ] SubTask 9.2: Replace each occurrence with the appropriate `logger` method (`logger.info`, `logger.warn`, `logger.error`)
  - [ ] SubTask 9.3: For debug-only logging, verify there is a mechanism to disable in production

## Phase 4: Housekeeping

- [ ] Task 10: Remove coverage/ directory from version control
  - [ ] SubTask 10.1: Verify `coverage/` is in `.gitignore`; add if missing
  - [ ] SubTask 10.2: Remove existing coverage files from git tracking using `git rm -r --cached coverage/`
  - [ ] SubTask 10.3: Verify `git status` shows no untracked coverage files

## Verification

- [ ] Task 11: Verify all changes compile and tests pass
  - [ ] SubTask 11.1: Run `npx tsc --noEmit` — zero errors
  - [ ] SubTask 11.2: Run `npm test` — all tests pass
  - [ ] SubTask 11.3: Run `npm run build` — successful build
  - [ ] SubTask 11.4: Verify `npm run dev` starts without import-related crashes
