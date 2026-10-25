// ABOUTME: Pins phone handling: national and international display for Kenya, Britain, France and
// ABOUTME: Egypt, the canonical fallback for an unknown plan, and the E.164 normalisation the field
// ABOUTME: stores.

import { describe, expect, it } from 'vitest';

import {
  dialCodeForCountry,
  formatPhone,
  isValidE164,
  normalisePhone,
  phoneCountryOfLocale,
  phonePlaceholder,
} from '../phones';

describe('formatPhone', () => {
  it('renders Kenya with its trunk prefix and with its country code', () => {
    expect(formatPhone('+254712345678', { style: 'national' })).toBe('0712 345 678');
    expect(formatPhone('+254712345678')).toBe('+254 712 345 678');
  });

  it('renders Britain, France and Egypt in their own shapes', () => {
    expect(formatPhone('+447911123456', { style: 'national' })).toBe('07911 123456');
    expect(formatPhone('+447911123456')).toBe('+44 7911 123456');
    expect(formatPhone('+33612345678', { style: 'national' })).toBe('06 12 34 56 78');
    expect(formatPhone('+33612345678')).toBe('+33 6 12 34 56 78');
    expect(formatPhone('+201012345678', { style: 'national' })).toBe('010 1234 5678');
    expect(formatPhone('+201012345678')).toBe('+20 10 1234 5678');
  });

  it('takes the country from the locale when the number has no plan of its own', () => {
    expect(formatPhone('+33612345678', { locale: 'fr-FR', style: 'national' })).toBe('06 12 34 56 78');
    expect(phoneCountryOfLocale('fr-FR')).toBe('FR');
    expect(phoneCountryOfLocale(undefined)).toBe('KE');
  });

  it('leaves a number of an unknown plan in canonical E.164 rather than mis-grouping it', () => {
    expect(formatPhone('+9991234567')).toBe('+9991234567');
    expect(formatPhone('+9991234567', { style: 'national' })).toBe('+9991234567');
    // Kenya's plan does not fit Uganda's ten-digit shape, so the number's own dial code wins.
    expect(formatPhone('+254712345678', { country: 'UG', style: 'national' })).toBe('0712 345 678');
  });

  it('reads a Phone record, and renders nothing for a missing number', () => {
    expect(formatPhone({ number: '+254712345678', label: 'parent' }, { style: 'national' })).toBe(
      '0712 345 678'
    );
    expect(formatPhone(null)).toBe('');
    expect(formatPhone('not a phone')).toBe('not a phone');
  });
});

describe('E.164 storage', () => {
  it('normalises national, international and zero-prefixed entry', () => {
    expect(normalisePhone('0712 345 678', { country: 'KE' })).toEqual({
      ok: true,
      number: '+254712345678',
    });
    expect(normalisePhone('+254 712 345 678', { country: 'KE' })).toEqual({
      ok: true,
      number: '+254712345678',
    });
    expect(normalisePhone('00254712345678', { country: 'KE' })).toEqual({
      ok: true,
      number: '+254712345678',
    });
    expect(normalisePhone('0612345678', { country: 'FR' })).toEqual({
      ok: true,
      number: '+33612345678',
    });
  });

  it('rejects empty and unusable entry', () => {
    expect(normalisePhone('', { country: 'KE' })).toEqual({ ok: false, reason: 'empty' });
    expect(normalisePhone('abc', { country: 'KE' })).toEqual({ ok: false, reason: 'invalid' });
  });

  it('validates E.164 and knows the dial codes', () => {
    expect(isValidE164('+254712345678')).toBe(true);
    expect(isValidE164('0712345678')).toBe(false);
    expect(dialCodeForCountry('KE')).toBe('254');
    expect(dialCodeForCountry('eg')).toBe('20');
    expect(phonePlaceholder('KE')).toBe('+254 700 000000');
  });
});
