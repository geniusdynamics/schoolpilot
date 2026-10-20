// ABOUTME: Tests the integrity and repair tool against a real SQLite database holding
// ABOUTME: audit-era data: a legacy-shaped learner table with numeric ids, a missing class
// ABOUTME: group, an orphan reference and a duplicate id.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository, guardsFor } from '@/data/repository';
import { applyAuditSchema } from '@/data/repository/audit';
import {
  closeTestContext,
  createTestContext,
} from '@/data/repository/__tests__/helpers';

import { applyIntegrityFixes, CLEAR_REFERENCE, findingsByKind, runIntegrityReport } from '..';
import type { IntegrityFinding, IntegrityFindingKind } from '../types';

/** The ids of the fixture rows. Every one of them is a canonical UUIDv7. */
const IDS = {
  institution: '01930000-0000-7000-8000-000000000001',
  house: '01930000-0000-7000-8000-000000000002',
  household: '01930000-0000-7000-8000-000000000003',
  academicYear: '01930000-0000-7000-8000-000000000004',
  programme: '01930000-0000-7000-8000-000000000005',
  level: '01930000-0000-7000-8000-000000000006',
  classGroup: '01930000-0000-7000-8000-000000000007',
  learner: '01930000-0000-7000-8000-000000000008',
  orphanLearner: '01930000-0000-7000-8000-000000000009',
  malformedLearner: '01930000-0000-7000-8000-00000000000a',
  classlessLearner: '01930000-0000-7000-8000-00000000000b',
  duplicate: '01930000-0000-7000-8000-00000000000c',
  missingHouse: '01930000-0000-7000-8000-00000000000d',
  otherLevel: '01930000-0000-7000-8000-000000000010',
  otherYear: '01930000-0000-7000-8000-000000000011',
  otherClassGroup: '01930000-0000-7000-8000-000000000012',
  archivedClassGroup: '01930000-0000-7000-8000-000000000013',
  legacyLearner: '01930000-0000-7000-8000-00000000000e',
} as const;

/** The enrolments of the fixture. */
const ENROLMENTS = {
  good: '01930000-0000-7000-8000-0000000000e1',
  legacyClassGroup: '01930000-0000-7000-8000-0000000000e2',
  orphanLearner: '01930000-0000-7000-8000-0000000000e3',
  malformedLearner: '01930000-0000-7000-8000-0000000000e4',
} as const;

const TIMESTAMP = '2027-01-05T08:00:00.000Z';

/**
 * The audit-era database.
 *
 * The tables keep the shape they had before the canonical model: the learner table has no
 * primary key, so it can hold the same id twice, and its references hold the values the
 * legacy system wrote.
 */
const AUDIT_ERA_SCHEMA = [
  `CREATE TABLE "institution" ("id" TEXT PRIMARY KEY, "name" TEXT)`,
  `CREATE TABLE "house" ("id" TEXT PRIMARY KEY, "name" TEXT)`,
  `CREATE TABLE "household" ("id" TEXT PRIMARY KEY, "name" TEXT)`,
  `CREATE TABLE "academic_year" ("id" TEXT PRIMARY KEY, "name" TEXT, "start_date" TEXT, "end_date" TEXT)`,
  `CREATE TABLE "programme" ("id" TEXT PRIMARY KEY, "name" TEXT)`,
  `CREATE TABLE "level" ("id" TEXT PRIMARY KEY, "name" TEXT)`,
  `CREATE TABLE "class_group" (
     "id" TEXT PRIMARY KEY, "name" TEXT, "institution_id" TEXT,
     "academic_year_id" TEXT, "programme_id" TEXT, "level_id" TEXT, "deleted_at" TEXT
   )`,
  `CREATE TABLE "learner" (
     "id" TEXT, "institution_id" TEXT, "given_name" TEXT, "family_name" TEXT,
     "admission_number" TEXT, "status" TEXT, "house_id" TEXT, "household_id" TEXT
   )`,
  `CREATE TABLE "enrolment" (
     "id" TEXT PRIMARY KEY, "institution_id" TEXT, "learner_id" TEXT,
     "academic_year_id" TEXT, "programme_id" TEXT, "level_id" TEXT, "class_group_id" TEXT,
     "status" TEXT, "start_date" TEXT, "end_date" TEXT, "entry_reason" TEXT,
     "created_at" TEXT, "updated_at" TEXT, "deleted_at" TEXT
   )`,
];

