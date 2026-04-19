// ABOUTME: PaymentAllocationService - Business logic for payment allocation to invoices
// ABOUTME: Replaces sp_fin_applyPayment_Priority and sp_fin_applyPayment_Weighted stored procedures
// ABOUTME: Provides two strategies: priority (FIFO) and weighted (proportional)

import {
  type StudentPayment,
  type InvoicePaymentApplication,
  InvoiceStatus,
} from '../data/types';
import {
  InvoiceStatusService,
  type InvoiceStatusServiceDependencies,
} from './InvoiceStatusService';

/**
 * Allocation strategy type
 */
export enum PaymentAllocationType {
  /** Priority/FIFO: Allocate payment to oldest invoices first */
  PRIORITY = 'priority',
  /** Weighted/Proportional: Split payment across all outstanding items proportionally */
  WEIGHTED = 'weighted',
}

/**
 * Result of a payment allocation operation
 */
export interface PaymentAllocationResult {
  /** The payment ID that was processed */
  paymentId: string;
  /** The allocation strategy used */
  strategy: PaymentAllocationType;
  /** IDs of the payment applications created */
  applicationIds: string[];
  /** Total amount allocated */
  totalAllocated: number;
  /** Remaining unallocated payment (if any) */
  remainingAmount: number;
  /** Invoice IDs whose statuses were updated */
  updatedInvoiceIds: string[];
  /** Errors encountered during allocation */
  errors: PaymentAllocationError[];
}

/**
 * Error detail for an allocation failure
 */
export interface PaymentAllocationError {
  invoiceItemId?: string;
  reason: string;
}

/**
 * An outstanding invoice item with its balance
 * (mirrors the vw_fin_student_votehead_statement view data)
 */
export interface OutstandingInvoiceItem {
  invoiceItemId: string;
  invoiceId: string;
  itemBalance: number;
  /** For priority sorting: order by invoice then item */
  sortOrder: number;
}

/**
 * Dependencies required by PaymentAllocationService
 * Injected via constructor to decouple from specific data access implementations
 */
export interface PaymentAllocationServiceDependencies {
  /** Find a student payment by ID */
  findStudentPayment: (paymentId: string) => Promise<StudentPayment | null>;
  /** Find all outstanding invoice items for a student (items with positive balance) */
  findOutstandingInvoiceItems: (studentId: string) => Promise<OutstandingInvoiceItem[]>;
  /** Insert a payment application record */
  insertPaymentApplication: (app: Omit<InvoicePaymentApplication, 'id'> & { id?: string }) => Promise<InvoicePaymentApplication | null>;
  /** Generate a unique ID for new records */
  generateId: () => string;
  /** Invoice status service dependencies (for updating invoice statuses after allocation) */
  invoiceStatusDeps: InvoiceStatusServiceDependencies;
}

// Re-export for convenience
export type { InvoiceStatusUpdateResult } from './InvoiceStatusService';

/**
 * PaymentAllocationService
 *
 * Replaces two MySQL/PgSQL stored procedures:
 * - `sp_fin_applyPayment_Priority` — FIFO allocation (oldest first)
 * - `sp_fin_applyPayment_Weighted` — Proportional allocation across all debts
 *
 * After creating payment applications, it automatically calls
 * InvoiceStatusService to recalculate the status of all affected invoices.
 *
 * Usage:
 *   const service = new PaymentAllocationService(deps);
 *   const result = await service.applyPriority('pay-123');
 *   const result = await service.applyWeighted('pay-123');
 *
 * Or via React hook:
 *   const { applyPriority, applyWeighted } = usePaymentAllocation();
 */
export class PaymentAllocationService {
  private deps: PaymentAllocationServiceDependencies;
  private invoiceStatusService: InvoiceStatusService;

  constructor(deps: PaymentAllocationServiceDependencies) {
    this.deps = deps;
    this.invoiceStatusService = new InvoiceStatusService(deps.invoiceStatusDeps);
  }

  /**
   * Apply a payment using the priority (FIFO) strategy.
   *
   * Allocates payment to invoice items starting from the oldest,
   * filling each item's balance before moving to the next.
   * Any remaining amount after all items are paid is left unallocated.
   *
   * Equivalent to: sp_fin_applyPayment_Priority
   */
  async applyPriority(paymentId: string): Promise<PaymentAllocationResult> {
    const result: PaymentAllocationResult = {
      paymentId,
      strategy: PaymentAllocationType.PRIORITY,
      applicationIds: [],
      totalAllocated: 0,
      remainingAmount: 0,
      updatedInvoiceIds: [],
      errors: [],
    };

    // Get payment details
    const payment = await this.deps.findStudentPayment(paymentId);
    if (!payment) {
      result.errors.push({ reason: `Payment not found: ${paymentId}` });
      return result;
    }

    if (payment.total_amount_paid <= 0) {
      result.errors.push({ reason: 'Payment amount must be greater than zero' });
      return result;
    }

    let remainingPayment = Math.round(payment.total_amount_paid * 100) / 100;

    // Get outstanding invoice items ordered by invoice (oldest first), then item
    const outstandingItems = await this.deps.findOutstandingInvoiceItems(payment.student_id);

    if (outstandingItems.length === 0) {
      // No outstanding items — payment stays unallocated
      result.remainingAmount = remainingPayment;
      return result;
    }

    // Track which invoices are affected for status updates
    const affectedInvoiceIds = new Set<string>();

    // Priority allocation: fill each item's balance before moving to next
    for (const item of outstandingItems) {
      if (remainingPayment <= 0) break;

      const itemBalance = Math.round(item.itemBalance * 100) / 100;
      const amountToApply = Math.min(remainingPayment, itemBalance);

      if (amountToApply <= 0) continue;

      try {
        const app = await this.deps.insertPaymentApplication({
          payment_id: paymentId,
          invoice_item_id: item.invoiceItemId,
          amount_applied: amountToApply,
        });

        if (app) {
          result.applicationIds.push(app.id);
        } else {
          // Insert succeeded but returned null — use generated ID
          result.applicationIds.push(this.deps.generateId());
        }

        result.totalAllocated = Math.round((result.totalAllocated + amountToApply) * 100) / 100;
        remainingPayment = Math.round((remainingPayment - amountToApply) * 100) / 100;
        affectedInvoiceIds.add(item.invoiceId);
      } catch (error) {
        result.errors.push({
          invoiceItemId: item.invoiceItemId,
          reason: error instanceof Error ? error.message : 'Failed to create payment application',
        });
      }
    }

    result.remainingAmount = remainingPayment;

    // Update invoice statuses for all affected invoices
    const invoiceIdArray = Array.from(affectedInvoiceIds);
    const statusResults = await this.invoiceStatusService.updateInvoiceStatuses(invoiceIdArray);
    result.updatedInvoiceIds = statusResults.map(r => r.invoiceId);

    return result;
  }

