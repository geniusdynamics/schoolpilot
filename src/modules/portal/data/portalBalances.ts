// ABOUTME: One learner's financial position as the portal shows it, taken from the finance module's
// ABOUTME: own summary and cut down to the learner the signed-in account may read.

import type { StudentFinancialSummary } from '@/modules/finance/hooks/useStudentFinancialSummary';

import { assertLearnerAccess, type PortalIdentity, type PortalLearner } from './portalAccess';

/** What the portal shows about a learner's fees. Amounts are whole minor units. */
export interface PortalBalance {
  readonly learner: PortalLearner;
  /** The finance service's row, or null when the learner has never been billed. */
  readonly summary: StudentFinancialSummary | null;
  readonly feeAmount: number;
  readonly amountPaid: number;
  readonly feeExemption: number;
  readonly feePenalty: number;
  readonly balance: number;
  readonly overpay: number;
  readonly earliestDueDate: string | null;
}

const NO_CHARGES = {
  feeAmount: 0,
  amountPaid: 0,
  feeExemption: 0,
  feePenalty: 0,
  balance: 0,
  overpay: 0,
  earliestDueDate: null,
} as const;

/**
 * The balance of one learner, refused unless the account may read that learner.
 *
 * The amount is the finance service's `balance` (billed + fines - paid - posted credit notes); the
 * portal never adds up invoices of its own, so the figure is the same one the bursar's summary shows.
 */
export function readLearnerBalance(
  identity: PortalIdentity,
  learnerId: string,
  summaries: readonly StudentFinancialSummary[]
): PortalBalance {
  assertLearnerAccess(identity, learnerId);

  const learner = identity.learners.find((row) => row.id === learnerId);
  if (!learner) throw new Error(`Learner ${learnerId} is in scope but was not described.`);

  const summary = summaries.find((row) => row.studentId === learnerId) ?? null;
  if (!summary) return { learner, summary: null, ...NO_CHARGES };

  return {
    learner,
    summary,
    feeAmount: summary.feeAmount,
    amountPaid: summary.amountPaid,
    feeExemption: summary.feeExemption,
    feePenalty: summary.feePenalty,
    balance: summary.balance,
    overpay: summary.overpay,
    earliestDueDate: summary.earliestDueDate,
  };
}
