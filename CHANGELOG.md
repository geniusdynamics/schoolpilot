# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [refactor-batch-2] - 2026-03-31

### Added

- **AppProviders Composition Layer** (`src/contexts/AppProviders.tsx`)
  - New composite provider component that orchestrates all application-level React contexts
  - Reduces nesting depth in App.tsx from 9 levels to 1
  - Establishes a stable provider contract for future refactoring
  - Exports: `AppProviders`, `AppProvidersProps`

- **Service Barrel Files**
  - `src/services/livestore/index.ts` - Public API for LiveStore integration
  - `src/services/sqlite/index.ts` - Public API for SQLite providers

- **ESLint Deep-Import Rule**
  - Added `no-restricted-imports` rule to warn on deep imports into service folders
  - Enforces usage of barrel files for service layer access
  - Covers: backend, data, database, dataGeneration, erpnext, livestore, sqlite, sync, tabs

### Changed

- **App.tsx** - Provider Composition
  - Replaced nested provider tree (9 levels deep) with `<AppProviders>` composition component
  - Removed local `DataProviderWrapper`, `AuthProvider`, `UserProvider`, `NetworkProvider`, `SyncProvider`, `StableActionProvider`, `HashRouter` imports
  - Imports now use centralized composition from `AppProviders`
  - Removed unused `uds` import

- **Context Exports** (`src/contexts/index.ts`)
  - Added `AppProviders` export for public API

### Architecture Decisions

- **ADR-001: Provider Composition Pattern**
  - Decision: Extract provider tree into a composite `AppProviders` component
  - Rationale: Reduces nesting complexity, establishes stable contract, enables testing in isolation
  - Consequences: All providers now wrapped in single component; consumers must use composition

- **ADR-002: Service Layer Barrel Boundaries**
  - Decision: All service folders must have index.ts barrel files; deep imports emit warnings
  - Rationale: Establishes stable public API contracts before physical directory reorg
  - Consequences: Gradual migration to barrel-only imports; warning period for existing deep imports

## [refactor-batch-1] - 2026-03-31

### Added

- **Config Runtime Extraction** (`src/config/databaseConfigRuntime.ts`, `src/config/environmentRuntime.ts`)
  - Extracted database runtime logic from unifiedConfig using strangler-fig pattern
  - Environment capability detection isolated from main config
  - Backward-compatible façade preserved

- **Parity Tests** (`src/config/__tests__/unifiedConfig.parity.test.ts`)
  - 3 tests proving façade returns identical values before/after extraction

### Changed

- **Feature Flags Runtime** (`src/config/featureFlags.ts`)
  - Added production-only guard for `window.featureFlags` exposure
  - Debug methods only available in development mode

### Architecture Decisions

- **ADR-000: Strangler-Fig Configuration Split**
  - Decision: Extract database and environment logic into separate modules while preserving unifiedConfig façade
  - Rationale: Incremental refactoring without breaking consumers
  - Consequences: Facade delegates to runtime modules; parity tests validate behavior

## [Previous Versions]

- See git history for complete changelog
