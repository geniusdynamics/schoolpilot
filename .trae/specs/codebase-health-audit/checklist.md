# Codebase Health Audit -- Verification Checklist

## Broken Imports

- [ ] All 16+ broken import paths are fixed across core services, hooks, i18n, modules, and components
- [ ] `src/i18n/loader.ts` locale namespace imports resolve to valid existing files
- [ ] `src/hooks/useUnifiedConfig.ts` has valid `@/utils/dataModeManager` import (module created or path corrected)
- [ ] `src/components/MarketplaceDiscovery.tsx` plugin marketplace import path is correct
- [ ] `src/components/DatabaseMonitoringDashboard.tsx` useDatabasePerformance import resolves
- [ ] `src/services/livestore/LiveStoreProvider.tsx` schema import resolves
- [ ] `src/scripts/data-migration/migrate-mock-data-to-livestore.ts` transport import resolves
- [ ] `src/i18n/components/LanguageSwitcher.tsx` dropdown-menu import path is correct
- [ ] `src/core/services/coreServices.ts` moduleRegistry import path is correct
- [ ] `src/modules/reports/dashboards/PerformanceDashboard.tsx` AcademicCharts import resolves
- [ ] `src/modules/inventory/hooks/useReorderMonitoring.ts` reorderMonitoringService import resolves
- [ ] `src/modules/inventory/components/ReorderAlertsPanel.tsx` reorderMonitoringService import resolves
- [ ] `src/modules/administration/pages/ClassesPage.tsx` type imports (`@/types/database`, `@/types/actions`) resolve
- [ ] `npx tsc --noEmit` completes with zero import-related errors
- [ ] `npm run dev` starts without import-related runtime crashes

## React Hook Rules

- [ ] `renderMonitor.ts` has no conditional `useRef` calls
- [ ] `renderLoopPrevention.ts` has no conditional `useEffect` calls
- [ ] All `useEffect` hooks have correct dependency arrays (no missing deps, no unnecessary deps)
- [ ] All `useCallback` hooks have correct dependency arrays
- [ ] All `useMemo` hooks have correct dependency arrays
- [ ] ESLint `react-hooks/exhaustive-deps` rule passes on all fixed files
- [ ] No hooks are called inside conditions, loops, or nested functions

## Unused Imports and Variables

- [ ] ESLint `no-unused-vars` warnings reduced to zero (or explicitly documented acceptable minimum)
- [ ] `npx tsc --noEmit` with `noUnusedLocals` enabled produces zero errors
- [ ] Bundle size analysis shows measurable reduction after cleanup

## Translation Coverage

- [ ] All 4 languages (en, fr, rw, sw) have complete translation coverage for all active namespace files
- [ ] `src/i18n/loader.ts` references only existing locale namespace files
- [ ] No namespace file is missing for any language when it exists for another
- [ ] Fallback behavior is verified: missing key --> English translation --> key name
- [ ] No runtime "missing translation" warnings appear in development mode

## Config Consolidation

- [ ] `src/core/config/` is deprecated or removed (re-exports or fully migrated)
- [ ] All config consumers consistently import from `src/config/`
- [ ] No duplicate configuration values exist across multiple config directories
- [ ] `npx tsc --noEmit` passes with no broken config-related imports

## Data Layer Cleanup

- [ ] Unused database providers (PouchDB, LiveStore, ERPNext) are removed or clearly marked deprecated with JSDoc
- [ ] Database service files are consolidated (no `databaseService.ts` vs `databaseServiceLegacy.ts` duplicates)
- [ ] Provider selection logic references only active providers
- [ ] No consumers import from removed or deprecated providers

## Test Runner

- [ ] Single test runner (Vitest) is used for all tests
- [ ] `jest.config.js` is removed or has its `moduleNameMapping` bug fixed (changed to `moduleNameMapper`)
- [ ] All CI scripts and `package.json` scripts reference the correct test runner
- [ ] `npm test` runs successfully using Vitest only

## TypeScript Strictness

- [ ] `noUnusedLocals: true` enabled in `tsconfig.json`
- [ ] `noUnusedParameters: true` enabled in `tsconfig.json`
- [ ] TypeScript compilation succeeds with zero errors under the new strict flags
- [ ] No `any` types introduced solely to bypass strict checks

## Security

- [ ] No hardcoded Bugsink DSN or similar credentials in source code
- [ ] Bugsink DSN is read from environment variable only (no hardcoded fallback)
- [ ] `localStorage` usage is audited -- no unencrypted sensitive data (tokens, PII) stored
- [ ] No credentials exposed in error logs, sentry breadcrumbs, or console output

## Console Logging

- [ ] Zero `console.log` calls in production source files (excluding test files)
- [ ] Zero `console.error` calls in production source files (excluding test files)
- [ ] Zero `console.warn` calls in production source files (excluding test files)
- [ ] All production logging uses `logger.info`, `logger.warn`, or `logger.error`

## Housekeeping

- [ ] `coverage/` directory is listed in `.gitignore`
- [ ] Coverage files are removed from git tracking (`git rm -r --cached coverage/`)
- [ ] `git status` shows no untracked coverage files
- [ ] Barrel exports (index.ts files) are audited -- unused exports removed or deprecated
- [ ] No consumer imports break after barrel export cleanup

## Build Verification

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm test` passes with zero failures
- [ ] `npm run build` (or equivalent) succeeds
- [ ] `npm run dev` starts without runtime crashes
