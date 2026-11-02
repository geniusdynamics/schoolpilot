// ABOUTME: One learner's money position from the canonical finance documents: what was billed,
// ABOUTME: what was collected, the credit the school holds, and the balance the statement closes at.

import type { Money } from '@/domain/schema/common';

/** The minimum of an invoice the position needs. */
export interface PositionInvoice {
  readonly learnerId: string | null;
  readonly status: string;
  readonly total: Money;
}

/** The minimum of a payment the position needs. */
export interface PositionPayment {
  readonly id: string;
  readonly learnerId: string | null;
  readonly status: string;
  readonly amount: Money;
}

/** The minimum of an allocation the position needs. */
export interface PositionAllocation {
  readonly paymentId: string;
  readonly amount: Money;
}

/** The minimum of a credit note the position needs. */
export interface PositionCreditNote {
  readonly learner_id?: string | null;
  readonly status: string;
  readonly amount: Money;
}

export interface LearnerPositionInput {
  readonly invoiceRows: readonly PositionInvoice[];
  readonly paymentRows: readonly PositionPayment[];
  readonly allocationRows: readonly PositionAllocation[];
  readonly creditNotes: readonly PositionCreditNote[];
}

/**
 * One learner's position, in exact minor units.
 *
 * `collected` is every posted payment the learner made, allocated or not: an overpayment is money
 * the school holds, so it counts as collected. `credit` is the unallocated learner credit plus the
 * part of the allocations that exceeds the bill, which is the credit a statement shows. `balance`
 * is `billed - collected - creditNotes`, the same figure the statement's closing balance is.
 */
export interface LearnerPosition {
  readonly billed: number;
  readonly collected: number;
  readonly creditNotes: number;
  readonly credit: number;
  readonly balance: number;
}

const ZERO: LearnerPosition = {
  billed: 0,
  collected: 0,
  creditNotes: 0,
  credit: 0,
  balance: 0,
};

interface MutablePosition {
  billed: number;
  collected: number;
  creditNotes: number;
  unallocated: number;
}

/** A posted payment is one that has happened; a pending, bounced or reversed one has not. */
function countsAsCollected(status: string): boolean {
  return status === 'posted' || status === 'cleared';
}

/** A draft or void invoice charges nothing. */
function countsAsBilled(status: string): boolean {
  return status !== 'void' && status !== 'draft';
}

/**
 * Builds every learner's position from the canonical documents.
 *
 * It reads the same documents the statement does - invoices, payments, allocations and posted
 * credit notes - so a learner's balance here is the statement's closing balance, not a second
 * arithmetic over a different set.
 */
export function buildLearnerPositions(
  input: LearnerPositionInput
): ReadonlyMap<string, LearnerPosition> {
  const mutable = new Map<string, MutablePosition>();
  const positionOf = (learnerId: string): MutablePosition => {
    const current = mutable.get(learnerId);
    if (current) return current;
    const created: MutablePosition = { billed: 0, collected: 0, creditNotes: 0, unallocated: 0 };
    mutable.set(learnerId, created);
    return created;
  };

  for (const invoice of input.invoiceRows) {
    if (!invoice.learnerId || !countsAsBilled(invoice.status)) continue;
    positionOf(invoice.learnerId).billed += invoice.total.amount_minor;
  }

  for (const note of input.creditNotes) {
    if (!note.learner_id || note.status !== 'posted') continue;
    positionOf(note.learner_id).creditNotes += note.amount.amount_minor;
  }

  const allocatedByPayment = new Map<string, number>();
  for (const allocation of input.allocationRows) {
    allocatedByPayment.set(
      allocation.paymentId,
      (allocatedByPayment.get(allocation.paymentId) ?? 0) + allocation.amount.amount_minor
    );
  }

  for (const payment of input.paymentRows) {
    if (!payment.learnerId || !countsAsCollected(payment.status)) continue;
    const position = positionOf(payment.learnerId);
    const amount = payment.amount.amount_minor;
    position.collected += amount;
    const allocated = allocatedByPayment.get(payment.id) ?? 0;
    position.unallocated += Math.max(0, amount - allocated);
  }

  const positions = new Map<string, LearnerPosition>();
  for (const [learnerId, position] of mutable) {
    const netBilled = position.billed - position.creditNotes;
    // Unallocated money, or allocations above the net bill: both are credit the school holds.
    const credit = Math.max(position.unallocated, position.collected - netBilled, 0);
    positions.set(learnerId, {
      billed: position.billed,
      collected: position.collected,
      creditNotes: position.creditNotes,
      credit,
      balance: position.billed - position.collected - position.creditNotes,
    });
  }
  return positions;
}

/** One learner's position; a learner with no document yet has the zero position. */
export function positionOf(
  positions: ReadonlyMap<string, LearnerPosition>,
  learnerId: string
): LearnerPosition {
  return positions.get(learnerId) ?? ZERO;
}
