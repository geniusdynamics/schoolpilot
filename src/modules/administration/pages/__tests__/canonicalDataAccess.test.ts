// ABOUTME: Source-level guard for the administration module (P1-E01): no canonical collection is
// ABOUTME: read through the legacy context outside the named pending list, and no useAppData() write remains.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MODULE_ROOT = join(process.cwd(), 'src', 'modules', 'administration');

/**
 * The legacy collections the canonical registry serves.
 *
 * The names are the collection names the legacy layer uses (`useDatabaseCollection('students')`,
 * `appData.students`); the camelCase aliases are the members the app-data context exposes for the
 * same collections, and both spellings are a read of canonical data through the old layer.
 */
const CANONICAL_LEGACY_COLLECTIONS = [
  'students',
  'staff',
  'classes',
  'classStreams',
  'class_streams',
  'departments',
  'designations',
  'academicYears',
  'academic_years',
  'schoolPeriods',
  'school_periods',
  'users',
  'parentsGuardians',
  'parents_guardians',
  'studentGuardianRelationships',
  'student_guardian_relationships',
  'studentAttendance',
  'student_attendance',
] as const;

/**
 * The files whose canonical reads still go through the legacy layer, each with the canonical
 * entities that serve them.
 *
 * The pages are pending because their screen has not moved; the data hooks feed the pages that
 * have no canonical home yet (the promotion run, the masterlist, the attendance report) and the
 * legacy CRUD hooks the GAP pages still import through `useAdministration`.
 */
const PENDING_CANONICAL_MIGRATION: Record<string, string> = {
  'pages/StudentPromotionPage.tsx': 'learner, class_group, academic_year',
  'data/useAcademicYearData.ts': 'academic_year',
  'data/useAdministrationData.ts':
    'learner, staff, class_group, department, job_title, guardian, learner_guardian, attendance_mark',
  'data/useDepartmentData.ts': 'department',
  'data/useDesignationData.ts': 'job_title',
  'data/useSchoolPeriodData.ts': 'academic_period',
  'hooks/useStudentMasterlist.ts': 'learner, class_group, guardian, learner_guardian',
  'hooks/useStudentPromotion.ts': 'learner, class_group, enrolment',
};

/**
 * The write sites the registry cannot serve, with the entity or field that is missing.
 *
 * These keep working on their own collection; the marker names what has to exist before they
 * can move.
 */
const GAP_WRITES: Record<string, string> = {
  'pages/AcademicPeriodDefinitionsPage.tsx': 'academic_period_definition',
  'pages/AcademicStructurePage.tsx': 'academic_year_structure',
  'pages/BulkAssignRollNumbersPage.tsx': 'learner.roll_number',
  'pages/BulkStudentUpdatePage.tsx': 'learner bulk fields (P1-C03)',
  'pages/BulkStreamCreationPage.tsx': 'class_group mapping (P1-C02)',
  // The promotion run rewrites the legacy student row (`current_class_stream_id`) and its class
  // history. The canonical model moves a learner through `enrolment` (EnrolmentService.transfer),
  // so the run has to be re-expressed on it before this can leave the legacy layer.
  'hooks/useStudentPromotion.ts': 'enrolment promotion run (P1-C03)',
};

/** The pages migrated onto the repository in this task that offer a reference. */
const MIGRATED_PAGES_WITH_PICKERS = [
  'pages/DepartmentsPage.tsx',
  'pages/StaffListPage.tsx',
  'pages/AcademicYearsPage.tsx',
  'pages/StudentsListPage.tsx',
  'pages/AddStudentPage.tsx',
  'pages/ManualAttendancePage.tsx',
] as const;

interface SourceFile {
  readonly modulePath: string;
  readonly text: string;
}

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

const files = sourceFiles();
const byPath = new Map(files.map((file) => [file.modulePath, file] as const));

/** The variables a `useAppData()` call is assigned to, so `appData.students` is a read too. */
function appDataHolders(source: string): string[] {
  const holders: string[] = [];
  const assigned = /(?:const|let|var)\s+(\w+)\s*(?::\s*[^=;\n]+)?=\s*useAppData\(\)/g;
  let match = assigned.exec(source);
  while (match) {
    holders.push(match[1] as string);
    match = assigned.exec(source);
  }
  return holders;
}

/** The string constants the file declares, so a collection named through one is resolved. */
function stringConstants(source: string): Map<string, string> {
  const constants = new Map<string, string>();
  const declared = /(?:const|let)\s+(\w+)\s*(?::\s*string)?\s*=\s*['"]([^'"]+)['"]/g;
  let match = declared.exec(source);
  while (match) {
    constants.set(match[1] as string, match[2] as string);
    match = declared.exec(source);
  }
  return constants;
}

/** The collections a `useDatabaseCollection` call binds, by literal or by the constant naming it. */
function databaseCollectionNames(source: string): string[] {
  const names: string[] = [];
  const constants = stringConstants(source);
  const called = /useDatabaseCollection\s*(?:<[^()]*>)?\s*\(\s*([^)]+)\)/g;
  let match = called.exec(source);
  while (match) {
    const argument = (match[1] ?? '').trim();
    const literal = /^['"]([^'"]+)['"]$/.exec(argument);
    const resolved = literal?.[1] ?? constants.get(argument);
    if (resolved) names.push(resolved);
    match = called.exec(source);
  }
  return names;
}