/** An enrolment row of the audit-era fixture. */
function enrolmentRow(id: string, learnerId: string, classGroupId: string): string {
  return `INSERT INTO "enrolment" (
      "id", "institution_id", "learner_id", "academic_year_id", "programme_id", "level_id",
      "class_group_id", "status", "start_date", "end_date", "entry_reason",
      "created_at", "updated_at", "deleted_at"
    ) VALUES (
      '${id}', '${IDS.institution}', '${learnerId}', '${IDS.academicYear}', '${IDS.programme}',
      '${IDS.level}', '${classGroupId}', 'active', '2027-01-05', NULL, 'new_admission',
      '${TIMESTAMP}', '${TIMESTAMP}', NULL
    )`;
}

const AUDIT_ERA_ROWS = [
  `INSERT INTO "institution" VALUES ('${IDS.institution}', 'Greenfield School')`,
  `INSERT INTO "house" VALUES ('${IDS.house}', 'Bamba House')`,
  `INSERT INTO "household" VALUES ('${IDS.household}', 'Otieno household')`,
  `INSERT INTO "academic_year" VALUES ('${IDS.academicYear}', '2027', '2027-01-05', '2027-12-18')`,
  `INSERT INTO "academic_year" VALUES ('${IDS.otherYear}', '2028', '2028-01-05', '2028-12-18')`,
  `INSERT INTO "programme" VALUES ('${IDS.programme}', 'CBC')`,
  `INSERT INTO "level" VALUES ('${IDS.level}', 'Grade 6')`,
  `INSERT INTO "level" VALUES ('${IDS.otherLevel}', 'Grade 7')`,
  `INSERT INTO "class_group" VALUES ('${IDS.classGroup}', 'Grade 6 Blue', '${IDS.institution}', '${IDS.academicYear}', '${IDS.programme}', '${IDS.level}', NULL)`,
  // A class group of another level and year: it would break the class-group alignment.
  `INSERT INTO "class_group" VALUES ('${IDS.otherClassGroup}', 'Grade 7 Red', '${IDS.institution}', '${IDS.otherYear}', '${IDS.programme}', '${IDS.otherLevel}', NULL)`,
  // An archived class group: it is not part of the live model.
  `INSERT INTO "class_group" VALUES ('${IDS.archivedClassGroup}', 'Grade 6 Green (archived)', '${IDS.institution}', '${IDS.academicYear}', '${IDS.programme}', '${IDS.level}', '${TIMESTAMP}')`,
  // A learner in a class, with a live house and household.
  `INSERT INTO "learner" VALUES ('${IDS.learner}', '${IDS.institution}', 'Amani', 'Otieno', 'ADM-1', 'enrolled', '${IDS.house}', '${IDS.household}')`,
  enrolmentRow(ENROLMENTS.good, IDS.learner, IDS.classGroup),
  // A learner in a class group the legacy system numbered.
  `INSERT INTO "learner" VALUES ('${IDS.legacyLearner}', '${IDS.institution}', 'Zawadi', 'Mwangi', 'ADM-8', 'applicant', NULL, NULL)`,
  enrolmentRow(ENROLMENTS.legacyClassGroup, IDS.legacyLearner, '42'),
  // A learner whose house was deleted.
  `INSERT INTO "learner" VALUES ('${IDS.orphanLearner}', '${IDS.institution}', 'Bodu', 'Achieng', 'ADM-2', 'enrolled', '${IDS.missingHouse}', NULL)`,
  enrolmentRow(ENROLMENTS.orphanLearner, IDS.orphanLearner, IDS.classGroup),
  // A learner whose household is a legacy number.
  `INSERT INTO "learner" VALUES ('${IDS.malformedLearner}', '${IDS.institution}', 'Chelsea', 'Wekesa', 'ADM-3', 'enrolled', NULL, '42')`,
  enrolmentRow(ENROLMENTS.malformedLearner, IDS.malformedLearner, IDS.classGroup),
  // A learner that is in no class at all.
  `INSERT INTO "learner" VALUES ('${IDS.classlessLearner}', '${IDS.institution}', 'Dalia', 'Mumo', 'ADM-4', 'enrolled', NULL, NULL)`,
  // Two rows that carry the same id.
  `INSERT INTO "learner" VALUES ('${IDS.duplicate}', '${IDS.institution}', 'First', 'Row', 'ADM-5', 'applicant', NULL, NULL)`,
  `INSERT INTO "learner" VALUES ('${IDS.duplicate}', '${IDS.institution}', 'Second', 'Row', 'ADM-6', 'applicant', NULL, NULL)`,
];

