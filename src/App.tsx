// ABOUTME: This is the root component of the application.
// ABOUTME: It sets up the main router and global context providers.

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import StaffListPage from './pages/administration/StaffListPage'; 
import ClassesPage from './pages/academics/ClassesPage'; // Corrected Path

// Moved Pages: Updated Imports
import StudentsListPage from './pages/administration/StudentsListPage'; 
import StudentDetailPage from './pages/administration/students/StudentDetailPage';
import StudentFinancialDashboardPage from './pages/administration/students/StudentFinancialDashboardPage';
import SubjectsPage from './pages/academics/SubjectsPage';


import FinanceDashboardPage from './pages/finance/FinanceDashboardPage'; 
import LibraryDashboardPage from './pages/library/LibraryDashboardPage'; 
import InventoryDashboardPage from './pages/inventory/InventoryDashboardPage'; 
import { UserProvider } from './contexts/UserContext';
import { AppDataProvider } from '@/contexts/AppDataContext'; 

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

import allModules from './modules/moduleDefinitions';
import { Suspense, lazy } from 'react';

const dynamicPageImport = (path: string) => {
  // This function dynamically imports a page component based on the path
  // Assumes all pages are under ./pages/ and follow the folder structure
  return lazy(() => import(`./pages${path}`));
};

const generateModuleRoutes = () => {
  return allModules.flatMap(module =>
    module.navigation.map(nav => {
      const PageComponent = dynamicPageImport(nav.path.replace(module.path, `/${module.id}`));
      return <Route key={nav.path} path={nav.path} element={<Suspense fallback={<div>Loading...</div>}><PageComponent /></Suspense>} />;
    })
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <AppDataProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Dynamically generated module routes */}
              {generateModuleRoutes()}
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AppDataProvider>
    </UserProvider>
  );
};

export default App;
