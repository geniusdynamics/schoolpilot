// ABOUTME: Pins the locale table: canonicalisation, direction, country, currency, week start and
// ABOUTME: name order, the profile built for a tag the table does not name, and the document locale
// ABOUTME: that `activeLocale` and logical CSS read.

import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  activeLocale,
  applyLocaleDirection,
  countryOfLocale,
  currencyOfLocale,
  localeAttributes,
  localeDirection,
  nameOrderOfLocale,
  resolveLocale,
  weekStartsOn,
} from '../locales';

afterEach(() => {
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-locale');
});

describe('locale profiles', () => {
  it('canonicalises a tag and reports direction, country, currency, week start and name order', () => {
    const kenya = resolveLocale('en_ke');
    expect(kenya.tag).toBe('en-KE');
    expect(kenya.direction).toBe('ltr');
    expect(kenya.country).toBe('KE');
    expect(kenya.currency).toBe('KES');
    expect(kenya.weekStartsOn).toBe(1);
    expect(kenya.nameOrder).toBe('given_first');
  });

  it('reads Arabic right to left and starts its week on Saturday', () => {
    const egypt = resolveLocale('ar-EG');
    expect(egypt.direction).toBe('rtl');
    expect(egypt.weekStartsOn).toBe(6);
    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('he-IL')).toBe('rtl');
    expect(localeDirection('sw-KE')).toBe('ltr');
    expect(localeDirection('en-KE')).toBe('ltr');
  });

  it('builds a profile for a locale the table does not name', () => {
    const germany = resolveLocale('de-DE');
    expect(germany.direction).toBe('ltr');
    expect(germany.country).toBe('DE');
    expect(germany.currency).toBe('EUR');
    expect(germany.weekStartsOn).toBe(1);
    expect(resolveLocale('hu-HU').nameOrder).toBe('family_first');
    expect(resolveLocale('zh-CN').nameOrder).toBe('family_first');
    expect(resolveLocale('fr-CA').nameOrder).toBe('given_first');
  });

  it('falls back to the product default for a tag that is not a locale at all', () => {
    expect(resolveLocale('not a locale').tag).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('').tag).toBe(DEFAULT_LOCALE);
  });

  it('names the locales the product ships', () => {
    expect(SUPPORTED_LOCALES).toContain('ar-EG');
    expect(SUPPORTED_LOCALES).toContain('pt-PT');
    expect(SUPPORTED_LOCALES).toContain('sw-KE');
    expect(SUPPORTED_LOCALES).toContain('fr-FR');
  });
});

describe('the document locale', () => {
  it('publishes lang, dir and data-locale, and activeLocale reads them back', () => {
    applyLocaleDirection('ar-EG');

    expect(document.documentElement).toHaveAttribute('lang', 'ar-EG');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('data-locale', 'ar-EG');
    expect(activeLocale()).toBe('ar-EG');

    applyLocaleDirection('en-GB');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  });

  it('exposes the profile through the named helpers', () => {
    expect(localeAttributes('ar-EG')).toEqual({
      lang: 'ar-EG',
      dir: 'rtl',
      'data-locale': 'ar-EG',
    });
    expect(countryOfLocale('fr-FR')).toBe('FR');
    expect(currencyOfLocale('fr-FR')).toBe('EUR');
    expect(currencyOfLocale('ar')).toBeNull();
    expect(nameOrderOfLocale('en-KE')).toBe('given_first');
    expect(weekStartsOn('ar-EG')).toBe(6);
  });
});
