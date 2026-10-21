// ABOUTME: The verification of migration M2: the counts before and after, the level and year each
// ABOUTME: class group actually sits in, and the class every learner's stream resolves to.

import type { SqliteRow } from '@/data/adapters/sqlite';

import { legacyText, tableExists, type SqlReader } from './001-legacy-calendar';
import { LEGACY_ID_MAP_TABLE, LEGACY_NOTES_TABLE, LEGACY_UNMAPPABLE_TABLE } from './001-institution-calendar';
import {
  readLevelMapping,
  readLevelMappingSource,
  type LevelMappingEntry,
  type LevelMappingSource,
} from './002-level-mapping';
import {
  type ClassGroupCounts,
  type ClassGroupEntity,
  type ClassGroupIssue,
  type ClassGroupMapEntry,
  type ClassGroupUnmappableRow,
  type LearnerResolution,
} from './002-class-groups-plan';

/** One check the migration made about the rows it wrote. */
export interface ClassGroupCheck {
  readonly entity: ClassGroupEntity | 'learner';
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalId: string;
  readonly check: string;
  readonly expected: string;
  readonly actual: string;
  readonly ok: boolean;
  /** `error` breaks the migration; `warning` is a problem the legacy data carried in. */
  readonly severity: 'error' | 'warning';
}

/** The verification the migration made, read back from the database. */
export interface ClassGroupMigrationVerification {
  readonly counts: {
    /** The legacy rows that could become a row of the entity. */
    readonly before: ClassGroupCounts;
    /** The canonical rows the migration wrote. */
    readonly after: ClassGroupCounts;
    /** The canonical rows the migration did not write. */
    readonly stray: ClassGroupCounts;
  };
  readonly checks: readonly ClassGroupCheck[];
  readonly issues: readonly ClassGroupIssue[];
  readonly assumptions: readonly string[];
  readonly unmappable: readonly ClassGroupUnmappableRow[];
  readonly mapping: readonly ClassGroupMapEntry[];
  readonly learnerResolutions: readonly LearnerResolution[];
}

/** A count the verifier adds to while it walks the rows. */
interface MutableCounts {
  level: number;
  class_group: number;
}

function emptyCounts(): MutableCounts {
  return { level: 0, class_group: 0 };
}

/** Reads the id-map rows migration M2 wrote. */
async function readClassGroupIdMap(reader: SqlReader): Promise<ClassGroupMapEntry[]> {
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, canonical_id
       FROM "${LEGACY_ID_MAP_TABLE}"
      WHERE canonical_entity IN ('level', 'class_group')
      ORDER BY legacy_table, legacy_id`
  );
  return rows.map((row) => ({
    legacyTable: legacyText(row, 'legacy_table') ?? '',
    legacyId: legacyText(row, 'legacy_id') ?? '',
    canonicalEntity: (legacyText(row, 'canonical_entity') ?? 'level') as ClassGroupEntity,
    canonicalId: legacyText(row, 'canonical_id') ?? '',
  }));
}

/** Reads the unmappable rows migration M2 wrote. */
async function readClassGroupUnmappable(reader: SqlReader): Promise<ClassGroupUnmappableRow[]> {
  if (!(await tableExists(reader, LEGACY_UNMAPPABLE_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, reason, detail
       FROM "${LEGACY_UNMAPPABLE_TABLE}"
      WHERE canonical_entity IN ('level', 'class_group')
      ORDER BY legacy_table, legacy_id`
  );
  return rows.map((row) => {
    const detail = legacyText(row, 'detail');
    return {
      legacyTable: legacyText(row, 'legacy_table') ?? '',
      legacyId: legacyText(row, 'legacy_id') ?? '',
      canonicalEntity: (legacyText(row, 'canonical_entity') ?? 'class_group') as ClassGroupEntity,
      reason: legacyText(row, 'reason') ?? '',
      ...(detail === null ? {} : { detail }),
    };
  });
}

