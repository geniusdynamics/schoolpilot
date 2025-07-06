// ABOUTME: Serves as the main CSL entry point for the Finance module's data definitions.
// ABOUTME: It re-exports types, mock data, schemas, and collection configurations.

export * from './types';
export * from './mockData';
export * from './schema';
export * from './collections';

export { isGlobalProvider as isFinancialYearGlobalProvider, useFinancialYearData } from './useFinancialYearData';
export { isGlobalProvider as isExpenseCategoryGlobalProvider, useExpenseCategoryData } from './useExpenseCategoryData';
export { isGlobalProvider as isChartOfAccountGlobalProvider, useChartOfAccountData } from './useChartOfAccountData';
export { isGlobalProvider as isBankGlobalProvider, useBankData } from './useBankData';
export { isGlobalProvider as isSupplierGlobalProvider, useSupplierData } from './useSupplierData';
export { isGlobalProvider as isFeeTemplateGlobalProvider, useFeeTemplateData } from './useFeeTemplateData';
export { isGlobalProvider as isFeeTemplateItemGlobalProvider, useFeeTemplateItemData } from './useFeeTemplateItemData';
export { isGlobalProvider as isExpenseClaimGlobalProvider, useExpenseClaimData } from './useExpenseClaimData';
export { isGlobalProvider as isStudentOpeningBalanceGlobalProvider, useStudentOpeningBalanceData } from './useStudentOpeningBalanceData';
export { isGlobalProvider as isFeeAdjustmentGlobalProvider, useFeeAdjustmentData } from './useFeeAdjustmentData';
export { isGlobalProvider as isTransportRouteGlobalProvider, useTransportRouteData } from './useTransportRouteData';
export { isGlobalProvider as isStudentTransportAssignmentGlobalProvider, useStudentTransportAssignmentData } from './useStudentTransportAssignmentData';
export { isGlobalProvider as isStudentInvoiceGlobalProvider, useStudentInvoiceData } from './useStudentInvoiceData';
export { isGlobalProvider as isStudentInvoiceItemGlobalProvider, useStudentInvoiceItemData } from './useStudentInvoiceItemData';
export { isGlobalProvider as isStudentPaymentGlobalProvider, useStudentPaymentData } from './useStudentPaymentData';
export { isGlobalProvider as isInvoicePaymentApplicationGlobalProvider, useInvoicePaymentApplicationData } from './useInvoicePaymentApplicationData';
export { isGlobalProvider as isCustomerInvoiceGlobalProvider, useCustomerInvoiceData } from './useCustomerInvoiceData';
export { isGlobalProvider as isSupplierInvoiceGlobalProvider, useSupplierInvoiceData } from './useSupplierInvoiceData';
export { isGlobalProvider as isGeneralPaymentGlobalProvider, useGeneralPaymentData } from './useGeneralPaymentData';
export { isGlobalProvider as isGeneralLedgerEntryGlobalProvider, useGeneralLedgerEntryData } from './useGeneralLedgerEntryData';
