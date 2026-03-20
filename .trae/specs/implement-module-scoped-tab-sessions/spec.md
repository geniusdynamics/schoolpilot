# Module-Scoped Tab Session Behavior Spec

## Why
Current navigation behavior is inconsistent with the expected tab workflow: submenu navigation often stays in one tab, and switching modules can bounce to dashboard instead of resetting into a new module session. This creates confusion and breaks operator flow.

## What Changes
- Implement module-scoped tab sessions in the URL-driven tab system.
- Ensure each submenu navigation within the same module opens or activates a tab for that submenu route.
- Ensure switching to a different module clears previous module tabs and starts a fresh tab session in the target module.
- Prevent fallback-to-dashboard during valid module navigation by resolving a valid module landing route deterministically.
- Align primary sidebar, secondary sidebar, and settings-cog navigation to the same module/tab policy.

## Impact
- Affected specs: navigation behavior, tab lifecycle behavior, module switching behavior, layout UX consistency.
- Affected code: `LayoutNew.tsx`, `PrimarySidebar.tsx`, `SecondarySidebar.tsx`, `SettingsPopup.tsx`, tab hooks/services (`useTabs`, URL sync/derivation), related navigation tests.

## ADDED Requirements
### Requirement: Module-Scoped Tab Session Policy
The system SHALL manage tabs as module-scoped sessions.

#### Scenario: Open submenu within same module
- **WHEN** a user is in module `M` and clicks a submenu page of module `M`
- **THEN** the system opens a new tab for that submenu route (or activates existing matching tab)
- **AND** existing tabs from module `M` remain available.

#### Scenario: Switch to another module
- **WHEN** a user switches from module `M1` to module `M2`
- **THEN** the system closes/clears open tabs belonging to `M1`
- **AND** starts a fresh tab session for `M2` by opening a valid landing tab in `M2`.

#### Scenario: First tab in new module
- **WHEN** a new module session starts
- **THEN** the first tab is a valid module route (preferred module dashboard, else first accessible child route, else deterministic module fallback).

### Requirement: Deterministic Route Resolution on Module Click
The system SHALL resolve module navigation targets deterministically and avoid invalid base paths.

#### Scenario: Module dashboard exists
- **WHEN** user clicks a module that has a dashboard route
- **THEN** route resolver selects that dashboard route as first landing tab.

#### Scenario: Module dashboard missing
- **WHEN** user clicks a module with no dashboard route
- **THEN** route resolver selects the first accessible child route
- **AND** does not redirect to global dashboard unless no module route is valid.

## MODIFIED Requirements
### Requirement: Sidebar and Settings Navigation Integration
Sidebar and settings navigation SHALL follow the same URL-driven tab/session policy.

#### Scenario: Secondary submenu click
- **WHEN** user clicks a secondary submenu item
- **THEN** navigation opens/activates a tab according to module-scoped tab policy
- **AND** does not silently reuse unrelated active tab content.

#### Scenario: Settings cog menu click
- **WHEN** user clicks a settings entry from the settings cog
- **THEN** navigation opens/activates the target settings page tab under the current module session policy.

### Requirement: Navigation Feedback Semantics
User notifications SHALL reflect actual navigation outcome.

#### Scenario: Successful module navigation
- **WHEN** route resolution and tab activation succeed
- **THEN** success feedback may be shown.

#### Scenario: Failed or fallback navigation
- **WHEN** route resolution fails or fallback is applied
- **THEN** warning/error feedback is shown
- **AND** false “loaded” success messages are not shown.

## REMOVED Requirements
### Requirement: Implicit Cross-Module Tab Persistence
**Reason**: Persisting tabs across module switches conflicts with required module-scoped sessions and causes stale-context behavior.
**Migration**: On first module switch after rollout, perform tab-state normalization by retaining only target-module tabs (or creating target-module landing tab).