/** The names a `useAppData()` call reads, by destructuring, by member or through its variable. */
function collectionsReadBy(source: string): string[] {
  const names: string[] = [];
  const destructured = /\{([^{}]*)\}\s*=\s*useAppData\(\)/g;
  let match = destructured.exec(source);
  while (match) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.split('=')[0]?.split(':')[0]?.trim();
      if (name) names.push(name);
    }
    match = destructured.exec(source);
  }
  const member = /useAppData\(\)\.(\w+)/g;
  match = member.exec(source);
  while (match) {
    names.push(match[1] as string);
    match = member.exec(source);
  }
  for (const holder of appDataHolders(source)) {
    for (const read of source.matchAll(new RegExp(`\\b${holder}\\.(\\w+)`, 'g'))) {
      names.push(read[1] as string);
    }
  }
  names.push(...databaseCollectionNames(source));
  return names;
}

const WRITE_NAME = /^(add|update|delete|remove|save|create|commit|undo|insert|assign|bulk)[A-Z]/;

/** The writes a page makes through the legacy layer, by destructuring, by holder or by collection. */
function writesThroughLegacy(source: string): string[] {
  const writes = collectionsReadBy(source).filter((name) => WRITE_NAME.test(name));
  for (const holder of appDataHolders(source)) {
    for (const call of source.matchAll(new RegExp(`\\b${holder}\\.(\\w+)`, 'g'))) {
      const name = call[1] as string;
      if (WRITE_NAME.test(name)) writes.push(name);
    }
  }
  return writes;
}

describe('the administration module reads canonical data through the repository', () => {
  it('finds the module source files', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('reads no canonical collection through the legacy app-data context outside the pending list', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.modulePath in PENDING_CANONICAL_MIGRATION) continue;
      for (const name of collectionsReadBy(file.text)) {
        if ((CANONICAL_LEGACY_COLLECTIONS as readonly string[]).includes(name)) {
          offenders.push(`${file.modulePath} reads ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('names the canonical entities behind every pending read', () => {
    for (const [path, entities] of Object.entries(PENDING_CANONICAL_MIGRATION)) {
      expect(entities.length, `${path} must name its canonical entities`).toBeGreaterThan(0);
      expect(byPath.has(path), `${path} must exist`).toBe(true);
    }
  });

  it('keeps no useAppData() write outside the named gaps', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.modulePath in GAP_WRITES) continue;
      for (const name of writesThroughLegacy(file.text)) {
        offenders.push(`${file.modulePath} writes ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('names the missing entity behind every gap write', () => {
    for (const [path, reason] of Object.entries(GAP_WRITES)) {
      const file = byPath.get(path);
      expect(file, `${path} must exist`).toBeDefined();
      expect(reason.length, `${path} must name what is missing`).toBeGreaterThan(0);
      expect(file?.text, `${path} must carry its GAP marker`).toContain('GAP(P1-E01)');
    }
  });

  it('chooses every reference through an EntityPicker in the migrated pages', () => {
    const missing: string[] = [];
    for (const page of MIGRATED_PAGES_WITH_PICKERS) {
      const file = byPath.get(page);
      expect(file, `${page} must exist`).toBeDefined();
      if (!file?.text.includes('EntityPicker')) missing.push(page);
    }
    expect(missing).toEqual([]);
  });

  it('binds the migrated create and edit forms to the entity schema where the shape allows it', () => {
    const schemaBound = ['pages/DepartmentsPage.tsx', 'pages/DesignationsPage.tsx', 'pages/AcademicYearsPage.tsx', 'pages/StaffListPage.tsx'];
    for (const page of schemaBound) {
      const text = byPath.get(page)?.text ?? '';
      expect(text, `${page} must bind createSchemaFor`).toContain('createSchemaFor');
      expect(text, `${page} must bind updateSchemaFor`).toContain('updateSchemaFor');
      expect(text, `${page} must send the version it read`).toContain('expectedVersion');
    }
  });

  it('gives the module data layer two ABOUTME lines', () => {
    const added = files.filter((file) => /data\/(canonicalRepository|useCanonical|useWritableRepository)/.test(file.modulePath));
    expect(added.length).toBeGreaterThan(3);
    for (const file of added) {
      const head = file.text.split('\n').slice(0, 2);
      expect(head[0]?.startsWith('// ABOUTME:'), `${file.modulePath} needs an ABOUTME line`).toBe(true);
      expect(head[1]?.startsWith('// ABOUTME:'), `${file.modulePath} needs a second ABOUTME line`).toBe(true);
    }
  });
});

describe('the guard sees every spelling a page could use', () => {
  it('reads a collection held in a variable, and writes through the same variable', () => {
    const fixture = [
      'const appData = useAppData();',
      'const rows = appData.students;',
      'appData.addStudent({ given_name: "Zawadi" });',
      'appData.deleteStaff("x");',
    ].join('\n');

    expect(collectionsReadBy(fixture)).toContain('students');
    expect(writesThroughLegacy(fixture)).toEqual(expect.arrayContaining(['addStudent', 'deleteStaff']));
  });

  it('types a holder: the annotation does not hide the variable spelling', () => {
    const fixture = [
      'const ctx: AdministrationContextValue = useAppData();',
      'const rows = ctx.studentAttendance;',
    ].join('\n');

    expect(collectionsReadBy(fixture)).toContain('studentAttendance');
  });

  it('reads a useDatabaseCollection call by its literal and by the constant naming it', () => {
    const literal = "const years = useDatabaseCollection<Record<string, unknown>>('academic_years');";
    expect(collectionsReadBy(literal)).toContain('academic_years');

    const throughConstant = [
      "export const COLLECTION = 'school_periods';",
      'const periods = useDatabaseCollection<PeriodRow>(COLLECTION);',
    ].join('\n');
    expect(collectionsReadBy(throughConstant)).toContain('school_periods');
  });

  it('leaves a canonical read alone when no legacy layer is involved', () => {
    const fixture = 'const years = useEntityQuery(repository, "academic_year");';
    expect(collectionsReadBy(fixture)).toEqual([]);
  });
});
