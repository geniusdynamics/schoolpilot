# Hub Pages Improvement Plan (RE-AUDITED)

## Summary

Improve the hub-and-spoke page architecture across all modules by addressing verified audit findings from a fresh codebase scan. This plan **replaces the stale May 2026 audit** with current ground truth and prioritizes real, actionable improvements.

---

## Current State Analysis (Re-audited 2026-06-07)

### What's Already Working

| Claim from Old Audit | Actual Status | Evidence |
|---------------------|---------------|----------|
| `StudentDirectoryPage` missing | **EXISTS** — 4 tabs (directory, bio-data, health, clearance) | `src/modules/administration/pages/StudentDirectoryPage.tsx` |
| `StaffDirectoryPage` missing | **EXISTS** — 4 tabs (directory, bio-data, id-cards, wallet) | `src/modules/administration/pages/StaffDirectoryPage.tsx` |
| `AnalyticsHubPage` missing | **EXISTS** — 5 tabs in reports module | `src/modules/reports/pages/AnalyticsHubPage.tsx` |
| `FinancialReportsHubPage` in wrong module | **CORRECT** — in reports module at `/reports/finance` | `src/modules/reports/pages/FinancialReportsHubPage.tsx` |
| Barrel exports missing (admin) | **COMPLETE** — all hub pages exported | `src/modules/administration/pages/index.ts` |
| Barrel exports missing (academics) | **COMPLETE** — all 11 hub pages exported | `src/modules/academics/pages/index.ts` |
| `StudentBulkOperationsPage` not exported | **EXPORTED** — line 12 in admin barrel | `src/modules/administration/pages/index.ts` |

### Verified Active Issues

| Severity | Issue | Details | Affected File(s) |
|----------|-------|---------|------------------|
| **P0** | Page naming inconsistency | 20+ hub pages use `*HubPage` suffix instead of `*Page` | All module definitions + barrel exports |
| **P0** | Route path mismatches | 4 academics routes don't match spec | `src/modules/academics/moduleDefinition.tsx` |
| **P1** | AnalyticsHubPage uses WRONG content | Imports `TeacherAssignmentsPageContent`, `ExamResultsHorizontalPageContent` etc. instead of `AnalyticsTeacherDashboardPageContent`, `AnalyticsSubjectPageContent` etc. The 5 analytics sub-pages exist in `analytics/` subfolder but are never used | `src/modules/reports/pages/AnalyticsHubPage.tsx` |
| **P1** | `SchoolConfigurationPage` still exists with 6 tabs (exceeds max-5) AND has non-standard `HubTab` interface with extra `path` field | Split was supposedly done via `SchoolOrganizationHubPage` + `StudentLifeHubPage`, but the original 6-tab page is still active and exported | `src/modules/administration/pages/SchoolConfigurationPage.tsx` |
| **P1** | `StudentReportsHubPage` has only 3/6 spec'd tabs | Missing: Financial Summary, Votehead Statement, Exam Results Horizontal | `src/modules/reports/pages/StudentReportsHubPage.tsx` |
| **P1** | No keyboard accessibility on tab navigation | No ARIA roles, no keyboard event handlers | `src/components/ui/PageHeaderWithTabs.tsx` |
| **P2** | `FinancialReportsHubPage` internal naming mismatch | File = `FinancialReportsHubPage.tsx`, export = `FinancialReportsHubPage`, but component = `FinanceReportsHubPage` (missing "ial") | `src/modules/reports/pages/FinancialReportsHubPage.tsx` |
| **P2** | `HubTab` interface duplicated ~34x across all hub pages | No shared type — every hub redefines the same interface | All 34 hub pages |
| **P2** | Color schemes chosen arbitrarily per hub | No centralized module-to-scheme mapping | `src/components/ui/PageHeaderWithTabs.tsx` |
| **P2** | No loading/suspense boundaries around tab content | Tab content renders synchronously with no loading fallback | All hub pages |
| **P3** | No URL validation for invalid tab IDs | Invalid `?tab=` param silently shows first tab | All hub pages |
| **P3** | `create_portal_hub.cjs` generates legacy pattern code | Script doesn't use shared types or hooks | `create_portal_hub.cjs` |
| **P3** | Routes array in Reports module missing student reports | `reportsModule.routes` has no entry for `/reports/student-reports` | `src/modules/reports/moduleDefinition.tsx` |

