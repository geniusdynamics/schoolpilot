// ABOUTME: The cheque lifecycle as a pure state machine: the moves it permits, the states it
// ABOUTME: refuses to leave, and the canonical payment status each state writes.

import { describe, expect, it } from 'vitest';

import {
  CHEQUE_PAYMENT_STATUS,
  CHEQUE_STATES,
  CHEQUE_TRANSITIONS,
  PaymentError,
  assertChequeTransition,
  canTransitionCheque,
  chequeStateOfStatus,
  chequeTransition,
  chequeTransitionsFrom,
  isTerminalChequeState,
  statusOfChequeState,
  type ChequeState,
} from '..';

const ALL: readonly ChequeState[] = ['received', 'deposited', 'cleared', 'bounced'];

describe('the cheque states', () => {
  it('are the four the spec names, in the order they are reached', () => {
    expect([...CHEQUE_STATES]).toEqual(['received', 'deposited', 'cleared', 'bounced']);
  });

  it('writes the canonical payment status of each state', () => {
    expect(CHEQUE_PAYMENT_STATUS).toEqual({
      received: 'pending',
      deposited: 'posted',
      cleared: 'cleared',
      bounced: 'bounced',
    });
    for (const state of ALL) expect(statusOfChequeState(state)).toBe(CHEQUE_PAYMENT_STATUS[state]);
  });

  it('reads a canonical payment status back as a cheque state, and rejects the rest', () => {
    expect(chequeStateOfStatus('pending')).toBe('received');
    expect(chequeStateOfStatus('posted')).toBe('deposited');
    expect(chequeStateOfStatus('cleared')).toBe('cleared');
    expect(chequeStateOfStatus('bounced')).toBe('bounced');
    expect(chequeStateOfStatus('reversed')).toBeNull();
    expect(chequeStateOfStatus('anything')).toBeNull();
  });
});

describe('the permitted moves', () => {
  it('are exactly received→deposited, received→bounced, deposited→cleared, deposited→bounced', () => {
    expect(
      CHEQUE_TRANSITIONS.map((move) => `${move.from}->${move.to}`).sort()
    ).toEqual(['deposited->bounced', 'deposited->cleared', 'received->bounced', 'received->deposited']);
    expect(canTransitionCheque('received', 'deposited')).toBe(true);
    expect(canTransitionCheque('received', 'bounced')).toBe(true);
    expect(canTransitionCheque('deposited', 'cleared')).toBe(true);
    expect(canTransitionCheque('deposited', 'bounced')).toBe(true);
  });

  it('names a verb and a meaning for every move', () => {
    for (const move of CHEQUE_TRANSITIONS) {
      expect(move.verb.length).toBeGreaterThan(0);
      expect(move.meaning.length).toBeGreaterThan(0);
    }
  });

  it('gives the moves available out of each state', () => {
    expect(chequeTransitionsFrom('received').map((move) => move.to)).toEqual(['deposited', 'bounced']);
    expect(chequeTransitionsFrom('deposited').map((move) => move.to)).toEqual(['cleared', 'bounced']);
    expect(chequeTransitionsFrom('cleared')).toEqual([]);
    expect(chequeTransitionsFrom('bounced')).toEqual([]);
  });

  it('treats cleared and bounced as final', () => {
    expect(isTerminalChequeState('cleared')).toBe(true);
    expect(isTerminalChequeState('bounced')).toBe(true);
    expect(isTerminalChequeState('received')).toBe(false);
    expect(isTerminalChequeState('deposited')).toBe(false);
  });
});

describe('the refusals', () => {
  it('refuses a cheque that is not deposited from being cleared', () => {
    const error = catchOf(() => assertChequeTransition('received', 'cleared'));
    expect(error).toBeInstanceOf(PaymentError);
    expect((error as PaymentError).code).toBe('cheque_transition_invalid');
    expect((error as PaymentError).message).toMatch(/received/);
    expect((error as PaymentError).message).toMatch(/deposited, bounced/);
  });

  it('refuses to move a cheque backwards', () => {
    for (const [from, to] of [
      ['deposited', 'received'],
      ['cleared', 'deposited'],
      ['bounced', 'deposited'],
    ] as const) {
      const error = catchOf(() => assertChequeTransition(from, to));
      expect((error as PaymentError).code).toBe('cheque_transition_invalid');
    }
  });

  it('says a final state is final', () => {
    const error = catchOf(() => assertChequeTransition('bounced', 'cleared'));
    expect((error as PaymentError).code).toBe('cheque_transition_invalid');
    expect((error as PaymentError).message).toMatch(/final/);
    expect((error as PaymentError).detail.terminal).toBe(true);
  });

  it('refuses a state becoming itself', () => {
    for (const state of ALL) {
      expect(catchOf(() => assertChequeTransition(state, state))).toBeInstanceOf(PaymentError);
      expect(chequeTransition(state, state)).toBeNull();
    }
  });

  it('returns the move when the lifecycle permits it', () => {
    expect(assertChequeTransition('received', 'deposited').verb).toBe('deposit');
    expect(assertChequeTransition('deposited', 'bounced').verb).toBe('bounce');
  });
});

/** The error a call throws, for an assertion on its type. */
function catchOf(work: () => unknown): unknown {
  try {
    work();
    return null;
  } catch (error) {
    return error;
  }
}
