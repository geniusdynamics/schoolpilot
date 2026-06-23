# SchoolPilot3 MVP UI/UX Technical Specification

**Version:** 1.0  
**Date:** 2026-06-20  
**Author:** AI Analysis from Screenshot Audit + Codebase Survey  
**Status:** Draft for Review  

---

## Table of Contents

1. Executive Summary
2. Methodology & Sources
3. Current State Architecture
4. Root Cause Analysis: Dual Navigation System
5. Gap Analysis: Screenshot-to-Codebase Mapping
6. MVP-Focused Action Items
7. Success Metrics
8. Implementation Roadmap
9. Appendix: File Inventory

---

## 1. Executive Summary

This specification codifies the findings from a comprehensive audit of 27 reference UI screenshots from the `eilikima, schoolpilot` system, cross-referenced against the SchoolPilot3 codebase (19 modules, ~34 hub pages, 70+ administration pages, 44 finance pages). Two prior improvement plans were reviewed for alignment.

**Key Finding:** SchoolPilot3 has already implemented the majority of features visible in the reference screenshots, but critical **navigation architecture inconsistencies** — specifically the dual `fullwidth` vs `standard` mode system — prevent the UI from delivering a coherent experience for both standard users and power users. Content pages, hub pages, and the fullwidth toggle operate independently with no shared content-width protocol, resulting in inconsistent page rendering.

**MVP Target:** Resolve the navigation architecture gap, integrate orphaned standalone pages into the hub-and-spoke system, and complete placeholder content in existing hubs — enabling end-to-end usability testing across all 19 modules.

---

## 2. Methodology & Sources

### 2.1 Screenshot Analysis
- **Location:** `C:\Users\Oneito\OneDrive\Pictures\Screenshots\eilikima, schoolpilot`
- **Count:** 27 screenshots (dated 2026-05-21)
- **Coverage:** Student management, academic analysis, finance, transport, staff, system settings, communications, user profiles

### 2.2 Codebase Survey
- **Root:** `d:\DevCenter\abuilds\EduGen\old_system\schoolpilot3`
- **Key Files Examined:**
  - `src/contexts/FullWidthContext.tsx` — Fullwidth state management
  - `src/components/Layout.tsx`, `src/components/LayoutNew.tsx` — Main layout shells
  - `src/components/ui/PageHeaderWithTabs.tsx` — Hub page tab component
  - `src/components/layout/PageContainer.tsx` — Content width constraint
  - `src/components/layout/PageHeader.tsx` — Standard page header
  - `src/routing/moduleRoutes.tsx`, `src/routing/pageLoader.tsx` — Route resolution
  - 14 module definition files (`moduleDefinition.tsx` across modules)
  - 34+ hub page files across administration, academics, finance, settings, reports
  - Barrel exports (`pages/index.ts`) for all modules
  - Individual content pages (StudentsListPage, AlumniManagementPage, etc.)

### 2.3 Reference Documents
- `schoolpilot-improvement-plan-from-eilikima-screenshots-20260605.md` — Initial screenshot gap analysis
- `hub-pages-improvement-plan.md` — Hub page naming/routing audit (re-audited 2026-06-07)

---

## 3. Current State Architecture

### 3.1 Layout Layer

```
FullWidthContext (localStorage: 'schoolpilot-fullwidth-mode')
  └─ Controls: isFullWidth boolean
     ├─ PrimarySidebar: collapsed (w-0) when fullwidth, w-16/20 when standard
     ├─ SecondarySidebar: slides to left-0 when fullwidth (acts as primary)
     └─ Main content marginLeft: calc(5rem + 14rem) standard → 0/14rem fullwidth
```

**Critical Gap:** The `FullWidthContext` ONLY controls sidebar visibility. It does NOT:
- Pass `isFullWidth` state to page content components
- Adjust content max-width constraints
- Provide a page-level hook for components to respond to width changes
- Coordinate with `PageContainer` component (which exists but is used by only 1 page)

### 3.2 Page Rendering Patterns

