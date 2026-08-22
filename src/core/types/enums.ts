// src/core/types/enums.ts
// ABOUTME: All enum definitions used across the SchoolPilot system.

// Finance enums (FinancialYearStatus, AccountType, AccountTemplateType, OpeningBalanceType,
// InvoiceStatus, FeeAdjustmentType, ExpenseClaimantType, TransportAssignmentStatus,
// CustomerInvoiceStatus, SupplierInvoiceStatus, GeneralPayerType) are the single source of truth
// in @/modules/finance/data/types and re-exported from @/core/types/index.ts.

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

// (Finance enums consolidated into @/modules/finance/data/types — see note at top of file.)

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

// Library & Inventory status enums (BookStatus, FineStatus, StudentMealPlanStatus, MealType,
// WalletTransactionType, ItemTypeInv, DepreciationMethod, StockTransactionType) are the single
// source of truth in their modules' data/types and re-exported from @/core/types/index.ts.


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

// (RequisitionStatus & PurchaseOrderStatus consolidated into @/modules/inventory/data/types.)


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
