// ABOUTME: Guards the money arithmetic against a float: the files that add, scale and allocate must
// ABOUTME: hold no construct that coerces to a double or rounds one, and the only bigint-to-number
// ABOUTME: bridge is the one the module documents.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MODULE = path.resolve(__dirname, '..');

/** The files that do arithmetic; `format.ts` is the display boundary and `currency.ts` is a table. */
const ARITHMETIC_FILES = ['money.ts', 'allocate.ts'];

/** A construct that would put a double into the arithmetic. */
const FLOAT_CONSTRUCTS: ReadonlyArray<readonly [string, RegExp]> = [
  ['parseFloat', /parseFloat/],
  ['parseInt', /parseInt/],
  ['toFixed', /toFixed/],
  ['a Math call', /\bMath\./],
  ['a float scaling by a hundred', /[*/]\s*100(?!n)/],
  ['a float scaling by ten', /[*/]\s*10(?!n)/],
];

describe('the money arithmetic holds no float', () => {
  it('uses no float-coercing or float-rounding construct', () => {
    for (const file of ARITHMETIC_FILES) {
      const source = fs.readFileSync(path.join(MODULE, file), 'utf8');
      for (const [name, pattern] of FLOAT_CONSTRUCTS) {
        expect(pattern.test(source), `${file} uses ${name}`).toBe(false);
      }
    }
  });

  it('builds a number from a bigint only through the documented bridge', () => {
    const money = fs.readFileSync(path.join(MODULE, 'money.ts'), 'utf8');
    // The bridge is `return Number(value);` inside `toMinorUnits`/`asAmountMinor`; no other
    // `Number(` call may appear, so no other place can turn an exact value into a double.
    expect([...money.matchAll(/Number\(/g)]).toHaveLength(1);
    expect(money).toContain('Number(value)');

    for (const file of ['allocate.ts', 'currency.ts']) {
      const source = fs.readFileSync(path.join(MODULE, file), 'utf8');
      expect([...source.matchAll(/Number\(/g)], `${file} bridges a bigint itself`).toHaveLength(0);
    }
  });

  it('does its division in bigint, never in a fraction of a minor unit', () => {
    const money = fs.readFileSync(path.join(MODULE, 'money.ts'), 'utf8');
    expect(money).toContain('BigInt(value.amount_minor)');
    expect(money).toContain('10n ** BigInt(scale)');
    const allocate = fs.readFileSync(path.join(MODULE, 'allocate.ts'), 'utf8');
    expect(allocate).toContain('10n ** BigInt(scale - weight.fraction)');
  });
});
