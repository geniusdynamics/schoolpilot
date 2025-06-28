
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import StaffListPage from './pages/administration/StaffListPage'; 
import ClassesPage from './pages/ClassesPage';

// Moved Pages: Updated Imports
import StudentsListPage from './pages/administration/StudentsListPage'; 
import StudentDetailPage from './pages/administration/students/StudentDetailPage';
import StudentFinancialDashboardPage from './pages/administration/students/StudentFinancialDashboardPage';
import SubjectsPage from './pages/academics/SubjectsPage';


import FinancePage from './pages/finance/FinanceDashboardPage'; 
import LibraryPage from './pages/library/LibraryDashboardPage'; 
import InventoryPage from './pages/inventory/InventoryDashboardPage'; 
import { UserProvider } from './contexts/UserContext';
import { AppDataProvider } from './contexts/AppDataContext'; 

// ADMINISTRATION IMPORTS
import AdministrationDashboardPage from './pages/administration/AdministrationDashboardPage';
import PartnersPage from './pages/administration/PartnersPage';
import DepartmentsPage from './pages/administration/DepartmentsPage';
import DesignationsPage from './pages/administration/DesignationsPage';
import StudentCategoriesPage from './pages/administration/StudentCategoriesPage';
import DormitoriesPage from './pages/administration/DormitoriesPage';
import ClubsPage from './pages/administration/ClubsPage';
import CustomersPage from './pages/administration/CustomersPage';
import StudentHealthRecordsPage from './pages/administration/StudentHealthRecordsPage';
import StudentAttendancePage from './pages/administration/StudentAttendancePage';
import CommunicationTemplatesPage from './pages/administration/CommunicationTemplatesPage';
import MessageCampaignsPage from './pages/administration/MessageCampaignsPage';
import AcademicStructurePage from './pages/administration/AcademicStructurePage';
import AcademicYearsPage from './pages/administration/AcademicYearsPage';
import SchoolPeriodsPage from './pages/administration/SchoolPeriodsPage';
import AcademicPeriodDefinitionsPage from './pages/administration/AcademicPeriodDefinitionsPage';


// ACADEMICS IMPORTS
import AcademicsDashboardPage from './pages/academics/AcademicsDashboardPage';
import ExamSessionsPage from './pages/academics/ExamSessionsPage';
import SubjectPapersManagementPage from './pages/academics/SubjectPapersManagementPage';
import GradingSchemesPage from './pages/academics/GradingSchemesPage';
import StudentExamResultsEntryPage from './pages/academics/StudentExamResultsEntryPage';
import TimetablePeriodsPage from './pages/academics/TimetablePeriodsPage';
import TimetableEntriesPage from './pages/academics/TimetableEntriesPage';
import ClassSubjectAllocationsPage from './pages/academics/ClassSubjectAllocationsPage'; 
import TeacherSubjectAssignmentPage from './pages/academics/TeacherSubjectAssignmentPage';
import StudentSubjectEnrollmentPage from './pages/academics/StudentSubjectEnrollmentPage';
import ExamAnalysisPage from './pages/academics/ExamAnalysisPage';


// FINANCE IMPORTS
import BanksPage from './pages/finance/BanksPage';
import ChartOfAccountsPage from './pages/finance/ChartOfAccountsPage';
import CustomerInvoicesPage from './pages/finance/CustomerInvoicesPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import FeeAdjustmentsPage from './pages/finance/FeeAdjustmentsPage';
import StudentOpeningBalancesPage from './pages/finance/StudentOpeningBalancesPage';
import StudentPaymentsPage from './pages/finance/StudentPaymentsPage';
import FeeTemplatesPage from './pages/finance/FeeTemplatesPage';
import EffectFeeStructuresPage from './pages/finance/EffectFeeStructuresPage';
import TransportRoutesPage from './pages/finance/TransportRoutesPage';
import StudentTransportAssignmentsPage from './pages/finance/StudentTransportAssignmentsPage';
import SuppliersPage from './pages/finance/SuppliersPage';
import SupplierInvoicesPage from './pages/finance/SupplierInvoicesPage';
import GeneralReceiptsPage from './pages/finance/GeneralReceiptsPage'; 


