// ABOUTME: The proration rules, proven exact: the fraction each rule bills for a mid-period joiner
// ABOUTME: and a leaver, and the one rounding rule every amount is rounded by.

import { describe, expect, it } from 'vitest';

import { fromMinor, toDecimalString, type Money } from '@/domain/money';

import {
  daysInclusive,
  describeProration,
  prorateAmount,
  prorationRecord,
  PRORATION_ROUNDING,
  type ProrationWindow,
} from '../proration';

/** A 120-day period: 2027-01-01..2027-04-30 (31 + 28 + 31 + 30). */
const PERIOD = { periodStart: '2027-01-01', periodEnd: '2027-04-30' } as const;

const window = (enrolledFrom: string, enrolledTo: string): ProrationWindow => ({
  ...PERIOD,
  enrolledFrom,
  enrolledTo,
});

const money = (minor: number): Money => fromMinor(minor, 'KES');

describe('the days a window counts', () => {
  it('counts both ends, and nothing when the range is empty', () => {
    expect(daysInclusive('2027-01-01', '2027-01-01')).toBe(1);
    expect(daysInclusive('2027-01-01', '2027-04-30')).toBe(120);
    expect(daysInclusive('2027-04-30', '2027-01-01')).toBe(0);
  });
});

describe('the proration rules', () => {
  it('bills `full` whole, whatever the window', () => {
    const record = prorationRecord('full', window('2027-03-10', '2027-04-30'));
    expect(record.numerator).toBe(1);
    expect(record.denominator).toBe(1);
    expect(toDecimalString(prorateAmount(money(600_000), record))).toBe('6000.00');
  });

  it('bills `none` nothing', () => {
    const record = prorationRecord('none', window('2027-02-01', '2027-04-30'));
    expect(prorateAmount(money(600_000), record).amount_minor).toBe(0);
  });

  it('bills `pro_rata_days` the days enrolled over the days of the period', () => {
    // Joins 2027-02-01: 28 + 31 + 30 = 89 of 120 days. 6,000.00 × 89/120 = 4,450.00 exactly.
    const record = prorationRecord('pro_rata_days', window('2027-02-01', '2027-04-30'));
    expect(record.numerator).toBe(89);
    expect(record.denominator).toBe(120);
    expect(toDecimalString(prorateAmount(money(600_000), record))).toBe('4450.00');

    // Leaves 2027-03-15: 31 + 28 + 15 = 74 of 120 days. 6,000.00 × 74/120 = 3,700.00 exactly.
    const left = prorationRecord('pro_rata_days', window('2027-01-01', '2027-03-15'));
    expect(left.numerator).toBe(74);
    expect(toDecimalString(prorateAmount(money(600_000), left))).toBe('3700.00');
  });

  it('rounds a fraction of a minor unit half up, and says so', () => {
    // 5,500.00 × 89/120 = 4,079.1666…, which is not a whole minor unit: half up gives 4,079.17.
    const record = prorationRecord('pro_rata_days', window('2027-02-01', '2027-04-30'));
    expect(record.rounding).toBe('half_up');
    expect(PRORATION_ROUNDING).toBe('half_up');
    expect(toDecimalString(prorateAmount(money(550_000), record))).toBe('4079.17');
  });

  it('bills `pro_rata_weeks` whole weeks only', () => {
    // 120 days is 17 whole weeks; 89 days is 12. 6,000.00 × 12/17 = 4,235.294…, half up 4,235.29.
    const record = prorationRecord('pro_rata_weeks', window('2027-02-01', '2027-04-30'));
    expect(record.numerator).toBe(12);
    expect(record.denominator).toBe(17);
    expect(toDecimalString(prorateAmount(money(600_000), record))).toBe('4235.29');
  });

  it('bills `from_half_term` in full up to the midpoint and half after it', () => {
    // The midpoint of the 120-day period is 2027-03-02.
    const before = prorationRecord('from_half_term', window('2027-02-01', '2027-04-30'));
    expect(before.numerator).toBe(2);
    expect(toDecimalString(prorateAmount(money(600_000), before))).toBe('6000.00');

    const after = prorationRecord('from_half_term', window('2027-03-10', '2027-04-30'));
    expect(after.numerator).toBe(1);
    expect(after.denominator).toBe(2);
    expect(toDecimalString(prorateAmount(money(600_000), after))).toBe('3000.00');
  });

  it('clips a window that runs outside the period', () => {
    const record = prorationRecord(
      'pro_rata_days',
      window('2026-09-01', '2027-12-31')
    );
    expect(record.enrolledFrom).toBe('2027-01-01');
    expect(record.enrolledTo).toBe('2027-04-30');
    expect(record.numerator).toBe(120);
  });

  it('bills nothing when the learner was never enrolled inside the period', () => {
    const record = prorationRecord('pro_rata_days', window('2027-06-01', '2027-07-01'));
    expect(record.numerator).toBe(0);
    expect(prorateAmount(money(600_000), record).amount_minor).toBe(0);
  });

  it('describes each rule for the reason a bursar reads', () => {
    expect(describeProration(prorationRecord('pro_rata_days', window('2027-02-01', '2027-04-30')))).toBe(
      'prorated 89/120 days of the 120-day period'
    );
    expect(describeProration(prorationRecord('pro_rata_weeks', window('2027-02-01', '2027-04-30')))).toBe(
      'prorated 12/17 whole weeks of the 120-day period'
    );
    expect(describeProration(prorationRecord('from_half_term', window('2027-03-10', '2027-04-30')))).toBe(
      'billed at half: the learner joined after half term'
    );
  });
});
