// ABOUTME: Finance domain hook — ChartOfAccounts, Banks/BankAccounts, Suppliers, FeeTemplates,
// ABOUTME: ExpenseClaims, ExpenseCategories, CustomerInvoices, SupplierInvoices, StudentOpeningBalances,
// ABOUTME: FeeAdjustments, TransportRoutes, StudentTransportAssignments, StudentInvoices,
// ABOUTME: StudentPayments, GeneralPayments, FinancialYears, GeneralLedgerEntries

import { useState, useCallback } from 'react';
import type { AppDataContextType } from '@/types';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import * as allTypes from '@/modules/finance/data/types';

type RawInitialData = AppDataContextType['rawInitialData'];

export function useFinanceData(_mockDataForSeeding: RawInitialData) {
  const [financeData] = useState<{
    chartOfAccounts: allTypes.ChartOfAccount[];
    banks: allTypes.Bank[];
    suppliers: allTypes.Supplier[];
    feeTemplates: allTypes.FeeTemplate[];
    feeTemplateItems: allTypes.FeeTemplateItem[];
    expenseCategories: allTypes.ExpenseCategory[];
    expenseClaims: allTypes.ExpenseClaim[];
    supplierInvoices: allTypes.SupplierInvoice[];
    customerInvoices: allTypes.CustomerInvoice[];
    studentOpeningBalances: allTypes.StudentOpeningBalance[];
    feeAdjustments: allTypes.FeeAdjustment[];
    transportRoutes: allTypes.TransportRoute[];
    studentTransportAssignments: allTypes.StudentTransportAssignment[];
    studentInvoices: allTypes.StudentInvoice[];
    studentInvoiceItems: allTypes.StudentInvoiceItem[];
    studentPayments: allTypes.StudentPayment[];
    invoicePaymentApplications: allTypes.InvoicePaymentApplication[];
    generalPayments: allTypes.GeneralPayment[];
    generalLedgerEntries: allTypes.GeneralLedgerEntry[];
    financialYears: allTypes.FinancialYear[];
  }>({
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
  });

  const toast = useToast();

  // ── Chart of Accounts ─────────────────────────────────────────────────────────
  const addChartOfAccount = useCallback(async (accountData: Omit<allTypes.ChartOfAccount, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const accountWithId = { ...accountData, id: databaseService.generateId() };
      const result = await db.chart_of_accounts?.insert(accountWithId);
      toast.showSuccess('Chart of account created successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error adding chart of account:', error); 
      toast.showError(`Failed to create chart of account: ${error}`);
      throw error; 
    }
  }, [toast]);

  const updateChartOfAccount = useCallback(async (accountId: string, accountData: Partial<allTypes.ChartOfAccount>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.chart_of_accounts?.update(accountId, accountData);
      toast.showSuccess('Chart of account updated successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error updating chart of account:', error); 
      toast.showError(`Failed to update chart of account: ${error}`);
      throw error; 
    }
  }, [toast]);

  const deleteChartOfAccount = useCallback(async (accountId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.chart_of_accounts?.remove(accountId);
      toast.showSuccess('Chart of account deleted successfully');
      return true;
    } catch (error) { 
      console.error('Error deleting chart of account:', error); 
      toast.showError(`Failed to delete chart of account: ${error}`);
      throw error; 
    }
  }, [toast]);

  // ── Banks ─────────────────────────────────────────────────────────────────────
  const addBank = useCallback(async (bankData: Omit<allTypes.Bank, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const bankWithId = { ...bankData, id: Date.now() };
      const result = await db.banks?.insert(bankWithId);
      toast.showSuccess('Bank created successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error adding bank:', error); 
      toast.showError(`Failed to create bank: ${error}`);
      throw error; 
    }
  }, [toast]);

  const updateBank = useCallback(async (bankId: string, bankData: Partial<allTypes.Bank>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.banks?.update(bankId, bankData);
      toast.showSuccess('Bank updated successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error updating bank:', error); 
      toast.showError(`Failed to update bank: ${error}`);
      throw error; 
    }
  }, [toast]);

  const deleteBank = useCallback(async (bankId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.banks?.remove(bankId);
      toast.showSuccess('Bank deleted successfully');
      return true;
    } catch (error) { 
      console.error('Error deleting bank:', error); 
      toast.showError(`Failed to delete bank: ${error}`);
      throw error; 
    }
  }, [toast]);

  // ── Suppliers ─────────────────────────────────────────────────────────────────
  const addSupplier = useCallback(async (supplierData: Omit<allTypes.Supplier, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const supplierWithId = { ...supplierData, id: crypto.randomUUID() };
      const result = await db.suppliers?.insert(supplierWithId);
      toast.showSuccess('Supplier created successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error adding supplier:', error); 
      toast.showError(`Failed to create supplier: ${error}`);
      throw error; 
    }
  }, [toast]);

  const updateSupplier = useCallback(async (supplierId: string, supplierData: Partial<allTypes.Supplier>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.suppliers?.update(supplierId, supplierData);
      toast.showSuccess('Supplier updated successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error updating supplier:', error); 
      toast.showError(`Failed to update supplier: ${error}`);
      throw error; 
    }
  }, [toast]);

  const deleteSupplier = useCallback(async (supplierId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.suppliers?.remove(supplierId);
      toast.showSuccess('Supplier deleted successfully');
      return true;
    } catch (error) { 
      console.error('Error deleting supplier:', error); 
      toast.showError(`Failed to delete supplier: ${error}`);
      throw error; 
    }
  }, [toast]);

  // ── Fee Templates ─────────────────────────────────────────────────────────────
  const addFeeTemplate = useCallback(async (templateData: Omit<allTypes.FeeTemplate, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const templateWithId = { ...templateData, id: Date.now() };
      const result = await db.fee_templates?.insert(templateWithId);
      toast.showSuccess('Fee template created successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error adding fee template:', error); 
      toast.showError(`Failed to create fee template: ${error}`);
      throw error; 
    }
  }, [toast]);

  const updateFeeTemplate = useCallback(async (templateId: string, templateData: Partial<allTypes.FeeTemplate>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.fee_templates?.update(templateId, templateData);
      toast.showSuccess('Fee template updated successfully');
      return result?.doc || null;
    } catch (error) { 
      console.error('Error updating fee template:', error); 
      toast.showError(`Failed to update fee template: ${error}`);
      throw error; 
    }
  }, [toast]);

  const deleteFeeTemplate = useCallback(async (templateId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.fee_templates?.remove(templateId);
      toast.showSuccess('Fee template deleted successfully');
      return true;
    } catch (error) { 
      console.error('Error deleting fee template:', error); 
      toast.showError(`Failed to delete fee template: ${error}`);
      throw error; 
    }
  }, [toast]);

  // ── Expense Claims ────────────────────────────────────────────────────────────
  const addExpenseClaim = useCallback(async (claimData: Omit<allTypes.ExpenseClaim, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const claimWithId = { ...claimData, id: databaseService.generateId() };
      const result = await db.expense_claims?.insert(claimWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding expense claim:', error); throw error; }
  }, []);

  const updateExpenseClaim = useCallback(async (claimId: string, claimData: Partial<allTypes.ExpenseClaim>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.expense_claims?.update(claimId, claimData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating expense claim:', error); throw error; }
  }, []);

  const deleteExpenseClaim = useCallback(async (claimId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.expense_claims?.remove(claimId);
      return true;
    } catch (error) { console.error('Error deleting expense claim:', error); throw error; }
  }, []);

  // ── Expense Categories ────────────────────────────────────────────────────────
  const addExpenseCategory = useCallback(async (categoryData: Omit<allTypes.ExpenseCategory, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const categoryWithId = { ...categoryData, id: databaseService.generateId() };
      const result = await db.expense_categories?.insert(categoryWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding expense category:', error); throw error; }
  }, []);

  const updateExpenseCategory = useCallback(async (categoryId: string, categoryData: Partial<allTypes.ExpenseCategory>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.expense_categories?.update(categoryId, categoryData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating expense category:', error); throw error; }
  }, []);

  const deleteExpenseCategory = useCallback(async (categoryId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.expense_categories?.remove(categoryId);
      return true;
    } catch (error) { console.error('Error deleting expense category:', error); throw error; }
  }, []);

  // ── Customer Invoices ─────────────────────────────────────────────────────────
  const addCustomerInvoice = useCallback(async (invoiceData: Omit<allTypes.CustomerInvoice, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const invoiceWithId = { ...invoiceData, id: databaseService.generateId() };
      const result = await db.customer_invoices?.insert(invoiceWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding customer invoice:', error); throw error; }
  }, []);

  const updateCustomerInvoice = useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.CustomerInvoice>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.customer_invoices?.update(invoiceId, invoiceData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating customer invoice:', error); throw error; }
  }, []);

  const deleteCustomerInvoice = useCallback(async (invoiceId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.customer_invoices?.remove(invoiceId);
      return true;
    } catch (error) { console.error('Error deleting customer invoice:', error); throw error; }
  }, []);

  // ── Supplier Invoices ─────────────────────────────────────────────────────────
  const addSupplierInvoice = useCallback(async (invoiceData: Omit<allTypes.SupplierInvoice, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const invoiceWithId = { ...invoiceData, id: databaseService.generateId() };
      const result = await db.supplier_invoices?.insert(invoiceWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding supplier invoice:', error); throw error; }
  }, []);

  const updateSupplierInvoice = useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.SupplierInvoice>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.supplier_invoices?.update(invoiceId, invoiceData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating supplier invoice:', error); throw error; }
  }, []);

  const deleteSupplierInvoice = useCallback(async (invoiceId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.supplier_invoices?.remove(invoiceId);
      return true;
    } catch (error) { console.error('Error deleting supplier invoice:', error); throw error; }
  }, []);

  // ── Student Opening Balances ──────────────────────────────────────────────────
  const addStudentOpeningBalance = useCallback(async (balanceData: Omit<allTypes.StudentOpeningBalance, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const balanceWithId = { ...balanceData, id: databaseService.generateId() };
      const result = await db.student_opening_balances?.insert(balanceWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student opening balance:', error); throw error; }
  }, []);

  const updateStudentOpeningBalance = useCallback(async (balanceId: string, balanceData: Partial<allTypes.StudentOpeningBalance>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_opening_balances?.update(balanceId, balanceData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student opening balance:', error); throw error; }
  }, []);

  const deleteStudentOpeningBalance = useCallback(async (balanceId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.student_opening_balances?.remove(balanceId);
      return true;
    } catch (error) { console.error('Error deleting student opening balance:', error); throw error; }
  }, []);

  // ── Fee Adjustments ───────────────────────────────────────────────────────────
  const addFeeAdjustment = useCallback(async (adjustmentData: Omit<allTypes.FeeAdjustment, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const adjustmentWithId = { ...adjustmentData, id: databaseService.generateId() };
      const result = await db.fee_adjustments?.insert(adjustmentWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding fee adjustment:', error); throw error; }
  }, []);

  const updateFeeAdjustment = useCallback(async (adjustmentId: string, adjustmentData: Partial<allTypes.FeeAdjustment>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.fee_adjustments?.update(adjustmentId, adjustmentData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating fee adjustment:', error); throw error; }
  }, []);

  const deleteFeeAdjustment = useCallback(async (adjustmentId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.fee_adjustments?.remove(adjustmentId);
      return true;
    } catch (error) { console.error('Error deleting fee adjustment:', error); throw error; }
  }, []);

  // ── Transport Routes ──────────────────────────────────────────────────────────
  const addTransportRoute = useCallback(async (routeData: Omit<allTypes.TransportRoute, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const routeWithId = { ...routeData, id: databaseService.generateId() };
      const result = await db.transport_routes?.insert(routeWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding transport route:', error); throw error; }
  }, []);

  const updateTransportRoute = useCallback(async (routeId: string, routeData: Partial<allTypes.TransportRoute>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.transport_routes?.update(routeId, routeData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating transport route:', error); throw error; }
  }, []);

  const deleteTransportRoute = useCallback(async (routeId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.transport_routes?.remove(routeId);
      return true;
    } catch (error) { console.error('Error deleting transport route:', error); throw error; }
  }, []);

  // ── Student Transport Assignments ─────────────────────────────────────────────
  const addStudentTransportAssignment = useCallback(async (assignmentData: Omit<allTypes.StudentTransportAssignment, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const assignmentWithId = { ...assignmentData, id: databaseService.generateId() };
      const result = await db.student_transport_assignments?.insert(assignmentWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student transport assignment:', error); throw error; }
  }, []);

  const updateStudentTransportAssignment = useCallback(async (assignmentId: string, assignmentData: Partial<allTypes.StudentTransportAssignment>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_transport_assignments?.update(assignmentId, assignmentData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student transport assignment:', error); throw error; }
  }, []);

  const deleteStudentTransportAssignment = useCallback(async (assignmentId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.student_transport_assignments?.remove(assignmentId);
      return true;
    } catch (error) { console.error('Error deleting student transport assignment:', error); throw error; }
  }, []);

  // ── Student Invoices / Payments ───────────────────────────────────────────────
  const generateStudentInvoices = useCallback(async (invoiceData: any) => {
    try {
      const db = await databaseService.getDatabase();
      const invoiceWithId = { ...invoiceData, id: databaseService.generateId() };
      const result = await db.customer_invoices?.insert(invoiceWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error generating student invoices:', error); throw error; }
  }, []);

  const addStudentPayment = useCallback(async (paymentData: Omit<allTypes.StudentPayment, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const paymentWithId = { ...paymentData, id: databaseService.generateId() };
      const result = await db.student_payments?.insert(paymentWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student payment:', error); throw error; }
  }, []);

  const updateStudentPayment = useCallback(async (paymentId: string, paymentData: Partial<allTypes.StudentPayment>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_payments?.update(paymentId, paymentData);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student payment:', error); throw error; }
  }, []);

  const deleteStudentPayment = useCallback(async (paymentId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.student_payments?.remove(paymentId);
      return true;
    } catch (error) { console.error('Error deleting student payment:', error); throw error; }
  }, []);

  const applyPaymentToInvoices = useCallback(async (paymentId: string, invoiceIds: string[]) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_payments?.update(paymentId, { applied_to_invoices: invoiceIds });
      return result?.doc || null;
    } catch (error) { console.error('Error applying payment to invoices:', error); throw error; }
  }, []);

  // ── General Payments ──────────────────────────────────────────────────────────
  const addGeneralPayment = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.general_payments?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding general payment:', error); throw error; }
  }, []);

  const updateGeneralPayment = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.general_payments?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating general payment:', error); throw error; }
  }, []);

  const deleteGeneralPayment = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.general_payments?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting general payment:', error); throw error; }
  }, []);

  // ── Financial Years ───────────────────────────────────────────────────────────
  const addFinancialYear = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.financial_years?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding financial year:', error); throw error; }
  }, []);

  const updateFinancialYear = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.financial_years?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating financial year:', error); throw error; }
  }, []);

  const deleteFinancialYear = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.financial_years?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting financial year:', error); throw error; }
  }, []);

  return {
    // Data
    chartOfAccounts: financeData.chartOfAccounts,
    banks: financeData.banks,
    suppliers: financeData.suppliers,
    feeTemplates: financeData.feeTemplates,
    feeTemplateItems: financeData.feeTemplateItems,
    expenseCategories: financeData.expenseCategories,
    expenseClaims: financeData.expenseClaims,
    supplierInvoices: financeData.supplierInvoices,
    customerInvoices: financeData.customerInvoices,
    studentOpeningBalances: financeData.studentOpeningBalances,
    feeAdjustments: financeData.feeAdjustments,
    transportRoutes: financeData.transportRoutes,
    studentTransportAssignments: financeData.studentTransportAssignments,
    studentInvoices: financeData.studentInvoices,
    studentInvoiceItems: financeData.studentInvoiceItems,
    studentPayments: financeData.studentPayments,
    invoicePaymentApplications: financeData.invoicePaymentApplications,
    generalPayments: financeData.generalPayments,
    generalLedgerEntries: financeData.generalLedgerEntries,
    financialYears: financeData.financialYears,

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
    // Banks
    createBank: addBank,
    // Chart of Accounts
    createChartOfAccount: addChartOfAccount,
    // Suppliers
    createSupplier: addSupplier,
    // Fee Templates
    createFeeTemplate: addFeeTemplate,
    // Expense Claims
    createExpenseClaim: addExpenseClaim,
    // Expense Categories
    createExpenseCategory: addExpenseCategory,
    // Customer Invoices
    createCustomerInvoice: addCustomerInvoice,
    // Supplier Invoices
    createSupplierInvoice: addSupplierInvoice,
    // Student Opening Balances
    createStudentOpeningBalance: addStudentOpeningBalance,
    // Fee Adjustments
    createFeeAdjustment: addFeeAdjustment,
    // Transport Routes
    createTransportRoute: addTransportRoute,
    // Student Transport Assignments
    createStudentTransportAssignment: addStudentTransportAssignment,
    // Student Payments
    createStudentPayment: addStudentPayment,
    // General Payments
    createGeneralPayment: addGeneralPayment,
    // Financial Years
    createFinancialYear: addFinancialYear,
  };
}
