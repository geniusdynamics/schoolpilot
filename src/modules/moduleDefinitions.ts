// ABOUTME: Module definitions for all existing modules
// ABOUTME: This file defines the structure and navigation for each module in the system

import { ModuleDefinition } from '../core/types';
import {
  HomeIcon,
  UsersIcon, 
  UserGroupIcon, 
  AcademicCapIcon, 
  BookOpenIcon, 
  CogIcon, 
  ArchiveIcon, 
  CurrencyDollarIcon, 
  LibraryIcon, 
  BeakerIcon, 
  ChartPieIcon, 
  DocumentReportIcon, 
  BuildingOffice2Icon, 
  IdentificationIcon, 
  ListBulletIcon,     
  BuildingLibraryIcon, 
  ClipboardDocumentListIcon, 
  CalendarDaysIcon,   
  EnvelopeIcon,       
  MegaphoneIcon,      
  ShieldCheckIcon,    
  TableCellsIcon,     
  BanknotesIcon,      
  CircleStackIcon,    
  ReceiptPercentIcon, 
  ReceiptRefundIcon, 
  TruckIcon, 
  BuildingStorefrontIcon, 
  BriefcaseIcon, 
  WalletIcon, 
  ScaleIcon, 
  CubeIcon, 
  CubeTransparentIcon, 
  QueueListIcon, 
  ShoppingCartIcon, 
  SparklesIcon, 
  CakeIcon, 
  CreditCardIcon, 
  ArrowsRightLeftIcon, 
  ClockIcon, 
  PuzzlePieceIcon, 
  ViewColumnsIcon, 
  TicketIcon, 
  UserCircleIcon, 
  MenuIcon, 
  DocumentDuplicateIcon, 
} from '../components/ui/icons';

// Dashboard Module
export const dashboardModule: ModuleDefinition = {
  id: 'dashboard',
  name: 'navigation:dashboard',
  description: 'navigation:dashboard.description',
  icon: HomeIcon,
  path: '/dashboard',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:dashboard', path: '/dashboard', icon: HomeIcon }
  ],
  features: ['core', 'dashboard', 'overview']
};

// Administration Module
export const administrationModule: ModuleDefinition = {
  id: 'administration',
  name: 'navigation:administration.title',
  description: 'navigation:administration.description',
  icon: AcademicCapIcon,
  path: '/administration',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:administration.dashboard', path: '/administration/dashboard', icon: AcademicCapIcon },
    { name: 'navigation:administration.students', path: '/administration/students', icon: UsersIcon },
    { name: 'navigation:administration.staff', path: '/administration/staff', icon: UserGroupIcon },
    { name: 'navigation:administration.partners', path: '/administration/partners', icon: UserCircleIcon },
    { name: 'navigation:administration.departments', path: '/administration/departments', icon: BuildingOffice2Icon },
    { name: 'navigation:administration.designations', path: '/administration/designations', icon: IdentificationIcon },
    { name: 'navigation:administration.studentCategories', path: '/administration/student-categories', icon: ListBulletIcon },
    { name: 'navigation:administration.dormitories', path: '/administration/dormitories', icon: BuildingLibraryIcon },
    { name: 'navigation:administration.clubs', path: '/administration/clubs', icon: UserGroupIcon },
    { name: 'navigation:administration.customers', path: '/administration/customers', icon: UsersIcon },
    { name: 'navigation:administration.studentHealth', path: '/administration/student-health', icon: ClipboardDocumentListIcon },
    { name: 'navigation:administration.studentAttendance', path: '/administration/student-attendance', icon: CalendarDaysIcon },
    { name: 'navigation:administration.commTemplates', path: '/administration/communication-templates', icon: EnvelopeIcon },
    { name: 'navigation:administration.messageCampaigns', path: '/administration/message-campaigns', icon: MegaphoneIcon },
    { name: 'navigation:administration.academicStructures', path: '/administration/academic-structures', icon: PuzzlePieceIcon },
    { name: 'navigation:administration.academicYears', path: '/administration/academic-years', icon: CalendarDaysIcon },
    { name: 'navigation:administration.academicPeriodDefinitions', path: '/administration/academic-period-definitions', icon: DocumentDuplicateIcon },
    { name: 'navigation:administration.schoolPeriods', path: '/administration/school-periods', icon: ClockIcon },
  ],
  features: ['student-management', 'staff-management', 'academic-structure', 'communication', 'attendance']
};

