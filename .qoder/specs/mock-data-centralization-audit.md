# Mock Data Centralization Audit & Migration Plan

## Context

The SchoolPilot3 codebase has a robust centralized mock data architecture with module-specific `data/mockData.ts` files, a dynamic loading mechanism via `import.meta.glob`, and a naming convention of `initialMock[EntityPluralName]`. However, 43 new untracked page files contain inline mock data implementations directly within their component logic. This is an anti-pattern because:

1. Inline mock data is invisible to the demo data seeder (`demoDataSeed.ts`)
2. It breaks data consistency across the application
3. It prevents proper seeding into production databases for testing
4. It duplicates data that should be centralized

The goal is to extract all inline mock data from these pages into the appropriate module `data/mockData.ts` files, define proper TypeScript interfaces in `data/types.ts`, and update components to consume from the centralized system.

## Architecture Overview

- **Dynamic Loading**: `src/hooks/useModularMockData.ts` uses `import.meta.glob('../modules/*/data/mockData.ts', { eager: true })` to auto-discover all mock data exports
- **Naming Convention**: All mock data arrays exported as `initialMock[EntityPluralName]` (e.g., `initialMockSubjects`)
- **Type Safety**: Each module has `data/types.ts` with TypeScript interfaces for all entities
- **Data Hooks**: Entity-specific hooks (e.g., `useSubjectData.ts`) import from `./mockData` for initial state

## Implementation Approach

### Guiding Principles

1. **Add all new types to existing `data/types.ts`** — Do not create separate pageTypes.ts files; keep all module types consolidated
2. **Create dedicated filtered arrays in mockData.ts** — Even for filtered subsets (e.g., 3 students for BirthCertificatePage), create dedicated `initialMock*` arrays to ensure consistent demo data and keep pages simple
3. **No new entity hooks for now** — These are prototype pages; extract mock data only. Create hooks only when pages graduate to real data persistence
4. **No changes to `useModularMockData.ts`** — Report/view data stays module-local; only master/transactional data gets promoted to AppDataContextType in future iterations
5. **Preserve page functionality** — Pages keep their `useState` and filtering logic; only the data source changes from inline to imported

### Per-Module Execution Plan

#### Module 1: Academics (8 pages)

**Files to modify:**
- `src/modules/academics/data/types.ts` — Add 8 interfaces
- `src/modules/academics/data/mockData.ts` — Add 8 `initialMock*` exports
- `src/modules/academics/pages/BoardExamResultsPage.tsx`
- `src/modules/academics/pages/DistributeResultsPage.tsx`
- `src/modules/academics/pages/EventsManagerPage.tsx`
- `src/modules/academics/pages/ExamGazettePage.tsx`
- `src/modules/academics/pages/ExamTokensPage.tsx`
- `src/modules/academics/pages/MarksEntryByTokenPage.tsx`
- `src/modules/academics/pages/VerifyMarksByStructurePage.tsx`
- `src/modules/academics/pages/VerifyMarksCrossCheckPage.tsx`

| Page | Inline Variable | New Export Name | New Type |
|------|----------------|-----------------|----------|
| BoardExamResultsPage.tsx | `mockBoardResults` | `initialMockBoardExamResults` | `BoardExamResult` |
| DistributeResultsPage.tsx | `mockDistributions` | `initialMockResultDistributions` | `ResultDistribution` |
| EventsManagerPage.tsx | `mockEvents` | `initialMockSchoolEvents` | `SchoolEvent` |
| ExamGazettePage.tsx | `mockGazettes` | `initialMockExamGazettes` | `ExamGazette` |
| ExamTokensPage.tsx | `mockExamTokens` | `initialMockExamTokens` | `ExamToken` |
| MarksEntryByTokenPage.tsx | `mockSessions` | `initialMockMarksEntrySessions` | `MarksEntrySession` |
| VerifyMarksByStructurePage.tsx | `mockValidationItems` | `initialMockStructureValidationItems` | `StructureValidationItem` |
| VerifyMarksCrossCheckPage.tsx | `mockRecords` | `initialMockCrossCheckRecords` | `CrossCheckRecord` |