let adapter: SqliteAdapter;

beforeEach(async () => {
  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  await applyAuditSchema(adapter);
  for (const statement of AUDIT_ERA_SCHEMA) await adapter.exec(statement);
  for (const statement of AUDIT_ERA_ROWS) await adapter.exec(statement);
});

afterEach(async () => {
  await adapter.close();
});

/** The rows of a table, in the order the table holds them. */
async function readTable(table: string): Promise<readonly Record<string, unknown>[]> {
  return adapter.all<Record<string, unknown>>(`SELECT * FROM "${table}" ORDER BY rowid`);
}

/** The one finding of a kind that sits in a column of a row. */
function findingOf(
  findings: readonly IntegrityFinding[],
  kind: IntegrityFindingKind,
  column: string,
  rowId: string
): IntegrityFinding {
  const found = findings.find(
    (finding) => finding.kind === kind && finding.column === column && finding.rowId === rowId
  );
  if (!found) throw new Error(`no ${kind} finding in ${column} of ${rowId}`);
  return found;
}

describe('the integrity report', () => {
  it('finds the orphan, the malformed references, the missing class group and the duplicate id', async () => {
    const report = await runIntegrityReport(adapter);
    const grouped = findingsByKind(report);

    expect(grouped.orphan_reference).toHaveLength(1);
    expect(grouped.orphan_reference[0]).toMatchObject({
      entity: 'learner',
      table: 'learner',
      column: 'house_id',
      value: IDS.missingHouse,
      rowId: IDS.orphanLearner,
    });

    expect(grouped.malformed_reference).toHaveLength(2);
    const household = findingOf(
      grouped.malformed_reference,
      'malformed_reference',
      'household_id',
      IDS.malformedLearner
    );
    expect(household).toMatchObject({ table: 'learner', value: '42' });
    const enrolment = findingOf(
      grouped.malformed_reference,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );
    expect(enrolment).toMatchObject({ entity: 'enrolment', value: '42' });

    expect(grouped.null_stream).toHaveLength(1);
    expect(grouped.null_stream[0]).toMatchObject({
      entity: 'learner',
      rowId: IDS.classlessLearner,
    });

    expect(grouped.duplicate_id).toHaveLength(1);
    expect(grouped.duplicate_id[0]).toMatchObject({
      entity: 'learner',
      column: 'id',
      value: IDS.duplicate,
    });
  });

  it('names the row, the column and the value of every finding', async () => {
    const report = await runIntegrityReport(adapter);
    for (const finding of report.findings) {
      expect(finding.entity).toBeTruthy();
      expect(finding.table).toBeTruthy();
      expect(finding.column).toBeTruthy();
      expect(finding.message).toContain(finding.table);
      expect(finding.rowId).toBeTruthy();
    }
  });

  it('reports the tables this database does not hold instead of failing', async () => {
    const report = await runIntegrityReport(adapter);
    expect(report.checked).toContain('learner');
    expect(report.missingTables).toContain('invoice');
    expect(report.findings.every((finding) => finding.entity !== 'invoice')).toBe(true);
  });

  it('finds nothing in a database the repository seeded', async () => {
    const context = await createTestContext();
    try {
      const report = await runIntegrityReport(context.adapter);
      expect(report.findings).toEqual([]);
    } finally {
      await closeTestContext(context);
    }
  });

  it('finds nothing in a database without defects', async () => {
    const clean = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await clean.open();
    try {
      for (const statement of AUDIT_ERA_SCHEMA) await clean.exec(statement);
      await clean.exec(
        `INSERT INTO "institution" VALUES ('${IDS.institution}', 'Greenfield School')`
      );
      await clean.exec(
        `INSERT INTO "learner" VALUES ('${IDS.learner}', '${IDS.institution}', 'Amani', 'Otieno', 'ADM-1', 'applicant', NULL, NULL)`
      );
      const report = await runIntegrityReport(clean);
      expect(report.findings).toHaveLength(0);
    } finally {
      await clean.close();
    }
  });

  it('does not report a learner whose status is not enrolled', async () => {
    await adapter.exec(
      `INSERT INTO "learner" VALUES ('01930000-0000-7000-8000-0000000000f0', '${IDS.institution}', 'Wanjiru', 'Kimani', 'ADM-7', 'suspended', NULL, NULL)`
    );
    const report = await runIntegrityReport(adapter);
    const grouped = findingsByKind(report);
    expect(
      grouped.null_stream.some((finding) => finding.rowId === '01930000-0000-7000-8000-0000000000f0')
    ).toBe(false);
  });
});

