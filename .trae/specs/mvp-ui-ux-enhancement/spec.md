# MVP UI/UX Enhancement Spec

## Why
SchoolPilot3 has 19 modules and 34+ hub pages covering almost all features visible in the 27 reference screenshots from the `eilikima, schoolpilot` system, but critical navigation architecture inconsistencies prevent the UI from delivering a coherent experience for both standard users and power users. The dual `fullwidth` vs `standard` mode system lacks a shared content-width protocol, orphaned standalone pages are not integrated into the hub-and-spoke architecture, placeholder content exists in key hubs, and tab navigation lacks keyboard accessibility. Resolving these gaps is the prerequisite for end-to-end usability testing toward MVP readiness.

## What Changes

### Architecture Layer
- **P1.1** Extend `FullWidthContext` with a derived `contentWidth` state string and expose `useContentWidth` hook so ALL page content components can respond to fullwidth state
- **P1.1** Update `PageContainer` to consume `useContentWidth` internally — when fullwidth, remove `max-w-7xl` constraint
- **P1.1** Migrate 3 standalone pages (DashboardPage, PluginSettingsPage, UnifiedSettingsPage) from hardcoded `max-w-7xl` to `PageContainer`
- **P1.2** Create shared `HubTab` / `HubConfig` types in `src/core/types/hub.ts` (single source of truth)
- **P1.2** Create `useHubNavigation` hook eliminating ~50 lines of boilerplate per hub page (URL sync, tab validation, default fallback)
- **P1.2** Refactor `SchoolOrganizationPage` as pilot to prove the shared hook pattern

### Bug Fixes
- **P1.3** Fix `AnalyticsHubPage` — replace 5 wrong content imports (generic reports) with correct analytics-specific content components
- **P1.4** Complete `StudentReportsHubPage` — add 3 missing tabs (Financial Summary, Votehead Statement, Exam Results Horizontal)

### Accessibility
- **P1.5** Add keyboard accessibility to `PageHeaderWithTabs` (ARIA roles, arrow key navigation, focus management)

### Feature Integration
- **P2.1** Integrate `TransferredStudentsPage` into `StudentDirectoryPage` hub as a "transferred" tab
- **P2.2** Register existing `DatabaseBackupPage` in settings `SystemManagementPage` hub as a tab
- **P2.3** Integrate `SMSCategoriesPage` into `CommunicationPage` hub as an "sms-categories" tab
- **P2.5** Replace 2 placeholder tabs (Engagement, Events) in `AlumniManagementPage` with real data-backed content
- **P2.4** Integrate `BulkStreamCreationPage` into `ClassesPage` or document approach

### UI Polish
- **P3.1** Rename 22+ hub page internal component names from `*HubPage` to `*Page`
- **P3.2** Fix 4 academics route path mismatches
- **P3.3** Create central module color scheme map in `hubColorSchemes.ts`
- **P3.4** Add optional tab state persistence via `persistKey` param on `useHubNavigation`

## Impact
- Affected specs: Layout system (FullWidthContext), Hub page architecture (34+ pages), Module definitions (settings, reports, administration, academics, inventory), Navigation routing (redirectMap.ts)
- Affected code: ~50 files spanning contexts, hooks, components, module definitions, pages, barrel exports, and routing

---

## ADDED Requirements

### Requirement: Fullwidth Content Protocol
The system SHALL provide a mechanism for page content components to receive and respond to fullwidth mode state.

#### Scenario: Fullwidth toggle propagates to page content
- **WHEN** user toggles fullwidth mode via the overflow menu
- **THEN** the `FullWidthContext` updates its `contentWidth` derived state to `'full'`
- **AND** any component using `useContentWidth()` or `PageContainer` receives the updated state
- **AND** page content expands to fill the reclaimed sidebar space (no `max-w-7xl` constraint)

#### Scenario: Standard mode constrains page content
- **WHEN** fullwidth mode is disabled
- **THEN** `contentWidth` is `'constrained'`
- **AND** `PageContainer` applies `max-w-7xl` centered layout

### Requirement: Shared Hub Navigation Infrastructure
The system SHALL eliminate duplicated HubTab interface definitions and tab state management boilerplate across all hub pages.

#### Scenario: Hub renders with shared types and hook
- **WHEN** a hub page uses `useHubNavigation` with a `HubConfig`
- **THEN** the hook reads the active tab from URL `?tab=` search param
- **AND** provides `activeTab`, `activeTabComponent`, and `handleTabChange`
- **AND** if `?tab=` has an invalid ID, silently falls back to `defaultTab`
- **AND** on tab change, updates the URL search params

