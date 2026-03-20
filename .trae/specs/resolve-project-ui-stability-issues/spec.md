# Project Stability and UI Consistency Recovery Spec

## Why
The project currently has systemic instability that is producing widespread UI defects. Build and test pipelines are failing, routing ownership is duplicated, parallel layout/tab implementations are active, and the styling stack is fragmented. These conditions make defects frequent, hard to reproduce, and expensive to fix.

## What Changes
- Establish a stabilization baseline that must pass before any new feature work.
- Consolidate routing, startup navigation, and tab/session behavior into single authorities.
- Unify the UI system around canonical primitives and a single theming strategy.
- Remove duplicate or legacy implementations that cause drift.
- Introduce enforceable quality gates in CI and release workflows.

## Impact
- Affected specs: application stability, navigation determinism, UI consistency, release reliability.
- Affected code: app shell and routing, layout and sidebar systems, tab services/hooks, UI primitive layers, build/test/tooling configuration, selected high-traffic module pages.

## ADDED Requirements
### Requirement: Stabilization Baseline Gate
The system SHALL meet a mandatory baseline gate before further feature delivery.

#### Scenario: Baseline verification run
- **WHEN** a pull request is opened against mainline
- **THEN** typecheck, lint, tests, and production build must run
- **AND** merging is blocked if any baseline check fails.

#### Scenario: Broken baseline
- **WHEN** baseline checks fail on mainline
- **THEN** feature development pauses for remediation
- **AND** only stabilization changes are permitted until baseline returns to green.

### Requirement: Single Route Authority
The system SHALL define routes from one canonical source and prevent duplicate path ownership.

#### Scenario: Route registration
- **WHEN** a route path is introduced
- **THEN** it is declared in the canonical route authority
- **AND** duplicate declarations in secondary generators are rejected.

#### Scenario: Route resolution
- **WHEN** users navigate to an existing path
- **THEN** exactly one route owner resolves that path
- **AND** no shadowing or ambiguous fallback occurs.

### Requirement: Deterministic Startup Navigation
The system SHALL have one startup navigation policy.

#### Scenario: App start and restore
- **WHEN** the app initializes for an authenticated user
- **THEN** startup navigation is resolved by one policy owner
- **AND** competing redirects from shell, restore hooks, or route guards do not conflict.

### Requirement: Single Tab Session Model
The system SHALL use one tab/session model for all tabbed workspace behavior.

#### Scenario: Tab state synchronization
- **WHEN** tab state changes through user interaction
- **THEN** URL, rendered view, and in-memory tab state remain synchronized
- **AND** parallel tab engines do not produce divergent session state.

### Requirement: Canonical UI Primitive Layer
The system SHALL enforce one canonical primitive set for shared UI components.

#### Scenario: Feature page composition
- **WHEN** a feature page uses buttons, inputs, dialogs, tables, alerts, and toasts
- **THEN** components are sourced from canonical primitives
- **AND** ad-hoc parallel component systems are disallowed for new changes.

#### Scenario: Styling consistency
- **WHEN** a page is rendered in supported themes
- **THEN** spacing, typography, and interaction states follow the shared token policy
- **AND** visual behavior remains consistent across modules.

### Requirement: Release Rollback Safety
The system SHALL define operational rollback criteria and procedures for migration waves.

#### Scenario: Regression trigger
- **WHEN** error rate, startup failure rate, or data integrity checks exceed thresholds
- **THEN** release is rolled back through the defined playbook
- **AND** last verified backup/state is restored and validated.

## MODIFIED Requirements
### Requirement: Layout Selection Policy
Layout selection SHALL transition from feature-flagged dual runtime to a single production layout.

#### Scenario: Production layout
- **WHEN** the stabilization milestone is achieved
- **THEN** one layout implementation is designated production
- **AND** alternate layout remains disabled or removed from runtime path.

### Requirement: Tooling and Test Runner Policy
Tooling SHALL transition from mixed runners and partial scripts to one enforced quality workflow.

#### Scenario: Quality workflow execution
- **WHEN** local or CI validation is executed
- **THEN** one documented command set runs mandatory checks
- **AND** undocumented bypasses or missing scripts are treated as policy violations.

## REMOVED Requirements
### Requirement: Parallel Legacy Runtime Paths
**Reason**: Parallel runtime paths (routing, layout, tab behavior, and component variants) cause nondeterminism and UI drift.
**Migration**: Retire legacy runtime paths in phases after parity validation and stable rollout gates are met.
