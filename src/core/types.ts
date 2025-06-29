// src/core/types.ts

// --- Enums ---

export enum UserType {
  STAFF = 'Staff',
  STUDENT = 'Student',
  PARENT = 'Parent',
}

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

export enum ClubType {
  CLUB = 'Club',
  SOCIETY = 'Society',
  SPORT = 'Sport',
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  LATE = 'Late',
  EXCUSED = 'Excused',
}

// Academic-specific enums moved to src/modules/academics/data/types.ts

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

export enum TemplateType {
    SMS = 'SMS',
    EMAIL = 'Email',
    PUSH_NOTIFICATION = 'PushNotification',
}

export enum CampaignStatus {
    DRAFT = 'Draft',
    PENDING_APPROVAL = 'Pending Approval',
    APPROVED = 'Approved',
    QUEUED = 'Queued',
    SENDING = 'Sending',
    SENT = 'Sent',
    CANCELLED = 'Cancelled',
}

export enum CampaignAudienceType {
    ALL_STUDENTS = 'All Students',
    ALL_PARENTS = 'All Parents',
    ALL_STAFF = 'All Staff',
    STUDENTS_OF_CLASS = 'Students of Class',
    PARENTS_OF_CLASS = 'Parents of Class',
}

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

export enum PartnerType {
    SUPPLIER = 'Supplier',
    SERVICE_PROVIDER = 'Service Provider',
    DONOR = 'Donor',
    GOVERNMENT_AGENCY = 'Government Agency',
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
}

