// ABOUTME: The fixture migration test for M3: the legacy learners and guardians of the P0-era
// ABOUTME: seed, the guardian de-duplication, the identifiers, the enrolments and the rollback.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import {
  createDumpBackupStrategy,
  createMigrationRunner,
  type MigrationRunner,
} from '@/data/migrations';

import { legacyKey } from './001-legacy-calendar';
import { createInstitutionCalendarMigration, LEGACY_ID_MAP_TABLE, LEGACY_NOTES_TABLE, LEGACY_UNMAPPABLE_TABLE } from './001-institution-calendar';
import { createClassGroupMigration, CREATED_TABLE } from './002-class-groups';
import { buildPeopleFixture, FIXTURE_NOW, type PeopleFixtureOptions } from './003-legacy-fixture';
import { createLearnerMigration, readPeopleMigrationReport } from './003-learners';
import { normaliseLegacyPhone } from './003-people-rules';
import {
  LEVEL_MAPPING_TABLE,
  proposeLevelMapping,
  readLevelMappingSource,
  saveLevelMapping,
  type LevelMappingEntry,
} from './002-level-mapping';

/** The only id format the canonical model stores (spec 02 §1.1). */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

async function readRows(adapter: SqliteAdapter, table: string): Promise<Row[]> {
  return adapter.all<Row>(`SELECT * FROM "${table}" ORDER BY rowid`);
}

async function tableExists(adapter: SqliteAdapter, table: string): Promise<boolean> {
  const row = await adapter.get<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return row !== null;
}

/** Builds the legacy fixture and applies M1, the way the application runs the migrations. */
async function prepare(options: PeopleFixtureOptions = {}): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await applyCanonicalSchema(adapter);
  await buildPeopleFixture(adapter, options);
  await migrateCalendarOnly(adapter);
  return adapter;
}

/** Runs migration M1 alone; the class groups and the people wait for the full runner. */
async function migrateCalendarOnly(adapter: SqliteAdapter): Promise<void> {
  const runner = createMigrationRunner({
    adapter,
    migrations: [createInstitutionCalendarMigration({ now: () => FIXTURE_NOW })],
    backupPolicy: 'never',
    now: () => FIXTURE_NOW,
  });
  const result = await runner.run();
  if (result.status === 'failed') throw new Error(result.failed?.error ?? 'migration M1 failed');
}

/** Saves the proposed level mapping, the way the interactive step does. */
async function confirm(adapter: SqliteAdapter): Promise<LevelMappingEntry[]> {
  const source = await readLevelMappingSource(adapter);
  const proposal = proposeLevelMapping(source, { referenceDate: '2024-10-01' });
  const entries = proposal.entries.map((entry) => ({
    ...entry,
    confirmedAt: '2024-10-01T09:00:00Z',
  }));
  await adapter.transaction(async (tx) => {
    await saveLevelMapping(tx, entries);
  });
  return entries;
}

function runnerFor(adapter: SqliteAdapter, withBackup = false): MigrationRunner {
  return createMigrationRunner({
    adapter,
    migrations: [
      createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
      createClassGroupMigration({ now: () => FIXTURE_NOW }),
      createLearnerMigration({ now: () => FIXTURE_NOW }),
    ],
    ...(withBackup ? { backup: createDumpBackupStrategy() } : { backupPolicy: 'never' as const }),
    now: () => FIXTURE_NOW,
  });
}

/** Prepares the database and runs M1, M2 and M3. */
async function prepareAndRun(options: PeopleFixtureOptions = {}): Promise<SqliteAdapter> {
  const adapter = await prepare(options);
  await confirm(adapter);
  const result = await runnerFor(adapter).run();
  if (result.status === 'failed') throw new Error(result.failed?.error ?? 'migration M3 failed');
  return adapter;
}

function learnerByAdmission(learners: readonly Row[], admission: string): Row {
  const found = learners.find((row) => row.admission_number === admission);
  if (found === undefined) throw new Error(`the learner ${admission} is missing`);
  return found;
}

