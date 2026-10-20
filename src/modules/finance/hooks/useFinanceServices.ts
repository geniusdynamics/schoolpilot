// ABOUTME: React hook wrappers for finance P0 services
// ABOUTME: Provides useInvoiceStatus, useInvoiceGeneration, usePaymentAllocation, useTermBilling
// ABOUTME: These hooks wire service classes to database access via useDatabaseCollection

import { useCallback, useState } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { databaseService } from '@/services/database/databaseService';
import {
  InvoiceStatusService,
  type InvoiceStatusUpdateResult,
  type InvoiceFinancialSummary,
  type InvoiceStatusServiceDependencies,
} from '../services/InvoiceStatusService';
import { InvoiceGenerationService, type InvoiceGenerationResult, type InvoiceGenerationServiceDependencies } from '../services/InvoiceGenerationService';
import {
  PaymentAllocationService,
  PaymentAllocationType,
  type PaymentAllocationResult,
  type PaymentAllocationServiceDependencies,
} from '../services/PaymentAllocationService';
import {
  generateTermInvoices as runTermBilling,
  type BillingClassStream,
  type BillingInvoice,
  type BillingRepository,
  type BillingStudent,
  type BillingTemplate,
  type GenerateTermInvoicesParams,
  type GenerateTermInvoicesResult,
} from '@/domain/finance/billingService';
import type {
  StudentInvoice,
  StudentInvoiceItem,
  InvoicePaymentApplication,
  StudentOpeningBalance,
  FeeTemplate,
  InvoiceStatus,
  StudentPayment,
} from '../data/types';

// ── useInvoiceStatus ────────────────────────────────────────────────────────

/**
 * Hook that provides InvoiceStatusService methods connected to the database.
 *
 * Usage:
 *   const { updateInvoiceStatus, getInvoiceSummary, isUpdating } = useInvoiceStatus();
 *   await updateInvoiceStatus('inv-123');
 */
