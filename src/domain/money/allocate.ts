// ABOUTME: Largest-remainder allocation: splits a total across weighted parts so the parts sum to
// ABOUTME: the total exactly, with a deterministic tie-break and integer division only. This is
// ABOUTME: what fee allocation, household splits and proration use.

import { getCurrency } from './currency';
import { MoneyError } from './errors';
import { fromMinor, toMinorUnits, type Money } from './money';

const WEIGHT_TEXT = /^([+-]?)(\d*)(?:\.(\d*))?$/;

/**
 * Reads the weights as whole numbers over a common scale.
 *
 * A weight may be a whole number (`1`, `2`) or a decimal share (`33.33`); each is read as the
 * exact decimal it is written as, then scaled by the power of ten that lifts the whole list to
 * integers. Reading a decimal weight as a float and scaling by 100 would drift; reading it as
 * text cannot. A negative weight is refused: a part may not be allocated a negative share.
 */
function scaleWeights(weights: readonly number[]): bigint[] {
  const parsed = weights.map((weight, index) => {
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
      throw new MoneyError(
        'invalid_weight',
        `the weight of part ${index} must be a non-negative finite number; got ${String(weight)}`
      );
    }
    const text = String(weight);
    if (text.includes('e') || text.includes('E')) {
      throw new MoneyError(
        'invalid_weight',
        `the weight of part ${index} (${text}) is scientific notation; pass it as a decimal`
      );
    }
    const match = WEIGHT_TEXT.exec(text);
    const whole = match?.[2] ?? '0';
    const fraction = match?.[3] ?? '';
    return { digits: `${whole === '' ? '0' : whole}${fraction}`, fraction: fraction.length };
  });
  const scale = parsed.reduce(
    (widest, weight) => (weight.fraction > widest ? weight.fraction : widest),
    0
  );
  return parsed.map(
    (weight) => BigInt(weight.digits) * 10n ** BigInt(scale - weight.fraction)
  );
}

/**
 * Splits a total across weights with the largest-remainder method.
 *
 * The method: each part takes the whole minor units of its exact share (`total * weight / sum`),
 * and the minor units left over by the floors go one each to the parts with the largest
 * remainders. The parts therefore always sum to the total exactly — the invariant this exists
 * for — and no part is negative when the total is not.
 *
 * The tie-break is deterministic: parts with equal remainders are served in index order, so the
 * same total and the same weights always produce the same parts, and scaling every weight by the
 * same positive factor leaves the result unchanged (the ratios, and so the remainders' order, are
 * the same). A total of zero gives every part zero. Weights that are all zero are refused for a
 * non-zero total, because no part can take a share of it.
 */
export function allocate(total: Money, weights: readonly number[]): Money[] {
  const currency = total.currency;
  getCurrency(currency);
  const units = scaleWeights(weights);

  if (units.length === 0) {
    if (total.amount_minor === 0) return [];
    throw new MoneyError('invalid_weight', 'a non-zero total cannot be allocated across no parts');
  }

  const weightSum = units.reduce((running, unit) => running + unit, 0n);
  if (weightSum === 0n) {
    if (total.amount_minor === 0) return units.map(() => fromMinor(0, currency));
    throw new MoneyError(
      'invalid_weight',
      'the weights of an allocation sum to zero, so no part can take a share of a non-zero total'
    );
  }

  const negative = total.amount_minor < 0;
  const magnitude = negative ? -BigInt(total.amount_minor) : BigInt(total.amount_minor);
  const parts = units.map((unit) => (magnitude * unit) / weightSum);
  const remainders = units.map((unit) => (magnitude * unit) % weightSum);

  // The floors leave fewer units than there are parts (each remainder is below the weight sum),
  // so the largest remainders take the rest one unit at a time.
  let left = magnitude - parts.reduce((running, part) => running + part, 0n);
  const order = units
    .map((_unit, index) => index)
    .sort((first, second) => {
      if (remainders[second] > remainders[first]) return 1;
      if (remainders[second] < remainders[first]) return -1;
      return first - second;
    });
  for (let position = 0; position < order.length && left > 0n; position += 1) {
    parts[order[position]] += 1n;
    left -= 1n;
  }

  return parts.map((part) => fromMinor(toMinorUnits(negative ? -part : part), currency));
}

/** Splits a total into `parts` equal shares, the odd minor units going to the earliest parts. */
export function allocateEqually(total: Money, parts: number): Money[] {
  if (!Number.isSafeInteger(parts) || parts < 0) {
    throw new MoneyError(
      'invalid_weight',
      `the number of parts must be a whole number of zero or more; got ${String(parts)}`
    );
  }
  return allocate(total, Array.from({ length: parts }, () => 1));
}