// Academics Module
export const academicsModule: ModuleDefinition = {
  id: 'academics',
  name: 'navigation:academics.title',
  description: 'navigation:academics.description',
  icon: BookOpenIcon,
  path: '/academics',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration'],
  navigation: [
    { name: 'navigation:academics.dashboard', path: '/academics/dashboard', icon: BookOpenIcon },
    { name: 'navigation:academics.classes', path: '/academics/classes', icon: AcademicCapIcon },
    { name: 'navigation:academics.subjects', path: '/academics/subjects', icon: BookOpenIcon },
    { name: 'navigation:academics.subjectPapers', path: '/academics/subject-papers', icon: BookOpenIcon },
    { name: 'navigation:academics.classSubjectAllocations', path: '/academics/class-subject-allocations', icon: PuzzlePieceIcon },
    { name: 'navigation:academics.examSessions', path: '/academics/exam-sessions', icon: ChartPieIcon },
    { name: 'navigation:academics.gradingSchemes', path: '/academics/grading-schemes', icon: ShieldCheckIcon },
    { name: 'navigation:academics.resultsEntry', path: '/academics/results-entry', icon: ListBulletIcon },
    { name: 'navigation:academics.timetablePeriods', path: '/academics/timetable-periods', icon: ClockIcon },
    { name: 'navigation:academics.timetableEntries', path: '/academics/timetable-entries', icon: TableCellsIcon },
    { name: 'navigation:academics.teacherAssignments', path: '/academics/teacher-assignments', icon: UserGroupIcon },
    { name: 'navigation:academics.studentEnrollments', path: '/academics/student-enrollments', icon: UsersIcon },
    { name: 'navigation:academics.examAnalysis', path: '/academics/exam-analysis', icon: ChartPieIcon },
  ],
  features: ['curriculum-management', 'exam-management', 'timetable', 'results-analysis']
};

// Finance Module
export const financeModule: ModuleDefinition = {
  id: 'finance',
  name: 'navigation:finance.title',
  description: 'navigation:finance.description',
  icon: CurrencyDollarIcon,
  path: '/finance',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration'],
  navigation: [
    { name: 'navigation:finance.dashboard', path: '/finance/dashboard', icon: CurrencyDollarIcon },
    { name: 'navigation:finance.banks', path: '/finance/banks', icon: BanknotesIcon },
    { name: 'navigation:finance.chartOfAccounts', path: '/finance/chart-of-accounts', icon: CircleStackIcon },
    { name: 'navigation:finance.feeTemplates', path: '/finance/fee-templates', icon: TicketIcon },
    { name: 'navigation:finance.effectFeeStructures', path: '/finance/effect-fees', icon: CogIcon },
    { name: 'navigation:finance.studentPayments', path: '/finance/student-payments', icon: ReceiptRefundIcon },
    { name: 'navigation:finance.feeAdjustments', path: '/finance/fee-adjustments', icon: ReceiptPercentIcon },
    { name: 'navigation:finance.openingBalances', path: '/finance/opening-balances', icon: BookOpenIcon },
    { name: 'navigation:finance.generalReceipts', path: '/finance/general-receipts', icon: ReceiptRefundIcon }, 
    { name: 'navigation:finance.customerInvoices', path: '/finance/customer-invoices', icon: ReceiptRefundIcon },
    { name: 'navigation:finance.suppliers', path: '/finance/suppliers', icon: BuildingStorefrontIcon },
    { name: 'navigation:finance.supplierInvoices', path: '/finance/supplier-invoices', icon: ReceiptRefundIcon },
    { name: 'navigation:finance.expenses', path: '/finance/expenses', icon: CurrencyDollarIcon },
    { name: 'navigation:finance.transportRoutes', path: '/finance/transport-routes', icon: TruckIcon },
    { name: 'navigation:finance.studentTransport', path: '/finance/student-transport', icon: TruckIcon },
  ],
  features: ['fee-management', 'accounting', 'payment-processing', 'financial-reporting']
};