| Pattern | Components | Width Approach | Fullwidth Aware? |
|---------|-----------|----------------|------------------|
| **Hub pages** (PageHeaderWithTabs) | 34+ pages across modules | `<div className="space-y-4">` — no max-width | No — expands naturally but by accident |
| **Standalone deprecated pages** | SchoolConfigurationPage, etc. | Various wrappers | Show only in fullwidth mode via `showInModes: ['fullwidth']` |
| **Standalone active pages** | DashboardPage, PluginSettingsPage, etc. | `max-w-7xl mx-auto` | No — does NOT expand in fullwidth |
| **PageContainer wrapper** | Only ReorderAlertsPage uses it | `max-w-7xl` default | No |

### 3.3 Navigation Mode System

Each navigation item in `moduleDefinition.tsx` has a `showInModes` property:

- `['standard', 'fullwidth']` — Hub pages: visible in both modes (the new standard)
- `['fullwidth']` — Deprecated standalone pages: only visible when fullwidth is enabled, with `redirectTo` pointing to a hub+tab URL
- Some standalone pages (ApplicationsPage, ClassesPage, PreNAsMarksPage, DisciplinaryCasesPage, VisitorsManagementPage, AlumniManagementPage, TransferredStudentsPage) still use `['standard', 'fullwidth']` — they have NOT been integrated into hubs.

### 3.4 Hub Page Pattern (Current)

Every hub page follows this exact structure (~50 lines of boilerplate each):

```tsx
// 1. Define local HubTab interface (duplicated ~34 times)
interface HubTab { id: string; label: string; icon: ReactNode; component: ReactNode; }

// 2. Import *Content components from legacy pages
import { DepartmentsContent } from './DepartmentsPage';

// 3. Manual tab array
const tabs: HubTab[] = [...];

// 4. Manual URL search param state management
const [searchParams, setSearchParams] = useSearchParams();
const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'default');

// 5. Manual handleTabChange with URL sync
const handleTabChange = useCallback((tabId) => { ... }, []);

// 6. Manual active tab resolution
const activeTabData = tabs.find(...) || tabs[0];

// 7. Render: div.space-y-4 > PageHeaderWithTabs + div.mt-4 > component
```

---

## 4. Root Cause Analysis: Dual Navigation System

### 4.1 The Problem

The system maintains TWO navigation experiences that coexist but lack a coherent design:

1. **Standard Mode:** Primary sidebar (module icons) + Secondary sidebar (navigation items) + Content area (max-w-7xl constrained for standalone pages, unconstrained for hub pages)
2. **Fullwidth Mode:** Primary sidebar collapses, Secondary sidebar slides to far left, Content area expands — but pages don't know they should use the extra space.

### 4.2 Inconsistency Matrix

| Scenario | Page Type | Standard Mode | Fullwidth Mode | Problem |
|----------|-----------|---------------|----------------|---------|
| A | Hub page (e.g., StudentDirectoryPage) | `space-y-4`, fills available width | Same — fills wider available width | Works but no explicit design for fullwidth |
| B | Standalone page (e.g., DashboardPage) | `max-w-7xl`, centered | Same `max-w-7xl` — doesn't expand | **Does NOT use reclaimed space** |
| C | Deprecated page (e.g., DepartmentsPage) | Hidden (only fullwidth) | Rendered inline via hub tab | No standalone fullwidth experience |
| D | Content component (e.g., DepartmentsContent) | Rendered inside hub tab | Rendered inside hub tab | Works, inherits hub's unconstrained width |

### 4.3 Root Causes

1. **No `isFullwidth` prop propagation** — Layout never tells page content about fullwidth state
2. **No uniform width protocol** — Pages choose their own width strategy (max-w-7xl vs unconstrained)
3. **PageContainer orphaned** — Exists as a component but not adopted by any hub page
4. **Hub pages don't use PageContainer** — They use bare `<div className="space-y-4">`
5. **Content pages wrapped inconsistently** — Some have `max-w-7xl`, some don't

---

## 5. Gap Analysis: Screenshot-to-Codebase Mapping

### 5.1 Features Already Implemented (No Action Needed)

