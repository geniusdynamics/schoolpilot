// src/core/types.ts

// ABOUTME: This file defines global and cross-module types for the SchoolPilot system.
// ABOUTME: Only types used by more than one module should live here.
import type {
  FinStudentInvoiceType,
  FinStudentInvoiceItemType,
  FinStudentPaymentType,
  FinFeeAdjustmentType,
  FinInvoicePaymentApplicationType,
  FinCustomerInvoiceType,
  FinSupplierInvoiceType,
  FinGeneralPaymentType,
  FinGeneralLedgerEntryType,
  FinStudentOpeningBalanceType,
  FinTransportRouteType,
  FinStudentTransportAssignmentType
} from '../modules/finance/data/types';
import type { EducationSystemConfiguration } from '../modules/academics/data/types';

// --- Chart Data Types ---
export interface ChartData {
  name: string;
  value: number;
}

export interface BarChartData {
  name: string;
  uv?: number;
  pv?: number;
  [key: string]: any;
}

// --- Enums ---

export enum FinancialYearStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
  ARCHIVED = 'Archived',
}

export enum PersonGender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export enum StudentStatus {
  ACTIVE = 'Active',
  ALUMNI = 'Alumni',
  TRANSFERRED = 'Transferred',
  SUSPENDED = 'Suspended',
  EXPELLED = 'Expelled',
  WITHDRAWN = 'Withdrawn'
}

// ClubType and AttendanceStatus moved to administration module to avoid conflicts

// Shared cross-system enums that are used by multiple modules
export enum DayOfWeek {
    MONDAY = 'MONDAY', 
    TUESDAY = 'TUESDAY', 
    WEDNESDAY = 'WEDNESDAY', 
    THURSDAY = 'THURSDAY', 
    FRIDAY = 'FRIDAY', 
    SATURDAY = 'SATURDAY', 
    SUNDAY = 'SUNDAY'
}

// === PROMOTED FROM ADMINISTRATION MODULE ===
export enum PartnerType {
    SPONSOR = 'Sponsor',
    BOARD_MEMBER = 'Board Member',
    SERVICE_PROVIDER = 'Service Provider',
    GOVERNMENT_AGENCY = 'Government Agency',
    NGO = 'NGO',
    OTHER = 'Other'
}

export enum ClubType {
    CLUB = 'Club',
    SOCIETY = 'Society',
    SPORTS_TEAM = 'Sports Team'
}

export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    LATE = 'Late',
    EXCUSED = 'Excused'
}

export enum TemplateType {
    SMS = 'SMS',
    EMAIL = 'Email',
    PUSH_NOTIFICATION = 'Push Notification'
}

export enum CampaignAudienceType {
    ALL_STUDENTS = 'All Students',
    ALL_PARENTS = 'All Parents',
    ALL_STAFF = 'All Staff',
    STUDENTS_OF_CLASS = 'Students of Class',
    PARENTS_OF_CLASS = 'Parents of Class'
}

export enum CampaignStatus {
    DRAFT = 'Draft',
    SCHEDULED = 'Scheduled',
    APPROVED = 'Approved',
    SENT = 'Sent',
    CANCELLED = 'Cancelled'
}

// === PROMOTED FROM HR MODULE ===
export enum HRPayrollPeriodStatusEnum {
    OPEN = 'Open',
    CLOSED = 'Closed',
    PROCESSED = 'Processed'
}

export interface HRPayrollPeriodType {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  financial_year_id: number;
  school_period_id?: number;
  status: HRPayrollPeriodStatusEnum;
  financial_year_name?: string;
  school_period_name?: string;
}

// === MERGED/EXPANDED FROM ACADEMICS MODULE ===
// SubjectGrouping enum moved to academics module to resolve conflicts
// This enum is now exported from src/modules/academics/data/types.ts

// Exam Scheduling Types
// ExamSchedule interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// StudentEnrollmentStatus enum moved to academics module to resolve conflicts
// This enum is now exported from src/modules/academics/data/types.ts

// ExamSessionStatus enum moved to academics module to resolve conflicts
// This enum is now exported from src/modules/academics/data/types.ts

export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense',
}

export enum AccountTemplateType {
    CORE = 'Core',
    GOVERNMENT = 'Government',
    PRIVATE = 'Private',
    CUSTOM = 'Custom',
}

export enum OpeningBalanceType {
    DEBIT = 'Debit',
    CREDIT = 'Credit',
}

export enum InvoiceStatus {
  DUE = 'Due',
  PARTIALLY_PAID = 'Partially Paid',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  VOIDED = 'Voided',
}

export enum FeeAdjustmentType {
    PENALTY = 'Penalty',
    EXEMPTION = 'Exemption',
    SCHOLARSHIP = 'Scholarship',
}

export enum ExpenseClaimantType {
    STAFF = 'Staff',
    STUDENT = 'Student',
}

export enum TransportAssignmentStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
}

export enum CustomerInvoiceStatus {
    DUE = 'Due',
    PAID = 'Paid',
    VOIDED = 'Voided',
}

export enum SupplierInvoiceStatus {
    UNPAID = 'Unpaid',
    PARTIALLY_PAID = 'Partially Paid',
    PAID = 'Paid',
}

