// ABOUTME: Pins locale number and percentage formatting and parsing: the separators of en-GB, fr-FR
// ABOUTME: and ar-EG, the symbols a quantity field parses with, and reading Arabic-Indic digits back.

import { describe, expect, it } from 'vitest';

import {
  NO_NUMBER,
  formatLocaleNumber,
  formatLocalePercent,
  numberSymbols,
  parseLocaleNumber,
  toAsciiDigits,
} from '../numbers';

const spaced = (text: string): string => text.replace(/[\u00a0\u202f\u2009]/g, ' ');
const clean = (text: string): string => text.replace(/[\u200e\u200f\u061c]/g, '');

describe('formatLocaleNumber', () => {
  it('groups and separates the en-GB way', () => {
    expect(formatLocaleNumber(1234567.89, 'en-GB')).toBe('1,234,567.89');
    expect(formatLocaleNumber(1234567.89, 'en-KE')).toBe('1,234,567.89');
    expect(formatLocaleNumber(0, 'en-GB')).toBe('0');
  });

  it('uses the narrow space and comma of fr-FR', () => {
    expect(spaced(formatLocaleNumber(1234567.89, 'fr-FR'))).toBe('1 234 567,89');
  });

  it('uses Arabic-Indic digits and separators in ar-EG', () => {
    expect(formatLocaleNumber(1234567.89, 'ar-EG')).toBe('١٬٢٣٤٬٥٦٧٫٨٩');
  });

  it('renders the placeholder for a missing or unreadable number', () => {
    expect(formatLocaleNumber(null)).toBe(NO_NUMBER);
    expect(formatLocaleNumber(Number.NaN)).toBe(NO_NUMBER);
  });
});

describe('formatLocalePercent', () => {
  it('keeps one decimal so a pass rate is not rounded to whole percent', () => {
    expect(formatLocalePercent(0.256, 'en-GB')).toBe('25.6%');
    expect(spaced(formatLocalePercent(0.256, 'fr-FR'))).toBe('25,6 %');
    expect(clean(formatLocalePercent(0.256, 'ar-EG'))).toBe('٢٥٫٦٪');
    expect(formatLocalePercent(0.256, 'en-GB', { decimals: 0 })).toBe('26%');
  });
});

describe('numberSymbols', () => {
  it('names the characters a field parses with', () => {
    expect(numberSymbols('en-GB')).toEqual({
      decimal: '.',
      group: ',',
      percentSign: '%',
      minusSign: '-',
    });
    expect(numberSymbols('fr-FR').decimal).toBe(',');
    expect(numberSymbols('fr-FR').group).toBe('\u202f');
    expect(numberSymbols('ar-EG').decimal).toBe('٫');
    expect(numberSymbols('ar-EG').group).toBe('٬');
  });
});

describe('parseLocaleNumber', () => {
  it('reads a number a user typed in their own locale', () => {
    expect(parseLocaleNumber('1,234.56', 'en-GB')).toBe(1234.56);
    expect(parseLocaleNumber('1 234,56', 'fr-FR')).toBe(1234.56);
    expect(parseLocaleNumber('١٬٢٣٤٫٥٦', 'ar-EG')).toBe(1234.56);
    expect(parseLocaleNumber('-12,5', 'fr-FR')).toBe(-12.5);
  });

  it('refuses text that is not a number rather than repairing it', () => {
    expect(parseLocaleNumber('12abc', 'en-GB')).toBeNull();
    expect(parseLocaleNumber('1,2,3', 'en-GB')).toBeNull();
    expect(parseLocaleNumber('', 'en-GB')).toBeNull();
    expect(parseLocaleNumber(null)).toBeNull();
  });
});

describe('toAsciiDigits', () => {
  it('rewrites both Arabic-Indic digit sets', () => {
    expect(toAsciiDigits('١٢٣')).toBe('123');
    expect(toAsciiDigits('۱۲۳')).toBe('123');
    expect(toAsciiDigits('a١2')).toBe('a12');
  });
});
