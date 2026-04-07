// src/core/types/enums.ts
// ABOUTME: All enum definitions used across the SchoolPilot system.

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

export enum DayOfWeek {
    MONDAY = 'MONDAY',
    TUESDAY = 'TUESDAY',
    WEDNESDAY = 'WEDNESDAY',
    THURSDAY = 'THURSDAY',
    FRIDAY = 'FRIDAY',
    SATURDAY = 'SATURDAY',
    SUNDAY = 'SUNDAY'
}

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

export enum ExamSessionStatus {
    PLANNING = 'Planning',
    MARKS_ENTRY_OPEN = 'Marks Entry Open',
    PUBLISHED = 'Published',
    CLOSED = 'Closed',
    ARCHIVED = 'Archived'
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

export enum HRPayrollPeriodStatusEnum {
    OPEN = 'Open',
    CLOSED = 'Closed',
    PROCESSED = 'Processed'
}

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

// --- Academic Enums ---

export enum SubjectGrouping {
  GROUP_1_COMPULSORY = "Group 1 (Compulsory)",
  GROUP_2_SCIENCES = "Group 2 (Sciences)",
  GROUP_3_HUMANITIES = "Group 3 (Humanities)",
  GROUP_4_TECHNICALS = "Group 4 (Technicals)",
  GROUP_5_LANGUAGES = "Group 5 (Foreign Languages)",
  OTHER = "Other/Optional"
}

export enum StudentEnrollmentStatus {
    ENROLLED = 'Enrolled',
    WITHDRAWN = 'Withdrawn'
}
