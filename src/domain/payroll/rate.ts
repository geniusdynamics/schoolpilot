// ABOUTME: Exact rates for payroll: a rate is read from decimal text such as "0.0275" into a fraction
// ABOUTME: of whole numbers, and applied to a money amount with the rounding mode the pack names.

import { multiplyRational, type Money, type RoundingMode } from '@/domain/money';

import type { Rate } from './types';

const RATE_TEXT = /^(0|1)(?:\.(\d+))?$/;

/** The rate a decimal-fraction text names, or null when the text is not one. */
export function parseRate(text: string): Rate | null {
  const match = RATE_TEXT.exec(text);
  if (match === null) return null;
  const [, whole, fraction = ''] = match;
  const rate: Rate = {
    numerator: BigInt(`${whole}${fraction}`),
    denominator: 10n ** BigInt(fraction.length),
  };
  return rate.numerator > rate.denominator ? null : rate;
}

/** The share of an amount a rate names, rounded once to a whole minor unit by `mode`. */
export function applyRate(amount: Money, rate: Rate, mode: RoundingMode): Money {
  return multiplyRational(amount, rate.numerator, rate.denominator, mode);
}

/** Whether a rate is zero. */
export function isZeroRate(rate: Rate): boolean {
  return rate.numerator === 0n;
}

function gcd(left: bigint, right: bigint): bigint {
  return right === 0n ? left : gcd(right, left % right);
}

/** The smallest denominator every rate divides into, so fractions of several rates can be summed exactly. */
export function commonDenominator(rates: readonly Rate[]): bigint {
  return rates.reduce((common, rate) => (common / gcd(common, rate.denominator)) * rate.denominator, 1n);
}
