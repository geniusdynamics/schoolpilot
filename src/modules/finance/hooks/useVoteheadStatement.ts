// ABOUTME: Computed view hook replacing vw_fin_student_votehead_statement
// ABOUTME: Provides per-invoice-item breakdown showing billed, paid, and balance per votehead
// ABOUTME: Mirrors the SQL view: joins students, invoices, invoice items, payment applications, and school periods

import { useMemo, useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

/**
 * A single row representing one votehead (invoice item) on a student's statement.
 * Mirrors the SQL view vw_fin_student_votehead_statement.
 */
export interface VoteheadStatementRow {
  /** Student ID */
  studentId: string;
  /** Admission number */
  admissionNo: string;
  /** Invoice ID */
  invoiceId: string;
  /** Invoice number (human-readable reference) */
  invoiceNumber: string;
  /** School period name (e.g., "Term 1 2025") */
  schoolPeriod: string | null;
  /** Invoice item ID (unique per row) */
  invoiceItemId: string;
  /** Votehead / line-item description */
  votehead: string;
  /** Amount billed for this votehead */
  amountBilled: number;
  /** Amount paid towards this votehead (sum of payment applications) */
  amountPaid: number;
  /** Outstanding balance for this votehead (amountBilled - amountPaid) */
  itemBalance: number;
}

/**
 * Computed view hook that replicates `vw_fin_student_votehead_statement`.
 *
 * Aggregates data from:
 * - students (for admission_no)
 * - student_invoices (non-voided)
 * - student_invoice_items (votehead breakdown)
 * - invoice_payment_applications (payment allocations per item)
 * - school_periods (period name via join)
 * - academic_period_definitions (via school_period's period_definition_id)
 *
 * Usage:
 * ```tsx
 * const { data: statementRows, loading, error, refresh } = useVoteheadStatement();
 * ```
 */
export function useVoteheadStatement() {
  const studentsCol = useDatabaseCollection<Record<string, any>>('students');
  const studentInvoicesCol = useDatabaseCollection<Record<string, any>>('student_invoices');
  const studentInvoiceItemsCol = useDatabaseCollection<Record<string, any>>('student_invoice_items');
  const invoicePaymentApplicationsCol = useDatabaseCollection<Record<string, any>>('invoice_payment_applications');
  const schoolPeriodsCol = useDatabaseCollection<Record<string, any>>('school_periods');
  const academicPeriodDefinitionsCol = useDatabaseCollection<Record<string, any>>('academic_period_definitions');

  const data = useMemo<VoteheadStatementRow[]>(() => {
    if (
      studentsCol.loading ||
      studentInvoicesCol.loading ||
      studentInvoiceItemsCol.loading ||
      invoicePaymentApplicationsCol.loading ||
      schoolPeriodsCol.loading ||
      academicPeriodDefinitionsCol.loading
    ) {
      return [];
    }

    const students = studentsCol.data;
    const invoices = studentInvoicesCol.data;
    const invoiceItems = studentInvoiceItemsCol.data;
    const paymentApplications = invoicePaymentApplicationsCol.data;
    const schoolPeriods = schoolPeriodsCol.data;
    const periodDefinitions = academicPeriodDefinitionsCol.data;

    // Build lookup maps for O(1) access
    const studentMap = new Map(students.map(s => [String(s.id), s]));
    const schoolPeriodMap = new Map(schoolPeriods.map(sp => [String(sp.id), sp]));
    const periodDefMap = new Map(periodDefinitions.map(pd => [String(pd.id), pd]));

    // Pre-aggregate payment applications per invoice_item_id
    const itemPayments = new Map<string, number>();
    for (const app of paymentApplications) {
      const itemId = String(app.invoice_item_id);
      const amount = Number(app.amount_applied) || 0;
      itemPayments.set(itemId, (itemPayments.get(itemId) ?? 0) + amount);
    }

    // Build the result by joining invoices → items, filtered to non-voided
    const result: VoteheadStatementRow[] = [];

    for (const inv of invoices) {
      // Skip voided or deleted invoices
      if (inv.status === 'Voided' || inv.deleted_at) continue;

      const invoiceId = String(inv.id);
      const studentId = String(inv.student_id);
      const student = studentMap.get(studentId);
      const admissionNo = student ? String(student.admission_no ?? '') : '';
      const invoiceNumber = String(inv.invoice_number ?? '');

      // Resolve school period name
      let schoolPeriod: string | null = null;
      const periodId = inv.school_period_id;
      if (periodId != null) {
        const sp = schoolPeriodMap.get(String(periodId));
        if (sp) {
          // Try period_definition_id join first
          const pdId = sp.period_definition_id;
          if (pdId != null) {
            const pd = periodDefMap.get(String(pdId));
            if (pd) {
              schoolPeriod = String(pd.name ?? '');
            }
          }
          // Fallback to school period name directly
          if (!schoolPeriod && sp.name) {
            schoolPeriod = String(sp.name);
          }
        }
      }

      // Find all items for this invoice
      const itemsForInvoice = invoiceItems.filter(item => String(item.invoice_id) === invoiceId);

      for (const item of itemsForInvoice) {
        const invoiceItemId = String(item.id);
        const votehead = String(item.description ?? '');
        const amountBilled = Number(item.amount) || 0;
        const amountPaid = itemPayments.get(invoiceItemId) ?? 0;
        const itemBalance = Math.round((amountBilled - amountPaid) * 100) / 100;

        result.push({
          studentId,
          admissionNo,
          invoiceId,
          invoiceNumber,
          schoolPeriod,
          invoiceItemId,
          votehead,
          amountBilled: Math.round(amountBilled * 100) / 100,
          amountPaid: Math.round(amountPaid * 100) / 100,
          itemBalance,
        });
      }
    }

    return result;
  }, [
    studentsCol.data, studentInvoicesCol.data, studentInvoiceItemsCol.data,
    invoicePaymentApplicationsCol.data, schoolPeriodsCol.data, academicPeriodDefinitionsCol.data,
    studentsCol.loading, studentInvoicesCol.loading, studentInvoiceItemsCol.loading,
    invoicePaymentApplicationsCol.loading, schoolPeriodsCol.loading, academicPeriodDefinitionsCol.loading,
  ]);

  const refresh = useCallback(async () => {
    await Promise.all([
      studentsCol.refresh(),
      studentInvoicesCol.refresh(),
      studentInvoiceItemsCol.refresh(),
      invoicePaymentApplicationsCol.refresh(),
      schoolPeriodsCol.refresh(),
      academicPeriodDefinitionsCol.refresh(),
    ]);
  }, [
    studentsCol.refresh, studentInvoicesCol.refresh, studentInvoiceItemsCol.refresh,
    invoicePaymentApplicationsCol.refresh, schoolPeriodsCol.refresh, academicPeriodDefinitionsCol.refresh,
  ]);

  return {
    data,
    loading:
      studentsCol.loading ||
      studentInvoicesCol.loading ||
      studentInvoiceItemsCol.loading ||
      invoicePaymentApplicationsCol.loading ||
      schoolPeriodsCol.loading ||
      academicPeriodDefinitionsCol.loading,
    error:
      studentsCol.error ||
      studentInvoicesCol.error ||
      studentInvoiceItemsCol.error ||
      invoicePaymentApplicationsCol.error ||
      schoolPeriodsCol.error ||
      academicPeriodDefinitionsCol.error,
    refresh,
  };
}

export default useVoteheadStatement;