  /**
   * Apply a payment using the weighted (proportional) strategy.
   *
   * Distributes the payment proportionally across all outstanding
   * invoice items based on their share of total outstanding debt.
   *
   * Equivalent to: sp_fin_applyPayment_Weighted
   *
   * Formula: amount_per_item = (item_balance / total_debt) * payment_amount
   */
  async applyWeighted(paymentId: string): Promise<PaymentAllocationResult> {
    const result: PaymentAllocationResult = {
      paymentId,
      strategy: PaymentAllocationType.WEIGHTED,
      applicationIds: [],
      totalAllocated: 0,
      remainingAmount: 0,
      updatedInvoiceIds: [],
      errors: [],
    };

    // Get payment details
    const payment = await this.deps.findStudentPayment(paymentId);
    if (!payment) {
      result.errors.push({ reason: `Payment not found: ${paymentId}` });
      return result;
    }

    if (payment.total_amount_paid <= 0) {
      result.errors.push({ reason: 'Payment amount must be greater than zero' });
      return result;
    }

    const paymentAmount = Math.round(payment.total_amount_paid * 100) / 100;

    // Get all outstanding items for this student
    const outstandingItems = await this.deps.findOutstandingInvoiceItems(payment.student_id);

    if (outstandingItems.length === 0) {
      result.remainingAmount = paymentAmount;
      return result;
    }

    // Calculate total debt
    const totalDebt = Math.round(
      outstandingItems.reduce((sum, item) => sum + item.itemBalance, 0) * 100
    ) / 100;

    if (totalDebt <= 0) {
      result.remainingAmount = paymentAmount;
      return result;
    }

    // Track affected invoices
    const affectedInvoiceIds = new Set<string>();

    // Weighted allocation: distribute proportionally
    let totalAllocated = 0;

    for (let i = 0; i < outstandingItems.length; i++) {
      const item = outstandingItems[i];
      const itemBalance = Math.round(item.itemBalance * 100) / 100;

      if (itemBalance <= 0) continue;

      // Proportional allocation: (item_balance / total_debt) * payment_amount
      let amountToApply = Math.round((itemBalance / totalDebt) * paymentAmount * 100) / 100;

      // For the last item, allocate any remaining amount due to rounding
      if (i === outstandingItems.length - 1) {
        amountToApply = Math.round((paymentAmount - totalAllocated) * 100) / 100;
      }

      // Ensure we don't allocate more than the item's balance
      amountToApply = Math.min(amountToApply, itemBalance);
      amountToApply = Math.max(amountToApply, 0); // Never negative

      if (amountToApply <= 0) continue;

      try {
        const app = await this.deps.insertPaymentApplication({
          payment_id: paymentId,
          invoice_item_id: item.invoiceItemId,
          amount_applied: amountToApply,
        });

        if (app) {
          result.applicationIds.push(app.id);
        } else {
          result.applicationIds.push(this.deps.generateId());
        }

        totalAllocated = Math.round((totalAllocated + amountToApply) * 100) / 100;
        affectedInvoiceIds.add(item.invoiceId);
      } catch (error) {
        result.errors.push({
          invoiceItemId: item.invoiceItemId,
          reason: error instanceof Error ? error.message : 'Failed to create payment application',
        });
      }
    }

    result.totalAllocated = totalAllocated;
    result.remainingAmount = Math.round((paymentAmount - totalAllocated) * 100) / 100;

    // Update invoice statuses for all affected invoices
    const invoiceIdArray = Array.from(affectedInvoiceIds);
    const statusResults = await this.invoiceStatusService.updateInvoiceStatuses(invoiceIdArray);
    result.updatedInvoiceIds = statusResults.map(r => r.invoiceId);

    return result;
  }

  /**
   * Apply a payment using the specified strategy
   */
  async applyPayment(paymentId: string, strategy: PaymentAllocationType): Promise<PaymentAllocationResult> {
    switch (strategy) {
      case PaymentAllocationType.PRIORITY:
        return this.applyPriority(paymentId);
      case PaymentAllocationType.WEIGHTED:
        return this.applyWeighted(paymentId);
      default:
        throw new Error(`Unknown payment allocation strategy: ${strategy}`);
    }
  }
}