
import React, { useState, useEffect, useCallback } from 'react';
import {
  Student, Staff, Class, Subject, User, // Core entities
  PersonGender, StudentStatus, SubjectGrouping, UserType, // Enums
  SchoolPeriod, AcademicYear, StudentCategory, Dormitory, // Supporting adm/core entities
  ParentGuardian, StudentGuardianRelationship, // For student relationships
  ExamResultSummary, // Simplified exam summary for UI
  Role, Department, Designation, ClassStream, AcademicPeriodDefinition, AcademicYearStructure, FinancialYear, FinancialYearStatus,
  ClubAndSociety, ClubType, Customer, GradingScheme, GradingSchemeLevel, Bank, ChartOfAccount, AccountType, AccountTemplateType,
  Supplier, FeeTemplate, FeeTemplateItem, ExpenseCategory, Partner, PartnerType, StudentHealthRecord, StudentAttendance, AttendanceStatus, TimetablePeriodDef,
  ItemInv, ItemTypeInv, ItemCategoryInv, Requisition, RequisitionItem, RequisitionStatus, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, // Inventory specific
  TemplateComm, TemplateType, Campaign, CampaignAudienceType, CampaignStatus, // Communication specific
  StudentDetailProfile, StudentEnrolledSubject, StudentPaymentLogItem, StudentInvoice, InvoiceStatus, // For Student Detail Page
  StudentFinancialSummary, StudentInvoiceChargeItem, StudentPayment, CustomerInvoice, // For Student Financial Dashboard & Customer Invoices
  ClassSubjectAllocation, TeacherSubjectAssignment, StudentSubjectEnrollment, StudentEnrollmentStatus, StudentExamResult, ExamSession, SubjectPaper, // Academics
  ExamSessionStatus, ExamPaperSetting, // Moved here for clarity
  StudentExamResultWithDetails, StudentPaperMark, StudentPaperMarkWithDetails, // Detailed Exam Results
  DayOfWeek, TimetableEntry, // Timetable
  Warehouse, FixedAsset, StockTransaction, StockLevel, StockTransactionType, DepreciationMethod, AssetDepreciationLog, // Inventory specific (newly added focus)
  PayrollPeriod, PayrollPeriodStatus, PayrollItemType, PayrollItemCategory, PayrollTaxImplication, // HR Types Start
  StaffSalarySetting, StaffRecurringItem, Payslip, PayslipItem, PayslipStatus, // HR Types End
  BookCategory, Book, Loan, Fine, BookStatus, FineStatus, // Library Types
  SupplierInvoice, SupplierInvoiceStatus, // Added missing type
  Workflow, MealPlan, Menu, Merchant, AuditLog, // Added for error fixing
  ExpenseClaim, ExpenseClaimantType, FeeAdjustment, FeeAdjustmentType, // Finance related
  TransportRoute, StudentOpeningBalance, OpeningBalanceType, StudentTransportAssignment, TransportAssignmentStatus,
  InvoicePaymentApplication, CustomerInvoiceItem, StudentInvoiceItem
} from '../types';
import { MOCK_API_DELAY } from '../constants';

// Simulating a delay for API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Initial Mock Data based on V10.5 Schema ---
const initialMockAcademicYearStructures: AcademicYearStructure[] = [
    { id: 1, name: 'Standard 3-Term System'},
    { id: 2, name: 'Semester System (2 Semesters)'},
];

const initialMockAcademicPeriodDefinitions: AcademicPeriodDefinition[] = [
  { id: 1, structure_id: 1, name: 'Term 1', sequence_order: 1, structure_name: 'Standard 3-Term System' },
  { id: 2, structure_id: 1, name: 'Term 2', sequence_order: 2, structure_name: 'Standard 3-Term System' },
  { id: 3, structure_id: 1, name: 'Term 3', sequence_order: 3, structure_name: 'Standard 3-Term System' },
  { id: 4, structure_id: 2, name: 'Semester 1', sequence_order: 1, structure_name: 'Semester System (2 Semesters)' },
  { id: 5, structure_id: 2, name: 'Semester 2', sequence_order: 2, structure_name: 'Semester System (2 Semesters)' },
];

const initialMockAcademicYears: AcademicYear[] = [
  { id: 1, name: 'AY 2023/2024', structure_id: 1, start_date: '2023-09-01', end_date: '2024-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
  { id: 2, name: 'AY 2024/2025', structure_id: 1, start_date: '2024-09-01', end_date: '2025-06-30', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), structure_name: 'Standard 3-Term System' },
];

