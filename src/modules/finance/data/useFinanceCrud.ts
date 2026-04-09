// ABOUTME: Comprehensive CRUD hook for Finance module
// ABOUTME: Provides all create, read, update, delete operations for finance entities
// ABOUTME: Uses UnifiedDatabaseManager for real persistence

import { useCallback } from 'react';
import { useCrudFactory } from '@/hooks/useCrudFactory';
import { useToast } from '@/hooks/useToast';
import { databaseService } from '@/services/database/databaseService';
import type {
  Bank,
  ChartOfAccount,
  Supplier,
  FeeTemplate,
  FeeTemplateItem,
  ExpenseCategory,
  ExpenseClaim,
  Customer,
  CustomerInvoice,
  CustomerInvoiceItem,
  SupplierInvoice,
  StudentOpeningBalance,
  FeeAdjustment,
  TransportRoute,
  StudentTransportAssignment,
  StudentInvoice,
  StudentInvoiceItem,
  StudentPayment,
  InvoicePaymentApplication,
  GeneralPayment,
  GeneralPaymentItem,
  FinancialYear,
  GeneralLedgerEntry,
  InvoiceStatus,
  CustomerInvoiceStatus,
  SupplierInvoiceStatus,
} from './types';

// Collection names from appDataCollections.ts
const COLLECTIONS = {
  banks: 'banks',
  chartOfAccounts: 'chart_of_accounts',
  suppliers: 'suppliers',
  feeTemplates: 'fee_templates',
  feeTemplateItems: 'fee_template_items',
  expenseCategories: 'expense_categories',
  expenseClaims: 'expense_claims',
  customers: 'customers',
  customerInvoices: 'customer_invoices',
  customerInvoiceItems: 'customer_invoice_items',
  supplierInvoices: 'supplier_invoices',
  studentOpeningBalances: 'student_opening_balances',
  feeAdjustments: 'fee_adjustments',
  transportRoutes: 'transport_routes',
  studentTransportAssignments: 'student_transport_assignments',
  studentInvoices: 'student_invoices',
  studentInvoiceItems: 'student_invoice_items',
  studentPayments: 'student_payments',
  invoicePaymentApplications: 'invoice_payment_applications',
  generalPayments: 'general_payments',
  generalPaymentItems: 'general_payment_items',
  financialYears: 'financial_years',
  generalLedgerEntries: 'general_ledger_entries',
} as const;

// ===== BANK CRUD =====
export function useBankCrud() {
  return useCrudFactory<Bank>({
    collectionName: COLLECTIONS.banks,
    entityName: 'Bank',
  });
}

// ===== CHART OF ACCOUNTS CRUD =====
export function useChartOfAccountCrud() {
  return useCrudFactory<ChartOfAccount>({
    collectionName: COLLECTIONS.chartOfAccounts,
    entityName: 'Chart of Account',
  });
}

// ===== SUPPLIER CRUD =====
export function useSupplierCrud() {
  return useCrudFactory<Supplier>({
    collectionName: COLLECTIONS.suppliers,
    entityName: 'Supplier',
  });
}