---

## Proposed Changes

### P0 — Critical (Naming/Routing Alignment)

#### 1. Standardize Page Naming (Drop `*HubPage` Suffix)

Rename pages that use the `*HubPage` naming convention to `*Page`:

**Administration (5 renames):**
- `SchoolOrganizationHubPage.tsx` → `SchoolOrganizationPage.tsx`
- `StudentLifeHubPage.tsx` → `StudentLifePage.tsx`
- `StudentAttendanceHubPage.tsx` → `StudentAttendancePage.tsx`
- `CommunicationHubPage.tsx` → `CommunicationPage.tsx`
- `SecurityHubPage.tsx` → `SecurityPage.tsx`

**Academics (7 renames):**
- `ExamSetupHubPage.tsx` → `ExamSetupPage.tsx`
- `MarksEntryHubPage.tsx` → `MarksEntryPage.tsx`
- `VerificationHubPage.tsx` → `MarksVerificationPage.tsx`
- `AnalysisHubPage.tsx` → `ExamAnalysisPage.tsx`
- `DistributionHubPage.tsx` → `ResultsDistributionPage.tsx`
- `GradingHubPage.tsx` → `GradingSystemsPage.tsx`
- `TimetableHubPage.tsx` → `TimetablePage.tsx`

**Finance (4 renames):**
- `FeeConfigurationHubPage.tsx` → `FeeConfigurationPage.tsx`
- `PaymentsHubPage.tsx` → `PaymentsPage.tsx`
- `InvoicingHubPage.tsx` → `InvoicingPage.tsx`
- `ExpensesHubPage.tsx` → `ExpensesPage.tsx`
- `TransportHubPage.tsx` → `TransportFinancePage.tsx`

**Other modules (6 renames):**
- `ApplicationsHubPage.tsx` → `ApplicationsPage.tsx` (Admissions)
- `PayrollHubPage.tsx` → `PayrollPage.tsx` (HR)
- `ProcurementHubPage.tsx` → `ProcurementPage.tsx` (Inventory)
- `ConfigurationHubPage.tsx` → `ConfigurationPage.tsx` (Settings)
- `SystemManagementHubPage.tsx` → `SystemManagementPage.tsx` (Settings)
- `SchoolOperationsHubPage.tsx` → `SchoolOperationsPage.tsx` (Settings)

**Do NOT rename:**
- `StudentReportsHubPage` — spec compliant as-is
- `FinancialReportsHubPage` — spec compliant as-is
- `AnalyticsHubPage` — spec compliant as-is
- `LibraryResourcesHubPage` — verify spec name first
- `MealPlanningHubPage` / `NutritionOperationsHubPage` — verify spec name first
- `InventoryHubPage` / `StockOpsHubPage` — verify spec name first

**Per rename:**
1. Git mv the file
2. Update internal `const` component name (e.g., `ExamSetupHubPage` → `ExamSetupPage`)
3. Update barrel export in `pages/index.ts`
4. Update `moduleDefinition.tsx` navigation + routes
5. Update any `redirectTo` in module definition

#### 2. Fix Route Path Mismatches

**File**: `src/modules/academics/moduleDefinition.tsx`
```
/academics/verification      → /academics/marks-verification
/academics/analysis           → /academics/exam-analysis
/academics/distribution       → /academics/results-distribution
/academics/grading            → /academics/grading-systems
```
- Update navigation `path`, `routes` array, and all `redirectTo` values
- **Also**: Update `src/routing/redirectMap.ts` for any affected deprecated routes

---

### P1 — High (Functional Bugs & Gaps)

#### 3. Fix AnalyticsHubPage Content — CRITICAL BUG

