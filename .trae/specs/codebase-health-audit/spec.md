# Codebase Health Audit & Stabilization Spec

## Why

SchoolPilot3 has accumulated significant technical debt across its 160+ page components, 19 modules, and complex multi-provider data layer. A systematic audit revealed 16+ broken import paths, 35 React Hook violations, approximately 2,000 unused imports and variables, incomplete Kinyarwanda and Swahili translation coverage, a fragmented configuration system with three coexisting config sources, an over-engineered data layer with 5+ database providers (many unused), a dual test runner conflict between Jest and Vitest, TypeScript strictness gaps, hardcoded security credentials, console.log sprawl throughout production code, and committed coverage artifacts. These issues collectively impact maintainability, bundle size, type safety, internationalization completeness, and overall reliability. This spec defines a phased remediation plan to stabilize the codebase.

## What Changes

### Critical
- Fix 16+ broken import paths across core services, hooks, i18n, modules, and components
- Fix 35 React Hook rule violations (conditional hook calls, missing/excessive dependencies)
- Remove approximately 2,000 unused imports and variables
- Complete Kinyarwanda (rw) and Swahili (sw) translation coverage across all active namespaces

### High
- Consolidate three config systems (`src/config/`, `src/core/config/`, `src/services/database/`) into a single source of truth at `src/config/`
- Clean up data layer: identify and remove or deprecate unused providers (PouchDB, LiveStore, ERPNext), consolidate duplicate service files
- Resolve dual test runner conflict: standardize on Vitest, remove or fix `jest.config.js` (fix `moduleNameMapping` typo)

### Medium
- Enforce TypeScript strictness: enable `noUnusedLocals` and `noUnusedParameters`
- Remediate security exposures: move hardcoded Bugsink DSN to environment variable only
- Replace `console.log`/`console.error` in production code with the `logger` utility

### Low
- Remove `coverage/` directory from version control, add to `.gitignore`
- Audit and clean up barrel exports in index.ts files

## Impact
- Affected specs: All 19 modules (administration, academics, finance, reports, inventory, settings, HR, transport, library, health, alumni, applications, procurement, payroll, communications, school operations, configuration, security, system management)
- Affected code: Approximately 80-100 files spanning core services, hooks, components, i18n namespaces, module definitions, database providers, configuration files, test configuration, and TypeScript configuration

---

## ADDED Requirements

### Requirement: Fix Broken Imports
The system SHALL have all import paths resolve to existing files with correct exports.

#### Scenario: i18n locale imports resolve correctly
- **WHEN** `src/i18n/loader.ts` initializes locale namespaces
- **THEN** all referenced locale file paths exist on disk and export valid translation objects
- **AND** no namespace references point to missing or moved files

#### Scenario: Core utility imports resolve correctly
- **WHEN** `src/hooks/useUnifiedConfig.ts` imports `@/utils/dataModeManager`
- **THEN** the resolved path points to an existing module with valid exports
- **AND** the import compiles without TypeScript error

#### Scenario: Component imports resolve correctly
- **WHEN** `MarketplaceDiscovery.tsx` imports plugin marketplace service
- **AND** `DatabaseMonitoringDashboard.tsx` imports database performance hook
- **AND** `LanguageSwitcher.tsx` imports dropdown-menu component
- **AND** `PerformanceDashboard.tsx` imports AcademicCharts
- **AND** `ClassesPage.tsx` imports `@/types/database` and `@/types/actions`
- **THEN** all resolved paths exist and exports match expected types

#### Scenario: Service imports resolve correctly
- **WHEN** `LiveStoreProvider.tsx` imports `./schema`
- **AND** `coreServices.ts` imports `moduleRegistry`
- **AND** data migration script imports transport module
- **AND** inventory hooks and components import reorder monitoring service
- **THEN** all resolved paths exist and exports match expected types

### Requirement: React Hook Rules Compliance
The system SHALL comply with the Rules of Hooks across all production code.

#### Scenario: No conditional hook calls
- **WHEN** `renderMonitor.ts` and `renderLoopPrevention.ts` execute
- **THEN** all `useRef`, `useEffect`, `useCallback`, `useMemo` calls are unconditional (not inside if/else/loops/early returns)

#### Scenario: Correct dependency arrays
- **WHEN** a `useEffect`, `useCallback`, or `useMemo` hook is called
- **THEN** its dependency array includes all reactive values referenced inside the callback
- **AND** no dependencies listed are unused within the callback
- **AND** the react-hooks/exhaustive-deps ESLint rule passes for all fixed files

### Requirement: Remove Unused Imports and Variables
The system SHALL eliminate unused imports and variables from production code to reduce bundle size and improve maintainability.