describe('the choices a fix offers', () => {
  it('offers the live rows of the target table and the choice to clear the reference', async () => {
    const report = await runIntegrityReport(adapter);
    const malformed = findingOf(
      report.findings,
      'malformed_reference',
      'household_id',
      IDS.malformedLearner
    );

    const options = malformed.fix?.options ?? [];
    expect(options.map((option) => option.id)).toContain(CLEAR_REFERENCE);
    expect(options.map((option) => option.id)).toContain(IDS.household);
    expect(options.every((option) => option.selectable)).toBe(true);
  });

  it('offers every live row of the target table, not the first fifty', async () => {
    for (let index = 0; index < 60; index += 1) {
      const id = `01930000-0000-7000-8000-00000000${(0x1000 + index).toString(16)}`;
      await adapter.exec(`INSERT INTO "household" VALUES ('${id}', 'Household ${index}')`);
    }
    const report = await runIntegrityReport(adapter);
    const malformed = findingOf(
      report.findings,
      'malformed_reference',
      'household_id',
      IDS.malformedLearner
    );

    const households = (malformed.fix?.options ?? []).filter(
      (option) => option.id !== CLEAR_REFERENCE
    );
    expect(households).toHaveLength(61);
  });

  it('does not offer an archived class group', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    const options = legacy.fix?.options ?? [];
    expect(options.map((option) => option.id)).not.toContain(IDS.archivedClassGroup);
    expect(options.map((option) => option.id)).toContain(IDS.classGroup);
  });

  it('marks a class group of another level or year as not available, with the reason', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    const other = (legacy.fix?.options ?? []).find(
      (option) => option.id === IDS.otherClassGroup
    );
    expect(other).toBeDefined();
    expect(other?.selectable).toBe(false);
    expect(other?.reason).toContain('Grade 7');
    expect(other?.reason).toContain('Grade 6');

    const matching = (legacy.fix?.options ?? []).find(
      (option) => option.id === IDS.classGroup
    );
    expect(matching?.selectable).toBe(true);
    expect(matching?.reason).toBeNull();
  });
});

