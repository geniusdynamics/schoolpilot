// ABOUTME: Tests for the usage scanner: which keys the code asks for, which it leaves dynamic, and which are unused.
// ABOUTME: These cases are the difference between a trustworthy extraction report and a noisy one.

import type { Catalogue } from '../catalogue';
import {
  collectPlaceholders,
  extractFromSource,
  humanizeKeySegment,
  maskComments,
  missingKeys,
  namespacesForFile,
  unusedKeys,
} from '../introspect';

describe('namespacesForFile', () => {
  it('takes the namespaces from useTranslation', () => {
    expect(namespacesForFile("const { t } = useTranslation('academics');")).toEqual(['academics']);
    expect(namespacesForFile("useTranslation(['settings', 'common']);")).toEqual(['settings', 'common']);
  });

  it('falls back to the default namespace', () => {
    expect(namespacesForFile('const { t } = useTranslation();')).toEqual(['common']);
    expect(namespacesForFile('nothing here')).toEqual(['common']);
  });
});

describe('maskComments', () => {
  it('blanks comments while keeping offsets and newlines', () => {
    const source = "// t('a.b')\nconst x = 1;\n/* t('c.d') */\nconst y = 2;";
    const masked = maskComments(source);
    expect(masked.length).toBe(source.length);
    expect(masked.split('\n').length).toBe(source.split('\n').length);
    expect(masked).not.toContain('a.b');
    expect(masked).not.toContain('c.d');
    expect(masked).toContain('const x = 1;');
  });

  it('does not mistake a URL inside a string for a comment', () => {
    const source = "const url = 'https://example.com/x';\nconst label = t('help.website');";
    const masked = maskComments(source);
    expect(masked).toContain('https://example.com/x');
    expect(masked).toContain('help.website');
  });
});

describe('extractFromSource', () => {
  it('finds a literal key and reports the line', () => {
    const extraction = extractFromSource("const a = 1;\nconst b = t('common:save');\n", 'probe.tsx');
    expect(extraction.usages).toEqual([
      { namespace: 'common', key: 'save', file: 'probe.tsx', line: 2, form: 't' },
    ]);
  });

  it('finds a call broken across lines', () => {
    const source = "const x = t(\n  'integrity.subtitle',\n  'The checks look for references.'\n);";
    const [usage] = extractFromSource(source, 'probe.tsx').usages;
    expect(usage.key).toBe('integrity.subtitle');
    expect(usage.defaultValue).toBe('The checks look for references.');
  });

  it('reads a defaultValue option as well as a second positional argument', () => {
    expect(
      extractFromSource("t('a.b', { defaultValue: 'Fallback' })", 'p.tsx').usages[0].defaultValue
    ).toBe('Fallback');
    expect(extractFromSource("t('a.b', 'Fallback')", 'p.tsx').usages[0].defaultValue).toBe('Fallback');
    expect(extractFromSource("t('a.b')", 'p.tsx').usages[0].defaultValue).toBeUndefined();
  });

  it('attributes a key to the file namespace and honours an explicit prefix', () => {
    const source = "const { t } = useTranslation('settings');\nt('title');\nt('common:cancel');";
    expect(extractFromSource(source, 'p.tsx').usages).toEqual([
      { namespace: 'settings', key: 'title', file: 'p.tsx', line: 2, form: 't' },
      { namespace: 'common', key: 'cancel', file: 'p.tsx', line: 3, form: 't' },
    ]);
  });

  it('marks a call inside an info prop so a page description can be told apart from a column header', () => {
    const source = '<PageHeader info={t(\'payrollPeriods.description\')} />';
    expect(extractFromSource(source, 'p.tsx').usages[0].form).toBe('info');
  });

  it('reads Trans keys', () => {
    const source = "const { t } = useTranslation('academics');\n<Trans i18nKey=\"subjects.title\" />";
    expect(extractFromSource(source, 'p.tsx').usages[0]).toMatchObject({
      namespace: 'academics',
      key: 'subjects.title',
      form: 'i18nKey',
    });
  });

  it('reports a template literal as dynamic instead of guessing the key', () => {
    const extraction = extractFromSource('t(`academics.${section}.title`)', 'p.tsx');
    expect(extraction.usages).toEqual([]);
    expect(extraction.dynamic).toHaveLength(1);
  });

  it('ignores literals that are not key shaped', () => {
    expect(extractFromSource("t('Some sentence with spaces')", 'p.tsx').usages).toEqual([]);
  });

  it('does not read keys out of comments', () => {
    expect(extractFromSource("// t('commented.out')\n", 'p.tsx').usages).toEqual([]);
  });
});

describe('missingKeys and unusedKeys', () => {
  const catalogue: Catalogue = { en: { common: { save: 'Save' } } };
  const usages = [
    { namespace: 'common', key: 'save', file: 'a.tsx', line: 1, form: 't' as const },
    { namespace: 'common', key: 'gone', file: 'b.tsx', line: 2, form: 't' as const },
    { namespace: 'common', key: 'gone', file: 'c.tsx', line: 3, form: 't' as const },
  ];

  it('lists keys the catalogue cannot answer, with a count', () => {
    expect(missingKeys(catalogue, 'en', usages)).toEqual([
      { namespace: 'common', key: 'gone', file: 'b.tsx', line: 2, form: 't', occurrences: 2 },
    ]);
  });

  it('keeps an inline default from any occurrence of a missing key', () => {
    const withDefault = [
      { namespace: 'common', key: 'gone', file: 'b.tsx', line: 2, form: 't' as const },
      { namespace: 'common', key: 'gone', file: 'c.tsx', line: 3, form: 't' as const, defaultValue: 'Gone' },
    ];
    expect(missingKeys(catalogue, 'en', withDefault)[0].defaultValue).toBe('Gone');
  });

  it('lists catalogue entries nothing refers to', () => {
    expect(unusedKeys({ en: { common: { save: 'Save', stale: 'Stale' } } }, 'en', usages)).toEqual([
      { namespace: 'common', key: 'stale', value: 'Stale' },
    ]);
  });
});

describe('humanizeKeySegment and collectPlaceholders', () => {
  it('turns a camelCase segment into title case', () => {
    expect(humanizeKeySegment('managementDescription')).toBe('Management Description');
    expect(humanizeKeySegment('data_layer')).toBe('Data Layer');
    expect(humanizeKeySegment('list')).toBe('List');
  });

  it('flags a page description that is only the field name', () => {
    const catalogue: Catalogue = {
      en: { hr: { payslips: { description: 'Description' }, tableHeaders: { description: 'Description' } } },
    };
    const usages = [
      { namespace: 'hr', key: 'payslips.description', file: 'a.tsx', line: 1, form: 'info' as const },
      { namespace: 'hr', key: 'tableHeaders.description', file: 'a.tsx', line: 2, form: 't' as const },
    ];
    expect(collectPlaceholders(catalogue, 'en', usages)).toEqual([
      {
        namespace: 'hr',
        key: 'payslips.description',
        value: 'Description',
        reason: 'page description is only the word "Description"',
      },
    ]);
  });

  it('does not flag a description that says something', () => {
    const catalogue: Catalogue = { en: { hr: { payslips: { description: 'Pay runs and payslips' } } } };
    const usages = [
      { namespace: 'hr', key: 'payslips.description', file: 'a.tsx', line: 1, form: 'info' as const },
    ];
    expect(collectPlaceholders(catalogue, 'en', usages)).toEqual([]);
  });
});
