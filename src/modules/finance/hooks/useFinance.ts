// ABOUTME: Main hook for Finance module pages
// ABOUTME: Combines data from AppDataContext with CRUD from FinanceDataProvider
// ABOUTME: This is the ONLY hook Finance pages should use

import { useAppData } from '@/hooks/useAppData';
import { useFinanceDataContext } from '../data/FinanceDataProvider';

export const useFinance = () => {
  // Get read-only data from AppDataContext
  const {
    banks: appBanks,
    chartOfAccounts: appChartOfAccounts,
    suppliers: appSuppliers,
    feeTemplates: appFeeTemplates,
    customers: appCustomers,
    financialYears: appFinancialYears,
    expenseClaims: appExpenseClaims,
    customerInvoices: appCustomerInvoices,
    supplierInvoices: appSupplierInvoices,
    loading: appLoading,
  } = useAppData();

  // Get CRUD operations from FinanceDataProvider
  const {
    // Bank CRUD
    addBank,
    updateBank,
    deleteBank,
    bulkAddBanks,
    bulkDeleteBanks,
    
    // Chart of Accounts CRUD
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    
    // Supplier CRUD
    addSupplier,
    updateSupplier,
    deleteSupplier,
    
    // Fee Template CRUD
    addFeeTemplate,
    updateFeeTemplate,
    deleteFeeTemplate,
    
    // Customer CRUD
    addCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Financial Year CRUD
    addFinancialYear,
    updateFinancialYear,
    deleteFinancialYear,
    closeFinancialYear,
    
    // Validation
    validateBank,
    validateChartOfAccount,
    validateFeeTemplate,
  } = useFinanceDataContext();

  return {
    // Data (from AppDataContext)
    banks: appBanks,
    chartOfAccounts: appChartOfAccounts,
    suppliers: appSuppliers,
    feeTemplates: appFeeTemplates,
    customers: appCustomers,
    financialYears: appFinancialYears,
    expenseClaims: appExpenseClaims,
    customerInvoices: appCustomerInvoices,
    supplierInvoices: appSupplierInvoices,
    loading: appLoading,
    
    // Bank CRUD
    addBank,
    updateBank,
    deleteBank,
    bulkAddBanks,
    bulkDeleteBanks,
    
    // Chart of Accounts CRUD
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    
    // Supplier CRUD
    addSupplier,
    updateSupplier,
    deleteSupplier,
    
    // Fee Template CRUD
    addFeeTemplate,
    updateFeeTemplate,
    deleteFeeTemplate,
    
    // Customer CRUD
    addCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Financial Year CRUD
    addFinancialYear,
    updateFinancialYear,
    deleteFinancialYear,
    closeFinancialYear,
    
    // Validation
    validateBank,
    validateChartOfAccount,
    validateFeeTemplate,
  };
};

export default useFinance;