#### Scenario: Unused import removal
- **WHEN** ESLint `no-unused-vars` rule is run against all production source files
- **THEN** zero unused import warnings are reported (or an explicitly documented acceptable minimum)
- **AND** the TypeScript compiler with `noUnusedLocals` enabled produces zero errors

### Requirement: Complete Translation Coverage
The system SHALL provide complete translation coverage for all active namespaces across all 4 supported languages.

#### Scenario: All locale namespaces exist
- **WHEN** the i18n loader initializes namespaces for en, fr, rw, sw
- **THEN** each referenced namespace file exists at the expected path for all 4 languages
- **AND** no namespace has missing or incomplete entries

#### Scenario: Fallback behavior
- **WHEN** a translation key is missing for a given locale
- **THEN** the system falls back to the English (en) translation for that key
- **AND** if the English key is also missing, falls back to displaying the key name

### Requirement: Config System Consolidation
The system SHALL have a single source of truth for configuration, eliminating fragmentation across three coexisting config directories.

#### Scenario: Single config entry point
- **WHEN** any module or service needs configuration
- **THEN** it imports from `src/config/` exclusively
- **AND** `src/core/config/` is either removed or contains only a re-export shim pointing to `src/config/`

#### Scenario: No duplicate config definitions
- **WHEN** a configuration value (feature flag, setting, environment matrix entry) is defined
- **THEN** it exists in exactly one location, not duplicated across config directories

### Requirement: Data Layer Provider Rationalization
The system SHALL remove or clearly deprecate unused database providers to reduce maintenance burden and code complexity.

#### Scenario: Unused providers removed
- **WHEN** the database provider abstraction layer is reviewed
- **THEN** unused providers (PouchDB, LiveStore, ERPNext) are either removed or explicitly marked as deprecated with documentation
- **AND** the provider selection logic is simplified to only include active providers

#### Scenario: Service file consolidation
- **WHEN** duplicate or legacy database service files exist
- **THEN** they are consolidated into a single canonical implementation
- **AND** all consumers reference the consolidated service

### Requirement: Single Test Runner
The system SHALL use a single test runner (Vitest) for all tests.

#### Scenario: Vitest is the default
- **WHEN** `npm test` is executed
- **THEN** Vitest runs, not Jest
- **AND** `jest.config.js` is either removed or confirmed as unused

#### Scenario: CI uses correct runner
- **WHEN** CI pipeline executes tests
- **THEN** all test scripts reference Vitest
- **AND** no scripts reference Jest

### Requirement: TypeScript Strictness Enforcement
The system SHALL enable stricter TypeScript compiler options to prevent type rot.

#### Scenario: Strict flags enabled
- **WHEN** TypeScript compilation runs
- **THEN** `noUnusedLocals` and `noUnusedParameters` are enabled in `tsconfig.json`
- **AND** compilation succeeds with zero errors under these new flags

### Requirement: Security Credential Remediation
The system SHALL not hardcode API keys, DSNs, or credentials in source code.

#### Scenario: No hardcoded credentials
- **WHEN** the source code is scanned for hardcoded credentials
- **THEN** no Bugsink DSN or similar credentials exist as string literals in production code
- **AND** all such values are read from environment variables at runtime
- **AND** no hardcoded fallback values exist

### Requirement: Replace Console Logging
The system SHALL use the project's `logger` utility for all production logging instead of `console.log`/`console.error`.

#### Scenario: No console.log in production code
- **WHEN** all production source files (excluding test files) are scanned
- **THEN** no `console.log`, `console.warn`, or `console.error` calls exist
- **AND** all logging uses `logger.info`, `logger.warn`, or `logger.error`

### Requirement: Remove Coverage Artifacts
The system SHALL not include code coverage reports in version control.

#### Scenario: Coverage directory untracked
- **WHEN** `git status` is run
- **THEN** the `coverage/` directory is listed in `.gitignore`
- **AND** no coverage files are tracked by git

### Requirement: Clean Barrel Exports
The system SHALL not export unused items from barrel (index.ts) files.

#### Scenario: Barrel exports are minimal
- **WHEN** each module's index.ts file is reviewed
- **THEN** it exports only items that are consumed by other modules
- **AND** unused or deprecated exports are removed or explicitly marked as deprecated

---

## MODIFIED Requirements

### Requirement: i18n Loader (Modified)
The existing `src/i18n/loader.ts` SHALL have its namespace file references validated and corrected so all referenced locale files exist on disk for all 4 languages.

### Requirement: ESLint Configuration (Modified)
If the project has an existing ESLint configuration, it SHALL be updated to include the `react-hooks/exhaustive-deps` rule and `no-unused-vars` with appropriate configurations to catch violations at lint time.

---

## REMOVED Requirements

*No existing requirements are removed in this spec.*