function guardianPhones(guardian: Row): string[] {
  const raw = guardian.phones;
  if (typeof raw !== 'string') return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed)
    ? parsed
        .map((entry) =>
          typeof entry === 'object' && entry !== null
            ? (entry as Record<string, unknown>)['number']
            : undefined
        )
        .filter((value): value is string => typeof value === 'string')
    : [];
}

function guardianName(guardian: Row): string {
  const middles = guardian.middle_names;
  const parsed: unknown = typeof middles === 'string' ? JSON.parse(middles) : [];
  const middle = Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
  return [guardian.given_name, ...middle, guardian.family_name].join(' ');
}

function linksOf(links: readonly Row[], learnerId: unknown): Row[] {
  return links.filter((row) => row.learner_id === learnerId);
}

/** A map from the normalised legacy stream id to the class group it became. */
function classGroupByStream(map: readonly Row[]): Map<string, string> {
  return new Map(
    map
      .filter(
        (row) => row.legacy_table === 'class_streams' && row.canonical_entity === 'class_group'
      )
      .map((row) => [String(row.legacy_id), String(row.canonical_id)])
  );
}

describe('migration M3: the learners, guardians and enrolments', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = await prepareAndRun();
  });

  afterEach(async () => {
    await adapter?.close();
  });

  it('writes a canonical learner for every legacy student it can name', async () => {
    const learners = await readRows(adapter, 'learner');
    expect(learners).toHaveLength(64);
    for (const learner of learners) {
      expect(String(learner.id)).toMatch(UUID_V7);
      expect(learner.institution_id).toBeTruthy();
    }

    const s001 = learnerByAdmission(learners, 'ADM001');
    expect(guardianName(s001)).toBe('Jim Halpert');
    expect(s001.name_order).toBe('given_first');
    expect(s001.gender).toBe('male');
    expect(s001.status).toBe('enrolled');
    expect(s001.residence_status).toBe('boarder');
    expect(JSON.parse(String(s001.medical))).toEqual({ conditions: ['Asthma', 'Peanut allergy'] });

    const dayScholar = learnerByAdmission(learners, 'ADM002');
    expect(dayScholar.residence_status).toBe('day');

    // The lifecycle is the learner's status, not the class.
    expect(learnerByAdmission(learners, 'ADM911').status).toBe('graduated');
    expect(learnerByAdmission(learners, 'ADM912').status).toBe('transferred_out');
    expect(learnerByAdmission(learners, 'ADM913').status).toBe('enrolled');

    // The duplicate admission number is reported, not merged into the first learner.
    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const duplicate = unmappable.find(
      (row) => row.canonical_entity === 'learner' && row.legacy_id === 'S914'
    );
    expect(duplicate).toBeDefined();
    expect(String(duplicate?.reason)).toContain('is already held by the learner "ADM001"');
  });

  it('de-duplicates guardians by phone across the national and international formats', async () => {
    const guardians = await readRows(adapter, 'guardian');
    const links = await readRows(adapter, 'learner_guardian');
    const learners = await readRows(adapter, 'learner');

    // 25 seed guardians plus four the fixture added; one phone is one guardian.
    expect(await readRows(adapter, 'parents_guardians')).toHaveLength(29);
    expect(guardians).toHaveLength(12);
    for (const guardian of guardians) {
      expect(String(guardian.id)).toMatch(UUID_V7);
      expect(guardianPhones(guardian)).toHaveLength(1);
    }
    // Two canonical guardians never carry the same number.
    expect(new Set(guardians.flatMap((guardian) => guardianPhones(guardian))).size).toBe(12);

    // The siblings' guardian is written nationally by one row and internationally by the other.
    const siblingOne = linksOf(links, learnerByAdmission(learners, 'ADM901').id);
    const siblingTwo = linksOf(links, learnerByAdmission(learners, 'ADM902').id);
    expect(siblingOne).toHaveLength(1);
    expect(siblingTwo).toHaveLength(1);
    expect(siblingOne[0].guardian_id).toBe(siblingTwo[0].guardian_id);

    const siblingGuardian = guardians.find((row) => row.id === siblingOne[0].guardian_id);
    expect(siblingGuardian).toBeDefined();
    expect(guardianPhones(siblingGuardian ?? {})).toEqual(['+254712345678']);
    expect(guardianName(siblingGuardian ?? {})).toBe('Amina Juma');

    // The merge is on the record: the international copy names the national one it joined.
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    const merge = notes.find(
      (note) =>
        note.code === 'guardian_merged' && note.legacy_id === 'PG902' && Number(note.migration_version) === 3
    );
    expect(merge).toBeDefined();
    expect(String(merge?.message)).toContain('+254712345678');

    // A guardian with no phone is reported and never merged into a bucket of the others.
    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const withoutPhone = unmappable.find(
      (row) => row.canonical_entity === 'guardian' && row.legacy_id === 'PG903'
    );
    expect(withoutPhone).toBeDefined();
    expect(String(withoutPhone?.reason)).toContain('no phone');
    const withoutName = unmappable.find(
      (row) => row.canonical_entity === 'guardian' && row.legacy_id === 'PG904'
    );
    expect(withoutName).toBeDefined();
    expect(String(withoutName?.reason)).toContain('carries no name');
  });

  it('writes one guardian row and one link per learner', async () => {
    const links = await readRows(adapter, 'learner_guardian');
    const learners = await readRows(adapter, 'learner');
    const guardians = await readRows(adapter, 'guardian');

    expect(links).toHaveLength(61);
    for (const link of links) {
      expect(String(link.id)).toMatch(UUID_V7);
      expect(guardians.some((guardian) => guardian.id === link.guardian_id)).toBe(true);
      expect(learners.some((learner) => learner.id === link.learner_id)).toBe(true);
    }
    // No learner is linked to one guardian twice.
    for (const learner of learners) {
      const pairs = linksOf(links, learner.id).map((link) => String(link.guardian_id));
      expect(new Set(pairs).size).toBe(pairs.length);
    }

    // Siblings share one guardian row.
    const siblingOne = linksOf(links, learnerByAdmission(learners, 'ADM012').id);
    const siblingTwo = linksOf(links, learnerByAdmission(learners, 'ADM013').id);
    expect(siblingOne).toHaveLength(1);
    expect(siblingTwo).toHaveLength(1);
    expect(siblingOne[0].guardian_id).toBe(siblingTwo[0].guardian_id);

    // A learner can have a second guardian the relationship table names.
    const withAunt = linksOf(links, learnerByAdmission(learners, 'ADM005').id);
    expect(withAunt).toHaveLength(2);
    const aunt = withAunt.find((link) => link.relationship === 'other');
    expect(aunt).toBeDefined();
    expect(aunt?.is_primary).toBe(0);
    expect(aunt?.can_pick_up).toBe(1);
    expect(aunt?.receives_reports).toBe(0);
    expect(aunt?.has_parental_responsibility).toBe(0);

    // The relationship agrees with the embedded copy: one link, not two.
    expect(linksOf(links, learnerByAdmission(learners, 'ADM006').id)).toHaveLength(1);
    // The second primary is reported, and exactly one link stays primary.
    const withTwoPrimaries = linksOf(links, learnerByAdmission(learners, 'ADM007').id);
    expect(withTwoPrimaries).toHaveLength(2);
    expect(withTwoPrimaries.filter((link) => link.is_primary === 1)).toHaveLength(1);
    // A learner whose only guardian is not primary gets the link as its primary.
    const promoted = linksOf(links, learnerByAdmission(learners, 'ADM913').id);
    expect(promoted).toHaveLength(1);
    expect(promoted[0].is_primary).toBe(1);

    // The learner with no guardian has no link, and is reported.
    expect(linksOf(links, learnerByAdmission(learners, 'ADM905').id)).toHaveLength(0);

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    const codes = notes.filter((note) => Number(note.migration_version) === 3).map((note) => note.code);
    expect(codes).toContain('learner_guardian_multiple_primary');
    expect(codes).toContain('learner_guardian_no_primary');
  });

  it('maps the UPI to a learner identifier and refuses a value another learner holds', async () => {
    const identifiers = await readRows(adapter, 'identifier');
    const learners = await readRows(adapter, 'learner');
    const upis = identifiers.filter((row) => row.scheme === 'ke.kemis_upi');

    expect(upis).toHaveLength(6);
    expect(upis.map((row) => row.value).sort()).toEqual([
      'UPI-001',
      'UPI-002',
      'UPI-003',
      'UPI-A',
      'UPI-B',
      'UPI-DUP',
    ]);
    for (const upi of upis) {
      expect(upi.owner_type).toBe('learner');
      expect(learners.some((learner) => learner.id === upi.owner_id)).toBe(true);
    }

    // The first learner that names the shared value keeps it; the second is reported.
    const shared = upis.filter((row) => row.value === 'UPI-DUP');
    expect(shared).toHaveLength(1);
    expect(shared[0].owner_id).toBe(learnerByAdmission(learners, 'ADM906').id);

    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const refused = unmappable.find(
      (row) => row.canonical_entity === 'identifier' && row.legacy_id === 'S907'
    );
    expect(refused).toBeDefined();
    expect(String(refused?.reason)).toContain('the ke.kemis_upi identifier "UPI-DUP" is already held');
  });

  it('maps a guardian national id to an identifier owned by the guardian', async () => {
    const identifiers = (await readRows(adapter, 'identifier')).filter(
      (row) => row.scheme === 'national_id'
    );
    const guardians = await readRows(adapter, 'guardian');
    const links = await readRows(adapter, 'learner_guardian');
    const learners = await readRows(adapter, 'learner');

    expect(identifiers).toHaveLength(2);
    expect(identifiers.map((row) => row.value).sort()).toEqual(['NIN-001', 'NIN-SHARED']);
    for (const identifier of identifiers) {
      expect(identifier.owner_type).toBe('guardian');
      expect(guardians.some((guardian) => guardian.id === identifier.owner_id)).toBe(true);
    }

    // The national id of the guardian two rows name is one identifier, owned by that guardian.
    const siblingLink = linksOf(links, learnerByAdmission(learners, 'ADM901').id);
    const siblingIdentifier = identifiers.find((row) => row.value === 'NIN-001');
    expect(siblingIdentifier?.owner_id).toBe(siblingLink[0].guardian_id);

    // The same value on two different guardians names one owner; the second is reported.
    const secondary = identifiers.find((row) => row.value === 'NIN-SHARED');
    expect(secondary).toBeDefined();
    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const refused = unmappable.find(
      (row) => row.canonical_entity === 'identifier' && row.legacy_id === 'PG011'
    );
    expect(refused).toBeDefined();
    expect(String(refused?.reason)).toContain('the national_id identifier "NIN-SHARED" is already held');
  });

  it('writes an enrolment for every learner whose stream M2 mapped', async () => {
    const enrolments = await readRows(adapter, 'enrolment');
    const learners = await readRows(adapter, 'learner');
    const classGroups = await readRows(adapter, 'class_group');
    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    const streamToGroup = classGroupByStream(map);
    const learnerByLegacyId = new Map(
      map
        .filter((row) => row.legacy_table === 'students' && row.canonical_entity === 'learner')
        .map((row) => [String(row.legacy_id), String(row.canonical_id)])
    );
    const students = await adapter.all<Row>(`SELECT * FROM "students" ORDER BY id`);

    expect(enrolments).toHaveLength(62);
    for (const enrolment of enrolments) {
      expect(String(enrolment.id)).toMatch(UUID_V7);
      const group = classGroups.find((row) => row.id === enrolment.class_group_id);
      expect(group).toBeDefined();
      expect(enrolment.academic_year_id).toBe(group?.academic_year_id);
      expect(enrolment.level_id).toBe(group?.level_id);
      expect(enrolment.programme_id).toBe(group?.programme_id);
    }

    // Every seed learner's stream resolves through M2's map with the normalised key.
    let resolved = 0;
    for (const student of students) {
      const key = legacyKey(student.current_class_stream_id as string | null);
      const classGroupId = key === null ? undefined : streamToGroup.get(key);
      const learnerId = learnerByLegacyId.get(String(student.id));
      if (classGroupId === undefined || learnerId === undefined) continue;
      const enrolment = enrolments.find((row) => row.learner_id === learnerId);
      expect(enrolment?.class_group_id).toBe(classGroupId);
      resolved += 1;
    }
    expect(resolved).toBe(62);

    // The learner's start date, and the entry reason the date implies.
    const alumni = learnerByAdmission(learners, 'ADM911');
    const alumniEnrolment = enrolments.find((row) => row.learner_id === alumni.id);
    expect(alumniEnrolment?.start_date).toBe('2019-01-07');
    expect(alumniEnrolment?.entry_reason).toBe('promoted');
    expect(alumniEnrolment?.status).toBe('completed');
    expect(alumniEnrolment?.exit_reason).toBe('graduated');
    expect(alumniEnrolment?.end_date).toBe('2025-06-30');

    const transferred = learnerByAdmission(learners, 'ADM912');
    const transferredEnrolment = enrolments.find((row) => row.learner_id === transferred.id);
    expect(transferredEnrolment?.status).toBe('left');
    expect(transferredEnrolment?.exit_reason).toBe('transferred_out');
    expect(transferredEnrolment?.end_date).toBe('2025-06-30');

    const admittedInYear = learnerByAdmission(learners, 'ADM913');
    const newEnrolment = enrolments.find((row) => row.learner_id === admittedInYear.id);
    expect(newEnrolment?.start_date).toBe('2024-10-15');
    expect(newEnrolment?.entry_reason).toBe('new_admission');

    const noAdmissionDate = learnerByAdmission(learners, 'ADM001');
    const seedEnrolment = enrolments.find((row) => row.learner_id === noAdmissionDate.id);
    expect(seedEnrolment?.start_date).toBe('2024-09-01');
    expect(seedEnrolment?.entry_reason).toBe('new_admission');
    expect(seedEnrolment?.status).toBe('active');
    expect(seedEnrolment?.exit_reason).toBeNull();
    expect(seedEnrolment?.end_date).toBeNull();
  });

  it('reports the learners it could not enrol and why', async () => {
    const unmappable = (await readRows(adapter, LEGACY_UNMAPPABLE_TABLE)).filter(
      (row) => row.canonical_entity === 'enrolment'
    );
    expect(unmappable).toHaveLength(2);

    const noStream = unmappable.find((row) => row.legacy_id === 'S903');
    expect(String(noStream?.reason)).toContain('points at no class stream');
    const missingStream = unmappable.find((row) => row.legacy_id === 'S900');
    expect(String(missingStream?.reason)).toContain('the class stream "99" is not one migration M2 mapped');

    // The learner rows themselves are written: the class is what is missing, not the learner.
    const learners = await readRows(adapter, 'learner');
    expect(learners.some((learner) => learner.admission_number === 'ADM903')).toBe(true);
    expect(learners.some((learner) => learner.admission_number === 'ADM900')).toBe(true);
  });

  it('records the id map so a learner, an enrolment, a guardian and an identifier resolve', async () => {
    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    const count = (legacyTable: string, canonicalEntity: string): number =>
      map.filter((row) => row.legacy_table === legacyTable && row.canonical_entity === canonicalEntity)
        .length;

    expect(count('students', 'learner')).toBe(64);
    expect(count('students', 'enrolment')).toBe(62);
    expect(count('students', 'identifier')).toBe(6);
    expect(count('parents_guardians', 'guardian')).toBe(12);
    expect(count('parents_guardians', 'identifier')).toBe(2);
    expect(count('student_guardian_relationships', 'learner_guardian')).toBe(4);

    // M1's and M2's map rows stay, under the normalised key M1's contract requires.
    expect(map.some((row) => row.canonical_entity === 'academic_year')).toBe(true);
    expect(count('class_streams', 'class_group')).toBe(6);
    expect(map.find((row) => row.legacy_table === 'class_streams' && row.legacy_id === '2')?.legacy_id).toBe(
      legacyKey('2.0')
    );
  });

  it('verifies the counts, every row it wrote and every class', async () => {
    const report = await readPeopleMigrationReport(adapter);

    expect(report.counts.before).toEqual({
      learner: 65,
      guardian: 14,
      learner_guardian: 64,
      identifier: 8,
      enrolment: 64,
    });
    expect(report.counts.after).toEqual({
      learner: 64,
      guardian: 12,
      learner_guardian: 61,
      identifier: 8,
      enrolment: 62,
    });
    expect(report.counts.stray).toEqual({
      learner: 0,
      guardian: 0,
      learner_guardian: 0,
      identifier: 0,
      enrolment: 0,
    });

    const failures = report.checks.filter((entry) => !entry.ok && entry.severity === 'error');
    expect(failures).toEqual([]);

    const countChecks = report.checks.filter((entry) => entry.check === 'count');
    expect(countChecks).toHaveLength(5);
    expect(countChecks.every((entry) => entry.ok)).toBe(true);

    const learnerChecks = report.checks.filter((entry) => entry.check === 'learner_class');
    expect(learnerChecks).toHaveLength(64);
    expect(learnerChecks.filter((entry) => entry.ok)).toHaveLength(62);
    expect(learnerChecks.filter((entry) => !entry.ok).map((entry) => entry.legacyId).sort()).toEqual([
      'S900',
      'S903',
    ]);
    expect(report.resolutions).toHaveLength(62);

    // The normalisation the de-duplication compares is on the record, not only in the code.
    expect(report.assumptions.some((line) => line.includes('E.164'))).toBe(true);
    expect(report.assumptions.some((line) => line.includes('one enrolment is written per learner'))).toBe(
      true
    );
  });

  it('rolls back to the state before M3 and leaves M1, M2 and the legacy rows alone', async () => {
    const runner = runnerFor(adapter, true);
    const rolled = await runner.rollbackTo(2);
    expect(rolled.status).toBe('completed');

    for (const table of ['learner', 'guardian', 'learner_guardian', 'identifier', 'enrolment']) {
      expect(await readRows(adapter, table)).toHaveLength(0);
    }

    // The created-rows table stays for M2, with M2's rows and none of M3's.
    expect(await tableExists(adapter, CREATED_TABLE)).toBe(true);
    const created = await readRows(adapter, CREATED_TABLE);
    expect(created.some((row) => Number(row.migration_version) === 3)).toBe(false);
    expect(created.some((row) => Number(row.migration_version) === 2)).toBe(true);

    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    expect(map.some((row) => row.canonical_entity === 'learner')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'guardian')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'enrolment')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'identifier')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'learner_guardian')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'academic_year')).toBe(true);
    expect(map.some((row) => row.canonical_entity === 'class_group')).toBe(true);

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(notes.some((note) => Number(note.migration_version) === 3)).toBe(false);
    expect(notes.some((note) => Number(note.migration_version) === 2)).toBe(true);

    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    expect(unmappable.some((row) => row.canonical_entity === 'learner')).toBe(false);
    expect(unmappable.some((row) => row.canonical_entity === 'enrolment')).toBe(false);

    // M2's rows and the confirmed decision survive; the legacy rows were only read.
    expect(await readRows(adapter, 'class_group')).toHaveLength(7);
    expect(await readRows(adapter, 'level')).toHaveLength(5);
    expect(await readRows(adapter, LEVEL_MAPPING_TABLE)).toHaveLength(7);
    expect(await readRows(adapter, 'students')).toHaveLength(65);
    expect(await readRows(adapter, 'parents_guardians')).toHaveLength(29);
    expect(await readRows(adapter, 'student_guardian_relationships')).toHaveLength(5);

    // A re-run writes the same rows again.
    const again = await runner.run();
    expect(again.status).toBe('completed');
    expect(await readRows(adapter, 'learner')).toHaveLength(64);
    expect(await readRows(adapter, 'guardian')).toHaveLength(12);
    expect(await readRows(adapter, 'enrolment')).toHaveLength(62);
  });
});

