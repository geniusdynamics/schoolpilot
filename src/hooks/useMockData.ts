
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Student, Staff, Class, Subject, User, // Core entities
  PersonGender, StudentStatus, SubjectGrouping, UserType, // Enums
  SchoolPeriod, AcademicYear, StudentCategory, Dormitory, // Supporting adm/core entities
  ParentGuardian, StudentGuardianRelationship, // For student relationships
  ExamResultSummary, // Simplified exam summary for UI
  Role, Department, Designation, ClassStream, AcademicPeriodDefinition, AcademicYearStructure, FinancialYear, FinancialYearStatus, SchoolDetails,
  ClubAndSociety, ClubType, Customer, GradingScheme, GradingSchemeLevel, Bank, ChartOfAccount, AccountType, AccountTemplateType,
  Supplier, FeeTemplate, FeeTemplateItem, ExpenseCategory, Partner, PartnerType, StudentHealthRecord, StudentAttendance, AttendanceStatus, TimetablePeriodDef,
  ItemInv, ItemTypeInv, ItemCategoryInv, Requisition, RequisitionItem, RequisitionStatus, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, // Inventory specific
  TemplateComm, TemplateType, Campaign, CampaignAudienceType, CampaignStatus, // Communication specific
  StudentDetailProfile, StudentEnrolledSubject, StudentPaymentLogItem, StudentInvoice, InvoiceStatus, // For Student Detail Page
  StudentFinancialSummary, StudentInvoiceChargeItem, StudentPayment, CustomerInvoice, CustomerInvoiceStatus, // Added CustomerInvoiceStatus
  ClassSubjectAllocation, TeacherSubjectAssignment, StudentSubjectEnrollment, StudentEnrollmentStatus, StudentExamResult, ExamSession, SubjectPaper, // Academics
  ExamSessionStatus, ExamPaperSetting, // Moved here for clarity
  StudentExamResultWithDetails, StudentPaperMark, StudentPaperMarkWithDetails, // Detailed Exam Results
  DayOfWeek, TimetableEntry, // Timetable
  Warehouse, FixedAsset, StockTransaction, StockLevel, StockTransactionType, DepreciationMethod, AssetDepreciationLog, // Inventory specific (newly added focus)
  RFQ, RFQStatus, // Added RFQ and RFQStatus
  PayrollPeriod, PayrollPeriodStatus, PayrollItemType, PayrollItemCategory, PayrollTaxImplication, // HR Types Start
  StaffSalarySetting, StaffRecurringItem, Payslip, PayslipItem, PayslipStatus, // HR Types End
  BookCategory, Book, Loan, Fine, BookStatus, FineStatus, // Library Types
  SupplierInvoice, SupplierInvoiceStatus, // Added missing type
  Workflow, WorkflowState, MealPlan, Menu, Merchant, AuditLog, // Added for error fixing
  ExpenseClaim, ExpenseClaimantType, FeeAdjustment, FeeAdjustmentType, // Finance related
  TransportRoute, StudentOpeningBalance, OpeningBalanceType, StudentTransportAssignment, TransportAssignmentStatus,
  InvoicePaymentApplication, CustomerInvoiceItem, StudentInvoiceItem, GeneralLedgerEntry, // Added GeneralLedgerEntry
  StudentMealPlan, StudentMealPlanStatus, MealType, MealConsumptionLog, WalletTransaction, WalletTransactionType, StudentWallet, // Nutrition
  GeneralPayment, GeneralPaymentItem, GeneralPayerType // General Receipts
} from '../types';
import { MOCK_API_DELAY } from '../constants';

// Simulating a delay for API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Initial Mock Data based on V10.5 Schema ---
const initialMockSchoolDetails: SchoolDetails = {
  id: 1,
  name: 'Greenwood High International',
  email: 'info@greenwood.int',
  telephone: '+254-722-123456',
  motto: 'Excellence and Integrity',
  postal_address: 'P.O. Box 100-00100',
  town: 'Nairobi',
  logo_path: '/img/logo.png',
  school_gender: 'Mixed',
  school_type: 'International',
  head_teacher_name: 'Dr. Evelyn Reed',
  school_code: 'GHI001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const initialMockRoles: Role[] = [
    { id: 1, name: 'Administrator', description: 'Full system access', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Teacher', description: 'Access to academic modules', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Accountant', description: 'Access to finance modules', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Librarian', description: 'Access to library module', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockUsers: User[] = [
  { id: 'USR_MOCK_ADMIN', username: 'admin_user', email: 'admin@example.com', user_type: UserType.STAFF, is_active: true, role_id: 1, role: 'Administrator', display_name: 'Admin User (Mock)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), hashed_password: 'mockhashedpassword' },
  { id: 'STF001', username: 'mscott', email: 'm.scott@example.com', user_type: UserType.STAFF, is_active: true, role_id: 1, role: 'Administrator', display_name: 'Michael Scott', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), hashed_password: 'mockhashedpassword' },
  { id: 'STF002', username: 'dschrute', email: 'd.schrute@example.com', user_type: UserType.STAFF, is_active: true, role_id: 2, role: 'Teacher', display_name: 'Dwight Schrute', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), hashed_password: 'mockhashedpassword' },
  { id: 'STF003', username: 'pbeesly', email: 'p.beesly@example.com', user_type: UserType.STAFF, is_active: false, role_id: 3, role: 'Accountant', display_name: 'Pam Beesly', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), hashed_password: 'mockhashedpassword' },
  { id: 'STF007', username: 'omartinez', email: 'o.martinez@example.com', user_type: UserType.STAFF, is_active: true, role_id: 3, role: 'Accountant', display_name: 'Oscar Martinez', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), hashed_password: 'mockhashedpassword' },
  { id: 'STF008', username: 'pvance', email: 'p.vance@example.com', user_type: UserType.STAFF, is_active: true, role_id: 2, role: 'Teacher', display_name: 'Phyllis Vance', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), hashed_password: 'mockhashedpassword' },
  { id: 'STF009', username: 'ehannon', email: 'e.hannon@example.com', user_type: UserType.STAFF, is_active: true, role_id: 4, role: 'Librarian', display_name: 'Erin Hannon', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), hashed_password: 'mockhashedpassword' },
];


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

