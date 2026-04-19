// ABOUTME: Computed view hook replacing vw_fin_fee_collection_summary
// ABOUTME: Aggregates fee collection data by period/class/stream/votehead
// ABOUTME: Provides expected vs. paid vs. arrears breakdown for financial reporting

import { useMemo, useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

/**
 * A single row in the fee collection summary, aggregated by
 * school period, class, stream, and votehead.
 */
export interface FeeCollectionSummaryRow {
  /** School period ID */
  schoolPeriodId: number;
  /** School period name (e.g., "Term 1 2025") */
  schoolPeriodName: string;
  /** Class ID (nullable = unassigned) */
  classId: number | null;
  /** Class name (nullable = unassigned) */
  className: string | null;
  /** Stream ID (nullable = unassigned) */
  streamId: number | null;
  /** Stream name (nullable = unassigned) */
  streamName: string | null;
  /** Votehead / line-item description */
  votehead: string;
  /** Total amount billed for this grouping */
  totalBilled: number;
  /** Total amount paid for this grouping */
  totalPaid: number;
  /** Total exemptions + scholarships for this grouping */
  totalExemptions: number;
  /** Total penalties + fines for this grouping */
  totalPenalties: number;
  /** Outstanding balance (totalBilled + totalPenalties - totalPaid - totalExemptions) */
  balance: number;
}

/**
 * Computed view hook that replicates `vw_fin_fee_collection_summary`.
 *
 * Aggregates data from:
 * - student_invoices (non-voided, with school_period_id)
 * - student_invoice_items (votehead breakdown)
 * - invoice_payment_applications (payment allocations)
 * - fee_adjustments (exemptions, scholarships, penalties)
 * - students (for class/stream resolution via current_class_stream_id)
 * - class_streams (for stream → class mapping)
 * - classes (for class name)
 * - school_periods (for period name)
 *
 * Usage:
 * ```tsx
 * const { data: collectionSummary, loading, error, refresh } = useFeeCollectionSummary();
 * ```
 */
export function useFeeCollectionSummary() {
  const studentsCol = useDatabaseCollection<Record<string, any>>('students');
  const classStreamsCol = useDatabaseCollection<Record<string, any>>('class_streams');
  const classesCol = useDatabaseCollection<Record<string, any>>('classes');
  const studentInvoicesCol = useDatabaseCollection<Record<string, any>>('student_invoices');
  const studentInvoiceItemsCol = useDatabaseCollection<Record<string, any>>('student_invoice_items');
  const invoicePaymentApplicationsCol = useDatabaseCollection<Record<string, any>>('invoice_payment_applications');
  const feeAdjustmentsCol = useDatabaseCollection<Record<string, any>>('fee_adjustments');
  const schoolPeriodsCol = useDatabaseCollection<Record<string, any>>('school_periods');

  const data = useMemo<FeeCollectionSummaryRow[]>(() => {
    if (
      studentsCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      studentInvoicesCol.loading ||
      studentInvoiceItemsCol.loading ||
      invoicePaymentApplicationsCol.loading ||
      feeAdjustmentsCol.loading ||
      schoolPeriodsCol.loading
    ) {
      return [];
    }

    const students = studentsCol.data;
    const classStreams = classStreamsCol.data;
    const classes = classesCol.data;
    const invoices = studentInvoicesCol.data;
    const invoiceItems = studentInvoiceItemsCol.data;
    const paymentApplications = invoicePaymentApplicationsCol.data;
    const adjustments = feeAdjustmentsCol.data;
    const schoolPeriods = schoolPeriodsCol.data;

    // Lookup maps
    const streamMap = new Map(classStreams.map(cs => [String(cs.id), cs]));
    const classMap = new Map(classes.map(c => [String(c.id), c]));
    const schoolPeriodMap = new Map(schoolPeriods.map(sp => [String(sp.id), sp]));

    // Map student_id → { classId, className, streamId, streamName }
    const studentClassInfo = new Map<string, {
      classId: number | null; className: string | null;
      streamId: number | null; streamName: string | null;
    }>();

    for (const student of students) {
      if (student.deleted_at) continue;
      const sid = String(student.id);
      const streamId = student.current_class_stream_id ?? null;
      let classId: number | null = null;
      let className: string | null = null;
      let streamName: string | null = null;

      if (streamId != null) {
        const stream = streamMap.get(String(streamId));
        if (stream) {
          streamName = String(stream.name ?? '');
          const cid = stream.class_id;
          if (cid != null) {
            const cls = classMap.get(String(cid));
            if (cls) {
              classId = Number(cls.id);
              className = String(cls.name ?? '');
            }
          }
        }
      }

      // Fallback to denormalized fields
      if (!className && student.current_class_name) className = String(student.current_class_name);
      if (!streamName && student.current_class_stream_name) streamName = String(student.current_class_stream_name);

      studentClassInfo.set(sid, { classId, className, streamId: streamId != null ? Number(streamId) : null, streamName });
    }

    // Pre-aggregate payment applications per invoice_item_id
    const itemPayments = new Map<string, number>();
    for (const app of paymentApplications) {
      const itemId = String(app.invoice_item_id);
      const amount = Number(app.amount_applied) || 0;
      itemPayments.set(itemId, (itemPayments.get(itemId) ?? 0) + amount);
    }

    // Map invoice_id → array of invoice items
    const invoiceItemsMap = new Map<string, Record<string, any>[]>();
    for (const item of invoiceItems) {
      const invId = String(item.invoice_id);
      if (!invoiceItemsMap.has(invId)) invoiceItemsMap.set(invId, []);
      invoiceItemsMap.get(invId)!.push(item);
    }

    // Map student_id → array of fee adjustments per period
    const adjByStudentPeriod = new Map<string, Map<number, { exemptions: number; penalties: number }>>();
    for (const adj of adjustments) {
      const sid = String(adj.student_id);
      const periodId = Number(adj.school_period_id) || 0;
      const amount = Number(adj.amount) || 0;
      const adjType = String(adj.adjustment_type ?? '');

      if (!adjByStudentPeriod.has(sid)) adjByStudentPeriod.set(sid, new Map());
      const periodMap = adjByStudentPeriod.get(sid)!;
      if (!periodMap.has(periodId)) periodMap.set(periodId, { exemptions: 0, penalties: 0 });
      const entry = periodMap.get(periodId)!;

      if (adjType === 'Exemption' || adjType === 'Scholarship') {
        entry.exemptions += amount;
      } else if (adjType === 'Penalty' || adjType === 'Fine') {
        entry.penalties += amount;
      }
    }

    // Aggregate by composite key: period + class + stream + votehead
    const aggregationMap = new Map<string, {
      schoolPeriodId: number; schoolPeriodName: string;
      classId: number | null; className: string | null;
      streamId: number | null; streamName: string | null;
      votehead: string;
      totalBilled: number; totalPaid: number;
      totalExemptions: number; totalPenalties: number;
    }>();

    for (const inv of invoices) {
      if (inv.status === 'Voided' || inv.deleted_at) continue;

      const studentId = String(inv.student_id);
      const schoolPeriodId = Number(inv.school_period_id) || 0;
      const classInfo = studentClassInfo.get(studentId) ?? {
        classId: null, className: null, streamId: null, streamName: null,
      };

      // Resolve period name
      let schoolPeriodName = '';
      const sp = schoolPeriodMap.get(String(schoolPeriodId));
      if (sp) {
        schoolPeriodName = String(sp.name ?? '');
      }

      // Get adjustments for this student+period
      const studentAdjs = adjByStudentPeriod.get(studentId);
      const periodAdjs = studentAdjs?.get(schoolPeriodId) ?? { exemptions: 0, penalties: 0 };

      // Get items for this invoice
      const items = invoiceItemsMap.get(String(inv.id)) ?? [];

      // If no items, still record the invoice total as a single row
      if (items.length === 0) {
        const key = `${schoolPeriodId}|${classInfo.classId ?? 'null'}|${classInfo.streamId ?? 'null'}|__total__`;
        if (!aggregationMap.has(key)) {
          aggregationMap.set(key, {
            schoolPeriodId, schoolPeriodName,
            classId: classInfo.classId, className: classInfo.className,
            streamId: classInfo.streamId, streamName: classInfo.streamName,
            votehead: '(Total Invoice)',
            totalBilled: 0, totalPaid: 0,
            totalExemptions: 0, totalPenalties: 0,
          });
        }
        const entry = aggregationMap.get(key)!;
        entry.totalBilled += Number(inv.total_amount_billed) || 0;
        entry.totalPaid += Number(inv.amount_paid) || 0;
        entry.totalExemptions += periodAdjs.exemptions;
        entry.totalPenalties += periodAdjs.penalties;
      } else {
        for (const item of items) {
          const votehead = String(item.description ?? '(No description)');
          const amountBilled = Number(item.amount) || 0;
          const amountPaid = itemPayments.get(String(item.id)) ?? 0;

          const key = `${schoolPeriodId}|${classInfo.classId ?? 'null'}|${classInfo.streamId ?? 'null'}|${votehead}`;
          if (!aggregationMap.has(key)) {
            aggregationMap.set(key, {
              schoolPeriodId, schoolPeriodName,
              classId: classInfo.classId, className: classInfo.className,
              streamId: classInfo.streamId, streamName: classInfo.streamName,
              votehead,
              totalBilled: 0, totalPaid: 0,
              totalExemptions: 0, totalPenalties: 0,
            });
          }
          const entry = aggregationMap.get(key)!;
          entry.totalBilled += amountBilled;
          entry.totalPaid += amountPaid;
          entry.totalExemptions += periodAdjs.exemptions;
          entry.totalPenalties += periodAdjs.penalties;
        }
      }
    }

    // Convert aggregation map to result array
    const result: FeeCollectionSummaryRow[] = [];
    for (const entry of aggregationMap.values()) {
      const balance = (entry.totalBilled + entry.totalPenalties) - (entry.totalPaid + entry.totalExemptions);
      result.push({
        schoolPeriodId: entry.schoolPeriodId,
        schoolPeriodName: entry.schoolPeriodName,
        classId: entry.classId,
        className: entry.className,
        streamId: entry.streamId,
        streamName: entry.streamName,
        votehead: entry.votehead,
        totalBilled: Math.round(entry.totalBilled * 100) / 100,
        totalPaid: Math.round(entry.totalPaid * 100) / 100,
        totalExemptions: Math.round(entry.totalExemptions * 100) / 100,
        totalPenalties: Math.round(entry.totalPenalties * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }

    return result;
  }, [
    studentsCol.data, classStreamsCol.data, classesCol.data,
    studentInvoicesCol.data, studentInvoiceItemsCol.data,
    invoicePaymentApplicationsCol.data, feeAdjustmentsCol.data,
    schoolPeriodsCol.data,
    studentsCol.loading, classStreamsCol.loading, classesCol.loading,
    studentInvoicesCol.loading, studentInvoiceItemsCol.loading,
    invoicePaymentApplicationsCol.loading, feeAdjustmentsCol.loading,
    schoolPeriodsCol.loading,
  ]);

  const refresh = useCallback(async () => {
    await Promise.all([
      studentsCol.refresh(),
      classStreamsCol.refresh(),
      classesCol.refresh(),
      studentInvoicesCol.refresh(),
      studentInvoiceItemsCol.refresh(),
      invoicePaymentApplicationsCol.refresh(),
      feeAdjustmentsCol.refresh(),
      schoolPeriodsCol.refresh(),
    ]);
  }, [
    studentsCol.refresh, classStreamsCol.refresh, classesCol.refresh,
    studentInvoicesCol.refresh, studentInvoiceItemsCol.refresh,
    invoicePaymentApplicationsCol.refresh, feeAdjustmentsCol.refresh,
    schoolPeriodsCol.refresh,
  ]);

  return {
    data,
    loading:
      studentsCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      studentInvoicesCol.loading ||
      studentInvoiceItemsCol.loading ||
      invoicePaymentApplicationsCol.loading ||
      feeAdjustmentsCol.loading ||
      schoolPeriodsCol.loading,
    error:
      studentsCol.error ||
      classStreamsCol.error ||
      classesCol.error ||
      studentInvoicesCol.error ||
      studentInvoiceItemsCol.error ||
      invoicePaymentApplicationsCol.error ||
      feeAdjustmentsCol.error ||
      schoolPeriodsCol.error,
    refresh,
  };
}

export default useFeeCollectionSummary;