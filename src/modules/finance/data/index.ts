// ABOUTME: Exports all data hooks and types for the finance module
// ABOUTME: Registers data hooks with the global context
// ABOUTME: Provides consistent data access patterns

import { useBankData } from './useBankData';
import { useChartOfAccountData } from './useChartOfAccountData';
import { useCustomerInvoiceData } from './useCustomerInvoiceData';
import { useExpenseCategoryData } from './useExpenseCategoryData';
import { useExpenseClaimData } from './useExpenseClaimData';
import { useFeeAdjustmentData } from './useFeeAdjustmentData';
import { useFeeTemplateData } from './useFeeTemplateData';
import { useFeeTemplateItemData } from './useFeeTemplateItemData';
import { useFinancialYearData } from './useFinancialYearData';
import { useGeneralLedgerEntryData } from './useGeneralLedgerEntryData';
import { useGeneralPaymentData } from './useGeneralPaymentData';
import { useInvoicePaymentApplicationData } from './useInvoicePaymentApplicationData';
import { useStudentInvoiceData } from './useStudentInvoiceData';
import { useStudentInvoiceItemData } from './useStudentInvoiceItemData';
import { useStudentOpeningBalanceData } from './useStudentOpeningBalanceData';
import { useStudentPaymentData } from './useStudentPaymentData';
import { useStudentTransportAssignmentData } from './useStudentTransportAssignmentData';
import { useSupplierData } from './useSupplierData';
import { useSupplierInvoiceData } from './useSupplierInvoiceData';
import { useTransportRouteData } from './useTransportRouteData';

// Export all data hooks
export {
  useBankData,
  useChartOfAccountData,
  useCustomerInvoiceData,
  useExpenseCategoryData,
  useExpenseClaimData,
  useFeeAdjustmentData,
  useFeeTemplateData,
  useFeeTemplateItemData,
  useFinancialYearData,
  useGeneralLedgerEntryData,
  useGeneralPaymentData,
  useInvoicePaymentApplicationData,
  useStudentInvoiceData,
  useStudentInvoiceItemData,
  useStudentOpeningBalanceData,
  useStudentPaymentData,
  useStudentTransportAssignmentData,
  useSupplierData,
  useSupplierInvoiceData,
  useTransportRouteData
};

// Export data hook configurations for registration
export { useBankDataConfig } from './useBankData';

// Export types
export * from './types';

// Export schemas
export * from './schema';