// HR Module
export const hrModule: ModuleDefinition = {
  id: 'hr',
  name: 'navigation:hr.title',
  description: 'navigation:hr.description',
  icon: BriefcaseIcon,
  path: '/hr',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration'],
  navigation: [
    { name: 'navigation:hr.dashboard', path: '/hr/dashboard', icon: BriefcaseIcon },
    { name: 'navigation:hr.payrollPeriods', path: '/hr/payroll-periods', icon: CalendarDaysIcon },
    { name: 'navigation:hr.payrollItemTypes', path: '/hr/payroll-item-types', icon: ListBulletIcon },
    { name: 'navigation:hr.salarySettings', path: '/hr/salary-settings', icon: WalletIcon },
    { name: 'navigation:hr.payslips', path: '/hr/payslips', icon: ScaleIcon },
  ],
  features: ['payroll-management', 'staff-compensation', 'hr-reporting']
};

// Inventory Module
export const inventoryModule: ModuleDefinition = {
  id: 'inventory',
  name: 'navigation:inventory.title',
  description: 'navigation:inventory.description',
  icon: ArchiveIcon,
  path: '/inventory',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:inventory.dashboard', path: '/inventory/dashboard', icon: ArchiveIcon },
    { name: 'navigation:inventory.procurementDashboard', path: '/inventory/procurement-dashboard', icon: ChartPieIcon },
    { name: 'navigation:inventory.vendorPortal', path: '/inventory/vendor-portal', icon: BuildingStorefrontIcon },
    { name: 'navigation:inventory.warehouses', path: '/inventory/warehouses', icon: CubeTransparentIcon },
    { name: 'navigation:inventory.itemCategories', path: '/inventory/item-categories', icon: ListBulletIcon },
    { name: 'navigation:inventory.items', path: '/inventory/items', icon: CubeIcon },
    { name: 'navigation:inventory.fixedAssets', path: '/inventory/fixed-assets', icon: CubeIcon },
    { name: 'navigation:inventory.requisitions', path: '/inventory/requisitions', icon: QueueListIcon },
    { name: 'navigation:inventory.purchaseOrders', path: '/inventory/purchase-orders', icon: ShoppingCartIcon },
    { name: 'navigation:inventory.stockIssuance', path: '/inventory/stock-issuance', icon: ArrowsRightLeftIcon },
    { name: 'navigation:inventory.stockLevels', path: '/inventory/stock-levels', icon: TableCellsIcon },
  ],
  features: ['inventory-management', 'procurement', 'asset-tracking', 'stock-control']
};

// Library Module
export const libraryModule: ModuleDefinition = {
  id: 'library',
  name: 'navigation:library.title',
  description: 'navigation:library.description',
  icon: LibraryIcon,
  path: '/library',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:library.dashboard', path: '/library/dashboard', icon: LibraryIcon },
    { name: 'navigation:library.bookCategories', path: '/library/book-categories', icon: ListBulletIcon },
    { name: 'navigation:library.books', path: '/library/books', icon: BookOpenIcon },
    { name: 'navigation:library.bookLoans', path: '/library/book-loans', icon: ArrowsRightLeftIcon },
    { name: 'navigation:library.fines', path: '/library/fines', icon: SparklesIcon },
  ],
  features: ['library-management', 'book-cataloging', 'loan-tracking', 'fine-management']
};

