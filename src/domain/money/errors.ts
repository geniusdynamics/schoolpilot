// ABOUTME: The errors the money module raises: an unknown currency, two currencies in one
// ABOUTME: operation, an amount that is not a whole minor unit, precision a currency cannot hold,
// ABOUTME: and an allocation whose weights are not usable.

/** Why a money operation was refused. */
export type MoneyErrorCode =
  /** The code is not one of the currencies the table holds. */
  | 'unknown_currency'
  /** The two operands are counted in different currencies. */
  | 'currency_mismatch'
  /** The amount is not a whole number of minor units, or a result left the safe integer range. */
  | 'invalid_amount'
  /** The decimal amount carries more precision than the currency holds. */
  | 'over_precision'
  /** An exact scaling landed between two minor units. */
  | 'not_exact'
  /** An allocation weight is negative, not finite, or the weights cannot divide a total. */
  | 'invalid_weight';

/**
 * A refusal of the money module.
 *
 * The `code` names the rule that refused, the way a `ServiceError` of the domain services
 * does, so a caller can branch on it without reading the message.
 */
export class MoneyError extends Error {
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.name = 'MoneyError';
    this.code = code;
  }
}