#### Scenario: Tab URL sync works
- **WHEN** user clicks a tab in a hub page
- **THEN** the URL updates to `?tab=<tab-id>`
- **AND** if the clicked tab is the default tab, the URL is cleaned (no `?tab=` param)
- **AND** direct navigation to `/?tab=valid-tab` renders that tab

### Requirement: Keyboard Accessible Tab Navigation
The system SHALL provide keyboard-navigable tab interfaces across all hub pages.

#### Scenario: Keyboard tab switching
- **WHEN** a tab button is focused
- **AND** user presses ArrowRight
- **THEN** the next tab becomes active
- **AND** focus moves to the newly active tab button

#### Scenario: ARIA compliance
- **WHEN** tabs are rendered
- **THEN** the tab container has `role="tablist"`
- **AND** each tab button has `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex`
- **AND** active/inactive states are announced by screen readers

### Requirement: Feature Integration into Hub Architecture
The system SHALL integrate orphaned standalone pages into the appropriate hub pages.

#### Scenario: Transferred students accessible from student directory hub
- **WHEN** user navigates to `/administration/transferred-students`
- **THEN** they are redirected to `/administration/students?tab=transferred`
- **AND** the transferred students list renders inside the StudentDirectoryPage hub

#### Scenario: Database backup accessible from settings
- **WHEN** user opens settings system management hub
- **THEN** a "Database Backup" tab is available
- **AND** it renders the full backup/restore UI

#### Scenario: Category-based SMS from communication hub
- **WHEN** user opens the communication hub
- **THEN** an "SMS Categories" tab is available
- **AND** it renders the category-based SMS sending UI

### Requirement: Complete Hub Tab Content
The system SHALL render real data content for all tabs in hub pages, with no placeholder "Coming Soon" content.

#### Scenario: Alumni Engagement tab has real content
- **WHEN** user opens the alumni management hub and clicks the "Engagement" tab
- **THEN** they see a list of alumni engagement activities (donations, event participation, mentorship)

#### Scenario: Student Reports hub has all 6 tabs
- **WHEN** user opens `/reports/student-reports`
- **THEN** all 6 tabs are present: Academic Summary, Bill Summary, Fee Payments, Financial Summary, Votehead Statement, Exam Results Horizontal
- **AND** each tab renders valid report content

### Requirement: Analytics Hub Shows Correct Content
The system SHALL render analytics-specific content for each tab in the Analytics hub.

#### Scenario: Analytics tabs render correct pages
- **WHEN** user navigates to `/reports/analytics`
- **THEN** the teacher-dashboard tab shows `AnalyticsTeacherDashboardPageContent`
- **AND** subject-analysis tab shows `AnalyticsSubjectPageContent`
- **AND** class-analysis tab shows `AnalyticsClassPageContent`
- **AND** exports tab shows `AnalyticsExportPageContent`
- **AND** trends tab shows `AnalyticsTrendsPageContent`

---

## MODIFIED Requirements

### Requirement: FullWidthContext (Modified)
The existing `FullWidthContext` SHALL be extended to expose:
- `contentWidth: 'full' | 'constrained'` — derived state based on `isFullWidth`

### Requirement: PageContainer (Modified)
The existing `PageContainer` component SHALL be updated to:
- Internally consume `useContentWidth()` hook
- When `contentWidth === 'full'`: render with `w-full`, no max-width constraint
- When `contentWidth === 'constrained'`: render with `max-w-7xl mx-auto` (existing behavior)

### Requirement: AnalyticsHubPage (Modified)
The existing `AnalyticsHubPage` at `src/modules/reports/pages/AnalyticsHubPage.tsx` SHALL have its 5 content imports replaced from generic report components to analytics-specific components as specified in P1.3.

### Requirement: StudentReportsHubPage (Modified)
The existing `StudentReportsHubPage` SHALL be extended from 3 tabs to 6 tabs by adding Financial Summary, Votehead Statement, and Exam Results Horizontal tabs.

### Requirement: Module Definitions (Modified)
The following module definitions SHALL be updated:
- `administration/moduleDefinition.tsx`: Deprecate standalone `TransferredStudentsPage` route, add redirect to hub tab
- `settings/moduleDefinition.tsx`: Add navigation entry for `DatabaseBackupPage` or deprecated redirect
- `reports/moduleDefinition.tsx`: Add missing `/reports/student-reports` route entry
- `academics/moduleDefinition.tsx`: Fix 4 route paths

### Requirement: Page Naming Consistency (Modified)
All hub pages currently using `*HubPage` as their internal React component name SHALL be renamed to `*Page` to match their file and export names. File names SHALL NOT be changed.

---

## REMOVED Requirements
*No requirements are removed in this spec.*
