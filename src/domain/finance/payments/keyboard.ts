// ABOUTME: The cashier's keyboard flow of spec 05 §5.2, as a pure reducer: search the learner,
// ABOUTME: amount, channel, reference, Enter, print - reachable without a pointer, and countable.

import type { PaymentChannel } from './types';

/** The budget spec 05 §5.2 sets for taking a payment at the counter: twenty seconds. */
export const CASHIER_FLOW_BUDGET_MS = 20_000;

/** The steps a payment is taken in, in order. */
export const CASHIER_FLOW_STEPS = [
  'learner',
  'amount',
  'channel',
  'reference',
  'save',
  'print',
] as const;

/** The step the flow is on; `done` once the receipt has been printed. */
export type CashierFlowStep = (typeof CASHIER_FLOW_STEPS)[number] | 'done';

/** The most keystrokes the scripted flow needs, so a regression that adds a step is caught. */
export const CASHIER_FLOW_MAX_KEYSTROKES = 40;

/** One learner the search matched, best first. */
export interface CashierLearnerMatch {
  readonly id: string;
  readonly label: string;
}

/** The lists the flow navigates. */
export interface CashierFlowContext {
  readonly matches: readonly CashierLearnerMatch[];
  readonly channels: readonly PaymentChannel[];
}

/** Where the flow is and what has been entered so far. */
export interface CashierFlowState {
  readonly step: CashierFlowStep;
  readonly learnerQuery: string;
  readonly learnerId: string | null;
  readonly highlighted: number;
  readonly amountText: string;
  readonly channel: PaymentChannel;
  readonly reference: string;
  /** How many keystrokes the flow has taken, so the keyboard cost is a measured number. */
  readonly keystrokes: number;
}

/**
 * The keys the flow understands.
 *
 * There is deliberately no pointer action: the cashier screen's acceptance is that a payment is
 * taken with the keyboard alone, so the model has no way to express a click. Every step is reached
 * by typing, by Enter, by the arrow keys or by a channel hotkey.
 */
export type CashierFlowAction =
  /** A printable character typed into the active text field. */
  | { readonly type: 'type'; readonly value: string }
  /** The active text field's whole contents, as an input's change event reports them. */
  | { readonly type: 'setText'; readonly value: string }
  | { readonly type: 'backspace' }
  | { readonly type: 'clear' }
  /** ArrowUp / ArrowDown in the learner list. */
  | { readonly type: 'move'; readonly delta: number }
  /** Choose a learner by id (the highlighted one, or one named outright). */
  | { readonly type: 'select'; readonly learnerId: string }
  /** Enter: commit the active field and move to the next step. */
  | { readonly type: 'accept' }
  /** Shift+Enter: step back to the previous field. */
  | { readonly type: 'back' }
  /** A channel hotkey (1..6), which chooses the channel and moves on. */
  | { readonly type: 'channel'; readonly channel: PaymentChannel }
  /** Enter on the save step, dispatched once the write has succeeded. */
  | { readonly type: 'submit' }
  /** Enter on the print step, which ends the flow. */
  | { readonly type: 'print' };

/** Every action kind the flow understands. Used by the tests to prove no pointer action exists. */
export const CASHIER_FLOW_ACTIONS = [
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
] as const;

/** The step before a step, or null at the first. */
export function previousCashierStep(step: CashierFlowStep): CashierFlowStep | null {
  const index = CASHIER_FLOW_STEPS.indexOf(step as (typeof CASHIER_FLOW_STEPS)[number]);
  if (index <= 0) return null;
  return CASHIER_FLOW_STEPS[index - 1] as CashierFlowStep;
}

/** The step after a step, or `done` past the last. */
export function nextCashierStep(step: CashierFlowStep): CashierFlowStep {
  const index = CASHIER_FLOW_STEPS.indexOf(step as (typeof CASHIER_FLOW_STEPS)[number]);
  if (index < 0) return 'done';
  if (index === CASHIER_FLOW_STEPS.length - 1) return 'done';
  return CASHIER_FLOW_STEPS[index + 1] as CashierFlowStep;
}