export function useInvoiceStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const studentInvoicesCollection = useDatabaseCollection<StudentInvoice>('student_invoices');
  const studentInvoiceItemsCollection = useDatabaseCollection<StudentInvoiceItem>('student_invoice_items');
  const invoicePaymentApplicationsCollection = useDatabaseCollection<InvoicePaymentApplication>('invoice_payment_applications');
  // Pulled out so hook dependency lists name the functions, not the collection objects.
  const updateStudentInvoiceRecord = studentInvoicesCollection.update;

  const createService = useCallback((): InvoiceStatusService => {
    const deps: InvoiceStatusServiceDependencies = {
      findStudentInvoice: async (invoiceId: string) => {
        const invoices = studentInvoicesCollection.data;
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return null;
        return {
          id: invoice.id,
          student_id: invoice.student_id,
          invoice_number: invoice.invoice_number,
          total_amount_billed: invoice.total_amount_billed,
          amount_paid: invoice.amount_paid,
          status: invoice.status,
          due_date: invoice.due_date,
          deleted_at: invoice.deleted_at,
        };
      },
      findInvoiceItemsByInvoiceId: async (invoiceId: string) => {
        const items = studentInvoiceItemsCollection.data;
        return items.filter(item => item.invoice_id === invoiceId);
      },
      findPaymentApplicationsByInvoiceItemIds: async (invoiceItemIds: string[]) => {
        const apps = invoicePaymentApplicationsCollection.data;
        return apps.filter(app => invoiceItemIds.includes(app.invoice_item_id));
      },
      updateStudentInvoice: async (invoiceId: string, updates: { amount_paid: number; status: InvoiceStatus }) => {
        await updateStudentInvoiceRecord(invoiceId, {
          amount_paid: updates.amount_paid,
          status: updates.status,
        });
      },
    };
    return new InvoiceStatusService(deps);
  }, [studentInvoicesCollection.data, studentInvoiceItemsCollection.data, invoicePaymentApplicationsCollection.data, updateStudentInvoiceRecord]);

  const updateInvoiceStatus = useCallback(async (invoiceId: string): Promise<InvoiceStatusUpdateResult | null> => {
    setIsUpdating(true);
    setError(null);
    try {
      const service = createService();
      return await service.updateInvoiceStatus(invoiceId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [createService]);

  const updateInvoiceStatuses = useCallback(async (invoiceIds: string[]): Promise<InvoiceStatusUpdateResult[]> => {
    setIsUpdating(true);
    setError(null);
    try {
      const service = createService();
      return await service.updateInvoiceStatuses(invoiceIds);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return [];
    } finally {
      setIsUpdating(false);
    }
  }, [createService]);

  const getInvoiceSummary = useCallback(async (invoiceId: string): Promise<InvoiceFinancialSummary | null> => {
    try {
      const service = createService();
      return await service.getInvoiceSummary(invoiceId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    }
  }, [createService]);

  return {
    updateInvoiceStatus,
    updateInvoiceStatuses,
    getInvoiceSummary,
    isUpdating,
    error,
  };
}

// ── useInvoiceGeneration ────────────────────────────────────────────────────

/**
 * Hook that provides InvoiceGenerationService methods connected to the database.
 *
 * Usage:
 *   const { generateTermlyInvoices, isGenerating } = useInvoiceGeneration();
 *   const result = await generateTermlyInvoices(3);
 */
export function useInvoiceGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const studentInvoicesCollection = useDatabaseCollection<StudentInvoice>('student_invoices');
  const studentInvoiceItemsCollection = useDatabaseCollection<StudentInvoiceItem>('student_invoice_items');
  const feeTemplatesCollection = useDatabaseCollection<FeeTemplate>('fee_templates');
  const studentOpeningBalancesCollection = useDatabaseCollection<StudentOpeningBalance>('student_opening_balances');
  // Pulled out so hook dependency lists name the functions, not the collection objects.
  const insertStudentInvoiceRecord = studentInvoicesCollection.insert;
  const insertStudentInvoiceItemRecord = studentInvoiceItemsCollection.insert;
  const updateOpeningBalanceRecord = studentOpeningBalancesCollection.update;

  // We also need access to active students - imported from admin module
  const createService = useCallback((): InvoiceGenerationService => {
    const deps: InvoiceGenerationServiceDependencies = {
      findActiveStudents: async () => {
        // Import dynamically to avoid circular deps; this will be called at runtime

        // Note: In practice, this should be called from a component context
        // For now, we'll use the database service directly
        const db = await databaseService.getDatabase();
        const studentsColl = db.getCollection('students');
        if (studentsColl && typeof studentsColl.find === 'function') {
          const students = await studentsColl.find({});
          return students
            .filter((s: any) => s.status === 'Active' && !s.deleted_at)
            .map((s: any) => ({
              id: s.id,
              student_category_id: s.student_category_id ?? null,
              first_name: s.first_name,
              last_name: s.last_name,
              student_type: s.student_type ?? null,
              deleted_at: s.deleted_at ?? null,
            }));
        }
        return [];
      },
      findStudentIdsWithExistingInvoices: async (schoolPeriodId: number) => {
        const invoices = studentInvoicesCollection.data;
        return invoices
          .filter(inv => inv.school_period_id === schoolPeriodId && !inv.deleted_at)
          .map(inv => inv.student_id);
      },
      findFeeTemplate: async (schoolPeriodId: number, studentCategoryId: number | null) => {
        const templates = feeTemplatesCollection.data;
        return templates.find(t =>
          t.school_period_id === schoolPeriodId &&
          t.student_category_id === studentCategoryId
        ) ?? null;
      },
      findFeeTemplateItems: async (feeTemplateId: number) => {
        // Template items are stored nested in fee_templates.items.
        const template = feeTemplatesCollection.data.find(t => String(t.id) === String(feeTemplateId));
        return (template?.items ?? []).map(item => ({ ...item, fee_template_id: feeTemplateId }));
      },
      findUnbilledOpeningBalance: async (studentId: string) => {
        const balances = studentOpeningBalancesCollection.data;
        return balances.find(b => b.student_id === studentId && !b.is_billed) ?? null;
      },
      generateId: () => databaseService.generateId(),
      insertStudentInvoice: async (invoice) => {
        return await insertStudentInvoiceRecord(invoice as any);
      },
      insertStudentInvoiceItem: async (item) => {
        return await insertStudentInvoiceItemRecord(item as any);
      },
      markOpeningBalanceAsBilled: async (balanceId: string) => {
        await updateOpeningBalanceRecord(balanceId, { is_billed: true });
      },
    };
    return new InvoiceGenerationService(deps);
  }, [
    studentInvoicesCollection.data,
    feeTemplatesCollection.data,
    studentOpeningBalancesCollection.data,
    insertStudentInvoiceRecord, insertStudentInvoiceItemRecord,
    updateOpeningBalanceRecord,
  ]);

  const generateTermlyInvoices = useCallback(async (schoolPeriodId: number): Promise<InvoiceGenerationResult | null> => {
    setIsGenerating(true);
    setError(null);
    try {
      const service = createService();
      return await service.generateTermlyInvoices(schoolPeriodId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [createService]);

  return {
    generateTermlyInvoices,
    isGenerating,
    error,
  };
}

// ── useTermBilling ──────────────────────────────────────────────────────────

/** Reads every row of a collection; a missing collection is an error, never an empty list to bill from. */
async function readCollection<T>(collectionName: string): Promise<T[]> {
  const db = await databaseService.getDatabase();
  const collection = db.getCollection(collectionName);
  if (!collection || typeof collection.find !== 'function') {
    throw new Error(`Term billing cannot run: the "${collectionName}" collection is not available in the database`);
  }
  return ((await collection.find({})) ?? []) as T[];
}

/**
 * The database-backed repository for the term billing service. Shared by useTermBilling and the
 * finance data provider so there is one billing path.
 */
export function createBillingRepository(writes: {
  insertStudentInvoice: (invoice: BillingInvoice) => Promise<unknown>;
  updateStudentInvoice: (id: string, patch: Partial<BillingInvoice>) => Promise<unknown>;
}): BillingRepository {
  return {
    listStudents: () => readCollection<BillingStudent>('students'),
    listClassStreams: () => readCollection<BillingClassStream>('class_streams'),
    listFeeTemplates: () => readCollection<BillingTemplate>('fee_templates'),
    listStudentInvoices: () => readCollection<BillingInvoice>('student_invoices'),
    insertStudentInvoice: writes.insertStudentInvoice,
    updateStudentInvoice: writes.updateStudentInvoice,
    generateId: () => databaseService.generateId(),
  };
}

/**
 * Hook over the term billing service (src/domain/finance/billingService.ts). Reads learners, streams,
 * templates and invoices fresh on every run so re-runs see the invoices a previous run created.
 *
 * Usage:
 *   const { generateTermInvoices, isRunning } = useTermBilling();
 *   const preview = await generateTermInvoices({ periodId, levelIds: [form1Id], dryRun: true });
 */
export function useTermBilling() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const studentInvoicesCollection = useDatabaseCollection<BillingInvoice>('student_invoices');
  const insertStudentInvoiceRecord = studentInvoicesCollection.insert;
  const updateStudentInvoiceRecord = studentInvoicesCollection.update;

  const generateTermInvoices = useCallback(async (params: GenerateTermInvoicesParams): Promise<GenerateTermInvoicesResult | null> => {
    setIsRunning(true);
    setError(null);
    try {
      const repository = createBillingRepository({
        insertStudentInvoice: (invoice) => insertStudentInvoiceRecord(invoice),
        updateStudentInvoice: (id, patch) => updateStudentInvoiceRecord(id, patch),
      });
      return await runTermBilling(repository, params);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [insertStudentInvoiceRecord, updateStudentInvoiceRecord]);

  return { generateTermInvoices, isRunning, error };
}

// ── usePaymentAllocation ────────────────────────────────────────────────────

/**
 * Hook that provides PaymentAllocationService methods connected to the database.
 *
 * Usage:
 *   const { applyPriority, applyWeighted, isAllocating } = usePaymentAllocation();
 *   const result = await applyPriority('pay-123');
 *   const result = await applyWeighted('pay-456');
 */
export function usePaymentAllocation() {
  const [isAllocating, setIsAllocating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const studentPaymentsCollection = useDatabaseCollection<StudentPayment>('student_payments');
  const studentInvoicesCollection = useDatabaseCollection<StudentInvoice>('student_invoices');
  const studentInvoiceItemsCollection = useDatabaseCollection<StudentInvoiceItem>('student_invoice_items');
  const invoicePaymentApplicationsCollection = useDatabaseCollection<InvoicePaymentApplication>('invoice_payment_applications');
  // Pulled out so hook dependency lists name the functions, not the collection objects.
  const updateStudentInvoiceRecord = studentInvoicesCollection.update;
  const insertPaymentApplicationRecord = invoicePaymentApplicationsCollection.insert;

  const createService = useCallback((): PaymentAllocationService => {
    const invoiceStatusDeps: InvoiceStatusServiceDependencies = {
      findStudentInvoice: async (invoiceId: string) => {
        const invoices = studentInvoicesCollection.data;
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return null;
        return {
          id: invoice.id,
          student_id: invoice.student_id,
          invoice_number: invoice.invoice_number,
          total_amount_billed: invoice.total_amount_billed,
          amount_paid: invoice.amount_paid,
          status: invoice.status,
          due_date: invoice.due_date,
          deleted_at: invoice.deleted_at,
        };
      },
      findInvoiceItemsByInvoiceId: async (invoiceId: string) => {
        const items = studentInvoiceItemsCollection.data;
        return items.filter(item => item.invoice_id === invoiceId);
      },
      findPaymentApplicationsByInvoiceItemIds: async (invoiceItemIds: string[]) => {
        const apps = invoicePaymentApplicationsCollection.data;
        return apps.filter(app => invoiceItemIds.includes(app.invoice_item_id));
      },
      updateStudentInvoice: async (invoiceId: string, updates: { amount_paid: number; status: InvoiceStatus }) => {
        await updateStudentInvoiceRecord(invoiceId, {
          amount_paid: updates.amount_paid,
          status: updates.status,
        });
      },
    };

    const deps: PaymentAllocationServiceDependencies = {
      findStudentPayment: async (paymentId: string) => {
        const payments = studentPaymentsCollection.data;
        return payments.find(p => p.id === paymentId) ?? null;
      },
      findOutstandingInvoiceItems: async (studentId: string) => {
        // Get all invoice items for this student's invoices
        const invoices = studentInvoicesCollection.data.filter(
          inv => inv.student_id === studentId && !inv.deleted_at
        );
        const invoiceIds = invoices.map(inv => inv.id);
        const allItems = studentInvoiceItemsCollection.data.filter(
          item => invoiceIds.includes(item.invoice_id)
        );
        const allItemIds = allItems.map(item => item.id);

        // Get all payment applications for these items
        const applications = invoicePaymentApplicationsCollection.data.filter(
          app => allItemIds.includes(app.invoice_item_id)
        );

        // Calculate balance for each item (amount - sum of applications)
        const itemBalances = allItems.map(item => {
          const itemApplications = applications.filter(app => app.invoice_item_id === item.id);
          const totalApplied = itemApplications.reduce((sum, app) => sum + app.amount_applied, 0);
          const balance = item.amount - totalApplied;
          return {
            invoiceItemId: item.id,
            invoiceId: item.invoice_id,
            itemBalance: Math.round(balance * 100) / 100,
          };
        });

        // Filter to only items with positive balance and sort by invoice, then item
        return itemBalances
          .filter(item => item.itemBalance > 0)
          .sort((a, b) => {
            // Sort by invoice ID first (for priority/FIFO ordering)
            const invoiceCompare = a.invoiceId.localeCompare(b.invoiceId);
            if (invoiceCompare !== 0) return invoiceCompare;
            // Then by item ID
            return a.invoiceItemId.localeCompare(b.invoiceItemId);
          })
          .map((item, index) => ({
            ...item,
            sortOrder: index,
          }));
      },
      insertPaymentApplication: async (app) => {
        return await insertPaymentApplicationRecord(app as any);
      },
      generateId: () => databaseService.generateId(),
      invoiceStatusDeps,
    };
    return new PaymentAllocationService(deps);
  }, [
    studentPaymentsCollection.data, studentInvoicesCollection.data,
    studentInvoiceItemsCollection.data, invoicePaymentApplicationsCollection.data,
    updateStudentInvoiceRecord, insertPaymentApplicationRecord,
  ]);

  const applyPriority = useCallback(async (paymentId: string): Promise<PaymentAllocationResult | null> => {
    setIsAllocating(true);
    setError(null);
    try {
      const service = createService();
      return await service.applyPriority(paymentId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setIsAllocating(false);
    }
  }, [createService]);

  const applyWeighted = useCallback(async (paymentId: string): Promise<PaymentAllocationResult | null> => {
    setIsAllocating(true);
    setError(null);
    try {
      const service = createService();
      return await service.applyWeighted(paymentId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setIsAllocating(false);
    }
  }, [createService]);

  return {
    applyPriority,
    applyWeighted,
    PaymentAllocationType,
    isAllocating,
    error,
  };
}