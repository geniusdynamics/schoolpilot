// ABOUTME: The student financial position the fee reports read, derived from canonical invoices,
// ABOUTME: allocations and credit notes. Every amount is whole minor units, never a float.

import { useCallback, useMemo } from 'react';

import { useEntityQuery } from '@/data/query';

import { useCanonicalRepository } from '../data/canonicalRepository';

/**
 * One learner's financial position.
 *
 * The amount fields carry exact minor units (the canonical money representation). A
 * caller formats them with `formatMoneyMinor`; nothing divides by 100 here.
 */
export interface StudentFinancialSummary {
  readonly studentId: string;
  readonly admissionNo: string;
  readonly name: string;
  readonly className: string | null;
  readonly streamName: string | null;
  /** Total billed on posted (non-void) invoices. */
  readonly feeAmount: number;
  /** Posted credit notes: exemptions and scholarships. */
  readonly feeExemption: number;
  /** Fine lines billed on the learner's invoices. */
  readonly feePenalty: number;
  /** Allocations applied to the learner's invoices. */
  readonly amountPaid: number;
  /** feeAmount + feePenalty - amountPaid - feeExemption. */
  readonly balance: number;
  /** The positive part of an overpayment. */
  readonly overpay: number;
  readonly refund: number;
  /** Earliest due date across the learner's posted invoices. */
  readonly earliestDueDate: string | null;
}

/** Reads the canonical documents behind the student financial summary. */
export function useStudentFinancialSummary() {
  const repository = useCanonicalRepository();
  const learnersQuery = useEntityQuery(repository, 'learner');
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment');
  const classGroupsQuery = useEntityQuery(repository, 'class_group');
  const invoicesQuery = useEntityQuery(repository, 'invoice');
  const invoiceLinesQuery = useEntityQuery(repository, 'invoice_line');
  const allocationsQuery = useEntityQuery(repository, 'payment_allocation');
  const creditNotesQuery = useEntityQuery(repository, 'credit_note');

  const data = useMemo<readonly StudentFinancialSummary[]>(() => {
    const learners = learnersQuery.data?.items ?? [];
    const enrolments = enrolmentsQuery.data?.items ?? [];
    const classGroups = classGroupsQuery.data?.items ?? [];
    const invoices = invoicesQuery.data?.items ?? [];
    const invoiceLines = invoiceLinesQuery.data?.items ?? [];
    const allocations = allocationsQuery.data?.items ?? [];
    const creditNotes = creditNotesQuery.data?.items ?? [];

    const groupById = new Map(classGroups.map((group) => [group.id, group]));
    const enrolmentByLearner = new Map<string, (typeof enrolments)[number]>();
    for (const enrolment of enrolments) {
      if (enrolment.status !== 'active' && enrolment.status !== 'repeating') continue;
      const current = enrolmentByLearner.get(enrolment.learner_id);
      if (!current || enrolment.start_date > current.start_date) {
        enrolmentByLearner.set(enrolment.learner_id, enrolment);
      }
    }

    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    const billedByLearner = new Map<string, number>();
    const paidByLearner = new Map<string, number>();
    const penaltyByLearner = new Map<string, number>();
    const dueByLearner = new Map<string, string>();

    for (const invoice of invoices) {
      if (invoice.status === 'void' || invoice.status === 'draft') continue;
      if (!invoice.learner_id) continue;
      billedByLearner.set(
        invoice.learner_id,
        (billedByLearner.get(invoice.learner_id) ?? 0) + invoice.total.amount_minor
      );
      if (invoice.due_date) {
        const current = dueByLearner.get(invoice.learner_id);
        if (!current || invoice.due_date < current) dueByLearner.set(invoice.learner_id, invoice.due_date);
      }
    }

    for (const allocation of allocations) {
      const invoice = invoiceById.get(allocation.invoice_id);
      if (!invoice?.learner_id) continue;
      if (invoice.status === 'void' || invoice.status === 'draft') continue;
      paidByLearner.set(
        invoice.learner_id,
        (paidByLearner.get(invoice.learner_id) ?? 0) + allocation.amount.amount_minor
      );
    }

    for (const line of invoiceLines) {
      if (line.kind !== 'fine') continue;
      const invoice = invoiceById.get(line.invoice_id);
      if (!invoice?.learner_id) continue;
      if (invoice.status === 'void' || invoice.status === 'draft') continue;
      penaltyByLearner.set(
        invoice.learner_id,
        (penaltyByLearner.get(invoice.learner_id) ?? 0) + line.amount.amount_minor
      );
    }

    const creditByLearner = new Map<string, number>();
    for (const note of creditNotes) {
      if (note.status !== 'posted' || !note.learner_id) continue;
      creditByLearner.set(
        note.learner_id,
        (creditByLearner.get(note.learner_id) ?? 0) + note.amount.amount_minor
      );
    }

    return learners.map((learner) => {
      const enrolment = enrolmentByLearner.get(learner.id);
      const group = enrolment ? groupById.get(enrolment.class_group_id) : undefined;
      const feeAmount = billedByLearner.get(learner.id) ?? 0;
      const feePenalty = penaltyByLearner.get(learner.id) ?? 0;
      const amountPaid = paidByLearner.get(learner.id) ?? 0;
      const feeExemption = creditByLearner.get(learner.id) ?? 0;
      const balance = feeAmount + feePenalty - amountPaid - feeExemption;
      return {
        studentId: learner.id,
        admissionNo: learner.admission_number,
        name: `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim(),
        className: group?.name ?? null,
        streamName: group?.name ?? null,
        feeAmount,
        feeExemption,
        feePenalty,
        amountPaid,
        balance,
        overpay: balance < 0 ? Math.abs(balance) : 0,
        refund: 0,
        earliestDueDate: dueByLearner.get(learner.id) ?? null,
      };
    });
  }, [
    learnersQuery.data,
    enrolmentsQuery.data,
    classGroupsQuery.data,
    invoicesQuery.data,
    invoiceLinesQuery.data,
    allocationsQuery.data,
    creditNotesQuery.data,
  ]);

  const refetchLearners = learnersQuery.refetch;
  const refetchEnrolments = enrolmentsQuery.refetch;
  const refetchClassGroups = classGroupsQuery.refetch;
  const refetchInvoices = invoicesQuery.refetch;
  const refetchInvoiceLines = invoiceLinesQuery.refetch;
  const refetchAllocations = allocationsQuery.refetch;
  const refetchCreditNotes = creditNotesQuery.refetch;

  const refresh = useCallback(async () => {
    await Promise.all([
      refetchLearners(),
      refetchEnrolments(),
      refetchClassGroups(),
      refetchInvoices(),
      refetchInvoiceLines(),
      refetchAllocations(),
      refetchCreditNotes(),
    ]);
  }, [
    refetchLearners,
    refetchEnrolments,
    refetchClassGroups,
    refetchInvoices,
    refetchInvoiceLines,
    refetchAllocations,
    refetchCreditNotes,
  ]);

  return {
    data,
    loading: [learnersQuery.status, invoicesQuery.status].some((status) => status === 'loading'),
    error: learnersQuery.error ?? invoicesQuery.error ?? null,
    refresh,
  };
}

export default useStudentFinancialSummary;