// HR IMPORTS
import HRDashboardPage from './pages/hr/HRDashboardPage';
import PayrollPeriodsPage from './pages/hr/PayrollPeriodsPage';
import PayrollItemTypesPage from './pages/hr/PayrollItemTypesPage';
import StaffSalarySettingsPage from './pages/hr/StaffSalarySettingsPage';
import PayslipsPage from './pages/hr/PayslipsPage';


// INVENTORY IMPORTS
import WarehousesPage from './pages/inventory/WarehousesPage';
import ItemCategoriesPage from './pages/inventory/ItemCategoriesPage';
import ItemsPage from './pages/inventory/ItemsPage';
import FixedAssetsPage from './pages/inventory/FixedAssetsPage';
import RequisitionsPage from './pages/inventory/RequisitionsPage';
import PurchaseOrdersPage from './pages/inventory/PurchaseOrdersPage';
import StockIssuancePage from './pages/inventory/StockIssuancePage';
import StockLevelsPage from './pages/inventory/StockLevelsPage';
import SchoolProcurementDashboardPage from './pages/inventory/SchoolProcurementDashboardPage';
import VendorPortalDashboardPage from './pages/inventory/VendorPortalDashboardPage';


// LIBRARY IMPORTS
import BookCategoriesPage from './pages/library/BookCategoriesPage';
import BooksPage from './pages/library/BooksPage';
import BookLoansPage from './pages/library/BookLoansPage';
import FinesPage from './pages/library/FinesPage';


// NUTRITION & WALLET IMPORTS
import NutritionDashboardPage from './pages/nutrition/NutritionDashboardPage';
import MealPlansPage from './pages/nutrition/MealPlansPage';
import MenusPage from './pages/nutrition/MenusPage';
import StudentMealAssignmentsPage from './pages/nutrition/StudentMealAssignmentsPage';
import MealConsumptionLogPage from './pages/nutrition/MealConsumptionLogPage';
import MerchantsPage from './pages/nutrition/MerchantsPage';
import StudentWalletPage from './pages/nutrition/StudentWalletPage';


// REPORTS IMPORTS
import StudentMasterlistPage from './pages/reports/StudentMasterlistPage';
import ExamResultsHorizontalPage from './pages/reports/ExamResultsHorizontalPage';
import StudentFinancialSummaryPage from './pages/reports/StudentFinancialSummaryPage';
import StudentVoteheadStatementPage from './pages/reports/StudentVoteheadStatementPage';
import TeacherAssignmentsPage from './pages/reports/TeacherAssignmentsPage';
import AccountLedgerPage from './pages/reports/AccountLedgerPage';
import FeeCollectionSummaryPage from './pages/reports/FeeCollectionSummaryPage';

// SETTINGS IMPORTS
import SettingsSchoolProfilePage from './pages/settings/SettingsSchoolProfilePage';
import SettingsUsersPage from './pages/settings/SettingsUsersPage';
import SettingsWorkflowsPage from './pages/settings/SettingsWorkflowsPage';
import SettingsAuditLogPage from './pages/settings/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import DatabaseSettingsPage from './pages/settings/DatabaseSettingsPage';