#### Module 2: Administration (18 pages)

**Files to modify:**
- `src/modules/administration/data/types.ts` — Add ~14 interfaces
- `src/modules/administration/data/mockData.ts` — Add 18 `initialMock*` exports
- All 18 administration pages listed below

| Page | Inline Variable | New Export Name | New Type | Notes |
|------|----------------|-----------------|----------|-------|
| AttendanceReportsPage.tsx | `mockReports` | `initialMockAttendanceReports` | `AttendanceReport` | |
| AutoSMSSettingsPage.tsx | `mockSettings` | `initialMockAutoSMSSettings` | `AutoSMSSetting` | |
| BirthCertificatePage.tsx | `mockStudents` | `initialMockBirthCertificateStudents` | `Student` | Reuses existing `Student` type |
| BulkAssignRollNumbersPage.tsx | `mockStudents` | `initialMockStudentRollNumbers` | `StudentRollNumber` | |
| BulkStaffUpdatePage.tsx | `mockStaff` | `initialMockBulkStaffRecords` | `Staff` | Reuses existing `Staff` type |
| BulkStudentUpdatePage.tsx | `mockStudents` | `initialMockBulkStudentRecords` | `StudentRecord` | |
| CharacterCertificatePage.tsx | `mockStudents` | `initialMockCharacterCertificateStudents` | `Student` | Reuses existing `Student` type |
| DynamicAttendancePage.tsx | `mockAttendance` | `initialMockSessionAttendance` | `SessionAttendance` | |
| GatePassPage.tsx | `mockGatePasses` | `initialMockGatePasses` | `GatePass` | |
| ManualAttendancePage.tsx | `mockAttendance` | `initialMockManualAttendanceRecords` | `ManualAttendanceRecord` | |
| SMSReportsPage.tsx | `mockSMSReports` | `initialMockSMSReports` | `SMSReport` | |
| ScholarshipTrackingPage.tsx | `mockScholarships` | `initialMockScholarshipRecords` | `ScholarshipRecord` | |
| StaffAttendancePage.tsx | `mockAttendance` | `initialMockStaffAttendanceRecords` | `StaffAttendanceRecord` | |
| StaffIDCardsPage.tsx | `mockStaff` | `initialMockStaffIDCards` | `StaffIDCard` | |
| StaffWalletPage.tsx | `mockTransactions` | `initialMockWalletTransactions` | `WalletTransaction` | Reuses existing `WalletTransaction` type |
| StudentBioDataPage.tsx | `mockStudentBioData` | `initialMockStudentBioData` | `StudentBioData` | |
| StudentIDCardsPage.tsx | `mockStudents` | `initialMockStudentIDCards` | `StudentIDCard` | |
| TransferCertificatePage.tsx | `mockStudents` | `initialMockTransferCertificateStudents` | `Student` | Reuses existing `Student` type |

#### Module 3: Finance (11 pages)

**Files to modify:**
- `src/modules/finance/data/types.ts` — Add ~10 interfaces
- `src/modules/finance/data/mockData.ts` — Add 11 `initialMock*` exports
- All 11 finance pages listed below

| Page | Inline Variable | New Export Name | New Type | Notes |
|------|----------------|-----------------|----------|-------|
| BalanceSheetPage.tsx | `mockBalanceSheet` | `initialMockBalanceSheetItems` | `BalanceSheetItem` | |
| CashBookPage.tsx | `mockCashBookEntries` | `initialMockCashBookEntries` | `CashBookEntry` | |
| DayBookPage.tsx | `mockDayBookEntries` | `initialMockDayBookEntries` | `DayBookEntry` | |
| FeesDueReportPage.tsx | `mockDueRecords` | `initialMockFeeDueRecords` | `FeeDueRecord` | |
| FeesInstallmentsPage.tsx | `mockInstallments` | `initialMockFeeInstallments` | `FeeInstallment` | Reuses existing `FeeInstallment` type |
| FeesReceiptTemplatePage.tsx | `mockTemplates` | `initialMockReceiptTemplates` | `ReceiptTemplate` | |
| IncomeStatementPage.tsx | `mockIncomeStatement` | `initialMockIncomeStatementItems` | `IncomeStatementItem` | |
| JournalRegisterPage.tsx | `mockJournalEntries` | `initialMockJournalEntries` | `JournalEntry` | |
| PreviousSessionFeesPage.tsx | `mockPreviousSessionFees` | `initialMockPreviousSessionFees` | `PreviousSessionFee` | |
| StudentsPaidBookPage.tsx | `mockPaymentRecords` | `initialMockStudentPaymentRecords` | `StudentPaymentRecord` | |
| TrialBalancePage.tsx | `mockTrialBalance` | `initialMockTrialBalanceItems` | `TrialBalanceItem` | |

