// ABOUTME: Integration test over the real loader: the pseudo-locale covers every English string in every namespace.
// ABOUTME: This is the automated half of "the pseudo-locale shows no untranslated core strings".

import { flattenTree, getAtPath } from '../catalogue';
import { LOCALES, getLocaleDefinition, isRtl } from '../localeRegistry';
import { loadModularTranslations } from '../modularLoader';
import { CORE_NAMESPACES, FALLBACK_LOCALE, NAMESPACE_NAMES, SUPPORTED_LOCALES } from '../namespaces';
import { isPseudoTranslatable, PSEUDO_LOCALE } from '../pseudo';

describe('the loaded catalogue', () => {
  let resources: Awaited<ReturnType<typeof loadModularTranslations>>;

  beforeAll(async () => {
    resources = await loadModularTranslations();
  });

  it('has a bundle for every supported locale plus the generated pseudo-locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(resources[locale] ?? {}).length).toBeGreaterThan(0);
    }
    expect(resources[PSEUDO_LOCALE]).toBeDefined();
  });

  it('holds every registered namespace in the fallback locale', () => {
    const missing = NAMESPACE_NAMES.filter((namespace) => resources[FALLBACK_LOCALE][namespace] === undefined);
    expect(missing).toEqual([]);
  });

  it('gives every namespace the same keys in the pseudo-locale as in English', () => {
    const differences: string[] = [];
    for (const namespace of Object.keys(resources[FALLBACK_LOCALE])) {
      const english = flattenTree(resources[FALLBACK_LOCALE][namespace]);
      for (const { key } of english) {
        if (getAtPath(resources[PSEUDO_LOCALE][namespace], key) === undefined) {
          differences.push(`${namespace}:${key}`);
        }
      }
    }
    expect(differences).toEqual([]);
  });

  it('leaves no core string untranslated in the pseudo-locale', () => {
    const untranslated: string[] = [];
    for (const namespace of CORE_NAMESPACES) {
      for (const { key, value } of flattenTree(resources[FALLBACK_LOCALE][namespace] ?? {})) {
        if (!isPseudoTranslatable(value)) continue;
        const pseudoValue = getAtPath(resources[PSEUDO_LOCALE][namespace], key);
        if (pseudoValue === undefined || pseudoValue === value || !pseudoValue.includes('«')) {
          untranslated.push(`${namespace}:${key}`);
        }
      }
    }
    expect(untranslated).toEqual([]);
  });

  it('leaves no string untranslated in any namespace', () => {
    const untranslated: string[] = [];
    for (const namespace of Object.keys(resources[FALLBACK_LOCALE])) {
      for (const { key, value } of flattenTree(resources[FALLBACK_LOCALE][namespace])) {
        if (!isPseudoTranslatable(value)) continue;
        const pseudoValue = getAtPath(resources[PSEUDO_LOCALE][namespace], key);
        if (pseudoValue === undefined || pseudoValue === value) untranslated.push(`${namespace}:${key}`);
      }
    }
    expect(untranslated).toEqual([]);
  });

  it('registers only locales the app can actually render', () => {
    const registered = LOCALES.map((locale) => locale.code);
    for (const locale of SUPPORTED_LOCALES) expect(registered).toContain(locale);
    expect(registered).toContain(PSEUDO_LOCALE);
    expect(getLocaleDefinition('en')?.direction).toBe('ltr');
    expect(isRtl('en')).toBe(false);
    expect(isRtl('ar')).toBe(false);
  });
});
