// ABOUTME: The cheque lifecycle of spec 05 §5.1: received → deposited → cleared, or bounced, with
// ABOUTME: the states the canonical payment status carries and the moves each state permits.

import { PAYMENT_STATUSES } from '@/domain/schema';

import { PaymentError } from './errors';
import type { ChequeState } from './types';

/** The canonical payment statuses, the vocabulary a cheque state writes into. */
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** The states a cheque passes through, in the order they are reached. */
export const CHEQUE_STATES: readonly ChequeState[] = ['received', 'deposited', 'cleared', 'bounced'];

/** The states a cheque can go no further from. */
export const TERMINAL_CHEQUE_STATES: readonly ChequeState[] = ['cleared', 'bounced'];

/** One permitted move of the lifecycle. */
export interface ChequeTransition {
  readonly from: ChequeState;
  readonly to: ChequeState;
  /** The verb the screen and the audit trail use for the move. */
  readonly verb: string;
  /** Why the move happens, in one line. */
  readonly meaning: string;
}

/**
 * The moves the lifecycle permits.
 *
 * A cheque is received at the counter, paid into the bank, and then either honoured or refused.
 * A cheque found invalid before it is deposited bounces straight from `received`. A cleared or a
 * bounced cheque is final: correcting either is a new document, never a move backwards.
 */
export const CHEQUE_TRANSITIONS: readonly ChequeTransition[] = [
  {
    from: 'received',
    to: 'deposited',
    verb: 'deposit',
    meaning: 'the cheque was paid into the bank',
  },
  {
    from: 'received',
    to: 'bounced',
    verb: 'bounce',
    meaning: 'the cheque was refused before it reached the bank',
  },
  {
    from: 'deposited',
    to: 'cleared',
    verb: 'clear',
    meaning: 'the bank honoured the cheque',
  },
  {
    from: 'deposited',
    to: 'bounced',
    verb: 'bounce',
    meaning: 'the bank refused the cheque',
  },
];

/** The status the canonical payment row carries in each cheque state. */
export const CHEQUE_PAYMENT_STATUS: Readonly<Record<ChequeState, PaymentStatus>> = {
  received: 'pending',
  deposited: 'posted',
  cleared: 'cleared',
  bounced: 'bounced',
};

/** The cheque state a canonical payment status is, or null when it is not a cheque state. */
export function chequeStateOfStatus(status: string): ChequeState | null {
  switch (status) {
    case 'pending':
      return 'received';
    case 'posted':
      return 'deposited';
    case 'cleared':
      return 'cleared';
    case 'bounced':
      return 'bounced';
    default:
      return null;
  }
}

/** The canonical payment status a cheque state writes. */
export function statusOfChequeState(state: ChequeState): PaymentStatus {
  return CHEQUE_PAYMENT_STATUS[state];
}

/** True when the state has no move out of it. */
export function isTerminalChequeState(state: ChequeState): boolean {
  return TERMINAL_CHEQUE_STATES.includes(state);
}

/** True when the lifecycle permits the move. */
export function canTransitionCheque(from: ChequeState, to: ChequeState): boolean {
  return CHEQUE_TRANSITIONS.some((move) => move.from === from && move.to === to);
}

/** The moves out of a state. */
export function chequeTransitionsFrom(from: ChequeState): readonly ChequeTransition[] {
  return CHEQUE_TRANSITIONS.filter((move) => move.from === from);
}

/** The move of the lifecycle, or null when the lifecycle does not permit it. */
export function chequeTransition(
  from: ChequeState,
  to: ChequeState
): ChequeTransition | null {
  return CHEQUE_TRANSITIONS.find((move) => move.from === from && move.to === to) ?? null;
}

/**
 * Refuses a move the lifecycle does not permit.
 *
 * A terminal state names itself as final, and an unpermitted move names both states and the moves
 * that were available, so the refusal says what to do instead rather than only what went wrong.
 */
export function assertChequeTransition(from: ChequeState, to: ChequeState): ChequeTransition {
  const move = chequeTransition(from, to);
  if (move) return move;

  if (isTerminalChequeState(from)) {
    throw new PaymentError(
      'cheque_transition_invalid',
      `a cheque that is ${from} is final; it cannot become ${to}`,
      { detail: { from, to, terminal: true } }
    );
  }
  const available = chequeTransitionsFrom(from)
    .map((candidate) => candidate.to)
    .join(', ');
  throw new PaymentError(
    'cheque_transition_invalid',
    `a ${from} cheque cannot become ${to}; from ${from} it can become ${available}`,
    { detail: { from, to, available: chequeTransitionsFrom(from).map((c) => c.to) } }
  );
}
