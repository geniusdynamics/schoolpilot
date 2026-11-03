// ABOUTME: The student financial position the fee reports and the portal read, derived from the
// ABOUTME: canonical invoices, payments, allocations and credit notes. Every amount is whole minor
// ABOUTME: units, never a float, and every read takes every page so a big school is not undercounted.

import { useCallback, useMemo } from 'react';

import { useEntityQuery } from '@/data/query';

import { useCanonicalRepository } from '../data/canonicalRepository';
import { buildLearnerPositions, type LearnerPosition } from '../data/learnerPosition';

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
  /**
   * Everything billed on the learner's posted invoices.
   *
   * A fine is its own invoice whose total is the fine, so this figure already includes the fines a
   * learner has been charged; `feePenalty` reports the fine part of it, it is not added again.
   */
  readonly feeAmount: number;
  /** Posted credit notes: exemptions and scholarships. */
  readonly feeExemption: number;
  /** Fine lines billed on the learner's invoices, a part of {@link feeAmount}. */
  readonly feePenalty: number;
  /** Every posted payment the learner made, allocated or not. */
  readonly amountPaid: number;
  /** feeAmount - amountPaid - feeExemption: what is still owed, negative when the learner is in credit. */
  readonly balance: number;
  /** The positive part of an overpayment. */
  readonly overpay: number;
  readonly refund: number;
  /** Earliest due date across the learner's posted invoices. */
  readonly earliestDueDate: string | null;
}

/** What one row needs beyond the position the documents produce. */
export interface SummaryRowInput {
  readonly learner: {
    readonly id: string;
    readonly admission_number: string;
    readonly preferred_name?: string | null;
    readonly given_name: string;
    readonly family_name: string;
  };
  readonly className: string | null;
  readonly position: LearnerPosition;
  /** The fine part of what was billed, reported beside it and never added to the balance. */
  readonly penalties: number;
  readonly earliestDueDate: string | null;
}

/**
 * One learner's row from the documents already gathered.
 *
 * The balance is the position's own balance - billed less every posted payment less posted credit
 * notes - so it is the figure the learner's statement closes at. The fines are already inside what
 * was billed (a fine is written as its own invoice), which is why they are reported and not added;
 * an earlier version added them and made a fined learner owe the fine twice.
 */
export function toSummaryRow(input: SummaryRowInput): StudentFinancialSummary {
  const { learner, position } = input;
  return {
    studentId: learner.id,
    admissionNo: learner.admission_number,
    name: `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim(),
    className: input.className,
    streamName: input.className,
    feeAmount: position.billed,
    feeExemption: position.creditNotes,
    feePenalty: input.penalties,
    amountPaid: position.collected,
    balance: position.balance,
    overpay: Math.max(0, -position.balance),
    refund: 0,
    earliestDueDate: input.earliestDueDate,
  };
}

/** The query every read of the summary uses: every page, and no assumption about a row count. */
const EVERY_PAGE = { allPages: true } as const;

/** Reads the canonical documents behind the student financial summary. */
export function useStudentFinancialSummary() {
  const repository = useCanonicalRepository();
  const learnersQuery = useEntityQuery(repository, 'learner', {}, EVERY_PAGE);
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment', {}, EVERY_PAGE);
  const classGroupsQuery = useEntityQuery(repository, 'class_group', {}, EVERY_PAGE);
  const invoicesQuery = useEntityQuery(repository, 'invoice', {}, EVERY_PAGE);
  const invoiceLinesQuery = useEntityQuery(repository, 'invoice_line', {}, EVERY_PAGE);
  const paymentsQuery = useEntityQuery(repository, 'payment', {}, EVERY_PAGE);
  const allocationsQuery = useEntityQuery(repository, 'payment_allocation', {}, EVERY_PAGE);
  const creditNotesQuery = useEntityQuery(repository, 'credit_note', {}, EVERY_PAGE);

  const data = useMemo<readonly StudentFinancialSummary[]>(() => {
    const learners = learnersQuery.data?.items ?? [];
    const enrolments = enrolmentsQuery.data?.items ?? [];
    const classGroups = classGroupsQuery.data?.items ?? [];
    const invoices = invoicesQuery.data?.items ?? [];
    const invoiceLines = invoiceLinesQuery.data?.items ?? [];
    const payments = paymentsQuery.data?.items ?? [];
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
    const penaltyByLearner = new Map<string, number>();
    const dueByLearner = new Map<string, string>();

    for (const invoice of invoices) {
      if (invoice.status === 'void' || invoice.status === 'draft') continue;
      if (!invoice.learner_id) continue;
      if (invoice.due_date) {
        const current = dueByLearner.get(invoice.learner_id);
        if (!current || invoice.due_date < current) {
          dueByLearner.set(invoice.learner_id, invoice.due_date);
        }
      }
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

    // The position is the same arithmetic the statement and the summary tab use, so the three
    // screens cannot disagree about what a learner owes.
    const positions = buildLearnerPositions({
      invoiceRows: invoices.map((invoice) => ({
        learnerId: invoice.learner_id ?? null,
        status: invoice.status,
        total: invoice.total,
      })),
      paymentRows: payments.map((payment) => ({
        id: payment.id,
        learnerId: payment.learner_id ?? null,
        status: payment.status,
        amount: payment.amount,
      })),
      allocationRows: allocations.map((allocation) => ({
        paymentId: allocation.payment_id,
        amount: allocation.amount,
      })),
      creditNotes: creditNotes.map((note) => ({
        learner_id: note.learner_id ?? null,
        status: note.status,
        amount: note.amount,
      })),
    });

    return learners.map((learner) => {
      const enrolment = enrolmentByLearner.get(learner.id);
      const group = enrolment ? groupById.get(enrolment.class_group_id) : undefined;
      return toSummaryRow({
        learner,
        className: group?.name ?? null,
        position: positions.get(learner.id) ?? {
          billed: 0,
          collected: 0,
          creditNotes: 0,
          credit: 0,
          balance: 0,
        },
        penalties: penaltyByLearner.get(learner.id) ?? 0,
        earliestDueDate: dueByLearner.get(learner.id) ?? null,
      });
    });
  }, [
    learnersQuery.data,
    enrolmentsQuery.data,
    classGroupsQuery.data,
    invoicesQuery.data,
    invoiceLinesQuery.data,
    paymentsQuery.data,
    allocationsQuery.data,
    creditNotesQuery.data,
  ]);

  const refetchLearners = learnersQuery.refetch;
  const refetchEnrolments = enrolmentsQuery.refetch;
  const refetchClassGroups = classGroupsQuery.refetch;
  const refetchInvoices = invoicesQuery.refetch;
  const refetchInvoiceLines = invoiceLinesQuery.refetch;
  const refetchPayments = paymentsQuery.refetch;
  const refetchAllocations = allocationsQuery.refetch;
  const refetchCreditNotes = creditNotesQuery.refetch;

  const refresh = useCallback(async () => {
    await Promise.all([
      refetchLearners(),
      refetchEnrolments(),
      refetchClassGroups(),
      refetchInvoices(),
      refetchInvoiceLines(),
      refetchPayments(),
      refetchAllocations(),
      refetchCreditNotes(),
    ]);
  }, [
    refetchLearners,
    refetchEnrolments,
    refetchClassGroups,
    refetchInvoices,
    refetchInvoiceLines,
    refetchPayments,
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
