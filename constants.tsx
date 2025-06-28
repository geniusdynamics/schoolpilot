
import React from 'react';
import { NavItem } from './types';
import {
  HomeIcon,
  UsersIcon, // Students
  UserGroupIcon, // Staff, Clubs, Student Categories, Teacher Assignments
  AcademicCapIcon, // Classes, Academics (main)
  BookOpenIcon, // Subjects, Library Books, Account Ledger
  CogIcon, // Settings (main), Effect Fees
  ArchiveIcon, // Inventory (main)
  CurrencyDollarIcon, // Finance (main), Expenses, Student Financials, Fee Collection
  LibraryIcon, // Library (main)
  BeakerIcon, // Academics (alt)
  ChartPieIcon, // Exam Sessions, Exam Analysis, Procurement Dashboard
  DocumentReportIcon, // Reports (main)
  BuildingOffice2Icon, // Departments
  IdentificationIcon, // Designations, School Profile
  ListBulletIcon,     // Student Categories (alt), Results Entry, Payroll Item Types, Item Categories (Inv), Book Categories (Lib), Meal Plans (Nutr)
  BuildingLibraryIcon, // Dormitories
  ClipboardDocumentListIcon, // Student Health, Consumption Log (Nutr)
  CalendarDaysIcon,   // Attendance, Academic Periods, Payroll Periods
  EnvelopeIcon,       // Communication Templates
  MegaphoneIcon,      // Message Campaigns
  ShieldCheckIcon,    // Grading Schemes
  TableCellsIcon,     // Timetable, Stock Levels
  BanknotesIcon,      // Banks
  CircleStackIcon,    // Chart of Accounts
  ReceiptPercentIcon, // Fee Adjustments
  ReceiptRefundIcon, // Student Payments, Customer Invoices, Supplier Invoices, General Receipts
  TruckIcon, // Transport
  BuildingStorefrontIcon, // Suppliers, Merchants, Vendor Portal
  BriefcaseIcon, // HR (main)
  WalletIcon, // Payroll, Student Wallet
  ScaleIcon, // Payslips
  CubeIcon, // Inventory Items, Fixed Assets
  CubeTransparentIcon, // Warehouses
  QueueListIcon, // Requisitions
  ShoppingCartIcon, // Purchases
  SparklesIcon, // Fines (Lib)
  CakeIcon, // Meal Plans, Menus, Nutrition (main)
  CreditCardIcon, // Student Wallet (alt)
  ArrowsRightLeftIcon, // Workflows, Stock Issuance, Book Loans
  ClockIcon, // Audit Log, Timetable Periods
  PuzzlePieceIcon, // Academic Structures
  ViewColumnsIcon, // Reports (alt)
  TicketIcon, // Fee Structures, Fee Templates
  UserCircleIcon, // For Partners
  MenuIcon, // For responsive sidebar toggle,
  DocumentDuplicateIcon, // For Academic Period Definitions (placeholder)
} from './components/ui/icons';

export const APP_NAME = "SchoolPilot";
export const MOCK_API_DELAY = 300; // milliseconds

