// src/core/types/index.ts
// ABOUTME: Barrel re-export of core types only (truly shared infrastructure types)
// ABOUTME: Module-specific types have been moved to their respective modules

// Core shared types - used by 3+ modules
export * from './enums';
export * from './common';
export * from './entities'; // Shared domain entities (Student, Staff, Class, AcademicYear, etc.)
export * from './module';
export * from './app-data';
export * from './moduleCollections'; // Auto-discovery system for module collections

// Module Data API types
export * from './moduleDataApi';

// Resolve ModuleDependency ambiguity (declared in both ./common and ./module,
// structurally identical) — the module-system definition is canonical here.
export type { ModuleDependency } from './module';

// Module-specific types - MOVED to modules (re-exported here for cross-module consumers).
// These are type-only re-exports, so the module<->core cycle is erased at compile time.
// - academic.ts → @/modules/academics/data/types
// - administration.ts → @/modules/administration/data/types
// - finance.ts → @/modules/finance/data/types
// - inventory.ts → @/modules/inventory/data/types
// - library.ts → @/modules/library/data/types
export type {
  Subject, SubjectPaper, ExamSession, ExamPaperSetting, ExamSchedule,
  GradingScheme, GradingSchemeLevel, StudentExamResult, StudentExamResultWithDetails,
  StudentPaperMark, ClassSubjectAllocation, TeacherSubjectAssignment,
  StudentSubjectEnrollment, TimetableEntry, StudentDetailProfile,
} from '@/modules/academics/data/types';
export type {
  Bank, ChartOfAccount, Customer, CustomerInvoice, CustomerInvoiceItem, ExpenseCategory, ExpenseClaim,
  FeeAdjustment, FeeInstallment, FeeTemplate, FeeTemplateItem, FinancialYear, GeneralLedgerEntry,
  GeneralPayment, GeneralPaymentItem, InvoicePaymentApplication, StudentInvoice, StudentInvoiceItem,
  StudentOpeningBalance, StudentPayment, StudentTransportAssignment, Supplier, SupplierInvoice, TransportRoute,
} from '@/modules/finance/data/types';
// Finance enums are runtime values (single source of truth lives in the finance module).
export {
  FinancialYearStatus, AccountType, AccountTemplateType, OpeningBalanceType,
  FeeAdjustmentType, ExpenseClaimantType, TransportAssignmentStatus, InvoiceStatus,
  CustomerInvoiceStatus, SupplierInvoiceStatus, GeneralPayerType, InstallmentStatus,
} from '@/modules/finance/data/types';
export type {
  AssetDepreciationLog, FixedAsset, ItemCategoryInv, ItemInv, PurchaseOrder,
  PurchaseOrderItem, Requisition, RequisitionItem, StockLevel, Warehouse,
} from '@/modules/inventory/data/types';
export {
  ItemTypeInv, DepreciationMethod, StockTransactionType, RequisitionStatus, PurchaseOrderStatus,
} from '@/modules/inventory/data/types';
export type {
  Book, BookCategory, Fine, Loan, MealConsumptionLog, MealPlan, Menu, Merchant,
  StudentMealPlan, StudentWallet, WalletTransaction,
} from '@/modules/library/data/types';
export {
  BookStatus, FineStatus, StudentMealPlanStatus, MealType, WalletTransactionType,
} from '@/modules/library/data/types';
