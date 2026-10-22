// ABOUTME: Table tests for the currency table: every entry is well formed, the exponents the
// ABOUTME: acceptance names are right (UGX has no decimals, KWD has three), the currencies the
// ABOUTME: packs and the spec imply are present, and an unknown code is refused rather than defaulted.

import { describe, expect, it } from 'vitest';

import {
  CURRENCY_CODES,
  MoneyError,
  currencyDecimals,
  currencyDisplayDecimals,
  currencyLocale,
  getCurrency,
  isCurrencyCode,
} from '..';

/** The exponents spec 05 §1 names, as [code, decimals]. */
const SPEC_EXPONENTS: ReadonlyArray<readonly [string, number]> = [
  ['KES', 2],
  ['UGX', 0],
  ['TZS', 2],
  ['RWF', 0],
  ['NGN', 2],
  ['GHS', 2],
  ['ZAR', 2],
  ['USD', 2],
  ['EUR', 2],
  ['GBP', 2],
  ['XOF', 0],
  ['XAF', 0],
];

/** The currencies the curriculum packs and spec 03's appendices name. */
const PACK_CURRENCIES = [
  'KES',
  'GBP',
  'UGX',
  'TZS',
  'RWF',
  'NGN',
  'GHS',
  'ZAR',
  'ZMW',
  'MWK',
  'ZWG',
  'BWP',
  'NAD',
  'ETB',
  'EGP',
  'MAD',
  'MZN',
  'AOA',
  'SDG',
  'SSP',
  'SOS',
  'CDF',
  'GNF',
  'XOF',
  'XAF',
];

describe('the currency table', () => {
  it('holds every code once, with a well-formed entry', () => {
    expect(CURRENCY_CODES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(CURRENCY_CODES).size).toBe(CURRENCY_CODES.length);

    for (const code of CURRENCY_CODES) {
      const definition = getCurrency(code);
      expect(definition.code, `${code} is keyed by its own code`).toBe(code);
      expect(Number.isInteger(definition.decimals), `${code} decimals is an integer`).toBe(true);
      expect(definition.decimals, `${code} decimals is an exponent the table supports`).toBeGreaterThanOrEqual(0);
      expect(definition.decimals).toBeLessThanOrEqual(3);
      expect(definition.symbol.length, `${code} has a symbol`).toBeGreaterThan(0);
      expect(definition.name.length, `${code} has a name`).toBeGreaterThan(0);
      expect(definition.locale, `${code} has a BCP-47 locale`).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      if (definition.displayDecimals !== undefined) {
        expect(definition.displayDecimals).toBeLessThanOrEqual(definition.decimals);
      }
    }
  });

  it('gives the exponents the spec names', () => {
    for (const [code, decimals] of SPEC_EXPONENTS) {
      expect(isCurrencyCode(code), `${code} is in the table`).toBe(true);
      if (!isCurrencyCode(code)) continue;
      expect(currencyDecimals(code), `${code} has ${decimals} decimals`).toBe(decimals);
    }
  });

  it('holds the currencies the packs and the spec imply', () => {
    for (const code of PACK_CURRENCIES) {
      expect(isCurrencyCode(code), `${code} is in the table`).toBe(true);
    }
  });

  it('gives UGX no decimals, which is the acceptance case', () => {
    expect(currencyDecimals('UGX')).toBe(0);
    expect(currencyDisplayDecimals('UGX')).toBe(0);
    expect(getCurrency('UGX').decimals).toBe(0);
  });

  it('shows the Tanzanian shilling in whole shillings by default, at an exponent of 2', () => {
    expect(currencyDecimals('TZS')).toBe(2);
    expect(currencyDisplayDecimals('TZS')).toBe(0);
  });

  it('carries an exponent beyond 0 and 2', () => {
    expect(currencyDecimals('KWD')).toBe(3);
    expect(currencyDecimals('JPY')).toBe(0);
  });

  it('names the locale a code is displayed in', () => {
    expect(currencyLocale('KES')).toBe('en-KE');
    expect(currencyLocale('UGX')).toBe('en-UG');
    expect(currencyLocale('GBP')).toBe('en-GB');
  });

  it('refuses a code it does not hold, rather than defaulting one', () => {
    expect(isCurrencyCode('kes')).toBe(false);
    expect(isCurrencyCode('XYZ')).toBe(false);
    expect(isCurrencyCode('')).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
    expect(isCurrencyCode(42)).toBe(false);

    for (const bad of ['XYZ', 'kes', '']) {
      try {
        getCurrency(bad);
        throw new Error(`expected getCurrency("${bad}") to throw`);
      } catch (error) {
        expect(error).toBeInstanceOf(MoneyError);
        expect((error as MoneyError).code).toBe('unknown_currency');
      }
    }
  });
});