const App: React.FC = () => {
  return (
    <UserProvider>
      <AppDataProvider> 
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Top Level Quick Access (still exist, but also nested for clarity) */}
              <Route path="/staff" element={<StaffListPage />} /> 
              <Route path="/classes" element={<ClassesPage />} /> 

              {/* ADMINISTRATION MODULE */}
              <Route path="/administration" element={<Navigate to="/administration/dashboard" replace />} />
              <Route path="/administration/dashboard" element={<AdministrationDashboardPage />} />
              <Route path="/administration/students" element={<StudentsListPage />} /> 
              <Route path="/administration/students/:studentId" element={<StudentDetailPage />} /> 
              <Route path="/administration/students/:studentId/financials" element={<StudentFinancialDashboardPage />} /> 
              <Route path="/administration/staff" element={<StaffListPage />} />
              <Route path="/administration/partners" element={<PartnersPage />} />
              <Route path="/administration/departments" element={<DepartmentsPage />} />
              <Route path="/administration/designations" element={<DesignationsPage />} />
              <Route path="/administration/student-categories" element={<StudentCategoriesPage />} />
              <Route path="/administration/dormitories" element={<DormitoriesPage />} />
              <Route path="/administration/clubs" element={<ClubsPage />} />
              <Route path="/administration/customers" element={<CustomersPage />} />
              <Route path="/administration/student-health" element={<StudentHealthRecordsPage />} />
              <Route path="/administration/student-attendance" element={<StudentAttendancePage />} />
              <Route path="/administration/communication-templates" element={<CommunicationTemplatesPage />} />
              <Route path="/administration/message-campaigns" element={<MessageCampaignsPage />} />
              <Route path="/administration/academic-structures" element={<AcademicStructurePage />} />
              <Route path="/administration/academic-years" element={<AcademicYearsPage />} />
              <Route path="/administration/school-periods" element={<SchoolPeriodsPage />} />
              <Route path="/administration/academic-period-definitions" element={<AcademicPeriodDefinitionsPage />} />


              {/* ACADEMICS MODULE */}
              <Route path="/academics" element={<Navigate to="/academics/dashboard" replace />} />
              <Route path="/academics/dashboard" element={<AcademicsDashboardPage />} />
              <Route path="/academics/subjects" element={<SubjectsPage />} /> 
              <Route path="/academics/subject-papers" element={<SubjectPapersManagementPage />} />
              <Route path="/academics/class-subject-allocations" element={<ClassSubjectAllocationsPage />} /> 
              <Route path="/academics/exam-sessions" element={<ExamSessionsPage />} />
              <Route path="/academics/grading-schemes" element={<GradingSchemesPage />} />
              <Route path="/academics/results-entry" element={<StudentExamResultsEntryPage />} />
              <Route path="/academics/timetable-periods" element={<TimetablePeriodsPage />} />
              <Route path="/academics/timetable-entries" element={<TimetableEntriesPage />} />
              <Route path="/academics/teacher-assignments" element={<TeacherSubjectAssignmentPage />} />
              <Route path="/academics/student-enrollments" element={<StudentSubjectEnrollmentPage />} />
              <Route path="/academics/exam-analysis" element={<ExamAnalysisPage />} />
              

              {/* FINANCE MODULE */}
              <Route path="/finance" element={<Navigate to="/finance/dashboard" replace />} />
              <Route path="/finance/dashboard" element={<FinancePage />} />
              <Route path="/finance/banks" element={<BanksPage />} />
              <Route path="/finance/chart-of-accounts" element={<ChartOfAccountsPage />} />
              <Route path="/finance/customer-invoices" element={<CustomerInvoicesPage />} />
              <Route path="/finance/expenses" element={<ExpensesPage />} />
              <Route path="/finance/fee-adjustments" element={<FeeAdjustmentsPage />} />
              <Route path="/finance/opening-balances" element={<StudentOpeningBalancesPage />} />
              <Route path="/finance/student-payments" element={<StudentPaymentsPage />} />
              <Route path="/finance/fee-templates" element={<FeeTemplatesPage />} />
              <Route path="/finance/effect-fees" element={<EffectFeeStructuresPage />} />
              <Route path="/finance/transport-routes" element={<TransportRoutesPage />} />
              <Route path="/finance/student-transport" element={<StudentTransportAssignmentsPage />} />
              <Route path="/finance/suppliers" element={<SuppliersPage />} />
              <Route path="/finance/supplier-invoices" element={<SupplierInvoicesPage />} />
              <Route path="/finance/general-receipts" element={<GeneralReceiptsPage />} /> 
            

              {/* HR MODULE */}
              <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
              <Route path="/hr/dashboard" element={<HRDashboardPage />} />
              <Route path="/hr/payroll-periods" element={<PayrollPeriodsPage />} />
              <Route path="/hr/payroll-item-types" element={<PayrollItemTypesPage />} />
              <Route path="/hr/salary-settings" element={<StaffSalarySettingsPage />} />
              <Route path="/hr/payslips" element={<PayslipsPage />} />


              {/* INVENTORY MODULE */}
              <Route path="/inventory" element={<Navigate to="/inventory/dashboard" replace />} />
              <Route path="/inventory/dashboard" element={<InventoryPage />} /> 
              <Route path="/inventory/procurement-dashboard" element={<SchoolProcurementDashboardPage />} />
              <Route path="/inventory/vendor-portal" element={<VendorPortalDashboardPage />} />
              <Route path="/inventory/warehouses" element={<WarehousesPage />} />
              <Route path="/inventory/item-categories" element={<ItemCategoriesPage />} />
              <Route path="/inventory/items" element={<ItemsPage />} />
              <Route path="/inventory/fixed-assets" element={<FixedAssetsPage />} />
              <Route path="/inventory/requisitions" element={<RequisitionsPage />} />
              <Route path="/inventory/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/inventory/stock-issuance" element={<StockIssuancePage />} />
              <Route path="/inventory/stock-levels" element={<StockLevelsPage />} />
              

              {/* LIBRARY MODULE */}
              <Route path="/library" element={<Navigate to="/library/dashboard" replace />} />
              <Route path="/library/dashboard" element={<LibraryPage />} />
              <Route path="/library/book-categories" element={<BookCategoriesPage />} />
              <Route path="/library/books" element={<BooksPage />} />
              <Route path="/library/book-loans" element={<BookLoansPage />} />
              <Route path="/library/fines" element={<FinesPage />} />


              {/* NUTRITION & WALLET MODULE */}
              <Route path="/nutrition" element={<Navigate to="/nutrition/dashboard" replace />} />
              <Route path="/nutrition/dashboard" element={<NutritionDashboardPage />} />
              <Route path="/nutrition/meal-plans" element={<MealPlansPage />} />
              <Route path="/nutrition/menus" element={<MenusPage />} />
              <Route path="/nutrition/student-meal-assignments" element={<StudentMealAssignmentsPage />} />
              <Route path="/nutrition/meal-consumption-log" element={<MealConsumptionLogPage />} />
              <Route path="/nutrition/merchants" element={<MerchantsPage />} />
              <Route path="/nutrition/student-wallet" element={<StudentWalletPage />} />
              

              {/* REPORTS MODULE */}
              <Route path="/reports" element={<Navigate to="/reports/student-masterlist" replace />} />
              <Route path="/reports/student-masterlist" element={<StudentMasterlistPage />} />
              <Route path="/reports/exam-results" element={<ExamResultsHorizontalPage />} />
              <Route path="/reports/student-financials" element={<StudentFinancialSummaryPage />} />
              <Route path="/reports/votehead-statements" element={<StudentVoteheadStatementPage />} />
              <Route path="/reports/teacher-assignments" element={<TeacherAssignmentsPage />} />
              <Route path="/reports/account-ledger" element={<AccountLedgerPage />} />
              <Route path="/reports/fee-collection" element={<FeeCollectionSummaryPage />} />

              {/* SETTINGS MODULE */}
              <Route path="/settings" element={<SettingsPage />} /> 
              <Route path="/settings/school-profile" element={<SettingsSchoolProfilePage />} />
              <Route path="/settings/users" element={<SettingsUsersPage />} />
              <Route path="/settings/workflows" element={<SettingsWorkflowsPage />} />
              <Route path="/settings/audit-log" element={<SettingsAuditLogPage />} />
              <Route path="/settings/database" element={<DatabaseSettingsPage />} /> 
              
            </Routes>
          </Layout>
        </HashRouter>
      </AppDataProvider>
    </UserProvider>
  );
};

export default App;