// ABOUTME: Tests for the locale completeness library: every problem kind has a failing fixture and a passing one.
// ABOUTME: Also runs the check over the real catalogue so CI fails when a core string is missing or untranslated.

import { loadModularTranslations } from '../modularLoader';
import {
  COMPLETE_LOCALES,
  checkLocaleNamespace,
  extractPlaceholders,
  isLegitimatelyIdentical,
  type Problem,
} from '../completeness';
import { UNTRANSLATABLE, UNTRANSLATABLE_BY_LOCALE, allowlistFor } from '../untranslatable';
import { CORE_NAMESPACES, FALLBACK_LOCALE } from '../namespaces';

const english = {
  save: 'Save',
  nested: { greeting: 'Hello {{name}}', items_one: '{{count}} item', items_other: '{{count}} items' },
};

const kinds = (problems: readonly Problem[]): string[] => problems.map((problem) => `${problem.kind}:${problem.key}`);

describe('extractPlaceholders', () => {
  it('returns the sorted set of interpolation names, ignoring format suffixes and whitespace', () => {
    expect(extractPlaceholders('{{ b }} and {{a, number}} and {{b}}')).toEqual(['a', 'b']);
    expect(extractPlaceholders('No placeholders')).toEqual([]);
  });
});

describe('isLegitimatelyIdentical', () => {
  it('accepts numbers, units and placeholder-only strings', () => {
    expect(isLegitimatelyIdentical('100')).toBe(true);
    expect(isLegitimatelyIdentical('{{count}}')).toBe(true);
    expect(isLegitimatelyIdentical('{{a}} / {{b}}')).toBe(true);
    expect(isLegitimatelyIdentical('Save')).toBe(false);
  });
});

describe('checkLocaleNamespace', () => {
  const translated = {
    save: 'Hifadhi',
    nested: { greeting: 'Habari {{name}}', items_one: 'kipengee {{count}}', items_other: 'vipengee {{count}}' },
  };

  it('reports nothing for a complete translation', () => {
    expect(checkLocaleNamespace('common', english, translated, {})).toEqual([]);
  });

  it('reports a missing key', () => {
    expect(kinds(checkLocaleNamespace('common', english, { nested: translated.nested }, {}))).toEqual([
      'missing:save',
    ]);
  });

  it('reports an extra key', () => {
    expect(kinds(checkLocaleNamespace('common', english, { ...translated, stray: 'x' }, {}))).toEqual([
      'extra:stray',
    ]);
  });

  it('reports an empty value', () => {
    expect(kinds(checkLocaleNamespace('common', english, { ...translated, save: '  ' }, {}))).toEqual([
      'empty:save',
    ]);
  });

  it('reports a value identical to English that is not allowlisted', () => {
    expect(kinds(checkLocaleNamespace('common', english, { ...translated, save: 'Save' }, {}))).toEqual([
      'untranslated:save',
    ]);
  });

  it('accepts an identical value that is on the allowlist', () => {
    const allow = { 'common:save': 'fixture reason' };
    expect(checkLocaleNamespace('common', english, { ...translated, save: 'Save' }, allow)).toEqual([]);
  });

  it('reports a changed placeholder', () => {
    const broken = { ...translated, nested: { ...translated.nested, greeting: 'Habari {{jina}}' } };
    expect(kinds(checkLocaleNamespace('common', english, broken, {}))).toEqual(['placeholder:nested.greeting']);
  });

  it('reports a dropped plural suffix key as missing and an added one as extra', () => {
    const withoutOther = { greeting: translated.nested.greeting, items_one: translated.nested.items_one };
    const dropped = { ...translated, nested: withoutOther };
    expect(kinds(checkLocaleNamespace('common', english, dropped, {}))).toEqual(['missing:nested.items_other']);
    const added = { ...translated, nested: { ...translated.nested, items_many: 'x {{count}}' } };
    expect(kinds(checkLocaleNamespace('common', english, added, {}))).toEqual(['extra:nested.items_many']);
  });
});

describe('the real catalogue', () => {
  let catalogue: Awaited<ReturnType<typeof loadModularTranslations>>;

  beforeAll(async () => {
    catalogue = await loadModularTranslations();
  });

  it('lists every locale that must be complete, never English', () => {
    expect(COMPLETE_LOCALES.length).toBeGreaterThan(0);
    expect(COMPLETE_LOCALES).not.toContain(FALLBACK_LOCALE);
  });

  it.each(COMPLETE_LOCALES.flatMap((locale) => CORE_NAMESPACES.map((namespace) => [locale, namespace])))(
    '%s has a complete %s namespace',
    (locale, namespace) => {
      const problems = checkLocaleNamespace(
        namespace,
        catalogue[FALLBACK_LOCALE][namespace],
        catalogue[locale]?.[namespace] ?? {},
        allowlistFor(locale)
      );
      expect(problems.map((problem) => `${problem.kind} ${problem.namespace}:${problem.key}`)).toEqual([]);
    }
  );

  it('requires sw, fr, pt and ar to be complete', () => {
    expect([...COMPLETE_LOCALES].sort()).toEqual(['ar', 'fr', 'pt', 'sw']);
  });

  it('keeps a locale-specific allowlist entry out of the other locales', () => {
    expect(allowlistFor('fr')['navigation:finance.transport']).toBeDefined();
    expect(allowlistFor('sw')['navigation:finance.transport']).toBeUndefined();
    expect(allowlistFor('sw')['common:appName']).toBeDefined();
  });

  it('gives every allowlist entry a reason', () => {
    const everyEntry = [UNTRANSLATABLE, ...Object.values(UNTRANSLATABLE_BY_LOCALE)].flatMap((list) =>
      Object.entries(list)
    );
    for (const [id, reason] of everyEntry) {
      expect(reason.trim(), id).not.toBe('');
    }
  });
});