// Nutrition Module
export const nutritionModule: ModuleDefinition = {
  id: 'nutrition',
  name: 'navigation:nutrition.title',
  description: 'navigation:nutrition.description',
  icon: CakeIcon,
  path: '/nutrition',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration'],
  navigation: [
    { name: 'navigation:nutrition.dashboard', path: '/nutrition/dashboard', icon: CakeIcon },
    { name: 'navigation:nutrition.mealPlans', path: '/nutrition/meal-plans', icon: ListBulletIcon },
    { name: 'navigation:nutrition.menus', path: '/nutrition/menus', icon: CakeIcon },
    { name: 'navigation:nutrition.studentMealAssignments', path: '/nutrition/student-meal-assignments', icon: UsersIcon },
    { name: 'navigation:nutrition.mealConsumptionLog', path: '/nutrition/meal-consumption-log', icon: ClipboardDocumentListIcon },
    { name: 'navigation:nutrition.merchants', path: '/nutrition/merchants', icon: BuildingStorefrontIcon },
    { name: 'navigation:nutrition.studentWallet', path: '/nutrition/student-wallet', icon: WalletIcon },
  ],
  features: ['meal-management', 'nutrition-tracking', 'student-wallet', 'vendor-management']
};

// Reports Module
export const reportsModule: ModuleDefinition = {
  id: 'reports',
  name: 'navigation:reports.title',
  description: 'navigation:reports.description',
  icon: DocumentReportIcon,
  path: '/reports',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration', 'academics', 'finance'],
  navigation: [
    { name: 'navigation:reports.accountLedger', path: '/reports/account-ledger', icon: BookOpenIcon },
    { name: 'navigation:reports.examResultsHorizontal', path: '/reports/exam-results-horizontal', icon: ChartPieIcon },
    { name: 'navigation:reports.feeCollectionSummary', path: '/reports/fee-collection-summary', icon: CurrencyDollarIcon },
    { name: 'navigation:reports.studentFinancialSummary', path: '/reports/student-financial-summary', icon: WalletIcon },
    { name: 'navigation:reports.studentMasterlist', path: '/reports/student-masterlist', icon: UsersIcon },
    { name: 'navigation:reports.studentVoteheadStatement', path: '/reports/student-votehead-statement', icon: DocumentReportIcon },
    { name: 'navigation:reports.teacherAssignments', path: '/reports/teacher-assignments', icon: UserGroupIcon },
  ],
  features: ['reporting', 'analytics', 'data-export']
};

// Settings Module
export const settingsModule: ModuleDefinition = {
  id: 'settings',
  name: 'navigation:settings.title',
  description: 'navigation:settings.description',
  icon: CogIcon,
  path: '/settings',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:settings.auditLog', path: '/settings/audit-log', icon: ClockIcon },
    { name: 'navigation:settings.databaseSettings', path: '/settings/database-settings', icon: CogIcon },
    { name: 'navigation:settings.settings', path: '/settings/settings', icon: CogIcon },
    { name: 'navigation:settings.schoolProfile', path: '/settings/school-profile', icon: IdentificationIcon },
    { name: 'navigation:settings.users', path: '/settings/users', icon: UsersIcon },
    { name: 'navigation:settings.workflows', path: '/settings/workflows', icon: ArrowsRightLeftIcon },
  ],
  features: ['system-configuration', 'user-management', 'audit-trail', 'workflow-management'],
  settings: {
    category: 'system',
    items: [
      {
        key: 'theme',
        type: 'select',
        defaultValue: 'dark',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto' }
        ]
      },
      {
        key: 'language',
        type: 'select',
        defaultValue: 'en',
        options: [
          { value: 'en', label: 'English' },
          { value: 'fr', label: 'French' }
        ]
      }
    ]
  }
};

// Export all modules
export const allModules: ModuleDefinition[] = [
  dashboardModule,
  administrationModule,
  academicsModule,
  financeModule,
  hrModule,
  inventoryModule,
  libraryModule,
  nutritionModule,
  reportsModule,
  settingsModule
];

export default allModules; 