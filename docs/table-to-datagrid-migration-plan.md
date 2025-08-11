# Table to DataGrid Migration Plan

## Overview
This document outlines the migration plan for transitioning all pages from the legacy `Table` component to the modern `DataGrid` component. The new `DataGrid` provides enhanced features including sorting, filtering, selection, pagination, and responsive design.

## Current State Analysis

### Pages Already Using DataGrid (✅ Complete)
1. **CommunicationTemplatesPage** - `src/modules/administration/pages/CommunicationTemplatesPage.tsx`
2. **StudentsListPage** - `src/modules/administration/pages/StudentsListPage.tsx`
3. **StudentWalletPage** - `src/modules/nutrition/pages/StudentWalletPage.tsx`
4. **MealPlansPage** - `src/modules/nutrition/pages/MealPlansPage.tsx`

### Pages Using Legacy Table Component (🔄 Needs Migration)

#### Administration Module (18 pages)
1. `AcademicYearsPage.tsx`
2. `AcademicStructurePage.tsx`
3. `DesignationsPage.tsx`
4. `SchoolPeriodsPage.tsx`
5. `StudentCategoriesPage.tsx`
6. `MessageCampaignsPage.tsx`
7. `StudentFinancialDetailPage.tsx`
8. `DormitoriesPage.tsx`
9. `PartnersPage.tsx`
10. `DepartmentsPage.tsx`
11. `CustomersPage.tsx`
12. `StudentHealthRecordsPage.tsx`
13. `ClubsPage.tsx`
14. `ClassesPage.tsx`
15. `AcademicPeriodDefinitionsPage.tsx`
16. `StudentDetailPage.tsx`
17. `StaffListPage.tsx`
18. `StudentAttendancePage.tsx`

#### Academics Module (9 pages)
1. `SubjectsPage.tsx`
2. `ExamAnalysisPage.tsx`
3. `TeacherSubjectAssignmentPage.tsx`
4. `StudentSubjectEnrollmentPage.tsx`
5. `StudentExamResultsEntryPage.tsx`
6. `ExamSessionsPage.tsx`
7. `ClassSubjectAllocationsPage.tsx`
8. `SubjectPapersManagementPage.tsx`
9. `GradingSchemesPage.tsx`
10. `TimetablePeriodsPage.tsx`

#### Finance Module (11 pages)
1. `ExpensesPage.tsx`
2. `SuppliersPage.tsx`
3. `SupplierInvoicesPage.tsx`
4. `StudentTransportAssignmentsPage.tsx`
5. `FeeCollectionSummaryPage.tsx`
6. `FeeTemplatesPage.tsx`
7. `TransportRoutesPage.tsx`
8. `CustomerInvoicesPage.tsx`
9. `StudentOpeningBalancesPage.tsx`
10. `BanksPage.tsx`
11. `ChartOfAccountsPage.tsx`
12. `GeneralReceiptsPage.tsx`

#### Inventory Module (8 pages)
1. `RequisitionsPage.tsx`
2. `VendorPortalDashboardPage.tsx`
3. `FixedAssetsPage.tsx`
4. `StockIssuancePage.tsx`
5. `ItemCategoriesPage.tsx`
6. `WarehousesPage.tsx`
7. `StockLevelsPage.tsx`
8. `PurchaseOrdersPage.tsx`
9. `ItemsPage.tsx`
10. `SchoolProcurementDashboardPage.tsx`

#### Library Module (4 pages)
1. `BookLoansPage.tsx`
2. `FinesPage.tsx`
3. `BookCategoriesPage.tsx`
4. `BooksPage.tsx`

#### HR Module (4 pages)
1. `StaffSalarySettingsPage.tsx`
2. `PayrollItemTypesPage.tsx`
3. `PayrollPeriodsPage.tsx`
4. `PayslipsPage.tsx`