export interface User {
  id: string;
  username: string;
  hashed_password?: string | null;
  password?: string | null; // For creation/update, not stored
  email: string;
  user_type: UserType;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  role_id?: number | null;
  // Denormalized
  role?: string | null;
  display_name?: string | null;
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

export interface Subject {
  id: number;
  subject_code: string;
  abbreviation: string;
  name: string;
  department_id?: string | null;
  is_compulsory?: boolean | null;
  grouping: SubjectGrouping;
  // Denormalized
  department_name?: string | null;
  papers?: SubjectPaper[];
}

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
    id: number;
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

export interface Partner {
    id: string;
    name: string;
    partner_type: PartnerType;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ClubAndSociety {
    id: number;
    name: string;
    type: ClubType;
    patron_id?: string | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    patron_name?: string | null;
}

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

export interface StudentAttendance {
    id: string;
    student_id: string;
    period_id: number;
    date: string;
    status: AttendanceStatus;
    created_at?: string | null;
    // Denormalized
    student_name?: string | null;
    period_name?: string | null;
}

export interface TimetablePeriodDef {
    id: number;
    period_name: string;
    start_time: string;
    end_time: string;
}

export interface TemplateComm {
    id: number;
    name: string;
    type: TemplateType;
    subject?: string | null;
    body_template: string;
    created_at: string;
    updated_at: string;
}

export interface Campaign {
    id: string;
    name: string;
    template_id?: number | null;
    subject?: string | null;
    body?: string | null;
    status: CampaignStatus;
    target_audience_type?: CampaignAudienceType | null;
    target_id?: string | null;
    scheduled_for?: string | null;
    sent_at?: string | null;
    created_by: string;
    approved_by?: string | null;
    created_at: string;
    updated_at: string;
    // Denormalized
    template_name?: string | null;
    created_by_name?: string | null;
    approved_by_name?: string | null;
    target_audience_display?: string | null;
}

export interface SubjectPaper {
    id: number;
    subject_id: number;
    name: string;
    created_at: string;
    updated_at: string;
    // Denormalized
    subject_name?: string | null;
}

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

export interface StudentSubjectEnrollment {
    id: string;
    student_id: string;
    class_subject_allocation_id: string;
    enrollment_date: string;
    status: StudentEnrollmentStatus;
    created_at: string;
    updated_at: string;
    // Denormalized
    student_name?: string | null;
    class_name?: string | null;
    stream_name?: string | null;
    subject_name?: string | null;
    academic_year_name?: string | null;
    enrollment_status_display?: string | null;
}

export interface TeacherSubjectAssignment {
    id: string;
    allocation_id: string;
    teacher_id: string;
    // Denormalized
    class_stream_name?: string | null;
    subject_name?: string | null;
    academic_year_name?: string | null;
    teacher_name?: string | null;
}

export interface GradingSchemeLevel {
    id: number;
    scheme_id: number;
    grade: string;
    min_score: number;
    points?: number | null;
    comment?: string | null;
}

export interface GradingScheme {
    id: number;
    name: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
    levels?: GradingSchemeLevel[];
}

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

export interface ExamSession {
    id: string;
    name: string;
    school_period_id: number;
    status: ExamSessionStatus;
    created_at: string;
    updated_at: string;
    // Denormalized
    school_period_name?: string | null;
    paper_settings?: ExamPaperSetting[];
}

export interface StudentPaperMark {
    id: string;
    student_exam_result_id: string;
    paper_setting_id: string;
    score?: number | null;
}

export interface StudentExamResult {
    id: string;
    student_id: string;
    exam_session_id: string;
    total_marks?: number | null;
    mean_grade?: string | null;
    class_rank?: number | null;
    stream_rank?: number | null;
    created_at: string;
    updated_at: string;
    marks?: StudentPaperMark[];
}

export interface TimetableEntry {
    id: string;
    class_stream_id: number;
    day_of_week: DayOfWeek;
    period_id: number;
    subject_id: number;
    teacher_id: string;
    // Denormalized
    class_stream_name?: string | null;
    period_name?: string | null;
    subject_name?: string | null;
    teacher_name?: string | null;
}

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
    user_type: UserType;
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

export interface StudentDetailProfile extends Student {
    primary_guardian?: ParentsGuardian | null;
    financial_summary: StudentFinancialSummary;
    invoices_charges: StudentInvoiceChargeItem[];
    payment_history: StudentPaymentLogItem[];
    enrolled_subjects: StudentEnrolledSubject[];
}

export interface StudentFinancialSummary {
    totalFees: number;
    totalPaid: number;
    totalDiscount: number;
    totalFine: number;
    currentBalance: number;
}

export interface StudentInvoiceChargeItem {
    id: string;
    invoiceId: string;
    feeTypeDescription: string;
    dueDate: string;
    amount: number;
    status: InvoiceStatus;
}

export interface StudentPaymentLogItem {
    id: string;
    transactionId: string;
    paymentDate: string;
    amount: number;
    paymentMethod: string;
    description: string;
}

export interface StudentEnrolledSubject {
    courseName: string;
    professorInstructorName: string;
    status: string;
}

export interface StudentPaperMarkWithDetails extends StudentPaperMark {
    subject_paper_name?: string | null;
    subject_name?: string | null;
    marks_out_of?: number | null;
}

export interface StudentExamResultWithDetails extends StudentExamResult {
    student_name?: string | null;
    admission_no?: string | null;
    class_name?: string | null;
    stream_name?: string | null;
    exam_session_name?: string | null;
    marks?: StudentPaperMarkWithDetails[];
}

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
  partners: Partner[];
  clubs: ClubAndSociety[];
  customers: Customer[];
  studentHealthRecords: StudentHealthRecord[];
  studentAttendance: StudentAttendance[];
  timetablePeriodDefs: TimetablePeriodDef[];
  templatesComm: TemplateComm[];
  campaigns: Campaign[];
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
  customerInvoices: CustomerInvoice[];
  supplierInvoices: SupplierInvoice[];
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
  studentOpeningBalances: StudentOpeningBalance[];
  feeAdjustments: FeeAdjustment[];
  transportRoutes: TransportRoute[];
  studentTransportAssignments: StudentTransportAssignment[];
  studentInvoices: StudentInvoice[];
  studentInvoiceItems: StudentInvoiceItem[];
  studentPayments: StudentPayment[];
  invoicePaymentApplications: InvoicePaymentApplication[];
  studentMealPlans: StudentMealPlan[];
  mealConsumptionLogs: MealConsumptionLog[];
  walletTransactions: WalletTransaction[];
  studentWallets: StudentWallet[];
  generalPayments: GeneralPayment[];
  generalLedgerEntries: GeneralLedgerEntry[];
  rfqs: RFQ[];
};

// Loading states should only map over the data types
export type AppDataLoadingStates = {
  [K in keyof AppDataType]: boolean;
} & { all: boolean };

// The full context includes the data, loading states, raw data, and CRUD operations
export type AppDataContextType = AppDataType & {
  loading: AppDataLoadingStates;
  rawInitialData: any;
  // Partner CRUD operations
  addPartner: (partnerData: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePartner: (updatedPartner: Partner) => Promise<void>;
  deletePartner: (partnerId: string) => Promise<void>;
};
