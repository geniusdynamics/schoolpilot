// ABOUTME: Table tests for money display: a value renders with its currency's own decimals (UGX
// ABOUTME: with none, which is the acceptance case), a zero and a negative render, the number
// ABOUTME: overload reads major units, and an unknown currency is refused.
//
// The expected strings are what the ICU data of the runtime (Node 24) produces for each locale.
// ICU separates the symbol from the amount with a non-breaking space (U+00A0) in these locales,
// so the assertions normalise the space and check the digits, symbol, sign and decimal point,
// which are ours. A runtime with different ICU data fails these loudly rather than rendering
// something else.

import { describe, expect, it } from 'vitest';

import {
  MoneyError,
  NO_AMOUNT,
  formatMoney,
  formatMoneyCompact,
  fromMajor,
  fromMinor,
  toDecimalString,
  type CurrencyCode,
  type Money,
} from '..';

/** The rendered text with the locale's space normalised to a plain one. */
function render(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ');
}

describe('formatMoney renders a value with its currency decimals', () => {
  it('renders a 2-decimal currency with two decimals', () => {
    expect(render(formatMoney(fromMinor(150055, 'KES')))).toBe('Ksh 1,500.55');
    expect(render(formatMoney(fromMajor('1500.55', 'KES')))).toBe('Ksh 1,500.55');
    expect(render(formatMoney(fromMinor(123450, 'NGN')))).toBe('₦1,234.50');
  });

  it('renders UGX with no decimal point at all, which is the acceptance case', () => {
    const rendered = formatMoney(fromMinor(150000, 'UGX'));
    expect(render(rendered)).toBe('USh 150,000');
    expect(rendered).not.toContain('.');
    expect(render(formatMoney(fromMinor(1000000, 'UGX')))).toBe('USh 1,000,000');
  });

  it('renders a zero amount', () => {
    expect(render(formatMoney(fromMinor(0, 'KES')))).toBe('Ksh 0.00');
    expect(render(formatMoney(fromMinor(0, 'UGX')))).toBe('USh 0');
    expect(render(formatMoney(fromMinor(0, 'KWD')))).toBe('KWD 0.000');
  });

  it('renders a negative amount', () => {
    expect(render(formatMoney(fromMinor(-150005, 'KES')))).toBe('-Ksh 1,500.05');
    expect(render(formatMoney(fromMinor(-150000, 'UGX')))).toBe('-USh 150,000');
  });

  it('renders the Tanzanian shilling in whole shillings by default', () => {
    expect(render(formatMoney(fromMinor(150050, 'TZS')))).toBe('TSh 1,501');
    // The exponent is still 2, so the amount keeps its cents for arithmetic and storage.
    expect(toDecimalString(fromMinor(150050, 'TZS'))).toBe('1500.50');
  });

  it('renders a 3-decimal currency with three decimals', () => {
    expect(render(formatMoney(fromMinor(1234, 'KWD')))).toBe('KWD 1.234');
  });

  it('renders the largest amount the type holds, exactly', () => {
    expect(render(formatMoney(fromMinor(9007199254740991, 'KES')))).toBe('Ksh 90,071,992,547,409.91');
  });

  it('renders the exact decimal text, never a double, for a value a float would round', () => {
    expect(formatMoney(fromMinor(150055, 'KES'))).toBe(formatMoney(fromMajor('1500.55', 'KES')));
    expect(toDecimalString(fromMinor(150055, 'KES'))).toBe('1500.55');
  });

  it('reads a plain number as major units, the way the deprecated formatKES did', () => {
    expect(render(formatMoney(1500, 'KES'))).toBe('Ksh 1,500.00');
    expect(render(formatMoney(1500.55, 'KES'))).toBe('Ksh 1,500.55');
    expect(render(formatMoney(150000, 'UGX'))).toBe('USh 150,000');
    expect(render(formatMoney(0, 'KES'))).toBe('Ksh 0.00');
  });

  it('names the placeholder for a missing or unreadable amount', () => {
    expect(formatMoney(null, 'KES')).toBe(NO_AMOUNT);
    expect(formatMoney(undefined, 'KES')).toBe(NO_AMOUNT);
    expect(formatMoney(Number.NaN, 'KES')).toBe(NO_AMOUNT);
    expect(formatMoney(Number.POSITIVE_INFINITY, 'KES')).toBe(NO_AMOUNT);
    expect(NO_AMOUNT).toBe('—');
  });

  it('takes a locale the caller names over the currency default', () => {
    expect(render(formatMoney(fromMinor(150055, 'KES'), 'en-US'))).toBe('KES 1,500.55');
    expect(render(formatMoney(1500.55, 'KES', 'en-US'))).toBe('KES 1,500.55');
  });

  it('refuses a currency it does not hold', () => {
    expect(() => formatMoney(1500, 'XYZ' as unknown as CurrencyCode)).toThrow(MoneyError);
    expect(() => formatMoney({ amount_minor: 1500, currency: 'XYZ' } as unknown as Money)).toThrow(MoneyError);
    expect(() => formatMoney(1500, 'XYZ' as unknown as CurrencyCode)).toThrow(/not a currency of the table/);
  });
});

describe('formatMoneyCompact renders the tight-column form', () => {
  it('uses compact notation with one decimal at most', () => {
    expect(render(formatMoneyCompact(fromMinor(125000000, 'KES')))).toBe('Ksh 1.3M');
    expect(render(formatMoneyCompact(1250000, 'KES'))).toBe('Ksh 1.3M');
    expect(formatMoneyCompact(null, 'KES')).toBe(NO_AMOUNT);
  });
});