const initialMockStaff: Staff[] = initialMockUsers
    .filter(u => u.user_type === UserType.STAFF)
    .map(u => {
        const staffDefaults: Partial<Staff> = { staff_no: `STF${u.id.slice(-3)}`, first_name: u.display_name?.split(' ')[0] || u.username.split('_')[0], last_name: u.display_name?.split(' ')[1] || u.username.split('_')[1] || 'User', department_id: 2, designation_id: 6, is_active: u.is_active, phone: '0700000000', created_at: u.created_at, updated_at: u.updated_at, email: u.email, display_name: u.display_name };
        const specificStaff: Partial<Staff> = {
            'STF001': { department_id: 2, designation_id: 1, display_name: 'Michael Scott'},
            'STF002': { department_id: 1, designation_id: 3, hod_of_department_id: 3, display_name: 'Dwight Schrute' },
            'STF003': { department_id: 2, designation_id: 6, display_name: 'Pam Beesly'},
            'STF007': { department_id: 6, designation_id: 5, display_name: 'Oscar Martinez'},
            'STF008': { department_id: 1, designation_id: 3, display_name: 'Phyllis Vance'},
            'STF009': { department_id: 2, designation_id: 7, display_name: 'Erin Hannon'}, // Erin is Librarian now
            'USR_MOCK_ADMIN': { department_id: 2, designation_id: 1, staff_no: 'STF_ADM', first_name: 'Admin', last_name: 'User', display_name: 'Admin User (Mock)' }
        }[u.id] || {};
        return { ...staffDefaults, ...specificStaff, id: u.id, user_id: u.id } as Staff;
    })
    .concat([
      { id: 'STF104', staff_no: 'STF104', first_name: 'Angela', last_name: 'Martin', department_id: 6, designation_id: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Finance', designation_title: 'Accountant', display_name: 'Angela Martin' },
      { id: 'STF105', staff_no: 'STF105', first_name: 'Kevin', last_name: 'Malone', department_id: 1, designation_id: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Academics', designation_title: 'Teacher', display_name: 'Kevin Malone' },
      { id: 'STF106', staff_no: 'STF106', first_name: 'Toby', last_name: 'Flenderson', department_id: 7, designation_id: 9, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), department_name: 'Human Resources', designation_title: 'HR Manager', display_name: 'Toby Flenderson' },
    ].map(s => ({...s, department_name: initialMockDepartments.find(d => d.id === s.department_id)?.name, designation_title: initialMockDesignations.find(d => d.id === s.designation_id)?.title, display_name: s.display_name || `${s.first_name} ${s.last_name}` } as Staff)));


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
  { id: 2, class_id: 1, name: 'B', class_teacher_id: 'STF105', class_name: 'Form 1', class_teacher_name: 'Kevin Malone' },
  { id: 3, class_id: 2, name: 'A', class_teacher_id: 'STF008', class_name: 'Form 2', class_teacher_name: 'Phyllis Vance' },
  { id: 4, class_id: 2, name: 'B', class_teacher_id: 'STF001', class_name: 'Form 2', class_teacher_name: 'Michael Scott' },
  { id: 5, class_id: 3, name: 'North', class_teacher_id: 'STF002', class_name: 'Form 3', class_teacher_name: 'Dwight Schrute'},
  { id: 6, class_id: 4, name: 'East', class_teacher_id: 'STF105', class_name: 'Form 4', class_teacher_name: 'Kevin Malone'},
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
    { id: 2, name: 'Twiga Block', master_id: 'STF105', master_name: 'Kevin Malone', created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
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
    { id: 203, account_code: '2003', name: 'Nutrition Fees Revenue', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 204, account_code: '2004', name: 'Other Income (Canteen/Shop)', type: AccountType.REVENUE, template_type: AccountTemplateType.CUSTOM, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 301, account_code: '3001', name: 'Salaries Expense', type: AccountType.EXPENSE, template_type: AccountTemplateType.CORE, is_active: true, expense_category_id: 5, expense_category_name: 'Staff Welfare', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 302, account_code: '3002', name: 'Stationery Expense', type: AccountType.EXPENSE, template_type: AccountTemplateType.CUSTOM, is_active: true, expense_category_id: 1, expense_category_name: 'Stationery', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockBanks: Bank[] = [
    { id: 1, name: 'KCB Bank', account_no: '1234567890', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account' },
    { id: 2, name: 'Equity Bank', account_no: '0987654321', gl_account_id: 101, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'School Bank Account' },
];

const initialMockSuppliers: Supplier[] = [
  {id: 1, name: 'Text Book Centre', phone: '0700111222', email: 'sales@textbookcentre.com', address: 'Kijabe Street, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), contract_expiry_date: '2024-12-31' },
  {id: 2, name: 'Savani\'s Bookshop', phone: '0722333444', email: 'info@savanis.co.ke', address: 'Moi Avenue, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), contract_expiry_date: '2025-03-15' },
  {id: 3, name: 'Green Grocers Ltd.', phone: '0733555666', email: 'orders@greengrocers.co.ke', address: 'Industrial Area, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), contract_expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }, // Expires in 60 days
  {id: 4, name: 'Tech Solutions Inc.', phone: '0744777888', email: 'support@techsolutions.com', address: 'Westlands, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), contract_expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }, // Expires in 15 days
];

const initialMockMealPlans: MealPlan[] = [
    { id: 1, name: 'Full Board (All Meals)', description: 'Includes breakfast, break snack, lunch, and dinner.', cost_per_period: 20000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Lunch Only Plan', description: 'Provides lunch for day scholars.', cost_per_period: 7500, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Breakfast & Lunch Plan', description: 'For students needing morning and midday meals.', cost_per_period: 12000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockMenus: Menu[] = [
    { id: 'MENU001', menu_date: '2024-07-29', meal_type: MealType.LUNCH, description: 'Rice, Beef Stew, Cabbage', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'MENU002', menu_date: '2024-07-29', meal_type: MealType.BREAKFAST, description: 'Tea, Bread, Sausage', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'MENU003', menu_date: '2024-07-30', meal_type: MealType.LUNCH, description: 'Ugali, Fish, Sukuma Wiki', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockMerchants: Merchant[] = [
    {id: 1, name: 'School Canteen', gl_account_id: 204, gl_account_name: 'Other Income (Canteen/Shop)', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    {id: 2, name: 'Uniform Shop', gl_account_id: 204, gl_account_name: 'Other Income (Canteen/Shop)', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialMockFeeTemplateItemsFromRaw: FeeTemplateItem[] = [ // Renamed for clarity in rawInitialData
    { id: 'fti1', fee_template_id: 1, description: 'Tuition Fee', amount: 50000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue' },
    { id: 'fti2', fee_template_id: 1, description: 'Transport Fee', amount: 10000, revenue_account_id: 202, revenue_account_name: 'Transport Fees Revenue', linked_transport_route_id: 1 },
    { id: 'fti3', fee_template_id: 1, description: 'Lunch Program', amount: 7500, revenue_account_id: 203, revenue_account_name: 'Nutrition Fees Revenue', linked_meal_plan_id: 2 },
    { id: 'fti4', fee_template_id: 2, description: 'Boarding Fee & Meals', amount: 70000, revenue_account_id: 201, revenue_account_name: 'Tuition Fees Revenue', linked_meal_plan_id: 1 },
];

const initialMockFeeTemplates: FeeTemplate[] = [
    { id: 1, name: 'Day Scholars - Term 3 (2024)', school_period_id: 3, student_category_id: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 3 - AY 2023/2024', student_category_name: 'Day Scholar', items: initialMockFeeTemplateItemsFromRaw.filter(item => item.fee_template_id === 1) },
    { id: 2, name: 'Boarders - Term 3 (2024)', school_period_id: 3, student_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 3 - AY 2023/2024', student_category_name: 'Boarder', items: initialMockFeeTemplateItemsFromRaw.filter(item => item.fee_template_id === 2) },
];

const initialMockExpenseClaims: ExpenseClaim[] = [
    { id: 'EXP001', claimant_type: ExpenseClaimantType.STAFF, claimant_id: 'STF001', claim_date: '2024-07-15', description: 'Travel allowance for workshop', amount: 5000, expense_category_id: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Michael Scott', expense_category_name: 'Travel' },
    { id: 'EXP002', claimant_type: ExpenseClaimantType.STAFF, claimant_id: 'STF002', claim_date: '2024-07-20', description: 'Purchase of office stationery', amount: 1500, expense_category_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), claimant_name: 'Dwight Schrute', expense_category_name: 'Stationery' },
];

const initialMockCustomerInvoices: CustomerInvoice[] = [
    { id: 'CINV001', customer_id: 1, invoice_number: 'CINV-2024-001', issue_date: '2024-07-01', due_date: '2024-07-31', total_amount: 15000, status: CustomerInvoiceStatus.DUE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), customer_name: 'Community Hall Hirers', items: [
        {id: 'CIITM001', invoice_id: 'CINV001', description: 'Hall Rental - July 5th', amount: 10000, revenue_account_id: 204, revenue_account_name: 'Other Income (Canteen/Shop)'},
        {id: 'CIITM002', invoice_id: 'CINV001', description: 'Cleaning Services', amount: 5000, revenue_account_id: 204, revenue_account_name: 'Other Income (Canteen/Shop)'},
    ]},
];

const initialMockSupplierInvoices: SupplierInvoice[] = [
    {id: 'SINV001', supplier_id: 1, invoice_number: 'TB07-553', invoice_date: '2024-07-10', due_date: '2024-08-09', total_amount: 250000, amount_paid: 100000, status: SupplierInvoiceStatus.PARTIALLY_PAID, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), supplier_name: 'Text Book Centre' }
];

const initialMockStudentOpeningBalances: StudentOpeningBalance[] = [
    {id: 'SOB001', student_id: 'S001', balance_type: OpeningBalanceType.DEBIT, amount: 5000, as_of_date: '2023-08-31', is_billed: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert' },
];

const initialMockFeeAdjustments: FeeAdjustment[] = [
    {id: 'ADJ001', student_id: 'S002', school_period_id: 3, adjustment_type: FeeAdjustmentType.SCHOLARSHIP, amount: -5000, reason: 'Academic Excellence Scholarship', created_at: new Date().toISOString(), student_name: 'Michael Scofield', school_period_name: 'Term 3 - AY 2023/2024'}
];

const initialMockTransportRoutes: TransportRoute[] = [
    {id: 1, name: 'Route A - Westlands', cost_per_period: 12000, gl_revenue_account_id: 202, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_revenue_account_name: 'Transport Fees Revenue' }
];

const initialMockStudentTransportAssignments: StudentTransportAssignment[] = [
    {id: 'STA001', student_id: 'S002', route_id: 1, school_period_id: 3, status: TransportAssignmentStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', route_name: 'Route A - Westlands', school_period_name: 'Term 3 - AY 2023/2024' }
];

const initialMockStudentInvoices: StudentInvoice[] = [];
const initialMockStudentInvoiceItems: StudentInvoiceItem[] = [];
const initialMockStudentPayments: StudentPayment[] = [];
const initialMockInvoicePaymentApplications: InvoicePaymentApplication[] = [];
const initialMockStudentMealPlans: StudentMealPlan[] = [
    {id: 'SMP001', student_id: 'S001', school_period_id: 3, meal_plan_id: 1, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', meal_plan_name: 'Full Board (All Meals)', school_period_name: 'Term 3 - AY 2023/2024'},
    {id: 'SMP002', student_id: 'S002', school_period_id: 3, meal_plan_id: 2, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', meal_plan_name: 'Lunch Only Plan', school_period_name: 'Term 3 - AY 2023/2024'},
];
const initialMockMealConsumptionLogs: MealConsumptionLog[] = [];
const initialMockWalletTransactions: WalletTransaction[] = [
    {id: 'WTX001', student_id: 'S002', transaction_date: '2024-07-25T10:00:00Z', transaction_type: WalletTransactionType.DEPOSIT, amount: 500, description: 'Parent Deposit', running_balance: 500, student_name: 'Michael Scofield'},
];
const initialMockStudentWallets: StudentWallet[] = [
    {student_id: 'S001', balance: 0, last_updated: new Date().toISOString(), student_name: 'Jim Halpert'},
    {student_id: 'S002', balance: 500, last_updated: new Date().toISOString(), student_name: 'Michael Scofield'},
    {student_id: 'S003', balance: 1000, last_updated: new Date().toISOString(), student_name: 'Sara Tancredi'},
];

const initialMockGeneralPayments: GeneralPayment[] = [
    { id: 'GPAY001', payer_type: GeneralPayerType.OTHER, payer_name_external: 'Local Community Library', payment_date: '2024-07-15T10:00:00Z', total_amount_paid: 5000, payment_method: 'Cash', notes: 'Donation for library books', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), payer_name_resolved: 'Local Community Library', items: [
        { id: 'GPI001', general_payment_id: 'GPAY001', description: 'Library Donation', amount: 5000, revenue_account_id: 204, revenue_account_name: 'Other Income (Canteen/Shop)'}
    ]}
];
const initialMockGeneralLedgerEntries: GeneralLedgerEntry[] = []; // Added
const initialMockWorkflows: Workflow[] = [
    { id: 1, name: 'Requisition Approval', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), states: [
        { id: 1, workflow_id: 1, name: 'Pending HOD Approval', sequence_order: 1 },
        { id: 2, workflow_id: 1, name: 'Pending Procurement Approval', sequence_order: 2 },
        { id: 3, workflow_id: 1, name: 'Approved', sequence_order: 3 },
        { id: 4, workflow_id: 1, name: 'Rejected', sequence_order: 4 },
    ]},
    { id: 2, name: 'Expense Claim Approval', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), states: [
        { id: 5, workflow_id: 2, name: 'Submitted', sequence_order: 1 },
        { id: 6, workflow_id: 2, name: 'Approved by Manager', sequence_order: 2 },
        { id: 7, workflow_id: 2, name: 'Processed for Payment', sequence_order: 3 },
    ]},
];

const initialMockRequisitions: Requisition[] = [
    { id: 'REQ001', requesting_staff_id: 'STF002', request_date: '2024-07-20', status: RequisitionStatus.PENDING_APPROVAL, notes: 'Need new whiteboard markers for Science lab.', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requesting_staff_name: 'Dwight Schrute', department_name: 'Academics', total_requested_value: 3000, items: [{id: 'RQI001', requisition_id: 'REQ001', item_id: 'ITEM001', quantity_requested: 10, unit_price: 300, item_name: 'Whiteboard Markers (Box)', line_total: 3000}]},
    { id: 'REQ002', requesting_staff_id: 'STF001', request_date: '2024-07-22', status: RequisitionStatus.APPROVED, notes: 'Printer paper for admin office.', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), requesting_staff_name: 'Michael Scott', department_name: 'Administration', total_requested_value: 2500, items: [{id: 'RQI002', requisition_id: 'REQ002', item_id: 'ITEM002', quantity_requested: 5, unit_price: 500, item_name: 'A4 Ream Paper', line_total: 2500}]},
];

const initialMockRfqs: RFQ[] = [
    { id: 'RFQ001', title: 'Supply of 100 Reams of A4 Paper', issue_date: '2024-07-01', closing_date: '2024-07-15', status: RFQStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: 'Request for quotations for the supply of 100 reams of A4 printing paper, 80gsm.' },
    { id: 'RFQ002', title: 'Catering Services for Annual Sports Day', issue_date: '2024-06-15', closing_date: '2024-06-30', status: RFQStatus.CLOSED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: 'Seeking bids for catering services for approximately 500 people for the annual sports day event.' },
    { id: 'RFQ003', title: 'Maintenance of School Generator', issue_date: '2024-07-10', closing_date: '2024-07-25', status: RFQStatus.OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: 'Annual maintenance contract for the 50KVA school generator.' },
];


// Exporting rawInitialData for direct import
export const rawInitialData = {
    initialMockSchoolDetails: initialMockSchoolDetails,
    initialMockRoles: initialMockRoles,
    initialMockUsers: initialMockUsers,
    initialMockWorkflows: initialMockWorkflows,
    initialMockStudents: initialMockStudents,
    initialMockStaff: initialMockStaff,
    initialMockClasses: initialMockClasses,
    initialMockSubjects: initialMockSubjects,
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
    initialMockSupplierInvoices: initialMockSupplierInvoices,
    initialMockStudentExamResults: [] as StudentExamResultWithDetails[],
    initialMockClassSubjectAllocations: [] as ClassSubjectAllocation[],
    initialMockTeacherSubjectAssignments: [] as TeacherSubjectAssignment[],
    initialMockStudentSubjectEnrollments: [] as StudentSubjectEnrollment[],
    initialMockTimetableEntries: [] as TimetableEntry[],
    initialMockWarehouses: [] as Warehouse[],
    initialMockItemCategoriesInv: [] as ItemCategoryInv[],
    initialMockItemsInv: [] as ItemInv[],
    initialMockFixedAssets: [] as FixedAsset[],
    initialMockRequisitions: initialMockRequisitions,
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
    initialMockCustomerInvoices: initialMockCustomerInvoices,
    initialMockMealPlans: initialMockMealPlans,
    initialMockMenus: initialMockMenus,
    initialMockMerchants: initialMockMerchants,
    initialMockAuditLogs: [] as AuditLog[],
    initialMockExpenseClaims: initialMockExpenseClaims,
    initialMockStudentOpeningBalances: initialMockStudentOpeningBalances,
    initialMockFeeAdjustments: initialMockFeeAdjustments,
    initialMockTransportRoutes: initialMockTransportRoutes,
    initialMockStudentTransportAssignments: initialMockStudentTransportAssignments,
    initialMockStudentInvoices: initialMockStudentInvoices,
    initialMockStudentInvoiceItems: initialMockStudentInvoiceItems,
    initialMockStudentPayments: initialMockStudentPayments,
    initialMockInvoicePaymentApplications: initialMockInvoicePaymentApplications,
    initialMockStudentMealPlans: initialMockStudentMealPlans,
    initialMockMealConsumptionLogs: initialMockMealConsumptionLogs,
    initialMockWalletTransactions: initialMockWalletTransactions,
    initialMockStudentWallets: initialMockStudentWallets,
    initialMockGeneralPayments: initialMockGeneralPayments,
    initialMockGeneralLedgerEntries: initialMockGeneralLedgerEntries,
    initialMockFeeTemplateItems: initialMockFeeTemplateItemsFromRaw,
    initialMockRfqs: initialMockRfqs, // Added RFQs to raw data
  };

// Helper to create loading states for all entities
export type AppDataLoadingStates = { 
  all: boolean;
  schoolDetails: boolean;
  roles: boolean;
  users: boolean;
  students: boolean; staff: boolean; classes: boolean; subjects: boolean;
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
  expenseClaims: boolean; 
  studentOpeningBalances: boolean; 
  feeAdjustments: boolean; 
  transportRoutes: boolean; 
  studentTransportAssignments: boolean; 
  studentInvoices: boolean; 
  studentInvoiceItems: boolean; 
  studentPayments: boolean; 
  invoicePaymentApplications: boolean; 
  studentMealPlans: boolean;
  mealConsumptionLogs: boolean;
  walletTransactions: boolean;
  studentWallets: boolean;
  generalPayments: boolean;
  generalPaymentItems: boolean;
  generalLedgerEntries: boolean;
  feeTemplateItems: boolean;
  rfqs: boolean; 
};


const createLoadingStates = (): AppDataLoadingStates => ({ 
  all: true, schoolDetails: true, roles: true, users: true,
  students: true, staff: true, classes: true, subjects: true,
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
  expenseClaims: true, 
  studentOpeningBalances: true, 
  feeAdjustments: true, 
  transportRoutes: true, 
  studentTransportAssignments: true, 
  studentInvoices: true, 
  studentInvoiceItems: true, 
  studentPayments: true, 
  invoicePaymentApplications: true, 
  studentMealPlans: true,
  mealConsumptionLogs: true,
  walletTransactions: true,
  studentWallets: true,
  generalPayments: true,
  generalPaymentItems: true,
  generalLedgerEntries: true,
  feeTemplateItems: true,
  rfqs: true, 
});


export const useMockData = () => {
  // State for all entities
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetails | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjectsState, setSubjectsState] = useState<Subject[]>(initialMockSubjects); // Renamed for clarity
  const [users, setUsers] = useState<User[]>(initialMockUsers);
  const [departments, setDepartments] = useState<Department[]>(initialMockDepartments);
  const [designations, setDesignations] = useState<Designation[]>(initialMockDesignations);
  const [studentCategories, setStudentCategories] = useState<StudentCategory[]>(initialMockStudentCategories);
  const [dormitories, setDormitories] = useState<Dormitory[]>(initialMockDormitories);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialMockAcademicYears);
  const [schoolPeriods, setSchoolPeriods] = useState<SchoolPeriod[]>(initialMockSchoolPeriods);
  const [academicYearStructuresState, setAcademicYearStructuresState] = useState<AcademicYearStructure[]>(initialMockAcademicYearStructures);
  const [academicPeriodDefinitionsState, setAcademicPeriodDefinitionsState] = useState<AcademicPeriodDefinition[]>(initialMockAcademicPeriodDefinitions);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(initialMockFinancialYears);
  const [classStreams, setClassStreams] = useState<ClassStream[]>(initialMockClassStreams);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(initialMockChartOfAccounts);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(initialMockExpenseCategories);
  const [banks, setBanks] = useState<Bank[]>(initialMockBanks);
  const [suppliersState, setSuppliersState] = useState<Supplier[]>(initialMockSuppliers); // Renamed for clarity
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>(initialMockFeeTemplates);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>(initialMockExpenseClaims);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>(initialMockCustomerInvoices);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>(initialMockSupplierInvoices);
  const [studentOpeningBalances, setStudentOpeningBalances] = useState<StudentOpeningBalance[]>(initialMockStudentOpeningBalances);
  const [feeAdjustments, setFeeAdjustments] = useState<FeeAdjustment[]>(initialMockFeeAdjustments);
  const [transportRoutes, setTransportRoutes] = useState<TransportRoute[]>(initialMockTransportRoutes);
  const [studentTransportAssignments, setStudentTransportAssignments] = useState<StudentTransportAssignment[]>(initialMockStudentTransportAssignments);
  const [studentInvoices, setStudentInvoices] = useState<StudentInvoice[]>(initialMockStudentInvoices);
  const [studentInvoiceItems, setStudentInvoiceItems] = useState<StudentInvoiceItem[]>(initialMockStudentInvoiceItems);
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>(initialMockStudentPayments);
  const [invoicePaymentApplications, setInvoicePaymentApplications] = useState<InvoicePaymentApplication[]>(initialMockInvoicePaymentApplications);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(initialMockMealPlans);
  const [studentMealPlans, setStudentMealPlans] = useState<StudentMealPlan[]>(initialMockStudentMealPlans);
  const [menus, setMenus] = useState<Menu[]>(initialMockMenus);
  const [mealConsumptionLogs, setMealConsumptionLogs] = useState<MealConsumptionLog[]>(initialMockMealConsumptionLogs);
  const [merchants, setMerchants] = useState<Merchant[]>(initialMockMerchants);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(initialMockWalletTransactions);
  const [studentWallets, setStudentWallets] = useState<StudentWallet[]>(initialMockStudentWallets);
  const [generalPayments, setGeneralPayments] = useState<GeneralPayment[]>(initialMockGeneralPayments);
  const [generalLedgerEntries, setGeneralLedgerEntries] = useState<GeneralLedgerEntry[]>(initialMockGeneralLedgerEntries);
  const [feeTemplateItems, setFeeTemplateItems] = useState<FeeTemplateItem[]>(initialMockFeeTemplateItemsFromRaw);
  const [auditLogsState, setAuditLogsState] = useState<AuditLog[]>([]); // Renamed from auditLogs
  const [requisitionsState, setRequisitionsState] = useState<Requisition[]>(initialMockRequisitions);
  const [rfqsState, setRfqsState] = useState<RFQ[]>(initialMockRfqs); // Added RFQ state

  const [loading, setLoading] = useState<AppDataLoadingStates>(createLoadingStates()); // Renamed from LoadingStates




  useEffect(() => {
    const loadAllData = async () => {
      // console.log("useMockData: Starting to load mock data..."); // Redundant with AppDataProvider log
      setLoading(createLoadingStates());

      await delay(MOCK_API_DELAY);

      setSchoolDetails(rawInitialData.initialMockSchoolDetails);
      setRoles(rawInitialData.initialMockRoles);
      setUsers(rawInitialData.initialMockUsers);
      setWorkflows(rawInitialData.initialMockWorkflows);
      setStudents(rawInitialData.initialMockStudents);
      setStaffList(rawInitialData.initialMockStaff);
      setClasses(rawInitialData.initialMockClasses);
      setSubjectsState(rawInitialData.initialMockSubjects);
      setDepartments(rawInitialData.initialMockDepartments);
      setDesignations(rawInitialData.initialMockDesignations);
      setStudentCategories(rawInitialData.initialMockStudentCategories);
      setDormitories(rawInitialData.initialMockDormitories);
      setAcademicYears(rawInitialData.initialMockAcademicYears);
      setSchoolPeriods(rawInitialData.initialMockSchoolPeriods);
      setAcademicYearStructuresState(rawInitialData.initialMockAcademicYearStructures);
      setAcademicPeriodDefinitionsState(rawInitialData.initialMockAcademicPeriodDefinitions);
      setFinancialYears(rawInitialData.initialMockFinancialYears);
      setClassStreams(rawInitialData.initialMockClassStreams);
      setCustomers(rawInitialData.initialMockCustomers);
      setChartOfAccounts(rawInitialData.initialMockChartOfAccounts);
      setExpenseCategories(rawInitialData.initialMockExpenseCategories);
      setBanks(rawInitialData.initialMockBanks);
      setSuppliersState(rawInitialData.initialMockSuppliers);
      setFeeTemplates(rawInitialData.initialMockFeeTemplates);
      setExpenseClaims(rawInitialData.initialMockExpenseClaims);
      setCustomerInvoices(rawInitialData.initialMockCustomerInvoices);
      setSupplierInvoices(rawInitialData.initialMockSupplierInvoices);
      setStudentOpeningBalances(rawInitialData.initialMockStudentOpeningBalances);
      setFeeAdjustments(rawInitialData.initialMockFeeAdjustments);
      setTransportRoutes(rawInitialData.initialMockTransportRoutes);
      setStudentTransportAssignments(rawInitialData.initialMockStudentTransportAssignments);
      setStudentInvoices(rawInitialData.initialMockStudentInvoices);
      setStudentInvoiceItems(rawInitialData.initialMockStudentInvoiceItems);
      setStudentPayments(rawInitialData.initialMockStudentPayments);
      setInvoicePaymentApplications(rawInitialData.initialMockInvoicePaymentApplications);
      setMealPlans(rawInitialData.initialMockMealPlans);
      setStudentMealPlans(rawInitialData.initialMockStudentMealPlans);
      setMenus(rawInitialData.initialMockMenus);
      setMealConsumptionLogs(rawInitialData.initialMockMealConsumptionLogs);
      setMerchants(rawInitialData.initialMockMerchants);
      setWalletTransactions(rawInitialData.initialMockWalletTransactions);
      setStudentWallets(rawInitialData.initialMockStudentWallets);
      setGeneralPayments(rawInitialData.initialMockGeneralPayments);
      setGeneralLedgerEntries(rawInitialData.initialMockGeneralLedgerEntries);
      setFeeTemplateItems(rawInitialData.initialMockFeeTemplateItems);
      setAuditLogsState(rawInitialData.initialMockAuditLogs);
      setRequisitionsState(rawInitialData.initialMockRequisitions);
      setRfqsState(rawInitialData.initialMockRfqs); // Set RFQs state


      setLoading(prev => {
        const newLoadingStates = { ...prev };
        let hasChanges = false;
        for (const key in newLoadingStates) {
            if (newLoadingStates[key as keyof AppDataLoadingStates] === true) {
                newLoadingStates[key as keyof AppDataLoadingStates] = false;
                hasChanges = true;
            }
        }
        newLoadingStates.all = false;
        if (!hasChanges && prev.all === false) return prev; // No actual change, return previous state reference
        
        // console.log("useMockData: Mock data loading complete. Loading states set to false."); // Redundant
        return newLoadingStates;
      });
    };

    loadAllData().catch(error => {
        console.error("useMockData: Error during mock data loading:", error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- CRUD Stubs ---
  const unimplementedAsync = async (..._args: any[]): Promise<any> => { console.warn("Mock function not implemented yet."); return null; };
  const unimplementedSync = (..._args: any[]): any[] => { console.warn("Mock getter not implemented yet."); return []; };

  const getStudentDetailsById = useCallback(async (id: string): Promise<StudentDetailProfile | null> => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === id);
    if (!student) return null;

    const mockEnrolledSubjects: StudentEnrolledSubject[] = [
      { id: `SUBJ${id}001`, courseName: 'Mathematics Core', professorInstructorName: 'Dr. E. Noether', status: 'Enrolled' },
      { id: `SUBJ${id}002`, courseName: 'English Literature', professorInstructorName: 'Prof. W. Shakespeare', status: 'Enrolled' },
    ];
    const mockPaymentHistory: StudentPaymentLogItem[] = studentPayments
      .filter(p => p.student_id === id)
      .map(p => ({
          id: p.id,
          transactionId: p.receipt_no,
          paymentDate: p.transaction_date,
          amount: p.total_amount_paid,
          paymentMethod: p.payment_method,
          description: p.reference_no || 'Fee Payment',
          status: 'Paid'
      }));
    const mockFinancialSummary: StudentFinancialSummary = {
        currentBalance: (studentInvoices.filter(inv => inv.student_id === id).reduce((sum, inv) => sum + inv.total_amount_billed, 0)) - (studentPayments.filter(p=>p.student_id === id).reduce((sum,p)=> sum + p.total_amount_paid, 0)),
        totalFees: studentInvoices.filter(inv => inv.student_id === id).reduce((sum, inv) => sum + inv.total_amount_billed, 0),
        totalPaid: studentPayments.filter(p=>p.student_id === id).reduce((sum,p)=> sum + p.total_amount_paid, 0),
        totalDiscount: feeAdjustments.filter(adj => adj.student_id === id && adj.amount < 0).reduce((sum, adj) => sum + Math.abs(adj.amount), 0),
        totalFine: feeAdjustments.filter(adj => adj.student_id === id && adj.amount > 0).reduce((sum, adj) => sum + adj.amount, 0),
    };
     const mockInvoicesCharges: StudentInvoiceChargeItem[] = studentInvoices
        .filter(inv => inv.student_id === id)
        .flatMap(inv => (inv.items || []).map(item => ({
            id: item.id,
            invoiceId: inv.invoice_number,
            feeTypeDescription: item.description,
            dueDate: inv.due_date,
            amount: item.amount,
            status: inv.status
        })));

    return {
      ...student,
      enrolled_subjects: mockEnrolledSubjects,
      payment_history: mockPaymentHistory,
      father_name: `Father of ${student.first_name}`,
      mother_name: `Mother of ${student.first_name}`,
      address: student.address || '123 Main St, Anytown',
      remarks: student.remarks || 'A dedicated and hardworking student.',
      religion: student.religion || 'Christian',
      county: student.county || 'Nairobi',
      district: student.district || 'Westlands',
      student_type: student.student_category_name,
      primary_school: student.primary_school || 'Local Primary School',
      marks_attained_primary: student.marks_attained_primary || 'N/A',
      class_admitted: student.current_class_name,
      stream_admitted: student.current_class_stream_name,
      email: student.email || `${student.first_name.toLowerCase()}@example.com`,
      phone: student.phone || '0700111222',
      financial_summary: mockFinancialSummary,
      invoices_charges: mockInvoicesCharges,
    };
  }, [students, studentPayments, studentInvoices, feeAdjustments]);

  const getStudentFinancialDetailsById = getStudentDetailsById;


  const updateSchoolDetails = useCallback(async (details: Partial<SchoolDetails>): Promise<SchoolDetails> => {
    await delay(MOCK_API_DELAY);
    const updatedDetails = { ...(schoolDetails || initialMockSchoolDetails), ...details, updated_at: new Date().toISOString() };
    setSchoolDetails(updatedDetails);
    return updatedDetails;
  }, [schoolDetails]);

  const addUser = useCallback(async (userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login_at' | 'display_name' | 'hashed_password'> & { password?: string }): Promise<User> => {
    await delay(MOCK_API_DELAY);
    const roleInfo = roles.find(r => r.id === userData.role_id);
    const newUser: User = {
      ...userData,
      id: `USR_${Date.now()}`,
      display_name: userData.username,
      role: roleInfo?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      hashed_password: `hashed_${userData.password || 'password123'}`,
    };
    delete newUser.password;
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, [roles]);

  const updateUser = useCallback(async (updatedUserData: Partial<User> & { id: string }): Promise<User> => {
    await delay(MOCK_API_DELAY);
    let finalUser: User | undefined;
    setUsers(prev => prev.map(user => {
      if (user.id === updatedUserData.id) {
        const roleInfo = roles.find(r => r.id === updatedUserData.role_id);
        finalUser = { ...user, ...updatedUserData, role: roleInfo?.name || user.role, updated_at: new Date().toISOString() };
        return finalUser;
      }
      return user;
    }));
    if (!finalUser) throw new Error("User not found for update");
    return finalUser;
  }, [roles]);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    await delay(MOCK_API_DELAY);
    setUsers(prev => prev.filter(user => user.id !== userId));
  }, []);

  const addRole = useCallback(async (roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> => {
    await delay(MOCK_API_DELAY);
    const newRole: Role = { ...roleData, id: Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setRoles(prev => [...prev, newRole]);
    return newRole;
  }, []);

  const updateRole = useCallback(async (updatedRoleData: Role): Promise<Role> => {
    await delay(MOCK_API_DELAY);
    const roleToUpdate = { ...updatedRoleData, updated_at: new Date().toISOString() };
    setRoles(prev => prev.map(role => role.id === roleToUpdate.id ? roleToUpdate : role));
    return roleToUpdate;
  }, []);

  const deleteRole = useCallback(async (roleId: number): Promise<void> => {
    await delay(MOCK_API_DELAY);
    setRoles(prev => prev.filter(role => role.id !== roleId));
    setUsers(prevUsers => prevUsers.map(u => u.role_id === roleId ? {...u, role_id: undefined, role: undefined} : u));
  }, []);

  const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at' | 'current_class_name' | 'current_class_stream_name' | 'student_category_name' | 'dormitory_name' | 'primary_guardian' | 'exam_result_summary' | 'display_name'>, guardianData?: Omit<ParentGuardian, 'id'|'created_at'|'updated_at'> & {relationship_type: string, id?:string}) : Promise<Student> => {
    await delay(MOCK_API_DELAY);
    const studentCategory = rawInitialData.initialMockStudentCategories.find(sc => sc.id === studentData.student_category_id);
    const dormitory = rawInitialData.initialMockDormitories.find(d => d.id === studentData.dormitory_id);
    const classStream = rawInitialData.initialMockClassStreams.find(cs => cs.id === studentData.current_class_stream_id);
    const schoolClass = rawInitialData.initialMockClasses.find(c => c.id === classStream?.class_id);

    const newStudent: Student = {
      ...studentData,
      id: `S${Date.now()}`,
      student_category_name: studentCategory?.name,
      dormitory_name: dormitory?.name,
      current_class_name: schoolClass?.name,
      current_class_stream_name: classStream?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: `${studentData.first_name} ${studentData.last_name}`,
    };
    setStudents(prev => [...prev, newStudent]);
    return newStudent;
  }, []); 

  const updateStudent = useCallback(async (updatedStudentData: Student, guardianData?: Omit<ParentGuardian, 'id'|'created_at'|'updated_at'> & {relationship_type: string, id?:string}): Promise<StudentDetailProfile> => {
    await delay(MOCK_API_DELAY);
    const studentCategory = rawInitialData.initialMockStudentCategories.find(sc => sc.id === updatedStudentData.student_category_id);
    const dormitory = rawInitialData.initialMockDormitories.find(d => d.id === updatedStudentData.dormitory_id);
    const classStream = rawInitialData.initialMockClassStreams.find(cs => cs.id === updatedStudentData.current_class_stream_id);
    const schoolClass = rawInitialData.initialMockClasses.find(c => c.id === classStream?.class_id);

    const studentToUpdate: Student = {
      ...updatedStudentData,
      student_category_name: studentCategory?.name || updatedStudentData.student_category_name,
      dormitory_name: dormitory?.name || updatedStudentData.dormitory_name,
      current_class_name: schoolClass?.name || updatedStudentData.current_class_name,
      current_class_stream_name: classStream?.name || updatedStudentData.current_class_stream_name,
      updated_at: new Date().toISOString(),
      display_name: `${updatedStudentData.first_name} ${updatedStudentData.last_name}`,
    };

    setStudents(prev => prev.map(s => s.id === studentToUpdate.id ? studentToUpdate : s));
    return studentToUpdate as StudentDetailProfile; 
  }, []); 

  const deleteStudent = useCallback(async (studentId: string) => {
    await delay(MOCK_API_DELAY);
    setStudents(prev => prev.filter(s => s.id !== studentId));
  }, []);

  const addStaffMember = useCallback(async (staffData: Omit<Staff, 'id'|'created_at'|'updated_at'|'department_name'|'designation_title'|'hod_of_department_name' | 'user_username' | 'email' | 'display_name'>) => {
    await delay(MOCK_API_DELAY);
    const department = rawInitialData.initialMockDepartments.find(d => d.id === staffData.department_id);
    const designation = rawInitialData.initialMockDesignations.find(d => d.id === staffData.designation_id);
    const hodDepartment = rawInitialData.initialMockDepartments.find(d => d.id === staffData.hod_of_department_id);
    const newStaff: Staff = {
      ...staffData,
      id: `STF${Date.now()}`,
      department_name: department?.name,
      designation_title: designation?.title,
      hod_of_department_name: hodDepartment?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: `${staffData.first_name} ${staffData.last_name}`,
    };
    setStaffList(prev => [...prev, newStaff]);
    return newStaff;
  }, []); 

  const updateStaffMember = useCallback(async (updatedStaffData: Staff) => {
    await delay(MOCK_API_DELAY);
    const department = rawInitialData.initialMockDepartments.find(d => d.id === updatedStaffData.department_id);
    const designation = rawInitialData.initialMockDesignations.find(d => d.id === updatedStaffData.designation_id);
    const hodDepartment = rawInitialData.initialMockDepartments.find(d => d.id === updatedStaffData.hod_of_department_id);
    const staffToUpdate: Staff = {
        ...updatedStaffData,
        department_name: department?.name || updatedStaffData.department_name,
        designation_title: designation?.title || updatedStaffData.designation_title,
        hod_of_department_name: hodDepartment?.name || updatedStaffData.hod_of_department_name,
        updated_at: new Date().toISOString(),
        display_name: `${updatedStaffData.first_name} ${updatedStaffData.last_name}`,
    };
    setStaffList(prev => prev.map(s => s.id === staffToUpdate.id ? staffToUpdate : s));
    return staffToUpdate;
  }, []); 

  const deleteStaffMember = useCallback(async (staffId: string) => {
    await delay(MOCK_API_DELAY);
    setStaffList(prev => prev.filter(s => s.id !== staffId));
  }, []);

  // --- CRUD for Class ---
  const addClass = useCallback(async (classData: Omit<Class, 'id' | 'streams'>): Promise<Class> => {
    await delay(MOCK_API_DELAY);
    const newClass: Class = { ...classData, id: Date.now(), streams: [] };
    setClasses(prev => [...prev, newClass]);
    return newClass;
  }, []);

  const updateClass = useCallback(async (updatedClass: Class): Promise<Class> => {
    await delay(MOCK_API_DELAY);
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    return updatedClass;
  }, []);

  const deleteClass = useCallback(async (classId: number): Promise<void> => {
    await delay(MOCK_API_DELAY);
    setClasses(prev => prev.filter(c => c.id !== classId));
    setClassStreams(prev => prev.filter(cs => cs.class_id !== classId));
  }, []);

  // --- CRUD for ClassStream ---
  const addClassStream = useCallback(async (classId: number, streamData: Omit<ClassStream, 'id' | 'class_id' | 'class_name' | 'class_teacher_name'>): Promise<ClassStream> => {
    await delay(MOCK_API_DELAY);
    const parentClass = classes.find(c => c.id === classId);
    const teacher = staffList.find(s => s.id === streamData.class_teacher_id);
    const newStream: ClassStream = {
      ...streamData,
      id: Date.now(),
      class_id: classId,
      class_name: parentClass?.name || 'N/A',
      class_teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A',
    };
    setClassStreams(prev => [...prev, newStream]);
    setClasses(prevClasses => prevClasses.map(c =>
        c.id === classId ? {...c, streams: [...(c.streams || []), newStream]} : c
    ));
    return newStream;
  }, [classes, staffList]);

  const updateClassStream = useCallback(async (updatedStream: ClassStream): Promise<ClassStream> => {
    await delay(MOCK_API_DELAY);
    const parentClass = classes.find(c => c.id === updatedStream.class_id);
    const teacher = staffList.find(s => s.id === updatedStream.class_teacher_id);
    const streamToUpdate = {
      ...updatedStream,
      class_name: parentClass?.name || updatedStream.class_name || 'N/A',
      class_teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : (updatedStream.class_teacher_name || 'N/A'),
    };
    setClassStreams(prev => prev.map(cs => cs.id === streamToUpdate.id ? streamToUpdate : cs));
     setClasses(prevClasses => prevClasses.map(c =>
        c.id === streamToUpdate.class_id ? {
            ...c,
            streams: (c.streams || []).map(s => s.id === streamToUpdate.id ? streamToUpdate : s)
        } : c
    ));
    return streamToUpdate;
  }, [classes, staffList]);

  const deleteClassStream = useCallback(async (streamId: number): Promise<void> => {
    await delay(MOCK_API_DELAY);
    const streamToDelete = classStreams.find(cs => cs.id === streamId);
    setClassStreams(prev => prev.filter(cs => cs.id !== streamId));
    if (streamToDelete) {
        setClasses(prevClasses => prevClasses.map(c =>
            c.id === streamToDelete.class_id ? {
                ...c,
                streams: (c.streams || []).filter(s => s.id !== streamId)
            } : c
        ));
    }
  }, [classStreams]);

  // --- CRUD for Workflows ---
  const addWorkflow = useCallback(async (workflowData: Omit<Workflow, 'id' | 'states' | 'created_at' | 'updated_at'>): Promise<Workflow> => {
    await delay(MOCK_API_DELAY);
    const newWorkflow: Workflow = {
      ...workflowData,
      id: Date.now(),
      states: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    return newWorkflow;
  }, []);

  const updateWorkflow = useCallback(async (updatedWorkflowData: Partial<Workflow> & { id: number }): Promise<Workflow> => {
    await delay(MOCK_API_DELAY);
    let finalWorkflow: Workflow | undefined;
    setWorkflows(prev => prev.map(wf => {
      if (wf.id === updatedWorkflowData.id) {
        finalWorkflow = { ...wf, ...updatedWorkflowData, updated_at: new Date().toISOString() };
        return finalWorkflow;
      }
      return wf;
    }));
    if (!finalWorkflow) throw new Error("Workflow not found for update");
    return finalWorkflow;
  }, []);

  const deleteWorkflow = useCallback(async (workflowId: number): Promise<void> => {
    await delay(MOCK_API_DELAY);
    setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
  }, []);

  // --- CRUD for WorkflowStates ---
  const addWorkflowState = useCallback(async (workflowId: number, stateData: Omit<WorkflowState, 'id' | 'workflow_id'>): Promise<WorkflowState> => {
    await delay(MOCK_API_DELAY);
    const newState: WorkflowState = { ...stateData, id: Date.now(), workflow_id: workflowId };
    setWorkflows(prev => prev.map(wf =>
      wf.id === workflowId ? { ...wf, states: [...wf.states, newState].sort((a,b) => a.sequence_order - b.sequence_order), updated_at: new Date().toISOString() } : wf
    ));
    return newState;
  }, []);

  const updateWorkflowState = useCallback(async (workflowId: number, updatedStateData: WorkflowState): Promise<WorkflowState> => {
    await delay(MOCK_API_DELAY);
    setWorkflows(prev => prev.map(wf => {
      if (wf.id === workflowId) {
        const updatedStates = wf.states.map(s => s.id === updatedStateData.id ? updatedStateData : s).sort((a,b) => a.sequence_order - b.sequence_order);
        return { ...wf, states: updatedStates, updated_at: new Date().toISOString() };
      }
      return wf;
    }));
    return updatedStateData;
  }, []);

  const deleteWorkflowState = useCallback(async (workflowId: number, stateId: number): Promise<void> => {
    await delay(MOCK_API_DELAY);
    setWorkflows(prev => prev.map(wf =>
      wf.id === workflowId ? { ...wf, states: wf.states.filter(s => s.id !== stateId), updated_at: new Date().toISOString() } : wf
    ));
  }, []);


  const addCustomer = useCallback(async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    await delay(MOCK_API_DELAY);
    const newCustomer: Customer = {
      ...data,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, []);

  const updateCustomer = useCallback(async (updatedCustomer: Customer) => {
    await delay(MOCK_API_DELAY);
    const customerToUpdate = {...updatedCustomer, updated_at: new Date().toISOString()};
    setCustomers(prev => prev.map(c => c.id === customerToUpdate.id ? customerToUpdate : c));
    return customerToUpdate;
  }, []);

  const deleteCustomer = useCallback(async (customerId: number) => {
    await delay(MOCK_API_DELAY);
    setCustomers(prev => prev.filter(c => c.id !== customerId));
  }, []);

  const addChartOfAccount = useCallback(async (data: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at' | 'expense_category_name'>): Promise<ChartOfAccount> => {
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

  const updateChartOfAccount = useCallback(async (updatedAccountData: ChartOfAccount): Promise<ChartOfAccount> => {
    await delay(MOCK_API_DELAY);
    const accountToUpdate: ChartOfAccount = {
        ...updatedAccountData,
        expense_category_name: updatedAccountData.expense_category_id 
            ? expenseCategories.find(ec => ec.id === updatedAccountData.expense_category_id)?.name 
            : undefined,
        updated_at: new Date().toISOString()
    };
    setChartOfAccounts(prev => prev.map(acc => acc.id === accountToUpdate.id ? accountToUpdate : acc));
    return accountToUpdate;
  }, [expenseCategories]);

  const deleteChartOfAccount = useCallback(async (accountId: number) => {
    await delay(MOCK_API_DELAY);
    setChartOfAccounts(prev => prev.filter(acc => acc.id !== accountId));
  }, []);

  const addBank = useCallback(async (data: Omit<Bank, 'id' | 'created_at' | 'updated_at' | 'gl_account_name'>): Promise<Bank> => {
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

  const updateBank = useCallback(async (updatedBankData: Bank): Promise<Bank> => {
    await delay(MOCK_API_DELAY);
    const bankToUpdate: Bank = { // Explicitly type here
      ...updatedBankData,
      gl_account_name: chartOfAccounts.find(coa => coa.id === updatedBankData.gl_account_id)?.name,
      updated_at: new Date().toISOString(),
    };
    setBanks(prevBanks =>
      prevBanks.map(b => (b.id === bankToUpdate.id ? bankToUpdate : b))
    );
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
    setSuppliersState(prev => [...prev, newSupplier]);
    return newSupplier;
  }, []);

  const updateSupplier = useCallback(async (updatedSupplier: Supplier) => {
    await delay(MOCK_API_DELAY);
    const supplierToUpdate = {...updatedSupplier, updated_at: new Date().toISOString()};
    setSuppliersState(prev => prev.map(s => s.id === supplierToUpdate.id ? supplierToUpdate : s));
    return supplierToUpdate;
  }, []);

  const deleteSupplier = useCallback(async (supplierId: number) => {
    await delay(MOCK_API_DELAY);
    setSuppliersState(prev => prev.filter(s => s.id !== supplierId));
  }, []);

  const addFeeTemplate = useCallback(async (data: Omit<FeeTemplate, 'id'|'created_at'|'updated_at'|'items'|'school_period_name'|'student_category_name'> & {items?: FeeTemplateItem[]}) => {
    await delay(MOCK_API_DELAY);
    const newTemplate: FeeTemplate = {
      ...data,
      id: Date.now(),
      items: (data.items || []).map((item, index) => ({
        ...item,
        id: item.id || `fti-new-${Date.now()}-${index}`, // Assign new ID if not present
        fee_template_id: 0, // Will be set to newTemplate.id below
        revenue_account_name: chartOfAccounts.find(c => c.id === item.revenue_account_id)?.name,
        linked_expense_category_name: expenseCategories.find(e => e.id === item.linked_expense_category_id)?.name,
      })),
      school_period_name: schoolPeriods.find(sp => sp.id === data.school_period_id)?.name,
      student_category_name: data.student_category_id ? studentCategories.find(sc => sc.id === data.student_category_id)?.name : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    newTemplate.items?.forEach(item => item.fee_template_id = newTemplate.id);
    setFeeTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, [schoolPeriods, studentCategories, chartOfAccounts, expenseCategories]);

  const updateFeeTemplate = useCallback(async (updatedTemplate: FeeTemplate) => {
    await delay(MOCK_API_DELAY);
    const templateToUpdate: FeeTemplate = {
        ...updatedTemplate,
        items: (updatedTemplate.items || []).map((item, index) => ({
            ...item,
            id: item.id || `fti-upd-${Date.now()}-${index}`, // Assign new ID if missing
            fee_template_id: updatedTemplate.id,
            revenue_account_name: chartOfAccounts.find(c => c.id === item.revenue_account_id)?.name,
            linked_expense_category_name: expenseCategories.find(e => e.id === item.linked_expense_category_id)?.name,
        })),
        school_period_name: schoolPeriods.find(sp => sp.id === updatedTemplate.school_period_id)?.name,
        student_category_name: updatedTemplate.student_category_id ? studentCategories.find(sc => sc.id === updatedTemplate.student_category_id)?.name : undefined,
        updated_at: new Date().toISOString()
    };
    setFeeTemplates(prev => prev.map(ft => ft.id === templateToUpdate.id ? templateToUpdate : ft));
    return templateToUpdate;
  }, [schoolPeriods, studentCategories, chartOfAccounts, expenseCategories]);

  const deleteFeeTemplate = useCallback(async (templateId: number) => {
    await delay(MOCK_API_DELAY);
    setFeeTemplates(prev => prev.filter(ft => ft.id !== templateId));
  }, []);

  const addExpenseClaim = useCallback(async (data: Omit<ExpenseClaim, 'id'|'created_at'|'updated_at'|'claimant_name'|'expense_category_name'>): Promise<ExpenseClaim> => {
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
      expense_category_name: expenseCategories.find(ec => ec.id === data.expense_category_id)?.name || 'N/A',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setExpenseClaims(prev => [...prev, newClaim]);
    return newClaim;
  }, [staffList, students, expenseCategories]);

  const updateExpenseClaim = useCallback(async (updatedClaimData: ExpenseClaim): Promise<ExpenseClaim> => {
    await delay(MOCK_API_DELAY);
    let claimantNameResolved = updatedClaimData.claimant_name; // Keep existing if no change logic
     if (updatedClaimData.claimant_type === ExpenseClaimantType.STAFF) {
      const staffMember = staffList.find(s => s.id === updatedClaimData.claimant_id);
      if (staffMember) claimantNameResolved = `${staffMember.first_name} ${staffMember.last_name}`;
    } else if (updatedClaimData.claimant_type === ExpenseClaimantType.STUDENT) {
      const studentMember = students.find(s => s.id === updatedClaimData.claimant_id);
      if (studentMember) claimantNameResolved = `${studentMember.first_name} ${studentMember.last_name}`;
    }

    const expenseCategoryNameResolved = expenseCategories.find(ec => ec.id === updatedClaimData.expense_category_id)?.name;

    const claimToUpdate: ExpenseClaim = {
        ...updatedClaimData,
        claimant_name: claimantNameResolved || 'N/A',
        expense_category_name: expenseCategoryNameResolved || 'N/A',
        updated_at: new Date().toISOString()
    };
    setExpenseClaims(prev => prev.map(ec => ec.id === claimToUpdate.id ? claimToUpdate : ec));
    return claimToUpdate;
  }, [staffList, students, expenseCategories]);

  const deleteExpenseClaim = useCallback(async (claimId: string) => {
    await delay(MOCK_API_DELAY);
    setExpenseClaims(prev => prev.filter(ec => ec.id !== claimId));
  }, []);

  const addCustomerInvoice = useCallback(async (data: Omit<CustomerInvoice, 'id'|'created_at'|'updated_at'|'items'|'customer_name'> & {items?: Omit<CustomerInvoiceItem, 'id'|'invoice_id'|'revenue_account_name'>[]}) => {
    await delay(MOCK_API_DELAY);
    const customer = customers.find(c => c.id === data.customer_id);
    const newInvoice: CustomerInvoice = {
        ...data,
        id: `CINV${Date.now()}`,
        customer_name: customer?.name,
        items: (data.items || []).map((item, index) => ({
            ...item,
            id: `CIITM-${Date.now()}-${index}`,
            invoice_id: `CINV${Date.now()}`, // Temporary, will match parent
            revenue_account_name: chartOfAccounts.find(coa => coa.id === item.revenue_account_id)?.name,
        })),
        total_amount: (data.items || []).reduce((sum, item) => sum + (item.amount || 0), 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    newInvoice.items?.forEach(item => item.invoice_id = newInvoice.id); // Ensure correct invoice_id
    setCustomerInvoices(prev => [...prev, newInvoice]);
    return newInvoice;
  }, [customers, chartOfAccounts]);

  const updateCustomerInvoice = useCallback(async (updatedInvoice: CustomerInvoice) => {
    await delay(MOCK_API_DELAY);
    const customer = customers.find(c => c.id === updatedInvoice.customer_id);
    const invoiceToUpdate: CustomerInvoice = {
        ...updatedInvoice,
        customer_name: customer?.name,
        items: (updatedInvoice.items || []).map((item, index) => ({
            ...item,
            id: item.id || `CIITM-${Date.now()}-${index}`, // Assign ID if new
            invoice_id: updatedInvoice.id,
            revenue_account_name: chartOfAccounts.find(coa => coa.id === item.revenue_account_id)?.name,
        })),
        total_amount: (updatedInvoice.items || []).reduce((sum, item) => sum + (item.amount || 0), 0),
        updated_at: new Date().toISOString(),
    };
    setCustomerInvoices(prev => prev.map(inv => inv.id === invoiceToUpdate.id ? invoiceToUpdate : inv));
    return invoiceToUpdate;
  }, [customers, chartOfAccounts]);

  const deleteCustomerInvoice = useCallback(async (invoiceId: string) => {
    await delay(MOCK_API_DELAY);
    setCustomerInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  }, []);

  const addSupplierInvoice = useCallback(async (data: Omit<SupplierInvoice, 'id'|'created_at'|'updated_at'|'supplier_name'>) => {
    await delay(MOCK_API_DELAY);
    const supplier = suppliersState.find(s => s.id === data.supplier_id);
    const newInvoice: SupplierInvoice = {
        ...data,
        id: `SINV${Date.now()}`,
        supplier_name: supplier?.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    setSupplierInvoices(prev => [...prev, newInvoice]);
    return newInvoice;
  }, [suppliersState]);

  const updateSupplierInvoice = useCallback(async (updatedInvoice: SupplierInvoice) => {
    await delay(MOCK_API_DELAY);
    const supplier = suppliersState.find(s => s.id === updatedInvoice.supplier_id);
    const invoiceToUpdate = {
        ...updatedInvoice,
        supplier_name: supplier?.name,
        updated_at: new Date().toISOString()
    };
    setSupplierInvoices(prev => prev.map(inv => inv.id === invoiceToUpdate.id ? invoiceToUpdate : inv));
    return invoiceToUpdate;
  }, [suppliersState]);

  const deleteSupplierInvoice = useCallback(async (invoiceId: string) => {
    await delay(MOCK_API_DELAY);
    setSupplierInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  }, []);

  const addStudentOpeningBalance = useCallback(async (data: Omit<StudentOpeningBalance, 'id'|'created_at'|'updated_at'|'student_name'>) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === data.student_id);
    const newBalance: StudentOpeningBalance = {
        ...data,
        id: `SOB${Date.now()}`,
        student_name: student ? `${student.first_name} ${student.last_name}` : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    setStudentOpeningBalances(prev => [...prev, newBalance]);
    return newBalance;
  }, [students]);

  const updateStudentOpeningBalance = useCallback(async (updatedBalance: StudentOpeningBalance) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === updatedBalance.student_id);
    const balanceToUpdate = {
        ...updatedBalance,
        student_name: student ? `${student.first_name} ${student.last_name}` : updatedBalance.student_name,
        updated_at: new Date().toISOString()
    };
    setStudentOpeningBalances(prev => prev.map(bal => bal.id === balanceToUpdate.id ? balanceToUpdate : bal));
    return balanceToUpdate;
  }, [students]);

  const deleteStudentOpeningBalance = useCallback(async (balanceId: string) => {
    await delay(MOCK_API_DELAY);
    setStudentOpeningBalances(prev => prev.filter(bal => bal.id !== balanceId));
  }, []);

  const addFeeAdjustment = useCallback(async (data: Omit<FeeAdjustment, 'id'|'created_at'|'student_name'|'school_period_name'>) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === data.student_id);
    const period = schoolPeriods.find(p => p.id === data.school_period_id);
    const newAdjustment: FeeAdjustment = {
        ...data,
        id: `ADJ${Date.now()}`,
        student_name: student ? `${student.first_name} ${student.last_name}` : undefined,
        school_period_name: period?.name,
        created_at: new Date().toISOString(),
    };
    setFeeAdjustments(prev => [...prev, newAdjustment]);
    return newAdjustment;
  }, [students, schoolPeriods]);

  const updateFeeAdjustment = useCallback(async (updatedAdj: FeeAdjustment) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === updatedAdj.student_id);
    const period = schoolPeriods.find(p => p.id === updatedAdj.school_period_id);
    const adjToUpdate = {
        ...updatedAdj,
        student_name: student ? `${student.first_name} ${student.last_name}` : updatedAdj.student_name,
        school_period_name: period?.name || updatedAdj.school_period_name,
    };
    setFeeAdjustments(prev => prev.map(adj => adj.id === adjToUpdate.id ? adjToUpdate : adj));
    return adjToUpdate;
  }, [students, schoolPeriods]);

  const deleteFeeAdjustment = useCallback(async (adjId: string) => {
    await delay(MOCK_API_DELAY);
    setFeeAdjustments(prev => prev.filter(adj => adj.id !== adjId));
  }, []);

  const addTransportRoute = useCallback(async (data: Omit<TransportRoute, 'id'|'created_at'|'updated_at'|'gl_revenue_account_name'>) => {
    await delay(MOCK_API_DELAY);
    const glAccount = chartOfAccounts.find(coa => coa.id === data.gl_revenue_account_id);
    const newRoute: TransportRoute = {
        ...data,
        id: Date.now(),
        gl_revenue_account_name: glAccount?.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    setTransportRoutes(prev => [...prev, newRoute]);
    return newRoute;
  }, [chartOfAccounts]);

  const updateTransportRoute = useCallback(async (updatedRoute: TransportRoute) => {
    await delay(MOCK_API_DELAY);
    const glAccount = chartOfAccounts.find(coa => coa.id === updatedRoute.gl_revenue_account_id);
    const routeToUpdate = {
        ...updatedRoute,
        gl_revenue_account_name: glAccount?.name,
        updated_at: new Date().toISOString()
    };
    setTransportRoutes(prev => prev.map(r => r.id === routeToUpdate.id ? routeToUpdate : r));
    return routeToUpdate;
  }, [chartOfAccounts]);

  const deleteTransportRoute = useCallback(async (routeId: number) => {
    await delay(MOCK_API_DELAY);
    setTransportRoutes(prev => prev.filter(r => r.id !== routeId));
  }, []);

  const addStudentTransportAssignment = useCallback(async (data: Omit<StudentTransportAssignment, 'id'|'created_at'|'updated_at'|'student_name'|'route_name'|'school_period_name'|'invoice_id'>) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === data.student_id);
    const route = transportRoutes.find(r => r.id === data.route_id);
    const period = schoolPeriods.find(p => p.id === data.school_period_id);
    const newAssignment: StudentTransportAssignment = {
        ...data,
        id: `STA${Date.now()}`,
        student_name: student ? `${student.first_name} ${student.last_name}` : undefined,
        route_name: route?.name,
        school_period_name: period?.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    setStudentTransportAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  }, [students, transportRoutes, schoolPeriods]);

  const updateStudentTransportAssignment = useCallback(async (updatedAssignment: StudentTransportAssignment) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === updatedAssignment.student_id);
    const route = transportRoutes.find(r => r.id === updatedAssignment.route_id);
    const period = schoolPeriods.find(p => p.id === updatedAssignment.school_period_id);
    const assignmentToUpdate = {
        ...updatedAssignment,
        student_name: student ? `${student.first_name} ${student.last_name}` : updatedAssignment.student_name,
        route_name: route?.name || updatedAssignment.route_name,
        school_period_name: period?.name || updatedAssignment.school_period_name,
        updated_at: new Date().toISOString(),
    };
    setStudentTransportAssignments(prev => prev.map(a => a.id === assignmentToUpdate.id ? assignmentToUpdate : a));
    return assignmentToUpdate;
  }, [students, transportRoutes, schoolPeriods]);

  const deleteStudentTransportAssignment = useCallback(async (assignmentId: string) => {
    await delay(MOCK_API_DELAY);
    setStudentTransportAssignments(prev => prev.filter(a => a.id !== assignmentId));
  }, []);

  const generateStudentInvoices = useCallback(async (feeTemplateId: number, schoolPeriodId: number, studentCriteria: { categoryId?: number; classStreamId?: number }) => {
    await delay(MOCK_API_DELAY * 2);
    const template = feeTemplates.find(ft => ft.id === feeTemplateId);
    const period = schoolPeriods.find(sp => sp.id === schoolPeriodId);
    if (!template || !period) {
        console.error("Template or Period not found for invoice generation");
        return [];
    }

    let targetStudents = students.filter(s => s.status === StudentStatus.ACTIVE);
    if (studentCriteria.categoryId) {
        targetStudents = targetStudents.filter(s => s.student_category_id === studentCriteria.categoryId);
    }
    if (studentCriteria.classStreamId) {
        targetStudents = targetStudents.filter(s => s.current_class_stream_id === studentCriteria.classStreamId);
    }

    const generatedInvoices: StudentInvoice[] = [];
    targetStudents.forEach(student => {
        const existingInvoiceForPeriod = studentInvoices.find(inv => inv.student_id === student.id && inv.school_period_id === period.id);
        if (existingInvoiceForPeriod) {
            console.warn(`Student ${student.admission_no} already has an invoice for period ${period.name}. Skipping.`);
            return;
        }

        if (!template.items || template.items.length === 0) {
            console.warn(`Fee template ${template.name} has no items. Skipping invoice for ${student.admission_no}.`);
            return;
        }

        const invoiceId = `SINV-${Date.now()}-${student.id.slice(-4)}`;
        const invoiceItems: StudentInvoiceItem[] = template.items.map((item, idx) => ({
            id: `SITM-${invoiceId}-${idx}`,
            invoice_id: invoiceId,
            description: item.description,
            amount: item.amount,
        }));
        const totalBilled = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

        const newInvoice: StudentInvoice = {
            id: invoiceId,
            student_id: student.id,
            invoice_number: `INV-${period.academic_year_name?.replace(/\//g, '')}-${period.period_definition_name?.replace(' ', '')}-${student.admission_no.slice(-3)}`,
            school_period_id: period.id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(new Date(period.end_date).setDate(new Date(period.end_date).getDate() - 7)).toISOString().split('T')[0],
            total_amount_billed: totalBilled,
            amount_paid: 0,
            status: InvoiceStatus.DUE,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            student_name: `${student.first_name} ${student.last_name}`,
            school_period_name: period.name,
            items: invoiceItems,
        };
        generatedInvoices.push(newInvoice);
    });

    setStudentInvoices(prev => [...prev, ...generatedInvoices]);
    setStudentInvoiceItems(prev => [...prev, ...generatedInvoices.flatMap(inv => inv.items || [])]);

    console.log(`Generated ${generatedInvoices.length} invoices.`);
    return generatedInvoices;
  }, [students, feeTemplates, schoolPeriods, studentInvoices]);

  const addStudentPayment = useCallback(async (data: Omit<StudentPayment, 'id'|'created_at'|'updated_at'|'student_name'>) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === data.student_id);
    const newPayment: StudentPayment = {
        ...data,
        id: `SPAY${Date.now()}`,
        student_name: student ? `${student.first_name} ${student.last_name}` : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    setStudentPayments(prev => [...prev, newPayment]);
    return newPayment;
  }, [students]);

  const updateStudentPayment = useCallback(async (updatedPayment: StudentPayment) => {
    await delay(MOCK_API_DELAY);
    const student = students.find(s => s.id === updatedPayment.student_id);
    const paymentToUpdate: StudentPayment = {
        ...updatedPayment,
        student_name: student ? `${student.first_name} ${student.last_name}` : updatedPayment.student_name,
        updated_at: new Date().toISOString(),
    };
    setStudentPayments(prev => prev.map(p => p.id === paymentToUpdate.id ? paymentToUpdate : p));
    return paymentToUpdate;
  }, [students]);

  const deleteStudentPayment = useCallback(async (paymentId: string) => {
    await delay(MOCK_API_DELAY);
    setStudentPayments(prev => prev.filter(p => p.id !== paymentId));
    setInvoicePaymentApplications(prev => prev.filter(app => app.payment_id !== paymentId));
  }, []);

  const applyPaymentToInvoices = useCallback(async (paymentId: string, applications: Array<Omit<InvoicePaymentApplication, 'id'>>) => {
    await delay(MOCK_API_DELAY);
    const payment = studentPayments.find(p => p.id === paymentId);
    if (!payment) throw new Error("Payment not found");

    const newApplications: InvoicePaymentApplication[] = [];
    let totalAppliedThisTime = 0;

    const parentInvoicesToUpdate: StudentInvoice[] = []; // Track modified parent invoices

    applications.forEach(app => {
        const invoiceItem = studentInvoiceItems.find(item => item.id === app.invoice_item_id);
        if (!invoiceItem) { console.warn(`Invoice item ${app.invoice_item_id} not found for application.`); return; }

        const parentInvoice = studentInvoices.find(inv => inv.id === invoiceItem.invoice_id);
        if (!parentInvoice) { console.warn(`Parent invoice for item ${invoiceItem.id} not found.`); return; }

        let parentInvoiceRef = parentInvoicesToUpdate.find(pi => pi.id === parentInvoice.id);
        if (!parentInvoiceRef) {
            parentInvoiceRef = { ...parentInvoice }; // Clone to modify
            parentInvoicesToUpdate.push(parentInvoiceRef);
        }


        const existingAppliedToItem = invoicePaymentApplications
            .filter(ipa => ipa.invoice_item_id === app.invoice_item_id)
            .reduce((sum, ipa) => sum + ipa.amount_applied, 0);

        const itemBalance = invoiceItem.amount - existingAppliedToItem;
        const amountToApply = Math.min(app.amount_applied, itemBalance);

        if (amountToApply > 0) {
            newApplications.push({
                id: `IPA-${Date.now()}-${app.invoice_item_id.slice(-3)}`,
                payment_id: paymentId,
                invoice_item_id: app.invoice_item_id,
                amount_applied: amountToApply,
            });
            totalAppliedThisTime += amountToApply;
            parentInvoiceRef.amount_paid += amountToApply;
            if (parentInvoiceRef.amount_paid >= parentInvoiceRef.total_amount_billed) {
                parentInvoiceRef.status = InvoiceStatus.PAID;
            } else if (parentInvoiceRef.amount_paid > 0) {
                parentInvoiceRef.status = InvoiceStatus.PARTIALLY_PAID;
            }
        }
    });

    setInvoicePaymentApplications(prev => [...prev, ...newApplications]);
    setStudentInvoices(prevInvoices => prevInvoices.map(inv => {
        const updatedVersion = parentInvoicesToUpdate.find(ui => ui.id === inv.id);
        return updatedVersion || inv;
    }));

    return newApplications;
  }, [studentPayments, studentInvoices, studentInvoiceItems, invoicePaymentApplications]);


  const addGeneralPayment = useCallback(async (data: Omit<GeneralPayment, 'id'|'created_at'|'updated_at'|'total_amount_paid'|'payer_name_resolved'|'items'> & {items: Omit<GeneralPaymentItem, 'id'|'general_payment_id'|'revenue_account_name'>[] }) => {
    await delay(MOCK_API_DELAY);
    let resolvedPayerName = data.payer_name_external;
    if (data.payer_type !== GeneralPayerType.OTHER && data.payer_id) {
        switch(data.payer_type) {
            case GeneralPayerType.STUDENT: resolvedPayerName = students.find(s=>s.id === data.payer_id)?.display_name; break;
            case GeneralPayerType.STAFF: resolvedPayerName = staffList.find(s=>s.id === data.payer_id)?.display_name; break;
            case GeneralPayerType.CUSTOMER: resolvedPayerName = customers.find(c=>c.id === Number(data.payer_id))?.name; break;
            case GeneralPayerType.PARTNER: rawInitialData.initialMockPartners.find(p=>p.id === data.payer_id)?.name; break;
        }
    }
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
    const newPaymentId = `GPAY${Date.now()}`;
    const newPayment: GeneralPayment = {
        ...data,
        id: newPaymentId,
        payer_id: data.payer_id,
        payer_name_resolved: resolvedPayerName || 'N/A',
        total_amount_paid: totalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: data.items.map((item, idx) => ({
            ...item,
            id: `GPITM-${newPaymentId}-${idx}`,
            general_payment_id: newPaymentId,
            revenue_account_name: chartOfAccounts.find(coa => coa.id === item.revenue_account_id)?.name,
        })),
    };
    setGeneralPayments(prev => [...prev, newPayment]);
    return newPayment;
  }, [students, staffList, customers, rawInitialData.initialMockPartners, chartOfAccounts]);

  const addAcademicYearStructure = useCallback(async (data: Omit<AcademicYearStructure, 'id'>) => {
    await delay(MOCK_API_DELAY);
    const newStructure: AcademicYearStructure = { ...data, id: Date.now() };
    setAcademicYearStructuresState(prev => [...prev, newStructure]);
    return newStructure;
  }, []);

  const updateAcademicYearStructure = useCallback(async (updatedStructure: AcademicYearStructure) => {
    await delay(MOCK_API_DELAY);
    setAcademicYearStructuresState(prev => prev.map(s => s.id === updatedStructure.id ? updatedStructure : s));
    // Also update structure_name in academicPeriodDefinitions and academicYears
    setAcademicPeriodDefinitionsState(prevDefs => prevDefs.map(def => def.structure_id === updatedStructure.id ? {...def, structure_name: updatedStructure.name} : def));
    setAcademicYears(prevYears => prevYears.map(year => year.structure_id === updatedStructure.id ? {...year, structure_name: updatedStructure.name} : year));
    return updatedStructure;
  }, []);

  const deleteAcademicYearStructure = useCallback(async (structureId: number) => {
    await delay(MOCK_API_DELAY);
    setAcademicYearStructuresState(prev => prev.filter(s => s.id !== structureId));
    // Cascade delete: remove related period definitions
    setAcademicPeriodDefinitionsState(prev => prev.filter(pd => pd.structure_id !== structureId));
    // Optionally, handle academic years linked to this structure (e.g., disassociate or warn)
  }, []);

  const addAcademicPeriodDefinition = useCallback(async (data: Omit<AcademicPeriodDefinition, 'id' | 'structure_name'>) => {
    await delay(MOCK_API_DELAY);
    const structure = academicYearStructuresState.find(s => s.id === data.structure_id);
    const newDef: AcademicPeriodDefinition = {
        ...data,
        id: Date.now(),
        structure_name: structure?.name
    };
    setAcademicPeriodDefinitionsState(prev => [...prev, newDef].sort((a, b) => a.structure_id - b.structure_id || a.sequence_order - b.sequence_order));
    return newDef;
  }, [academicYearStructuresState]);

  const updateAcademicPeriodDefinition = useCallback(async (updatedDef: AcademicPeriodDefinition) => {
    await delay(MOCK_API_DELAY);
    const structure = academicYearStructuresState.find(s => s.id === updatedDef.structure_id);
    const defToUpdate = {...updatedDef, structure_name: structure?.name };
    setAcademicPeriodDefinitionsState(prev => prev.map(d => d.id === defToUpdate.id ? defToUpdate : d).sort((a, b) => a.structure_id - b.structure_id || a.sequence_order - b.sequence_order));
    return defToUpdate;
  }, [academicYearStructuresState]);

  const deleteAcademicPeriodDefinition = useCallback(async (definitionId: number) => {
    await delay(MOCK_API_DELAY);
    setAcademicPeriodDefinitionsState(prev => prev.filter(d => d.id !== definitionId));
    // Optionally, handle school periods linked to this definition
  }, []);

  const addAcademicYear = useCallback(async (data: Omit<AcademicYear, 'id' | 'created_at' | 'updated_at' | 'structure_name'>) => {
    await delay(MOCK_API_DELAY);
    const structure = academicYearStructuresState.find(ays => ays.id === data.structure_id);
    const newYear: AcademicYear = {
      ...data,
      id: Date.now(),
      structure_name: structure?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setAcademicYears(prev => [...prev, newYear]);
    return newYear;
  }, [academicYearStructuresState]);

  const updateAcademicYear = useCallback(async (updatedYear: AcademicYear) => {
    await delay(MOCK_API_DELAY);
    const structure = academicYearStructuresState.find(ays => ays.id === updatedYear.structure_id);
    const yearToUpdate = { ...updatedYear, structure_name: structure?.name, updated_at: new Date().toISOString() };
    setAcademicYears(prev => prev.map(y => y.id === yearToUpdate.id ? yearToUpdate : y));
    // Update denormalized names in SchoolPeriods
    setSchoolPeriods(prevPeriods => prevPeriods.map(p => p.academic_year_id === yearToUpdate.id ? {...p, academic_year_name: yearToUpdate.name} : p));
    return yearToUpdate;
  }, [academicYearStructuresState]);

  const deleteAcademicYear = useCallback(async (yearId: number) => {
    await delay(MOCK_API_DELAY);
    setAcademicYears(prev => prev.filter(y => y.id !== yearId));
    // Cascade delete: remove related school periods
    setSchoolPeriods(prev => prev.filter(sp => sp.academic_year_id !== yearId));
  }, []);

  const addSchoolPeriod = useCallback(async (data: Omit<SchoolPeriod, 'id' | 'created_at' | 'updated_at' | 'name' | 'academic_year_name' | 'period_definition_name' | 'financial_year_name'>) => {
    await delay(MOCK_API_DELAY);
    const ay = academicYears.find(a => a.id === data.academic_year_id);
    const pd = academicPeriodDefinitionsState.find(p => p.id === data.period_definition_id);
    const fy = financialYears.find(f => f.id === data.financial_year_id);
    const newPeriod: SchoolPeriod = {
      ...data,
      id: Date.now(),
      name: `${pd?.name || 'Period'} - ${ay?.name || 'AY'}`,
      academic_year_name: ay?.name,
      period_definition_name: pd?.name,
      financial_year_name: fy?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSchoolPeriods(prev => [...prev, newPeriod]);
    return newPeriod;
  }, [academicYears, academicPeriodDefinitionsState, financialYears]);

  const updateSchoolPeriod = useCallback(async (updatedPeriod: SchoolPeriod) => {
    await delay(MOCK_API_DELAY);
    const ay = academicYears.find(a => a.id === updatedPeriod.academic_year_id);
    const pd = academicPeriodDefinitionsState.find(p => p.id === updatedPeriod.period_definition_id);
    const fy = financialYears.find(f => f.id === updatedPeriod.financial_year_id);
    const periodToUpdate = {
        ...updatedPeriod,
        name: `${pd?.name || 'Period'} - ${ay?.name || 'AY'}`,
        academic_year_name: ay?.name,
        period_definition_name: pd?.name,
        financial_year_name: fy?.name,
        updated_at: new Date().toISOString()
    };
    setSchoolPeriods(prev => prev.map(p => p.id === periodToUpdate.id ? periodToUpdate : p));
    return periodToUpdate;
  }, [academicYears, academicPeriodDefinitionsState, financialYears]);

  const deleteSchoolPeriod = useCallback(async (periodId: number) => {
    await delay(MOCK_API_DELAY);
    setSchoolPeriods(prev => prev.filter(p => p.id !== periodId));
  }, []);

   // CRUD for Subjects
  const addSubject = useCallback(async (subjectData: Omit<Subject, 'id' | 'department_name'>) => {
    await delay(MOCK_API_DELAY);
    const department = departments.find(d => d.id === subjectData.department_id);
    const newSubject: Subject = {
      ...subjectData,
      id: Date.now(),
      department_name: department?.name,
    };
    setSubjectsState(prev => [...prev, newSubject]);
    return newSubject;
  }, [departments]);

  const updateSubject = useCallback(async (updatedSubjectData: Subject) => {
    await delay(MOCK_API_DELAY);
    const department = departments.find(d => d.id === updatedSubjectData.department_id);
    const subjectToUpdate = {
      ...updatedSubjectData,
      department_name: department?.name || updatedSubjectData.department_name,
    };
    setSubjectsState(prev => prev.map(s => s.id === subjectToUpdate.id ? subjectToUpdate : s));
    return subjectToUpdate;
  }, [departments]);

  const deleteSubject = useCallback(async (subjectId: number) => {
    await delay(MOCK_API_DELAY);
    setSubjectsState(prev => prev.filter(s => s.id !== subjectId));
  }, []);

  // CRUD for Requisitions
  const updateRequisitionStatus = useCallback(async (requisitionId: string, newStatus: RequisitionStatus) => {
    await delay(MOCK_API_DELAY);
    setRequisitionsState(prevRequisitions =>
      prevRequisitions.map(req =>
        req.id === requisitionId ? { ...req, status: newStatus, updated_at: new Date().toISOString() } : req
      )
    );
  }, []);

  const returnValues = useMemo(() => ({
    // States
    schoolDetails, roles, users, students, staff: staffList, classes, subjects: subjectsState, departments, designations, studentCategories,
    dormitories, academicYears, schoolPeriods, academicYearStructures: academicYearStructuresState, academicPeriodDefinitions: academicPeriodDefinitionsState,
    financialYears, classStreams, chartOfAccounts, expenseCategories, banks, suppliers: suppliersState, feeTemplates,
    expenseClaims, customers, customerInvoices, supplierInvoices, studentOpeningBalances, feeAdjustments,
    transportRoutes, studentTransportAssignments, studentInvoices, studentInvoiceItems, studentPayments, invoicePaymentApplications,
    generalPayments, generalLedgerEntries, feeTemplateItems, auditLogs: auditLogsState, 
    requisitions: requisitionsState,
    rfqs: rfqsState, 

    partners: rawInitialData.initialMockPartners,
    clubs: rawInitialData.initialMockClubs,
    studentHealthRecords: rawInitialData.initialMockStudentHealthRecords,
    studentAttendance: rawInitialData.initialMockStudentAttendance,
    timetablePeriodDefs: rawInitialData.initialMockTimetablePeriodDefs,
    templatesComm: rawInitialData.initialMockTemplatesComm,
    campaigns: rawInitialData.initialMockCampaigns,
    subjectPapers: rawInitialData.initialMockSubjectPapers,
    examSessions: rawInitialData.initialMockExamSessions,
    examPaperSettings: rawInitialData.initialMockExamPaperSettings,
    gradingSchemes: rawInitialData.initialMockGradingSchemes,
    studentExamResults: rawInitialData.initialMockStudentExamResults,
    classSubjectAllocations: rawInitialData.initialMockClassSubjectAllocations,
    teacherSubjectAssignments: rawInitialData.initialMockTeacherSubjectAssignments,
    studentSubjectEnrollments: rawInitialData.initialMockStudentSubjectEnrollments,
    timetableEntries: rawInitialData.initialMockTimetableEntries,
    warehouses: rawInitialData.initialMockWarehouses,
    itemCategoriesInv: rawInitialData.initialMockItemCategoriesInv,
    itemsInv: rawInitialData.initialMockItemsInv,
    fixedAssets: rawInitialData.initialMockFixedAssets,
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
    workflows: rawInitialData.initialMockWorkflows,
    mealPlans,
    menus,
    merchants,
    studentMealPlans,
    mealConsumptionLogs,
    walletTransactions,
    studentWallets,

    loading,
    updateSchoolDetails,
    addUser, updateUser, deleteUser,
    addRole, updateRole, deleteRole,
    addWorkflow, updateWorkflow, deleteWorkflow,
    addWorkflowState, updateWorkflowState, deleteWorkflowState,
    addClass, updateClass, deleteClass,
    addClassStream, updateClassStream, deleteClassStream,
    addStudent, updateStudent, deleteStudent,
    addStaffMember, updateStaffMember, deleteStaffMember,
    getStudentDetailsById,
    getStudentFinancialDetailsById,
    addChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
    addBank, updateBank, deleteBank,
    addSupplier, updateSupplier, deleteSupplier,
    addFeeTemplate, updateFeeTemplate, deleteFeeTemplate,
    addExpenseClaim, updateExpenseClaim, deleteExpenseClaim,
    addCustomer, updateCustomer, deleteCustomer,
    addCustomerInvoice, updateCustomerInvoice, deleteCustomerInvoice,
    addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice,
    addStudentOpeningBalance, updateStudentOpeningBalance, deleteStudentOpeningBalance,
    addFeeAdjustment, updateFeeAdjustment, deleteFeeAdjustment,
    addTransportRoute, updateTransportRoute, deleteTransportRoute,
    addStudentTransportAssignment, updateStudentTransportAssignment, deleteStudentTransportAssignment,
    generateStudentInvoices, addStudentPayment, updateStudentPayment, deleteStudentPayment, applyPaymentToInvoices,
    addGeneralPayment, updateGeneralPayment: unimplementedAsync, deleteGeneralPayment: unimplementedAsync,
    addMealPlan: unimplementedAsync, updateMealPlan: unimplementedAsync, deleteMealPlan: unimplementedAsync,
    addStudentMealPlan: unimplementedAsync, updateStudentMealPlan: unimplementedAsync, deleteStudentMealPlan: unimplementedAsync,
    addMenu: unimplementedAsync, updateMenu: unimplementedAsync, deleteMenu: unimplementedAsync,
    addMealConsumptionLog: unimplementedAsync,
    addMerchant: unimplementedAsync, updateMerchant: unimplementedAsync, deleteMerchant: unimplementedAsync,
    addWalletTransaction: unimplementedAsync,

    addAcademicYearStructure, updateAcademicYearStructure, deleteAcademicYearStructure,
    addAcademicPeriodDefinition, updateAcademicPeriodDefinition, deleteAcademicPeriodDefinition,
    addAcademicYear, updateAcademicYear, deleteAcademicYear,
    addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod,
    addDepartment: unimplementedAsync, updateDepartment: unimplementedAsync, deleteDepartment: unimplementedAsync,
    addDesignation: unimplementedAsync, updateDesignation: unimplementedAsync, deleteDesignation: unimplementedAsync,
    addStudentCategory: unimplementedAsync, updateStudentCategory: unimplementedAsync, deleteStudentCategory: unimplementedAsync,
    addDormitory: unimplementedAsync, updateDormitory: unimplementedAsync, deleteDormitory: unimplementedAsync,
    addPartner: unimplementedAsync, updatePartner: unimplementedAsync, deletePartner: unimplementedAsync,
    addClub: unimplementedAsync, updateClub: unimplementedAsync, deleteClub: unimplementedAsync,
    addStudentHealthRecord: unimplementedAsync, updateStudentHealthRecord: unimplementedAsync,
    saveStudentAttendance: unimplementedAsync, getStudentAttendanceByFilters: unimplementedSync,
    getTimetablePeriodDefs: () => rawInitialData.initialMockTimetablePeriodDefs,
    addTimetablePeriodDef: unimplementedAsync, updateTimetablePeriodDef: unimplementedAsync, deleteTimetablePeriodDef: unimplementedAsync,
    addTemplateComm: unimplementedAsync, updateTemplateComm: unimplementedAsync, deleteTemplateComm: unimplementedAsync,
    addCampaign: unimplementedAsync, updateCampaign: unimplementedAsync, deleteCampaign: unimplementedAsync,
    addSubjectPaper: unimplementedAsync, updateSubjectPaper: unimplementedAsync, deleteSubjectPaper: unimplementedAsync,
    addExamSession: unimplementedAsync, updateExamSession: unimplementedAsync, deleteExamSession: unimplementedAsync,
    addExamPaperSetting: unimplementedAsync, updateExamPaperSetting: unimplementedAsync, deleteExamPaperSetting: unimplementedAsync,
    addGradingScheme: unimplementedAsync, updateGradingScheme: unimplementedAsync, deleteGradingScheme: unimplementedAsync,
    getStudentsForExamEntry: unimplementedSync, getExamPaperSettingsForSession: unimplementedSync, saveStudentExamResult: unimplementedAsync,
    getTimetableEntries: unimplementedSync, addTimetableEntry: unimplementedAsync, updateTimetableEntry: unimplementedAsync, deleteTimetableEntry: unimplementedAsync,
    addClassSubjectAllocation: unimplementedAsync, updateClassSubjectAllocation: unimplementedAsync, deleteClassSubjectAllocation: unimplementedAsync,
    addTeacherSubjectAssignment: unimplementedAsync, deleteTeacherSubjectAssignment: unimplementedAsync,
    addStudentSubjectEnrollment: unimplementedAsync, updateStudentSubjectEnrollment: unimplementedAsync, deleteStudentSubjectEnrollment: unimplementedAsync,
    addWarehouse: unimplementedAsync, updateWarehouse: unimplementedAsync, deleteWarehouse: unimplementedAsync,
    addItemCategoryInv: unimplementedAsync, updateItemCategoryInv: unimplementedAsync, deleteItemCategoryInv: unimplementedAsync,
    addItemInv: unimplementedAsync, updateItemInv: unimplementedAsync, deleteItemInv: unimplementedAsync,
    addFixedAsset: unimplementedAsync, updateFixedAsset: unimplementedAsync, deleteFixedAsset: unimplementedAsync,
    addRequisition: unimplementedAsync, updateRequisition: unimplementedAsync, deleteRequisition: unimplementedAsync,
    updateRequisitionStatus,
    addPurchaseOrder: unimplementedAsync, updatePurchaseOrder: unimplementedAsync, deletePurchaseOrder: unimplementedAsync,
    addStockTransaction: unimplementedAsync,
    addPayrollPeriod: unimplementedAsync, updatePayrollPeriod: unimplementedAsync, deletePayrollPeriod: unimplementedAsync,
    addPayrollItemType: unimplementedAsync, updatePayrollItemType: unimplementedAsync, deletePayrollItemType: unimplementedAsync,
    updateStaffSalarySetting: unimplementedAsync, generatePayslipsForPeriod: unimplementedAsync,
    addBookCategory: unimplementedAsync, updateBookCategory: unimplementedAsync, deleteBookCategory: unimplementedAsync,
    addBook: unimplementedAsync, updateBook: unimplementedAsync, deleteBook: unimplementedAsync,
    addLoan: unimplementedAsync, updateLoan: unimplementedAsync,
    addFine: unimplementedAsync, updateFineStatus: unimplementedAsync,
    addExpenseCategory: unimplementedAsync, updateExpenseCategory: unimplementedAsync, deleteExpenseCategory: unimplementedAsync,
    addSubject, updateSubject, deleteSubject,

    rawInitialData // Return the direct export
  }), [
    schoolDetails, roles, users, students, staffList, classes, subjectsState, departments, designations, studentCategories,
    dormitories, academicYears, schoolPeriods, academicYearStructuresState, academicPeriodDefinitionsState,
    financialYears, classStreams, chartOfAccounts, expenseCategories, banks, suppliersState, feeTemplates,
    expenseClaims, customers, customerInvoices, supplierInvoices, studentOpeningBalances, feeAdjustments,
    transportRoutes, studentTransportAssignments, studentInvoices, studentInvoiceItems, studentPayments, invoicePaymentApplications,
    generalPayments, generalLedgerEntries, feeTemplateItems, auditLogsState, requisitionsState, rfqsState, 
    rawInitialData, loading, // Include all stateful values and stable references
    // Also include all useCallback-memoized functions
    updateSchoolDetails, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, addWorkflow, updateWorkflow, deleteWorkflow,
    addWorkflowState, updateWorkflowState, deleteWorkflowState, addClass, updateClass, deleteClass, addClassStream, updateClassStream,
    deleteClassStream, addStudent, updateStudent, deleteStudent, addStaffMember, updateStaffMember, deleteStaffMember,
    getStudentDetailsById, getStudentFinancialDetailsById, addChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
    addBank, updateBank, deleteBank, addSupplier, updateSupplier, deleteSupplier, addFeeTemplate, updateFeeTemplate, deleteFeeTemplate,
    addExpenseClaim, updateExpenseClaim, deleteExpenseClaim, addCustomer, updateCustomer, deleteCustomer, addCustomerInvoice,
    updateCustomerInvoice, deleteCustomerInvoice, addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice,
    addStudentOpeningBalance, updateStudentOpeningBalance, deleteStudentOpeningBalance, addFeeAdjustment, updateFeeAdjustment, deleteFeeAdjustment,
    addTransportRoute, updateTransportRoute, deleteTransportRoute, addStudentTransportAssignment, updateStudentTransportAssignment,
    deleteStudentTransportAssignment, generateStudentInvoices, addStudentPayment, updateStudentPayment, deleteStudentPayment, applyPaymentToInvoices,
    addGeneralPayment, /* other unimplemented CRUDs */
    addAcademicYearStructure, updateAcademicYearStructure, deleteAcademicYearStructure,
    addAcademicPeriodDefinition, updateAcademicPeriodDefinition, deleteAcademicPeriodDefinition,
    addAcademicYear, updateAcademicYear, deleteAcademicYear,
    addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod,
    addSubject, updateSubject, deleteSubject,
    updateRequisitionStatus,
    mealPlans, menus, merchants, studentMealPlans, mealConsumptionLogs, walletTransactions, studentWallets // Nutrition states
  ]);

  return returnValues;
};

// Removed the redundant export of AppDataLoadingStates
// export type { AppDataLoadingStates };