/** The flow at its start, before any keystroke. */
export function initialCashierFlow(channel: PaymentChannel = 'cash'): CashierFlowState {
  return {
    step: 'learner',
    learnerQuery: '',
    learnerId: null,
    highlighted: 0,
    amountText: '',
    channel,
    reference: '',
    keystrokes: 0,
  };
}

/** True when the amount typed is a positive number of major units. */
export function isPositiveAmountText(text: string): boolean {
  const trimmed = text.trim();
  if (!/^[+-]?[\d,]*\.?\d+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/[^\d]/g, '');
  return /[1-9]/.test(digits);
}

/** True when the flow holds everything a save needs. */
export function canSubmitCashierFlow(state: CashierFlowState): boolean {
  return (
    (state.step === 'save' || state.step === 'reference') &&
    state.learnerId !== null &&
    isPositiveAmountText(state.amountText)
  );
}

/** The learner the highlight is on, or null when the search matched none. */
export function highlightedMatch(
  state: CashierFlowState,
  context: CashierFlowContext
): CashierLearnerMatch | null {
  if (context.matches.length === 0) return null;
  const index = Math.max(0, Math.min(state.highlighted, context.matches.length - 1));
  return context.matches[index] ?? null;
}

function withKeystrokes(state: CashierFlowState, count: number): CashierFlowState {
  return { ...state, keystrokes: state.keystrokes + count };
}

/**
 * Applies one keystroke.
 *
 * The reducer is pure: it holds no clock and no write, so the same script always reaches the same
 * step. The page records the wall-clock time around it and performs the write; the flow itself is
 * what proves the path is keyboard-only.
 */
export function applyCashierFlowAction(
  state: CashierFlowState,
  action: CashierFlowAction,
  context: CashierFlowContext
): CashierFlowState {
  switch (action.type) {
    case 'type': {
      if (state.step === 'learner') {
        return withKeystrokes({ ...state, learnerQuery: state.learnerQuery + action.value, highlighted: 0 }, action.value.length);
      }
      if (state.step === 'amount') {
        return withKeystrokes({ ...state, amountText: state.amountText + action.value }, action.value.length);
      }
      if (state.step === 'reference') {
        return withKeystrokes({ ...state, reference: state.reference + action.value }, action.value.length);
      }
      return withKeystrokes(state, action.value.length);
    }

    case 'setText': {
      if (state.step === 'learner') {
        return withKeystrokes({ ...state, learnerQuery: action.value, highlighted: 0 }, action.value.length);
      }
      if (state.step === 'amount') {
        return withKeystrokes({ ...state, amountText: action.value }, action.value.length);
      }
      if (state.step === 'reference') {
        return withKeystrokes({ ...state, reference: action.value }, action.value.length);
      }
      return state;
    }

    case 'backspace': {
      if (state.step === 'learner') {
        return withKeystrokes({ ...state, learnerQuery: state.learnerQuery.slice(0, -1), highlighted: 0 }, 1);
      }
      if (state.step === 'amount') {
        return withKeystrokes({ ...state, amountText: state.amountText.slice(0, -1) }, 1);
      }
      if (state.step === 'reference') {
        return withKeystrokes({ ...state, reference: state.reference.slice(0, -1) }, 1);
      }
      return withKeystrokes(state, 1);
    }

    case 'clear': {
      if (state.step === 'learner') return withKeystrokes({ ...state, learnerQuery: '', highlighted: 0 }, 1);
      if (state.step === 'amount') return withKeystrokes({ ...state, amountText: '' }, 1);
      if (state.step === 'reference') return withKeystrokes({ ...state, reference: '' }, 1);
      return withKeystrokes(state, 1);
    }

    case 'move': {
      if (state.step !== 'learner' || context.matches.length === 0) return withKeystrokes(state, 1);
      const count = context.matches.length;
      const next = ((state.highlighted + action.delta) % count + count) % count;
      return withKeystrokes({ ...state, highlighted: next }, 1);
    }

    case 'select': {
      if (state.step !== 'learner') return withKeystrokes(state, 1);
      return withKeystrokes(
        { ...state, learnerId: action.learnerId, step: nextCashierStep('learner') },
        1
      );
    }

    case 'channel': {
      if (state.step === 'learner' || state.step === 'amount' || state.step === 'channel') {
        return withKeystrokes({ ...state, channel: action.channel, step: 'reference' }, 1);
      }
      return withKeystrokes({ ...state, channel: action.channel }, 1);
    }

    case 'accept': {
      if (state.step === 'learner') {
        const match = highlightedMatch(state, context);
        if (!match) return withKeystrokes(state, 1);
        return withKeystrokes({ ...state, learnerId: match.id, step: 'amount' }, 1);
      }
      if (state.step === 'amount') {
        if (!isPositiveAmountText(state.amountText)) return withKeystrokes(state, 1);
        return withKeystrokes({ ...state, step: 'channel' }, 1);
      }
      if (state.step === 'channel') return withKeystrokes({ ...state, step: 'reference' }, 1);
      if (state.step === 'reference') {
        if (!canSubmitCashierFlow(state)) return withKeystrokes(state, 1);
        return withKeystrokes({ ...state, step: 'save' }, 1);
      }
      if (state.step === 'save') {
        if (!canSubmitCashierFlow(state)) return withKeystrokes(state, 1);
        return withKeystrokes({ ...state, step: 'print' }, 1);
      }
      if (state.step === 'print') return withKeystrokes({ ...state, step: 'done' }, 1);
      return withKeystrokes(state, 1);
    }

    case 'back': {
      const previous = previousCashierStep(state.step);
      return withKeystrokes(previous === null ? state : { ...state, step: previous }, 1);
    }

    case 'submit': {
      if (!canSubmitCashierFlow(state)) return withKeystrokes(state, 1);
      return withKeystrokes({ ...state, step: 'print' }, 1);
    }

    case 'print': {
      if (state.step !== 'print') return withKeystrokes(state, 1);
      return withKeystrokes({ ...state, step: 'done' }, 1);
    }

    default:
      return state;
  }
}