**Note:** `FeesFinesPage.tsx` has no inline mock array — it derives data from `useAppData().feeAdjustments`. No action needed.

#### Module 4: HR (1 page)

**Files to modify:**
- `src/modules/hr/data/types.ts` — Add 1 interface
- `src/modules/hr/data/mockData.ts` — Add 1 export
- `src/modules/hr/pages/StaffBioDataPage.tsx`

| Page | Inline Variable | New Export Name | New Type |
|------|----------------|-----------------|----------|
| StaffBioDataPage.tsx | `mockStaffBioData` | `initialMockStaffBioData` | `StaffBioData` |

#### Module 5: Inventory (1 page)

**Files to modify:**
- `src/modules/inventory/data/types.ts` — Add 1 interface
- `src/modules/inventory/data/mockData.ts` — Add 1 export
- `src/modules/inventory/pages/StationeryPage.tsx`

| Page | Inline Variable | New Export Name | New Type |
|------|----------------|-----------------|----------|
| StationeryPage.tsx | `mockStationery` | `initialMockStationeryItems` | `StationeryItem` |

#### Module 6: Nutrition (1 page)

**Files to modify:**
- `src/modules/nutrition/data/types.ts` — Add 2 interfaces
- `src/modules/nutrition/data/mockData.ts` — Add 2 exports
- `src/modules/nutrition/pages/KitchenManagementPage.tsx`

| Page | Inline Variable | New Export Name | New Type |
|------|----------------|-----------------|----------|
| KitchenManagementPage.tsx | `mockFoodInventory` | `initialMockFoodInventory` | `FoodItem` |
| KitchenManagementPage.tsx | `mockMealPlans` | `initialMockKitchenMealPlans` | `KitchenMealPlan` |

## Step-by-Step Instructions Per Page

For each page, perform these exact steps:

1. **Read the page file** to identify:
   - The inline interface/type definition (if any)
   - The inline mock data array
   - How the data is consumed (useState, useMemo, direct render)

2. **Add the interface to `data/types.ts`**:
   - If the page defines a local interface (e.g., `interface BoardExamResult {...}`), move it to the module's `data/types.ts`
   - If the page uses an existing type (e.g., `Student`), no new interface needed
   - Ensure the interface is exported

3. **Add the mock data array to `data/mockData.ts`**:
   - Import the new type from `./types`
   - Export the array as `initialMock[EntityPluralName]: TypeName[]`
   - Copy the exact data values from the page

4. **Update the page component**:
   - Remove the inline interface definition
   - Remove the inline mock data array
   - Add import: `import { initialMock... } from '../data/mockData'`
   - Add import: `import type { ... } from '../data/types'` (if type is used in component)
   - Replace inline array reference with the imported constant
   - Preserve all filtering, sorting, and UI logic

## Example Transformation

**Before (in page component):**
```tsx
interface BoardExamResult {
  id: string;
  student_name: string;
  // ...
}

const BoardExamResultsPage: React.FC = () => {
  const mockBoardResults: BoardExamResult[] = [
    { id: 'ber-1', student_name: 'John Doe', ... },
    // ...
  ];
  const [data, setData] = useState(mockBoardResults);
  // ...
};
```

**After (types extracted to module):**

