// ABOUTME: Source-level guard for the administration module (P1-E01): no canonical collection is
// ABOUTME: read through the legacy context outside the named pending list, and no useAppData() write remains.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MODULE_ROOT = join(process.cwd(), 'src', 'modules', 'administration');

/** The legacy collections the canonical registry serves. */
const CANONICAL_LEGACY_COLLECTIONS = [
  'students',
  'staff',
  'classes',
  'classStreams',
  'departments',
  'designations',
  'academicYears',
  'schoolPeriods',
  'users',
  'parentsGuardians',
  'studentGuardianRelationships',
  'studentAttendance',
] as const;

/**
 * The pages whose canonical reads are still pending, with the entities that serve them.
 *
 * The promotion screen drives the legacy promotion hook, which moves the legacy student and
 * class-history rows; both are migrated by P1-C02/P1-C03 before the screen can move.
 */
const PENDING_CANONICAL_MIGRATION: Record<string, string> = {
  'pages/StudentPromotionPage.tsx': 'learner, class_group, academic_year',
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

/** The names a `useAppData()` call destructures. */
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
  return names;
}

const WRITE_NAME = /^(add|update|delete|remove|save|create|commit|undo|insert|assign|bulk)[A-Z]/;

/** The writes a page makes through `useAppData()`, by destructuring or by `appData.x`. */
function writesThroughLegacy(source: string): string[] {
  const writes = collectionsReadBy(source).filter((name) => WRITE_NAME.test(name));
  const appData = /const\s+appData\s*=\s*useAppData\(\)/.test(source);
  if (!appData) return writes;
  for (const match of source.matchAll(/appData\.(\w+)/g)) {
    const name = match[1] as string;
    if (WRITE_NAME.test(name)) writes.push(name);
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
