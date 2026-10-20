// ABOUTME: The source-level check for the admissions module: no page writes canonical rows itself
// ABOUTME: and no canonical collection is read through the legacy app-data layer.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MODULE_ROOT = join(process.cwd(), 'src', 'modules', 'admissions');

/** The legacy collections the canonical registry serves. */
const CANONICAL_LEGACY_COLLECTIONS = [
  'students',
  'staff',
  'users',
  'classes',
  'classStreams',
  'subjects',
  'departments',
  'designations',
  'academicYears',
  'schoolPeriods',
  'financialYears',
  'learningAreas',
  'levels',
  'programmes',
  'guardians',
  'studentGuardians',
  'studentInvoices',
  'studentPayments',
  'studentExamResults',
  'teacherSubjectAssignments',
] as const;

/**
 * The files that still read the legacy collections the registry does not model.
 *
 * Each one says which entity the registry lacks in its GAP(P1-E04) marker. The admitted
 * learner is not one of these rows: `learner` and `enrolment` are canonical.
 */
const GAP_FILES: Readonly<Record<string, string>> = {
  'data/AdmissionsDataProvider.tsx': 'admission application, interview',
  'data/useAdmissionsData.ts': 'admission application, review, document, approval, note',
  'hooks/useAdmissions.ts': 'admission interview',
  'pages/FormBuilderPage.tsx': 'admission application form template',
};

interface SourceFile {
  readonly modulePath: string;
  readonly text: string;
}

/** Every source file of the module, tests excluded. */
function sourceFiles(): SourceFile[] {
  const found: SourceFile[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      found.push({
        modulePath: relative(MODULE_ROOT, path).split(sep).join('/'),
        text: readFileSync(path, 'utf8'),
      });
    }
  };
  walk(MODULE_ROOT);
  return found;
}

/** True when the file reads the legacy app-data layer at all. */
function readsLegacyLayer(source: string): boolean {
  return /useAppData\(\)|databaseService|getCollection\(|useDatabaseCollection/.test(source);
}

/** The legacy collection names the file names as strings, e.g. getCollection('students'). */
function legacyCollectionsOf(source: string): string[] {
  const names: string[] = [];
  const patterns = [
    /getCollection\(\s*['"]([^'"]+)['"]/g,
    /useDatabaseCollection<[^>]*>\(\s*['"]([^'"]+)['"]/g,
    /\bCOLLECTIONS\.(\w+)/g,
  ];
  for (const pattern of patterns) {
    let match = pattern.exec(source);
    while (match) {
      names.push(match[1] as string);
      match = pattern.exec(source);
    }
  }
  return names;
}

/** The legacy collection constants of useAdmissionsData, keyed by their COLLECTIONS key. */
function collectionAliases(source: string): string[] {
  const values: string[] = [];
  const map = /\b(\w+):\s*'([^']+)'/g;
  let match = map.exec(source);
  while (match) {
    values.push(match[2] as string);
    match = map.exec(source);
  }
  return values;
}

const files = sourceFiles();

describe('the admissions module reads and writes through the canonical data layer', () => {
  it('finds the source files of the module', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('never reads or writes through useAppData()', () => {
    const offenders = files.filter((file) => /useAppData\(\)/.test(file.text));
    expect(offenders.map((file) => file.modulePath)).toEqual([]);
  });

  it('reads no canonical collection through the legacy data layer', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const named = [...legacyCollectionsOf(file.text), ...collectionAliases(file.text)];
      for (const name of named) {
        if ((CANONICAL_LEGACY_COLLECTIONS as readonly string[]).includes(name)) {
          offenders.push(`${file.modulePath} reads ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('marks every file that still reads the legacy layer with the entity the registry lacks', () => {
    for (const file of files) {
      if (!readsLegacyLayer(file.text)) continue;
      expect(file.modulePath in GAP_FILES, `${file.modulePath} reads the legacy layer`).toBe(true);
      expect(file.text, `${file.modulePath} needs a GAP(P1-E04) marker`).toMatch(/GAP\(P1-E04\)/);
    }
  });

  it('admits a learner by calling AdmissionService rather than writing the rows', () => {
    const page = files.find((file) => file.modulePath === 'pages/AdmitLearnerPage.tsx');
    expect(page).toBeDefined();
    expect(page?.text).toMatch(/new AdmissionService\(/);
    expect(page?.text).toMatch(/\.admit\(/);
    // The page never writes a canonical row itself.
    expect(page?.text).not.toMatch(/repository\.(create|update|remove)\(/);
  });

  it('keeps the register and the lookups on the repository hooks', () => {
    const data = files.find((file) => file.modulePath === 'data/useCanonicalAdmissions.ts');
    expect(data).toBeDefined();
    expect(data?.text).toMatch(/useEntityQuery\(/);
    expect(data?.text).toMatch(/useLookup\(/);
  });

  it('gives the canonical files two ABOUTME lines', () => {
    const added = files.filter((file) =>
      /admissionForm|writableRepository|useCanonicalAdmissions|AdmitLearnerPage|AdmissionsRegisterPage/.test(
        file.modulePath
      )
    );
    expect(added.length).toBeGreaterThan(0);
    for (const file of added) {
      const head = file.text.split('\n').slice(0, 2);
      expect(head[0]?.startsWith('// ABOUTME:'), `${file.modulePath} needs an ABOUTME line`).toBe(true);
      expect(head[1]?.startsWith('// ABOUTME:'), `${file.modulePath} needs a second ABOUTME line`).toBe(
        true
      );
    }
  });
});