const initialMockFinancialYears: FinancialYear[] = [ 
    { id: 1, name: 'FY 2023', start_date: '2023-07-01', end_date: '2024-06-30', status: FinancialYearStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'FY 2024', start_date: '2024-07-01', end_date: '2025-06-30', status: FinancialYearStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];


const initialMockSchoolPeriods: SchoolPeriod[] = [
  { id: 1, academic_year_id: 1, period_definition_id: 1, financial_year_id: 1, start_date: '2023-09-01', end_date: '2023-12-15', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 1 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 1', financial_year_name: 'FY 2023' },
  { id: 2, academic_year_id: 1, period_definition_id: 2, financial_year_id: 1, start_date: '2024-01-08', end_date: '2024-04-05', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 2 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 2', financial_year_name: 'FY 2023' },
  { id: 3, academic_year_id: 1, period_definition_id: 3, financial_year_id: 1, start_date: '2024-05-06', end_date: '2024-07-26', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 3 - AY 2023/2024', academic_year_name:'AY 2023/2024', period_definition_name: 'Term 3', financial_year_name: 'FY 2023' },
  { id: 4, academic_year_id: 2, period_definition_id: 1, financial_year_id: 2, start_date: '2024-09-01', end_date: '2024-12-15', is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'Term 1 - AY 2024/2025', academic_year_name:'AY 2024/2025', period_definition_name: 'Term 1', financial_year_name: 'FY 2024' },
];

const initialMockDepartments: Department[] = [
    { id: 1, name: 'Academics', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Administration', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Sciences', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Humanities', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: 'Languages', is_academic: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: 'Finance', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, name: 'Human Resources', is_academic: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockDesignations: Designation[] = [
    { id: 1, title: 'Principal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, title: 'Deputy Principal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, title: 'Teacher', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, title: 'Head of Department', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, title: 'Accountant', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, title: 'Secretary', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, title: 'Librarian', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, title: 'Store Keeper', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 9, title: 'HR Manager', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockStaff: Staff[] = [
  { id: 'STF001', user_id: 'USR001', staff_no: 'EMP001', first_name: 'Michael', last_name: 'Scott', department_id: 2, designation_id: 1, is_active: true, phone: '123-456-7890', created_at: '2023-01-01T10:00:00Z', updated_at: '2023-01-01T10:00:00Z', email: 'm.scott@example.com', department_name: 'Administration', designation_title: 'Principal', display_name: 'Michael Scott' },
  { id: 'STF002', user_id: 'USR002', staff_no: 'EMP002', first_name: 'Dwight', last_name: 'Schrute', department_id: 1, designation_id: 3, is_active: true, phone: '123-456-7891', created_at: '2023-01-01T10:00:00Z', updated_at: '2023-01-01T10:00:00Z', email: 'd.schrute@example.com', department_name: 'Academics', designation_title: 'Teacher', hod_of_department_id: 3, hod_of_department_name: 'Sciences', display_name: 'Dwight Schrute' },
  { id: 'STF003', user_id: 'USR003', staff_no: 'EMP003', first_name: 'Pam', last_name: 'Beesly', department_id: 2, designation_id: 6, is_active: true, phone: '123-456-7892', created_at: '2023-01-01T10:00:00Z', updated_at: '2023-01-01T10:00:00Z', email: 'p.beesly@example.com', department_name: 'Administration', designation_title: 'Secretary', display_name: 'Pam Beesly' },
  { id: 'STF004', staff_no: 'EMP004', first_name: 'Angela', last_name: 'Martin', department_id: 6, designation_id: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance', designation_title: 'Accountant', display_name: 'Angela Martin' },
  { id: 'STF005', staff_no: 'EMP005', first_name: 'Kevin', last_name: 'Malone', department_id: 1, designation_id: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Kevin Malone' },
  { id: 'STF006', staff_no: 'EMP006', first_name: 'Toby', last_name: 'Flenderson', department_id: 7, designation_id: 9, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Human Resources', designation_title: 'HR Manager', display_name: 'Toby Flenderson' },
  { id: 'STF007', staff_no: 'EMP007', first_name: 'Oscar', last_name: 'Martinez', department_id: 6, designation_id: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance', designation_title: 'Accountant', display_name: 'Oscar Martinez', user_id: 'USR007', email: 'o.martinez@example.com'},
  { id: 'STF008', staff_no: 'EMP008', first_name: 'Phyllis', last_name: 'Lapin-Vance', department_id: 1, designation_id: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Phyllis Vance', user_id: 'USR008', email: 'p.vance@example.com' },
  { id: 'STF009', user_id: 'USR009', staff_no: 'EMP009', first_name: 'Erin', last_name: 'Hannon', department_id: 2, designation_id: 6, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), email: 'e.hannon@example.com', department_name: 'Administration', designation_title: 'Secretary', display_name: 'Erin Hannon' },
];

const initialMockStudents: Student[] = [
    { id: 'S001', admission_no: 'ADM001', first_name: 'Jim', last_name: 'Halpert', gender: PersonGender.MALE, current_class_stream_id: 1, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', dormitory_id: 1, dormitory_name: 'Simba House', display_name: 'Jim Halpert' },
    { id: 'S002', admission_no: 'ADM002', first_name: 'Michael', last_name: 'Scofield', gender: PersonGender.MALE, current_class_stream_id: 2, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 1', current_class_stream_name: 'B', student_category_id: 2, student_category_name: 'Day Scholar', display_name: 'Michael Scofield' },
    { id: 'S003', admission_no: 'ADM003', first_name: 'Sara', last_name: 'Tancredi', gender: PersonGender.FEMALE, current_class_stream_id: 3, status: StudentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), current_class_name: 'Form 2', current_class_stream_name: 'A', student_category_id: 1, student_category_name: 'Boarder', display_name: 'Sara Tancredi' },
];

const initialMockClasses: Class[] = [
  { id: 1, name: 'Form 1' },
  { id: 2, name: 'Form 2' },
  { id: 3, name: 'Form 3'},
  { id: 4, name: 'Form 4'},
];

const initialMockClassStreams: ClassStream[] = [
  { id: 1, class_id: 1, name: 'A', class_teacher_id: 'STF002', class_name: 'Form 1', class_teacher_name: 'Dwight Schrute' },
  { id: 2, class_id: 1, name: 'B', class_teacher_id: 'STF005', class_name: 'Form 1', class_teacher_name: 'Kevin Malone' },
  { id: 3, class_id: 2, name: 'A', class_teacher_id: 'STF008', class_name: 'Form 2', class_teacher_name: 'Phyllis Lapin-Vance' },
  { id: 4, class_id: 2, name: 'B', class_teacher_id: 'STF001', class_name: 'Form 2', class_teacher_name: 'Michael Scott' },
  { id: 5, class_id: 3, name: 'North', class_teacher_id: 'STF002', class_name: 'Form 3', class_teacher_name: 'Dwight Schrute'},
  { id: 6, class_id: 4, name: 'East', class_teacher_id: 'STF005', class_name: 'Form 4', class_teacher_name: 'Kevin Malone'},
];
// Update classes with streams
initialMockClasses.forEach(cls => {
    cls.streams = initialMockClassStreams.filter(cs => cs.class_id === cls.id);
});


const initialMockStudentCategories: StudentCategory[] = [
    { id: 1, name: 'Boarder' },
    { id: 2, name: 'Day Scholar' },
    { id: 3, name: 'Special Needs' },
];

const initialMockDormitories: Dormitory[] = [
    { id: 1, name: 'Simba House', master_id: 'STF002', master_name: 'Dwight Schrute', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
    { id: 2, name: 'Twiga Block', master_id: 'STF005', master_name: 'Kevin Malone', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
];

const initialMockSubjects: Subject[] = [
    { id: 1, subject_code: '101', abbreviation: 'ENG', name: 'English', department_id: 5, is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages' },
    { id: 2, subject_code: '102', abbreviation: 'KIS', name: 'Kiswahili', department_id: 5, is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages' },
    { id: 3, subject_code: '121', abbreviation: 'MAT', name: 'Mathematics', department_id: 1, is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Academics' },
    { id: 4, subject_code: '231', abbreviation: 'BIO', name: 'Biology', department_id: 3, grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences' },
    { id: 5, subject_code: '232', abbreviation: 'PHY', name: 'Physics', department_id: 3, grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences' },
    { id: 6, subject_code: '233', abbreviation: 'CHEM', name: 'Chemistry', department_id: 3, grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences' },
];

const initialMockExpenseCategories: ExpenseCategory[] = [
    {id: 1, name: 'Stationery'},
    {id: 2, name: 'Repairs & Maintenance'},
    {id: 3, name: 'Utilities'},
    {id: 4, name: 'Travel'},
    {id: 5, name: 'Staff Welfare'},
];

const initialMockChartOfAccounts: ChartOfAccount[] = [
    { id: 101, account_code: '1001', name: 'School Bank Account', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 102, account_code: '1002', name: 'Petty Cash', type: AccountType.ASSET, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 201, account_code: '2001', name: 'Tuition Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CORE, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 202, account_code: '2002', name: 'Transport Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 301, account_code: '3001', name: 'Salaries Expense', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 5, expense_category_name: 'Staff Welfare', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 302, account_code: '3002', name: 'Stationery Expense', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 1, expense_category_name: 'Stationery', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockBanks: Bank[] = [
    { id: 1, name: 'KCB Bank', account_no: '1234567890', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account' },
    { id: 2, name: 'Equity Bank', account_no: '0987654321', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account' },
];

const initialMockSuppliers: Supplier[] = [
  {id: 1, name: 'Text Book Centre', phone: '0700111222', email: 'sales@textbookcentre.com', address: 'Kijabe Street, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 2, name: 'Savani\'s Bookshop', phone: '0722333444', email: 'info@savanis.co.ke', address: 'Moi Avenue, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockFeeTemplateItems: FeeTemplateItem[] = [
    { id: 'fti1', fee_template_id: 1, description: 'Tuition Fee', amount: 50000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' },
    { id: 'fti2', fee_template_id: 1, description: 'Transport Fee', amount: 10000, revenue_account_id: 202, revenue_account_name: 'Transport Fees Revenue' },
    { id: 'fti3', fee_template_id: 1, description: 'Lunch Program', amount: 7500, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' }, // Example
    { id: 'fti4', fee_template_id: 2, description: 'Boarding Fee', amount: 25000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' },
];

const initialMockFeeTemplates: FeeTemplate[] = [
    { id: 1, name: 'Day Scholars - Term 1 (2024)', school_period_id: 2, student_category_id: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 2 - AY 2023/2024', student_category_name: 'Day Scholar', items: initialMockFeeTemplateItems.filter(item => item.fee_template_id === 1) },
    { id: 2, name: 'Boarders - Term 1 (2024)', school_period_id: 2, student_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 2 - AY 2023/2024', student_category_name: 'Boarder', items: initialMockFeeTemplateItems.filter(item => item.fee_template_id === 2) },
];

const initialMockExpenseClaims: ExpenseClaim[] = [
    { id: 'EXP001', claimant_type: ExpenseClaimantType.STAFF, claimant_id: 'STF001', claim_date: '2024-07-15', description: 'Travel allowance for workshop', amount: 5000, expense_category_id: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Michael Scott', expense_category_name: 'Travel' },
    { id: 'EXP002', claimant_type: ExpenseClaimantType.STAFF, claimant_id: 'STF002', claim_date: '2024-07-20', description: 'Purchase of office stationery', amount: 1500, expense_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Dwight Schrute', expense_category_name: 'Stationery' },
];


// Helper to create loading states for all entities
type LoadingStates = {
  all: boolean;
  students: boolean; staff: boolean; classes: boolean; subjects: boolean; users: boolean;
  departments: boolean; designations: boolean; studentCategories: boolean; dormitories: boolean;
  academicYears: boolean; schoolPeriods: boolean; academicYearStructures: boolean; academicPeriodDefinitions: boolean;
  financialYears: boolean;
  classStreams: boolean; parentsGuardians: boolean; studentGuardianRelationships: boolean;
  studentClassHistory: boolean;
  partners: boolean;
  clubs: boolean;
  customers: boolean;
  studentHealthRecords: boolean;
  healthIncidentReports: boolean;
  disciplinaryRecords: boolean;
  studentAttendance: boolean;
  timetablePeriodDefs: boolean;
  templatesComm: boolean;
  campaigns: boolean;
  subjectPapers: boolean;
  examSessions: boolean;
  examPaperSettings: boolean;
  gradingSchemes: boolean;
  chartOfAccounts: boolean;
  banks: boolean;
  suppliers: boolean;
  feeTemplates: boolean;
  expenseCategories: boolean;
  supplierInvoices: boolean;
  studentExamResults: boolean;
  classSubjectAllocations: boolean;
  teacherSubjectAssignments: boolean;
  studentSubjectEnrollments: boolean;
  timetableEntries: boolean;
  warehouses: boolean;
  itemCategoriesInv: boolean;
  itemsInv: boolean;
  fixedAssets: boolean;
  requisitions: boolean;
  purchaseOrders: boolean;
  stockLevels: boolean;
  stockTransactions: boolean;
  payrollPeriods: boolean;
  payrollItemTypes: boolean;
  staffSalarySettings: boolean;
  payslips: boolean;
  bookCategories: boolean;
  books: boolean;
  loans: boolean;
  fines: boolean;
  customerInvoices: boolean; 
  workflows: boolean; 
  mealPlans: boolean; 
  menus: boolean; 
  merchants: boolean; 
  auditLogs: boolean; 
  expenseClaims: boolean; // Added
  studentOpeningBalances: boolean; // Added
  feeAdjustments: boolean; // Added
  transportRoutes: boolean; // Added
  studentTransportAssignments: boolean; // Added
  studentInvoices: boolean; // Added
  studentInvoiceItems: boolean; // Added
  studentPayments: boolean; // Added
  invoicePaymentApplications: boolean; // Added
};


const createLoadingStates = (): LoadingStates => ({
  all: true, students: true, staff: true, classes: true, subjects: true, users: true,
  departments: true, designations: true, studentCategories: true, dormitories: true,
  academicYears: true, schoolPeriods: true, academicYearStructures: true, academicPeriodDefinitions: true,
  financialYears: true,
  classStreams: true, parentsGuardians: true, studentGuardianRelationships: true,
  studentClassHistory: true, 
  partners: true, 
  clubs: true, 
  customers: true, 
  studentHealthRecords: true, 
  healthIncidentReports: true, 
  disciplinaryRecords: true, 
  studentAttendance: true, 
  timetablePeriodDefs: true, 
  templatesComm: true, 
  campaigns: true, 
  subjectPapers: true,
  examSessions: true,
  examPaperSettings: true,
  gradingSchemes: true,
  chartOfAccounts: true,
  banks: true,
  suppliers: true,
  feeTemplates: true,
  expenseCategories: true,
  supplierInvoices: true,
  studentExamResults: true,
  classSubjectAllocations: true,
  teacherSubjectAssignments: true,
  studentSubjectEnrollments: true,
  timetableEntries: true,
  warehouses: true,
  itemCategoriesInv: true,
  itemsInv: true,
  fixedAssets: true,
  requisitions: true,
  purchaseOrders: true,
  stockLevels: true,
  stockTransactions: true,
  payrollPeriods: true,
  payrollItemTypes: true,
  staffSalarySettings: true,
  payslips: true,
  bookCategories: true,
  books: true,
  loans: true,
  fines: true,
  customerInvoices: true, 
  workflows: true, 
  mealPlans: true, 
  menus: true, 
  merchants: true, 
  auditLogs: true, 
  expenseClaims: true, // Added
  studentOpeningBalances: true, // Added
  feeAdjustments: true, // Added
  transportRoutes: true, // Added
  studentTransportAssignments: true, // Added
  studentInvoices: true, // Added
  studentInvoiceItems: true, // Added
  studentPayments: true, // Added
  invoicePaymentApplications: true, // Added
});


export const useMockData = () => {
  // State for all entities
  const [students, setStudents] = useState<Student[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]); // Renamed to avoid conflict
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(initialMockSubjects);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>(initialMockDepartments);
  const [designations, setDesignations] = useState<Designation[]>(initialMockDesignations);
  const [studentCategories, setStudentCategories] = useState<StudentCategory[]>(initialMockStudentCategories);
  const [dormitories, setDormitories] = useState<Dormitory[]>(initialMockDormitories);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialMockAcademicYears);
  const [schoolPeriods, setSchoolPeriods] = useState<SchoolPeriod[]>(initialMockSchoolPeriods);
  const [academicYearStructures, setAcademicYearStructures] = useState<AcademicYearStructure[]>(initialMockAcademicYearStructures);
  const [academicPeriodDefinitions, setAcademicPeriodDefinitions] = useState<AcademicPeriodDefinition[]>(initialMockAcademicPeriodDefinitions);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(initialMockFinancialYears);
  const [classStreams, setClassStreams] = useState<ClassStream[]>(initialMockClassStreams);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(initialMockChartOfAccounts);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(initialMockExpenseCategories);
  const [banks, setBanks] = useState<Bank[]>(initialMockBanks);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialMockSuppliers);
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>(initialMockFeeTemplates);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>(initialMockExpenseClaims); // Added state for expenseClaims

  const [loading, setLoading] = useState<LoadingStates>(createLoadingStates());
  
  // Initial data (this is a simplified version of what would be in the full file)
   const rawInitialData = {
    initialMockStudents: initialMockStudents, 
    initialMockStaff: initialMockStaff,
    initialMockClasses: initialMockClasses,
    initialMockSubjects: initialMockSubjects,
    initialMockUsers: [] as User[],
    initialMockDepartments: initialMockDepartments,
    initialMockDesignations: initialMockDesignations,
    initialMockStudentCategories: initialMockStudentCategories,
    initialMockDormitories: initialMockDormitories,
    initialMockAcademicYears: initialMockAcademicYears,
    initialMockSchoolPeriods: initialMockSchoolPeriods,
    initialMockAcademicYearStructures: initialMockAcademicYearStructures,
    initialMockAcademicPeriodDefinitions: initialMockAcademicPeriodDefinitions,
    initialMockFinancialYears: initialMockFinancialYears,
    initialMockClassStreams: initialMockClassStreams,
    initialMockPartners: [] as Partner[],
    initialMockClubs: [] as ClubAndSociety[],
    initialMockCustomers: [] as Customer[],
    initialMockStudentHealthRecords: [] as StudentHealthRecord[],
    initialMockStudentAttendance: [] as StudentAttendance[],
    initialMockTimetablePeriodDefs: [] as TimetablePeriodDef[],
    initialMockTemplatesComm: [] as TemplateComm[],
    initialMockCampaigns: [] as Campaign[],
    initialMockSubjectPapers: [] as SubjectPaper[],
    initialMockExamSessions: [] as ExamSession[],
    initialMockExamPaperSettings: [] as ExamPaperSetting[],
    initialMockGradingSchemes: [] as GradingScheme[],
    initialMockChartOfAccounts: initialMockChartOfAccounts,
    initialMockBanks: initialMockBanks,
    initialMockSuppliers: initialMockSuppliers,
    initialMockFeeTemplates: initialMockFeeTemplates,
    initialMockExpenseCategories: initialMockExpenseCategories,
    initialMockSupplierInvoices: [] as SupplierInvoice[],
    initialMockStudentExamResults: [] as StudentExamResultWithDetails[],
    initialMockClassSubjectAllocations: [] as ClassSubjectAllocation[],
    initialMockTeacherSubjectAssignments: [] as TeacherSubjectAssignment[],
    initialMockStudentSubjectEnrollments: [] as StudentSubjectEnrollment[],
    initialMockTimetableEntries: [] as TimetableEntry[],
    initialMockWarehouses: [] as Warehouse[],
    initialMockItemCategoriesInv: [] as ItemCategoryInv[],
    initialMockItemsInv: [] as ItemInv[],
    initialMockFixedAssets: [] as FixedAsset[],
    initialMockRequisitions: [] as Requisition[],
    initialMockPurchaseOrders: [] as PurchaseOrder[],
    initialMockStockLevels: [] as StockLevel[],
    initialMockStockTransactions: [] as StockTransaction[],
    initialMockPayrollPeriods: [] as PayrollPeriod[],
    initialMockPayrollItemTypes: [] as PayrollItemType[],
    initialMockStaffSalarySettings: [] as StaffSalarySetting[],
    initialMockPayslips: [] as Payslip[],
    initialMockBookCategories: [] as BookCategory[],
    initialMockBooks: [] as Book[],
    initialMockLoans: [] as Loan[],
    initialMockFines: [] as Fine[],
    initialMockParentsGuardians: [] as ParentGuardian[],
    initialMockCustomerInvoices: [] as CustomerInvoice[], 
    initialMockWorkflows: [] as Workflow[], 
    initialMockMealPlans: [] as MealPlan[], 
    initialMockMenus: [] as Menu[], 
    initialMockMerchants: [] as Merchant[], 
    initialMockAuditLogs: [] as AuditLog[], 
    initialMockExpenseClaims: initialMockExpenseClaims, // Added
    initialMockStudentOpeningBalances: [] as StudentOpeningBalance[],
    initialMockFeeAdjustments: [] as FeeAdjustment[],
    initialMockTransportRoutes: [] as TransportRoute[],
    initialMockStudentTransportAssignments: [] as StudentTransportAssignment[],
    initialMockStudentInvoices: [] as StudentInvoice[],
    initialMockStudentInvoiceItems: [] as StudentInvoiceItem[],
    initialMockStudentPayments: [] as StudentPayment[],
    initialMockInvoicePaymentApplications: [] as InvoicePaymentApplication[],
  };


  useEffect(() => {
    const loadAllData = async () => {
      console.log("useMockData: Starting to load mock data...");
      setLoading(createLoadingStates()); 

      await delay(MOCK_API_DELAY);
      
      setStudents(rawInitialData.initialMockStudents);
      setStaffList(rawInitialData.initialMockStaff); 
      setClasses(rawInitialData.initialMockClasses);
      setSubjects(rawInitialData.initialMockSubjects);
      setUsers(rawInitialData.initialMockUsers);
      setDepartments(rawInitialData.initialMockDepartments);
      setDesignations(rawInitialData.initialMockDesignations);
      setStudentCategories(rawInitialData.initialMockStudentCategories);
      setDormitories(rawInitialData.initialMockDormitories);
      setAcademicYears(rawInitialData.initialMockAcademicYears);
      setSchoolPeriods(rawInitialData.initialMockSchoolPeriods);
      setAcademicYearStructures(rawInitialData.initialMockAcademicYearStructures);
      setAcademicPeriodDefinitions(rawInitialData.initialMockAcademicPeriodDefinitions);
      setFinancialYears(rawInitialData.initialMockFinancialYears);
      setClassStreams(rawInitialData.initialMockClassStreams);
      setChartOfAccounts(rawInitialData.initialMockChartOfAccounts);
      setExpenseCategories(rawInitialData.initialMockExpenseCategories);
      setBanks(rawInitialData.initialMockBanks);
      setSuppliers(rawInitialData.initialMockSuppliers);
      setFeeTemplates(rawInitialData.initialMockFeeTemplates);
      setExpenseClaims(rawInitialData.initialMockExpenseClaims); // Set expense claims


      setLoading(prev => {
        const allFalseLoadingStates = Object.keys(prev).reduce((acc, key) => {
          acc[key as keyof LoadingStates] = false;
          return acc;
        }, {} as LoadingStates);
        allFalseLoadingStates.all = false; 
        console.log("useMockData: Mock data loading complete. Loading states set to false.");
        return allFalseLoadingStates;
      });
    };

    loadAllData().catch(error => {
        console.error("useMockData: Error during mock data loading:", error);
    });
  }, []); 

  const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>, guardianData?: any) => { /* ... */ return {} as Student; }, []);
  const updateStudent = useCallback(async (updatedStudentData: Student, guardianData?: any): Promise<StudentDetailProfile> => { /* ... */ return {} as StudentDetailProfile; }, []);
  const deleteStudent = useCallback(async (studentId: string) => { /* ... */ }, []);
  const addStaffMember = useCallback(async (staffData: Omit<Staff, 'id'|'created_at'|'updated_at'>) => { /* ... */ return {} as Staff; }, []);
  const updateStaffMember = useCallback(async (updatedStaffData: Staff) => { /* ... */ return {} as Staff; }, []);
  const deleteStaffMember = useCallback(async (staffId: string) => { /* ... */ }, []);
  const getStudentDetailsById = useCallback(async (studentId: string): Promise<StudentDetailProfile | null> => { /* ... */ return null; }, [students]);
  const getStudentFinancialDetailsById = useCallback(async (studentId: string): Promise<StudentDetailProfile | null> => { /* ... */ return null; }, [students]);

  const addChartOfAccount = useCallback(async (data: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at' | 'expense_category_name'>) => {
    await delay(MOCK_API_DELAY);
    const newAccount: ChartOfAccount = {
      ...data,
      id: Date.now(), // Simple mock ID
      expense_category_name: data.expense_category_id ? expenseCategories.find(ec => ec.id === data.expense_category_id)?.name : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setChartOfAccounts(prev => [...prev, newAccount]);
    return newAccount;
  }, [expenseCategories]);

  const updateChartOfAccount = useCallback(async (updatedAccount: ChartOfAccount) => {
    await delay(MOCK_API_DELAY);
    const accountToUpdate = {
        ...updatedAccount, 
        expense_category_name: updatedAccount.expense_category_id ? expenseCategories.find(ec => ec.id === updatedAccount.expense_category_id)?.name : undefined,
        updated_at: new Date().toISOString()
    };
    setChartOfAccounts(prev => prev.map(acc => acc.id === accountToUpdate.id ? accountToUpdate : acc));
    return accountToUpdate;
  }, [expenseCategories]);

  const deleteChartOfAccount = useCallback(async (accountId: number) => {
    await delay(MOCK_API_DELAY);
    setChartOfAccounts(prev => prev.filter(acc => acc.id !== accountId));
  }, []);
  
  const addBank = useCallback(async (data: Omit<Bank, 'id' | 'created_at' | 'updated_at' | 'gl_account_name'>) => {
    await delay(MOCK_API_DELAY);
    const newBank: Bank = {
      ...data,
      id: Date.now(),
      gl_account_name: chartOfAccounts.find(coa => coa.id === data.gl_account_id)?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setBanks(prev => [...prev, newBank]);
    return newBank;
  }, [chartOfAccounts]);

  const updateBank = useCallback(async (updatedBank: Bank) => {
    await delay(MOCK_API_DELAY);
    const bankToUpdate = {
        ...updatedBank,
        gl_account_name: chartOfAccounts.find(coa => coa.id === updatedBank.gl_account_id)?.name,
        updated_at: new Date().toISOString()
    };
    setBanks(prev => prev.map(b => b.id === bankToUpdate.id ? bankToUpdate : b));
    return bankToUpdate;
  }, [chartOfAccounts]);

  const deleteBank = useCallback(async (bankId: number) => {
    await delay(MOCK_API_DELAY);
    setBanks(prev => prev.filter(b => b.id !== bankId));
  }, []);

  const addSupplier = useCallback(async (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    await delay(MOCK_API_DELAY);
    const newSupplier: Supplier = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSuppliers(prev => [...prev, newSupplier]);
    return newSupplier;
  }, []);

  const updateSupplier = useCallback(async (updatedSupplier: Supplier) => {
    await delay(MOCK_API_DELAY);
    const supplierToUpdate = {...updatedSupplier, updated_at: new Date().toISOString()};
    setSuppliers(prev => prev.map(s => s.id === supplierToUpdate.id ? supplierToUpdate : s));
    return supplierToUpdate;
  }, []);

  const deleteSupplier = useCallback(async (supplierId: number) => {
    await delay(MOCK_API_DELAY);
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
  }, []);

  const addFeeTemplate = useCallback(async (data: Omit<FeeTemplate, 'id'|'created_at'|'updated_at'|'items'|'school_period_name'|'student_category_name'> & {items: FeeTemplateItem[]}) => {
    await delay(MOCK_API_DELAY);
    const newTemplate: FeeTemplate = {
      ...data,
      id: Date.now(),
      school_period_name: schoolPeriods.find(sp => sp.id === data.school_period_id)?.name,
      student_category_name: data.student_category_id ? studentCategories.find(sc => sc.id === data.student_category_id)?.name : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setFeeTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, [schoolPeriods, studentCategories]);

  const updateFeeTemplate = useCallback(async (updatedTemplate: FeeTemplate) => {
    await delay(MOCK_API_DELAY);
    const templateToUpdate = {
        ...updatedTemplate,
        school_period_name: schoolPeriods.find(sp => sp.id === updatedTemplate.school_period_id)?.name,
        student_category_name: updatedTemplate.student_category_id ? studentCategories.find(sc => sc.id === updatedTemplate.student_category_id)?.name : undefined,
        updated_at: new Date().toISOString()
    };
    setFeeTemplates(prev => prev.map(ft => ft.id === templateToUpdate.id ? templateToUpdate : ft));
    return templateToUpdate;
  }, [schoolPeriods, studentCategories]);

  const deleteFeeTemplate = useCallback(async (templateId: number) => {
    await delay(MOCK_API_DELAY);
    setFeeTemplates(prev => prev.filter(ft => ft.id !== templateId));
  }, []);

  const addExpenseClaim = useCallback(async (data: Omit<ExpenseClaim, 'id'|'created_at'|'updated_at'|'claimant_name'|'expense_category_name'>) => {
    await delay(MOCK_API_DELAY);
    let claimantName = 'N/A';
    if (data.claimant_type === ExpenseClaimantType.STAFF) {
      const staffMember = staffList.find(s => s.id === data.claimant_id);
      if (staffMember) claimantName = `${staffMember.first_name} ${staffMember.last_name}`;
    } else if (data.claimant_type === ExpenseClaimantType.STUDENT) {
      const studentMember = students.find(s => s.id === data.claimant_id);
      if (studentMember) claimantName = `${studentMember.first_name} ${studentMember.last_name}`;
    }
    const newClaim: ExpenseClaim = {
      ...data,
      id: `EXP${Date.now()}`,
      claimant_name: claimantName,
      expense_category_name: expenseCategories.find(ec => ec.id === data.expense_category_id)?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setExpenseClaims(prev => [...prev, newClaim]);
    return newClaim;
  }, [staffList, students, expenseCategories]);

  const updateExpenseClaim = useCallback(async (updatedClaim: ExpenseClaim) => {
    await delay(MOCK_API_DELAY);
    let claimantName = updatedClaim.claimant_name;
     if (updatedClaim.claimant_type === ExpenseClaimantType.STAFF) {
      const staffMember = staffList.find(s => s.id === updatedClaim.claimant_id);
      if (staffMember) claimantName = `${staffMember.first_name} ${staffMember.last_name}`;
    } else if (updatedClaim.claimant_type === ExpenseClaimantType.STUDENT) {
      const studentMember = students.find(s => s.id === updatedClaim.claimant_id);
      if (studentMember) claimantName = `${studentMember.first_name} ${studentMember.last_name}`;
    }
    const claimToUpdate = {
        ...updatedClaim,
        claimant_name: claimantName,
        expense_category_name: expenseCategories.find(ec => ec.id === updatedClaim.expense_category_id)?.name,
        updated_at: new Date().toISOString()
    };
    setExpenseClaims(prev => prev.map(ec => ec.id === claimToUpdate.id ? claimToUpdate : ec));
    return claimToUpdate;
  }, [staffList, students, expenseCategories]);

  const deleteExpenseClaim = useCallback(async (claimId: string) => {
    await delay(MOCK_API_DELAY);
    setExpenseClaims(prev => prev.filter(ec => ec.id !== claimId));
  }, []);


  const unimplementedAsync = async (..._args: any[]): Promise<any> => { console.warn("Mock function not implemented yet."); return null; };
  const unimplementedSync = (..._args: any[]): any[] => { console.warn("Mock getter not implemented yet."); return []; };

  return {
    students, staff: staffList, classes, subjects, users, departments, designations, studentCategories,
    dormitories, academicYears, schoolPeriods, academicYearStructures, academicPeriodDefinitions,
    financialYears, classStreams, chartOfAccounts, expenseCategories, banks, suppliers, feeTemplates,
    expenseClaims, // Added expenseClaims to return
    
    partners: rawInitialData.initialMockPartners, 
    clubs: rawInitialData.initialMockClubs,
    customers: rawInitialData.initialMockCustomers,
    studentHealthRecords: rawInitialData.initialMockStudentHealthRecords,
    studentAttendance: rawInitialData.initialMockStudentAttendance,
    timetablePeriodDefs: rawInitialData.initialMockTimetablePeriodDefs,
    templatesComm: rawInitialData.initialMockTemplatesComm,
    campaigns: rawInitialData.initialMockCampaigns,
    subjectPapers: rawInitialData.initialMockSubjectPapers,
    examSessions: rawInitialData.initialMockExamSessions,
    examPaperSettings: rawInitialData.initialMockExamPaperSettings,
    gradingSchemes: rawInitialData.initialMockGradingSchemes,
    supplierInvoices: rawInitialData.initialMockSupplierInvoices,
    studentExamResults: rawInitialData.initialMockStudentExamResults,
    classSubjectAllocations: rawInitialData.initialMockClassSubjectAllocations,
    teacherSubjectAssignments: rawInitialData.initialMockTeacherSubjectAssignments,
    studentSubjectEnrollments: rawInitialData.initialMockStudentSubjectEnrollments,
    timetableEntries: rawInitialData.initialMockTimetableEntries,
    warehouses: rawInitialData.initialMockWarehouses,
    itemCategoriesInv: rawInitialData.initialMockItemCategoriesInv,
    itemsInv: rawInitialData.initialMockItemsInv,
    fixedAssets: rawInitialData.initialMockFixedAssets,
    requisitions: rawInitialData.initialMockRequisitions,
    purchaseOrders: rawInitialData.initialMockPurchaseOrders,
    stockLevels: rawInitialData.initialMockStockLevels,
    stockTransactions: rawInitialData.initialMockStockTransactions,
    payrollPeriods: rawInitialData.initialMockPayrollPeriods,
    payrollItemTypes: rawInitialData.initialMockPayrollItemTypes,
    staffSalarySettings: rawInitialData.initialMockStaffSalarySettings,
    payslips: rawInitialData.initialMockPayslips,
    bookCategories: rawInitialData.initialMockBookCategories,
    books: rawInitialData.initialMockBooks,
    loans: rawInitialData.initialMockLoans,
    fines: rawInitialData.initialMockFines,
    parentsGuardians: rawInitialData.initialMockParentsGuardians,
    customerInvoices: rawInitialData.initialMockCustomerInvoices, 
    workflows: rawInitialData.initialMockWorkflows, 
    mealPlans: rawInitialData.initialMockMealPlans, 
    menus: rawInitialData.initialMockMenus, 
    merchants: rawInitialData.initialMockMerchants, 
    auditLogs: rawInitialData.initialMockAuditLogs, 
    studentOpeningBalances: rawInitialData.initialMockStudentOpeningBalances,
    feeAdjustments: rawInitialData.initialMockFeeAdjustments,
    transportRoutes: rawInitialData.initialMockTransportRoutes,
    studentTransportAssignments: rawInitialData.initialMockStudentTransportAssignments,
    studentInvoices: rawInitialData.initialMockStudentInvoices,
    studentInvoiceItems: rawInitialData.initialMockStudentInvoiceItems,
    studentPayments: rawInitialData.initialMockStudentPayments,
    invoicePaymentApplications: rawInitialData.initialMockInvoicePaymentApplications,


    loading,
    // CRUD operations
    addStudent, updateStudent, deleteStudent,
    addStaffMember, updateStaffMember, deleteStaffMember,
    getStudentDetailsById, getStudentFinancialDetailsById,
    addChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
    addBank, updateBank, deleteBank,
    addSupplier, updateSupplier, deleteSupplier,
    addFeeTemplate, updateFeeTemplate, deleteFeeTemplate,
    addExpenseClaim, updateExpenseClaim, deleteExpenseClaim, // Added expense claim CRUD

    addAcademicYearStructure: useCallback(async (data: Omit<AcademicYearStructure, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newStructure: AcademicYearStructure = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAcademicYearStructures(prev => [...prev, newStructure]);
      return newStructure;
    }, []),
    updateAcademicYearStructure: useCallback(async (updatedStructure: AcademicYearStructure) => {
      await delay(MOCK_API_DELAY);
      const structureToUpdate = { ...updatedStructure, updated_at: new Date().toISOString() };
      setAcademicYearStructures(prev => prev.map(s => s.id === structureToUpdate.id ? structureToUpdate : s));
      return structureToUpdate;
    }, []),
    deleteAcademicYearStructure: useCallback(async (structureId: number) => {
      await delay(MOCK_API_DELAY);
      setAcademicYearStructures(prev => prev.filter(s => s.id !== structureId));
    }, []),
    addAcademicYear: useCallback(async (data: Omit<AcademicYear, 'id' | 'created_at' | 'updated_at' | 'structure_name'>) => {
      await delay(MOCK_API_DELAY);
      const newAcademicYear: AcademicYear = {
        ...data,
        id: Date.now(),
        structure_name: academicYearStructures.find(ays => ays.id === data.structure_id)?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAcademicYears(prev => [...prev, newAcademicYear]);
      return newAcademicYear;
    }, [academicYearStructures]),
    updateAcademicYear: useCallback(async (updatedAcademicYear: AcademicYear) => {
      await delay(MOCK_API_DELAY);
      const academicYearToUpdate = {
        ...updatedAcademicYear,
        structure_name: academicYearStructures.find(ays => ays.id === updatedAcademicYear.structure_id)?.name || '',
        updated_at: new Date().toISOString(),
      };
      setAcademicYears(prev => prev.map(ay => ay.id === academicYearToUpdate.id ? academicYearToUpdate : ay));
      return academicYearToUpdate;
    }, [academicYearStructures]),
    deleteAcademicYear: useCallback(async (academicYearId: number) => {
      await delay(MOCK_API_DELAY);
      setAcademicYears(prev => prev.filter(ay => ay.id !== academicYearId));
    }, []),
    addSchoolPeriod: useCallback(async (data: Omit<SchoolPeriod, 'id' | 'created_at' | 'updated_at' | 'name' | 'academic_year_name' | 'period_definition_name' | 'financial_year_name'>) => {
      await delay(MOCK_API_DELAY);
      const academicYear = academicYears.find(ay => ay.id === data.academic_year_id);
      const periodDefinition = academicPeriodDefinitions.find(apd => apd.id === data.period_definition_id);
      const financialYear = financialYears.find(fy => fy.id === data.financial_year_id);

      const newSchoolPeriod: SchoolPeriod = {
        ...data,
        id: Date.now(),
        name: `${periodDefinition?.name || ''} - ${academicYear?.name || ''}`,
        academic_year_name: academicYear?.name || '',
        period_definition_name: periodDefinition?.name || '',
        financial_year_name: financialYear?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSchoolPeriods(prev => [...prev, newSchoolPeriod]);
      return newSchoolPeriod;
    }, [academicYears, academicPeriodDefinitions, financialYears]),
    updateSchoolPeriod: useCallback(async (updatedSchoolPeriod: SchoolPeriod) => {
      await delay(MOCK_API_DELAY);
      const academicYear = academicYears.find(ay => ay.id === updatedSchoolPeriod.academic_year_id);
      const periodDefinition = academicPeriodDefinitions.find(apd => apd.id === updatedSchoolPeriod.period_definition_id);
      const financialYear = financialYears.find(fy => fy.id === updatedSchoolPeriod.financial_year_id);

      const schoolPeriodToUpdate = {
        ...updatedSchoolPeriod,
        name: `${periodDefinition?.name || ''} - ${academicYear?.name || ''}`,
        academic_year_name: academicYear?.name || '',
        period_definition_name: periodDefinition?.name || '',
        financial_year_name: financialYear?.name || '',
        updated_at: new Date().toISOString(),
      };
      setSchoolPeriods(prev => prev.map(sp => sp.id === schoolPeriodToUpdate.id ? schoolPeriodToUpdate : sp));
      return schoolPeriodToUpdate;
    }, [academicYears, academicPeriodDefinitions, financialYears]),
    deleteSchoolPeriod: useCallback(async (schoolPeriodId: number) => {
      await delay(MOCK_API_DELAY);
      setSchoolPeriods(prev => prev.filter(sp => sp.id !== schoolPeriodId));
    }, []),
    addDepartment: useCallback(async (data: Omit<Department, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newDepartment: Department = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDepartments(prev => [...prev, newDepartment]);
      return newDepartment;
    }, []),
    updateDepartment: useCallback(async (updatedDepartment: Department) => {
      await delay(MOCK_API_DELAY);
      const departmentToUpdate = { ...updatedDepartment, updated_at: new Date().toISOString() };
      setDepartments(prev => prev.map(d => d.id === departmentToUpdate.id ? departmentToUpdate : d));
      return departmentToUpdate;
    }, []),
    deleteDepartment: useCallback(async (departmentId: number) => {
      await delay(MOCK_API_DELAY);
      setDepartments(prev => prev.filter(d => d.id !== departmentId));
    }, []),
    addDesignation: useCallback(async (data: Omit<Designation, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newDesignation: Designation = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDesignations(prev => [...prev, newDesignation]);
      return newDesignation;
    }, []),
    updateDesignation: useCallback(async (updatedDesignation: Designation) => {
      await delay(MOCK_API_DELAY);
      const designationToUpdate = { ...updatedDesignation, updated_at: new Date().toISOString() };
      setDesignations(prev => prev.map(d => d.id === designationToUpdate.id ? designationToUpdate : d));
      return designationToUpdate;
    }, []),
    deleteDesignation: useCallback(async (designationId: number) => {
      await delay(MOCK_API_DELAY);
      setDesignations(prev => prev.filter(d => d.id !== designationId));
    }, []),
    addStudentCategory: useCallback(async (data: Omit<StudentCategory, 'id'>) => {
      await delay(MOCK_API_DELAY);
      const newCategory: StudentCategory = {
        ...data,
        id: Date.now(),
      };
      setStudentCategories(prev => [...prev, newCategory]);
      return newCategory;
    }, []),
    updateStudentCategory: useCallback(async (updatedCategory: StudentCategory) => {
      await delay(MOCK_API_DELAY);
      setStudentCategories(prev => prev.map(sc => sc.id === updatedCategory.id ? updatedCategory : sc));
      return updatedCategory;
    }, []),
    deleteStudentCategory: useCallback(async (categoryId: number) => {
      await delay(MOCK_API_DELAY);
      setStudentCategories(prev => prev.filter(sc => sc.id !== categoryId));
    }, []),
    addDormitory: useCallback(async (data: Omit<Dormitory, 'id' | 'created_at' | 'updated_at' | 'master_name'>) => {
      await delay(MOCK_API_DELAY);
      const master = staffList.find(s => s.id === data.master_id);
      const newDormitory: Dormitory = {
        ...data,
        id: Date.now(),
        master_name: master ? `${master.first_name} ${master.last_name}` : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDormitories(prev => [...prev, newDormitory]);
      return newDormitory;
    }, [staffList]),
    updateDormitory: useCallback(async (updatedDormitory: Dormitory) => {
      await delay(MOCK_API_DELAY);
      const master = staffList.find(s => s.id === updatedDormitory.master_id);
      const dormitoryToUpdate = {
        ...updatedDormitory,
        master_name: master ? `${master.first_name} ${master.last_name}` : undefined,
        updated_at: new Date().toISOString(),
      };
      setDormitories(prev => prev.map(d => d.id === dormitoryToUpdate.id ? dormitoryToUpdate : d));
      return dormitoryToUpdate;
    }, [staffList]),
    deleteDormitory: useCallback(async (dormitoryId: number) => {
      await delay(MOCK_API_DELAY);
      setDormitories(prev => prev.filter(d => d.id !== dormitoryId));
    }, []),
    addPartner: useCallback(async (data: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newPartner: Partner = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPartners(prev => [...prev, newPartner]);
      return newPartner;
    }, []),
    updatePartner: useCallback(async (updatedPartner: Partner) => {
      await delay(MOCK_API_DELAY);
      const partnerToUpdate = { ...updatedPartner, updated_at: new Date().toISOString() };
      setPartners(prev => prev.map(p => p.id === partnerToUpdate.id ? partnerToUpdate : p));
      return partnerToUpdate;
    }, []),
    deletePartner: useCallback(async (partnerId: number) => {
      await delay(MOCK_API_DELAY);
      setPartners(prev => prev.filter(p => p.id !== partnerId));
    }, []),
    addClub: useCallback(async (data: Omit<ClubAndSociety, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newClub: ClubAndSociety = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setClubs(prev => [...prev, newClub]);
      return newClub;
    }, []),
    updateClub: useCallback(async (updatedClub: ClubAndSociety) => {
      await delay(MOCK_API_DELAY);
      const clubToUpdate = { ...updatedClub, updated_at: new Date().toISOString() };
      setClubs(prev => prev.map(c => c.id === clubToUpdate.id ? clubToUpdate : c));
      return clubToUpdate;
    }, []),
    deleteClub: useCallback(async (clubId: number) => {
      await delay(MOCK_API_DELAY);
      setClubs(prev => prev.filter(c => c.id !== clubId));
    }, []),
    addCustomer: useCallback(async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newCustomer: Customer = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCustomers(prev => [...prev, newCustomer]);
      return newCustomer;
    }, []),
    updateCustomer: useCallback(async (updatedCustomer: Customer) => {
      await delay(MOCK_API_DELAY);
      const customerToUpdate = { ...updatedCustomer, updated_at: new Date().toISOString() };
      setCustomers(prev => prev.map(c => c.id === customerToUpdate.id ? customerToUpdate : c));
      return customerToUpdate;
    }, []),
    deleteCustomer: useCallback(async (customerId: number) => {
      await delay(MOCK_API_DELAY);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
    }, []),
    addStudentHealthRecord: useCallback(async (data: Omit<StudentHealthRecord, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newRecord: StudentHealthRecord = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStudentHealthRecords(prev => [...prev, newRecord]);
      return newRecord;
    }, []),
    updateStudentHealthRecord: useCallback(async (updatedRecord: StudentHealthRecord) => {
      await delay(MOCK_API_DELAY);
      const recordToUpdate = { ...updatedRecord, updated_at: new Date().toISOString() };
      setStudentHealthRecords(prev => prev.map(r => r.id === recordToUpdate.id ? recordToUpdate : r));
      return recordToUpdate;
    }, []),
    saveStudentAttendance: useCallback(async (data: StudentAttendance[]) => {
      await delay(MOCK_API_DELAY);
      // In a real scenario, this would update/insert attendance records.
      // For mock, we just acknowledge it.
      console.log("Mock: Saving student attendance", data);
      // Optionally, you could store this in a separate state if needed for display
      return data;
    }, []),
    getStudentAttendanceByFilters: useCallback((filters: { studentId?: string, classStreamId?: number, schoolPeriodId?: number, date?: string }) => {
      console.warn("Mock: getStudentAttendanceByFilters not fully implemented, returning empty array.", filters);
      return [];
    }, []),
    addTimetablePeriodDef: useCallback(async (data: Omit<TimetablePeriodDef, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newDef: TimetablePeriodDef = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTimetablePeriodDefs(prev => [...prev, newDef]);
      return newDef;
    }, []),
    updateTimetablePeriodDef: useCallback(async (updatedDef: TimetablePeriodDef) => {
      await delay(MOCK_API_DELAY);
      const defToUpdate = { ...updatedDef, updated_at: new Date().toISOString() };
      setTimetablePeriodDefs(prev => prev.map(d => d.id === defToUpdate.id ? defToUpdate : d));
      return defToUpdate;
    }, []),
    deleteTimetablePeriodDef: useCallback(async (defId: number) => {
      await delay(MOCK_API_DELAY);
      setTimetablePeriodDefs(prev => prev.filter(d => d.id !== defId));
    }, []),
    addTemplateComm: useCallback(async (data: Omit<TemplateComm, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newTemplate: TemplateComm = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTemplatesComm(prev => [...prev, newTemplate]);
      return newTemplate;
    }, []),
    updateTemplateComm: useCallback(async (updatedTemplate: TemplateComm) => {
      await delay(MOCK_API_DELAY);
      const templateToUpdate = { ...updatedTemplate, updated_at: new Date().toISOString() };
      setTemplatesComm(prev => prev.map(t => t.id === templateToUpdate.id ? templateToUpdate : t));
      return templateToUpdate;
    }, []),
    deleteTemplateComm: useCallback(async (templateId: number) => {
      await delay(MOCK_API_DELAY);
      setTemplatesComm(prev => prev.filter(t => t.id !== templateId));
    }, []),
    addCampaign: useCallback(async (data: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'template_name' | 'created_by_name' | 'approved_by_name' | 'target_audience_display'>) => {
      await delay(MOCK_API_DELAY);
      const newCampaign: Campaign = {
        ...data,
        id: Date.now(),
        template_name: data.template_id ? templatesComm.find(tc => tc.id === data.template_id)?.name : undefined,
        created_by_name: 'Mock User', // Placeholder
        approved_by_name: undefined,
        target_audience_display: data.target_audience_type ? `${data.target_audience_type} - ${data.target_id || 'All'}` : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCampaigns(prev => [...prev, newCampaign]);
      return newCampaign;
    }, [templatesComm]),
    updateCampaign: useCallback(async (updatedCampaign: Campaign) => {
      await delay(MOCK_API_DELAY);
      const campaignToUpdate = {
        ...updatedCampaign,
        template_name: updatedCampaign.template_id ? templatesComm.find(tc => tc.id === updatedCampaign.template_id)?.name : undefined,
        target_audience_display: updatedCampaign.target_audience_type ? `${updatedCampaign.target_audience_type} - ${updatedCampaign.target_id || 'All'}` : undefined,
        updated_at: new Date().toISOString(),
      };
      setCampaigns(prev => prev.map(c => c.id === campaignToUpdate.id ? campaignToUpdate : c));
      return campaignToUpdate;
    }, [templatesComm]),
    deleteCampaign: useCallback(async (campaignId: number) => {
      await delay(MOCK_API_DELAY);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    }, []),
    addSubjectPaper: useCallback(async (data: Omit<SubjectPaper, 'id' | 'created_at' | 'updated_at' | 'subject_name'>) => {
      await delay(MOCK_API_DELAY);
      const subject = subjects.find(s => s.id === data.subject_id);
      const newSubjectPaper: SubjectPaper = {
        ...data,
        id: Date.now(),
        subject_name: subject?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSubjectPapers(prev => [...prev, newSubjectPaper]);
      return newSubjectPaper;
    }, [subjects]),
    updateSubjectPaper: useCallback(async (updatedSubjectPaper: SubjectPaper) => {
      await delay(MOCK_API_DELAY);
      const subject = subjects.find(s => s.id === updatedSubjectPaper.subject_id);
      const subjectPaperToUpdate = {
        ...updatedSubjectPaper,
        subject_name: subject?.name || '',
        updated_at: new Date().toISOString(),
      };
      setSubjectPapers(prev => prev.map(sp => sp.id === subjectPaperToUpdate.id ? subjectPaperToUpdate : sp));
      return subjectPaperToUpdate;
    }, [subjects]),
    deleteSubjectPaper: useCallback(async (subjectPaperId: number) => {
      await delay(MOCK_API_DELAY);
      setSubjectPapers(prev => prev.filter(sp => sp.id !== subjectPaperId));
    }, []),
    addExamSession: useCallback(async (data: Omit<ExamSession, 'id' | 'created_at' | 'updated_at' | 'school_period_name'>) => {
      await delay(MOCK_API_DELAY);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === data.school_period_id);
      const newExamSession: ExamSession = {
        ...data,
        id: Date.now(),
        school_period_name: schoolPeriod?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setExamSessions(prev => [...prev, newExamSession]);
      return newExamSession;
    }, [schoolPeriods]),
    updateExamSession: useCallback(async (updatedExamSession: ExamSession) => {
      await delay(MOCK_API_DELAY);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === updatedExamSession.school_period_id);
      const examSessionToUpdate = {
        ...updatedExamSession,
        school_period_name: schoolPeriod?.name || '',
        updated_at: new Date().toISOString(),
      };
      setExamSessions(prev => prev.map(es => es.id === examSessionToUpdate.id ? examSessionToUpdate : es));
      return examSessionToUpdate;
    }, [schoolPeriods]),
    deleteExamSession: useCallback(async (examSessionId: number) => {
      await delay(MOCK_API_DELAY);
      setExamSessions(prev => prev.filter(es => es.id !== examSessionId));
    }, []),
    addExamPaperSetting: useCallback(async (data: Omit<ExamPaperSetting, 'id' | 'created_at' | 'updated_at' | 'exam_session_name' | 'subject_paper_name' | 'class_stream_name'>) => {
      await delay(MOCK_API_DELAY);
      const examSession = examSessions.find(es => es.id === data.exam_session_id);
      const subjectPaper = subjectPapers.find(sp => sp.id === data.subject_paper_id);
      const classStream = classStreams.find(cs => cs.id === data.class_stream_id);

      const newExamPaperSetting: ExamPaperSetting = {
        ...data,
        id: Date.now(),
        exam_session_name: examSession?.name || '',
        subject_paper_name: subjectPaper?.name || '',
        class_stream_name: classStream ? `${classStream.class_name} ${classStream.name}` : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setExamPaperSettings(prev => [...prev, newExamPaperSetting]);
      return newExamPaperSetting;
    }, [examSessions, subjectPapers, classStreams]),
    updateExamPaperSetting: useCallback(async (updatedExamPaperSetting: ExamPaperSetting) => {
      await delay(MOCK_API_DELAY);
      const examSession = examSessions.find(es => es.id === updatedExamPaperSetting.exam_session_id);
      const subjectPaper = subjectPapers.find(sp => sp.id === updatedExamPaperSetting.subject_paper_id);
      const classStream = classStreams.find(cs => cs.id === updatedExamPaperSetting.class_stream_id);

      const examPaperSettingToUpdate = {
        ...updatedExamPaperSetting,
        exam_session_name: examSession?.name || '',
        subject_paper_name: subjectPaper?.name || '',
        class_stream_name: classStream ? `${classStream.class_name} ${classStream.name}` : '',
        updated_at: new Date().toISOString(),
      };
      setExamPaperSettings(prev => prev.map(eps => eps.id === examPaperSettingToUpdate.id ? examPaperSettingToUpdate : eps));
      return examPaperSettingToUpdate;
    }, [examSessions, subjectPapers, classStreams]),
    deleteExamPaperSetting: useCallback(async (examPaperSettingId: number) => {
      await delay(MOCK_API_DELAY);
      setExamPaperSettings(prev => prev.filter(eps => eps.id !== examPaperSettingId));
    }, []),
    addGradingScheme: useCallback(async (data: Omit<GradingScheme, 'id' | 'created_at' | 'updated_at' | 'levels'> & { levels: GradingSchemeLevel[] }) => {
      await delay(MOCK_API_DELAY);
      const newScheme: GradingScheme = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setGradingSchemes(prev => [...prev, newScheme]);
      return newScheme;
    }, []),
    updateGradingScheme: useCallback(async (updatedScheme: GradingScheme) => {
      await delay(MOCK_API_DELAY);
      const schemeToUpdate = { ...updatedScheme, updated_at: new Date().toISOString() };
      setGradingSchemes(prev => prev.map(gs => gs.id === schemeToUpdate.id ? schemeToUpdate : gs));
      return schemeToUpdate;
    }, []),
    deleteGradingScheme: useCallback(async (schemeId: number) => {
      await delay(MOCK_API_DELAY);
      setGradingSchemes(prev => prev.filter(gs => gs.id !== schemeId));
    }, []),
    getStudentsForExamEntry: useCallback((examSessionId: number, classStreamId: number) => {
      console.warn("Mock: getStudentsForExamEntry not fully implemented, returning filtered students.");
      // Filter students by classStreamId for a more realistic mock
      return students.filter(s => s.current_class_stream_id === classStreamId);
    }, [students]),
    getExamPaperSettingsForSession: useCallback((examSessionId: number, classStreamId: number) => {
      console.warn("Mock: getExamPaperSettingsForSession not fully implemented, returning filtered settings.");
      // Filter exam paper settings by examSessionId and classStreamId
      return examPaperSettings.filter(eps => eps.exam_session_id === examSessionId && eps.class_stream_id === classStreamId);
    }, [examPaperSettings]),
    saveStudentExamResult: useCallback(async (resultData: Omit<StudentExamResult, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newResult: StudentExamResult = {
        ...resultData,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStudentExamResults(prev => [...prev, newResult]);
      return newResult;
    }, []),
    getTimetableEntries: useCallback((classStreamId?: number, teacherId?: string) => {
      console.warn("Mock: getTimetableEntries not fully implemented, returning filtered entries.");
      let filtered = rawInitialData.initialMockTimetableEntries;
      if (classStreamId) {
        filtered = filtered.filter(te => te.class_stream_id === classStreamId);
      }
      if (teacherId) {
        filtered = filtered.filter(te => te.teacher_id === teacherId);
      }
      return filtered;
    }, []),
    addTimetableEntry: useCallback(async (data: Omit<TimetableEntry, 'id' | 'created_at' | 'updated_at' | 'class_stream_name' | 'subject_name' | 'teacher_name' | 'period_name'>) => {
      await delay(MOCK_API_DELAY);
      const classStream = classStreams.find(cs => cs.id === data.class_stream_id);
      const subject = subjects.find(s => s.id === data.subject_id);
      const teacher = staffList.find(s => s.id === data.teacher_id);
      const period = timetablePeriodDefs.find(tpd => tpd.id === data.timetable_period_def_id);

      const newEntry: TimetableEntry = {
        ...data,
        id: Date.now(),
        class_stream_name: classStream ? `${classStream.class_name} ${classStream.name}` : '',
        subject_name: subject?.name || '',
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
        period_name: period?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTimetableEntries(prev => [...prev, newEntry]);
      return newEntry;
    }, [classStreams, subjects, staffList, timetablePeriodDefs]),
    updateTimetableEntry: useCallback(async (updatedEntry: TimetableEntry) => {
      await delay(MOCK_API_DELAY);
      const classStream = classStreams.find(cs => cs.id === updatedEntry.class_stream_id);
      const subject = subjects.find(s => s.id === updatedEntry.subject_id);
      const teacher = staffList.find(s => s.id === updatedEntry.teacher_id);
      const period = timetablePeriodDefs.find(tpd => tpd.id === updatedEntry.timetable_period_def_id);

      const entryToUpdate = {
        ...updatedEntry,
        class_stream_name: classStream ? `${classStream.class_name} ${classStream.name}` : '',
        subject_name: subject?.name || '',
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
        period_name: period?.name || '',
        updated_at: new Date().toISOString(),
      };
      setTimetableEntries(prev => prev.map(te => te.id === entryToUpdate.id ? entryToUpdate : te));
      return entryToUpdate;
    }, [classStreams, subjects, staffList, timetablePeriodDefs]),
    deleteTimetableEntry: useCallback(async (entryId: number) => {
      await delay(MOCK_API_DELAY);
      setTimetableEntries(prev => prev.filter(te => te.id !== entryId));
    }, []),
    addClassSubjectAllocation: useCallback(async (data: Omit<ClassSubjectAllocation, 'id' | 'created_at' | 'updated_at' | 'class_stream_name' | 'subject_name' | 'academic_year_name'>) => {
      await delay(MOCK_API_DELAY);
      const classStream = classStreams.find(cs => cs.id === data.class_stream_id);
      const subject = subjects.find(s => s.id === data.subject_id);
      const academicYear = academicYears.find(ay => ay.id === data.academic_year_id);

      const newAllocation: ClassSubjectAllocation = {
        ...data,
        id: Date.now(),
        class_stream_name: classStream ? `${classStream.class_name} ${classStream.name}` : '',
        subject_name: subject?.name || '',
        academic_year_name: academicYear?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setClassSubjectAllocations(prev => [...prev, newAllocation]);
      return newAllocation;
    }, [classStreams, subjects, academicYears]),
    updateClassSubjectAllocation: useCallback(async (updatedAllocation: ClassSubjectAllocation) => {
      await delay(MOCK_API_DELAY);
      const classStream = classStreams.find(cs => cs.id === updatedAllocation.class_stream_id);
      const subject = subjects.find(s => s.id === updatedAllocation.subject_id);
      const academicYear = academicYears.find(ay => ay.id === updatedAllocation.academic_year_id);

      const allocationToUpdate = {
        ...updatedAllocation,
        class_stream_name: classStream ? `${classStream.class_name} ${classStream.name}` : '',
        subject_name: subject?.name || '',
        academic_year_name: academicYear?.name || '',
        updated_at: new Date().toISOString(),
      };
      setClassSubjectAllocations(prev => prev.map(csa => csa.id === allocationToUpdate.id ? allocationToUpdate : csa));
      return allocationToUpdate;
    }, [classStreams, subjects, academicYears]),
    deleteClassSubjectAllocation: useCallback(async (allocationId: number) => {
      await delay(MOCK_API_DELAY);
      setClassSubjectAllocations(prev => prev.filter(csa => csa.id !== allocationId));
    }, []),
    addTeacherSubjectAssignment: useCallback(async (data: Omit<TeacherSubjectAssignment, 'id' | 'created_at' | 'updated_at' | 'teacher_name' | 'subject_name' | 'class_stream_name' | 'academic_year_name'>) => {
      await delay(MOCK_API_DELAY);
      const teacher = staffList.find(s => s.id === data.teacher_id);
      const subject = subjects.find(s => s.id === data.subject_id);
      const classStream = classStreams.find(cs => cs.id === data.class_stream_id);
      const academicYear = academicYears.find(ay => ay.id === data.academic_year_id);

      const newAssignment: TeacherSubjectAssignment = {
        ...data,
        id: Date.now(),
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : '',
        subject_name: subject?.name || '',
        class_stream_name: classStream ? `${classStream.class_name} ${classStream.name}` : '',
        academic_year_name: academicYear?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTeacherSubjectAssignments(prev => [...prev, newAssignment]);
      return newAssignment;
    }, [staffList, subjects, classStreams, academicYears]),
    deleteTeacherSubjectAssignment: useCallback(async (assignmentId: number) => {
      await delay(MOCK_API_DELAY);
      setTeacherSubjectAssignments(prev => prev.filter(tsa => tsa.id !== assignmentId));
    }, []),
    addStudentSubjectEnrollment: useCallback(async (data: Omit<StudentSubjectEnrollment, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'subject_name' | 'academic_year_name'>) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === data.student_id);
      const subject = subjects.find(s => s.id === data.subject_id);
      const academicYear = academicYears.find(ay => ay.id === data.academic_year_id);

      const newEnrollment: StudentSubjectEnrollment = {
        ...data,
        id: Date.now(),
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        subject_name: subject?.name || '',
        academic_year_name: academicYear?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStudentSubjectEnrollments(prev => [...prev, newEnrollment]);
      return newEnrollment;
    }, [students, subjects, academicYears]),
    updateStudentSubjectEnrollment: useCallback(async (updatedEnrollment: StudentSubjectEnrollment) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === updatedEnrollment.student_id);
      const subject = subjects.find(s => s.id === updatedEnrollment.subject_id);
      const academicYear = academicYears.find(ay => ay.id === updatedEnrollment.academic_year_id);

      const enrollmentToUpdate = {
        ...updatedEnrollment,
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        subject_name: subject?.name || '',
        academic_year_name: academicYear?.name || '',
        updated_at: new Date().toISOString(),
      };
      setStudentSubjectEnrollments(prev => prev.map(sse => sse.id === enrollmentToUpdate.id ? enrollmentToUpdate : sse));
      return enrollmentToUpdate;
    }, [students, subjects, academicYears]),
    deleteStudentSubjectEnrollment: useCallback(async (enrollmentId: number) => {
      await delay(MOCK_API_DELAY);
      setStudentSubjectEnrollments(prev => prev.filter(sse => sse.id !== enrollmentId));
    }, []),
    addWarehouse: useCallback(async (data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newWarehouse: Warehouse = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setWarehouses(prev => [...prev, newWarehouse]);
      return newWarehouse;
    }, []),
    updateWarehouse: useCallback(async (updatedWarehouse: Warehouse) => {
      await delay(MOCK_API_DELAY);
      const warehouseToUpdate = { ...updatedWarehouse, updated_at: new Date().toISOString() };
      setWarehouses(prev => prev.map(w => w.id === warehouseToUpdate.id ? warehouseToUpdate : w));
      return warehouseToUpdate;
    }, []),
    deleteWarehouse: useCallback(async (warehouseId: number) => {
      await delay(MOCK_API_DELAY);
      setWarehouses(prev => prev.filter(w => w.id !== warehouseId));
    }, []),
    addItemCategoryInv: useCallback(async (data: Omit<ItemCategoryInv, 'id'>) => {
      await delay(MOCK_API_DELAY);
      const newCategory: ItemCategoryInv = {
        ...data,
        id: Date.now(),
      };
      setItemCategoriesInv(prev => [...prev, newCategory]);
      return newCategory;
    }, []),
    updateItemCategoryInv: useCallback(async (updatedCategory: ItemCategoryInv) => {
      await delay(MOCK_API_DELAY);
      setItemCategoriesInv(prev => prev.map(ic => ic.id === updatedCategory.id ? updatedCategory : ic));
      return updatedCategory;
    }, []),
    deleteItemCategoryInv: useCallback(async (categoryId: number) => {
      await delay(MOCK_API_DELAY);
      setItemCategoriesInv(prev => prev.filter(ic => ic.id !== categoryId));
    }, []),
    addItemInv: useCallback(async (data: Omit<ItemInv, 'id' | 'created_at' | 'updated_at' | 'category_name'>) => {
      await delay(MOCK_API_DELAY);
      const category = itemCategoriesInv.find(ic => ic.id === data.category_id);
      const newItem: ItemInv = {
        ...data,
        id: Date.now(),
        category_name: category?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setItemsInv(prev => [...prev, newItem]);
      return newItem;
    }, [itemCategoriesInv]),
    updateItemInv: useCallback(async (updatedItem: ItemInv) => {
      await delay(MOCK_API_DELAY);
      const category = itemCategoriesInv.find(ic => ic.id === updatedItem.category_id);
      const itemToUpdate = {
        ...updatedItem,
        category_name: category?.name || '',
        updated_at: new Date().toISOString(),
      };
      setItemsInv(prev => prev.map(item => item.id === itemToUpdate.id ? itemToUpdate : item));
      return itemToUpdate;
    }, [itemCategoriesInv]),
    deleteItemInv: useCallback(async (itemId: number) => {
      await delay(MOCK_API_DELAY);
      setItemsInv(prev => prev.filter(item => item.id !== itemId));
    }, []),
    addFixedAsset: useCallback(async (data: Omit<FixedAsset, 'id' | 'created_at' | 'updated_at' | 'warehouse_name' | 'category_name'>) => {
      await delay(MOCK_API_DELAY);
      const warehouse = warehouses.find(w => w.id === data.warehouse_id);
      const category = itemCategoriesInv.find(ic => ic.id === data.category_id);
      const newAsset: FixedAsset = {
        ...data,
        id: Date.now(),
        warehouse_name: warehouse?.name || '',
        category_name: category?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFixedAssets(prev => [...prev, newAsset]);
      return newAsset;
    }, [warehouses, itemCategoriesInv]),
    updateFixedAsset: useCallback(async (updatedAsset: FixedAsset) => {
      await delay(MOCK_API_DELAY);
      const warehouse = warehouses.find(w => w.id === updatedAsset.warehouse_id);
      const category = itemCategoriesInv.find(ic => ic.id === updatedAsset.category_id);
      const assetToUpdate = {
        ...updatedAsset,
        warehouse_name: warehouse?.name || '',
        category_name: category?.name || '',
        updated_at: new Date().toISOString(),
      };
      setFixedAssets(prev => prev.map(fa => fa.id === assetToUpdate.id ? assetToUpdate : fa));
      return assetToUpdate;
    }, [warehouses, itemCategoriesInv]),
    deleteFixedAsset: useCallback(async (assetId: number) => {
      await delay(MOCK_API_DELAY);
      setFixedAssets(prev => prev.filter(fa => fa.id !== assetId));
    }, []),
    addRequisition: useCallback(async (data: Omit<Requisition, 'id' | 'created_at' | 'updated_at' | 'requested_by_name' | 'approved_by_name' | 'issued_by_name' | 'items'> & { items: RequisitionItem[] }) => {
      await delay(MOCK_API_DELAY);
      const newRequisition: Requisition = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Mocking resolved names - in real app, these would come from user/staff data
        requested_by_name: 'Mock Requester',
        approved_by_name: data.approved_by ? 'Mock Approver' : undefined,
        issued_by_name: data.issued_by ? 'Mock Issuer' : undefined,
      };
      setRequisitions(prev => [...prev, newRequisition]);
      return newRequisition;
    }, []),
    updateRequisition: useCallback(async (updatedRequisition: Requisition) => {
      await delay(MOCK_API_DELAY);
      const requisitionToUpdate = { ...updatedRequisition, updated_at: new Date().toISOString() };
      setRequisitions(prev => prev.map(r => r.id === requisitionToUpdate.id ? requisitionToUpdate : r));
      return requisitionToUpdate;
    }, []),
    deleteRequisition: useCallback(async (requisitionId: number) => {
      await delay(MOCK_API_DELAY);
      setRequisitions(prev => prev.filter(r => r.id !== requisitionId));
    }, []),
    addPurchaseOrder: useCallback(async (data: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'items'> & { items: PurchaseOrderItem[] }) => {
      await delay(MOCK_API_DELAY);
      const supplier = suppliers.find(s => s.id === data.supplier_id);
      const newPO: PurchaseOrder = {
        ...data,
        id: Date.now(),
        supplier_name: supplier?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPurchaseOrders(prev => [...prev, newPO]);
      return newPO;
    }, [suppliers]),
    updatePurchaseOrder: useCallback(async (updatedPO: PurchaseOrder) => {
      await delay(MOCK_API_DELAY);
      const supplier = suppliers.find(s => s.id === updatedPO.supplier_id);
      const poToUpdate = {
        ...updatedPO,
        supplier_name: supplier?.name || '',
        updated_at: new Date().toISOString(),
      };
      setPurchaseOrders(prev => prev.map(po => po.id === poToUpdate.id ? poToUpdate : po));
      return poToUpdate;
    }, [suppliers]),
    deletePurchaseOrder: useCallback(async (poId: number) => {
      await delay(MOCK_API_DELAY);
      setPurchaseOrders(prev => prev.filter(po => po.id !== poId));
    }, []),
    addStockTransaction: useCallback(async (data: Omit<StockTransaction, 'id' | 'created_at' | 'updated_at' | 'item_name' | 'warehouse_name'>) => {
      await delay(MOCK_API_DELAY);
      const item = itemsInv.find(i => i.id === data.item_id);
      const warehouse = warehouses.find(w => w.id === data.warehouse_id);
      const newTransaction: StockTransaction = {
        ...data,
        id: Date.now(),
        item_name: item?.name || '',
        warehouse_name: warehouse?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStockTransactions(prev => [...prev, newTransaction]);
      return newTransaction;
    }, [itemsInv, warehouses]),
    addPayrollPeriod: useCallback(async (data: Omit<PayrollPeriod, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newPeriod: PayrollPeriod = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPayrollPeriods(prev => [...prev, newPeriod]);
      return newPeriod;
    }, []),
    updatePayrollPeriod: useCallback(async (updatedPeriod: PayrollPeriod) => {
      await delay(MOCK_API_DELAY);
      const periodToUpdate = { ...updatedPeriod, updated_at: new Date().toISOString() };
      setPayrollPeriods(prev => prev.map(pp => pp.id === periodToUpdate.id ? periodToUpdate : pp));
      return periodToUpdate;
    }, []),
    deletePayrollPeriod: useCallback(async (periodId: number) => {
      await delay(MOCK_API_DELAY);
      setPayrollPeriods(prev => prev.filter(pp => pp.id !== periodId));
    }, []),
    addPayrollItemType: useCallback(async (data: Omit<PayrollItemType, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newItemType: PayrollItemType = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPayrollItemTypes(prev => [...prev, newItemType]);
      return newItemType;
    }, []),
    updatePayrollItemType: useCallback(async (updatedItemType: PayrollItemType) => {
      await delay(MOCK_API_DELAY);
      const itemTypeToUpdate = { ...updatedItemType, updated_at: new Date().toISOString() };
      setPayrollItemTypes(prev => prev.map(pit => pit.id === itemTypeToUpdate.id ? itemTypeToUpdate : pit));
      return itemTypeToUpdate;
    }, []),
    deletePayrollItemType: useCallback(async (itemTypeId: number) => {
      await delay(MOCK_API_DELAY);
      setPayrollItemTypes(prev => prev.filter(pit => pit.id !== itemTypeId));
    }, []),
    updateStaffSalarySetting: useCallback(async (staffId: string, settingData: Omit<StaffSalarySetting, 'id' | 'staff_id' | 'created_at' | 'updated_at' | 'staff_name' | 'recurring_items'>, recurringItemsData: Array<Omit<StaffRecurringItem, 'id' | 'staff_salary_setting_id' | 'created_at' | 'item_type_name' | 'item_category'>>) => {
      await delay(MOCK_API_DELAY);
      // This is a simplified mock. In a real app, you'd update/create the setting and its recurring items.
      console.log("Mock: Updating staff salary setting for", staffId, settingData, recurringItemsData);
      const staffMember = staffList.find(s => s.id === staffId);
      const updatedSetting: StaffSalarySetting = {
        id: `SSS-${staffId}`,
        staff_id: staffId,
        staff_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown Staff',
        basic_salary: settingData.basic_salary,
        recurring_items: recurringItemsData.map(item => ({
          ...item,
          id: Date.now(), // Simple ID for mock
          staff_salary_setting_id: `SSS-${staffId}`,
          item_type_name: payrollItemTypes.find(pit => pit.id === item.item_type_id)?.name || '',
          item_category: payrollItemTypes.find(pit => pit.id === item.item_type_id)?.category || '',
          created_at: new Date().toISOString(),
        })),
        created_at: new Date().toISOString(), // Assuming creation on first update
        updated_at: new Date().toISOString(),
      };
      // For mock, we just replace the existing one or add if not found
      setStaffSalarySettings(prev => {
        const existingIndex = prev.findIndex(s => s.staff_id === staffId);
        if (existingIndex > -1) {
          const newArr = [...prev];
          newArr[existingIndex] = updatedSetting;
          return newArr;
        } else {
          return [...prev, updatedSetting];
        }
      });
      return updatedSetting;
    }, [staffList, payrollItemTypes]),
    generatePayslipsForPeriod: useCallback(async (periodId: number) => {
      await delay(MOCK_API_DELAY);
      console.log("Mock: Generating payslips for period", periodId);
      const period = payrollPeriods.find(pp => pp.id === periodId);
      if (!period) {
        console.warn("Payroll period not found.");
        return [];
      }
      const generatedPayslips: Payslip[] = staffList.map(staffMember => {
        const salarySetting = staffSalarySettings.find(sss => sss.staff_id === staffMember.id);
        const basicSalary = salarySetting?.basic_salary || 0;
        const recurringItems = salarySetting?.recurring_items || [];
        const totalEarnings = basicSalary + recurringItems.filter(item => item.item_category === PayrollItemCategory.EARNING).reduce((sum, item) => sum + item.amount, 0);
        const totalDeductions = recurringItems.filter(item => item.item_category === PayrollItemCategory.DEDUCTION).reduce((sum, item) => sum + item.amount, 0);
        const netPay = totalEarnings - totalDeductions;

        return {
          id: `PS-${periodId}-${staffMember.id}`,
          staff_id: staffMember.id,
          payroll_period_id: periodId,
          staff_name: `${staffMember.first_name} ${staffMember.last_name}`,
          payroll_period_name: period.name,
          basic_salary: basicSalary,
          total_earnings: totalEarnings,
          total_deductions: totalDeductions,
          net_pay: netPay,
          status: PayslipStatus.GENERATED,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [
            { id: `PS-${periodId}-${staffMember.id}-basic`, payslip_id: `PS-${periodId}-${staffMember.id}`, item_type_name: 'Basic Salary', item_category: PayrollItemCategory.EARNING, amount: basicSalary },
            ...recurringItems.map(item => ({
              id: `PS-${periodId}-${staffMember.id}-${item.item_type_id}`,
              payslip_id: `PS-${periodId}-${staffMember.id}`,
              item_type_name: item.item_type_name,
              item_category: item.item_category,
              amount: item.amount,
            }))
          ],
        };
      });
      setPayslips(generatedPayslips);
      return generatedPayslips;
    }, [staffList, payrollPeriods, staffSalarySettings, payrollItemTypes]),
    addBookCategory: useCallback(async (data: Omit<BookCategory, 'id'>) => {
      await delay(MOCK_API_DELAY);
      const newCategory: BookCategory = {
        ...data,
        id: Date.now(),
      };
      setBookCategories(prev => [...prev, newCategory]);
      return newCategory;
    }, []),
    updateBookCategory: useCallback(async (updatedCategory: BookCategory) => {
      await delay(MOCK_API_DELAY);
      setBookCategories(prev => prev.map(bc => bc.id === updatedCategory.id ? updatedCategory : bc));
      return updatedCategory;
    }, []),
    deleteBookCategory: useCallback(async (categoryId: number) => {
      await delay(MOCK_API_DELAY);
      setBookCategories(prev => prev.filter(bc => bc.id !== categoryId));
    }, []),
    addBook: useCallback(async (data: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'category_name'>) => {
      await delay(MOCK_API_DELAY);
      const category = bookCategories.find(bc => bc.id === data.category_id);
      const newBook: Book = {
        ...data,
        id: Date.now(),
        category_name: category?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setBooks(prev => [...prev, newBook]);
      return newBook;
    }, [bookCategories]),
    updateBook: useCallback(async (updatedBook: Book) => {
      await delay(MOCK_API_DELAY);
      const category = bookCategories.find(bc => bc.id === updatedBook.category_id);
      const bookToUpdate = {
        ...updatedBook,
        category_name: category?.name || '',
        updated_at: new Date().toISOString(),
      };
      setBooks(prev => prev.map(b => b.id === bookToUpdate.id ? bookToUpdate : b));
      return bookToUpdate;
    }, [bookCategories]),
    deleteBook: useCallback(async (bookId: number) => {
      await delay(MOCK_API_DELAY);
      setBooks(prev => prev.filter(b => b.id !== bookId));
    }, []),
    addLoan: useCallback(async (data: Omit<Loan, 'id' | 'created_at' | 'updated_at' | 'book_title' | 'borrower_name'>) => {
      await delay(MOCK_API_DELAY);
      const book = books.find(b => b.id === data.book_id);
      const student = students.find(s => s.id === data.borrower_id);
      const newLoan: Loan = {
        ...data,
        id: Date.now(),
        book_title: book?.title || '',
        borrower_name: student ? `${student.first_name} ${student.last_name}` : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLoans(prev => [...prev, newLoan]);
      return newLoan;
    }, [books, students]),
    updateLoan: useCallback(async (updatedLoan: Loan) => {
      await delay(MOCK_API_DELAY);
      const book = books.find(b => b.id === updatedLoan.book_id);
      const student = students.find(s => s.id === updatedLoan.borrower_id);
      const loanToUpdate = {
        ...updatedLoan,
        book_title: book?.title || '',
        borrower_name: student ? `${student.first_name} ${student.last_name}` : '',
        updated_at: new Date().toISOString(),
      };
      setLoans(prev => prev.map(l => l.id === loanToUpdate.id ? loanToUpdate : l));
      return loanToUpdate;
    }, [books, students]),
    addFine: useCallback(async (data: Omit<Fine, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'loan_id'>) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === data.student_id);
      const newFine: Fine = {
        ...data,
        id: Date.now(),
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFines(prev => [...prev, newFine]);
      return newFine;
    }, [students]),
    updateFineStatus: useCallback(async (fineId: number, status: FineStatus) => {
      await delay(MOCK_API_DELAY);
      setFines(prev => prev.map(f => f.id === fineId ? { ...f, status, updated_at: new Date().toISOString() } : f));
      return fines.find(f => f.id === fineId);
    }, [fines]),
    addExpenseCategory: useCallback(async (data: Omit<ExpenseCategory, 'id'>) => {
      await delay(MOCK_API_DELAY);
      const newCategory: ExpenseCategory = {
        ...data,
        id: Date.now(),
      };
      setExpenseCategories(prev => [...prev, newCategory]);
      return newCategory;
    }, []),
    updateExpenseCategory: useCallback(async (updatedCategory: ExpenseCategory) => {
      await delay(MOCK_API_DELAY);
      setExpenseCategories(prev => prev.map(ec => ec.id === updatedCategory.id ? updatedCategory : ec));
      return updatedCategory;
    }, []),
    deleteExpenseCategory: useCallback(async (categoryId: number) => {
      await delay(MOCK_API_DELAY);
      setExpenseCategories(prev => prev.filter(ec => ec.id !== categoryId));
    }, []),
    addCustomerInvoice: useCallback(async (data: Omit<CustomerInvoice, 'id' | 'created_at' | 'updated_at' | 'customer_name' | 'items'> & { items: CustomerInvoiceItem[] }) => {
      await delay(MOCK_API_DELAY);
      const customer = customers.find(c => c.id === data.customer_id);
      const newInvoice: CustomerInvoice = {
        ...data,
        id: `INV-${Date.now()}`,
        customer_name: customer?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCustomerInvoices(prev => [...prev, newInvoice]);
      return newInvoice;
    }, [customers]),
    updateCustomerInvoice: useCallback(async (updatedInvoice: CustomerInvoice) => {
      await delay(MOCK_API_DELAY);
      const customer = customers.find(c => c.id === updatedInvoice.customer_id);
      const invoiceToUpdate = {
        ...updatedInvoice,
        customer_name: customer?.name || '',
        updated_at: new Date().toISOString(),
      };
      setCustomerInvoices(prev => prev.map(ci => ci.id === invoiceToUpdate.id ? invoiceToUpdate : ci));
      return invoiceToUpdate;
    }, [customers]),
    deleteCustomerInvoice: useCallback(async (invoiceId: string) => {
      await delay(MOCK_API_DELAY);
      setCustomerInvoices(prev => prev.filter(ci => ci.id !== invoiceId));
    }, []),
    addSupplierInvoice: useCallback(async (data: Omit<SupplierInvoice, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'items'> & { items: PurchaseOrderItem[] }) => {
      await delay(MOCK_API_DELAY);
      const supplier = suppliers.find(s => s.id === data.supplier_id);
      const newInvoice: SupplierInvoice = {
        ...data,
        id: `SINV-${Date.now()}`,
        supplier_name: supplier?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSupplierInvoices(prev => [...prev, newInvoice]);
      return newInvoice;
    }, [suppliers]),
    updateSupplierInvoice: useCallback(async (updatedInvoice: SupplierInvoice) => {
      await delay(MOCK_API_DELAY);
      const supplier = suppliers.find(s => s.id === updatedInvoice.supplier_id);
      const invoiceToUpdate = {
        ...updatedInvoice,
        supplier_name: supplier?.name || '',
        updated_at: new Date().toISOString(),
      };
      setSupplierInvoices(prev => prev.map(si => si.id === invoiceToUpdate.id ? invoiceToUpdate : si));
      return invoiceToUpdate;
    }, [suppliers]),
    deleteSupplierInvoice: useCallback(async (invoiceId: string) => {
      await delay(MOCK_API_DELAY);
      setSupplierInvoices(prev => prev.filter(si => si.id !== invoiceId));
    }, []),
    addStudentOpeningBalance: useCallback(async (data: Omit<StudentOpeningBalance, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'school_period_name' | 'financial_year_name'>) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === data.student_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === data.school_period_id);
      const financialYear = financialYears.find(fy => fy.id === data.financial_year_id);

      const newBalance: StudentOpeningBalance = {
        ...data,
        id: Date.now(),
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        school_period_name: schoolPeriod?.name || '',
        financial_year_name: financialYear?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStudentOpeningBalances(prev => [...prev, newBalance]);
      return newBalance;
    }, [students, schoolPeriods, financialYears]),
    updateStudentOpeningBalance: useCallback(async (updatedBalance: StudentOpeningBalance) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === updatedBalance.student_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === updatedBalance.school_period_id);
      const financialYear = financialYears.find(fy => fy.id === updatedBalance.financial_year_id);

      const balanceToUpdate = {
        ...updatedBalance,
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        school_period_name: schoolPeriod?.name || '',
        financial_year_name: financialYear?.name || '',
        updated_at: new Date().toISOString(),
      };
      setStudentOpeningBalances(prev => prev.map(sob => sob.id === balanceToUpdate.id ? balanceToUpdate : sob));
      return balanceToUpdate;
    }, [students, schoolPeriods, financialYears]),
    deleteStudentOpeningBalance: useCallback(async (balanceId: number) => {
      await delay(MOCK_API_DELAY);
      setStudentOpeningBalances(prev => prev.filter(sob => sob.id !== balanceId));
    }, []),
    addFeeAdjustment: useCallback(async (data: Omit<FeeAdjustment, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'school_period_name'>) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === data.student_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === data.school_period_id);

      const newAdjustment: FeeAdjustment = {
        ...data,
        id: Date.now(),
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        school_period_name: schoolPeriod?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFeeAdjustments(prev => [...prev, newAdjustment]);
      return newAdjustment;
    }, [students, schoolPeriods]),
    updateFeeAdjustment: useCallback(async (updatedAdjustment: FeeAdjustment) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === updatedAdjustment.student_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === updatedAdjustment.school_period_id);

      const adjustmentToUpdate = {
        ...updatedAdjustment,
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        school_period_name: schoolPeriod?.name || '',
        updated_at: new Date().toISOString(),
      };
      setFeeAdjustments(prev => prev.map(fa => fa.id === adjustmentToUpdate.id ? adjustmentToUpdate : fa));
      return adjustmentToUpdate;
    }, [students, schoolPeriods]),
    deleteFeeAdjustment: useCallback(async (adjustmentId: number) => {
      await delay(MOCK_API_DELAY);
      setFeeAdjustments(prev => prev.filter(fa => fa.id !== adjustmentId));
    }, []),
    addTransportRoute: useCallback(async (data: Omit<TransportRoute, 'id' | 'created_at' | 'updated_at'>) => {
      await delay(MOCK_API_DELAY);
      const newRoute: TransportRoute = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTransportRoutes(prev => [...prev, newRoute]);
      return newRoute;
    }, []),
    updateTransportRoute: useCallback(async (updatedRoute: TransportRoute) => {
      await delay(MOCK_API_DELAY);
      const routeToUpdate = { ...updatedRoute, updated_at: new Date().toISOString() };
      setTransportRoutes(prev => prev.map(tr => tr.id === routeToUpdate.id ? routeToUpdate : tr));
      return routeToUpdate;
    }, []),
    deleteTransportRoute: useCallback(async (routeId: number) => {
      await delay(MOCK_API_DELAY);
      setTransportRoutes(prev => prev.filter(tr => tr.id !== routeId));
    }, []),
    addStudentTransportAssignment: useCallback(async (data: Omit<StudentTransportAssignment, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'route_name' | 'school_period_name' | 'invoice_id'>) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === data.student_id);
      const route = transportRoutes.find(tr => tr.id === data.route_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === data.school_period_id);

      const newAssignment: StudentTransportAssignment = {
        ...data,
        id: Date.now(),
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        route_name: route?.name || '',
        school_period_name: schoolPeriod?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStudentTransportAssignments(prev => [...prev, newAssignment]);
      return newAssignment;
    }, [students, transportRoutes, schoolPeriods]),
    updateStudentTransportAssignment: useCallback(async (updatedAssignment: StudentTransportAssignment) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === updatedAssignment.student_id);
      const route = transportRoutes.find(tr => tr.id === updatedAssignment.route_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === updatedAssignment.school_period_id);

      const assignmentToUpdate = {
        ...updatedAssignment,
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        route_name: route?.name || '',
        school_period_name: schoolPeriod?.name || '',
        updated_at: new Date().toISOString(),
      };
      setStudentTransportAssignments(prev => prev.map(sta => sta.id === assignmentToUpdate.id ? assignmentToUpdate : sta));
      return assignmentToUpdate;
    }, [students, transportRoutes, schoolPeriods]),
    deleteStudentTransportAssignment: useCallback(async (assignmentId: number) => {
      await delay(MOCK_API_DELAY);
      setStudentTransportAssignments(prev => prev.filter(sta => sta.id !== assignmentId));
    }, []),
    generateStudentInvoices: useCallback(async (feeTemplateId: number, schoolPeriodId: number, studentCriteria: { categoryId?: number, classStreamId?: number}) => {
      await delay(MOCK_API_DELAY);
      console.log("Mock: Generating student invoices for template", feeTemplateId, "period", schoolPeriodId, "criteria", studentCriteria);
      const template = feeTemplates.find(ft => ft.id === feeTemplateId);
      if (!template) {
        console.warn("Fee template not found.");
        return [];
      }

      const newInvoices: StudentInvoice[] = [];
      let targetStudents = students;

      if (studentCriteria.categoryId) {
        targetStudents = targetStudents.filter(s => s.student_category_id === studentCriteria.categoryId);
      }
      if (studentCriteria.classStreamId) {
        targetStudents = targetStudents.filter(s => s.current_class_stream_id === studentCriteria.classStreamId);
      }

      targetStudents.forEach(student => {
        const invoiceId = `INV-${Date.now()}-${student.id}`;
        const invoiceItems: StudentInvoiceItem[] = template.items.map(item => ({
          id: `ITEM-${Date.now()}-${item.id}`,
          student_invoice_id: invoiceId,
          fee_template_item_id: item.id,
          description: item.description,
          amount: item.amount,
          revenue_account_id: item.revenue_account_id,
          revenue_account_name: item.revenue_account_name,
        }));

        const newInvoice: StudentInvoice = {
          id: invoiceId,
          student_id: student.id,
          school_period_id: schoolPeriodId,
          fee_template_id: feeTemplateId,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          total_amount: invoiceItems.reduce((sum, item) => sum + item.amount, 0),
          amount_paid: 0,
          balance: invoiceItems.reduce((sum, item) => sum + item.amount, 0),
          status: InvoiceStatus.OUTSTANDING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          student_name: `${student.first_name} ${student.last_name}`,
          school_period_name: schoolPeriods.find(sp => sp.id === schoolPeriodId)?.name || '',
          fee_template_name: template.name,
          items: invoiceItems,
        };
        newInvoices.push(newInvoice);
      });
      setStudentInvoices(prev => [...prev, ...newInvoices]);
      return newInvoices;
    }, [students, feeTemplates, schoolPeriods]),
    addStudentPayment: useCallback(async (data: Omit<StudentPayment, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'school_period_name'>) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === data.student_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === data.school_period_id);

      const newPayment: StudentPayment = {
        ...data,
        id: `PAY-${Date.now()}`,
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        school_period_name: schoolPeriod?.name || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStudentPayments(prev => [...prev, newPayment]);
      return newPayment;
    }, [students, schoolPeriods]),
    updateStudentPayment: useCallback(async (updatedPayment: StudentPayment) => {
      await delay(MOCK_API_DELAY);
      const student = students.find(s => s.id === updatedPayment.student_id);
      const schoolPeriod = schoolPeriods.find(sp => sp.id === updatedPayment.school_period_id);

      const paymentToUpdate = {
        ...updatedPayment,
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        school_period_name: schoolPeriod?.name || '',
        updated_at: new Date().toISOString(),
      };
      setStudentPayments(prev => prev.map(sp => sp.id === paymentToUpdate.id ? paymentToUpdate : sp));
      return paymentToUpdate;
    }, [students, schoolPeriods]),
    deleteStudentPayment: useCallback(async (paymentId: string) => {
      await delay(MOCK_API_DELAY);
      setStudentPayments(prev => prev.filter(sp => sp.id !== paymentId));
    }, []),
    applyPaymentToInvoices: useCallback(async (paymentId: string, applications: InvoicePaymentApplication[]) => {
      await delay(MOCK_API_DELAY);
      console.log("Mock: Applying payment", paymentId, "to invoices", applications);
      // In a real app, this would update invoice balances and payment application records.
      // For mock, we just acknowledge it and update the payment status.
      setStudentPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'Applied', updated_at: new Date().toISOString() } : p));
      // Also update the relevant invoices
      setStudentInvoices(prev => prev.map(invoice => {
        const application = applications.find(app => app.student_invoice_id === invoice.id);
        if (application) {
          const newAmountPaid = invoice.amount_paid + application.amount_applied;
          const newBalance = invoice.total_amount - newAmountPaid;
          return {
            ...invoice,
            amount_paid: newAmountPaid,
            balance: newBalance,
            status: newBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
            updated_at: new Date().toISOString(),
          };
        }
        return invoice;
      }));
    }, []),

    rawInitialData 
  };
};
