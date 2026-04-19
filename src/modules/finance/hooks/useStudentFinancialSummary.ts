// ABOUTME: Computed view hook replacing vw_fin_student_financial_summary
// ABOUTME: Aggregates student billing, payment, and adjustment data into a financial summary
// ABOUTME: Mirrors the SQL view: joins students with class/stream info, invoice totals, payment totals, and fee adjustments

import { useMemo, useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

/**
 * Represents a single row from the student financial summary view.
 * Each row is one student with their aggregated financial position.
 */
export interface StudentFinancialSummary {
  /** Student ID (from adm.students.id) */
  studentId: string;
  /** Admission number */
  admissionNo: string;
  /** Full name (first + last) */
  name: string;
  /** Class name (from adm.classes.name via class_stream) */
  className: string | null;
  /** Stream name (from adm.class_streams.name) */
  streamName: string | null;
  /** Total amount billed (sum of non-voided invoices) */
  feeAmount: number;
  /** Total fee exemptions + scholarships */
  feeExemption: number;
  /** Total penalties and fines */
  feePenalty: number;
  /** Total amount paid */
  amountPaid: number;
  /** Balance = (feeAmount + feePenalty) - (amountPaid + feeExemption) */
  balance: number;
  /** Overpayment amount (positive when balance < 0, otherwise 0) */
  overpay: number;
  /** Refund amount (always 0 in current schema, reserved for future) */
  refund: number;
}

/**
 * Computed view hook that replicates `vw_fin_student_financial_summary`.
 *
 * Aggregates data from:
 * - students (with class/stream joins)
 * - student_invoices (non-voided, active)
 * - student_payments (all payments)
 * - fee_adjustments (exemptions, scholarships, penalties)
 *
 * Usage:
 * ```tsx
 * const { data: summaries, loading, error, refresh } = useStudentFinancialSummary();
 * ```
 */
export function useStudentFinancialSummary() {
  const studentsCol = useDatabaseCollection<Record<string, any>>('students');
  const classStreamsCol = useDatabaseCollection<Record<string, any>>('class_streams');
  const classesCol = useDatabaseCollection<Record<string, any>>('classes');
  const studentInvoicesCol = useDatabaseCollection<Record<string, any>>('student_invoices');
  const studentPaymentsCol = useDatabaseCollection<Record<string, any>>('student_payments');
  const feeAdjustmentsCol = useDatabaseCollection<Record<string, any>>('fee_adjustments');

  const data = useMemo<StudentFinancialSummary[]>(() => {
    if (
      studentsCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      studentInvoicesCol.loading ||
      studentPaymentsCol.loading ||
      feeAdjustmentsCol.loading
    ) {
      return [];
    }

    const students = studentsCol.data;
    const classStreams = classStreamsCol.data;
    const classes = classesCol.data;
    const invoices = studentInvoicesCol.data;
    const payments = studentPaymentsCol.data;
    const adjustments = feeAdjustmentsCol.data;

    // Pre-compute lookup maps for O(1) access
    const streamMap = new Map(classStreams.map(cs => [String(cs.id), cs]));
    const classMap = new Map(classes.map(c => [String(c.id), c]));

    // Aggregate invoices per student (non-voided, non-deleted)
    const invoiceTotals = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status === 'Voided' || inv.deleted_at) continue;
      const sid = String(inv.student_id);
      invoiceTotals.set(sid, (invoiceTotals.get(sid) ?? 0) + (Number(inv.total_amount_billed) || 0));
    }

    // Aggregate payments per student
    const paymentTotals = new Map<string, number>();
    for (const pay of payments) {
      const sid = String(pay.student_id);
      paymentTotals.set(sid, (paymentTotals.get(sid) ?? 0) + (Number(pay.total_amount_paid) || 0));
    }

    // Aggregate adjustments per student (exemptions/scholarships vs penalties)
    const exemptionTotals = new Map<string, number>();
    const penaltyTotals = new Map<string, number>();
    for (const adj of adjustments) {
      const sid = String(adj.student_id);
      const amount = Number(adj.amount) || 0;
      const adjType = String(adj.adjustment_type ?? '');
      if (adjType === 'Exemption' || adjType === 'Scholarship') {
        exemptionTotals.set(sid, (exemptionTotals.get(sid) ?? 0) + amount);
      } else if (adjType === 'Penalty' || adjType === 'Fine') {
        penaltyTotals.set(sid, (penaltyTotals.get(sid) ?? 0) + amount);
      }
    }

    // Build the summary for each active student
    const result: StudentFinancialSummary[] = [];

    for (const student of students) {
      // Filter out soft-deleted students
      if (student.deleted_at) continue;

      const studentId = String(student.id);
      const admissionNo = String(student.admission_no ?? '');
      const firstName = String(student.first_name ?? '');
      const lastName = String(student.last_name ?? '');
      const name = `${firstName} ${lastName}`.trim();

      // Resolve class and stream names via joins
      let className: string | null = null;
      let streamName: string | null = null;
      const streamId = student.current_class_stream_id;
      if (streamId != null) {
        const stream = streamMap.get(String(streamId));
        if (stream) {
          streamName = String(stream.name ?? '');
          const classId = stream.class_id;
          if (classId != null) {
            const cls = classMap.get(String(classId));
            if (cls) {
              className = String(cls.name ?? '');
            }
          }
        }
      }

      // Also try student's denormalized fields if join didn't resolve
      if (!className && student.current_class_name) {
        className = String(student.current_class_name);
      }
      if (!streamName && student.current_class_stream_name) {
        streamName = String(student.current_class_stream_name);
      }

      const feeAmount = invoiceTotals.get(studentId) ?? 0;
      const feeExemption = exemptionTotals.get(studentId) ?? 0;
      const feePenalty = penaltyTotals.get(studentId) ?? 0;
      const amountPaid = paymentTotals.get(studentId) ?? 0;
      const balance = (feeAmount + feePenalty) - (amountPaid + feeExemption);
      const overpay = balance < 0 ? Math.abs(balance) : 0;

      result.push({
        studentId,
        admissionNo,
        name,
        className,
        streamName,
        feeAmount: Math.round(feeAmount * 100) / 100,
        feeExemption: Math.round(feeExemption * 100) / 100,
        feePenalty: Math.round(feePenalty * 100) / 100,
        amountPaid: Math.round(amountPaid * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        overpay: Math.round(overpay * 100) / 100,
        refund: 0, // Reserved for future use - always 0 in current schema
      });
    }

    return result;
  }, [
    studentsCol.data, classStreamsCol.data, classesCol.data,
    studentInvoicesCol.data, studentPaymentsCol.data, feeAdjustmentsCol.data,
    studentsCol.loading, classStreamsCol.loading, classesCol.loading,
    studentInvoicesCol.loading, studentPaymentsCol.loading, feeAdjustmentsCol.loading,
  ]);

  const refresh = useCallback(async () => {
    await Promise.all([
      studentsCol.refresh(),
      classStreamsCol.refresh(),
      classesCol.refresh(),
      studentInvoicesCol.refresh(),
      studentPaymentsCol.refresh(),
      feeAdjustmentsCol.refresh(),
    ]);
  }, [studentsCol.refresh, classStreamsCol.refresh, classesCol.refresh, studentInvoicesCol.refresh, studentPaymentsCol.refresh, feeAdjustmentsCol.refresh]);

  return {
    data,
    loading:
      studentsCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      studentInvoicesCol.loading ||
      studentPaymentsCol.loading ||
      feeAdjustmentsCol.loading,
    error:
      studentsCol.error ||
      classStreamsCol.error ||
      classesCol.error ||
      studentInvoicesCol.error ||
      studentPaymentsCol.error ||
      feeAdjustmentsCol.error,
    refresh,
  };
}

export default useStudentFinancialSummary;