export const NAVIGATION_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <HomeIcon /> },
  {
    name: 'Administration',
    path: '/administration/dashboard',
    icon: <CogIcon />,
    isGroup: true,
    modulePath: '/administration',
    children: [
      { name: 'Admin Dashboard', path: '/administration/dashboard', icon: <CogIcon /> },
      { name: 'Students', path: '/administration/students', icon: <UsersIcon /> },
      { name: 'Staff', path: '/administration/staff', icon: <UserGroupIcon /> },
      { name: 'Partners', path: '/administration/partners', icon: <UserCircleIcon /> },
      { name: 'Departments', path: '/administration/departments', icon: <BuildingOffice2Icon /> },
      { name: 'Designations', path: '/administration/designations', icon: <IdentificationIcon /> },
      { name: 'Student Categories', path: '/administration/student-categories', icon: <ListBulletIcon /> },
      { name: 'Dormitories', path: '/administration/dormitories', icon: <BuildingLibraryIcon /> },
      { name: 'Clubs & Societies', path: '/administration/clubs', icon: <UserGroupIcon /> },
      { name: 'Customers', path: '/administration/customers', icon: <UsersIcon /> },
      { name: 'Student Health', path: '/administration/student-health', icon: <ClipboardDocumentListIcon /> },
      { name: 'Student Attendance', path: '/administration/student-attendance', icon: <CalendarDaysIcon /> },
      { name: 'Comm Templates', path: '/administration/communication-templates', icon: <EnvelopeIcon /> },
      { name: 'Message Campaigns', path: '/administration/message-campaigns', icon: <MegaphoneIcon /> },
      { name: 'Academic Structures', path: '/administration/academic-structures', icon: <PuzzlePieceIcon /> },
      { name: 'Academic Years', path: '/administration/academic-years', icon: <CalendarDaysIcon /> },
      { name: 'Academic Period Definitions', path: '/administration/academic-period-definitions', icon: <DocumentDuplicateIcon /> },
      { name: 'School Periods', path: '/administration/school-periods', icon: <ClockIcon /> },
    ],
  },
  {
    name: 'Academics',
    path: '/academics/dashboard',
    icon: <AcademicCapIcon />,
    isGroup: true,
    modulePath: '/academics',
    children: [
      { name: 'Academics Dashboard', path: '/academics/dashboard', icon: <BeakerIcon /> },
      { name: 'Subjects', path: '/academics/subjects', icon: <BookOpenIcon /> },
      { name: 'Subject Papers', path: '/academics/subject-papers', icon: <BookOpenIcon /> },
      { name: 'Class Subject Allocations', path: '/academics/class-subject-allocations', icon: <PuzzlePieceIcon /> },
      { name: 'Exam Sessions', path: '/academics/exam-sessions', icon: <ChartPieIcon /> },
      { name: 'Grading Schemes', path: '/academics/grading-schemes', icon: <ShieldCheckIcon /> },
      { name: 'Results Entry', path: '/academics/results-entry', icon: <ListBulletIcon /> },
      { name: 'Timetable Periods', path: '/academics/timetable-periods', icon: <ClockIcon /> },
      { name: 'Timetable Entries', path: '/academics/timetable-entries', icon: <TableCellsIcon /> },
      { name: 'Teacher Assignments', path: '/academics/teacher-assignments', icon: <UserGroupIcon /> },
      { name: 'Student Enrollments', path: '/academics/student-enrollments', icon: <UsersIcon /> },
      { name: 'Exam Analysis', path: '/academics/exam-analysis', icon: <ChartPieIcon /> },
    ],
  },
  {
    name: 'Finance',
    path: '/finance/dashboard',
    icon: <CurrencyDollarIcon />,
    isGroup: true,
    modulePath: '/finance',
    children: [
      { name: 'Finance Dashboard', path: '/finance/dashboard', icon: <CurrencyDollarIcon /> },
      { name: 'Banks', path: '/finance/banks', icon: <BanknotesIcon /> },
      { name: 'Chart of Accounts', path: '/finance/chart-of-accounts', icon: <CircleStackIcon /> },
      { name: 'Fee Templates', path: '/finance/fee-templates', icon: <TicketIcon /> },
      { name: 'Effect Fee Structures', path: '/finance/effect-fees', icon: <CogIcon /> },
      { name: 'Student Payments', path: '/finance/student-payments', icon: <ReceiptRefundIcon /> },
      { name: 'Fee Adjustments', path: '/finance/fee-adjustments', icon: <ReceiptPercentIcon /> },
      { name: 'Opening Balances', path: '/finance/opening-balances', icon: <BookOpenIcon /> },
      { name: 'General Receipts', path: '/finance/general-receipts', icon: <ReceiptRefundIcon /> }, 
      { name: 'Customer Invoices', path: '/finance/customer-invoices', icon: <ReceiptRefundIcon /> },
      { name: 'Suppliers', path: '/finance/suppliers', icon: <BuildingStorefrontIcon /> },
      { name: 'Supplier Invoices', path: '/finance/supplier-invoices', icon: <ReceiptRefundIcon /> },
      { name: 'Expenses', path: '/finance/expenses', icon: <CurrencyDollarIcon /> },
      { name: 'Transport Routes', path: '/finance/transport-routes', icon: <TruckIcon /> },
      { name: 'Student Transport', path: '/finance/student-transport', icon: <TruckIcon /> },
    ],
  },
  {
    name: 'Human Resources',
    path: '/hr/dashboard',
    icon: <BriefcaseIcon />,
    isGroup: true,
    modulePath: '/hr',
    children: [
      { name: 'HR Dashboard', path: '/hr/dashboard', icon: <BriefcaseIcon /> },
      { name: 'Payroll Periods', path: '/hr/payroll-periods', icon: <CalendarDaysIcon /> },
      { name: 'Payroll Item Types', path: '/hr/payroll-item-types', icon: <ListBulletIcon /> },
      { name: 'Salary Settings', path: '/hr/salary-settings', icon: <WalletIcon /> },
      { name: 'Payslips', path: '/hr/payslips', icon: <ScaleIcon /> },
    ],
  },
  {
    name: 'Inventory',
    path: '/inventory/dashboard',
    icon: <ArchiveIcon />,
    isGroup: true,
    modulePath: '/inventory',
    children: [
      { name: 'Inventory Dashboard', path: '/inventory/dashboard', icon: <ArchiveIcon /> },
      { name: 'Procurement Dashboard', path: '/inventory/procurement-dashboard', icon: <ChartPieIcon /> },
      { name: 'Vendor Portal', path: '/inventory/vendor-portal', icon: <BuildingStorefrontIcon /> },
      { name: 'Warehouses', path: '/inventory/warehouses', icon: <CubeTransparentIcon /> },
      { name: 'Item Categories', path: '/inventory/item-categories', icon: <ListBulletIcon /> },
      { name: 'Items', path: '/inventory/items', icon: <CubeIcon /> },
      { name: 'Fixed Assets', path: '/inventory/fixed-assets', icon: <CubeIcon /> },
      { name: 'Requisitions', path: '/inventory/requisitions', icon: <QueueListIcon /> },
      { name: 'Purchase Orders', path: '/inventory/purchase-orders', icon: <ShoppingCartIcon /> },
      { name: 'Stock Issuance', path: '/inventory/stock-issuance', icon: <ArrowsRightLeftIcon /> },
      { name: 'Stock Levels', path: '/inventory/stock-levels', icon: <TableCellsIcon /> },
    ],
  },
  {
    name: 'Library',
    path: '/library/dashboard',
    icon: <LibraryIcon />,
    isGroup: true,
    modulePath: '/library',
    children: [
      { name: 'Library Dashboard', path: '/library/dashboard', icon: <LibraryIcon /> },
      { name: 'Book Categories', path: '/library/book-categories', icon: <ListBulletIcon /> },
      { name: 'Books', path: '/library/books', icon: <BookOpenIcon /> },
      { name: 'Book Loans', path: '/library/book-loans', icon: <ArrowsRightLeftIcon /> },
      { name: 'Fines', path: '/library/fines', icon: <SparklesIcon /> },
    ],
  },
  {
    name: 'Nutrition & Wallet',
    path: '/nutrition/dashboard',
    icon: <CakeIcon />,
    isGroup: true,
    modulePath: '/nutrition',
    children: [
      { name: 'Nutrition Dashboard', path: '/nutrition/dashboard', icon: <CakeIcon /> },
      { name: 'Meal Plans', path: '/nutrition/meal-plans', icon: <ListBulletIcon /> },
      { name: 'Menus', path: '/nutrition/menus', icon: <CakeIcon /> },
      { name: 'Student Meal Assignments', path: '/nutrition/student-meal-assignments', icon: <UsersIcon /> },
      { name: 'Meal Consumption Log', path: '/nutrition/meal-consumption-log', icon: <ClipboardDocumentListIcon /> },
      { name: 'Merchants', path: '/nutrition/merchants', icon: <BuildingStorefrontIcon /> },
      { name: 'Student Wallet', path: '/nutrition/student-wallet', icon: <WalletIcon /> },
    ],
  },
  {
    name: 'Reports',
    path: '/reports/student-masterlist', // Default to first report
    icon: <DocumentReportIcon />,
    isGroup: true,
    modulePath: '/reports',
    children: [
      { name: 'Student Masterlist', path: '/reports/student-masterlist', icon: <UsersIcon /> },
      { name: 'Exam Results', path: '/reports/exam-results', icon: <ChartPieIcon /> },
      { name: 'Student Financials', path: '/reports/student-financials', icon: <CurrencyDollarIcon /> },
      { name: 'Votehead Statements', path: '/reports/votehead-statements', icon: <CurrencyDollarIcon /> },
      { name: 'Teacher Assignments', path: '/reports/teacher-assignments', icon: <UserGroupIcon /> },
      { name: 'Account Ledger', path: '/reports/account-ledger', icon: <BookOpenIcon /> },
      { name: 'Fee Collection', path: '/reports/fee-collection', icon: <CurrencyDollarIcon /> },
    ],
  },
   {
    name: 'Settings',
    path: '/settings', 
    icon: <CogIcon />,
    isGroup: true,
    modulePath: '/settings',
    children: [
      { name: 'General Settings', path: '/settings', icon: <CogIcon /> }, // Main settings landing
      { name: 'School Profile', path: '/settings/school-profile', icon: <IdentificationIcon /> },
      { name: 'User Management', path: '/settings/users', icon: <UserGroupIcon /> },
      { name: 'Workflows', path: '/settings/workflows', icon: <ArrowsRightLeftIcon /> },
      { name: 'Audit Log', path: '/settings/audit-log', icon: <ClockIcon /> },
    ],
  },
];