describe('the consented fixes', () => {
  it('changes nothing when nothing is consented to', async () => {
    const before = await readTable('learner');
    const report = await runIntegrityReport(adapter);

    const result = await applyIntegrityFixes({ adapter, report, consent: { findingIds: [] } });

    expect(result.changes).toHaveLength(0);
    expect(await readTable('learner')).toEqual(before);
  });

  it('changes nothing in a dry run, and says what it would change', async () => {
    const before = await readTable('learner');
    const beforeEnrolments = await readTable('enrolment');
    const report = await runIntegrityReport(adapter);
    const orphan = findingOf(report.findings, 'orphan_reference', 'house_id', IDS.orphanLearner);

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [orphan.id], decisions: { [orphan.id]: CLEAR_REFERENCE } },
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      findingId: orphan.id,
      kind: 'replace_reference',
      before: IDS.missingHouse,
      after: null,
    });
    expect(await readTable('learner')).toEqual(before);
    expect(await readTable('enrolment')).toEqual(beforeEnrolments);
  });

  it('repairs exactly the finding that was consented to', async () => {
    const report = await runIntegrityReport(adapter);
    const orphan = findingOf(report.findings, 'orphan_reference', 'house_id', IDS.orphanLearner);

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [orphan.id], decisions: { [orphan.id]: CLEAR_REFERENCE } },
    });

    expect(result.changes).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);

    const repaired = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "learner" WHERE "id" = ?',
      [IDS.orphanLearner]
    );
    expect(repaired?.['house_id']).toBeNull();

    // The other defects are still there: only the consented finding was repaired.
    const untouched = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "learner" WHERE "id" = ?',
      [IDS.malformedLearner]
    );
    expect(untouched?.['household_id']).toBe('42');
  });

  it('leaves a finding the user did not name alone', async () => {
    const report = await runIntegrityReport(adapter);
    const malformed = findingOf(
      report.findings,
      'malformed_reference',
      'household_id',
      IDS.malformedLearner
    );
    const orphan = findingOf(report.findings, 'orphan_reference', 'house_id', IDS.orphanLearner);

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [malformed.id], decisions: { [malformed.id]: CLEAR_REFERENCE } },
    });

    expect(result.changes).toHaveLength(1);
    const repaired = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "learner" WHERE "id" = ?',
      [IDS.malformedLearner]
    );
    expect(repaired?.['household_id']).toBeNull();

    const untouched = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "learner" WHERE "id" = ?',
      [IDS.orphanLearner]
    );
    expect(untouched?.['house_id']).toBe(IDS.missingHouse);
    expect(orphan.kind).toBe('orphan_reference');
  });

  it('refuses to guess which row a legacy id meant, and says what it needs', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    const refused = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [legacy.id] },
    });

    expect(refused.changes).toHaveLength(0);
    expect(refused.skipped[0].reason).toContain('class_group');
    const row = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "id" = ?',
      [ENROLMENTS.legacyClassGroup]
    );
    expect(row?.['class_group_id']).toBe('42');
  });

  it('repairs a legacy id once the user says which row it meant', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [legacy.id], decisions: { [legacy.id]: IDS.classGroup } },
    });

    expect(result.changes).toHaveLength(1);
    const row = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "id" = ?',
      [ENROLMENTS.legacyClassGroup]
    );
    expect(row?.['class_group_id']).toBe(IDS.classGroup);
  });

  it('refuses a class group of another level or year, the way the repository refuses it', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [legacy.id], decisions: { [legacy.id]: IDS.otherClassGroup } },
    });

    expect(result.changes).toHaveLength(0);
    expect(result.skipped[0].reason).toContain('another level or year');
    const row = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "id" = ?',
      [ENROLMENTS.legacyClassGroup]
    );
    expect(row?.['class_group_id']).toBe('42');
  });

  it('refuses the row the repository itself refuses (spec 02 §12.2)', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [legacy.id], decisions: { [legacy.id]: IDS.otherClassGroup } },
    });

    // The repository's own guard refuses the same row: the tool and the repository agree.
    const after = {
      id: ENROLMENTS.legacyClassGroup,
      institution_id: IDS.institution,
      learner_id: IDS.legacyLearner,
      academic_year_id: IDS.academicYear,
      programme_id: IDS.programme,
      level_id: IDS.level,
      class_group_id: IDS.otherClassGroup,
      status: 'active',
      start_date: '2027-01-05',
      entry_reason: 'new_admission',
    };
    await expect(async () => {
      for (const guard of guardsFor('enrolment')) {
        await guard({
          entity: 'enrolment',
          action: 'update',
          before: null,
          after,
          runner: adapter,
          now: new Date(TIMESTAMP),
        });
      }
    }).rejects.toThrow(/class_group_alignment/);
  });

  it('keeps the repaired enrolment aligned with its class group', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [legacy.id], decisions: { [legacy.id]: IDS.classGroup } },
    });

    const row = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "id" = ?',
      [ENROLMENTS.legacyClassGroup]
    );
    const group = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "class_group" WHERE "id" = ?',
      [IDS.classGroup]
    );
    expect(row?.['level_id']).toBe(group?.['level_id']);
    expect(row?.['academic_year_id']).toBe(group?.['academic_year_id']);
  });

  it('refuses an archived class group', async () => {
    const report = await runIntegrityReport(adapter);
    const legacy = findingOf(
      report.findings,
      'malformed_reference',
      'class_group_id',
      ENROLMENTS.legacyClassGroup
    );

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [legacy.id], decisions: { [legacy.id]: IDS.archivedClassGroup } },
    });

    expect(result.changes).toHaveLength(0);
    expect(result.skipped[0].reason).toContain('archived');
    const row = await adapter.get<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "id" = ?',
      [ENROLMENTS.legacyClassGroup]
    );
    expect(row?.['class_group_id']).toBe('42');
  });

  it('refuses to enrol a learner in an archived class group', async () => {
    const report = await runIntegrityReport(adapter);
    const finding = findingOf(
      report.findings,
      'null_stream',
      'enrolment.learner_id',
      IDS.classlessLearner
    );

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [finding.id], decisions: { [finding.id]: IDS.archivedClassGroup } },
    });

    expect(result.changes).toHaveLength(0);
    expect(result.skipped[0].reason).toContain('archived');
    const enrolments = await adapter.all<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "learner_id" = ?',
      [IDS.classlessLearner]
    );
    expect(enrolments).toHaveLength(0);
  });

  it('enrols a learner that has no class group, in the class group the user names', async () => {
    const report = await runIntegrityReport(adapter);
    const finding = findingOf(
      report.findings,
      'null_stream',
      'enrolment.learner_id',
      IDS.classlessLearner
    );

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [finding.id], decisions: { [finding.id]: IDS.classGroup } },
    });

    expect(result.changes).toHaveLength(1);
    const enrolments = await adapter.all<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "learner_id" = ?',
      [IDS.classlessLearner]
    );
    expect(enrolments).toHaveLength(1);
    expect(enrolments[0]).toMatchObject({
      learner_id: IDS.classlessLearner,
      class_group_id: IDS.classGroup,
      academic_year_id: IDS.academicYear,
      programme_id: IDS.programme,
      level_id: IDS.level,
      status: 'active',
      start_date: '2027-01-05',
    });
  });

  it('gives the second row of a duplicate id a new id', async () => {
    const report = await runIntegrityReport(adapter);
    const duplicate = findingOf(report.findings, 'duplicate_id', 'id', IDS.duplicate);

    const result = await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [duplicate.id] },
    });

    expect(result.changes).toHaveLength(1);
    const rows = await adapter.all<Record<string, unknown>>(
      'SELECT * FROM "learner" WHERE "admission_number" IN (?, ?)',
      ['ADM-5', 'ADM-6']
    );
    const ids = rows.map((row) => String(row['id']));
    expect(new Set(ids).size).toBe(2);
    expect(ids).toContain(IDS.duplicate);
  });

  it('refuses to point at a table the database does not hold', async () => {
    const bare = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await bare.open();
    try {
      await bare.exec(`CREATE TABLE "enrolment" ("id" TEXT PRIMARY KEY, "class_group_id" TEXT)`);
      await bare.exec(
        `INSERT INTO "enrolment" VALUES ('01930000-0000-7000-8000-0000000000e1', '${IDS.classGroup}')`
      );

      const report = await runIntegrityReport(bare);
      const orphan = report.findings.find((finding) => finding.kind === 'orphan_reference');
      expect(orphan).toBeDefined();

      const result = await applyIntegrityFixes({
        adapter: bare,
        report,
        consent: {
          findingIds: [orphan?.id ?? ''],
          decisions: { [orphan?.id ?? '']: IDS.classGroup },
        },
      });

      expect(result.changes).toHaveLength(0);
      expect(result.skipped[0].reason).toContain('class_group');
    } finally {
      await bare.close();
    }
  });
});

