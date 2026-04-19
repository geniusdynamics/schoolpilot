// ABOUTME: InvoiceGenerationService - Business logic for termly invoice generation
// ABOUTME: Replaces sp_fin_generateTermlyInvoices stored procedure from the Akademico database
// ABOUTME: Generates invoices for all active students based on fee templates for a school period

import {
  InvoiceStatus,
  OpeningBalanceType,
  type StudentInvoice,
  type StudentInvoiceItem,
  type StudentOpeningBalance,
  type FeeTemplate,
  type FeeTemplateItem,
} from '../data/types';

/**
 * Result of the termly invoice generation process
 */
export interface InvoiceGenerationResult {
  /** Number of invoices successfully generated */
  generatedCount: number;
  /** Number of students skipped (no fee template, already invoiced, etc.) */
  skippedCount: number;
  /** IDs of newly created invoices */
  generatedInvoiceIds: string[];
  /** Detailed errors for students that could not be processed */
  errors: InvoiceGenerationError[];
}

/**
 * Error detail for a student that could not be processed
 */
export interface InvoiceGenerationError {
  studentId: string;
  reason: string;
  detail?: string;
}

/**
 * Dependencies required by InvoiceGenerationService
 * Injected via constructor to decouple from specific data access implementations
 */
export interface InvoiceGenerationServiceDependencies {
  /** Find all active students for a period (students not already invoiced) */
  findActiveStudents: () => Promise<ActiveStudentRecord[]>;
  /** Find students that already have an invoice for the given school period */
  findStudentIdsWithExistingInvoices: (schoolPeriodId: number) => Promise<string[]>;
  /** Find a fee template matching the school period and student category */
  findFeeTemplate: (schoolPeriodId: number, studentCategoryId: number | null) => Promise<FeeTemplate | null>;
  /** Find all fee template items for a given fee template */
  findFeeTemplateItems: (feeTemplateId: number) => Promise<FeeTemplateItem[]>;
  /** Find unbilled opening balance for a student (where is_billed = false) */
  findUnbilledOpeningBalance: (studentId: string) => Promise<StudentOpeningBalance | null>;
  /** Generate a unique ID for new records */
  generateId: () => string;
  /** Insert a new student invoice */
  insertStudentInvoice: (invoice: Omit<StudentInvoice, 'id'> & { id?: string }) => Promise<StudentInvoice | null>;
  /** Insert a new student invoice item */
  insertStudentInvoiceItem: (item: Omit<StudentInvoiceItem, 'id'> & { id?: string }) => Promise<StudentInvoiceItem | null>;
  /** Update an opening balance to mark it as billed */
  markOpeningBalanceAsBilled: (balanceId: string) => Promise<void>;
}

/** Minimal shape of an active student record needed for invoice generation */
export interface ActiveStudentRecord {
  id: string;
  student_category_id: number | null;
  first_name: string;
  last_name: string;
  student_type?: string | null;
  deleted_at?: string | null;
}

/**
 * InvoiceGenerationService
 *
 * Replaces the MySQL stored procedure `sp_fin_generateTermlyInvoices`.
 * Iterates over all active students who don't already have an invoice
 * for the given school period, matches each student's category to a
 * fee template, and generates the invoice with line items.
 *
 * Handles opening balances (brought forward) by:
 * - Adding debit balances as positive amounts
 * - Subtracting credit balances from the total
 * - Marking opening balances as billed after inclusion
 *
 * Usage:
 *   const service = new InvoiceGenerationService(deps);
 *   const result = await service.generateTermlyInvoices(3);
 *
 * Or via React hook:
 *   const { generateTermlyInvoices, isGenerating } = useInvoiceGeneration();
 */
export class InvoiceGenerationService {
  private deps: InvoiceGenerationServiceDependencies;

  constructor(deps: InvoiceGenerationServiceDependencies) {
    this.deps = deps;
  }

