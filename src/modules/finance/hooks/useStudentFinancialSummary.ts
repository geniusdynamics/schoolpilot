// ABOUTME: The student financial position the fee reports and the portal read, derived from the
// ABOUTME: canonical invoices, payments, allocations and credit notes. Every amount is whole minor
// ABOUTME: units, never a float, and every read takes every page so a big school is not undercounted.

import { useCallback, useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import { classGroupLabel } from '@/utils/academicLabels';

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
  /** The full label, grade and stream, e.g. "Grade 7 · East". */
  readonly className: string | null;
  /** The grade (level) name, e.g. "Grade 7". */
  readonly classLabel: string | null;
  /** The stream (class group) name, e.g. "East". */
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
  /** The grade (level) name of the learner's placement, when the report knows one. */
  readonly classLabel: string | null;
  /** The class group's own name, e.g. "East". */
  readonly streamName: string | null;
  readonly position: LearnerPosition;
  /** The fine part of what was billed, reported beside it and never added to the balance. */
  readonly penalties: number;
  readonly earliestDueDate: string | null;
}

/** The fields of one enrolment the placement resolver reads. */
export interface SummaryEnrolmentRow {
  readonly id: string;
  readonly learner_id: string;
  readonly academic_year_id: string;
  readonly class_group_id: string;
  readonly status: string;
  readonly start_date: string;
}

/**
 * The active placement of each learner, in one academic year when a year is asked for.
 *
 * With no year, the latest placement wins, which is the behaviour the portal has always had. A year
 * id narrows the candidates first, so a learner's older class is still reported when that year is
 * chosen instead of being overwritten by a later year's move.
 */
export function resolveSummaryEnrolments<T extends SummaryEnrolmentRow>(
  enrolments: readonly T[],
  academicYearId: string
): ReadonlyMap<string, T> {
  const byLearner = new Map<string, T>();
  for (const enrolment of enrolments) {
    if (enrolment.status !== 'active' && enrolment.status !== 'repeating') continue;
    if (academicYearId && enrolment.academic_year_id !== academicYearId) continue;
    const current = byLearner.get(enrolment.learner_id);
    if (
      !current ||
      enrolment.start_date > current.start_date ||
      (enrolment.start_date === current.start_date && enrolment.id > current.id)
    ) {
      byLearner.set(enrolment.learner_id, enrolment);
    }
  }
  return byLearner;
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
    className:
      classGroupLabel({ gradeLevel: input.classLabel, name: input.streamName ?? '' }) || null,
    classLabel: input.classLabel,
    streamName: input.streamName,
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

/** What a caller may narrow the summary to. Ids, never display names. */
export interface StudentFinancialSummaryScope {
  /** The year whose placement labels (and filters) each learner; empty keeps the latest placement. */
  readonly academicYearId?: string | null;
  /** Only learners placed at this level (grade); empty means every grade. */
  readonly levelId?: string | null;
  /** Only learners placed in this class group (stream); empty means every stream. */
  readonly classGroupId?: string | null;
}

/** Reads the canonical documents behind the student financial summary. */
export function useStudentFinancialSummary(scope: StudentFinancialSummaryScope = {}) {
  const repository = useCanonicalRepository();
  const academicYearId = scope.academicYearId ?? '';
  const levelId = scope.levelId ?? '';
  const classGroupId = scope.classGroupId ?? '';
  const learnersQuery = useEntityQuery(repository, 'learner', {}, EVERY_PAGE);
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment', {}, EVERY_PAGE);
  const classGroupsQuery = useEntityQuery(repository, 'class_group', {}, EVERY_PAGE);
  const levelsQuery = useEntityQuery(repository, 'level', {}, EVERY_PAGE);
  const invoicesQuery = useEntityQuery(repository, 'invoice', {}, EVERY_PAGE);
  const invoiceLinesQuery = useEntityQuery(repository, 'invoice_line', {}, EVERY_PAGE);
  const paymentsQuery = useEntityQuery(repository, 'payment', {}, EVERY_PAGE);
  const allocationsQuery = useEntityQuery(repository, 'payment_allocation', {}, EVERY_PAGE);
  const creditNotesQuery = useEntityQuery(repository, 'credit_note', {}, EVERY_PAGE);

  const data = useMemo<readonly StudentFinancialSummary[]>(() => {
    const learners = learnersQuery.data?.items ?? [];
    const enrolments = enrolmentsQuery.data?.items ?? [];
    const classGroups = classGroupsQuery.data?.items ?? [];
    const levels = levelsQuery.data?.items ?? [];
    const invoices = invoicesQuery.data?.items ?? [];
    const invoiceLines = invoiceLinesQuery.data?.items ?? [];
    const payments = paymentsQuery.data?.items ?? [];
    const allocations = allocationsQuery.data?.items ?? [];
    const creditNotes = creditNotesQuery.data?.items ?? [];

    const groupById = new Map(classGroups.map((group) => [group.id, group]));
    const levelById = new Map(levels.map((level) => [level.id, level.name]));
    const enrolmentByLearner = resolveSummaryEnrolments(enrolments, academicYearId);

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

    return learners.flatMap((learner) => {
      const enrolment = enrolmentByLearner.get(learner.id);
      const group = enrolment ? groupById.get(enrolment.class_group_id) : undefined;
      if (levelId && group?.level_id !== levelId) return [];
      if (classGroupId && group?.id !== classGroupId) return [];
      return [
        toSummaryRow({
          learner,
          classLabel: group ? (levelById.get(group.level_id) ?? null) : null,
          streamName: group?.name ?? null,
          position: positions.get(learner.id) ?? {
            billed: 0,
            collected: 0,
            creditNotes: 0,
            credit: 0,
            balance: 0,
          },
          penalties: penaltyByLearner.get(learner.id) ?? 0,
          earliestDueDate: dueByLearner.get(learner.id) ?? null,
        }),
      ];
    });
  }, [
    learnersQuery.data,
    enrolmentsQuery.data,
    classGroupsQuery.data,
    levelsQuery.data,
    invoicesQuery.data,
    invoiceLinesQuery.data,
    paymentsQuery.data,
    allocationsQuery.data,
    creditNotesQuery.data,
    academicYearId,
    levelId,
    classGroupId,
  ]);

  const refetchLearners = learnersQuery.refetch;
  const refetchEnrolments = enrolmentsQuery.refetch;
  const refetchClassGroups = classGroupsQuery.refetch;
  const refetchLevels = levelsQuery.refetch;
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
      refetchLevels(),
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
    refetchLevels,
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