**File**: `src/modules/reports/pages/AnalyticsHubPage.tsx`

**Bug**: Tab content is completely wrong — imports generic report pages instead of analytics-specific ones:
```typescript
// CURRENT (WRONG):
import { ReportsDashboardPageContent } from './ReportsDashboardPage';
import { TeacherAssignmentsPageContent } from './TeacherAssignmentsPage';
import { ExamResultsHorizontalPageContent } from './ExamResultsHorizontalPage';
import { ClassListsPageContent } from './ClassListsPage';
import { StudentMasterlistPageContent } from './StudentMasterlistPage';

// SHOULD BE:
import { AnalyticsTeacherDashboardPageContent } from './analytics/AnalyticsTeacherDashboardPage';
import { AnalyticsSubjectPageContent } from './analytics/AnalyticsSubjectPage';
import { AnalyticsClassPageContent } from './analytics/AnalyticsClassPage';
import { AnalyticsExportPageContent } from './analytics/AnalyticsExportPage';
import { AnalyticsTrendsPageContent } from './analytics/AnalyticsTrendsPage';
```

**Tab-to-component mapping:**
| Tab | Current (Wrong) | Correct |
|-----|----------------|---------|
| teacher-dashboard | `TeacherAssignmentsPageContent` | `AnalyticsTeacherDashboardPageContent` |
| subject-analysis | `ExamResultsHorizontalPageContent` | `AnalyticsSubjectPageContent` |
| class-analysis | `ClassListsPageContent` | `AnalyticsClassPageContent` |
| exports | `StudentMasterlistPageContent` | `AnalyticsExportPageContent` |
| trends | `ReportsDashboardPageContent` | `AnalyticsTrendsPageContent` |

**Note**: Check if analytics sub-pages have proper `*Content` exports. If not, need to extract them.

#### 4. Deprecate SchoolConfigurationPage (6 tabs → split already done)

**File**: `src/modules/administration/pages/SchoolConfigurationPage.tsx`

- The M5 split (→ `SchoolOrganizationPage` + `StudentLifePage`) is already complete
- `SchoolConfigurationPage` should be marked deprecated with redirect
- **Remove** the custom `path` field from its `HubTab` interface (pattern drift)
- **Update** `redirectMap.ts`: `/administration/configuration` → `/administration/organization`
- **Update** `moduleDefinition.tsx`: Remove from `routes` array or keep deprecated

#### 5. Complete StudentReportsHubPage (3 → 6 tabs)

**File**: `src/modules/reports/pages/StudentReportsHubPage.tsx`

**Add 3 missing tabs:**
| Tab ID | Label | Content Source |
|--------|-------|---------------|
| financial-summary | Financial Summary | `StudentFinancialSummaryPageContent` (from `./StudentFinancialSummaryPage`) |
| votehead-statement | Votehead Statement | `StudentVoteheadStatementPageContent` (from `./StudentVoteheadStatementPage`) |
| exam-results | Exam Results | `ExamResultsHorizontalPageContent` (from `./ExamResultsHorizontalPage`) |

**Also**: Add a route entry in reports `moduleDefinition.tsx` for `/reports/student-reports`.

#### 6. Add Keyboard Accessibility to PageHeaderWithTabs

**File**: `src/components/ui/PageHeaderWithTabs.tsx`

- Add `role="tablist"` to the tab container `<div>`
- Add `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` to each tab button
- Add `onKeyDown` handler for ArrowLeft/ArrowRight navigation
- Add `aria-label` on the tablist for screen reader context

---

### P2 — Medium (Pattern Consistency & DX)

#### 7. Extract Shared `HubTab` Type

**New file**: `src/core/types/hub.ts`
```typescript
export interface HubTab<T extends string = string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export interface HubConfig<T extends string = string> {
  module: string;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  basePath: string;
  defaultTab: T;
  tabs: HubTab<T>[];
  colorScheme?: ColorScheme;
}

export type ColorScheme = 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose' | 'green' | 'teal' | 'cyan' | 'purple' | 'orange' | 'slate';
```

