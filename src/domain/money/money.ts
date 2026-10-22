// ABOUTME: The money value of the platform: an integer count of minor units and a currency code,
// ABOUTME: with exact integer arithmetic (add, subtract, negate, multiply, scale by a rational,
// ABOUTME: compare, sum) so no float ever decides an amount. Every conversion from a decimal
// ABOUTME: string or a major-unit number is an explicit boundary that refuses over-precision.

import { getCurrency, type CurrencyCode } from './currency';
import { MoneyError } from './errors';

/**
 * An amount of money.
 *
 * `amount_minor` is a whole number of minor units: cents for a 2-decimal currency, whole
 * shillings for UGX (0 decimals), fils for KWD (3 decimals). The currency's exponent is in the
 * currency table, so the same integer means a different amount in a different currency. The
 * major-unit value of the amount is never a `number` anywhere in this module: the arithmetic is
 * integer, and a display or storage boundary reads `toDecimalString`.
 *
 * The shape is plain and JSON-safe so a row can hold it and a caller can spread it.
 */
export interface Money {
  readonly amount_minor: number;
  readonly currency: CurrencyCode;
}

/** How a value that falls between two whole minor units is picked. */
export type RoundingMode = 'half_up' | 'half_down' | 'half_even' | 'up' | 'down';

/** The rounding modes a caller may name, in a stable order for validation and error messages. */
export const ROUNDING_MODES: readonly RoundingMode[] = [
  'half_up',
  'half_down',
  'half_even',
  'up',
  'down',
];

/**
 * The largest amount a money value holds: the safe integer range, because `amount_minor` is a
 * `number`. That is 90,071,992,547,409.91 in a 2-decimal currency — no school fee reaches it.
 */
export const MAX_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;

const BIG_MAX = BigInt(MAX_AMOUNT_MINOR);
const DECIMAL_TEXT = /^([+-]?)(\d*)(?:\.(\d*))?$/;

// ------------------------------------------------------------------- boundaries

/** True when a value has the shape of a money value. */
export function isMoney(value: unknown): value is Money {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { amount_minor?: unknown }).amount_minor === 'number' &&
    typeof (value as { currency?: unknown }).currency === 'string'
  );
}

/** Refuses a value that is not a whole number of minor units in a currency of the table. */
function assertMoney(value: Money): void {
  if (!Number.isSafeInteger(value.amount_minor)) {
    throw new MoneyError(
      'invalid_amount',
      `a money amount must be a whole number of minor units within ±${MAX_AMOUNT_MINOR}; got ${String(value.amount_minor)}`
    );
  }
  getCurrency(value.currency);
}

/** The one place a bigint becomes an amount: exact for the safe integer range, refused outside it. */
function asAmountMinor(value: bigint): number {
  if (value > BIG_MAX || value < -BIG_MAX) {
    throw new MoneyError(
      'invalid_amount',
      `the result ${value.toString()} exceeds the safe integer range of ±${MAX_AMOUNT_MINOR} minor units`
    );
  }
  return Number(value);
}

/**
 * The minor-unit count of an exact integer, refused outside the safe integer range.
 *
 * This is the module's only bigint-to-number bridge: the allocator and any later caller that
 * divides in bigint uses it to hand back an amount. It is exact for the whole range it accepts;
 * a caller building an amount from a caller's input wants `fromMinor` or `fromMajor` instead.
 */
export function toMinorUnits(value: bigint): number {
  return asAmountMinor(value);
}

/** A money value from an integer count of minor units. */
export function fromMinor(amountMinor: number, currency: CurrencyCode): Money {
  const value: Money = { amount_minor: amountMinor, currency };
  assertMoney(value);
  return value;
}

/** The zero of a currency, the seed of a sum. */
export function zero(currency: CurrencyCode): Money {
  return fromMinor(0, currency);
}

/**
 * A money value from a major-unit amount: `1500.55` in KES is 150,055 minor units.
 *
 * This is the validating boundary. A string or a number is read as the decimal it is written
 * as, and an amount that carries more precision than the currency holds is refused rather than
 * rounded: `fromMajor('1.005', 'KES')` and `fromMajor(150000.5, 'UGX')` both throw. Digits
 * beyond the exponent that are all zero are accepted, so `fromMajor('1.500', 'KES')` is 1.50.
 *
 * A number is read as its shortest decimal form, which is why a value a float computed as
 * `0.1 + 0.2` — `0.30000000000000004` — is refused instead of silently becoming 30 cents.
 */
