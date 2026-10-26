// ABOUTME: The errors the payroll module raises: a pack that is malformed, an input that is not usable,
// ABOUTME: a date with no rule in force, a period the pack does not model, and a payslip that cannot be paid.

/** Why a payroll operation was refused. */
export type PayrollErrorCode =
  /** The pack document is malformed, or its rules contradict each other. */
  | 'invalid_pack'
  /** The pay profile, period, date or amount given to a computation is not usable. */
  | 'invalid_input'
  /** The pack has no entry for the rule on the date: payroll refuses to guess a rate. */
  | 'no_rule_in_force'
  /** The pack names the rule in this period but does not model it. */
  | 'rule_not_modelled'
  /** The deductions exceed the gross pay. */
  | 'net_pay_negative'
  /** The pack has no return layout with that id. */
  | 'unknown_return'
  /** A return was asked for payslips of more than one period. */
  | 'mixed_periods';

/**
 * A refusal of the payroll module.
 *
 * The `code` names the rule that refused so a caller can branch on it without reading the message,
 * the way a `MoneyError` does.
 */
export class PayrollError extends Error {
  readonly code: PayrollErrorCode;

  constructor(code: PayrollErrorCode, message: string) {
    super(message);
    this.name = 'PayrollError';
    this.code = code;
  }
}