/** A note migration M2 left behind. */
interface MigrationNote {
  readonly severity: string;
  readonly code: string;
  readonly entity: string;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** Reads the notes migration M2 left; M1's notes are a different version and are not read. */
async function readClassGroupNotes(reader: SqlReader): Promise<MigrationNote[]> {
  if (!(await tableExists(reader, LEGACY_NOTES_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT severity, code, entity, legacy_table, legacy_id, message
       FROM "${LEGACY_NOTES_TABLE}"
      WHERE migration_version = 2
      ORDER BY rowid`
  );
  return rows.map((row) => ({
    severity: legacyText(row, 'severity') ?? 'warning',
    code: legacyText(row, 'code') ?? '',
    entity: legacyText(row, 'entity') ?? '',
    legacyTable: legacyText(row, 'legacy_table') ?? '',
    legacyId: legacyText(row, 'legacy_id') ?? '',
    message: legacyText(row, 'message') ?? '',
  }));
}

async function canonicalRows(reader: SqlReader, table: string): Promise<Map<string, SqliteRow>> {
  if (!(await tableExists(reader, table))) return new Map();
  const rows = await reader.all<SqliteRow>(`SELECT * FROM "${table}"`);
  return new Map(rows.map((row) => [legacyText(row, 'id') ?? '', row]));
}

function check(
  entity: ClassGroupCheck['entity'],
  legacyTable: string,
  legacyId: string,
  canonicalId: string,
  name: string,
  expected: string,
  actual: string,
  severity: 'error' | 'warning'
): ClassGroupCheck {
  return {
    entity,
    legacyTable,
    legacyId,
    canonicalId,
    check: name,
    expected,
    actual,
    ok: expected === actual,
    severity,
  };
}

/** The name a class group is expected to carry, before the duplicate suffix. */
function expectedGroupName(decision: LevelMappingEntry): string {
  const name = (decision.legacyStreamName || decision.legacyClassName).trim();
  return name.length > 100 ? name.slice(0, 100).trim() : name;
}

/** True when a name is the expected one, or the expected one with the duplicate suffix. */
function groupNameMatches(expected: string, actual: string): boolean {
  return actual === expected || actual.startsWith(`${expected} (`);
}

/** True when the text is an ISO-8601 timestamp SQLite can hold. */
function validTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** The legacy counts migration M2 expects: every class, every stream, every streamless class. */
function legacyCounts(source: LevelMappingSource): ClassGroupCounts {
  return {
    level: source.classes.length,
    class_group:
      source.streams.length +
      source.classes.filter(
        (entry) => !source.streams.some((stream) => stream.classId === entry.id)
      ).length,
  };
}

/** Counts the rows the id map or the unmappable table holds, per canonical entity. */
function countsByEntity(rows: readonly { readonly canonicalEntity: string }[]): MutableCounts {
  const counts = emptyCounts();
  for (const row of rows) {
    if (row.canonicalEntity === 'level') counts.level += 1;
    if (row.canonicalEntity === 'class_group') counts.class_group += 1;
  }
  return counts;
}

/** The decision one mapping unit was confirmed under. */
function decisionFor(
  decisions: readonly LevelMappingEntry[],
  legacyClassId: string,
  legacyStreamId: string
): LevelMappingEntry | undefined {
  return decisions.find(
    (entry) => entry.legacyClassId === legacyClassId && entry.legacyStreamId === legacyStreamId
  );
}

/**
 * Verifies the rows the migration wrote against the legacy rows and the decisions they came
 * from.
 *
 * The checks are read back from the database, not from the plan, so they say what the
 * database holds. Every learner whose legacy stream exists must resolve through the id map to
 * a class group in the level and the year the operator confirmed; a learner whose legacy
 * stream is gone is reported, not silently dropped.
 */
export async function verifyClassGroupMigration(
  reader: SqlReader,
  source: LevelMappingSource,
  decisions: readonly LevelMappingEntry[]
): Promise<ClassGroupMigrationVerification> {
  const mapping = await readClassGroupIdMap(reader);
  const unmappable = await readClassGroupUnmappable(reader);
  const notes = await readClassGroupNotes(reader);

  const levels = await canonicalRows(reader, 'level');
  const classGroups = await canonicalRows(reader, 'class_group');
  const years = await canonicalRows(reader, 'academic_year');
  const calendars = await canonicalRows(reader, 'calendar');

  const checks: ClassGroupCheck[] = [];
  const levelIdByClass = new Map<string, string>();
  for (const entry of mapping) {
    if (entry.canonicalEntity === 'level') {
      levelIdByClass.set(entry.legacyId, entry.canonicalId);
    }
  }

  for (const entry of mapping) {
    const canonical =
      entry.canonicalEntity === 'level'
        ? levels.get(entry.canonicalId)
        : classGroups.get(entry.canonicalId);
    const legacyExists =
      entry.legacyTable === 'classes'
        ? source.classes.some((row) => row.id === entry.legacyId)
        : source.streams.some((row) => row.id === entry.legacyId);
    checks.push(
      check(
        entry.canonicalEntity,
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'row_present',
        'present',
        !legacyExists ? 'the legacy row is gone' : canonical === undefined ? 'the canonical row is missing' : 'present',
        'error'
      )
    );
    if (canonical === undefined) continue;

    const decision =
      entry.canonicalEntity === 'level'
        ? decisions.find((row) => row.legacyClassId === entry.legacyId)
        : entry.legacyTable === 'classes'
          ? decisionFor(decisions, entry.legacyId, '')
          : decisionFor(decisions, decisionClassOf(entry.legacyId, source, decisions), entry.legacyId);
    if (decision === undefined) {
      checks.push(
        check(
          entry.canonicalEntity,
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'decision_present',
          'a confirmed decision',
          'no decision',
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'level') {
      const level = canonical;
      checks.push(
        check('level', entry.legacyTable, entry.legacyId, entry.canonicalId, 'level_code',
          decision.level.code, legacyText(level, 'code') ?? '', 'error'),
        check('level', entry.legacyTable, entry.legacyId, entry.canonicalId, 'level_name',
          decision.level.name, legacyText(level, 'name') ?? '', 'error'),
        check('level', entry.legacyTable, entry.legacyId, entry.canonicalId, 'level_ordinal',
          String(decision.level.ordinal), String(legacyText(level, 'ordinal') ?? ''), 'error'),
        check('level', entry.legacyTable, entry.legacyId, entry.canonicalId, 'level_final',
          decision.level.isTerminal ? '1' : '0', legacyText(level, 'is_terminal') ?? '', 'error')
      );
      continue;
    }

    const group = canonical;
    const expectedName = expectedGroupName(decision);
    const actualName = legacyText(group, 'name') ?? '';
    checks.push(
      check('class_group', entry.legacyTable, entry.legacyId, entry.canonicalId, 'class_group_name',
        expectedName, groupNameMatches(expectedName, actualName) ? expectedName : actualName, 'error'),
      check('class_group', entry.legacyTable, entry.legacyId, entry.canonicalId, 'academic_year',
        decision.academicYearId, legacyText(group, 'academic_year_id') ?? '', 'error'),
      check('class_group', entry.legacyTable, entry.legacyId, entry.canonicalId, 'level',
        levelIdByClass.get(decision.legacyClassId) ?? '', legacyText(group, 'level_id') ?? '', 'error'),
      check('class_group', entry.legacyTable, entry.legacyId, entry.canonicalId, 'academic_year_exists',
        'the year is one the database holds',
        years.has(legacyText(group, 'academic_year_id') ?? '') ? 'the year is one the database holds' : 'the year is missing',
        'error')
    );

    const createdAt = legacyText(group, 'created_at') ?? '';
    const updatedAt = legacyText(group, 'updated_at') ?? '';
    checks.push(
      check('class_group', entry.legacyTable, entry.legacyId, entry.canonicalId, 'audit_timestamps',
        'created_at and updated_at are ISO timestamps',
        validTimestamp(createdAt) && validTimestamp(updatedAt) ? 'created_at and updated_at are ISO timestamps' : `created_at ${createdAt}, updated_at ${updatedAt}`,
        'error')
    );

    // The class group belongs to the calendar of its year; the calendar must be one the
    // database holds (M1 wrote it). This is the date link the class group depends on.
    const yearRow = years.get(legacyText(group, 'academic_year_id') ?? '');
    const calendarId = yearRow === undefined ? '' : legacyText(yearRow, 'calendar_id') ?? '';
    checks.push(
      check('class_group', entry.legacyTable, entry.legacyId, entry.canonicalId, 'calendar_exists',
        'the year belongs to a calendar the database holds',
        calendarId !== '' && calendars.has(calendarId) ? 'the year belongs to a calendar the database holds' : 'the calendar is missing',
        'error')
    );
  }

  // The acceptance: every learner whose stream the legacy database holds resolves to a class
  // group, and that class group is in the level and the year the stream was mapped to.
  const classGroupByStream = new Map<string, SqliteRow>();
  for (const entry of mapping) {
    if (entry.canonicalEntity !== 'class_group' || entry.legacyTable !== 'class_streams') continue;
    const group = classGroups.get(entry.canonicalId);
    if (group !== undefined) classGroupByStream.set(entry.legacyId, group);
  }
  const resolutions: LearnerResolution[] = [];
  for (const learner of source.learners) {
    if (learner.streamId === null) continue;
    const group = classGroupByStream.get(learner.streamId);
    const decision = decisionFor(
      decisions,
      decisionClassOf(learner.streamId, source, decisions),
      learner.streamId
    );
    if (group === undefined || decision === undefined) {
      checks.push(
        check('learner', 'students', learner.id, '', 'learner_class',
          'a class group', 'no class group', 'warning')
      );
      continue;
    }
    const levelId = levelIdByClass.get(decision.legacyClassId) ?? '';
    checks.push(
      check('learner', 'students', learner.id, legacyText(group, 'id') ?? '', 'learner_class',
        `${levelId} in ${decision.academicYearId}`,
        `${legacyText(group, 'level_id')} in ${legacyText(group, 'academic_year_id')}`,
        'error')
    );
    if (
      legacyText(group, 'level_id') === levelId &&
      legacyText(group, 'academic_year_id') === decision.academicYearId
    ) {
      resolutions.push({
        learnerId: learner.id,
        legacyStreamId: learner.streamId,
        classGroupId: legacyText(group, 'id') ?? '',
        levelId,
        academicYearId: decision.academicYearId,
      });
    }
  }

  // The counts: every legacy row either became a canonical row or was reported.
  const before = legacyCounts(source);
  const after = countsByEntity(mapping);
  const unmapped = countsByEntity(unmappable);
  for (const entity of ['level', 'class_group'] as const) {
    checks.push(
      check(entity, 'legacy', '', '', 'count', String(before[entity]), String(after[entity] + unmapped[entity]), 'error')
    );
  }

  const stray = emptyCounts();
  stray.level = Math.max(0, levels.size - after.level);
  stray.class_group = Math.max(0, classGroups.size - after.class_group);
  for (const entity of ['level', 'class_group'] as const) {
    checks.push(
      check(entity, 'canonical', '', '', 'stray', '0', String(stray[entity]), 'error')
    );
  }

  const issues: ClassGroupIssue[] = notes
    .filter((note) => note.severity !== 'info')
    .map((note) => ({
      code: note.code,
      severity: note.severity === 'error' ? 'error' : 'warning',
      entity: note.entity === 'learner' ? 'learner' : note.entity === 'class_group' ? 'class_group' : 'level',
      legacyTable: note.legacyTable,
      legacyId: note.legacyId,
      message: note.message,
    }));
  const assumptions = notes.filter((note) => note.severity === 'info').map((note) => note.message);

  return { counts: { before, after, stray }, checks, issues, assumptions, unmappable, mapping, learnerResolutions: resolutions };
}

/** The class a legacy stream belongs to, through the stream's own row or the decisions. */
function decisionClassOf(
  streamId: string,
  source: LevelMappingSource,
  decisions: readonly LevelMappingEntry[]
): string {
  const stream = source.streams.find((entry) => entry.id === streamId);
  if (stream?.classId !== undefined && stream?.classId !== null) return stream.classId;
  return decisions.find((entry) => entry.legacyStreamId === streamId)?.legacyClassId ?? '';
}

/**
 * The report the migration left in the database.
 *
 * The report is read back from the database and re-derived from the legacy rows and the
 * confirmed decisions, so it says what the database holds rather than what the plan intended.
 */
export async function readClassGroupMigrationReport(
  reader: SqlReader
): Promise<ClassGroupMigrationVerification> {
  const source = await readLevelMappingSource(reader);
  const decisions = await readLevelMapping(reader);
  return verifyClassGroupMigration(reader, source, decisions);
}
