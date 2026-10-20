# Tasks: MVP UI/UX Enhancement

## Task Dependencies
- [P1.3] Fix AnalyticsHubPage depends on verifying analytics sub-page content exports exist
- [P3.1] Rename components depends on reading all 22+ hub page files
- [P2.1], [P2.3], [P2.5], [P1.4] depend on [P1.2] (shared HubTab type should be available, but can be done with local types temporarily)
- [P3.4] depends on [P1.2] (useHubNavigation hook)
- All Phase 1 tasks are independent of Phase 2/3 tasks

---

## Phase 1: MVP Foundation

- [x] Task 1: Extend FullWidthContext and create useContentWidth hook (P1.1)
  - `FullWidthContext` already exposed the derived `contentWidth` property
  - Created `src/hooks/useContentWidth.ts` returning `{ isFullWidth, widthClass, containerClass }`
  - Updated `src/components/layout/PageContainer.tsx` to consume `useContentWidth` internally
  - Fullwidth mode: `w-full` with no max-width constraint
  - Constrained mode: `max-w-7xl mx-auto` (existing behavior preserved)

- [x] Task 2: Migrate standalone pages from hardcoded max-w-7xl to PageContainer (P1.1)
  - `DashboardPage.tsx` — replaced `mx-auto max-w-7xl` with `<PageContainer>`
  - `PluginSettingsPage.tsx` — replaced `max-w-7xl mx-auto` with `<PageContainer>`
  - `UnifiedSettingsPage.tsx` — replaced `max-w-7xl mx-auto` with `<PageContainer>`

- [x] Task 3: Create shared HubTab types and useHubNavigation hook (P1.2)
  - Verified/updated `src/core/types/hub.ts` — `HubTab.component` changed to `React.ComponentType<{}>`
  - Created `src/hooks/useHubNavigation.ts` — URL-driven, handles tab validation, default cleanup

- [x] Task 4: Refactor SchoolOrganizationPage as pilot for shared hook (P1.2)
  - Replaced ~35 lines of boilerplate with shared types + hook
  - Removed local `HubTab` interface, inline `handleTabChange`, manual state management

- [x] Task 5: Fix AnalyticsHubPage wrong content imports (P1.3) — CRITICAL BUG
  - Replaced 5 wrong imports with correct analytics-specific content components
  - Added `*Content` exports to all 5 analytics sub-pages
  - Updated tab-to-component mapping in the hub

- [x] Task 6: Complete StudentReportsHubPage — add 3 missing tabs (P1.4)
  - **Already complete** — all 6 tabs already present (financial-summary, votehead-statement, exam-results)
  - Content exports verified existing
  - Route already registered in `reports/moduleDefinition.tsx`

- [x] Task 7: Add keyboard accessibility to PageHeaderWithTabs (P1.5)
  - **Already implemented** — `role="tablist"`, ARIA attributes, `onKeyDown` for ArrowLeft/ArrowRight all present

## Phase 2: Feature Integration

- [x] Task 8: Integrate TransferredStudentsPage into StudentDirectoryPage hub (P2.1)
  - Added "transferred" tab to `StudentDirectoryPage` rendering `TransferredStudentsContent`
  - Deprecated standalone route in `administration/moduleDefinition.tsx` with redirect

- [x] Task 9: Register DatabaseBackupPage in settings navigation (P2.2)
  - Added deprecated navigation entry in `settings/moduleDefinition.tsx` redirecting to system hub
  - `SystemManagementPage` already had the "backup" tab with `DatabaseBackupContent`

- [x] Task 10: Integrate SMSCategoriesPage into CommunicationPage hub (P2.3)
  - **Already complete** — "sms-categories" tab already present in `CommunicationPage`
  - `SMSCategoriesContent` export already exists

- [x] Task 11: Replace Alumni Management placeholder tabs with real content (P2.5)
  - Replaced `AlumniEngagementContent` with real DataGrid-based engagement activity list
  - Replaced `AlumniEventsContent` with real DataGrid-based events list
  - Both use mock data consistent with existing patterns

- [x] Task 12: Integrate BulkStreamCreationPage into ClassesPage (P2.4)
  - Converted `ClassesPage` to hub page with "classes" and "bulk-streams" tabs
  - Deprecated standalone `BulkStreamCreationPage` route with redirect

## Phase 3: UI Polish

- [x] Task 13: Rename internal component names — administration hubs (P3.1)
  - Renamed 5 files: `StudentLifeHubPage`, `StudentAttendanceHubPage`, `CommunicationHubPage`, `SecurityHubPage` (SchoolOrganization already done)
  - Fixed 2 stale `export default` references (CommunicationPage, StudentAttendancePage)

- [x] Task 14: Rename internal component names — academics hubs (P3.1)
  - All 7 already had correct `*Page` naming — no changes needed

- [x] Task 15: Rename internal component names — finance + other hubs (P3.1)
  - Renamed 3 remaining: `PaymentsHubPage`, `TransportHubPage`, `ExpensesHubPage`
  - Renamed 1: `PayrollHubPageContent` in HR module
  - All others were already correct

- [x] Task 16: Fix academics route path mismatches (P3.2)
  - `moduleDefinition.tsx` and `redirectMap.ts` already had correct paths
  - Fixed 4 hardcoded `navigate()` calls in individual page files

- [x] Task 17: Create central module color scheme map (P3.3)
  - Created `src/components/ui/hubColorSchemes.ts` with 11 module-to-scheme mappings + helper

- [x] Task 18: Add tab state persistence to useHubNavigation (P3.4)
  - Added optional `persistKey` to `HubConfig`
  - Updated `useHubNavigation` with localStorage save/restore (priority: URL > localStorage > defaultTab)

## Verification

- [x] Task 19: Verify all changes compile and TypeScript passes
  - `npx tsc --noEmit` — all errors from our modified files are resolved
  - Remaining errors are pre-existing in demo files, test files, and unrelated modules