  /**
   * Generate termly invoices for all eligible active students
   * for the given school period.
   *
   * Process:
   * 1. Find all active students
   * 2. Exclude students who already have an invoice for this period
   * 3. For each eligible student:
   *    a. Match student category to a fee template
   *    b. Sum fee template items for total bill
   *    c. Handle opening balance (debit adds, credit subtracts)
   *    d. Create invoice record
   *    e. Create "Balance Brought Forward" item if applicable
   *    f. Create invoice items from fee template items
   *    g. Mark opening balance as billed
   *
   * @param schoolPeriodId The school period ID to generate invoices for
   * @returns Summary of generation results
   */
  async generateTermlyInvoices(schoolPeriodId: number): Promise<InvoiceGenerationResult> {
    const result: InvoiceGenerationResult = {
      generatedCount: 0,
      skippedCount: 0,
      generatedInvoiceIds: [],
      errors: [],
    };

    // Step 1: Get all active students
    const allActiveStudents = await this.deps.findActiveStudents();

    // Filter out soft-deleted students
    const activeStudents = allActiveStudents.filter(s => !s.deleted_at);

    // Step 2: Find students who already have invoices for this period
    const existingInvoiceStudentIds = await this.deps.findStudentIdsWithExistingInvoices(schoolPeriodId);
    const existingSet = new Set(existingInvoiceStudentIds);

    // Step 3: Process each eligible student
    for (const student of activeStudents) {
      // Skip students who already have an invoice for this period
      if (existingSet.has(student.id)) {
        result.skippedCount++;
        continue;
      }

      try {
        const invoiceId = await this.processStudent(schoolPeriodId, student);
        if (invoiceId) {
          result.generatedCount++;
          result.generatedInvoiceIds.push(invoiceId);
        } else {
          // No fee template found for this student's category
          result.skippedCount++;
        }
      } catch (error) {
        result.errors.push({
          studentId: student.id,
          reason: error instanceof Error ? error.message : 'Unknown error generating invoice',
          detail: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    return result;
  }

  /**
   * Process a single student: match to fee template, calculate invoice, handle opening balance
   * @returns The invoice ID if created, or null if skipped (no fee template)
   */
  private async processStudent(
    schoolPeriodId: number,
    student: ActiveStudentRecord
  ): Promise<string | null> {
    // Find fee template for this student's category and period
    const feeTemplate = await this.deps.findFeeTemplate(
      schoolPeriodId,
      student.student_category_id
    );

    if (!feeTemplate) {
      // No fee template for this category — skip
      return null;
    }

    // Get all fee template items
    const feeTemplateItems = await this.deps.findFeeTemplateItems(feeTemplate.id);

    // Calculate total bill from fee template items
    let totalBill = feeTemplateItems.reduce((sum, item) => sum + item.amount, 0);

    // Handle opening balance (balance brought forward)
    const openingBalance = await this.deps.findUnbilledOpeningBalance(student.id);
    let openingBalanceAmount = 0;

    if (openingBalance) {
      if (openingBalance.balance_type === OpeningBalanceType.DEBIT) {
        // Debit increases the amount owed
        openingBalanceAmount = openingBalance.amount;
        totalBill += openingBalanceAmount;
      } else if (openingBalance.balance_type === OpeningBalanceType.CREDIT) {
        // Credit reduces the amount owed
        openingBalanceAmount = -openingBalance.amount;
        totalBill += openingBalanceAmount;
      }
    }

    // Round total to avoid floating point issues
    totalBill = Math.round(totalBill * 100) / 100;

    // Generate invoice number
    const invoiceNumber = `INV-${schoolPeriodId}-${student.id}`;

    // Determine dates
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dueDate = this.calculateDueDate(30); // 30 days from today

    // Generate invoice ID
    const invoiceId = this.deps.generateId();

    // Create the invoice record
    const invoiceData: Omit<StudentInvoice, 'id'> & { id: string } = {
      id: invoiceId,
      student_id: student.id,
      invoice_number: invoiceNumber,
      school_period_id: schoolPeriodId,
      issue_date: now,
      due_date: dueDate,
      total_amount_billed: totalBill,
      amount_paid: 0,
      status: InvoiceStatus.DUE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      student_name: `${student.first_name} ${student.last_name}`,
      school_period_name: undefined,
      items: [],
    };

    await this.deps.insertStudentInvoice(invoiceData);

    // Create "Balance Brought Forward" item if there's an opening balance
    if (openingBalance && openingBalanceAmount !== 0) {
      const balanceItemId = this.deps.generateId();
      const balanceItem: Omit<StudentInvoiceItem, 'id'> & { id: string } = {
        id: balanceItemId,
        invoice_id: invoiceId,
        description: openingBalanceAmount > 0
          ? 'Balance Brought Forward (Debit)'
          : 'Balance Brought Forward (Credit)',
        amount: Math.abs(openingBalanceAmount),
        fee_template_item_id: undefined,
        student_transport_assignment_id: undefined,
        fine_id: undefined,
      };
      await this.deps.insertStudentInvoiceItem(balanceItem);

      // Mark the opening balance as billed
      await this.deps.markOpeningBalanceAsBilled(openingBalance.id);
    }

    // Create invoice items from fee template items
    for (const templateItem of feeTemplateItems) {
      const itemId = this.deps.generateId();
      const invoiceItem: Omit<StudentInvoiceItem, 'id'> & { id: string } = {
        id: itemId,
        invoice_id: invoiceId,
        description: templateItem.description,
        amount: templateItem.amount,
        fee_template_item_id: templateItem.id,
        student_transport_assignment_id: undefined,
        fine_id: undefined,
      };
      await this.deps.insertStudentInvoiceItem(invoiceItem);
    }

    return invoiceId;
  }

  /**
   * Calculate due date as ISO date string (today + daysOffset business days)
   * Currently uses calendar days for simplicity; could be enhanced to skip weekends/holidays
   */
  private calculateDueDate(daysOffset: number): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysOffset);
    return dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}