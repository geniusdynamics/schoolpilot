// ABOUTME: Reading one scalar field of an aggregation definition: turning a pack's JSON string or
// ABOUTME: number into an exact decimal, and refusing a precision, weight, multiplier or divisor the
// ABOUTME: operator could not honour.

import { MAX_PRECISION, ONE, compareExact, parseExact } from '../engine';
import type { AggregationIssue, AggregationIssueCode } from './types';

export function issue(code: AggregationIssueCode, path: string, detail: string): AggregationIssue {
  return { code, path, detail };
}

/** A non-empty string, or null when the value cannot be a code. */
export function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * The shortest decimal a JSON number round-trips through (`2`, `0.1`, `1e-7` expanded).
 *
 * JavaScript prints a number as the shortest text that parses back to the same value, which is
 * exactly the decimal the pack author wrote. Expanding an exponent by string surgery keeps the
 * conversion exact: no arithmetic happens on the number itself.
 */
function decimalOfNumber(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));
  if (!match) return null;
  const sign = match[1];
  const whole = match[2];
  const fraction = match[3] ?? '';
  const exponent = match[4] === undefined ? 0 : Number(match[4]);
  const digits = `${whole}${fraction}`;
  const point = whole.length + exponent;
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

/**
 * A weight, multiplier or divisor as exact text.
 *
 * A pack writes these as JSON numbers and a caller may hold them as decimal strings; both are read
 * exactly, the number through its shortest decimal form rather than through binary floating point.
 */
export function exactText(value: unknown): string | null {
  if (typeof value === 'number') {
    const decimal = decimalOfNumber(value);
    return decimal !== null && parseExact(decimal) !== null ? decimal : null;
  }
  const text = textOf(value);
  return text !== null && parseExact(text) !== null ? text : null;
}

export function readPrecision(value: unknown, path: string, issues: AggregationIssue[]): number | null {
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_PRECISION) {
    issues.push(issue('invalid_precision', path, `precision must be an integer between 0 and ${MAX_PRECISION}`));
    return null;
  }
  return value;
}

/** `weights`: the coefficient of each area, or an explicit map of area code to weight. */
export function readWeights(
  raw: unknown,
  issues: AggregationIssue[]
): 'coefficient' | Readonly<Record<string, string>> | null {
  if (raw === 'coefficient') return 'coefficient';
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    issues.push(issue('invalid_weights', 'weights', 'weights must be "coefficient" or a map of area code to weight'));
    return null;
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) {
    issues.push(issue('invalid_weights', 'weights', 'an explicit weights map must name at least one area'));
    return null;
  }
  const weights: Record<string, string> = {};
  for (const [code, value] of entries) {
    const text = exactText(value);
    const parsed = text === null ? null : parseExact(text);
    if (text === null || parsed === null || parsed.numerator < 0n) {
      issues.push(issue('invalid_weight', `weights.${code}`, 'a weight must be a non-negative decimal'));
      return null;
    }
    weights[code] = text;
  }
  return weights;
}

/** `multipliers`: learning-area code to a multiplier of at least one. */
export function readMultipliers(raw: unknown, issues: AggregationIssue[]): Readonly<Record<string, string>> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    issues.push(issue('invalid_multiplier', 'multipliers', 'multipliers must be a map of area code to multiplier'));
    return null;
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) {
    issues.push(issue('invalid_multiplier', 'multipliers', 'a multipliers map must name at least one area'));
    return null;
  }
  const multipliers: Record<string, string> = {};
  for (const [code, value] of entries) {
    const text = exactText(value);
    const parsed = text === null ? null : parseExact(text);
    if (text === null || parsed === null || compareExact(parsed, ONE) < 0) {
      issues.push(issue('invalid_multiplier', `multipliers.${code}`, 'a multiplier must be a decimal of at least one'));
      return null;
    }
    multipliers[code] = text;
  }
  return multipliers;
}

/** `divisor`: a number greater than zero, or the total of the multipliers actually applied. */
export function readDivisor(raw: unknown, issues: AggregationIssue[]): string | null {
  if (raw === 'sum_of_multipliers') return raw;
  const text = exactText(raw);
  const parsed = text === null ? null : parseExact(text);
  if (text === null || parsed === null || parsed.numerator <= 0n) {
    issues.push(
      issue('invalid_divisor', 'divisor', 'divisor must be "sum_of_multipliers" or a decimal greater than zero')
    );
    return null;
  }
  return text;
}