#### Nutrition Module (3 pages)
1. `MerchantsPage.tsx`
2. `StudentMealAssignmentsPage.tsx`
3. `MenusPage.tsx`
4. `MealConsumptionLogPage.tsx`

#### Reports Module (7 pages)
1. `StudentVoteheadStatementPage.tsx`
2. `TeacherAssignmentsPage.tsx`
3. `FeeCollectionSummaryPage.tsx`
4. `AccountLedgerPage.tsx`
5. `StudentMasterlistPage.tsx`
6. `ExamResultsHorizontalPage.tsx`
7. `StudentFinancialSummaryPage.tsx`

#### Settings Module (4 pages)
1. `ModuleManagementPage.tsx`
2. `SettingsUsersPage.tsx`
3. `AuditLogPage.tsx`
4. `SettingsWorkflowsPage.tsx`
5. `SettingsPage.tsx`

**Total Pages to Migrate: 68 pages**

## Migration Strategy

### Phase 1: High Priority Pages (Administration & Core Academic)
**Target: 2-3 weeks**

#### Week 1: Administration Core (8 pages)
1. `AcademicYearsPage.tsx` - Core academic functionality
2. `ClassesPage.tsx` - Essential for student management
3. `DepartmentsPage.tsx` - Organizational structure
4. `DesignationsPage.tsx` - Staff roles
5. `StudentCategoriesPage.tsx` - Student classification
6. `DormitoriesPage.tsx` - Student housing
7. `SchoolPeriodsPage.tsx` - Academic periods
8. `AcademicStructurePage.tsx` - Academic framework

#### Week 2: Academic Core (6 pages)
1. `SubjectsPage.tsx` - Core academic subjects
2. `ClassSubjectAllocationsPage.tsx` - Subject assignments
3. `TeacherSubjectAssignmentPage.tsx` - Teacher assignments
4. `ExamSessionsPage.tsx` - Examination management
5. `GradingSchemesPage.tsx` - Assessment framework
6. `TimetablePeriodsPage.tsx` - Schedule management

#### Week 3: Finance Core (6 pages)
1. `FeeTemplatesPage.tsx` - Fee structure
2. `ChartOfAccountsPage.tsx` - Financial framework
3. `BanksPage.tsx` - Banking setup
4. `StudentOpeningBalancesPage.tsx` - Financial records
5. `ExpensesPage.tsx` - Expense tracking
6. `SuppliersPage.tsx` - Vendor management

### Phase 2: Medium Priority Pages (Operational)
**Target: 3-4 weeks**

#### Weeks 4-5: Inventory & Library (12 pages)
- All Inventory module pages (10 pages)
- All Library module pages (4 pages)

#### Weeks 6-7: HR & Nutrition (8 pages)
- All HR module pages (4 pages)
- All Nutrition module pages (4 pages)

### Phase 3: Low Priority Pages (Reports & Settings)
**Target: 2 weeks**

#### Week 8: Reports (7 pages)
- All Reports module pages

#### Week 9: Settings & Remaining (9 pages)
- All Settings module pages (5 pages)
- Remaining Administration pages (4 pages)

## Migration Template

### Step-by-Step Migration Process

#### 1. Import Changes
```typescript
// OLD
import Table from '@/components/ui/Table';

// NEW
import DataGrid from '@/components/ui/data/DataGrid';
import type { DataGridColumn } from '@/components/ui/data/DataGrid';
```

#### 2. Column Definition Migration
```typescript
// OLD Table columns
const columns = [
  { header: 'Name', accessor: 'name' as keyof ItemType },
  { header: 'Status', accessor: 'status' as keyof ItemType },
  {
    header: 'Actions',
    accessor: 'id' as keyof ItemType,
    render: (item: ItemType) => (
      <div className="space-x-2">
        <Button onClick={() => edit(item)}>Edit</Button>
      </div>
    )
  }
];

// NEW DataGrid columns
const columns: DataGridColumn<ItemType>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    filterable: true
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (value, row) => (
      <span className={`px-2 py-1 rounded ${getStatusColor(value)}`}>
        {value}
      </span>
    )
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (_, row) => (
      <div className="space-x-2">
        <Button onClick={() => edit(row)}>Edit</Button>
      </div>
    )
  }
];
```

