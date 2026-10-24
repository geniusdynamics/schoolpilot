// ABOUTME: Tests for pseudo-locale generation: accents, end markers, expansion and protected tokens.
// ABOUTME: The invariants here are what let the pseudo-locale act as an untranslated-string detector.

import {
  isPseudoTranslatable,
  pseudoTranslate,
  pseudoTranslateCatalogue,
  pseudoTranslateTree,
  PSEUDO_EXPANSION,
  PSEUDO_LOCALE,
} from '../pseudo';

describe('isPseudoTranslatable', () => {
  it('is true only when the string contains a Latin letter', () => {
    expect(isPseudoTranslatable('Save')).toBe(true);
    expect(isPseudoTranslatable('{{count}}')).toBe(false);
    expect(isPseudoTranslatable('12/03/2026')).toBe(false);
    expect(isPseudoTranslatable('')).toBe(false);
  });
});

describe('pseudoTranslate', () => {
  it('accents letters and marks both ends', () => {
    // Escapes, not literal accents: this expectation is exactly what the repo-wide mojibake
    // check (scripts/prd/fix-encoding.mjs) flags, and a test fixture is not worth an exemption.
    expect(pseudoTranslate('Save')).toBe('\u00AB\u0160\u00E1v\u00E9\u00B7\u00BB');
  });

  it('leaves a string without letters untouched, markers and all', () => {
    expect(pseudoTranslate('12/03/2026')).toBe('12/03/2026');
    expect(pseudoTranslate('')).toBe('');
  });

  it('protects i18next interpolations', () => {
    const result = pseudoTranslate('Welcome to the {{moduleName}} module');
    expect(result).toContain('{{moduleName}}');
  });

  it('protects single-brace placeholders, JSX tags and printf verbs', () => {
    const result = pseudoTranslate('<strong>{name}</strong> has %s items');
    expect(result).toContain('<strong>');
    expect(result).toContain('</strong>');
    expect(result).toContain('{name}');
    expect(result).toContain('%s');
  });

  it('adds roughly the configured expansion on top of the letter count', () => {
    const value = 'a'.repeat(100);
    const result = pseudoTranslate(value);
    expect(result.length).toBeGreaterThan(100 + 100 * PSEUDO_EXPANSION - 5);
  });

  it('is deterministic', () => {
    expect(pseudoTranslate('Subjects Management')).toBe(pseudoTranslate('Subjects Management'));
  });
});

describe('pseudoTranslateTree', () => {
  it('walks nested objects and leaves nothing behind', () => {
    const tree = { subjects: { title: 'Subjects', code: 'Code' }, count: 12 as unknown as string };
    const translated = pseudoTranslateTree(tree) as typeof tree;
    expect(translated.subjects.title).not.toBe('Subjects');
    expect(translated.subjects.code).not.toBe('Code');
    expect(tree.subjects.title).toBe('Subjects');
  });
});

describe('pseudoTranslateCatalogue', () => {
  it('translates every namespace it is given', () => {
    const catalogue = pseudoTranslateCatalogue({
      common: { yes: 'Yes' },
      navigation: { dashboard: 'Dashboard' },
    });
    expect(Object.keys(catalogue)).toEqual(['common', 'navigation']);
    expect(catalogue.common.yes).not.toBe('Yes');
    expect(catalogue.navigation.dashboard).not.toBe('Dashboard');
  });

  it('names the locale the loader installs it under', () => {
    expect(PSEUDO_LOCALE).toBe('pseudo');
  });
});