describe('the record of what was done', () => {
  it('writes the change into the audit trail of the repository', async () => {
    const repository = createRepository({ adapter, actor: '01930000-0000-7000-8000-0000000000ff' });
    const report = await runIntegrityReport(adapter);
    const orphan = findingOf(report.findings, 'orphan_reference', 'house_id', IDS.orphanLearner);

    await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [orphan.id], decisions: { [orphan.id]: CLEAR_REFERENCE } },
      actor: '01930000-0000-7000-8000-0000000000ff',
    });

    const trail = await repository.auditTrail('learner', IDS.orphanLearner);
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      entity: 'learner',
      entityId: IDS.orphanLearner,
      action: 'update',
      actorId: '01930000-0000-7000-8000-0000000000ff',
      changedFields: ['house_id'],
    });
    expect(trail[0].reason).toContain('integrity repair');
  });

  it('records the enrolment it created', async () => {
    const repository = createRepository({ adapter });
    const report = await runIntegrityReport(adapter);
    const finding = findingOf(
      report.findings,
      'null_stream',
      'enrolment.learner_id',
      IDS.classlessLearner
    );

    await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [finding.id], decisions: { [finding.id]: IDS.classGroup } },
    });

    const enrolments = await adapter.all<Record<string, unknown>>(
      'SELECT * FROM "enrolment" WHERE "learner_id" = ?',
      [IDS.classlessLearner]
    );
    const created = enrolments[0];
    const trail = await repository.auditTrail('enrolment', String(created['id']));
    expect(trail).toHaveLength(1);
    expect(trail[0].action).toBe('create');
  });

  it('writes nothing when the run is a dry run', async () => {
    const repository = createRepository({ adapter });
    const report = await runIntegrityReport(adapter);
    const orphan = findingOf(report.findings, 'orphan_reference', 'house_id', IDS.orphanLearner);

    await applyIntegrityFixes({
      adapter,
      report,
      consent: { findingIds: [orphan.id], decisions: { [orphan.id]: CLEAR_REFERENCE } },
      dryRun: true,
    });

    expect(await repository.auditTrail('learner', IDS.orphanLearner)).toHaveLength(0);
  });
});