| Screenshot | Feature | Codebase Location | Status |
|-----------|---------|-------------------|--------|
| studentlisting.jpg | Student listing with filters | `StudentsListPage` + `StudentDirectoryPage` hub | Complete |
| class-lists.jpg | Class lists | `ClassesPage` | Complete |
| staff-listing.jpg | Staff listing | `StaffListPage` + `StaffDirectoryPage` hub | Complete |
| balance-by-class.jpg | Fee balance per class | Finance hub pages | Complete |
| Purchase-order-list.jpg | PO list | `PurchaseOrdersPage` | Complete |
| Purchase-order.jpg | PO detail | Purchase order form | Complete |
| roles-and-perm.jpg | RBAC matrix | RBAC system in settings | Complete |
| system-wide-audit-trail.jpg | Audit trail | `AuditLogViewerPage` | Complete |
| schoolID.jpg | ID card template | `StudentIDCardsPage` | Complete |
| schoolprofile-activity-page.jpg | Activity dashboard | `AdministrationDashboardPage` | Complete |
| user profile page.jpg | User profile | Portal user profile | Complete |
| builtIN-user-management.jpg | User management | `SettingsUsersPage` | Complete |
| com_sms-setting.jpg | SMS gateway config | `AutoSMSSettingsPage` | Complete |
| Transport-routes-ovrview.jpg | Transport routes overview | `TransportRoutesPage` | Complete |
| transport-routes.jpg | Transport route detail | Transport route form | Complete |

### 5.2 Features That Exist But Need Integration (Action Required)

| Screenshot | Feature | Codebase Location | Gap |
|-----------|---------|-------------------|------|
| alumni-list.jpg | Alumni management | `AlumniManagementPage` (hub, 3 tabs) | Engagement & Events tabs are **placeholder** content. Directory tab works. |
| transffered-students.jpg | Transferred students | `TransferredStudentsPage` (standalone) | Not integrated into StudentDirectoryPage hub. No link from student management flow. |
| database-backup.jpg | Database backup/restore | `DatabaseBackupPage` (exists, has content export) | **NOT registered** in settings module definition. No navigation entry. |
| send-sms-categories.jpg | Category-based SMS | `SMSCategoriesPage` (standalone) | Not integrated into CommunicationPage hub. |
| mutli-class-stream-add.jpg | Bulk stream creation | `BulkStreamCreationPage` (standalone) | Not integrated into ClassesPage. |
| inventory-setting.jpg | Inventory settings | `InventorySettingsPage` (exists) | Check if registered in inventory module definition. |
| admit-new-student-slideoutWindow..png | Slideout admission form | `AddStudentPage` (full-page) | Uses full-page form instead of slideout panel pattern. |
| Add-student-clearance-recrod1/2.jpg | Clearance record form | `StudentClearancePage` | Uses full-page, not inline/slideout. |
| bulk-student-clearance.jpg | Bulk clearance UI | `StudentBulkOperationsPage` | Exists but compare against screenshot for UX differences. |
| academic analysis page.jpg | Academic analysis | Academics analysis pages | Check if analysis dashboard matches screenshot layout. |

### 5.3 Features from Improvement Plans Not Yet Addressed

From `hub-pages-improvement-plan.md` (re-audited 2026-06-07):

| Issue | Severity | Status |
|-------|----------|--------|
| Page naming: `*HubPage` suffix → `*Page` | P0 | **Not started** — 22+ files need rename |
| Academics route path mismatches (4 routes) | P0 | **Not started** |
| AnalyticsHubPage wrong content imports | P1 | **Not started** — critical bug |
| SchoolConfigurationPage 6-tab violation (deprecation) | P1 | **Partially done** — `SchoolOrganizationPage` + `StudentLifePage` exist but old page still active |
| StudentReportsHubPage missing 3/6 tabs | P1 | **Not started** |
| Keyboard accessibility on tab navigation | P1 | **Not started** |
| FinancialReportsHubPage internal naming mismatch | P2 | **Not started** |
| HubTab interface duplicated ~34x | P2 | **Not started** |
| Color schemes chosen arbitrarily | P2 | **Not started** |
| No loading/suspense boundaries | P2 | **Not started** |
| No tab ID validation | P3 | **Not started** |
| Missing student reports route | P3 | **Not started** |

---

## 6. MVP-Focused Action Items

### 6.1 Priority 1: MVP Foundation (Prevents E2E Testing)

