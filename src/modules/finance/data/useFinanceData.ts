import { logger } from '@/utils/logging';

// ABOUTME: Finance domain hook â€” ChartOfAccounts, Banks/BankAccounts, Suppliers, FeeTemplates,
// ABOUTME: ExpenseClaims, ExpenseCategories, CustomerInvoices, SupplierInvoices, StudentOpeningBalances,
// ABOUTME: FeeAdjustments, TransportRoutes, StudentTransportAssignments, StudentInvoices,
// ABOUTME: StudentPayments, GeneralPayments, FinancialYears, GeneralLedgerEntries
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback } from 'react';
import { useToastHelpers } from '@/hooks/useToast';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from '@/modules/finance/data/types';

export function useFinanceData() {
  const chartOfAccountsCollection = useDatabaseCollection<allTypes.ChartOfAccount>('chart_of_accounts');
  const banksCollection = useDatabaseCollection<allTypes.Bank>('banks');
  const suppliersCollection = useDatabaseCollection<allTypes.Supplier>('suppliers');
  const feeTemplatesCollection = useDatabaseCollection<allTypes.FeeTemplate>('fee_templates');
  const feeTemplateItemsCollection = useDatabaseCollection<allTypes.FeeTemplateItem>('fee_template_items');
  const expenseCategoriesCollection = useDatabaseCollection<allTypes.ExpenseCategory>('expense_categories');
  const expenseClaimsCollection = useDatabaseCollection<allTypes.ExpenseClaim>('expense_claims');
  const supplierInvoicesCollection = useDatabaseCollection<allTypes.SupplierInvoice>('supplier_invoices');
  const customerInvoicesCollection = useDatabaseCollection<allTypes.CustomerInvoice>('customer_invoices');
  const studentOpeningBalancesCollection = useDatabaseCollection<allTypes.StudentOpeningBalance>('student_opening_balances');
  const feeAdjustmentsCollection = useDatabaseCollection<allTypes.FeeAdjustment>('fee_adjustments');
  const transportRoutesCollection = useDatabaseCollection<allTypes.TransportRoute>('transport_routes');
  const studentTransportAssignmentsCollection = useDatabaseCollection<allTypes.StudentTransportAssignment>('student_transport_assignments');
  const studentInvoicesCollection = useDatabaseCollection<allTypes.StudentInvoice>('student_invoices');
  const studentInvoiceItemsCollection = useDatabaseCollection<allTypes.StudentInvoiceItem>('student_invoice_items');
  const studentPaymentsCollection = useDatabaseCollection<allTypes.StudentPayment>('student_payments');
  const invoicePaymentApplicationsCollection = useDatabaseCollection<allTypes.InvoicePaymentApplication>('invoice_payment_applications');
  const generalPaymentsCollection = useDatabaseCollection<allTypes.GeneralPayment>('general_payments');
  const generalLedgerEntriesCollection = useDatabaseCollection<allTypes.GeneralLedgerEntry>('general_ledger_entries');
  const financialYearsCollection = useDatabaseCollection<allTypes.FinancialYear>('financial_years');

  const toast = useToastHelpers();

  // â”€â”€ Chart of Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addChartOfAccount = useCallback(async (accountData: Omit<allTypes.ChartOfAccount, 'id'>) => {
    try {
      const result = await chartOfAccountsCollection.insert(accountData);
      toast.showSuccess('Chart of account created successfully');
      return result;
    } catch (error) {
      logger.error('Error adding chart of account:', error);
      toast.showError(`Failed to create chart of account: ${error}`);
      throw error;
    }
  }, [chartOfAccountsCollection, toast]);

  const updateChartOfAccount = useCallback(async (accountId: string, accountData: Partial<allTypes.ChartOfAccount>) => {
    try {
      const result = await chartOfAccountsCollection.update(accountId, accountData);
      toast.showSuccess('Chart of account updated successfully');
      return result;
    } catch (error) {
      logger.error('Error updating chart of account:', error);
      toast.showError(`Failed to update chart of account: ${error}`);
      throw error;
    }
  }, [chartOfAccountsCollection, toast]);

  const deleteChartOfAccount = useCallback(async (accountId: string) => {
    try {
      await chartOfAccountsCollection.remove(accountId);
      toast.showSuccess('Chart of account deleted successfully');
      return true;
    } catch (error) {
      logger.error('Error deleting chart of account:', error);
      toast.showError(`Failed to delete chart of account: ${error}`);
      throw error;
    }
  }, [chartOfAccountsCollection, toast]);

  // â”€â”€ Banks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addBank = useCallback(async (bankData: Omit<allTypes.Bank, 'id'>) => {
    try {
      const result = await banksCollection.insert(bankData);
      toast.showSuccess('Bank created successfully');
      return result;
    } catch (error) {
      logger.error('Error adding bank:', error);
      toast.showError(`Failed to create bank: ${error}`);
      throw error;
    }
  }, [banksCollection, toast]);

  const updateBank = useCallback(async (bankId: string, bankData: Partial<allTypes.Bank>) => {
    try {
      const result = await banksCollection.update(bankId, bankData);
      toast.showSuccess('Bank updated successfully');
      return result;
    } catch (error) {
      logger.error('Error updating bank:', error);
      toast.showError(`Failed to update bank: ${error}`);
      throw error;
    }
  }, [banksCollection, toast]);

  const deleteBank = useCallback(async (bankId: string) => {
    try {
      await banksCollection.remove(bankId);
      toast.showSuccess('Bank deleted successfully');
      return true;
    } catch (error) {
      logger.error('Error deleting bank:', error);
      toast.showError(`Failed to delete bank: ${error}`);
      throw error;
    }
  }, [banksCollection, toast]);

  // â”€â”€ Suppliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addSupplier = useCallback(async (supplierData: Omit<allTypes.Supplier, 'id'>) => {
    try {
      const result = await suppliersCollection.insert(supplierData);
      toast.showSuccess('Supplier created successfully');
      return result;
    } catch (error) {
      logger.error('Error adding supplier:', error);
      toast.showError(`Failed to create supplier: ${error}`);
      throw error;
    }
  }, [suppliersCollection, toast]);

  const updateSupplier = useCallback(async (supplierId: string, supplierData: Partial<allTypes.Supplier>) => {
    try {
      const result = await suppliersCollection.update(supplierId, supplierData);
      toast.showSuccess('Supplier updated successfully');
      return result;
    } catch (error) {
      logger.error('Error updating supplier:', error);
      toast.showError(`Failed to update supplier: ${error}`);
      throw error;
    }
  }, [suppliersCollection, toast]);

  const deleteSupplier = useCallback(async (supplierId: string) => {
    try {
      await suppliersCollection.remove(supplierId);
      toast.showSuccess('Supplier deleted successfully');
      return true;
    } catch (error) {
      logger.error('Error deleting supplier:', error);
      toast.showError(`Failed to delete supplier: ${error}`);
      throw error;
    }
  }, [suppliersCollection, toast]);

  // â”€â”€ Fee Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addFeeTemplate = useCallback(async (templateData: Omit<allTypes.FeeTemplate, 'id'>) => {
    try {
      const result = await feeTemplatesCollection.insert(templateData);
      toast.showSuccess('Fee template created successfully');
      return result;
    } catch (error) {
      logger.error('Error adding fee template:', error);
      toast.showError(`Failed to create fee template: ${error}`);
      throw error;
    }
  }, [feeTemplatesCollection, toast]);

  const updateFeeTemplate = useCallback(async (templateId: string, templateData: Partial<allTypes.FeeTemplate>) => {
    try {
      const result = await feeTemplatesCollection.update(templateId, templateData);
      toast.showSuccess('Fee template updated successfully');
      return result;
    } catch (error) {
      logger.error('Error updating fee template:', error);
      toast.showError(`Failed to update fee template: ${error}`);
      throw error;
    }
  }, [feeTemplatesCollection, toast]);

  const deleteFeeTemplate = useCallback(async (templateId: string) => {
    try {
      await feeTemplatesCollection.remove(templateId);
      toast.showSuccess('Fee template deleted successfully');
      return true;
    } catch (error) {
      logger.error('Error deleting fee template:', error);
      toast.showError(`Failed to delete fee template: ${error}`);
      throw error;
    }
  }, [feeTemplatesCollection, toast]);

  // â”€â”€ Expense Claims â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addExpenseClaim = useCallback(async (claimData: Omit<allTypes.ExpenseClaim, 'id'>) => {
    return expenseClaimsCollection.insert(claimData);
  }, [expenseClaimsCollection]);

  const updateExpenseClaim = useCallback(async (claimId: string, claimData: Partial<allTypes.ExpenseClaim>) => {
    return expenseClaimsCollection.update(claimId, claimData);
  }, [expenseClaimsCollection]);

  const deleteExpenseClaim = useCallback(async (claimId: string) => {
    return expenseClaimsCollection.remove(claimId);
  }, [expenseClaimsCollection]);

  // â”€â”€ Expense Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addExpenseCategory = useCallback(async (categoryData: Omit<allTypes.ExpenseCategory, 'id'>) => {
    return expenseCategoriesCollection.insert(categoryData);
  }, [expenseCategoriesCollection]);

  const updateExpenseCategory = useCallback(async (categoryId: string, categoryData: Partial<allTypes.ExpenseCategory>) => {
    return expenseCategoriesCollection.update(categoryId, categoryData);
  }, [expenseCategoriesCollection]);

  const deleteExpenseCategory = useCallback(async (categoryId: string) => {
    return expenseCategoriesCollection.remove(categoryId);
  }, [expenseCategoriesCollection]);

  // â”€â”€ Customer Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addCustomerInvoice = useCallback(async (invoiceData: Omit<allTypes.CustomerInvoice, 'id'>) => {
    return customerInvoicesCollection.insert(invoiceData);
  }, [customerInvoicesCollection]);

  const updateCustomerInvoice = useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.CustomerInvoice>) => {
    return customerInvoicesCollection.update(invoiceId, invoiceData);
  }, [customerInvoicesCollection]);

  const deleteCustomerInvoice = useCallback(async (invoiceId: string) => {
    return customerInvoicesCollection.remove(invoiceId);
  }, [customerInvoicesCollection]);

  // â”€â”€ Supplier Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addSupplierInvoice = useCallback(async (invoiceData: Omit<allTypes.SupplierInvoice, 'id'>) => {
    return supplierInvoicesCollection.insert(invoiceData);
  }, [supplierInvoicesCollection]);

  const updateSupplierInvoice = useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.SupplierInvoice>) => {
    return supplierInvoicesCollection.update(invoiceId, invoiceData);
  }, [supplierInvoicesCollection]);

  const deleteSupplierInvoice = useCallback(async (invoiceId: string) => {
    return supplierInvoicesCollection.remove(invoiceId);
  }, [supplierInvoicesCollection]);

  // â”€â”€ Student Opening Balances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addStudentOpeningBalance = useCallback(async (balanceData: Omit<allTypes.StudentOpeningBalance, 'id'>) => {
    return studentOpeningBalancesCollection.insert(balanceData);
  }, [studentOpeningBalancesCollection]);

  const updateStudentOpeningBalance = useCallback(async (balanceId: string, balanceData: Partial<allTypes.StudentOpeningBalance>) => {
    return studentOpeningBalancesCollection.update(balanceId, balanceData);
  }, [studentOpeningBalancesCollection]);

  const deleteStudentOpeningBalance = useCallback(async (balanceId: string) => {
    return studentOpeningBalancesCollection.remove(balanceId);
  }, [studentOpeningBalancesCollection]);

  // â”€â”€ Fee Adjustments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addFeeAdjustment = useCallback(async (adjustmentData: Omit<allTypes.FeeAdjustment, 'id'>) => {
    return feeAdjustmentsCollection.insert(adjustmentData);
  }, [feeAdjustmentsCollection]);

  const updateFeeAdjustment = useCallback(async (adjustmentId: string, adjustmentData: Partial<allTypes.FeeAdjustment>) => {
    return feeAdjustmentsCollection.update(adjustmentId, adjustmentData);
  }, [feeAdjustmentsCollection]);

  const deleteFeeAdjustment = useCallback(async (adjustmentId: string) => {
    return feeAdjustmentsCollection.remove(adjustmentId);
  }, [feeAdjustmentsCollection]);

  // â”€â”€ Transport Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addTransportRoute = useCallback(async (routeData: Omit<allTypes.TransportRoute, 'id'>) => {
    return transportRoutesCollection.insert(routeData);
  }, [transportRoutesCollection]);

  const updateTransportRoute = useCallback(async (routeId: string, routeData: Partial<allTypes.TransportRoute>) => {
    return transportRoutesCollection.update(routeId, routeData);
  }, [transportRoutesCollection]);

  const deleteTransportRoute = useCallback(async (routeId: string) => {
    return transportRoutesCollection.remove(routeId);
  }, [transportRoutesCollection]);

  // â”€â”€ Student Transport Assignments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addStudentTransportAssignment = useCallback(async (assignmentData: Omit<allTypes.StudentTransportAssignment, 'id'>) => {
    return studentTransportAssignmentsCollection.insert(assignmentData);
  }, [studentTransportAssignmentsCollection]);

  const updateStudentTransportAssignment = useCallback(async (assignmentId: string, assignmentData: Partial<allTypes.StudentTransportAssignment>) => {
    return studentTransportAssignmentsCollection.update(assignmentId, assignmentData);
  }, [studentTransportAssignmentsCollection]);

  const deleteStudentTransportAssignment = useCallback(async (assignmentId: string) => {
    return studentTransportAssignmentsCollection.remove(assignmentId);
  }, [studentTransportAssignmentsCollection]);

  // â”€â”€ Student Invoices / Payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const generateStudentInvoices = useCallback(async (invoiceData: any) => {
    return customerInvoicesCollection.insert(invoiceData);
  }, [customerInvoicesCollection]);

  const addStudentPayment = useCallback(async (paymentData: Omit<allTypes.StudentPayment, 'id'>) => {
    return studentPaymentsCollection.insert(paymentData);
  }, [studentPaymentsCollection]);

  const updateStudentPayment = useCallback(async (paymentId: string, paymentData: Partial<allTypes.StudentPayment>) => {
    return studentPaymentsCollection.update(paymentId, paymentData);
  }, [studentPaymentsCollection]);

  const deleteStudentPayment = useCallback(async (paymentId: string) => {
    return studentPaymentsCollection.remove(paymentId);
  }, [studentPaymentsCollection]);

  const applyPaymentToInvoices = useCallback(async (paymentId: string, invoiceIds: string[]) => {
    return studentPaymentsCollection.update(paymentId, { applied_to_invoices: invoiceIds });
  }, [studentPaymentsCollection]);

  // â”€â”€ General Payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addGeneralPayment = useCallback(async (data: any) => {
    return generalPaymentsCollection.insert(data);
  }, [generalPaymentsCollection]);

  const updateGeneralPayment = useCallback(async (id: string, data: any) => {
    return generalPaymentsCollection.update(id, data);
  }, [generalPaymentsCollection]);

  const deleteGeneralPayment = useCallback(async (id: string) => {
    return generalPaymentsCollection.remove(id);
  }, [generalPaymentsCollection]);

  // â”€â”€ Financial Years â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addFinancialYear = useCallback(async (data: any) => {
    return financialYearsCollection.insert(data);
  }, [financialYearsCollection]);

  const updateFinancialYear = useCallback(async (id: string, data: any) => {
    return financialYearsCollection.update(id, data);
  }, [financialYearsCollection]);

  const deleteFinancialYear = useCallback(async (id: string) => {
    return financialYearsCollection.remove(id);
  }, [financialYearsCollection]);

  return {
    // Data
    chartOfAccounts: chartOfAccountsCollection.data,
    banks: banksCollection.data,
    suppliers: suppliersCollection.data,
    feeTemplates: feeTemplatesCollection.data,
    feeTemplateItems: feeTemplateItemsCollection.data,
    expenseCategories: expenseCategoriesCollection.data,
    expenseClaims: expenseClaimsCollection.data,
    supplierInvoices: supplierInvoicesCollection.data,
    customerInvoices: customerInvoicesCollection.data,
    studentOpeningBalances: studentOpeningBalancesCollection.data,
    feeAdjustments: feeAdjustmentsCollection.data,
    transportRoutes: transportRoutesCollection.data,
    studentTransportAssignments: studentTransportAssignmentsCollection.data,
    studentInvoices: studentInvoicesCollection.data,
    studentInvoiceItems: studentInvoiceItemsCollection.data,
    studentPayments: studentPaymentsCollection.data,
    invoicePaymentApplications: invoicePaymentApplicationsCollection.data,
    generalPayments: generalPaymentsCollection.data,
    generalLedgerEntries: generalLedgerEntriesCollection.data,
    financialYears: financialYearsCollection.data,

    // CRUD
    addChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
    addBank, updateBank, deleteBank,
    addSupplier, updateSupplier, deleteSupplier,
    addFeeTemplate, updateFeeTemplate, deleteFeeTemplate,
    addExpenseClaim, updateExpenseClaim, deleteExpenseClaim,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    addCustomerInvoice, updateCustomerInvoice, deleteCustomerInvoice,
    addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice,
    addStudentOpeningBalance, updateStudentOpeningBalance, deleteStudentOpeningBalance,
    addFeeAdjustment, updateFeeAdjustment, deleteFeeAdjustment,
    addTransportRoute, updateTransportRoute, deleteTransportRoute,
    addStudentTransportAssignment, updateStudentTransportAssignment, deleteStudentTransportAssignment,
    generateStudentInvoices,
    addStudentPayment, updateStudentPayment, deleteStudentPayment,
    applyPaymentToInvoices,
    addGeneralPayment, updateGeneralPayment, deleteGeneralPayment,
    addFinancialYear, updateFinancialYear, deleteFinancialYear,

    // Aliases for page compatibility
    createBank: addBank,
    createChartOfAccount: addChartOfAccount,
    createSupplier: addSupplier,
    createFeeTemplate: addFeeTemplate,
    createExpenseClaim: addExpenseClaim,
    createExpenseCategory: addExpenseCategory,
    createCustomerInvoice: addCustomerInvoice,
    createSupplierInvoice: addSupplierInvoice,
    createStudentOpeningBalance: addStudentOpeningBalance,
    createFeeAdjustment: addFeeAdjustment,
    createTransportRoute: addTransportRoute,
    createStudentTransportAssignment: addStudentTransportAssignment,
    createStudentPayment: addStudentPayment,
    createGeneralPayment: addGeneralPayment,
    createFinancialYear: addFinancialYear,
  };
}