export enum PayrollPeriodStatus {
    OPEN = 'Open',
    CLOSED = 'Closed',
}

export enum PayrollItemCategory {
    EARNING = 'Earning',
    DEDUCTION = 'Deduction',
}

export enum PayrollTaxImplication {
    PRE_TAX = 'Pre-Tax',
    POST_TAX = 'Post-Tax',
    TAXABLE = 'Taxable',
    NON_TAXABLE = 'Non-Taxable',
}

export enum PayslipStatus {
    DRAFT = 'Draft',
    PROCESSED = 'Processed',
    PAID = 'Paid',
}

export enum BookStatus {
  AVAILABLE = 'Available',
  ON_LOAN = 'On Loan',
  LOST = 'Lost',
  DAMAGED = 'Damaged',
}

export enum FineStatus {
    PENDING = 'Pending',
    BILLED = 'Billed',
}

export enum ItemTypeInv {
    CONSUMABLE = 'Consumable',
    FIXED_ASSET = 'Fixed Asset',
}

export enum DepreciationMethod {
    STRAIGHT_LINE = 'Straight Line',
    REDUCING_BALANCE = 'Reducing Balance',
}

export enum StockTransactionType {
    RECEIVE = 'Receive',
    ISSUE = 'Issue',
    ADJUSTMENT = 'Adjustment',
}

export enum StudentMealPlanStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
}

export enum MealType {
    BREAKFAST = 'Breakfast',
    BREAK_SNACK = 'Break Snack',
    LUNCH = 'Lunch',
    DINNER = 'Dinner',
}

export enum WalletTransactionType {
    DEPOSIT = 'Deposit',
    WITHDRAWAL = 'Withdrawal',
    TRANSFER_OUT = 'TransferOut',
    TRANSFER_IN = 'TransferIn',
    PURCHASE = 'Purchase',
}

// TemplateType, CampaignStatus, and CampaignAudienceType moved to administration module to avoid conflicts

export enum AuditAction {
    INSERT = 'INSERT',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    SOFT_DELETE = 'SOFT_DELETE',
}

export enum RFQStatus {
    DRAFT = 'Draft',
    OPEN = 'Open',
    CLOSED = 'Closed',
    AWARDED = 'Awarded',
    CANCELLED = 'Cancelled',
}

export enum RequisitionStatus {
    DRAFT = 'Draft',
    PENDING_APPROVAL = 'Pending Approval',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    FULFILLED = 'Fulfilled',
    PARTIALLY_FULFILLED = 'Partially Fulfilled',
}

export enum PurchaseOrderStatus {
    DRAFT = 'Draft',
    SENT = 'Sent',
    CONFIRMED = 'Confirmed',
    PARTIALLY_RECEIVED = 'Partially Received',
    FULLY_RECEIVED = 'Fully Received',
    INVOICED = 'Invoiced',
    CANCELLED = 'Cancelled',
}

export enum GeneralPayerType {
    STUDENT = 'Student',
    STAFF = 'Staff',
    PARENT = 'Parent',
    EXTERNAL = 'External',
}


// --- Core Interfaces ---

export interface SchoolDetails {
  id: number;
  name: string;
  telephone?: string | null;
  email?: string | null;
  postal_address?: string | null;
  town?: string | null;
  motto?: string | null;
  logo_path?: string | null;
  created_at: string;
  updated_at: string;
  school_gender?: string | null;
  school_type?: string | null;
  head_teacher_name?: string | null;
  school_code?: string | null;
  // Additional properties for settings pages
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  principal?: string | null;
}