These items MUST be completed before end-to-end usability testing can begin.

#### P1.1: Unify the Fullwidth Content Protocol

**Problem:** No page-level mechanism to respond to fullwidth state. Hub pages are unconstrained (works accidentally), standalone pages use `max-w-7xl` (doesn't expand).

**Solution:**
1. **Extend `FullWidthContext`** to expose a `contentWidth` derived state that components can consume:
   - `isFullWidth ? 'full' : 'constrained'`
2. **Create `useContentWidth` hook** — thin wrapper around `useFullWidth()` that returns the resolved content width strategy:
   ```typescript
   // src/hooks/useContentWidth.ts
   export function useContentWidth(): { 
     isFullWidth: boolean; 
     widthClass: 'max-w-7xl' | 'w-full';
     containerClass: string; // 'mx-auto px-4' or 'px-4'
   }
   ```
3. **Update `PageContainer`** to consume `useContentWidth` internally — when fullwidth, remove `max-w-7xl` constraint.
4. **Update all standalone pages** that use `max-w-7xl` (DashboardPage, PluginSettingsPage, UnifiedSettingsPage) to use `PageContainer` instead.

**Files affected:**
- `src/contexts/FullWidthContext.tsx` — Add `contentWidth` derived state
- NEW: `src/hooks/useContentWidth.ts` — New hook
- `src/components/layout/PageContainer.tsx` — Consume useContentWidth
- `src/modules/dashboard/pages/DashboardPage.tsx` — Replace `max-w-7xl` with PageContainer
- `src/modules/settings/pages/PluginSettingsPage.tsx` — Same
- `src/modules/settings/pages/UnifiedSettingsPage.tsx` — Same

**Success Metric:** Toggling fullwidth mode causes ALL pages to expand content to fill reclaimed sidebar space. No page has a hardcoded `max-w-7xl` that prevents expansion.

---

#### P1.2: Adopt Shared Hub Infrastructure

**Problem:** Every hub page (~34) duplicates ~50 lines of boilerplate — HubTab interface, URL state management, tab change handler.

**Solution:**
1. **Ensure `hub.ts` types are the single source of truth:**
   - `src/core/types/hub.ts` — Already exists. Verify it exports `HubTab` with `component: ReactNode`.
2. **Create `useHubNavigation` hook:**
   ```typescript
   // src/hooks/useHubNavigation.ts
   function useHubNavigation<T extends string>(config: HubConfig<T>) {
     // Returns: { activeTab, activeTabComponent, handleTabChange }
     // Handles: URL sync via useSearchParams, tab validation, default tab URL cleanup
     // Handles: Invalid tab ID fallback to defaultTab
   }
   ```
3. **Refactor ONE pilot hub** (e.g., `SchoolOrganizationPage`) to use the shared infrastructure.
4. **Generate migration guide** for remaining 33 hubs.

**Files affected:**
- NEW: `src/hooks/useHubNavigation.ts`
- `src/core/types/hub.ts` — Verify/update types
- Pilot: `src/modules/administration/pages/SchoolOrganizationPage.tsx` — Refactor

**Success Metric:** Pilot hub page shows 60% reduction in boilerplate (from ~55 lines to ~20 lines). Tab URL sync works. Invalid tab IDs fall back to default.

---

#### P1.3: Fix AnalyticsHubPage Content (Critical Bug)

**Problem:** `AnalyticsHubPage` imports the wrong content components — uses generic report pages instead of analytics-specific ones.

**Solution:** Replace imports per the mapping in `hub-pages-improvement-plan.md`:

| Tab | Current (Wrong) | Correct |
|-----|----------------|---------|
| teacher-dashboard | `TeacherAssignmentsPageContent` | `AnalyticsTeacherDashboardPageContent` |
| subject-analysis | `ExamResultsHorizontalPageContent` | `AnalyticsSubjectPageContent` |
| class-analysis | `ClassListsPageContent` | `AnalyticsClassPageContent` |
| exports | `StudentMasterlistPageContent` | `AnalyticsExportPageContent` |
| trends | `ReportsDashboardPageContent` | `AnalyticsTrendsPageContent` |

**Files affected:**
- `src/modules/reports/pages/AnalyticsHubPage.tsx` — Replace all 5 imports and tab-to-component mapping

**Success Metric:** All 5 tabs in `/reports/analytics` render the correct analytics content.

---

#### P1.4: Complete StudentReportsHubPage (3 → 6 Tabs)

**Problem:** Only 3 of 6 specified tabs are implemented. Missing: Financial Summary, Votehead Statement, Exam Results Horizontal.

**Solution:** Add 3 missing tabs using existing content components.

**Files affected:**
- `src/modules/reports/pages/StudentReportsHubPage.tsx`
- `src/modules/reports/moduleDefinition.tsx` — Add missing route entry

**Success Metric:** All 6 tabs render with correct content.

---

#### P1.5: Add Keyboard Accessibility to Tab Navigation

**Problem:** `PageHeaderWithTabs` has no ARIA roles, no keyboard event handlers.

**Solution:**
- Add `role="tablist"` to tab container
- Add `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` to each tab button
- Add `onKeyDown` for ArrowLeft/ArrowRight navigation

**Files affected:**
- `src/components/ui/PageHeaderWithTabs.tsx`

**Success Metric:** Tabs are navigable via keyboard (Tab to focus, ArrowLeft/ArrowRight to switch). Screen readers announce tab state.

---

### 6.2 Priority 2: Feature Integration (MVP-Complete)

These items ensure all features visible in the reference screenshots are accessible within the hub-and-spoke architecture.

#### P2.1: Integrate TransferredStudentsPage into StudentDirectoryPage Hub

**Solution:** Add a "transferred" tab to `StudentDirectoryPage` that renders `TransferredStudentsContent`.

**Files affected:**
- `src/modules/administration/pages/StudentDirectoryPage.tsx` — Add tab
- `src/modules/administration/pages/TransferredStudentsPage.tsx` — Verify `TransferredStudentsContent` export exists (confirmed: line 195)
- `src/modules/administration/moduleDefinition.tsx` — Deprecate standalone route, add redirect

**Success Metric:** `/administration/transferred-students` redirects to `/administration/students?tab=transferred`. Tab renders full transferred students management UI.

---

#### P2.2: Register DatabaseBackupPage in Settings Navigation

**Solution:** Add `DatabaseBackupPage` as a tab in the `SystemManagementPage` hub (alongside data-layer, modules, plugins).

**Files affected:**
- `src/modules/settings/pages/SystemManagementPage.tsx` — Add database backup tab
- `src/modules/settings/moduleDefinition.tsx` — Add navigation entry (or add as a deprecated page with redirect)

**Success Metric:** Database backup UI is accessible from settings navigation.

---

#### P2.3: Integrate SMSCategoriesPage into CommunicationPage Hub

**Solution:** Add "sms-categories" tab to `CommunicationPage`.

**Files affected:**
- `src/modules/administration/pages/CommunicationPage.tsx` — Add tab
- `src/modules/administration/CommunicationPage.tsx` — Yes, same file

**Success Metric:** Category-based SMS sending is a tab within the communication hub.

---

#### P2.4: Integrate BulkStreamCreationPage into ClassesPage

**Solution:** Either add as a tab in a hub or keep as standalone with improved navigation flow from ClassesPage.

**Files affected:**
- To be determined based on whether ClassesPage is converted to a hub

**Success Metric:** Bulk stream creation is discoverable from the class management flow.

---

#### P2.5: Complete Alumni Management Placeholder Tabs

**Problem:** Engagement and Events tabs show "Coming Soon" placeholder content.

**Solution:** Implement basic content for:
- **Engagement tab:** List alumni engagement activities (donations, event participation)
- **Events tab:** Calendar/list of alumni events

**Files affected:**
- `src/modules/administration/pages/AlumniManagementPage.tsx` — Replace EngagementContent and EventsContent with real implementations

**Success Metric:** All 3 tabs in alumni management render real data, not placeholders.

---

### 6.3 Priority 3: UI Polish (Enhanced UX)

#### P3.1: Standardize Page Naming

**Problem:** 22+ hub pages use `*HubPage` internal component name while file/export use `*Page`.

**Action:** Rename internal component names in all 22+ files. Do NOT rename files (keeps git history clean).

**Files affected:** All hub pages listed in `hub-pages-improvement-plan.md` (administration: 5, academics: 7, finance: 5, other: 6)

**Success Metric:** `npx tsc --noEmit` passes. No runtime errors from renamed exports.

---

#### P3.2: Fix Academics Route Path Mismatches

**Problem:** 4 route paths don't match spec:
- `/academics/verification` → `/academics/marks-verification`
- `/academics/analysis` → `/academics/exam-analysis`
- `/academics/distribution` → `/academics/results-distribution`
- `/academics/grading` → `/academics/grading-systems`

**Files affected:**
- `src/modules/academics/moduleDefinition.tsx`
- `src/routing/redirectMap.ts`

**Success Metric:** Correct paths resolve to correct pages. Old paths redirect via `redirectMap.ts`.

---

#### P3.3: Create Central Module Color Scheme Map

**Problem:** Each hub page arbitrarily chooses its own color scheme.

**Solution:** Create a centralized mapping in `src/components/ui/hubColorSchemes.ts`.

**Files affected:**
- NEW: `src/components/ui/hubColorSchemes.ts`

**Success Metric:** All hubs use consistent color scheme per module.

---

#### P3.4: Tab State Persistence

**Solution:** Add optional `persistKey` parameter to `useHubNavigation` to save/restore last active tab in localStorage.

**Files affected:**
- `src/hooks/useHubNavigation.ts`

**Success Metric:** When navigating away from a hub and back, the last active tab is restored.

---

## 7. Success Metrics

### 7.1 Quantitative Metrics

| Metric | Current State | Target | How to Measure |
|--------|---------------|--------|----------------|
| HubTab interface duplication | ~34 copies | 1 shared type | `grep -r "interface HubTab" src/ \| wc -l` |
| Hub pages using shared hook | 0 | 34 | Count `useHubNavigation` imports |
| Pages with hardcoded max-w-7xl | 3+ | 0 | `grep -r "max-w-7xl" src/modules/*/pages/` |
| Pages using PageContainer | 1 | All | `grep -r "PageContainer" src/modules/*/pages/` |
| Keyboard-accessible tab components | 0 | 1 | Manual ARIA audit |
| AnalyticsHubPage wrong imports | 5 wrong | 0 correct | Code review |
| StudentReportsHubPage tabs | 3/6 | 6/6 | Code review |
| Placeholder tabs (alumni) | 2/3 | 0/3 | Visual inspection |
| Orphaned standalone pages (not in hubs) | 4+ (Transferred, SMS, BulkStream, DB backup) | 0 | Audit module definitions |

### 7.2 Qualitative Metrics

| Metric | Assessment Method |
|--------|-------------------|
| Fullwidth mode properly expands all content | Visual toggle test across 5 key pages (Dashboard, StudentDirectory, Settings, Finance, Reports) |
| Tab navigation is keyboard-accessible | Tab through hub pages with keyboard only |
| Color schemes are consistent per module | Visual scan of all hub pages |
| Navigation is predictable | Users can find any feature within 2 clicks |
| E2E testing readiness | All features accessible without console errors, all routes resolve |

---

## 8. Implementation Roadmap

### Phase 1: MVP Foundation (Week 1 — 3 days)

```
Day 1: P1.1 — Unify fullwidth content protocol
  ├─ Extend FullWidthContext with contentWidth derived state
  ├─ Create useContentWidth hook
  ├─ Update PageContainer to consume useContentWidth
  └─ Migrate 3 standalone pages from hardcoded max-w-7xl to PageContainer

Day 2: P1.2 — Adopt shared hub infrastructure  
  ├─ Verify/update hub.ts types
  ├─ Create useHubNavigation hook
  └─ Refactor SchoolOrganizationPage as pilot (prove pattern)

Day 3: P1.3 — Fix AnalyticsHubPage content
  ├─ Replace 5 wrong imports with correct analytics imports
  └─ P1.5 — Add keyboard accessibility to PageHeaderWithTabs
```

### Phase 2: Feature Integration (Week 2 — 2 days)

```
Day 4: P2.1 — Integrate TransferredStudentsPage into StudentDirectoryPage hub
       P2.2 — Register DatabaseBackupPage in settings navigation
       P1.4 — Complete StudentReportsHubPage (3→6 tabs)

Day 5: P2.3 — Integrate SMSCategoriesPage into CommunicationPage hub
       P2.5 — Complete Alumni Management Engagement + Events tabs
       P2.4 — Integrate BulkStreamCreationPage (or document approach)
```

### Phase 3: UI Polish (Week 3 — 2 days)

```
Day 6: P3.1 — Standardize page naming (22+ internal component renames)
       P3.2 — Fix academics route path mismatches

Day 7: P3.3 — Create central module color scheme map
       P3.4 — Tab state persistence (optional enhancement)
       └─ Final E2E readiness verification
```

### Phase 4: E2E Testing (Week 4)

```
Week 4: Full end-to-end usability testing across all 19 modules
        Bug fixes from testing feedback
        Performance optimization
```

---

## 9. Appendix: File Inventory

### Critical Files for MVP (Phase 1-2)

| File | Action | Priority |
|------|--------|----------|
| `src/contexts/FullWidthContext.tsx` | Extend with contentWidth | P1.1 |
| `src/hooks/useContentWidth.ts` | NEW — create | P1.1 |
| `src/components/layout/PageContainer.tsx` | Update to consume useContentWidth | P1.1 |
| `src/modules/dashboard/pages/DashboardPage.tsx` | Replace max-w-7xl with PageContainer | P1.1 |
| `src/modules/settings/pages/PluginSettingsPage.tsx` | Replace max-w-7xl with PageContainer | P1.1 |
| `src/modules/settings/pages/UnifiedSettingsPage.tsx` | Replace max-w-7xl with PageContainer | P1.1 |
| `src/core/types/hub.ts` | Verify/update HubTab, HubConfig | P1.2 |
| `src/hooks/useHubNavigation.ts` | NEW — create | P1.2 |
| `src/modules/administration/pages/SchoolOrganizationPage.tsx` | Refactor as pilot | P1.2 |
| `src/modules/reports/pages/AnalyticsHubPage.tsx` | Fix 5 wrong imports | P1.3 |
| `src/components/ui/PageHeaderWithTabs.tsx` | Add ARIA + keyboard | P1.5 |
| `src/modules/reports/pages/StudentReportsHubPage.tsx` | Add 3 missing tabs | P1.4 |
| `src/modules/administration/pages/StudentDirectoryPage.tsx` | Add transferred tab | P2.1 |
| `src/modules/settings/pages/SystemManagementPage.tsx` | Add database backup tab | P2.2 |
| `src/modules/administration/pages/CommunicationPage.tsx` | Add sms-categories tab | P2.3 |
| `src/modules/administration/pages/AlumniManagementPage.tsx` | Replace placeholders | P2.5 |

### Secondary Files (Phase 3)

| File | Action | Priority |
|------|--------|----------|
| All 22+ hub pages with `*HubPage` internal name | Rename internal component | P3.1 |
| `src/modules/academics/moduleDefinition.tsx` | Fix 4 route paths | P3.2 |
| `src/routing/redirectMap.ts` | Add redirects for old paths | P3.2 |
| `src/components/ui/hubColorSchemes.ts` | NEW — create | P3.3 |
| `src/modules/reports/moduleDefinition.tsx` | Add student reports route | P1.4 |

### Files to Verify (Existence Check)

| File | Status |
|------|--------|
| `src/modules/administration/pages/AlumniDirectoryPage.tsx` | ✅ Exists (content for alumni directory tab) |
| `src/modules/administration/pages/TransferredStudentsPage.tsx` | ✅ Exists (standalone, complete with mock data) |
| `src/modules/settings/pages/DatabaseBackupPage.tsx` | ✅ Exists (has `DatabaseBackupContent` export) |
| `src/modules/administration/pages/SMSCategoriesPage.tsx` | ✅ Exists (has `SMSCategoriesContent` export) |
| `src/modules/administration/pages/BulkStreamCreationPage.tsx` | ✅ Exists (has `BulkStreamCreationContent` export) |
| `src/modules/inventory/pages/InventorySettingsPage.tsx` | ✅ Exists (has `InventorySettingsContent` export) |

---

## End of Specification
