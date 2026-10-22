// ABOUTME: The cashier's keyboard flow as a pure reducer: the scripted path reaches the receipt
// ABOUTME: without a pointer, the refusals hold, and the timing helpers state the budget.

import { describe, expect, it } from 'vitest';

import {
  CASHIER_FLOW_ACTIONS,
  CASHIER_FLOW_BUDGET_MS,
  CASHIER_FLOW_MAX_KEYSTROKES,
  CASHIER_FLOW_STEPS,
  applyCashierFlowAction,
  canSubmitCashierFlow,
  cashierFlowScript,
  elapsedMs,
  elapsedSeconds,
  highlightedMatch,
  initialCashierFlow,
  isPositiveAmountText,
  isWithinBudget,
  nextCashierStep,
  previousCashierStep,
  runCashierFlow,
  type CashierFlowContext,
  type CashierFlowState,
} from '..';

const CONTEXT: CashierFlowContext = {
  matches: [
    { id: 'lrn-1', label: 'Amina Wanjiku · ADM/2027/001' },
    { id: 'lrn-2', label: 'Brian Otieno · ADM/2027/002' },
  ],
  channels: ['cash', 'bank_deposit', 'cheque', 'mobile_money', 'card', 'in_kind'],
};

describe('the flow is keyboard-only', () => {
  it('has no pointer action in its vocabulary', () => {
    for (const action of CASHIER_FLOW_ACTIONS) {
      expect(action).not.toMatch(/click|pointer|mouse|tap|drag/);
    }
    expect([...CASHIER_FLOW_ACTIONS]).toEqual([
      'type',
      'setText',
      'backspace',
      'clear',
      'move',
      'select',
      'accept',
      'back',
      'channel',
      'submit',
      'print',
    ]);
  });

  it('lists the steps of the spec path in order', () => {
    expect([...CASHIER_FLOW_STEPS]).toEqual([
      'learner',
      'amount',
      'channel',
      'reference',
      'save',
      'print',
    ]);
    expect(nextCashierStep('learner')).toBe('amount');
    expect(nextCashierStep('print')).toBe('done');
    expect(previousCashierStep('learner')).toBeNull();
    expect(previousCashierStep('amount')).toBe('learner');
  });
});

describe('the scripted path', () => {
  it('reaches the printed receipt within the keystroke budget', () => {
    const state = runCashierFlow(cashierFlowScript('lrn-1'), CONTEXT);
    expect(state.step).toBe('done');
    expect(state.learnerId).toBe('lrn-1');
    expect(state.amountText).toBe('1500');
    expect(state.channel).toBe('cash');
    expect(state.keystrokes).toBeLessThanOrEqual(CASHIER_FLOW_MAX_KEYSTROKES);
    // Three characters of the admission number, the learner chosen, four of the amount, and the
    // five further keys: Enter past the amount, the cash hotkey, Enter past the reference, Enter to
    // save, Enter to print.
    expect(state.keystrokes).toBe(3 + 1 + 4 + 5);
  });

  it('takes a non-cash channel by its hotkey and carries its reference', () => {
    const state = runCashierFlow(
      [
        { type: 'type', value: 'ADM' },
        { type: 'accept' },
        { type: 'type', value: '1500' },
        { type: 'accept' },
        { type: 'channel', channel: 'mobile_money' },
        { type: 'type', value: 'MPESA-XYZ' },
        { type: 'accept' },
        { type: 'submit' },
        { type: 'print' },
      ],
      CONTEXT
    );
    expect(state.step).toBe('done');
    expect(state.channel).toBe('mobile_money');
    expect(state.reference).toBe('MPESA-XYZ');
  });
});