export function fromMajor(amount: number | string, currency: CurrencyCode): Money {
  const definition = getCurrency(currency);
  const text = decimalText(amount, currency);
  const match = DECIMAL_TEXT.exec(text);
  if (match === null || (match[2] === '' && (match[3] ?? '') === '')) {
    throw new MoneyError('invalid_amount', `"${text}" is not a decimal amount in ${currency}`);
  }
  const sign = match[1] === '-' ? -1n : 1n;
  const whole = match[2];
  const fraction = match[3] ?? '';
  const scale = definition.decimals;
  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) {
    throw new MoneyError(
      'over_precision',
      `${currency} holds ${scale} decimal place(s); "${text}" carries more, so it is refused rather than rounded`
    );
  }
  const digits = `${whole === '' ? '0' : whole}${fraction.slice(0, scale).padEnd(scale, '0')}`;
  return fromMinor(asAmountMinor(sign * BigInt(digits)), currency);
}

/** The decimal text of a major-unit input, or a refusal naming why it cannot be read. */
function decimalText(amount: number | string, currency: CurrencyCode): string {
  if (typeof amount === 'string') {
    const text = amount.trim();
    if (text === '') {
      throw new MoneyError('invalid_amount', `an empty string is not an amount in ${currency}`);
    }
    return text;
  }
  if (!Number.isFinite(amount)) {
    throw new MoneyError('invalid_amount', `${String(amount)} is not a finite amount in ${currency}`);
  }
  const text = String(amount);
  if (text.includes('e') || text.includes('E')) {
    throw new MoneyError(
      'invalid_amount',
      `${text} in ${currency} is scientific notation; pass the amount as a decimal string`
    );
  }
  return text;
}

/** The exact decimal text of an amount, e.g. `"1500.55"` in KES and `"150000"` in UGX. */
export function toDecimalString(value: Money): string {
  assertMoney(value);
  const scale = getCurrency(value.currency).decimals;
  const negative = value.amount_minor < 0;
  const magnitude = negative ? -BigInt(value.amount_minor) : BigInt(value.amount_minor);
  const sign = negative ? '-' : '';
  if (scale === 0) return `${sign}${magnitude.toString()}`;
  const factor = 10n ** BigInt(scale);
  const whole = magnitude / factor;
  const fraction = (magnitude % factor).toString().padStart(scale, '0');
  return `${sign}${whole.toString()}.${fraction}`;
}

// ------------------------------------------------------------------ arithmetic

/** Refuses two amounts that are counted in different currencies. */
function sameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new MoneyError(
      'currency_mismatch',
      `${left.currency} and ${right.currency} are different currencies; convert one explicitly before adding or comparing`
    );
  }
}

/** The sum of two amounts of the same currency. */
export function add(left: Money, right: Money): Money {
  assertMoney(left);
  assertMoney(right);
  sameCurrency(left, right);
  return fromMinor(asAmountMinor(BigInt(left.amount_minor) + BigInt(right.amount_minor)), left.currency);
}

/** The difference of two amounts of the same currency. */
export function subtract(left: Money, right: Money): Money {
  assertMoney(left);
  assertMoney(right);
  sameCurrency(left, right);
  return fromMinor(asAmountMinor(BigInt(left.amount_minor) - BigInt(right.amount_minor)), left.currency);
}

/** The amount with the opposite sign. */
export function negate(value: Money): Money {
  assertMoney(value);
  return fromMinor(asAmountMinor(-BigInt(value.amount_minor)), value.currency);
}

/** The amount without its sign. */
export function abs(value: Money): Money {
  assertMoney(value);
  return value.amount_minor < 0 ? negate(value) : value;
}

/** The amount scaled by a whole number; exact, because both factors are integers. */
export function multiply(value: Money, factor: number): Money {
  assertMoney(value);
  const scale = toBigInteger(factor, 'factor');
  return fromMinor(asAmountMinor(BigInt(value.amount_minor) * scale), value.currency);
}

/**
 * The amount scaled by a rational, rounded to a whole minor unit by `mode`.
 *
 * Money is always a whole number of minor units, so a scaling that lands between two of them is
 * rounded by the mode the caller names — there is no default, because the rounding rule of a
 * discount, a proration or a tax is a policy the caller owns. A scaling that must land exactly
 * uses `multiplyRationalExact` instead.
 */
