// ABOUTME: Main types export file that consolidates global and cross-module types.
// ABOUTME: Only exports types used by multiple modules, following the type export strategy.

// Core types - these are global types used by 3+ modules
export * from './core/types';

// Finance module types - only export what's actually needed and exists
export type {
  FinChartOfAccountType,
  FinExpenseCategoryType,
  FinBankType,
  FinSupplierType,
  FinFeeTemplateItemType,
  FinFeeTemplateType,
  FinExpenseClaimType,
  FinStudentOpeningBalanceType,
  FinFeeAdjustmentType,
  FinTransportRouteType,
  FinStudentTransportAssignmentType,
  FinStudentInvoiceItemType,
  FinStudentInvoiceType,
  FinStudentPaymentType,
  FinInvoicePaymentApplicationType,
  FinCustomerInvoiceItemType,
  FinCustomerInvoiceType,
  FinSupplierInvoiceType,
  FinGeneralPaymentItemType,
  FinGeneralPaymentType,
  FinGeneralLedgerEntryType
} from './modules/finance/data/types';

// Export enums as values (not types) - these are the ones causing issues
export {
  FinAccountTypeEnum,
  FinAccountTemplateTypeEnum,
  FinOpeningBalanceTypeEnum,
  FinFeeAdjustmentTypeEnum,
  FinTransportAssignmentStatusEnum,
  FinInvoiceStatusEnum,
  FinCustomerInvoiceStatusEnum,
  FinSupplierInvoiceStatusEnum,
  FinGeneralPayerTypeEnum,
  FinExpenseClaimantTypeEnum,
  FinFinancialYearStatusEnum
} from './modules/finance/data/types';
