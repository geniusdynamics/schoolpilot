// ABOUTME: The copy-with-uplift, proven exact: a percentage and a per-item absolute change applied
// ABOUTME: through the money module with the explicit half-up rule, and every malformed uplift refused.

import { describe, expect, it } from 'vitest';

import { asId } from '@/domain/ids';
import { fromMajor, fromMinor, toDecimalString } from '@/domain/money';

import { isScheduleError } from '../errors';
import { UPLIFT_ROUNDING, percentToBasisPoints, upliftAmount, upliftCells, upliftLine } from '../uplift';
import type { ResolvedLine, ScheduleCellInput } from '../types';

const TUITION = asId<'fee_item'>('00000000-0000-7000-8000-0000000000f1');
const ACTIVITY = asId<'fee_item'>('00000000-0000-7000-8000-0000000000f2');

function resolvedLine(feeItemId: typeof TUITION, major: string): ResolvedLine {
  return {
    feeItemId,
    amount: fromMajor(major, 'KES'),
    mandatory: true,
    frequency: 'per_term',
    dueDates: [],
    installmentPlanId: null,
    prorationRule: 'full',
  };
}

describe('the percentage uplift', () => {
  it('rounds half up, the rule the module documents', () => {
    expect(UPLIFT_ROUNDING).toBe('half_up');
  });

  it('is exact when the percentage divides the amount', () => {
    // 6,000.00 × 7.5% = 450.00 exactly.
    expect(toDecimalString(upliftAmount(fromMajor('6000', 'KES'), TUITION, { percent: 7.5 }))).toBe('6450.00');
    // 5,500.00 × 10% = 550.00 exactly.
    expect(toDecimalString(upliftAmount(fromMajor('5500', 'KES'), TUITION, { percent: 10 }))).toBe('6050.00');
  });

  it('rounds a fraction of a minor unit half up', () => {
    // 0.10 KES uplifted by 5% is 0.105 minor units — an exact half, so half-up rounds away from
    // zero to 0.11.
    expect(toDecimalString(upliftAmount(fromMinor(10, 'KES'), TUITION, { percent: 5 }))).toBe('0.11');
    // The same amount with a caller-named half-down rule gives 0.10.
    expect(
      toDecimalString(upliftAmount(fromMinor(10, 'KES'), TUITION, { percent: 5, percentRounding: 'half_down' }))
    ).toBe('0.10');
    // 1,000.01 × 5% = 1,050.0105, so the fraction is below a half and rounds down to 1,050.01.
    expect(upliftAmount(fromMajor('1000.01', 'KES'), TUITION, { percent: 5 })).toEqual({
      amount_minor: 105_001,
      currency: 'KES',
    });
  });
});

describe('the per-item absolute change', () => {
  it('is added after the percentage, and only to the item it names', () => {
    const uplift = { percent: 10, fixed: { [ACTIVITY]: fromMajor('250', 'KES') } };
    expect(toDecimalString(upliftAmount(fromMajor('6000', 'KES'), TUITION, uplift))).toBe('6600.00');
    expect(toDecimalString(upliftAmount(fromMajor('1000', 'KES'), ACTIVITY, uplift))).toBe('1350.00');
  });

  it('refuses a delta in a currency the line is not in', () => {
    expect(() =>
      upliftAmount(fromMajor('1000', 'KES'), TUITION, { fixed: { [TUITION]: fromMajor('10', 'USD') } })
    ).toThrowError(/but the line is in KES/);
  });
});

describe('malformed uplifts', () => {
  const codes = (run: () => unknown): string => {
    try {
      run();
    } catch (error) {
      if (isScheduleError(error)) return error.code;
      throw error;
    }
    throw new Error('expected a refusal');
  };

  it('refuses a negative or non-finite percentage', () => {
    expect(codes(() => percentToBasisPoints(-1))).toBe('uplift_invalid');
    expect(codes(() => percentToBasisPoints(Number.POSITIVE_INFINITY))).toBe('uplift_invalid');
  });

  it('refuses a percentage with more than two decimals', () => {
    expect(codes(() => percentToBasisPoints(1.234))).toBe('uplift_invalid');
    expect(percentToBasisPoints(1.23)).toBe(123);
  });
});

describe('copying a version with an uplift', () => {
  it('raises every line of every cell and leaves the rest alone', () => {
    const cells: readonly ScheduleCellInput[] = [
      {
        levelId: asId<'level'>('00000000-0000-7000-8000-0000000000a1'),
        residence: 'day',
        lines: [
          { feeItemId: TUITION, amount: fromMajor('6000', 'KES'), mandatory: true, frequency: 'per_term', prorationRule: 'full' },
          { feeItemId: ACTIVITY, amount: fromMajor('1000', 'KES'), mandatory: true, frequency: 'per_term', prorationRule: 'full' },
        ],
      },
    ];
    const [cell] = upliftCells(cells, { percent: 7.5 });
    expect(cell.lines.map((entry) => toDecimalString(entry.amount))).toEqual(['6450.00', '1075.00']);
    // The source is untouched: the copy is a value, not a mutation.
    expect(toDecimalString(cells[0].lines[0].amount)).toBe('6000.00');
  });

  it('copies a resolved line with the uplift applied', () => {
    const copy = upliftLine(resolvedLine(TUITION, '6000'), { percent: 100 });
    expect(toDecimalString(copy.amount)).toBe('12000.00');
    expect(copy.feeItemId).toBe(TUITION);
  });
});
