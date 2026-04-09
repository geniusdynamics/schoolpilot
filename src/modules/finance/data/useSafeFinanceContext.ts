// ABOUTME: Safe context hook for finance module - returns empty data when module is disabled
import { useFinanceDataContext } from './FinanceDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeFinanceContext = () => {
  const isEnabled = moduleRegistry.isEnabled('finance');

  if (!isEnabled) {
    return {
      chartOfAccounts: [],
      banks: [],
      suppliers: [],
      feeTemplates: [],
      feeTemplateItems: [],
      expenseCategories: [],
      expenseClaims: [],
      supplierInvoices: [],
      customerInvoices: [],
      studentOpeningBalances: [],
      feeAdjustments: [],
      transportRoutes: [],
      studentTransportAssignments: [],
      studentInvoices: [],
      studentInvoiceItems: [],
      studentPayments: [],
      invoicePaymentApplications: [],
      generalPayments: [],
      generalLedgerEntries: [],
      financialYears: [],
      isModuleEnabled: false,
    };
  }

  return { ...useFinanceDataContext(), isModuleEnabled: true };
};