#### 8. Create `useHubNavigation` Hook

**New file**: `src/hooks/useHubNavigation.ts`
```typescript
function useHubNavigation<T extends string>(config: HubConfig<T>) {
  // Returns: { activeTab, activeTabData, handleTabChange }
  // Handles: URL sync via useSearchParams, tab validation, default tab URL cleanup
}
```

**This eliminates ~50 lines of duplicate boilerplate from every hub page.**
- After creation: Refactor **one pilot hub** (e.g., `SchoolOrganizationPage`) as proof-of-concept
- All other hubs can be incrementally refactored

#### 9. Create Central Color Scheme Map

**File**: `src/components/ui/hubColorSchemes.ts`
```typescript
export const MODULE_COLOR_SCHEMES: Record<string, ColorScheme> = {
  administration: 'blue',
  academics: 'emerald',
  finance: 'amber',
  reports: 'purple',
  hr: 'indigo',
  inventory: 'teal',
  library: 'cyan',
  nutrition: 'green',
  admissions: 'violet',
  settings: 'slate',
};
```

#### 10. Add Missing Route for Student Reports

**File**: `src/modules/reports/moduleDefinition.tsx`

Add to the `routes` array:
```typescript
{ path: '/reports/student-reports', page: 'StudentReportsHubPage' },
```

---

### P3 — Low (Polish & Tooling)

#### 11. Fix FinancialReportsHubPage Internal Naming

**File**: `src/modules/reports/pages/FinancialReportsHubPage.tsx`
- Change `const FinanceReportsHubPage` → `const FinancialReportsHubPage` for internal consistency

#### 12. Add Tab ID Validation

**File**: `src/hooks/useHubNavigation.ts`
- If `searchParams.get('tab')` returns an ID not in the tab array, silently fall back to `defaultTab`

#### 13. Update Hub Creation Script

**File**: `create_portal_hub.cjs`
- Update generated template to use shared `HubTab` type and `useHubNavigation` hook

#### 14. Tab State Persistence (Optional)

**File**: `src/hooks/useHubNavigation.ts`
- Optional `persistKey` parameter to save/restore last active tab in localStorage

---

## Key Design Decisions

1. **Do NOT rename files that already have spec-compliant names** — `StudentReportsHubPage`, `FinancialReportsHubPage`, `AnalyticsHubPage` stay as-is
2. **Keep existing `*Content` exports intact** — only refactor hub page wrappers, not underlying content components
3. **Use the `useHubNavigation` hook as the new standard** — all future hubs should use it; existing hubs migrated incrementally
4. **Preserve backward compatibility** — old routes continue via redirects in `redirectMap.ts` + module nav `deprecated` items
5. **One module definition change per module** — all naming + route changes for a module in a single edit

---

## Implementation Order

```
Step 1:  P0.2 — Fix academics route path mismatches in moduleDefinition + redirectMap
Step 2:  P0.1 — Standardize page naming (all 22 renames across 3+ modules)
Step 3:  P1.3 — Fix AnalyticsHubPage wrong content (critical bug)
Step 4:  P1.4 — Deprecate SchoolConfigurationPage (6-tab violation)
Step 5:  P1.5 — Complete StudentReportsHubPage tabs (3→6)
Step 6:  P2.7+P2.8 — Extract HubTab type + create useHubNavigation hook
Step 7:  P2.10 — Add missing route for student reports
Step 8:  P1.6 — Add keyboard accessibility to PageHeaderWithTabs
Step 9:  P2.9 — Create color scheme map
Step 10: P3.11 — Fix FinancialReportsHubPage internal naming
Step 11: P3.12+P3.13 — Tab validation + update creation script
Step 12: P3.14 — Optional tab state persistence
```

---

## Verification

After each step:
```
npm run build          # No compilation errors
npm run lint           # No linting errors
npx tsc --noEmit       # No TypeScript errors
```

Manual verification: Navigate to each hub, switch tabs, verify redirects from deprecated routes.
