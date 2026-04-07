// src/services/database/types.ts
// ABOUTME: Database service types - re-exports from core types for rxdbService compatibility

export type {
  SchoolDetails,
  User,
  Role,
  AuditLog,
  Workflow,
  WorkflowState,
  Permission,
  UserRole,
  RbacRole,
} from '@/core/types/common';

export type {
  AcademicYearStructure,
  AcademicPeriodDefinition,
  AcademicYear,
  SchoolPeriod,
  Student,
  Staff,
  ParentsGuardian,
  StudentGuardianRelationship,
  Class,
  ClassStream,
  Department,
  Designation,
  StudentCategory,
  Dormitory,
  TimetablePeriodDef,
} from '@/core/types/administration';

export type {
  ClassSubjectAllocation,
  ExamPaperSetting,
  Subject,
  SubjectPaper,
  StudentSubjectEnrollment,
  TeacherSubjectAssignment,
  TimetableEntry,
} from '@/core/types/academic';

export type {
  FinancialYear,
  ChartOfAccount,
  ExpenseCategory,
  Bank,
  Supplier,
  FeeTemplate,
  FeeTemplateItem,
  ExpenseClaim,
  RFQ,
  PayrollPeriod,
  PayrollItemType,
  StaffSalarySetting,
  Payslip,
} from '@/core/types/finance';

export type {
  Warehouse,
  ItemCategoryInv,
  ItemInv,
  FixedAsset,
  StockLevel,
  StockTransaction,
  Requisition,
  PurchaseOrder,
} from '@/core/types/inventory';

export type {
  BookCategory,
  Book,
  Loan,
  Fine,
  MealPlan,
  Menu,
  Merchant,
} from '@/core/types/library';

export {
  PersonGender,
  StudentStatus,
  AuditAction,
  DayOfWeek,
  PartnerType,
  ClubType,
  ExamSessionStatus,
  AttendanceStatus,
  TemplateType,
  CampaignAudienceType,
  CampaignStatus,
  HRPayrollPeriodStatusEnum,
  AccountType,
  AccountTemplateType,
  OpeningBalanceType,
  InvoiceStatus,
  FeeAdjustmentType,
  ExpenseClaimantType,
  TransportAssignmentStatus,
  CustomerInvoiceStatus,
  SupplierInvoiceStatus,
  PayrollPeriodStatus,
  PayrollItemCategory,
  PayrollTaxImplication,
  PayslipStatus,
  BookStatus,
  FineStatus,
  ItemTypeInv,
  DepreciationMethod,
  StockTransactionType,
  StudentMealPlanStatus,
  MealType,
  WalletTransactionType,
  RFQStatus,
  RequisitionStatus,
  PurchaseOrderStatus,
  GeneralPayerType,
  SubjectGrouping,
  StudentEnrollmentStatus,
  FinancialYearStatus,
} from '@/core/types/enums';

// App-specific types for database
export interface AppSetting {
  id: string;
  using_dummy_data: boolean;
}

// Raw initial data type for seeding
export interface RawInitialData {
  [key: string]: any;
}