/** Runs a script of actions, for a test or a page that replays a documented path. */
export function runCashierFlow(
  actions: readonly CashierFlowAction[],
  context: CashierFlowContext,
  start: CashierFlowState = initialCashierFlow()
): CashierFlowState {
  return actions.reduce((state, action) => applyCashierFlowAction(state, action, context), start);
}

/**
 * The scripted path the keyboard flow is measured against.
 *
 * It is the path a cashier takes for a cash payment of 1500 with no reference: three characters
 * of the admission number, the learner chosen from the match list, four characters of the amount,
 * Enter, the cash hotkey, Enter past the reference, Enter to save, Enter to print.
 */
export function cashierFlowScript(learnerId: string, channel: PaymentChannel = 'cash'): readonly CashierFlowAction[] {
  return [
    { type: 'type', value: 'ADM' },
    { type: 'select', learnerId },
    { type: 'type', value: '1500' },
    { type: 'accept' },
    { type: 'channel', channel },
    { type: 'accept' },
    { type: 'submit' },
    { type: 'print' },
  ];
}

/** When a flow started and finished, in milliseconds on a monotonic clock. */
export interface CashierTiming {
  readonly startedAt: number;
  readonly finishedAt: number;
}

/** How long the flow took. */
export function elapsedMs(timing: CashierTiming): number {
  return Math.max(0, timing.finishedAt - timing.startedAt);
}

/** True when the flow met the spec's twenty-second budget. */
export function isWithinBudget(
  timing: CashierTiming,
  budgetMs: number = CASHIER_FLOW_BUDGET_MS
): boolean {
  return elapsedMs(timing) <= budgetMs;
}

/** The elapsed time as seconds, to two decimals, for a report or a screen. */
export function elapsedSeconds(timing: CashierTiming): number {
  return Math.round(elapsedMs(timing) / 10) / 100;
}
