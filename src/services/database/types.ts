// src/services/database/types.ts
// ABOUTME: Database service types - re-exports from modules for rxdbService compatibility

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

// Administration types - now from administration module
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
} from '@/modules/administration/data/types';

// Academic types - now from academics module
export type {
  ClassSubjectAllocation,
  ExamPaperSetting,
  Subject,
  SubjectPaper,
  StudentSubjectEnrollment,
  TeacherSubjectAssignment,
  TimetableEntry,
} from '@/modules/academics/data/types';

// Finance types - now from finance module
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
} from '@/modules/finance/data/types';

// HR types - now from hr module
export type {
  PayrollPeriod,
  PayrollItemType,
  StaffSalarySetting,
  Payslip,
} from '@/modules/hr/data/types';

// Inventory types - now from inventory module
export type {
  Warehouse,
  ItemCategoryInv,
  ItemInv,
  FixedAsset,
  StockLevel,
  StockTransaction,
  Requisition,
  PurchaseOrder,
} from '@/modules/inventory/data/types';

// Library types - now from library module
export type {
  BookCategory,
  Book,
  Loan,
  Fine,
  MealPlan,
  Menu,
  Merchant,
} from '@/modules/library/data/types';

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