#### 3. Component Usage Migration
```typescript
// OLD
<Table
  columns={columns}
  data={data}
  isLoading={loading}
  emptyStateMessage="No items found"
/>

// NEW
<DataGrid
  columns={columns}
  data={data}
  loading={loading}
  sortable={true}
  filterable={true}
  selectable={false}
  emptyState={
    <div className="text-center py-8">
      <p className="text-gray-500">No items found</p>
    </div>
  }
  className="mt-4"
/>
```

### Enhanced Features to Implement

#### 1. Sorting
```typescript
const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

const handleSort = (key: string, direction: 'asc' | 'desc') => {
  setSortConfig({ key, direction });
  // Implement sorting logic or pass to backend
};
```

#### 2. Filtering
```typescript
const [filters, setFilters] = useState<Record<string, string>>({});

const handleFilter = (newFilters: Record<string, string>) => {
  setFilters(newFilters);
  // Implement filtering logic
};
```

#### 3. Selection (where applicable)
```typescript
const [selectedItems, setSelectedItems] = useState<ItemType[]>([]);

const handleSelectionChange = (selected: ItemType[]) => {
  setSelectedItems(selected);
  // Handle bulk operations
};
```

#### 4. Pagination (for large datasets)
```typescript
const [pagination, setPagination] = useState({
  page: 1,
  pageSize: 10,
  total: 0
});
```

## Benefits of Migration

### User Experience Improvements
1. **Enhanced Sorting** - Click column headers to sort data
2. **Advanced Filtering** - Filter data by multiple criteria
3. **Bulk Selection** - Select multiple items for batch operations
4. **Responsive Design** - Better mobile and tablet experience
5. **Loading States** - Improved loading indicators and skeleton screens
6. **Empty States** - Better messaging when no data is available

### Developer Experience Improvements
1. **Type Safety** - Better TypeScript support
2. **Consistent API** - Standardized props across all tables
3. **Extensibility** - Easy to add new features
4. **Performance** - Optimized rendering for large datasets
5. **Accessibility** - Better screen reader support

## Risk Assessment

### Low Risk Pages
- Simple data display pages
- Pages with basic CRUD operations
- Pages with minimal custom rendering

### Medium Risk Pages
- Pages with complex custom cell rendering
- Pages with nested data structures
- Pages with custom sorting/filtering logic

### High Risk Pages
- Pages with heavily customized table behavior
- Pages with complex state management
- Pages with performance-critical requirements

## Testing Strategy

### For Each Migrated Page
1. **Functional Testing**
   - Verify all data displays correctly
   - Test sorting functionality
   - Test filtering functionality
   - Test selection (if applicable)
   - Test responsive behavior

2. **Visual Testing**
   - Compare before/after screenshots
   - Verify consistent styling
   - Test on different screen sizes

3. **Performance Testing**
   - Measure rendering performance
   - Test with large datasets
   - Monitor memory usage

## Success Metrics

1. **Completion Rate** - 100% of identified pages migrated
2. **Performance** - No regression in page load times
3. **User Feedback** - Positive feedback on new features
4. **Bug Reports** - Minimal post-migration issues
5. **Code Quality** - Improved maintainability scores

## Conclusion

This migration will significantly improve the user experience across all data-heavy pages in the application while providing a more maintainable and consistent codebase for developers. The phased approach ensures minimal disruption to ongoing development while prioritizing the most critical pages first.

**Estimated Total Effort: 8-9 weeks**
**Estimated Pages per Week: 7-8 pages**
**Total Pages to Migrate: 68 pages**