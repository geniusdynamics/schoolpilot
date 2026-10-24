// ABOUTME: Pins locale money printing: it goes through the money module, a locale changes separators
// ABOUTME: and symbol placement but never the value or the currency's decimals, and a float amount is
// ABOUTME: refused outright.

import { describe, expect, it } from 'vitest';

import { MoneyError, type Money } from '@/domain/money';

import { formatLocaleMoney, formatLocaleMoneyCompact, localeCurrency, moneyInputSeparators } from '../currency';
import { toAsciiDigits } from '../numbers';

const spaced = (text: string): string => text.replace(/[\u00a0\u202f\u2009]/g, ' ');
const clean = (text: string): string =>
  text.replace(/[\u200e\u200f\u061c]/g, '').replace(/[\u00a0\u202f\u2009]/g, ' ');

const kes = (amountMinor: number): Money => ({ amount_minor: amountMinor, currency: 'KES' });

describe('formatLocaleMoney', () => {
  it('prints Kenyan shillings the Kenyan way and the French way', () => {
    expect(clean(formatLocaleMoney(kes(123456), 'en-KE'))).toBe('Ksh 1,234.56');
    expect(clean(spaced(formatLocaleMoney(kes(123456), 'fr-FR')))).toBe('1 234,56 KES');
  });

  it('prints Arabic with Arabic-Indic digits', () => {
    expect(clean(spaced(formatLocaleMoney(kes(123456), 'ar-EG')))).toBe('١٬٢٣٤٫٥٦ KES');
  });

  it('keeps the currency table precision: UGX has none, KWD has three', () => {
    // UGX has no subunit, so minor units are whole shillings and none are printed.
    expect(clean(formatLocaleMoney({ amount_minor: 123456, currency: 'UGX' }, 'en-KE'))).toBe(
      'UGX 123,456'
    );
    expect(clean(formatLocaleMoney({ amount_minor: 123456, currency: 'KWD' }, 'en-KE'))).toBe(
      'KWD 123.456'
    );
  });

  it('lets no locale round an amount that a double could not hold', () => {
    const huge = kes(9007199254740991);
    const kenyan = formatLocaleMoney(huge, 'en-KE');
    const french = formatLocaleMoney(huge, 'fr-FR');

    expect(clean(kenyan)).toBe('Ksh 90,071,992,547,409.91');
    expect(spaced(french)).toBe('90 071 992 547 409,91 KES');
    const digits = (text: string) => toAsciiDigits(text).replace(/\D/g, '');
    expect(digits(kenyan)).toBe('9007199254740991');
    expect(digits(french)).toBe('9007199254740991');
  });

  it('refuses a plain number instead of turning it into a float amount', () => {
    expect(() => formatLocaleMoney(1234 as unknown as Money, 'en-KE')).toThrow(MoneyError);
    expect(() => formatLocaleMoney(1234 as unknown as Money, 'en-KE')).toThrow(
      /minor units plus currency/
    );
  });

  it('renders the placeholder for a missing amount', () => {
    expect(formatLocaleMoney(null)).toBe('—');
    expect(formatLocaleMoney(undefined, 'fr-FR')).toBe('—');
  });

  it('has a compact form', () => {
    expect(clean(formatLocaleMoneyCompact(kes(125000000), 'en-KE'))).toBe('Ksh 1.3M');
  });
});

describe('the locale currency and input separators', () => {
  it('names the currency a locale defaults new amounts to', () => {
    expect(localeCurrency('fr-FR')).toBe('EUR');
    expect(localeCurrency('en-KE')).toBe('KES');
    expect(localeCurrency('ar')).toBeNull();
  });

  it('gives MoneyField the separators of the locale', () => {
    expect(moneyInputSeparators('fr-FR')).toEqual({
      decimalSeparator: ',',
      groupSeparator: '\u202f',
    });
    expect(moneyInputSeparators('ar-EG')).toEqual({
      decimalSeparator: '٫',
      groupSeparator: '٬',
    });
  });
});
