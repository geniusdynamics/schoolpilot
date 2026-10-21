// ABOUTME: Unit tests for the engine's exact arithmetic: decimal and fraction parsing, canonical
// ABOUTME: formatting, and every rounding mode at its tie and boundary.

import { describe, expect, it } from 'vitest';

import {
  MAX_PRECISION,
  compareExact,
  formatExact,
  formatExactFixed,
  isTerminating,
  parseExact,
  roundExact,
  sumExact,
  type RoundingMode,
} from '../exact';

const exact = (text: string) => {
  const value = parseExact(text);
  if (value === null) throw new Error(`the test fixture is not exact: ${text}`);
  return value;
};

describe('parseExact', () => {
  it('reads decimals and fractions exactly', () => {
    expect(parseExact('18.5')).toEqual({ numerator: 37n, denominator: 2n });
    expect(parseExact('-0.25')).toEqual({ numerator: -1n, denominator: 4n });
    expect(parseExact('20')).toEqual({ numerator: 20n, denominator: 1n });
    expect(parseExact('+3.0')).toEqual({ numerator: 3n, denominator: 1n });
    expect(parseExact('2/3')).toEqual({ numerator: 2n, denominator: 3n });
    expect(parseExact('-7/2')).toEqual({ numerator: -7n, denominator: 2n });
  });

  it('normalises zero and moves the sign to the numerator', () => {
    expect(parseExact('0.000')).toEqual({ numerator: 0n, denominator: 1n });
    expect(parseExact('0/5')).toEqual({ numerator: 0n, denominator: 1n });
    expect(parseExact('2/-3')).toBeNull();
  });

  it('refuses exponents, empty text and malformed decimals', () => {
    expect(parseExact('1e3')).toBeNull();
    expect(parseExact('')).toBeNull();
    expect(parseExact('18.')).toBeNull();
    expect(parseExact('.5')).toBeNull();
    expect(parseExact('1/0')).toBeNull();
    expect(parseExact('abc')).toBeNull();
  });
});

describe('formatExact', () => {
  it('prints a terminating value as its shortest decimal', () => {
    expect(formatExact(exact('18.50'))).toBe('18.5');
    expect(formatExact(exact('20'))).toBe('20');
    expect(formatExact(exact('0.125'))).toBe('0.125');
    expect(formatExact(exact('-0.5'))).toBe('-0.5');
    expect(formatExact(exact('0'))).toBe('0');
  });

  it('prints a non-terminating value as a reduced fraction', () => {
    expect(formatExact(exact('2/3'))).toBe('2/3');
    expect(formatExact(exact('6/7'))).toBe('6/7');
    expect(formatExact(exact('4/6'))).toBe('2/3');
    expect(isTerminating(exact('2/3'))).toBe(false);
    expect(isTerminating(exact('3/8'))).toBe(true);
  });

  it('round-trips through parseExact', () => {
    for (const text of ['18.5', '2/3', '0', '-7/2', '0.0001', '123456.789']) {
      const value = exact(text);
      const roundTripped = parseExact(formatExact(value));
      if (roundTripped === null) throw new Error(`cannot parse ${formatExact(value)}`);
      expect(compareExact(roundTripped, value)).toBe(0);
    }
  });

  it('prints a fixed number of decimal places when asked', () => {
    expect(formatExactFixed(exact('1.5'), 2, 'half_up')).toBe('1.50');
    expect(formatExactFixed(exact('2/3'), 3, 'half_up')).toBe('0.667');
    expect(formatExactFixed(exact('2'), 0, 'half_up')).toBe('2');
    expect(formatExactFixed(exact('-0.05'), 1, 'half_up')).toBe('-0.1');
  });
});

describe('roundExact', () => {
  const cases: readonly [string, number, RoundingMode, string][] = [
    ['6.5', 0, 'half_up', '7'],
    ['6.5', 0, 'half_even', '6'],
    ['6.5', 0, 'half_down', '6'],
    ['6.5', 0, 'up', '7'],
    ['6.5', 0, 'down', '6'],
    ['5.5', 0, 'half_up', '6'],
    ['5.5', 0, 'half_even', '6'],
    ['5.5', 0, 'half_down', '5'],
    ['5.4', 0, 'half_up', '5'],
    ['5.6', 0, 'half_down', '6'],
    ['-1.5', 0, 'half_up', '-2'],
    ['-2.5', 0, 'half_even', '-2'],
    ['-1.1', 0, 'up', '-2'],
    ['-1.9', 0, 'down', '-1'],
    ['2.345', 2, 'half_up', '2.35'],
    ['2.344', 2, 'half_up', '2.34'],
    ['1/3', 2, 'half_up', '0.33'],
    ['2/3', 2, 'half_up', '0.67'],
    ['1/8', 2, 'half_up', '0.13'],
    ['1/8', 2, 'half_even', '0.12'],
    ['1/8', 2, 'half_down', '0.12'],
    ['1/8', 2, 'up', '0.13'],
    ['1/8', 2, 'down', '0.12'],
    ['99.995', 2, 'half_up', '100'],
  ];

  it.each(cases)('rounds %s at %i places with %s to %s', (value, precision, mode, expected) => {
    expect(formatExact(roundExact(exact(value), precision, mode))).toBe(expected);
  });

  it('does not change a value that is already at the precision', () => {
    expect(formatExact(roundExact(exact('18.5'), 1, 'half_even'))).toBe('18.5');
    expect(formatExact(roundExact(exact('18'), 0, 'up'))).toBe('18');
  });

  it('rejects a precision outside the supported range', () => {
    expect(() => roundExact(exact('1'), -1, 'half_up')).toThrow(RangeError);
    expect(() => roundExact(exact('1'), MAX_PRECISION + 1, 'half_up')).toThrow(RangeError);
    expect(() => roundExact(exact('1'), 1.5, 'half_up')).toThrow(RangeError);
  });
});

describe('exact comparison and sums', () => {
  it('compares without converting to a float', () => {
    expect(compareExact(exact('1/3'), exact('0.33'))).toBe(1);
    expect(compareExact(exact('0.1'), exact('1/10'))).toBe(0);
    expect(compareExact(exact('-2'), exact('-1.99'))).toBe(-1);
    expect(compareExact(exact('6/7'), exact('6/7'))).toBe(0);
  });

  it('keeps a long sum exact', () => {
    const tenth = exact('0.1');
    const total = sumExact(Array.from({ length: 1000 }, () => tenth));
    expect(formatExact(total)).toBe('100');
  });
});