export interface User {
  id: string;
  username: string;
  hashed_password?: string | null;
  password?: string | null; // For creation/update, not stored
  email: string;
  role_id?: number | null;
  // Denormalized
  role?: string | null;
  display_name?: string | null;
  userType: string; // Broad user category (e.g., Staff, Student, Parent, Supplier, etc.)
  isActive: boolean; // Whether the user is active
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicYearStructure {
    id: string;
    name: string;
}

export interface AcademicPeriodDefinition {
    id: string;
    structure_id: string;
    name: string;
    sequence_order: number;
    // Denormalized
    structure_name?: string | null;
}

export interface AcademicYear {
  id: number;
  name: string;
  structure_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  // Denormalized
  structure_name?: string | null;
}

export interface FinancialYear {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: FinancialYearStatus;
    created_at: string;
    updated_at: string;
}

export interface SchoolPeriod {
  id: number;
  academic_year_id: number;
  period_definition_id: string;
  financial_year_id: number;
  start_date: string;
  end_date: string;
  mid_break_start?: string | null;
  mid_break_end?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Denormalized
  name?: string | null;
  academic_year_name?: string | null;
  period_definition_name?: string | null;
  financial_year_name?: string | null;
}

export interface Student {
  id: string;
  admission_no: string;
  upi_no?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  gender: PersonGender;
  date_of_birth?: string | null;
  photo_path?: string | null;
  current_class_stream_id?: number | null;
  student_category_id?: number | null;
  dormitory_id?: number | null;
  admission_date?: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Denormalized fields
  current_class_name?: string | null;
  current_class_stream_name?: string | null;
  student_category_name?: string | null;
  dormitory_name?: string | null;
  primary_guardian?: ParentsGuardian | null;
  exam_result_summary?: ExamResultSummary | null;
  // Additional fields from detailed analysis
  address?: string | null;
  remarks?: string | null;
  religion?: string | null;
  county?: string | null;
  district?: string | null;
  student_type?: string | null;
  primary_school?: string | null;
  marks_attained_primary?: string | null;
  class_admitted?: string | null;
  stream_admitted?: string | null;
  email?: string | null;
  phone?: string | null;
  display_name?: string | null;
  user_id?: string | null;
}

export interface Staff {
  id: string;
  user_id?: string | null;
  staff_no: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  department_id?: string | null;
  designation_id?: number | null;
  hod_of_department_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Denormalized
  department_name?: string | null;
  designation_title?: string | null;
  hod_of_department_name?: string | null;
  user_username?: string | null;
  email?: string | null;
  display_name?: string | null;
}

export interface ParentsGuardian {
    id: string;
    user_id?: string | null;
    name: string;
    phone: string;
    email?: string | null;
    relationship_type?: string | null;
    location?: string | null;
    address?: string | null;
    photo_path?: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface StudentGuardianRelationship {
    student_id: string;
    guardian_id: string;
    relationship_type: string;
    is_primary_contact: boolean;
}

export interface Class {
  id: number;
  name: string;
  streams?: ClassStream[];
}

export interface ClassStream {
    id: number;
    class_id: number;
    name: string;
    class_teacher_id?: string | null;
    // Denormalized
    class_name?: string | null;
    class_teacher_name?: string | null;
}

// Subject interface moved to academics module to avoid conflicts

export interface Department {
    id: string;
    name: string;
    is_academic: boolean;
    created_at: string;
    updated_at: string;
}

export interface Designation {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface StudentCategory {
    id: number;
    name: string;
}

export interface Dormitory {
    id: number;
    name: string;
    master_id?: string | null;
    // Denormalized
    master_name?: string | null;
    created_at: string;
    updated_at: string;
}

export interface WorkflowState {
    id: number;
    workflow_id: number;
    name: string;
    sequence_order: number;
}

export interface Workflow {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    states?: WorkflowState[];
}

export interface AuditLog {
    id: string;
    user_id?: string | null;
    action: AuditAction;
    table_name?: string | null;
    record_pk?: string | null;
    old_data?: Record<string, any> | null;
    new_data?: Record<string, any> | null;
    changed_at: string;
    ip_address?: string | null;
    user_agent?: string | null;
    // Denormalized
    user_name?: string | null;
}

// --- Finance Interfaces ---

export interface ChartOfAccount {
    id: number;
    account_code: string;
    name: string;
    type: AccountType;
    template_type: AccountTemplateType;
    is_active: boolean;
    expense_category_id?: number | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    expense_category_name?: string | null;
}

export interface ExpenseCategory {
    id: number;
    name: string;
}

export interface Bank {
    id: number;
    name: string;
    account_no?: string | null;
    gl_account_id: number;
    created_at: string;
    updated_at: string;
    // Denormalized
    gl_account_name?: string | null;
}

export interface Supplier {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contract_expiry_date?: string | null;
    created_at: string;
    updated_at: string;
}

export interface FeeTemplateItem {
    id: string;
    fee_template_id: number;
    description: string;
    amount: number;
    revenue_account_id: number;
    linked_expense_category_id?: number | null;
    // Denormalized
    revenue_account_name?: string | null;
    linked_expense_category_name?: string | null;
    linked_meal_plan_id?: number | null;
    linked_transport_route_id?: number | null;
}

export interface FeeTemplate {
    id: number;
    name: string;
    school_period_id: number;
    student_category_id?: number | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    school_period_name?: string | null;
    student_category_name?: string | null;
    items?: FeeTemplateItem[];
}

export interface ExpenseClaim {
    id: string;
    claimant_type: ExpenseClaimantType;
    claimant_id: string;
    claim_date: string;
    description: string;
    amount: number;
    expense_category_id: number;
    workflow_state_id?: number | null;
    workflow_status_name?: string | null;
    approved_by?: string | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    claimant_name?: string | null;
    expense_category_name?: string | null;
}

export interface Customer {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CustomerInvoiceItem {
    id: string;
    invoice_id: string;
    description?: string | null;
    amount?: number | null;
    revenue_account_id?: number | null;
    // Denormalized
    revenue_account_name?: string | null;
}

export interface CustomerInvoice {
    id: string;
    customer_id: number;
    invoice_number: string;
    issue_date: string;
    due_date?: string | null;
    total_amount?: number | null;
    status?: CustomerInvoiceStatus | null;
    created_at: string;
    updated_at: string;
    items?: CustomerInvoiceItem[];
    // Denormalized
    customer_name?: string | null;
}

export interface SupplierInvoice {
    id: string;
    supplier_id: number;
    invoice_number: string;
    invoice_date: string;
    due_date?: string | null;
    total_amount: number;
    amount_paid?: number | null;
    status?: SupplierInvoiceStatus | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    supplier_name?: string | null;
}

export interface StudentOpeningBalance {
    id: string;
    student_id: string;
    balance_type: OpeningBalanceType;
    amount: number;
    as_of_date: string;
    is_billed: boolean;
    created_at: string;
    updated_at: string;
    // Denormalized
    student_name?: string | null;
}

export interface FeeAdjustment {
    id: string;
    student_id: string;
    school_period_id: number;
    adjustment_type: FeeAdjustmentType;
    amount: number;
    reason?: string | null;
    applied_invoice_id?: string | null;
    created_at?: string | null;
    // Denormalized
    student_name?: string | null;
    school_period_name?: string | null;
}

export interface TransportRoute {
    id: number;
    name: string;
    cost_per_period: number;
    gl_revenue_account_id: number;
    created_at: string;
    updated_at: string;
    // Denormalized
    gl_revenue_account_name?: string | null;
}

export interface StudentTransportAssignment {
    id: string;
    student_id: string;
    route_id: number;
    school_period_id: number;
    status?: TransportAssignmentStatus | null;
    invoice_id?: string | null;
    cost_override?: number | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    student_name?: string | null;
    route_name?: string | null;
    school_period_name?: string | null;
}

export interface StudentInvoiceItem {
    id: string;
    invoice_id: string;
    description: string;
    amount: number;
}

export interface StudentInvoice {
    id: string;
    student_id: string;
    invoice_number: string;
    school_period_id: number;
    issue_date: string;
    due_date: string;
    total_amount_billed: number;
    amount_paid: number;
    status: InvoiceStatus;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    // Denormalized
    student_name?: string | null;
    school_period_name?: string | null;
    items?: StudentInvoiceItem[];
}

export interface StudentPayment {
    id: string;
    student_id: string;
    receipt_no: string;
    total_amount_paid: number;
    payment_method?: string | null;
    transaction_date: string;
    reference_no?: string | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    student_name?: string | null;
}

export interface InvoicePaymentApplication {
    id: string;
    payment_id: string;
    invoice_item_id: string;
    amount_applied: number;
}

export interface GeneralPaymentItem {
    id: string;
    general_payment_id: string;
    description: string;
    amount: number;
    revenue_account_id: number;
    // Denormalized
    revenue_account_name?: string | null;
}

export interface GeneralPayment {
    id: string;
    payer_type: GeneralPayerType;
    payer_id?: string | null;
    payer_name_external?: string | null;
    payment_date: string;
    total_amount_paid: number;
    payment_method?: string | null;
    reference_no?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    items?: GeneralPaymentItem[];
    // Denormalized
    payer_name_resolved?: string | null;
}

export interface GeneralLedgerEntry {
    id: string;
    transaction_date: string;
    effective_date: string;
    financial_year_id: number;
    account_id: number;
    debit?: number | null;
    credit?: number | null;
    description: string;
    source_table?: string | null;
    source_id?: string | null;
    created_at: string;
    updated_at: string;
}

// --- Academics Interfaces ---

export interface RFQ {
    id: string;
    title: string;
    description?: string | null;
    issue_date: string;
    closing_date: string;
    status: RFQStatus;
    created_at: string;
    updated_at: string;
}

// Partner interface moved to administration module to avoid PartnerType conflicts

// ClubAndSociety interface moved to administration module to avoid conflicts

export interface StudentHealthRecord {
    id: string;
    student_id: string;
    blood_type?: string | null;
    allergies?: string | null;
    medical_conditions?: string | null;
    emergency_contact_override?: string | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    student_name?: string | null;
}

// StudentAttendance interface moved to administration module to avoid conflicts

export interface TimetablePeriodDef {
    id: number;
    period_name: string;
    start_time: string;
    end_time: string;
}

// TemplateComm and Campaign interfaces moved to administration module to avoid conflicts

// SubjectPaper interface moved to academics module to avoid conflicts

export interface ClassSubjectAllocation {
    id: string;
    class_stream_id: number;
    subject_id: number;
    academic_year_id: number;
    // Denormalized
    class_stream_name?: string | null;
    subject_name?: string | null;
    academic_year_name?: string | null;
    is_enrolled?: boolean | null;
}

// StudentSubjectEnrollment interface moved to academics module to avoid conflicts

// TeacherSubjectAssignment interface moved to academics module to avoid conflicts

// GradingSchemeLevel interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// GradingScheme interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

export interface ExamPaperSetting {
    id: string;
    exam_session_id: string;
    subject_paper_id: number;
    marks_out_of: number;
    weight_percentage: number;
    created_at: string;
    updated_at: string;
    // Denormalized
    subject_paper_name?: string | null;
    subject_name?: string | null;
}

// ExamSession interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// StudentPaperMark interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// StudentExamResult interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// TimetableEntry interface moved to academics module to avoid conflicts

// --- HR Interfaces ---

export interface PayrollPeriod {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    financial_year_id: number;
    school_period_id?: number | null;
    status?: PayrollPeriodStatus | null;
    // Denormalized
    financial_year_name?: string | null;
    school_period_name?: string | null;
}

export interface PayrollItemType {
    id: number;
    name: string;
    category: PayrollItemCategory;
    tax_implication: PayrollTaxImplication;
    created_at: string;
    updated_at: string;
}

export interface StaffRecurringItem {
    id: string;
    staff_salary_setting_id: string;
    item_type_id: number;
    amount: number;
    created_at?: string | null;
    // Denormalized
    item_type_name?: string | null;
    item_category?: PayrollItemCategory | null;
}

export interface StaffSalarySetting {
    id: string;
    staff_id: string;
    basic_salary: number;
    payment_bank?: string | null;
    bank_account_no?: string | null;
    max_advance_amount?: number | null;
    created_at: string;
    updated_at: string;
    recurring_items?: StaffRecurringItem[];
    // Denormalized
    staff_name?: string | null;
}

export interface PayslipItem {
    id: string;
    payslip_id: string;
    item_type_id: number;
    description?: string | null;
    amount?: number | null;
    // Denormalized
    item_type_name?: string | null;
    item_category?: PayrollItemCategory | null;
}

export interface Payslip {
    id: string;
    staff_id: string;
    payroll_period_id: number;
    gross_salary?: number | null;
    total_deductions?: number | null;
    net_salary?: number | null;
    status?: PayslipStatus | null;
    created_at: string;
    updated_at: string;
    items?: PayslipItem[];
    // Denormalized
    staff_name?: string | null;
    payroll_period_name?: string | null;
}

// --- Inventory Interfaces ---

export interface Warehouse {
    id: number;
    name: string;
}

export interface ItemCategoryInv {
    id: number;
    name: string;
}

export interface ItemInv {
    id: string;
    name: string;
    description?: string | null;
    category_id?: number | null;
    unit_of_measure?: string | null;
    item_type: ItemTypeInv;
    current_price?: number | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    category_name?: string | null;
}

export interface FixedAsset {
    id: string;
    item_id: string;
    asset_tag: string;
    serial_number?: string | null;
    purchase_date?: string | null;
    purchase_cost?: number | null;
    current_value?: number | null;
    depreciation_method?: DepreciationMethod | null;
    depreciation_rate_pa?: number | null;
    assigned_to_staff_id?: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    // Denormalized
    item_name?: string | null;
    assigned_to_staff_name?: string | null;
}

export interface AssetDepreciationLog {
    id: string;
    asset_id: string;
    depreciation_date: string;
    amount_depreciated: number;
    book_value_after: number;
}

export interface StockLevel {
    compositeId: string; // item_id|warehouse_id
    item_id: string;
    warehouse_id: number;
    quantity: number;
    // Denormalized
    item_name?: string | null;
    warehouse_name?: string | null;
    category_name?: string | null;
}

export interface StockTransaction {
    id: string;
    item_id: string;
    warehouse_id: number;
    transaction_type: StockTransactionType;
    quantity: number;
    source_table?: string | null;
    source_id?: string | null;
    transaction_date?: string | null;
    notes?: string | null;
    // Denormalized
    item_name?: string | null;
    warehouse_name?: string | null;
}

export interface RequisitionItem {
    id: string;
    requisition_id: string;
    item_id: string;
    quantity_requested: number;
    unit_price?: number | null;
    quantity_issued?: number | null;
    fulfillment_stock_transaction_id?: string | null;
    // Denormalized
    item_name?: string | null;
    line_total?: number | null;
}

export interface Requisition {
    id: string;
    requesting_staff_id: string;
    request_date: string;
    status: RequisitionStatus;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    items?: RequisitionItem[];
    // Denormalized
    requesting_staff_name?: string | null;
    department_name?: string | null;
    total_requested_value?: number | null;
}

export interface PurchaseOrderItem {
    id: string;
    purchase_order_id: string;
    item_id: string;
    quantity_ordered: number;
    unit_price: number;
    quantity_received?: number | null;
    // Denormalized
    item_name?: string | null;
    line_total?: number | null;
}

export interface PurchaseOrder {
    id: string;
    supplier_id: number;
    order_date: string;
    status: PurchaseOrderStatus;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    items?: PurchaseOrderItem[];
    // Denormalized
    supplier_name?: string | null;
    total_value?: number | null;
}

// --- Library Interfaces ---

export interface BookCategory {
    id: number;
    name: string;
}

export interface Book {
    id: string;
    category_id?: number | null;
    title: string;
    author?: string | null;
    publisher?: string | null;
    isbn?: string | null;
    accession_no: string;
    purchase_cost?: number | null;
    status: BookStatus;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    // Denormalized
    category_name?: string | null;
}

export interface Loan {
    id: string;
    book_id: string;
    user_id: string;
    loan_date: string;
    due_date: string;
    return_date?: string | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    book_title?: string | null;
    user_name?: string | null;
}

export interface Fine {
    id: string;
    loan_id: string;
    amount: number;
    status: FineStatus;
    reason?: string | null;
    fee_adjustment_id?: string | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    book_title?: string | null;
    user_name?: string | null;
    loan_due_date?: string | null;
}

// --- Nutrition & Wallet Interfaces ---

export interface MealPlan {
    id: number;
    name: string;
    description?: string | null;
    cost_per_period?: number | null;
    created_at: string;
    updated_at: string;
}

export interface StudentMealPlan {
    id: string;
    student_id: string;
    school_period_id: number;
    meal_plan_id: number;
    status: StudentMealPlanStatus;
    created_at: string;
    updated_at: string;
    // Denormalized
    student_name?: string | null;
    school_period_name?: string | null;
    meal_plan_name?: string | null;
}

export interface Menu {
    id: string;
    menu_date: string;
    meal_type: MealType;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface MealConsumptionLog {
    id: string;
    student_id: string;
    menu_id: string;
    consumption_time: string;
    charged_amount?: number | null;
    wallet_transaction_id?: string | null;
    // Denormalized
    student_name?: string | null;
    menu_description?: string | null;
    menu_meal_type?: MealType | null;
    menu_date?: string | null;
}

export interface WalletTransaction {
    id: string;
    student_id: string;
    transaction_date: string;
    transaction_type: WalletTransactionType;
    amount: number;
    description: string;
    reference_id?: string | null;
    reference_type?: string | null;
    running_balance: number;
    // Denormalized
    student_name?: string | null;
}

export interface StudentWallet {
    student_id: string;
    balance: number;
    last_updated: string;
    // Denormalized
    student_name?: string | null;
}

export interface Merchant {
    id: number;
    name: string;
    gl_account_id?: number | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    gl_account_name?: string | null;
}


// --- UI Specific / Composite Types ---

export interface ExamResultSummary {
  exam_name?: string | null;
  english?: string | null;
  kiswahili?: string | null;
  mathematics?: string | null;
  science?: string | null;
  social_studies_religious_education?: string | null;
  total_marks?: number | null;
}

// StudentDetailProfile interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// StudentFinancialSummary interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// StudentInvoiceChargeItem and StudentPaymentLogItem moved to academics module to resolve conflicts
// These types are now exported from src/modules/academics/data/types.ts

// StudentEnrolledSubject interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// StudentPaperMarkWithDetails moved to academics module to resolve conflicts
// This type is now exported from src/modules/academics/data/types.ts

// StudentExamResultWithDetails interface moved to academics module to resolve conflicts
// This interface is now exported from src/modules/academics/data/types.ts

// Define a base type for all data arrays
export type AppDataType = {
  schoolDetails: SchoolDetails | null;
  roles: Role[];
  users: User[];
  students: Student[];
  staff: Staff[];
  classes: Class[];
  classStreams: ClassStream[];
  subjects: Subject[];
  departments: Department[];
  designations: Designation[];
  studentCategories: StudentCategory[];
  dormitories: Dormitory[];
  academicYears: AcademicYear[];
  schoolPeriods: SchoolPeriod[];
  academicYearStructures: AcademicYearStructure[];
  academicPeriodDefinitions: AcademicPeriodDefinition[];
  financialYears: FinancialYear[];
  partners: any[]; // AdminPartnerType[] - defined in administration module
  clubs: any[]; // AdminClubAndSocietyType[] - defined in administration module
  customers: any[]; // AdminCustomerType[] - defined in administration module
  studentHealthRecords: any[]; // AdminStudentHealthRecordType[] - defined in administration module
  studentAttendance: any[]; // AdminStudentAttendanceType[] - defined in administration module
  timetablePeriodDefs: TimetablePeriodDef[];
  templatesComm: any[]; // AdminTemplateCommType[] - defined in administration module
  campaigns: any[]; // AdminCampaignType[] - defined in administration module
  subjectPapers: SubjectPaper[];
  examSessions: ExamSession[];
  examPaperSettings: ExamPaperSetting[];
  gradingSchemes: GradingScheme[];
  chartOfAccounts: ChartOfAccount[];
  expenseCategories: ExpenseCategory[];
  banks: Bank[];
  suppliers: Supplier[];
  feeTemplates: FeeTemplate[];
  feeTemplateItems: FeeTemplateItem[];
  expenseClaims: ExpenseClaim[];
  studentInvoices: FinStudentInvoiceType[];
  studentInvoiceItems: FinStudentInvoiceItemType[];
  studentPayments: FinStudentPaymentType[];
  feeAdjustments: FinFeeAdjustmentType[];
  invoicePaymentApplications: FinInvoicePaymentApplicationType[];
  customerInvoices: FinCustomerInvoiceType[];
  supplierInvoices: FinSupplierInvoiceType[];
  studentExamResults: StudentExamResultWithDetails[];
  classSubjectAllocations: ClassSubjectAllocation[];
  teacherSubjectAssignments: TeacherSubjectAssignment[];
  studentSubjectEnrollments: StudentSubjectEnrollment[];
  timetableEntries: TimetableEntry[];
  warehouses: Warehouse[];
  itemCategoriesInv: ItemCategoryInv[];
  itemsInv: ItemInv[];
  fixedAssets: FixedAsset[];
  requisitions: Requisition[];
  purchaseOrders: PurchaseOrder[];
  stockLevels: StockLevel[];
  stockTransactions: StockTransaction[];
  payrollPeriods: PayrollPeriod[];
  payrollItemTypes: PayrollItemType[];
  staffSalarySettings: StaffSalarySetting[];
  payslips: Payslip[];
  bookCategories: BookCategory[];
  books: Book[];
  loans: Loan[];
  fines: Fine[];
  parentsGuardians: ParentsGuardian[];
  workflows: Workflow[];
  mealPlans: MealPlan[];
  menus: Menu[];
  merchants: Merchant[];
  auditLogs: AuditLog[];
  studentOpeningBalances: FinStudentOpeningBalanceType[];
  transportRoutes: FinTransportRouteType[];
  studentTransportAssignments: FinStudentTransportAssignmentType[];
  generalPayments: FinGeneralPaymentType[];
  generalLedgerEntries: FinGeneralLedgerEntryType[];
  rfqs: RFQ[];
  educationSystemConfigurations: EducationSystemConfiguration[];
};

// Loading states should only map over the data types
export type AppDataLoadingStates = {
  [K in keyof AppDataType]: boolean;
} & { all: boolean };

// The full context includes the data, loading states, raw data, and CRUD operations
export type AppDataContextType = AppDataType & {
  loading: AppDataLoadingStates;
  rawInitialData: any;
  // Database management functions
  triggerSeedRxDB?: () => Promise<void>;
  triggerClearRxDB?: () => Promise<void>;
  isUsingRxDBDummyData?: boolean;
  initializationError?: Error | null;
  // Student Detail Functions
  getStudentDetailsById: (id: string) => Promise<StudentDetailProfile | null>;
  getStudentFinancialDetailsById: (id: string) => Promise<StudentDetailProfile | null>;
  // Student Attendance Functions
  saveStudentAttendance: (attendanceRecords: any[]) => Promise<void>;
  getStudentAttendanceByFilters: (date: string, classStreamId: number, periodId: number) => any[];
  getTimetablePeriodDefs: () => TimetablePeriodDef[];
  // Timetable Functions
  getTimetableEntries: (classStreamId: number) => any[];
  addTimetableEntry: (entryData: any) => Promise<void>;
  updateTimetableEntry: (updatedEntry: any) => Promise<void>;
  deleteTimetableEntry: (entryId: string) => Promise<void>;
  // Partner CRUD operations - AdminPartnerType from administration module
  addPartner: (partnerData: any) => Promise<void>;
  updatePartner: (updatedPartner: any) => Promise<void>;
  deletePartner: (partnerId: string) => Promise<void>;
  // Club CRUD operations - AdminClubAndSocietyType from administration module
  addClub: (clubData: any) => Promise<void>;
  updateClub: (updatedClub: any) => Promise<void>;
  deleteClub: (clubId: number) => Promise<void>;
  // Customer CRUD operations
  addCustomer: (customerData: any) => Promise<void>;
  updateCustomer: (updatedCustomer: any) => Promise<void>;
  deleteCustomer: (customerId: number) => Promise<void>;
  // Student Health Record CRUD operations
  addStudentHealthRecord: (healthRecordData: any) => Promise<void>;
  updateStudentHealthRecord: (updatedHealthRecord: any) => Promise<void>;
  deleteStudentHealthRecord: (healthRecordId: string) => Promise<void>;
  // Communication Templates CRUD
  addTemplateComm: (template: any) => Promise<void>;
  updateTemplateComm: (template: any) => Promise<void>;
  deleteTemplateComm: (id: number) => Promise<void>;
  // Message Campaigns CRUD
  addCampaign: (campaign: any) => Promise<void>;
  updateCampaign: (campaign: any) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  // School Periods CRUD
  addSchoolPeriod: (period: any) => Promise<void>;
  updateSchoolPeriod: (period: any) => Promise<void>;
  deleteSchoolPeriod: (id: number) => Promise<void>;
  // Timetable Period Definitions CRUD
  addTimetablePeriodDef: (periodDef: any) => Promise<void>;
  updateTimetablePeriodDef: (periodDef: any) => Promise<void>;
  deleteTimetablePeriodDef: (id: number) => Promise<void>;
  // Class CRUD operations
  addClass: (classData: Omit<Class, 'id'>) => Promise<Class>;
  updateClass: (updatedClass: Class) => Promise<Class>;
  deleteClass: (classId: number) => Promise<void>;
  // Class Stream CRUD operations
  addClassStream: (classId: number, streamData: Omit<ClassStream, 'id' | 'class_id'>) => Promise<ClassStream>;
  updateClassStream: (updatedStream: ClassStream) => Promise<ClassStream>;
  deleteClassStream: (streamId: number) => Promise<void>;
  // Invoice Generation Functions
  generateStudentInvoices: (feeTemplateId: number, schoolPeriodId: number, studentCriteria: any) => Promise<any[]>;
  // RBAC
  permissions: Permission[];
  roles: Role[];
  userRoles: UserRole[];
  addPermission: (p: Permission) => Promise<void>;
  updatePermission: (p: Permission) => Promise<void>;
  deletePermission: (id: string) => Promise<void>;
  addRole: (r: Role) => Promise<void>;
  updateRole: (r: Role) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  assignRoleToUser: (userRole: UserRole) => Promise<void>;
  removeRoleFromUser: (userId: string, roleId: string) => Promise<void>;
  // Education System Configuration CRUD
  addEducationSystemConfiguration: (config: Partial<EducationSystemConfiguration>) => Promise<void>;
  updateEducationSystemConfiguration: (config: EducationSystemConfiguration) => Promise<void>;
  deleteEducationSystemConfiguration: (id: string) => Promise<void>;
  // Exam Schedule CRUD
  addExamSchedule: (schedule: Partial<ExamSchedule>) => Promise<void>;
  updateExamSchedule: (schedule: ExamSchedule) => Promise<void>;
  deleteExamSchedule: (id: string) => Promise<void>;
};

// Navigation and Module Types
export interface NavItem {
  name: string; // Translation key
  path: string;
  icon?: React.ComponentType<any>;
  isGroup?: boolean;
  modulePath?: string;
  children?: NavItem[];
  permissions?: string[]; // Optional permissions required
  isActive?: boolean; // Whether this module/feature is active
  page?: string; // Optional explicit page component name for dynamic import
  deprecated?: boolean; // Mark item as deprecated; UI should hide or redirect
}

export interface ModuleDefinition {
  id: string;
  name: string; // Translation key for module name
  description?: string; // Translation key for module description
  icon: React.ComponentType<any>;
  path: string; // Base path for the module
  isActive: boolean; // Whether the module is enabled
  version: string;
  dependencies?: string[]; // Other modules this depends on
  permissions?: string[]; // Permissions required to access this module
  navigation: NavItem[]; // Navigation items for this module
  features?: string[]; // List of features this module provides
  routes?: Array<{ path: string; page: string }>; // Custom/dynamic routes for this module
  settings?: {
    category: string; // Settings category
    items: Array<{
      key: string;
      type: 'boolean' | 'string' | 'number' | 'select';
      defaultValue: any;
      options?: Array<{ value: any; label: string }>;
    }>;
  };
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string; // Country code for flag emoji or flag icon
  isRTL?: boolean;
}

// RBAC Types
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string; // e.g., 'administration.students', 'finance.payments'
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  moduleId: string;
  feature?: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

export interface ModulePermission {
  moduleId: string;
  permissions: Permission[];
  navigationItems: string[]; // Navigation item IDs that are accessible
  features: string[]; // Features that are accessible
}

// Enhanced ModuleDefinition with RBAC support
export interface ModuleDefinition {
  id: string;
  name: string; // Translation key for module name
  description?: string; // Translation key for module description
  icon: React.ComponentType<any>;
  path: string; // Base path for the module
  isActive: boolean; // Whether the module is enabled
  version: string;
  dependencies?: string[]; // Other modules this depends on
  permissions?: string[]; // Permissions required to access this module
  navigation: NavItem[]; // Navigation items for this module
  features?: string[]; // List of features this module provides
  routes?: Array<{ path: string; page: string }>; // Custom/dynamic routes for this module
  settings?: {
    category: string; // Settings category
    items: Array<{
      key: string;
      type: 'boolean' | 'string' | 'number' | 'select';
      defaultValue: any;
      options?: Array<{ value: any; label: string }>;
    }>;
  };
  // RBAC-specific properties
  rbacPermissions?: Permission[];
  defaultRoles?: string[]; // Roles that have access by default
  requiresAuthentication?: boolean;
  publicAccess?: boolean; // Whether module can be accessed without authentication
}

// Enhanced ModuleDependency structure for versioned dependencies
export interface ModuleDependency {
  moduleId: string;
  version: string; // Semver range (e.g., "^1.2.0", "~1.2.3")
  required: boolean;
  optional?: boolean;
}

// Enhanced ModuleDefinition with versioned dependencies
export interface ModuleDefinition {
  id: string;
  name: string; // Translation key for module name
  description?: string; // Translation key for module description
  icon: React.ComponentType<any>;
  path: string; // Base path for the module
  isActive: boolean; // Whether the module is enabled
  version: string;
  dependencies?: ModuleDependency[]; // Required and optional dependencies with version constraints
  navigation: NavItem[]; // Navigation items for this module
  features?: string[]; // List of features this module provides
  routes?: Array<{ path: string; page: string }>; // Custom/dynamic routes for this module
  settings?: {
    category: string; // Settings category
    items: Array<{
      key: string;
      type: 'boolean' | 'string' | 'number' | 'select';
      defaultValue: any;
      options?: Array<{ value: any; label: string }>;
    }>;
  };
  // RBAC-specific properties
  rbacPermissions?: Permission[];
  defaultRoles?: string[]; // Roles that have access by default
  requiresAuthentication?: boolean;
  publicAccess?: boolean; // Whether module can be accessed without authentication
}

// Enhanced ModuleDependency structure for versioned dependencies
export interface ModuleDependency {
  moduleId: string;
  version: string; // Semver range (e.g., "^1.2.0", "~1.2.3")
  required: boolean;
  optional?: boolean;
}

// RBAC Role for the new permission system
export interface RbacRole {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  isActive: boolean;
  isSystem: boolean; // System roles cannot be deleted
  moduleAccess: {
    [moduleId: string]: {
      enabled: boolean;
      permissions: string[]; // Specific permissions for this module
    };
  };
}