describe('the refusals', () => {
  it('does not leave the learner step with no match', () => {
    const empty: CashierFlowContext = { ...CONTEXT, matches: [] };
    const state = applyCashierFlowAction(initialCashierFlow(), { type: 'accept' }, empty);
    expect(state.step).toBe('learner');
    expect(state.learnerId).toBeNull();
  });

  it('does not advance past the amount step without a positive amount', () => {
    const atAmount = runCashierFlow([{ type: 'select', learnerId: 'lrn-1' }], CONTEXT);
    expect(atAmount.step).toBe('amount');
    expect(applyCashierFlowAction(atAmount, { type: 'accept' }, CONTEXT).step).toBe('amount');

    const zero = applyCashierFlowAction(atAmount, { type: 'type', value: '0' }, CONTEXT);
    expect(applyCashierFlowAction(zero, { type: 'accept' }, CONTEXT).step).toBe('amount');
  });

  it('does not submit without a learner and an amount', () => {
    expect(canSubmitCashierFlow(initialCashierFlow())).toBe(false);
    const state: CashierFlowState = { ...initialCashierFlow(), step: 'save', learnerId: null, amountText: '10' };
    expect(canSubmitCashierFlow(state)).toBe(false);
  });

  it('replaces a text field whole with the setText action, as an input reports it', () => {
    const typed = runCashierFlow([{ type: 'type', value: 'AM' }], CONTEXT);
    const replaced = applyCashierFlowAction(typed, { type: 'setText', value: 'Amina' }, CONTEXT);
    expect(replaced.learnerQuery).toBe('Amina');
    expect(replaced.keystrokes).toBe(2 + 5);
  });

  it('steps back with the back action', () => {
    const atAmount = runCashierFlow([{ type: 'select', learnerId: 'lrn-1' }], CONTEXT);
    expect(applyCashierFlowAction(atAmount, { type: 'back' }, CONTEXT).step).toBe('learner');
  });
});

describe('the learner list', () => {
  it('moves the highlight with the arrow keys and wraps', () => {
    let state = initialCashierFlow();
    state = applyCashierFlowAction(state, { type: 'move', delta: 1 }, CONTEXT);
    expect(state.highlighted).toBe(1);
    expect(highlightedMatch(state, CONTEXT)?.id).toBe('lrn-2');
    state = applyCashierFlowAction(state, { type: 'move', delta: 1 }, CONTEXT);
    expect(state.highlighted).toBe(0);
    state = applyCashierFlowAction(state, { type: 'move', delta: -1 }, CONTEXT);
    expect(state.highlighted).toBe(1);
  });

  it('selects the highlighted learner with Enter', () => {
    const state = runCashierFlow(
      [{ type: 'move', delta: 1 }, { type: 'accept' }],
      CONTEXT
    );
    expect(state.learnerId).toBe('lrn-2');
    expect(state.step).toBe('amount');
  });
});

describe('the amount text', () => {
  it('accepts a positive number and refuses zero, empty and junk', () => {
    expect(isPositiveAmountText('1500')).toBe(true);
    expect(isPositiveAmountText('1,500.50')).toBe(true);
    expect(isPositiveAmountText('.5')).toBe(true);
    expect(isPositiveAmountText('0')).toBe(false);
    expect(isPositiveAmountText('0.00')).toBe(false);
    expect(isPositiveAmountText('')).toBe(false);
    expect(isPositiveAmountText('abc')).toBe(false);
  });
});

describe('the timing', () => {
  it('measures the elapsed time and judges it against the spec budget', () => {
    expect(CASHIER_FLOW_BUDGET_MS).toBe(20_000);
    expect(elapsedMs({ startedAt: 1000, finishedAt: 9000 })).toBe(8000);
    expect(elapsedSeconds({ startedAt: 0, finishedAt: 12_340 })).toBe(12.34);
    expect(isWithinBudget({ startedAt: 0, finishedAt: 19_999 })).toBe(true);
    expect(isWithinBudget({ startedAt: 0, finishedAt: 20_001 })).toBe(false);
    expect(elapsedMs({ startedAt: 500, finishedAt: 100 })).toBe(0);
  });
});
