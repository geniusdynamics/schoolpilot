// ABOUTME: Script to validate all routes have corresponding page files
// ABOUTME: Cross-references App.tsx routes with actual filesystem structure

const fs = require('fs');
const path = require('path');

// Expected pages based on App.tsx routes
const expectedPages = {
  root: [
    'DashboardPage.tsx',
    'SettingsPage.tsx'
  ],
  administration: [
    'AdministrationDashboardPage.tsx',
    'StaffListPage.tsx',
    'StudentsListPage.tsx',
    'PartnersPage.tsx',
    'DepartmentsPage.tsx',
    'DesignationsPage.tsx',
    'StudentCategoriesPage.tsx',
    'DormitoriesPage.tsx',
    'ClubsPage.tsx',
    'CustomersPage.tsx',
    'StudentHealthRecordsPage.tsx',
    'StudentAttendancePage.tsx',
    'CommunicationTemplatesPage.tsx',
    'MessageCampaignsPage.tsx',
    'AcademicStructurePage.tsx',
    'AcademicYearsPage.tsx',
    'SchoolPeriodsPage.tsx',
    'AcademicPeriodDefinitionsPage.tsx'
  ],
  'administration/students': [
    'StudentDetailPage.tsx',
    'StudentFinancialDashboardPage.tsx'
  ],
  academics: [
    'AcademicsDashboardPage.tsx',
    'ClassesPage.tsx',
    'SubjectsPage.tsx',
    'ExamSessionsPage.tsx',
    'SubjectPapersManagementPage.tsx',
    'GradingSchemesPage.tsx',
    'StudentExamResultsEntryPage.tsx',
    'TimetablePeriodsPage.tsx',
    'TimetableEntriesPage.tsx',
    'ClassSubjectAllocationsPage.tsx',
    'TeacherSubjectAssignmentPage.tsx',
    'StudentSubjectEnrollmentPage.tsx',
    'ExamAnalysisPage.tsx'
  ],
  finance: [
    'FinanceDashboardPage.tsx',
    'BanksPage.tsx',
    'ChartOfAccountsPage.tsx',
    'CustomerInvoicesPage.tsx',
    'ExpensesPage.tsx',
    'FeeAdjustmentsPage.tsx',
    'StudentOpeningBalancesPage.tsx',
    'StudentPaymentsPage.tsx',
    'FeeTemplatesPage.tsx',
    'EffectFeeStructuresPage.tsx',
    'TransportRoutesPage.tsx',
    'StudentTransportAssignmentsPage.tsx',
    'SuppliersPage.tsx',
    'SupplierInvoicesPage.tsx',
    'GeneralReceiptsPage.tsx'
  ],
  hr: [
    'HRDashboardPage.tsx',
    'PayrollPeriodsPage.tsx',
    'PayrollItemTypesPage.tsx',
    'StaffSalarySettingsPage.tsx',
    'PayslipsPage.tsx'
  ],
  inventory: [
    'InventoryDashboardPage.tsx',
    'SchoolProcurementDashboardPage.tsx',
    'VendorPortalDashboardPage.tsx',
    'WarehousesPage.tsx',
    'ItemCategoriesPage.tsx',
    'ItemsPage.tsx',
    'FixedAssetsPage.tsx',
    'RequisitionsPage.tsx',
    'PurchaseOrdersPage.tsx',
    'StockIssuancePage.tsx',
    'StockLevelsPage.tsx'
  ],
  library: [
    'LibraryDashboardPage.tsx',
    'BookCategoriesPage.tsx',
    'BooksPage.tsx',
    'BookLoansPage.tsx',
    'FinesPage.tsx'
  ],
  nutrition: [
    'NutritionDashboardPage.tsx',
    'MealPlansPage.tsx',
    'MenusPage.tsx',
    'StudentMealAssignmentsPage.tsx',
    'MealConsumptionLogPage.tsx',
    'MerchantsPage.tsx',
    'StudentWalletPage.tsx'
  ],
  reports: [
    'StudentMasterlistPage.tsx',
    'ExamResultsHorizontalPage.tsx',
    'StudentFinancialSummaryPage.tsx',
    'StudentVoteheadStatementPage.tsx',
    'TeacherAssignmentsPage.tsx',
    'AccountLedgerPage.tsx',
    'FeeCollectionSummaryPage.tsx'
  ],
  settings: [
    'SettingsSchoolProfilePage.tsx',
    'SettingsUsersPage.tsx',
    'SettingsWorkflowsPage.tsx',
    'AuditLogPage.tsx',
    'DatabaseSettingsPage.tsx'
  ]
};

function checkPageExists(basePath, relativePath, fileName) {
  const fullPath = path.join(basePath, 'src', 'pages', relativePath, fileName);
  return fs.existsSync(fullPath);
}

function validatePages() {
  const basePath = process.cwd();
  const missing = [];
  const existing = [];

  console.log('=== PAGE VALIDATION REPORT ===\n');

  Object.entries(expectedPages).forEach(([folder, pages]) => {
    console.log(`Checking ${folder.toUpperCase()} module:`);
    
    pages.forEach(page => {
      const exists = checkPageExists(basePath, folder === 'root' ? '' : folder, page);
      if (exists) {
        existing.push(`${folder}/${page}`);
        console.log(`  ✅ ${page}`);
      } else {
        missing.push(`${folder}/${page}`);
        console.log(`  ❌ ${page} - MISSING`);
      }
    });
    console.log('');
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Expected: ${Object.values(expectedPages).flat().length}`);
  console.log(`Existing: ${existing.length}`);
  console.log(`Missing: ${missing.length}`);

  if (missing.length > 0) {
    console.log(`\n=== MISSING PAGES ===`);
    missing.forEach(page => console.log(`  - ${page}`));
  }

  return { existing, missing };
}

// Run validation
validatePages();