export function multiplyRational(
  value: Money,
  numerator: number | bigint,
  denominator: number | bigint,
  mode: RoundingMode
): Money {
  const { quotient, remainder, divisor, negative } = divide(value, numerator, denominator);
  const step = roundsAwayFromZero(quotient, remainder, divisor, mode) ? 1n : 0n;
  const rounded = quotient + step;
  return fromMinor(asAmountMinor(negative ? -rounded : rounded), value.currency);
}

/**
 * The amount scaled by a rational, refused when the result is not a whole minor unit.
 *
 * Use it where a fraction of a minor unit is a mistake rather than a policy: an exact
 * percentage that must divide evenly, a proration the caller has already rounded.
 */
export function multiplyRationalExact(
  value: Money,
  numerator: number | bigint,
  denominator: number | bigint
): Money {
  const { quotient, remainder, divisor, negative } = divide(value, numerator, denominator);
  if (remainder !== 0n) {
    throw new MoneyError(
      'not_exact',
      `scaling ${toDecimalString(value)} by ${numerator.toString()}/${divisor.toString()} is not a whole ${value.currency} minor unit; round it with multiplyRational`
    );
  }
  return fromMinor(asAmountMinor(negative ? -quotient : quotient), value.currency);
}

/** The magnitude and the remainder of `value * numerator / denominator`, with the sign carried out. */
function divide(
  value: Money,
  numerator: number | bigint,
  denominator: number | bigint
): { quotient: bigint; remainder: bigint; divisor: bigint; negative: boolean } {
  assertMoney(value);
  const factor = toBigInteger(numerator, 'numerator');
  const divisorInput = toBigInteger(denominator, 'denominator');
  if (divisorInput === 0n) {
    throw new MoneyError('invalid_amount', 'a money amount cannot be scaled by a zero denominator');
  }
  const product = BigInt(value.amount_minor) * factor;
  const signed = divisorInput < 0n ? -product : product;
  const divisor = divisorInput < 0n ? -divisorInput : divisorInput;
  const negative = signed < 0n;
  const magnitude = negative ? -signed : signed;
  return { quotient: magnitude / divisor, remainder: magnitude % divisor, divisor, negative };
}

/** Whether the magnitude at `quotient` with `remainder` moves up by one under `mode`. */
function roundsAwayFromZero(
  quotient: bigint,
  remainder: bigint,
  divisor: bigint,
  mode: RoundingMode
): boolean {
  if (remainder === 0n) return false;
  switch (mode) {
    case 'up':
      return true;
    case 'down':
      return false;
    case 'half_up':
      return remainder * 2n >= divisor;
    case 'half_down':
      return remainder * 2n > divisor;
    case 'half_even':
      return remainder * 2n > divisor || (remainder * 2n === divisor && quotient % 2n === 1n);
  }
}

/** A number or bigint as a bigint, refused when a number is not a whole number in range. */
function toBigInteger(value: number | bigint, label: string): bigint {
  if (typeof value === 'bigint') return value;
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(
      'invalid_amount',
      `the ${label} of a scaling must be a whole number within ±${MAX_AMOUNT_MINOR}; got ${String(value)}`
    );
  }
  return BigInt(value);
}

// ------------------------------------------------------------------ comparison

/** -1, 0 or 1 as `left` is less than, equal to or greater than `right`; the currencies must match. */
export function compare(left: Money, right: Money): -1 | 0 | 1 {
  assertMoney(left);
  assertMoney(right);
  sameCurrency(left, right);
  if (left.amount_minor < right.amount_minor) return -1;
  if (left.amount_minor > right.amount_minor) return 1;
  return 0;
}

/** True when the two amounts are the same amount of the same currency. */
export function equals(left: Money, right: Money): boolean {
  return compare(left, right) === 0;
}

/** True when the amount is zero. */
export function isZero(value: Money): boolean {
  assertMoney(value);
  return value.amount_minor === 0;
}

/** True when the amount is below zero. */
export function isNegative(value: Money): boolean {
  assertMoney(value);
  return value.amount_minor < 0;
}

/** True when the amount is above zero. */
export function isPositive(value: Money): boolean {
  assertMoney(value);
  return value.amount_minor > 0;
}

/**
 * The sum of amounts of one currency.
 *
 * A list that may be empty reduces over `zero(currency)` instead: the sum of no amounts has no
 * currency to be counted in, so this refuses an empty list rather than inventing one.
 */
export function sum(values: readonly Money[]): Money {
  if (values.length === 0) {
    throw new MoneyError(
      'invalid_amount',
      'the sum of no money values has no currency; reduce over zero(currency) instead'
    );
  }
  return values.reduce(add);
}