describe('migration M3 on a database it cannot map', () => {
  let adapter: SqliteAdapter;

  afterEach(async () => {
    await adapter.close();
  });

  it('refuses to run before the class groups migration M2', async () => {
    adapter = await prepare();
    await confirm(adapter);
    const runner = createMigrationRunner({
      adapter,
      migrations: [
        createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
        createLearnerMigration({ now: () => FIXTURE_NOW }),
      ],
      backupPolicy: 'never',
      now: () => FIXTURE_NOW,
    });
    const result = await runner.run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('run migration M2 first');
    expect(await readRows(adapter, 'learner')).toHaveLength(0);
  });

  it('refuses to write when the canonical people tables already hold rows', async () => {
    adapter = await prepare();
    await confirm(adapter);
    // M1 and M2 applied, M3 not: the canonical people tables are newer than the legacy rows
    // the moment one row exists in them.
    const classGroups = createMigrationRunner({
      adapter,
      migrations: [
        createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
        createClassGroupMigration({ now: () => FIXTURE_NOW }),
      ],
      backupPolicy: 'never',
      now: () => FIXTURE_NOW,
    });
    expect((await classGroups.run()).status).toBe('completed');

    const institution = await adapter.get<Row>(`SELECT id FROM "institution" ORDER BY rowid LIMIT 1`);
    const institutionId = typeof institution?.['id'] === 'string' ? institution['id'] : '';
    await adapter.run(
      `INSERT INTO "learner" ("id", "institution_id", "given_name", "family_name", "name_order", "gender", "admission_number", "status", "residence_status", "created_at", "updated_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '00000000-0000-7000-8000-0000000000aa',
        institutionId,
        'Hand',
        'Written',
        'given_first',
        'not_stated',
        'ADM-HAND',
        'enrolled',
        'day',
        '2026-01-01T00:00:00Z',
        '2026-01-01T00:00:00Z',
      ]
    );

    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('already holds 1 row');
  });
});

describe('the phone normalisation the guardian de-duplication compares', () => {
  it('reads one number written in the forms a legacy row holds', () => {
    const cases: readonly (readonly [string, string])[] = [
      ['0711223344', '+254711223344'],
      ['0711 223 344', '+254711223344'],
      ['0711-223-344', '+254711223344'],
      ['(0711) 223.344', '+254711223344'],
      ['+254711223344', '+254711223344'],
      ['+254 711 223 344', '+254711223344'],
      ['254711223344', '+254711223344'],
      ['00254711223344', '+254711223344'],
      ['711223344', '+254711223344'],
    ];
    for (const [raw, expected] of cases) {
      expect(normaliseLegacyPhone(raw).value).toBe(expected);
    }
  });

  it('reports a number it cannot read rather than guessing one', () => {
    expect(normaliseLegacyPhone(null)).toMatchObject({ value: null, empty: true });
    expect(normaliseLegacyPhone('')).toMatchObject({ value: null, empty: true });
    expect(normaliseLegacyPhone('   ')).toMatchObject({ value: null, empty: true });
    expect(normaliseLegacyPhone('not a number').value).toBeNull();
    expect(normaliseLegacyPhone('12345').value).toBeNull();
    expect(normaliseLegacyPhone('0711223344 ext 2').value).toBeNull();
    expect(normaliseLegacyPhone('+2547112233445678').value).toBeNull();
  });
});

describe('migration M3 with foreign keys enforced', () => {
  it('writes and rolls back in the order the keys need', async () => {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await adapter.open();
    try {
      await applyCanonicalSchema(adapter);
      await buildPeopleFixture(adapter);
      await migrateCalendarOnly(adapter);
      await confirm(adapter);
      const runner = runnerFor(adapter);

      const result = await runner.run();
      expect(result.status).toBe('completed');
      expect(await readRows(adapter, 'learner')).toHaveLength(64);
      expect(await readRows(adapter, 'enrolment')).toHaveLength(62);

      const rolled = await runner.rollbackTo(2);
      expect(rolled.status).toBe('completed');
      for (const table of ['learner', 'guardian', 'learner_guardian', 'identifier', 'enrolment']) {
        expect(await readRows(adapter, table)).toHaveLength(0);
      }
      expect(await readRows(adapter, 'class_group')).toHaveLength(7);
    } finally {
      await adapter.close();
    }
  });
});
