import { logger } from '@/utils/logging';

// ABOUTME: InvoiceStatusService - Business logic for invoice status calculation
// ABOUTME: Replaces trg_fin_updateInvoiceStatus trigger from the Akademico database
// ABOUTME: Automatically recalculates invoice status based on payment applications

import { InvoiceStatus } from '../data/types';

/**
 * Result of an invoice status update operation
 */
export interface InvoiceStatusUpdateResult {
  invoiceId: string;
  previousStatus: InvoiceStatus;
  newStatus: InvoiceStatus;
  totalBilled: number;
  totalPaid: number;
}

/**
 * Summary of invoice financial state
 */
export interface InvoiceFinancialSummary {
  invoiceId: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  status: InvoiceStatus;
  dueDate: string;
  isOverdue: boolean;
}

/**
 * Dependencies required by InvoiceStatusService
 * These are injected to decouple the service from specific data access implementations
 */
export interface InvoiceStatusServiceDependencies {
  /** Find a single student invoice by ID */
  findStudentInvoice: (invoiceId: string) => Promise<StudentInvoiceRecord | null>;
  /** Find all invoice items for a given invoice ID */
  findInvoiceItemsByInvoiceId: (invoiceId: string) => Promise<StudentInvoiceItemRecord[]>;
  /** Find all payment applications for given invoice item IDs */
  findPaymentApplicationsByInvoiceItemIds: (invoiceItemIds: string[]) => Promise<InvoicePaymentApplicationRecord[]>;
  /** Update a student invoice's amount_paid and status */
  updateStudentInvoice: (invoiceId: string, updates: { amount_paid: number; status: InvoiceStatus }) => Promise<void>;
}

/** Minimal shape of a StudentInvoice record as needed by this service */
export interface StudentInvoiceRecord {
  id: string;
  student_id: string;
  invoice_number: string;
  total_amount_billed: number;
  amount_paid: number;
  status: InvoiceStatus;
  due_date: string;
  deleted_at?: string | null;
}

/** Minimal shape of a StudentInvoiceItem record as needed by this service */
export interface StudentInvoiceItemRecord {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
}

/** Minimal shape of an InvoicePaymentApplication record as needed by this service */
export interface InvoicePaymentApplicationRecord {
  id: string;
  payment_id: string;
  invoice_item_id: string;
  amount_applied: number;
}

/**
 * InvoiceStatusService
 *
 * Replaces the MySQL/PgSQL trigger `trg_fin_updateInvoiceStatus`.
 * After any payment application is created, this service recalculates
 * the parent invoice's total paid amount and updates its status:
 * - 'Paid' if total_paid >= total_billed
 * - 'Partially Paid' if total_paid > 0
 * - 'Due' if total_paid === 0
 * - 'Overdue' if past due_date with unpaid balance
 *
 * Usage:
 *   const service = new InvoiceStatusService(deps);
 *   await service.updateInvoiceStatus('inv-123');
 *
 * Or via React hook:
 *   const { updateInvoiceStatus, getInvoiceSummary } = useInvoiceStatus();
 */
export class InvoiceStatusService {
  private deps: InvoiceStatusServiceDependencies;

  constructor(deps: InvoiceStatusServiceDependencies) {
    this.deps = deps;
  }

  /**
   * Recalculate and update the status of a single invoice.
   * Mirrors trg_fin_updateInvoiceStatus: after a payment application is
   * created, sum all application amounts for the invoice's items, then
   * set the invoice status accordingly.
   */
  async updateInvoiceStatus(invoiceId: string): Promise<InvoiceStatusUpdateResult> {
    const invoice = await this.deps.findStudentInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Soft-deleted invoices should not be updated
    if (invoice.deleted_at) {
      throw new Error(`Cannot update status of deleted invoice: ${invoiceId}`);
    }

    const previousStatus = invoice.status;

    // Get all invoice items for this invoice
    const invoiceItems = await this.deps.findInvoiceItemsByInvoiceId(invoiceId);
    const invoiceItemIds = invoiceItems.map(item => item.id);

    // Sum all payment applications for those invoice items
    let totalPaid = 0;
    if (invoiceItemIds.length > 0) {
      const applications = await this.deps.findPaymentApplicationsByInvoiceItemIds(invoiceItemIds);
      totalPaid = applications.reduce((sum, app) => sum + app.amount_applied, 0);
    }

    // Round to 2 decimal places to avoid floating point issues
    totalPaid = Math.round(totalPaid * 100) / 100;
    const totalBilled = Math.round(invoice.total_amount_billed * 100) / 100;

    // Determine new status based on payment vs billed
    let newStatus: InvoiceStatus;
    const balance = totalBilled - totalPaid;

    if (balance <= 0) {
      // Fully paid (or overpaid)
      newStatus = InvoiceStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    } else {
      // Nothing paid — check if overdue
      newStatus = this.determineUnpaidStatus(invoice.due_date);
    }

    // Update the invoice record
    await this.deps.updateStudentInvoice(invoiceId, {
      amount_paid: totalPaid,
      status: newStatus,
    });

    return {
      invoiceId,
      previousStatus,
      newStatus,
      totalBilled,
      totalPaid,
    };
  }

  /**
   * Batch update statuses for multiple invoices.
   * Useful after bulk payment application operations.
   */
  async updateInvoiceStatuses(invoiceIds: string[]): Promise<InvoiceStatusUpdateResult[]> {
    const results: InvoiceStatusUpdateResult[] = [];
    for (const invoiceId of invoiceIds) {
      try {
        const result = await this.updateInvoiceStatus(invoiceId);
        results.push(result);
      } catch (error) {
        // Log error but continue processing other invoices
        logger.error(`[InvoiceStatusService] Error updating invoice ${invoiceId}:`, error);
      }
    }
    return results;
  }

  /**
   * Get a financial summary for a single invoice.
   * Useful for display and reporting without triggering a status update.
   */
  async getInvoiceSummary(invoiceId: string): Promise<InvoiceFinancialSummary> {
    const invoice = await this.deps.findStudentInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const invoiceItems = await this.deps.findInvoiceItemsByInvoiceId(invoiceId);
    const invoiceItemIds = invoiceItems.map(item => item.id);

    let totalPaid = 0;
    if (invoiceItemIds.length > 0) {
      const applications = await this.deps.findPaymentApplicationsByInvoiceItemIds(invoiceItemIds);
      totalPaid = Math.round(
        applications.reduce((sum, app) => sum + app.amount_applied, 0) * 100
      ) / 100;
    }

    const totalBilled = Math.round(invoice.total_amount_billed * 100) / 100;
    const balance = Math.round((totalBilled - totalPaid) * 100) / 100;
    const isOverdue = this.isOverdue(invoice.due_date, balance);

    return {
      invoiceId,
      totalBilled,
      totalPaid,
      balance,
      status: invoice.status,
      dueDate: invoice.due_date,
      isOverdue,
    };
  }

  /**
   * Determine if an unpaid invoice should be marked as Overdue
   */
  private determineUnpaidStatus(dueDate: string): InvoiceStatus {
    if (this.isDatePast(dueDate)) {
      return InvoiceStatus.OVERDUE;
    }
    return InvoiceStatus.DUE;
  }

  /**
   * Check if an invoice is overdue (past due date with outstanding balance)
   */
  private isOverdue(dueDate: string, balance: number): boolean {
    return balance > 0 && this.isDatePast(dueDate);
  }

  /**
   * Check if a date string is in the past
   */
  private isDatePast(dateStr: string): boolean {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      // Reset time to compare dates only
      date.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      return date < now;
    } catch {
      return false;
    }
  }
}