# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - not released

This is the 1.0 release candidate entry, not an announcement. The release gate, upgrade notes,
known issues and the proposed stable/LTS policy are in [`docs/releases/1.0.md`](docs/releases/1.0.md).
The entry becomes `1.0.0` with a date when the E04 pilot sign-offs and the owner's tag decision are
complete.

### Added

- Multi-curriculum academic core: academic years and periods, levels, class groups, subjects,
  timetable, teaching groups, enrolment.
- Learner, guardian, staff and identifier records, with the consent fields the schema records.
- Attendance registers and marks, leave-outs, conduct and health records.
- Finance: fee structures, billing runs, invoices, payments and receipts, allocation, statements,
  credit notes, the ledger and its reports, and accounting exports.
- Assessment: grading schemes, marks entry, report cards, published reports and promotion runs.
- Guardian/learner portal: balances, pay-link seam, published reports, attendance, notices and
  consent.
- Curriculum, country and payroll packs with a schema and a vector runner. The shipped packs are
  drafts; each `pack.json` lists the unverified items.
- KEMIS/KNEC registration exports, messaging providers behind an outbox, and accounting journal
  exports for QuickBooks, Xero, Odoo and ERPNext.
- Plug-in SDK and manifest, with compatibility and permission contracts. The host does not load
  third-party plug-ins yet.
- Role, administrator, deployment, pack-authoring, SDK and data-protection guides, with walkthrough
  scripts.
- Apache-2.0 code licence, CC-BY-4.0 pack-data licence, `NOTICE`, `CONTRIBUTING`,
  `CODE_OF_CONDUCT`, `SECURITY` and the RFC process.

### Changed

- Receipts from the Student Payments dialog and the cashier now share the year-scoped
  `RCT/YYYY/NNNNNN` sequence; the dialog no longer counts existing receipt numbers.
- The admissions and finance sidebar labels that rendered as translation keys now have English
  labels, with draft translations for sw/fr/pt/ar/rw.
- Backup **Download** writes the stored backup payload as a JSON file.
- The Attendance **View** tab reads saved registers instead of showing a placeholder.
- The hub guide states that the hub serves the API and health/discovery endpoints, not the browser
  application.

### Fixed

- The attendance view, backup download and receipt-series defects recorded by P6-D01.
- The settings user edit form no longer resets on every keystroke.

### Security

- Secret and dependency scans run in the task gate; the dependency advisory baseline is a ratchet.
- The security policy and the vulnerability-reporting route are published.

### Known issues

- Every curriculum pack is `verification: draft`; translations and payroll statutory data have not
  had native-speaker/accountant review.
- A guardian-only login cannot reach module routes; the portal is tested by linking a staff login to
  a guardian.
- No payment provider is configured; the fees page shows that state.
- The plug-in SDK is not wired into the host.
- The hub does not serve the browser app.
- Portal Lighthouse/3G/low-end-device performance and the Raspberry Pi installer are unmeasured.
- E04 pilot sign-offs and the E05 tag remain outstanding.

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
