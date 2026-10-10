import { logger } from '@/utils/logging';

// ABOUTME: Finance domain hook — ChartOfAccounts, Banks/BankAccounts, Suppliers, FeeTemplates,
// ABOUTME: ExpenseClaims, ExpenseCategories, CustomerInvoices, SupplierInvoices, StudentOpeningBalances,
// ABOUTME: FeeAdjustments, TransportRoutes, StudentTransportAssignments, StudentInvoices,
// ABOUTME: StudentPayments, GeneralPayments, FinancialYears, GeneralLedgerEntries
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback, useMemo } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { nextSequenceNumber, sequenceYear } from '@/domain/sequences';
import { useToastHelpers } from '@/hooks/useToast';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from '@/modules/finance/data/types';
import type { StudentDetailProfile } from '@/core/types';

export interface GenerateTermInvoicesParams {
  feeTemplateId: string | number;
  studentIds: string[];
  schoolPeriodId?: string | number;
  issueDate?: string;
  dueDate?: string;
  dryRun?: boolean;
}

export interface GenerateTermInvoicesResult {
  invoices: allTypes.StudentInvoice[];
  skippedStudentIds: string[];
}

const INVOICE_PREFIX = 'INV';

async function readAll<T>(collectionName: string): Promise<T[]> {
  const db = await databaseService.getDatabase();
  return ((await db.getCollection(collectionName)?.find({})) || []) as T[];
}