In `src/modules/academics/data/types.ts`:
```tsx
export interface BoardExamResult {
  id: string;
  student_name: string;
  // ...
}
```

In `src/modules/academics/data/mockData.ts`:
```tsx
import { BoardExamResult } from './types';

export const initialMockBoardExamResults: BoardExamResult[] = [
  { id: 'ber-1', student_name: 'John Doe', ... },
  // ...
];
```

In `src/modules/academics/pages/BoardExamResultsPage.tsx`:
```tsx
import { initialMockBoardExamResults } from '../data/mockData';
import type { BoardExamResult } from '../data/types';

const BoardExamResultsPage: React.FC = () => {
  const [data, setData] = useState(initialMockBoardExamResults);
  // ...
};
```

## Existing Committed Code Audit

Beyond the 43 untracked pages, the following committed files also contain inline mock data and should be addressed:

### Academics Module (Committed)
- `src/modules/academics/pages/StudentExamAnalysisPage.tsx` — `subjectPerformanceData`, `performanceOverTimeData`, `subjectBreakdownData`
- `src/modules/academics/pages/ExamAnalysisPage.tsx` — `performanceOverTimeData`, `streamPerformanceData`

### Administration Module (Committed)
- `src/modules/administration/pages/NewslettersPage.tsx` — `mockNewsletters`, `mockEvents`

### Reports Module (Committed)
- `src/modules/reports/pages/ClassListsPage.tsx` — `mockGradeBreakdownData`, `chartData`
- `src/modules/reports/pages/ReportsPage.tsx` — `kpiData`, `summaryData`, `workingCapitalTrend`

### Library Module (Committed)
- `src/modules/library/pages/ImportBooksPage.tsx` — `sampleData`

### Core Module (Committed)
- `src/modules/core/pages/LoginPage.tsx` — `demoUsers`

### Todos Module (Committed)
- `src/modules/todos/pages/TODOPage.tsx` — `todos`

**Recommendation:** These committed files should be handled in the same manner — extract types to module `data/types.ts`, extract data to module `data/mockData.ts`, and update pages to import. The `reports` module currently lacks a `data/mockData.ts` file and will need one created.

## Dashboard Metrics

All dashboard pages contain hardcoded `metrics`, `alertBanners`, `quickActions`, `charts`, `notifications`, and `recentActivity` arrays. These are **structural/config data** for dashboard layout rather than business entity mock data. They should be excluded from this migration as they represent UI configuration, not seedable domain data.

## Verification

After all extractions are complete:

1. Run `npm run build` or `tsc --noEmit` to verify TypeScript compilation
2. Confirm `import.meta.glob` in `useModularMockData.ts` auto-discovers all new exports
3. Verify each affected page still renders correctly with its mock data
4. Ensure no inline mock data arrays remain in any page component
5. Confirm all new exports follow the `initialMock[EntityPluralName]` naming convention
6. Check that no circular dependencies are introduced (pages import from their own module's data folder)

## Critical Files Summary

| File | Action |
|------|--------|
| `src/modules/academics/data/types.ts` | Add 8 interfaces |
| `src/modules/academics/data/mockData.ts` | Add 8 exports |
| `src/modules/administration/data/types.ts` | Add ~14 interfaces |
| `src/modules/administration/data/mockData.ts` | Add 18 exports |
| `src/modules/finance/data/types.ts` | Add ~10 interfaces |
| `src/modules/finance/data/mockData.ts` | Add 11 exports |
| `src/modules/hr/data/types.ts` | Add 1 interface |
| `src/modules/hr/data/mockData.ts` | Add 1 export |
| `src/modules/inventory/data/types.ts` | Add 1 interface |
| `src/modules/inventory/data/mockData.ts` | Add 1 export |
| `src/modules/nutrition/data/types.ts` | Add 2 interfaces |
| `src/modules/nutrition/data/mockData.ts` | Add 2 exports |
| `src/modules/reports/data/mockData.ts` | **Create new file** |
| 43+ untracked page files | Extract inline mock data, import from centralized location |
| 8+ committed page files | Extract inline mock data, import from centralized location |
