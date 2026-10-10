// ABOUTME: Main hook for Finance module pages
// ABOUTME: Combines Finance data with the shared 'customers' collection from the core data layer
// ABOUTME: This is the ONLY hook Finance pages should use

import { useCallback } from 'react';
import { useFinanceData } from '../data/useFinanceData';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export const useFinance = () => {
  // Get data and CRUD from Finance module
  const finance = useFinanceData();

  // Customers are a shared record type read directly from the core data layer
  // (the framework's shared 'customers' collection), so Finance stays decoupled from
  // any sibling module. Mirrors how other modules access shared collections.
  const customersCollection = useDatabaseCollection<any>('customers');

  const addCustomer = useCallback(async (data: any) => {
    return customersCollection.insert(data);
  }, [customersCollection]);

  const updateCustomer = useCallback(async (id: string, data: any) => {
    return customersCollection.update(id, data);
  }, [customersCollection]);

  const deleteCustomer = useCallback(async (id: string) => {
    return customersCollection.remove(id);
  }, [customersCollection]);

  // ── Bulk Operations ────────────────────────────────────────────────────────────
  const { addBank, deleteBank, updateFinancialYear } = finance;

  const bulkAddBanks = useCallback(async (items: Parameters<typeof addBank>[]) => {
    return Promise.all(items.map(item => addBank(item)));
  }, [addBank]);

  const bulkDeleteBanks = useCallback(async (ids: string[]) => {
    return Promise.all(ids.map(id => deleteBank(id)));
  }, [deleteBank]);

  // ── Close Financial Year ───────────────────────────────────────────────────────
  const closeFinancialYear = useCallback(async (id: string) => {
    return updateFinancialYear(id, { status: 'Closed', closed_at: new Date().toISOString() });
  }, [updateFinancialYear]);

  // ── Validation Functions ──────────────────────────────────────────────────────
  const validateBank = useCallback((bank: { name?: string; account_number?: string; bank_code?: string }) => {
    const errors: string[] = [];
    if (!bank.name?.trim()) errors.push('Bank name is required');
    if (!bank.account_number?.trim()) errors.push('Account number is required');
    if (!bank.bank_code?.trim()) errors.push('Bank code is required');
    return { isValid: errors.length === 0, errors };
  }, []);

  const validateChartOfAccount = useCallback((account: { account_code?: string; account_name?: string; account_type?: string }) => {
    const errors: string[] = [];
    if (!account.account_code?.trim()) errors.push('Account code is required');
    if (!account.account_name?.trim()) errors.push('Account name is required');
    if (!account.account_type?.trim()) errors.push('Account type is required');
    return { isValid: errors.length === 0, errors };
  }, []);

  const validateFeeTemplate = useCallback((template: { name?: string; academic_year_id?: string; program_id?: string }) => {
    const errors: string[] = [];
    if (!template.name?.trim()) errors.push('Template name is required');
    if (!template.academic_year_id) errors.push('Academic year is required');
    if (!template.program_id) errors.push('Program is required');
    return { isValid: errors.length === 0, errors };
  }, []);

  return {
    // Every provider record and mutator (create(data) / update(id, patch) / delete(id)),
    // including fee template items, term invoicing and learner financial profiles
    ...finance,

    // Data from Finance module
    chartOfAccounts: finance.chartOfAccounts,
    banks: finance.banks,
    suppliers: finance.suppliers,
    feeTemplates: finance.feeTemplates,
    feeTemplateItems: finance.feeTemplateItems,
    expenseCategories: finance.expenseCategories,
    expenseClaims: finance.expenseClaims,
    customerInvoices: finance.customerInvoices,
    supplierInvoices: finance.supplierInvoices,
    studentOpeningBalances: finance.studentOpeningBalances,
    feeAdjustments: finance.feeAdjustments,
    transportRoutes: finance.transportRoutes,
    studentTransportAssignments: finance.studentTransportAssignments,
    studentInvoices: finance.studentInvoices,
    studentInvoiceItems: finance.studentInvoiceItems,
    studentPayments: finance.studentPayments,
    invoicePaymentApplications: finance.invoicePaymentApplications,
    generalPayments: finance.generalPayments,
    generalLedgerEntries: finance.generalLedgerEntries,
    financialYears: finance.financialYears,

    // Data from the shared 'customers' collection (core data layer)
    customers: customersCollection.data,

    // Loading state (database collections load synchronously)
    loading: false,

    // Bank CRUD
    addBank: finance.addBank,
    updateBank: finance.updateBank,
    deleteBank: finance.deleteBank,
    bulkAddBanks,
    bulkDeleteBanks,

    // Chart of Accounts CRUD
    addChartOfAccount: finance.addChartOfAccount,
    updateChartOfAccount: finance.updateChartOfAccount,
    deleteChartOfAccount: finance.deleteChartOfAccount,

    // Supplier CRUD
    addSupplier: finance.addSupplier,
    updateSupplier: finance.updateSupplier,
    deleteSupplier: finance.deleteSupplier,

    // Fee Template CRUD
    addFeeTemplate: finance.addFeeTemplate,
    updateFeeTemplate: finance.updateFeeTemplate,
    deleteFeeTemplate: finance.deleteFeeTemplate,

    // Customer CRUD (shared 'customers' collection via core data layer)
    addCustomer,
    updateCustomer,
    deleteCustomer,

    // Financial Year CRUD
    addFinancialYear: finance.addFinancialYear,
    updateFinancialYear: finance.updateFinancialYear,
    deleteFinancialYear: finance.deleteFinancialYear,
    closeFinancialYear,

    // Validation
    validateBank,
    validateChartOfAccount,
    validateFeeTemplate,

    // Aliases for page compatibility
    createBank: finance.createBank,
    createChartOfAccount: finance.createChartOfAccount,
    createSupplier: finance.createSupplier,
    createFeeTemplate: finance.createFeeTemplate,
    createExpenseClaim: finance.createExpenseClaim,
    createExpenseCategory: finance.createExpenseCategory,
    createCustomerInvoice: finance.createCustomerInvoice,
    createSupplierInvoice: finance.createSupplierInvoice,
    createStudentOpeningBalance: finance.createStudentOpeningBalance,
    createFeeAdjustment: finance.createFeeAdjustment,
    createTransportRoute: finance.createTransportRoute,
    createStudentTransportAssignment: finance.createStudentTransportAssignment,
    createStudentPayment: finance.createStudentPayment,
    createGeneralPayment: finance.createGeneralPayment,
    createFinancialYear: finance.createFinancialYear,
  };
};

export default useFinance;