export function useFinanceData() {
  const chartOfAccountsCollection = useDatabaseCollection<allTypes.ChartOfAccount>('chart_of_accounts');
  const banksCollection = useDatabaseCollection<allTypes.Bank>('banks');
  const suppliersCollection = useDatabaseCollection<allTypes.Supplier>('suppliers');
  const feeTemplatesCollection = useDatabaseCollection<allTypes.FeeTemplate>('fee_templates');
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

  // ── Chart of Accounts ─────────────────────────────────────────────────────────
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

  // ── Banks ─────────────────────────────────────────────────────────────────────
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

  // ── Suppliers ─────────────────────────────────────────────────────────────────
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

  // ── Fee Templates ─────────────────────────────────────────────────────────────
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

  // ── Fee Template Items (stored in fee_templates.items) ──────────────────────
  const feeTemplateItems = useMemo<allTypes.FeeTemplateItem[]>(() =>
    feeTemplatesCollection.data.flatMap((template: any) =>
      (template.items || []).map((item: allTypes.FeeTemplateItem) => ({ ...item, fee_template_id: template.id }))
    ), [feeTemplatesCollection.data]);

  const findTemplateWithItem = useCallback(async (itemId: string) => {
    const templates = await readAll<any>('fee_templates');
    return templates.find((template) => (template.items || []).some((item: any) => item.id === itemId));
  }, []);

  const addFeeTemplateItem = useCallback(async (itemData: Omit<allTypes.FeeTemplateItem, 'id'>) => {
    const db = await databaseService.getDatabase();
    const template: any = await db.getCollection('fee_templates')?.findById(String(itemData.fee_template_id));
    if (!template) throw new Error(`Fee template ${itemData.fee_template_id} not found`);
    const item = { ...itemData, id: databaseService.generateId(), fee_template_id: template.id } as allTypes.FeeTemplateItem;
    await feeTemplatesCollection.update(template.id, { items: [...(template.items || []), item] } as any);
    return item;
  }, [feeTemplatesCollection]);

  const updateFeeTemplateItem = useCallback(async (itemId: string, itemData: Partial<allTypes.FeeTemplateItem>) => {
    const template = await findTemplateWithItem(itemId);
    if (!template) throw new Error(`Fee template item ${itemId} not found`);
    const items = template.items.map((item: any) => (item.id === itemId ? { ...item, ...itemData, id: itemId } : item));
    await feeTemplatesCollection.update(template.id, { items } as any);
    return items.find((item: any) => item.id === itemId);
  }, [feeTemplatesCollection, findTemplateWithItem]);

  const deleteFeeTemplateItem = useCallback(async (itemId: string) => {
    const template = await findTemplateWithItem(itemId);
    if (!template) return false;
    await feeTemplatesCollection.update(template.id, { items: template.items.filter((item: any) => item.id !== itemId) } as any);
    return true;
  }, [feeTemplatesCollection, findTemplateWithItem]);

  // ── Expense Claims ────────────────────────────────────────────────────────────
  const addExpenseClaim = useCallback(async (claimData: Omit<allTypes.ExpenseClaim, 'id'>) => {
    return expenseClaimsCollection.insert(claimData);
  }, [expenseClaimsCollection]);

  const updateExpenseClaim = useCallback(async (claimId: string, claimData: Partial<allTypes.ExpenseClaim>) => {
    return expenseClaimsCollection.update(claimId, claimData);
  }, [expenseClaimsCollection]);

  const deleteExpenseClaim = useCallback(async (claimId: string) => {
    return expenseClaimsCollection.remove(claimId);
  }, [expenseClaimsCollection]);

  // ── Expense Categories ────────────────────────────────────────────────────────
  const addExpenseCategory = useCallback(async (categoryData: Omit<allTypes.ExpenseCategory, 'id'>) => {
    return expenseCategoriesCollection.insert(categoryData);
  }, [expenseCategoriesCollection]);

  const updateExpenseCategory = useCallback(async (categoryId: string, categoryData: Partial<allTypes.ExpenseCategory>) => {
    return expenseCategoriesCollection.update(categoryId, categoryData);
  }, [expenseCategoriesCollection]);

  const deleteExpenseCategory = useCallback(async (categoryId: string) => {
    return expenseCategoriesCollection.remove(categoryId);
  }, [expenseCategoriesCollection]);

  // ── Customer Invoices ─────────────────────────────────────────────────────────
  const addCustomerInvoice = useCallback(async (invoiceData: Omit<allTypes.CustomerInvoice, 'id'>) => {
    return customerInvoicesCollection.insert(invoiceData);
  }, [customerInvoicesCollection]);

  const updateCustomerInvoice = useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.CustomerInvoice>) => {
    return customerInvoicesCollection.update(invoiceId, invoiceData);
  }, [customerInvoicesCollection]);

  const deleteCustomerInvoice = useCallback(async (invoiceId: string) => {
    return customerInvoicesCollection.remove(invoiceId);
  }, [customerInvoicesCollection]);

  // ── Supplier Invoices ─────────────────────────────────────────────────────────
  const addSupplierInvoice = useCallback(async (invoiceData: Omit<allTypes.SupplierInvoice, 'id'>) => {
    return supplierInvoicesCollection.insert(invoiceData);
  }, [supplierInvoicesCollection]);

  const updateSupplierInvoice = useCallback(async (invoiceId: string, invoiceData: Partial<allTypes.SupplierInvoice>) => {
    return supplierInvoicesCollection.update(invoiceId, invoiceData);
  }, [supplierInvoicesCollection]);

  const deleteSupplierInvoice = useCallback(async (invoiceId: string) => {
    return supplierInvoicesCollection.remove(invoiceId);
  }, [supplierInvoicesCollection]);

  // ── Student Opening Balances ──────────────────────────────────────────────────
  const addStudentOpeningBalance = useCallback(async (balanceData: Omit<allTypes.StudentOpeningBalance, 'id'>) => {
    return studentOpeningBalancesCollection.insert(balanceData);
  }, [studentOpeningBalancesCollection]);

  const updateStudentOpeningBalance = useCallback(async (balanceId: string, balanceData: Partial<allTypes.StudentOpeningBalance>) => {
    return studentOpeningBalancesCollection.update(balanceId, balanceData);
  }, [studentOpeningBalancesCollection]);

  const deleteStudentOpeningBalance = useCallback(async (balanceId: string) => {
    return studentOpeningBalancesCollection.remove(balanceId);
  }, [studentOpeningBalancesCollection]);

  // ── Fee Adjustments ───────────────────────────────────────────────────────────
  const addFeeAdjustment = useCallback(async (adjustmentData: Omit<allTypes.FeeAdjustment, 'id'>) => {
    return feeAdjustmentsCollection.insert(adjustmentData);
  }, [feeAdjustmentsCollection]);

  const updateFeeAdjustment = useCallback(async (adjustmentId: string, adjustmentData: Partial<allTypes.FeeAdjustment>) => {
    return feeAdjustmentsCollection.update(adjustmentId, adjustmentData);
  }, [feeAdjustmentsCollection]);

  const deleteFeeAdjustment = useCallback(async (adjustmentId: string) => {
    return feeAdjustmentsCollection.remove(adjustmentId);
  }, [feeAdjustmentsCollection]);

  // ── Transport Routes ──────────────────────────────────────────────────────────
  const addTransportRoute = useCallback(async (routeData: Omit<allTypes.TransportRoute, 'id'>) => {
    return transportRoutesCollection.insert(routeData);
  }, [transportRoutesCollection]);

  const updateTransportRoute = useCallback(async (routeId: string, routeData: Partial<allTypes.TransportRoute>) => {
    return transportRoutesCollection.update(routeId, routeData);
  }, [transportRoutesCollection]);

  const deleteTransportRoute = useCallback(async (routeId: string) => {
    return transportRoutesCollection.remove(routeId);
  }, [transportRoutesCollection]);

  // ── Student Transport Assignments ─────────────────────────────────────────────
  const addStudentTransportAssignment = useCallback(async (assignmentData: Omit<allTypes.StudentTransportAssignment, 'id'>) => {
    return studentTransportAssignmentsCollection.insert(assignmentData);
  }, [studentTransportAssignmentsCollection]);

  const updateStudentTransportAssignment = useCallback(async (assignmentId: string, assignmentData: Partial<allTypes.StudentTransportAssignment>) => {
    return studentTransportAssignmentsCollection.update(assignmentId, assignmentData);
  }, [studentTransportAssignmentsCollection]);

  const deleteStudentTransportAssignment = useCallback(async (assignmentId: string) => {
    return studentTransportAssignmentsCollection.remove(assignmentId);
  }, [studentTransportAssignmentsCollection]);

  // ── Student Invoices / Payments ───────────────────────────────────────────────
  // Bills each learner once per fee template and school period; a dry run returns the preview only.
  const generateTermInvoices = useCallback(async (params: GenerateTermInvoicesParams): Promise<GenerateTermInvoicesResult> => {
    const db = await databaseService.getDatabase();
    const template: any = await db.getCollection('fee_templates')?.findById(String(params.feeTemplateId));
    if (!template) throw new Error(`Fee template ${params.feeTemplateId} not found`);
    const schoolPeriodId = String(params.schoolPeriodId ?? template.school_period_id);
    const templateItems: allTypes.FeeTemplateItem[] = template.items || [];
    const templateItemIds = new Set(templateItems.map((item) => String(item.id)));
    const issueDate = params.issueDate || new Date().toISOString().slice(0, 10);

    const existing = await readAll<allTypes.StudentInvoice>('student_invoices');
    const alreadyBilled = new Set(existing
      .filter((invoice) => !invoice.deleted_at && String(invoice.school_period_id) === schoolPeriodId &&
        (invoice.items || []).some((item) => templateItemIds.has(String(item.fee_template_item_id))))
      .map((invoice) => String(invoice.student_id)));

    const invoiceNumbers = existing.map((invoice) => invoice.invoice_number);
    const invoices: allTypes.StudentInvoice[] = [];
    const skippedStudentIds: string[] = [];
    for (const studentId of params.studentIds.map(String)) {
      if (alreadyBilled.has(studentId)) { skippedStudentIds.push(studentId); continue; }
      const id = databaseService.generateId();
      const invoiceNumber = nextSequenceNumber(invoiceNumbers, { prefix: INVOICE_PREFIX, year: sequenceYear(issueDate) });
      invoiceNumbers.push(invoiceNumber);
      const now = new Date().toISOString();
      invoices.push({
        id,
        student_id: studentId,
        invoice_number: invoiceNumber,
        school_period_id: schoolPeriodId,
        issue_date: issueDate,
        due_date: params.dueDate || issueDate,
        total_amount_billed: templateItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        amount_paid: 0,
        status: allTypes.InvoiceStatus.DUE,
        items: templateItems.map((item) => ({
          id: databaseService.generateId(),
          invoice_id: id,
          description: item.description,
          amount: Number(item.amount || 0),
          fee_template_item_id: String(item.id),
        })),
        created_at: now,
        updated_at: now,
      } as unknown as allTypes.StudentInvoice);
    }

    if (!params.dryRun) {
      for (const invoice of invoices) await studentInvoicesCollection.insert(invoice);
    }
    return { invoices, skippedStudentIds };
  }, [studentInvoicesCollection]);

  // Selects learners by category and/or class stream, then bills them with generateTermInvoices.
  const generateStudentInvoices = useCallback(async (
    feeTemplateId: string | number,
    schoolPeriodId: string | number,
    criteria: { categoryId?: string | number; classStreamId?: string | number } = {}
  ) => {
    const students = await readAll<any>('students');
    const studentIds = students
      .filter((student) => criteria.categoryId === undefined || String(student.student_category_id) === String(criteria.categoryId))
      .filter((student) => criteria.classStreamId === undefined || String(student.current_class_stream_id) === String(criteria.classStreamId))
      .map((student) => String(student.id));
    const { invoices } = await generateTermInvoices({ feeTemplateId, schoolPeriodId, studentIds });
    return invoices;
  }, [generateTermInvoices]);

  // Builds the learner's financial profile (invoices, payments, adjustments and balance).
  const getStudentFinancialDetailsById = useCallback(async (studentId: string): Promise<StudentDetailProfile | null> => {
    try {
      const db = await databaseService.getDatabase();
      const student: any = await db.getCollection('students')?.findById(studentId);
      if (!student) return null;
      const forStudent = <T extends { student_id: string }>(rows: T[]) => rows.filter((row) => String(row.student_id) === String(studentId));
      const invoices = forStudent(await readAll<allTypes.StudentInvoice>('student_invoices')).filter((invoice) => !invoice.deleted_at);
      const payments = forStudent(await readAll<allTypes.StudentPayment>('student_payments'));
      const adjustments = forStudent(await readAll<allTypes.FeeAdjustment>('fee_adjustments'));

      const sumOf = <T,>(rows: T[], pick: (row: T) => unknown) => rows.reduce((sum, row) => sum + Number(pick(row) || 0), 0);
      const totalFees = sumOf(invoices, (invoice) => invoice.total_amount_billed);
      const totalPaid = sumOf(payments, (payment) => payment.total_amount_paid);
      const ofTypes = (types: allTypes.FeeAdjustmentType[]) => adjustments.filter((adjustment) => types.includes(adjustment.adjustment_type));
      const totalFine = sumOf(ofTypes([allTypes.FeeAdjustmentType.FINE, allTypes.FeeAdjustmentType.PENALTY]), (adjustment) => adjustment.amount);
      const totalDiscount = sumOf(ofTypes([
        allTypes.FeeAdjustmentType.SCHOLARSHIP, allTypes.FeeAdjustmentType.DISCOUNT, allTypes.FeeAdjustmentType.EXEMPTION,
      ]), (adjustment) => adjustment.amount);

      return {
        ...student,
        financial_summary: { totalFees, totalPaid, totalDiscount, totalFine, currentBalance: totalFees + totalFine - totalDiscount - totalPaid },
        invoices_charges: invoices.map((invoice) => ({
          id: invoice.id,
          invoiceId: invoice.invoice_number,
          feeTypeDescription: (invoice.items || []).map((item) => item.description).join(', '),
          dueDate: invoice.due_date,
          amount: Number(invoice.total_amount_billed || 0),
          status: invoice.status,
        })),
        payment_history: payments.map((payment) => ({
          id: payment.id,
          transactionId: payment.receipt_no,
          paymentDate: payment.transaction_date,
          amount: Number(payment.total_amount_paid || 0),
          paymentMethod: payment.payment_method || '',
          description: payment.notes || '',
        })),
        enrolled_subjects: [],
      } as StudentDetailProfile;
    } catch (error) {
      logger.error('Error building student financial details:', error);
      return null;
    }
  }, []);

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

  // ── General Payments ──────────────────────────────────────────────────────────
  const addGeneralPayment = useCallback(async (data: any) => {
    return generalPaymentsCollection.insert(data);
  }, [generalPaymentsCollection]);

  const updateGeneralPayment = useCallback(async (id: string, data: any) => {
    return generalPaymentsCollection.update(id, data);
  }, [generalPaymentsCollection]);

  const deleteGeneralPayment = useCallback(async (id: string) => {
    return generalPaymentsCollection.remove(id);
  }, [generalPaymentsCollection]);

  // ── Financial Years ───────────────────────────────────────────────────────────
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
    feeTemplateItems,
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
    addFeeTemplateItem, updateFeeTemplateItem, deleteFeeTemplateItem,
    addExpenseClaim, updateExpenseClaim, deleteExpenseClaim,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    addCustomerInvoice, updateCustomerInvoice, deleteCustomerInvoice,
    addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice,
    addStudentOpeningBalance, updateStudentOpeningBalance, deleteStudentOpeningBalance,
    addFeeAdjustment, updateFeeAdjustment, deleteFeeAdjustment,
    addTransportRoute, updateTransportRoute, deleteTransportRoute,
    addStudentTransportAssignment, updateStudentTransportAssignment, deleteStudentTransportAssignment,
    generateTermInvoices, generateStudentInvoices, getStudentFinancialDetailsById,
    addStudentPayment, updateStudentPayment, deleteStudentPayment,
    applyPaymentToInvoices,
    addGeneralPayment, updateGeneralPayment, deleteGeneralPayment,
    addFinancialYear, updateFinancialYear, deleteFinancialYear,

    // Aliases for page compatibility
    createBank: addBank,
    createChartOfAccount: addChartOfAccount,
    createSupplier: addSupplier,
    createFeeTemplate: addFeeTemplate,
    createFeeTemplateItem: addFeeTemplateItem,
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