// ===== FEE TEMPLATE CRUD =====
export function useFeeTemplateCrud() {
  const toast = useToast();
  
  const baseCrud = useCrudFactory<FeeTemplate>({
    collectionName: COLLECTIONS.feeTemplates,
    entityName: 'Fee Template',
  });

  // Override create to handle nested items
  const createWithItems = useCallback(async (
    templateData: Omit<FeeTemplate, 'id' | 'created_at' | 'updated_at'>,
    items: Array<Omit<FeeTemplateItem, 'id' | 'fee_template_id' | 'created_at' | 'updated_at'>>
  ): Promise<FeeTemplate> => {
    try {
      const db = await databaseService.getDatabase();
      
      // Create template
      const template = await baseCrud.create(templateData);
      
      // Create items
      const itemPromises = items.map(async (itemData) => {
        const itemCollection = (db as any)[COLLECTIONS.feeTemplateItems];
        if (itemCollection?.insert) {
          return itemCollection.insert({
            ...itemData,
            id: crypto.randomUUID(),
            fee_template_id: template.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      });
      
      await Promise.all(itemPromises);
      
      toast.showSuccess('Fee template with items created successfully');
      return template;
    } catch (error) {
      toast.showError(`Failed to create fee template: ${error}`);
      throw error;
    }
  }, [baseCrud, toast]);

  return {
    ...baseCrud,
    createWithItems,
  };
}

// ===== EXPENSE CATEGORY CRUD =====
export function useExpenseCategoryCrud() {
  return useCrudFactory<ExpenseCategory>({
    collectionName: COLLECTIONS.expenseCategories,
    entityName: 'Expense Category',
  });
}

// ===== EXPENSE CLAIM CRUD =====
export function useExpenseClaimCrud() {
  const baseCrud = useCrudFactory<ExpenseClaim>({
    collectionName: COLLECTIONS.expenseClaims,
    entityName: 'Expense Claim',
  });

  const approveClaim = useCallback(async (
    claimId: string,
    approvedById: string
  ): Promise<ExpenseClaim> => {
    return baseCrud.update(claimId, {
      approved_by: approvedById,
    } as Partial<ExpenseClaim>);
  }, [baseCrud]);

  const markAsPaid = useCallback(async (
    claimId: string,
    paymentReference: string
  ): Promise<ExpenseClaim> => {
    return baseCrud.update(claimId, {
      paid_date: new Date().toISOString(),
      payment_reference: paymentReference,
    } as Partial<ExpenseClaim>);
  }, [baseCrud]);

  return {
    ...baseCrud,
    approveClaim,
    markAsPaid,
  };
}

// ===== CUSTOMER CRUD =====
export function useCustomerCrud() {
  return useCrudFactory<Customer>({
    collectionName: COLLECTIONS.customers,
    entityName: 'Customer',
  });
}

// ===== CUSTOMER INVOICE CRUD =====
export function useCustomerInvoiceCrud() {
  const toast = useToast();
  const baseCrud = useCrudFactory<CustomerInvoice>({
    collectionName: COLLECTIONS.customerInvoices,
    entityName: 'Customer Invoice',
  });

  // Create invoice with items
  const createWithItems = useCallback(async (
    invoiceData: Omit<CustomerInvoice, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: Array<Omit<CustomerInvoiceItem, 'id' | 'invoice_id'>>
  ): Promise<CustomerInvoice> => {
    try {
      const db = await databaseService.getDatabase();
      
      // Calculate total
      const totalAmount = items.reduce((sum, item) => 
        sum + ((item.amount || 0)), 0
      );
      
      // Create invoice
      const invoice = await baseCrud.create({
        ...invoiceData,
        total_amount: totalAmount,
        status: CustomerInvoiceStatus.DRAFT,
      } as Omit<CustomerInvoice, 'id' | 'created_at' | 'updated_at'>);
      
      // Create items
      const itemPromises = items.map(async (itemData) => {
        const itemCollection = (db as any)[COLLECTIONS.customerInvoiceItems];
        if (itemCollection?.insert) {
          return itemCollection.insert({
            ...itemData,
            id: crypto.randomUUID(),
            invoice_id: invoice.id,
          });
        }
      });
      
      await Promise.all(itemPromises);
      
      toast.showSuccess('Customer invoice created successfully');
      return invoice;
    } catch (error) {
      toast.showError(`Failed to create invoice: ${error}`);
      throw error;
    }
  }, [baseCrud, toast]);

  // Post invoice (change status from draft to sent)
  const postInvoice = useCallback(async (invoiceId: string): Promise<CustomerInvoice> => {
    return baseCrud.update(invoiceId, {
      status: CustomerInvoiceStatus.SENT,
    } as Partial<CustomerInvoice>);
  }, [baseCrud]);

  // Record payment
  const recordPayment = useCallback(async (
    invoiceId: string,
    amount: number
  ): Promise<CustomerInvoice> => {
    const invoice = baseCrud.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const currentTotal = invoice.total_amount || 0;
    const newTotal = Math.max(0, currentTotal - amount);
    
    let status = invoice.status;
    if (newTotal === 0) {
      status = CustomerInvoiceStatus.PAID;
    } else if (newTotal < currentTotal) {
      status = CustomerInvoiceStatus.PARTIALLY_PAID;
    }
    
    return baseCrud.update(invoiceId, {
      total_amount: newTotal,
      status,
    } as Partial<CustomerInvoice>);
  }, [baseCrud]);

  // Void invoice
  const voidInvoice = useCallback(async (invoiceId: string): Promise<CustomerInvoice> => {
    return baseCrud.update(invoiceId, {
      status: CustomerInvoiceStatus.VOIDED,
    } as Partial<CustomerInvoice>);
  }, [baseCrud]);

  return {
    ...baseCrud,
    createWithItems,
    postInvoice,
    recordPayment,
    voidInvoice,
  };
}

// ===== SUPPLIER INVOICE CRUD =====
export function useSupplierInvoiceCrud() {
  const baseCrud = useCrudFactory<SupplierInvoice>({
    collectionName: COLLECTIONS.supplierInvoices,
    entityName: 'Supplier Invoice',
  });

  const recordPayment = useCallback(async (
    invoiceId: string,
    amount: number
  ): Promise<SupplierInvoice> => {
    const invoice = baseCrud.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const currentPaid = invoice.amount_paid || 0;
    const newPaid = currentPaid + amount;
    const total = invoice.total_amount || 0;
    
    let status: SupplierInvoiceStatus = SupplierInvoiceStatus.UNPAID;
    if (newPaid >= total) {
      status = SupplierInvoiceStatus.PAID;
    } else if (newPaid > 0) {
      status = SupplierInvoiceStatus.PARTIALLY_PAID;
    }
    
    return baseCrud.update(invoiceId, {
      amount_paid: newPaid,
      status,
    } as Partial<SupplierInvoice>);
  }, [baseCrud]);

  return {
    ...baseCrud,
    recordPayment,
  };
}

// ===== STUDENT OPENING BALANCE CRUD =====
export function useStudentOpeningBalanceCrud() {
  return useCrudFactory<StudentOpeningBalance>({
    collectionName: COLLECTIONS.studentOpeningBalances,
    entityName: 'Student Opening Balance',
  });
}

// ===== FEE ADJUSTMENT CRUD =====
export function useFeeAdjustmentCrud() {
  return useCrudFactory<FeeAdjustment>({
    collectionName: COLLECTIONS.feeAdjustments,
    entityName: 'Fee Adjustment',
  });
}

// ===== TRANSPORT ROUTE CRUD =====
export function useTransportRouteCrud() {
  return useCrudFactory<TransportRoute>({
    collectionName: COLLECTIONS.transportRoutes,
    entityName: 'Transport Route',
  });
}

// ===== STUDENT TRANSPORT ASSIGNMENT CRUD =====
export function useStudentTransportAssignmentCrud() {
  return useCrudFactory<StudentTransportAssignment>({
    collectionName: COLLECTIONS.studentTransportAssignments,
    entityName: 'Student Transport Assignment',
  });
}

// ===== STUDENT INVOICE CRUD =====
export function useStudentInvoiceCrud() {
  const toast = useToast();
  const baseCrud = useCrudFactory<StudentInvoice>({
    collectionName: COLLECTIONS.studentInvoices,
    entityName: 'Student Invoice',
  });

  const createWithItems = useCallback(async (
    invoiceData: Omit<StudentInvoice, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: Array<Omit<StudentInvoiceItem, 'id' | 'invoice_id'>>
  ): Promise<StudentInvoice> => {
    try {
      const db = await databaseService.getDatabase();
      
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      const invoice = await baseCrud.create({
        ...invoiceData,
        total_amount_billed: totalAmount,
        amount_paid: 0,
        status: InvoiceStatus.DRAFT,
      } as Omit<StudentInvoice, 'id' | 'created_at' | 'updated_at'>);
      
      const itemPromises = items.map(async (itemData) => {
        const itemCollection = (db as any)[COLLECTIONS.studentInvoiceItems];
        if (itemCollection?.insert) {
          return itemCollection.insert({
            ...itemData,
            id: crypto.randomUUID(),
            invoice_id: invoice.id,
          });
        }
      });
      
      await Promise.all(itemPromises);
      
      toast.showSuccess('Student invoice created successfully');
      return invoice;
    } catch (error) {
      toast.showError(`Failed to create invoice: ${error}`);
      throw error;
    }
  }, [baseCrud, toast]);

  const postInvoice = useCallback(async (invoiceId: string): Promise<StudentInvoice> => {
    return baseCrud.update(invoiceId, {
      status: InvoiceStatus.DUE,
    } as Partial<StudentInvoice>);
  }, [baseCrud]);

  return {
    ...baseCrud,
    createWithItems,
    postInvoice,
  };
}

// ===== STUDENT PAYMENT CRUD =====
export function useStudentPaymentCrud() {
  const toast = useToast();
  const baseCrud = useCrudFactory<StudentPayment>({
    collectionName: COLLECTIONS.studentPayments,
    entityName: 'Student Payment',
  });

  const allocateToInvoice = useCallback(async (
    paymentId: string,
    invoiceItemId: string,
    amount: number
  ): Promise<void> => {
    try {
      const db = await databaseService.getDatabase();
      const allocationCollection = (db as any)[COLLECTIONS.invoicePaymentApplications];
      
      if (allocationCollection?.insert) {
        await allocationCollection.insert({
          id: crypto.randomUUID(),
          payment_id: paymentId,
          invoice_item_id: invoiceItemId,
          amount_applied: amount,
        });
      }
      
      toast.showSuccess('Payment allocated to invoice');
    } catch (error) {
      toast.showError(`Failed to allocate payment: ${error}`);
      throw error;
    }
  }, [toast]);

  return {
    ...baseCrud,
    allocateToInvoice,
  };
}

// ===== GENERAL PAYMENT CRUD =====
export function useGeneralPaymentCrud() {
  const toast = useToast();
  const baseCrud = useCrudFactory<GeneralPayment>({
    collectionName: COLLECTIONS.generalPayments,
    entityName: 'General Payment',
  });

  const createWithItems = useCallback(async (
    paymentData: Omit<GeneralPayment, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: Array<Omit<GeneralPaymentItem, 'id' | 'general_payment_id'>>
  ): Promise<GeneralPayment> => {
    try {
      const db = await databaseService.getDatabase();
      
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      const payment = await baseCrud.create({
        ...paymentData,
        total_amount_paid: totalAmount,
      } as Omit<GeneralPayment, 'id' | 'created_at' | 'updated_at'>);
      
      const itemPromises = items.map(async (itemData) => {
        const itemCollection = (db as any)[COLLECTIONS.generalPaymentItems];
        if (itemCollection?.insert) {
          return itemCollection.insert({
            ...itemData,
            id: crypto.randomUUID(),
            general_payment_id: payment.id,
          });
        }
      });
      
      await Promise.all(itemPromises);
      
      toast.showSuccess('General payment recorded successfully');
      return payment;
    } catch (error) {
      toast.showError(`Failed to record payment: ${error}`);
      throw error;
    }
  }, [baseCrud, toast]);

  return {
    ...baseCrud,
    createWithItems,
  };
}

// ===== FINANCIAL YEAR CRUD =====
export function useFinancialYearCrud() {
  const baseCrud = useCrudFactory<FinancialYear>({
    collectionName: COLLECTIONS.financialYears,
    entityName: 'Financial Year',
  });

  const closeYear = useCallback(async (yearId: number): Promise<FinancialYear> => {
    return baseCrud.update(String(yearId), {
      status: 'Closed' as any,
    } as Partial<FinancialYear>);
  }, [baseCrud]);

  return {
    ...baseCrud,
    closeYear,
  };
}

// ===== GENERAL LEDGER ENTRY CRUD =====
export function useGeneralLedgerEntryCrud() {
  return useCrudFactory<GeneralLedgerEntry>({
    collectionName: COLLECTIONS.generalLedgerEntries,
    entityName: 'General Ledger Entry',
  });
}
