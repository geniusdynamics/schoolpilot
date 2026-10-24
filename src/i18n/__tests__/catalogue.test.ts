// ABOUTME: Tests for the pure catalogue primitives: merge precedence, flattening, checksums and key insertion.
// ABOUTME: The precedence cases mirror how the runtime loader folds shared, module and core sources.

import {
  buildCatalogue,
  canonicalJson,
  checksum,
  countLeaves,
  flattenTree,
  getAtPath,
  mergeTrees,
  withEntry,
  type TranslationSource,
  type TranslationTree,
} from '../catalogue';

const source = (
  scope: TranslationSource['scope'],
  data: TranslationTree,
  namespace = 'academics'
): TranslationSource => ({ lang: 'en', namespace, scope, origin: `${scope}:${namespace}`, data });

describe('mergeTrees', () => {
  it('merges nested objects instead of replacing them', () => {
    const merged = mergeTrees(
      { subjects: { title: 'Subjects', code: 'Code' }, keep: 'yes' },
      { subjects: { title: 'Learning areas' } }
    );
    expect(merged).toEqual({
      subjects: { title: 'Learning areas', code: 'Code' },
      keep: 'yes',
    });
  });

  it('replaces a value with an object and an object with a value', () => {
    expect(mergeTrees({ dashboard: 'Dashboard' }, { dashboard: { title: 'Dashboard' } })).toEqual({
      dashboard: { title: 'Dashboard' },
    });
    expect(mergeTrees({ dashboard: { title: 'Dashboard' } }, { dashboard: 'Dashboard' })).toEqual({
      dashboard: 'Dashboard',
    });
  });

  it('does not mutate either argument', () => {
    const base = { a: { b: 'one' } };
    const overlay = { a: { c: 'two' } };
    mergeTrees(base, overlay);
    expect(base).toEqual({ a: { b: 'one' } });
    expect(overlay).toEqual({ a: { c: 'two' } });
  });

  it('treats arrays as values, not as mergeable objects', () => {
    expect(mergeTrees({ a: [1, 2] } as unknown as TranslationTree, { a: [3] } as unknown as TranslationTree)).toEqual({
      a: [3],
    });
  });
});

describe('buildCatalogue', () => {
  it('lets a module source override the canonical namespace file', () => {
    const catalogue = buildCatalogue([
      source('shared', { title: 'Shared title' }),
      source('module', { title: 'Module title' }),
    ]);
    expect(catalogue.en.academics.title).toBe('Module title');
  });

  it('lets the core module override both', () => {
    const catalogue = buildCatalogue([
      source('shared', { title: 'Shared' }),
      source('module', { title: 'Module' }),
      source('core', { title: 'Core' }),
    ]);
    expect(catalogue.en.academics.title).toBe('Core');
  });

  it('keeps each namespace separate and never fans navigation in', () => {
    const catalogue = buildCatalogue([
      source('shared', { title: 'Academics' }, 'navigation'),
      source('module', { navigation: { academics: { title: 'Academics' } }, title: 'Academics' }),
    ]);
    expect(catalogue.en.navigation).toEqual({ title: 'Academics' });
    expect(catalogue.en.academics.navigation).toEqual({ academics: { title: 'Academics' } });
  });

  it('keeps locales apart', () => {
    const catalogue = buildCatalogue([
      { lang: 'en', namespace: 'common', scope: 'shared', origin: 'en', data: { yes: 'Yes' } },
      { lang: 'fr', namespace: 'common', scope: 'shared', origin: 'fr', data: { yes: 'Oui' } },
    ]);
    expect(catalogue.en.common.yes).toBe('Yes');
    expect(catalogue.fr.common.yes).toBe('Oui');
  });
});

describe('flattenTree, getAtPath and countLeaves', () => {
  const tree: TranslationTree = { a: { b: 'one', c: 'two' }, d: 'three' };

  it('flattens to sorted dotted keys', () => {
    expect(flattenTree(tree)).toEqual([
      { key: 'a.b', value: 'one' },
      { key: 'a.c', value: 'two' },
      { key: 'd', value: 'three' },
    ]);
  });

  it('counts string leaves only', () => {
    expect(countLeaves(tree)).toBe(3);
    expect(countLeaves({})).toBe(0);
  });

  it('reads a dotted path and returns undefined for a partial one', () => {
    expect(getAtPath(tree, 'a.b')).toBe('one');
    expect(getAtPath(tree, 'a')).toBeUndefined();
    expect(getAtPath(tree, 'a.z')).toBeUndefined();
  });
});

describe('canonicalJson and checksum', () => {
  it('is stable when key order differs', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it('gives the same checksum for the same content and a different one when a value changes', () => {
    const one = checksum({ a: 'one' });
    expect(one).toBe(checksum({ a: 'one' }));
    expect(one).not.toBe(checksum({ a: 'two' }));
    expect(one).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('withEntry', () => {
  it('creates the intermediate objects a dotted key needs', () => {
    expect(withEntry({}, 'academicYears.addNewYear', 'Add year')).toEqual({
      academicYears: { addNewYear: 'Add year' },
    });
  });

  it('refuses to overwrite a string with an object', () => {
    expect(withEntry({ subjects: 'Subjects' }, 'subjects.code', 'Code')).toBeNull();
  });

  it('refuses to overwrite an object with a string', () => {
    expect(withEntry({ subjects: { code: 'Code' } }, 'subjects', 'Subjects')).toBeNull();
  });

  it('adds a sibling without touching what is there', () => {
    const tree = { academicYears: { startDate: 'Start' } };
    expect(withEntry(tree, 'academicYears.endDate', 'End')).toEqual({
      academicYears: { startDate: 'Start', endDate: 'End' },
    });
    expect(tree).toEqual({ academicYears: { startDate: 'Start' } });
  });
});
