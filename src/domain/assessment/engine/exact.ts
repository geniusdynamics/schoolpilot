// ABOUTME: Exact rational arithmetic for the assessment engine: decimal strings and fractions in,
// ABOUTME: canonical exact strings out, rounded with integer arithmetic only so a float never
// ABOUTME: decides a mark or a grade.

/**
 * A rational number kept exactly as a numerator and a positive denominator.
 *
 * Every value the engine computes is one of these. Marks arrive as decimal strings, so the
 * conversion is exact; sums, products and quotients stay exact; a value is only turned into
 * a shorter decimal by an explicit, recorded rounding.
 */
export interface Exact {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

/** How a value between two representable decimals is picked (spec 03 section 4). */
export type RoundingMode = 'half_up' | 'half_down' | 'half_even' | 'up' | 'down';

/** The rounding modes a scheme may name, in a stable order for validation and error messages. */
export const ROUNDING_MODES: readonly RoundingMode[] = [
  'half_up',
  'half_down',
  'half_even',
  'up',
  'down',
];

/** The most decimal places a mark, a weight or a rounding rule may carry. */
export const MAX_PRECISION = 12;

export const ZERO: Exact = { numerator: 0n, denominator: 1n };
export const ONE: Exact = { numerator: 1n, denominator: 1n };
export const HUNDRED: Exact = { numerator: 100n, denominator: 1n };

const DECIMAL = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const FRACTION = /^([+-]?)(\d+)\/(\d+)$/;

function greatestCommonDivisor(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left;
}

/** A value in lowest terms with a positive denominator; zero is always `0/1`. */
function normalise(numerator: bigint, denominator: bigint): Exact {
  if (denominator === 0n) {
    throw new RangeError('an exact value cannot have a zero denominator');
  }
  const sign = denominator < 0n ? -1n : 1n;
  const signedNumerator = numerator * sign;
  const signedDenominator = denominator * sign;
  if (signedNumerator === 0n) return ZERO;
  const divisor = greatestCommonDivisor(signedNumerator, signedDenominator);
  return {
    numerator: signedNumerator / divisor,
    denominator: signedDenominator / divisor,
  };
}

/** An integer as an exact value. */
export function fromInteger(value: bigint): Exact {
  return normalise(value, 1n);
}

/** The product of the first `count` powers of ten, as a bigint. */
function powerOfTen(count: number): bigint {
  return 10n ** BigInt(count);
}

/**
 * Reads a decimal (`18.5`, `-0.25`, `20`) or an exact fraction (`2/3`, `-7/2`).
 *
 * Returns `null` rather than throwing: the caller decides whether a malformed mark is a
 * validation issue. Exponents are deliberately not accepted - a mark is entered as written.
 */
export function parseExact(text: string): Exact | null {
  if (typeof text !== 'string') return null;
  const decimal = DECIMAL.exec(text);
  if (decimal) {
    const sign = decimal[1] === '-' ? -1n : 1n;
    const whole = decimal[2];
    const fraction = decimal[3] ?? '';
    const digits = BigInt(`${whole}${fraction}`);
    return normalise(sign * digits, powerOfTen(fraction.length));
  }
  const ratio = FRACTION.exec(text);
  if (ratio) {
    const sign = ratio[1] === '-' ? -1n : 1n;
    const denominator = BigInt(ratio[3]);
    if (denominator === 0n) return null;
    return normalise(sign * BigInt(ratio[2]), denominator);
  }
  return null;
}

/** True when the value has a finite decimal expansion. */
export function isTerminating(value: Exact): boolean {
  let rest = value.denominator;
  while (rest % 2n === 0n) rest /= 2n;
  while (rest % 5n === 0n) rest /= 5n;
  return rest === 1n;
}

/**
 * The canonical text of an exact value: the shortest exact decimal when the value terminates
 * (`18.5`, `0.75`), otherwise the reduced fraction (`2/3`). `parseExact` reads both back.
 */
export function formatExact(value: Exact): string {
  const { numerator, denominator } = value;
  if (numerator === 0n) return '0';
  let rest = denominator;
  let twos = 0;
  let fives = 0;
  while (rest % 2n === 0n) {
    rest /= 2n;
    twos += 1;
  }
  while (rest % 5n === 0n) {
    rest /= 5n;
    fives += 1;
  }
  if (rest !== 1n) return `${numerator}/${denominator}`;

  const scale = Math.max(twos, fives);
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const scaled = (magnitude * powerOfTen(scale)) / denominator;
  const digits = scaled.toString().padStart(scale + 1, '0');
  const split = digits.length - scale;
  const whole = digits.slice(0, split);
  const fraction = scale === 0 ? '' : digits.slice(split).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction === '' ? '' : `.${fraction}`}`;
}

/** Whether the rounding of the magnitude at `quotient` with `remainder` moves it up by one. */
function roundsAwayFromZero(
  quotient: bigint,
  remainder: bigint,
  denominator: bigint,
  mode: RoundingMode
): boolean {
  if (remainder === 0n) return false;
  switch (mode) {
    case 'up':
      return true;
    case 'down':
      return false;
    case 'half_up':
      return remainder * 2n >= denominator;
    case 'half_down':
      return remainder * 2n > denominator;
    case 'half_even':
      return remainder * 2n > denominator || (remainder * 2n === denominator && quotient % 2n === 1n);
  }
}

/**
 * Rounds to `precision` decimal places, exactly.
 *
 * `half_up` and `half_down` break a tie away from and towards zero; `half_even` picks the
 * even digit (banker's rounding); `up` and `down` move away from and towards zero. The sign is
 * carried through the magnitude, so negative values round symmetrically.
 */
export function roundExact(value: Exact, precision: number, mode: RoundingMode): Exact {
  if (!Number.isInteger(precision) || precision < 0 || precision > MAX_PRECISION) {
    throw new RangeError(`precision must be an integer between 0 and ${MAX_PRECISION}`);
  }
  const factor = powerOfTen(precision);
  const negative = value.numerator < 0n;
  const magnitude = negative ? -value.numerator : value.numerator;
  const scaled = magnitude * factor;
  const quotient = scaled / value.denominator;
  const remainder = scaled % value.denominator;
  const step = roundsAwayFromZero(quotient, remainder, value.denominator, mode) ? 1n : 0n;
  const rounded = quotient + step;
  return normalise(negative ? -rounded : rounded, factor);
}

/**
 * Rounds and prints with exactly `precision` decimal places (`1.5` at 2 -> `1.50`).
 *
 * This is the only function that produces a fixed-width decimal; everything else keeps the
 * canonical exact text, so no display rule leaks into the arithmetic.
 */
export function formatExactFixed(value: Exact, precision: number, mode: RoundingMode): string {
  const rounded = roundExact(value, precision, mode);
  const factor = powerOfTen(precision);
  const scaled = (rounded.numerator * factor) / rounded.denominator;
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled).toString().padStart(precision + 1, '0');
  const split = digits.length - precision;
  const whole = digits.slice(0, split);
  const fraction = precision === 0 ? '' : `.${digits.slice(split)}`;
  return `${negative ? '-' : ''}${whole}${fraction}`;
}

export function addExact(left: Exact, right: Exact): Exact {
  return normalise(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

export function subtractExact(left: Exact, right: Exact): Exact {
  return normalise(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

export function multiplyExact(left: Exact, right: Exact): Exact {
  return normalise(left.numerator * right.numerator, left.denominator * right.denominator);
}

export function divideExact(left: Exact, right: Exact): Exact {
  if (right.numerator === 0n) {
    throw new RangeError('an exact value cannot be divided by zero');
  }
  return normalise(left.numerator * right.denominator, left.denominator * right.numerator);
}

export function negateExact(value: Exact): Exact {
  return value.numerator === 0n ? ZERO : { numerator: -value.numerator, denominator: value.denominator };
}

/** -1, 0 or 1 as `left` is less than, equal to or greater than `right`. */
export function compareExact(left: Exact, right: Exact): -1 | 0 | 1 {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  if (difference < 0n) return -1;
  if (difference > 0n) return 1;
  return 0;
}

export function sumExact(values: readonly Exact[]): Exact {
  return values.reduce(addExact, ZERO);
}

export function isZeroExact(value: Exact): boolean {
  return value.numerator === 0n;
}

export function isNegativeExact(value: Exact): boolean {
  return value.numerator < 0n;
}

/** The value as an integer, or `null` when it is not a whole number. */
export function toIntegerExact(value: Exact): bigint | null {
  return value.denominator === 1n ? value.numerator : null;
}
