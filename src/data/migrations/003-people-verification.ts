// ABOUTME: The verification of migration M3: the counts, every canonical row read back, and every
// ABOUTME: learner's class resolved through the class group migration M2 wrote.

import type { SqliteRow } from '@/data/adapters/sqlite';

import { legacyText, tableExists, type SqlReader } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
} from './001-institution-calendar';
import {
  type LegacyGuardian,
  type PeoplePlanSource,
  readPeoplePlanSource,
} from './003-legacy-people';
import {
  guardianIdentityKey,
  judgeLearners,
  legacyIdentifierValues,
  legacyLinkPairs,
  mergeLegacyLinks,
  type LearnerResolution,
  type PeopleCounts,
  type PeopleEntity,
  type PeopleIssue,
  type PeopleMapEntry,
  type PeopleUnmappableRow,
} from './003-people-plan';
import {
  enrolmentStartDate,
  learnerStatus,
  legacyNameParts,
  normaliseLegacyPhone,
} from './003-people-rules';

/** One check the migration made about the rows it wrote. */
export interface PeopleCheck {
  readonly entity: PeopleEntity;
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
export interface PeopleMigrationVerification {
  readonly counts: {
    /** The legacy rows that could become a row of the entity. */
    readonly before: PeopleCounts;
    /** The canonical rows the id map names. */
    readonly after: PeopleCounts;
    /** The canonical rows the migration did not write. */
    readonly stray: PeopleCounts;
  };
  readonly checks: readonly PeopleCheck[];
  readonly issues: readonly PeopleIssue[];
  readonly assumptions: readonly string[];
  readonly unmappable: readonly PeopleUnmappableRow[];
  readonly mapping: readonly PeopleMapEntry[];
  readonly resolutions: readonly LearnerResolution[];
}

/** A count the verifier adds to while it walks the rows. */
function emptyCounts(): PeopleCounts {
  return { learner: 0, guardian: 0, learner_guardian: 0, identifier: 0, enrolment: 0 };
}

function isPeopleEntity(value: string): value is PeopleEntity {
  return (
    value === 'learner' ||
    value === 'guardian' ||
    value === 'learner_guardian' ||
    value === 'identifier' ||
    value === 'enrolment'
  );
}

/** Reads the id-map rows migration M3 wrote. */
async function readPeopleIdMap(reader: SqlReader): Promise<PeopleMapEntry[]> {
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, canonical_id
       FROM "${LEGACY_ID_MAP_TABLE}"
      ORDER BY legacy_table, legacy_id, canonical_entity`
  );
  const entries: PeopleMapEntry[] = [];
  for (const row of rows) {
    const canonicalEntity = legacyText(row, 'canonical_entity') ?? '';
    if (!isPeopleEntity(canonicalEntity)) continue;
    entries.push({
      legacyTable: legacyText(row, 'legacy_table') ?? '',
      legacyId: legacyText(row, 'legacy_id') ?? '',
      canonicalEntity,
      canonicalId: legacyText(row, 'canonical_id') ?? '',
    });
  }
  return entries;
}

/** Reads the unmappable rows migration M3 wrote. */
async function readPeopleUnmappable(reader: SqlReader): Promise<PeopleUnmappableRow[]> {
  if (!(await tableExists(reader, LEGACY_UNMAPPABLE_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, reason, detail
       FROM "${LEGACY_UNMAPPABLE_TABLE}"
      ORDER BY legacy_table, legacy_id, canonical_entity`
  );
  const entries: PeopleUnmappableRow[] = [];
  for (const row of rows) {
    const canonicalEntity = legacyText(row, 'canonical_entity') ?? '';
    if (!isPeopleEntity(canonicalEntity)) continue;
    const detail = legacyText(row, 'detail');
    entries.push({
      legacyTable: legacyText(row, 'legacy_table') ?? '',
      legacyId: legacyText(row, 'legacy_id') ?? '',
      canonicalEntity,
      reason: legacyText(row, 'reason') ?? '',
      ...(detail === null ? {} : { detail }),
    });
  }
  return entries;
}

/** A note migration M3 left behind. */
interface MigrationNote {
  readonly severity: string;
  readonly code: string;
  readonly entity: string;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** Reads the notes migration M3 left; M1's and M2's notes are other versions and are not read. */
async function readPeopleNotes(reader: SqlReader): Promise<MigrationNote[]> {
  if (!(await tableExists(reader, LEGACY_NOTES_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT severity, code, entity, legacy_table, legacy_id, message
       FROM "${LEGACY_NOTES_TABLE}"
      WHERE migration_version = 3
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

/** Every canonical row of a table, by id. */
async function canonicalRows(reader: SqlReader, table: string): Promise<Map<string, SqliteRow>> {
  if (!(await tableExists(reader, table))) return new Map();
  const rows = await reader.all<SqliteRow>(`SELECT * FROM "${table}"`);
  return new Map(rows.map((row) => [legacyText(row, 'id') ?? '', row]));
}

/** A JSON array column as its text entries. */
function jsonList(row: SqliteRow, column: string): string[] {
  const raw = row[column];
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

/** The E.164 numbers a canonical person row carries. */
function phoneNumbers(row: SqliteRow | undefined): string[] {
  if (row === undefined) return [];
  const raw = row['phones'];
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) =>
        typeof entry === 'object' && entry !== null
          ? (entry as Record<string, unknown>)['number']
          : undefined
      )
      .filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

function check(
  entity: PeopleEntity,
  legacyTable: string,
  legacyId: string,
  canonicalId: string,
  name: string,
  expected: string,
  actual: string,
  severity: 'error' | 'warning'
): PeopleCheck {
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

/** True when the text is an ISO-8601 timestamp SQLite can hold. */
function validTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value))
  );
}

/** The counts the id map and the unmappable rows add up to. */
function countsByEntity(rows: readonly { readonly canonicalEntity: PeopleEntity }[]): PeopleCounts {
  const counts = emptyCounts();
  for (const row of rows) counts[row.canonicalEntity] += 1;
  return counts;
}

/** The legacy rows that could become a row of each entity, read from the legacy data. */
export function legacyPeopleCounts(source: PeoplePlanSource): PeopleCounts {
  const learners = judgeLearners(source.learners);
  const writable = learners.filter((verdict) => verdict.problem === null).length;
  return {
    learner: source.learners.length,
    guardian: new Set(source.guardians.map(guardianIdentityKey)).size,
    learner_guardian: legacyLinkPairs(source, learners).length,
    identifier: legacyIdentifierValues(source).size,
    enrolment: writable,
  };
}

/** The name a canonical person row carries, as one string. */
function personName(row: SqliteRow): string {
  return [
    legacyText(row, 'given_name') ?? '',
    ...jsonList(row, 'middle_names'),
    legacyText(row, 'family_name') ?? '',
  ]
    .join(' ')
    .trim();
}

/**
 * Verifies the rows the migration wrote against the legacy rows they came from.
 *
 * The checks are read back from the database, not from the plan, so they say what the
 * database holds. Every learner whose class stream migration M2 mapped must have an enrolment
 * in that class group's year, level and programme; a learner whose stream is gone is reported,
 * not silently dropped.
 */
export async function verifyPeopleMigration(
  reader: SqlReader,
  source: PeoplePlanSource
): Promise<PeopleMigrationVerification> {
  const mapping = await readPeopleIdMap(reader);
  const unmappable = await readPeopleUnmappable(reader);
  const notes = await readPeopleNotes(reader);

  const learners = await canonicalRows(reader, 'learner');
  const guardians = await canonicalRows(reader, 'guardian');
  const links = await canonicalRows(reader, 'learner_guardian');
  const identifiers = await canonicalRows(reader, 'identifier');
  const enrolments = await canonicalRows(reader, 'enrolment');
  const classGroups = await canonicalRows(reader, 'class_group');
  const years = await canonicalRows(reader, 'academic_year');
  const levels = await canonicalRows(reader, 'level');
  const programmes = await canonicalRows(reader, 'programme');

  const canonicalByEntity: Record<PeopleEntity, Map<string, SqliteRow>> = {
    learner: learners,
    guardian: guardians,
    learner_guardian: links,
    identifier: identifiers,
    enrolment: enrolments,
  };

  const checks: PeopleCheck[] = [];
  const legacyLearnerById = new Map(source.learners.map((learner) => [learner.id, learner]));
  // The guardian table comes first in the source, so its row is the one the report reads; an
  // embedded copy of the same legacy row must not replace it.
  const legacyGuardianById = new Map<string, LegacyGuardian>();
  for (const guardian of source.guardians) {
    if (!legacyGuardianById.has(guardian.id)) legacyGuardianById.set(guardian.id, guardian);
  }
  const learnerMapByLegacyId = new Map(
    mapping
      .filter((entry) => entry.canonicalEntity === 'learner' && entry.legacyTable === 'students')
      .map((entry) => [entry.legacyId, entry.canonicalId] as const)
  );

  for (const entry of mapping) {
    const canonical = canonicalByEntity[entry.canonicalEntity].get(entry.canonicalId);
    checks.push(
      check(
        entry.canonicalEntity,
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'row_present',
        'present',
        canonical === undefined ? 'the canonical row is missing' : 'present',
        'error'
      )
    );
    if (canonical === undefined) continue;

    if (entry.canonicalEntity === 'learner') {
      const legacy = legacyLearnerById.get(entry.legacyId);
      if (legacy === undefined) {
        checks.push(
          check('learner', entry.legacyTable, entry.legacyId, entry.canonicalId, 'legacy_row', 'present', 'the legacy row is gone', 'error')
        );
        continue;
      }
      checks.push(
        check(
          'learner',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'admission_number',
          legacy.admissionNumber ?? '',
          legacyText(canonical, 'admission_number') ?? '',
          'error'
        ),
        check(
          'learner',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'learner_name',
          `${legacy.firstName ?? ''} ${legacy.lastName ?? ''}`.trim(),
          personName(canonical),
          'error'
        ),
        check(
          'learner',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'learner_admission_date',
          legacy.admissionDate ?? '',
          legacyText(canonical, 'admission_date') ?? '',
          'error'
        ),
        check(
          'learner',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'learner_status',
          learnerStatus(legacy.status).learnerStatus,
          legacyText(canonical, 'status') ?? '',
          'error'
        ),
        check(
          'learner',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'audit_timestamps',
          'created_at and updated_at are ISO timestamps',
          validTimestamp(legacyText(canonical, 'created_at') ?? '') &&
            validTimestamp(legacyText(canonical, 'updated_at') ?? '')
            ? 'created_at and updated_at are ISO timestamps'
            : `created_at ${legacyText(canonical, 'created_at') ?? ''}, updated_at ${legacyText(canonical, 'updated_at') ?? ''}`,
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'guardian') {
      const legacy = legacyGuardianById.get(entry.legacyId);
      if (legacy === undefined) {
        checks.push(
          check('guardian', entry.legacyTable, entry.legacyId, entry.canonicalId, 'legacy_row', 'present', 'the legacy row is gone', 'error')
        );
        continue;
      }
      const parts = legacyNameParts(legacy.name);
      const expectedName =
        parts === null
          ? ''
          : [parts.givenName, ...parts.middleNames, parts.familyName ?? ''].join(' ').trim();
      const wantedPhone = normaliseLegacyPhone(legacy.phone).value ?? '';
      const phones = phoneNumbers(canonical);
      checks.push(
        check('guardian', entry.legacyTable, entry.legacyId, entry.canonicalId, 'guardian_name', expectedName, personName(canonical), 'error'),
        check(
          'guardian',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'guardian_phone',
          wantedPhone,
          phones.includes(wantedPhone) ? wantedPhone : phones.join(', '),
          'error'
        ),
        check(
          'guardian',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'guardian_national_id',
          legacy.nationalId ?? '',
          legacyText(canonical, 'national_id') ?? '',
          'error'
        ),
        check(
          'guardian',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'audit_timestamps',
          'created_at and updated_at are ISO timestamps',
          validTimestamp(legacyText(canonical, 'created_at') ?? '') &&
            validTimestamp(legacyText(canonical, 'updated_at') ?? '')
            ? 'created_at and updated_at are ISO timestamps'
            : `created_at ${legacyText(canonical, 'created_at') ?? ''}, updated_at ${legacyText(canonical, 'updated_at') ?? ''}`,
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'learner_guardian') {
      // A link is mapped to the relationship row that named it, or to the student row whose
      // embedded guardian named it when the relationship table carries none.
      const mergedLinks = mergeLegacyLinks(source.links);
      const relationship =
        entry.legacyTable === 'students'
          ? mergedLinks.find(
              (link) => link.learnerId === entry.legacyId && link.relationshipRowId === null
            )
          : mergedLinks.find((link) => link.relationshipRowId === entry.legacyId);
      const expectedLearner =
        relationship === undefined ? '' : learnerMapByLegacyId.get(relationship.learnerId) ?? '';
      const expectedGuardianPhone =
        relationship === undefined
          ? ''
          : legacyGuardianById.get(relationship.guardianId)?.normalisedPhone ?? '';
      const guardianPhones = phoneNumbers(guardians.get(legacyText(canonical, 'guardian_id') ?? ''));
      checks.push(
        check(
          'learner_guardian',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'link_learner',
          expectedLearner,
          legacyText(canonical, 'learner_id') ?? '',
          'error'
        ),
        check(
          'learner_guardian',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'link_guardian_phone',
          expectedGuardianPhone,
          guardianPhones.includes(expectedGuardianPhone) ? expectedGuardianPhone : guardianPhones.join(', '),
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'identifier') {
      const ownerType = legacyText(canonical, 'owner_type') ?? '';
      const ownerId = legacyText(canonical, 'owner_id') ?? '';
      const expectedOwner = mapping.find(
        (row) => row.canonicalEntity === ownerType && row.canonicalId === ownerId
      );
      const expected =
        entry.legacyTable === 'students'
          ? source.learners.find((learner) => learner.id === entry.legacyId)?.upi ?? ''
          : legacyGuardianById.get(entry.legacyId)?.nationalId ?? '';
      checks.push(
        check(
          'identifier',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'identifier_owner',
          entry.legacyId,
          expectedOwner?.legacyId ?? '',
          'error'
        ),
        check('identifier', entry.legacyTable, entry.legacyId, entry.canonicalId, 'identifier_value', expected, legacyText(canonical, 'value') ?? '', 'error'),
        check(
          'identifier',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'identifier_scheme',
          entry.legacyTable === 'students' ? 'ke.kemis_upi' : 'national_id',
          legacyText(canonical, 'scheme') ?? '',
          'error'
        )
      );
      continue;
    }

    const legacy = legacyLearnerById.get(entry.legacyId);
    if (legacy === undefined) {
      checks.push(
        check('enrolment', entry.legacyTable, entry.legacyId, entry.canonicalId, 'legacy_row', 'present', 'the legacy row is gone', 'error')
      );
      continue;
    }
    const classGroupId = legacyText(canonical, 'class_group_id') ?? '';
    const classGroup = classGroups.get(classGroupId);
    const yearId = legacyText(canonical, 'academic_year_id') ?? '';
    const year = years.get(yearId);
    const yearStart = year === undefined ? '' : legacyText(year, 'start_date') ?? '';
    checks.push(
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_class_group',
        source.classGroupByStream.get(legacy.streamId ?? '') ?? '',
        classGroupId,
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_year',
        classGroup === undefined ? '' : legacyText(classGroup, 'academic_year_id') ?? '',
        yearId,
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_level',
        classGroup === undefined ? '' : legacyText(classGroup, 'level_id') ?? '',
        legacyText(canonical, 'level_id') ?? '',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_programme',
        classGroup === undefined ? '' : legacyText(classGroup, 'programme_id') ?? '',
        legacyText(canonical, 'programme_id') ?? '',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_start_date',
        enrolmentStartDate(
          legacy.admissionDate,
          yearStart,
          year === undefined ? '' : legacyText(year, 'end_date') ?? '',
          learnerStatus(legacy.status).exitReason !== null
        ),
        legacyText(canonical, 'start_date') ?? '',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_end_date',
        learnerStatus(legacy.status).exitReason === null
          ? ''
          : year === undefined
            ? ''
            : legacyText(year, 'end_date') ?? '',
        legacyText(canonical, 'end_date') ?? '',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_entry_reason',
        legacy.admissionDate === null || legacy.admissionDate >= yearStart ? 'new_admission' : 'promoted',
        legacyText(canonical, 'entry_reason') ?? '',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_status',
        learnerStatus(legacy.status).enrolmentStatus,
        legacyText(canonical, 'status') ?? '',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_exit_reason',
        learnerStatus(legacy.status).exitReason ?? '',
        legacyText(canonical, 'exit_reason') ?? '',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_year_exists',
        'the year is one the database holds',
        years.has(yearId) ? 'the year is one the database holds' : 'the year is missing',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_level_exists',
        'the level is one the database holds',
        levels.has(legacyText(canonical, 'level_id') ?? '')
          ? 'the level is one the database holds'
          : 'the level is missing',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'enrolment_programme_exists',
        'the programme is one the database holds',
        programmes.has(legacyText(canonical, 'programme_id') ?? '')
          ? 'the programme is one the database holds'
          : 'the programme is missing',
        'error'
      ),
      check(
        'enrolment',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'audit_timestamps',
        'created_at and updated_at are ISO timestamps',
        validTimestamp(legacyText(canonical, 'created_at') ?? '') &&
          validTimestamp(legacyText(canonical, 'updated_at') ?? '')
          ? 'created_at and updated_at are ISO timestamps'
          : `created_at ${legacyText(canonical, 'created_at') ?? ''}, updated_at ${legacyText(canonical, 'updated_at') ?? ''}`,
        'error'
      )
    );
  }

  // The acceptance: every learner whose stream migration M2 mapped has an enrolment in the
  // class group's year, level and programme.
  const enrolmentByLearner = new Map<string, SqliteRow>();
  for (const entry of mapping) {
    if (entry.canonicalEntity !== 'enrolment') continue;
    const row = enrolments.get(entry.canonicalId);
    if (row !== undefined) enrolmentByLearner.set(entry.legacyId, row);
  }

  const resolutions: LearnerResolution[] = [];
  for (const legacy of source.learners) {
    const learnerCanonicalId = learnerMapByLegacyId.get(legacy.id);
    if (learnerCanonicalId === undefined) continue;
    const expectedClassGroup = source.classGroupByStream.get(legacy.streamId ?? '');
    const enrolment = enrolmentByLearner.get(legacy.id);
    if (enrolment === undefined) {
      checks.push(
        check(
          'learner',
          'students',
          legacy.id,
          learnerCanonicalId,
          'learner_class',
          expectedClassGroup === undefined ? 'the stream is not one M2 mapped' : 'a class group',
          'no enrolment',
          expectedClassGroup === undefined ? 'warning' : 'error'
        )
      );
      continue;
    }
    const classGroup = classGroups.get(legacyText(enrolment, 'class_group_id') ?? '');
    const expectedLevel = classGroup === undefined ? '' : legacyText(classGroup, 'level_id') ?? '';
    const expectedYear = classGroup === undefined ? '' : legacyText(classGroup, 'academic_year_id') ?? '';
    checks.push(
      check(
        'learner',
        'students',
        legacy.id,
        learnerCanonicalId,
        'learner_class',
        `${expectedClassGroup ?? ''} in ${expectedLevel} and ${expectedYear}`,
        `${legacyText(enrolment, 'class_group_id') ?? ''} in ${legacyText(enrolment, 'level_id') ?? ''} and ${legacyText(enrolment, 'academic_year_id') ?? ''}`,
        'error'
      )
    );
    if (
      expectedClassGroup !== undefined &&
      legacyText(enrolment, 'class_group_id') === expectedClassGroup &&
      legacyText(enrolment, 'level_id') === expectedLevel &&
      legacyText(enrolment, 'academic_year_id') === expectedYear
    ) {
      resolutions.push({
        learnerId: legacy.id,
        legacyStreamId: legacy.streamId,
        classGroupId: expectedClassGroup,
        levelId: expectedLevel,
        academicYearId: expectedYear,
        programmeId: classGroup === undefined ? '' : legacyText(classGroup, 'programme_id') ?? '',
      });
    }
  }

  // The counts: every legacy row either became a canonical row or was reported.
  const before = legacyPeopleCounts(source);
  const after = countsByEntity(mapping);
  const unmapped = countsByEntity(unmappable);
  for (const entity of ['learner', 'guardian', 'learner_guardian', 'enrolment'] as const) {
    checks.push(
      check(entity, 'legacy', '', '', 'count', String(before[entity]), String(after[entity] + unmapped[entity]), 'error')
    );
  }
  // An identifier value is one row: a duplicate claim by another owner is refused and reported,
  // so the count compares the distinct values the legacy rows name with the rows written.
  checks.push(
    check('identifier', 'legacy', '', '', 'count', String(before.identifier), String(after.identifier), 'error')
  );

  const stray = emptyCounts();
  stray.learner = Math.max(0, learners.size - after.learner);
  stray.guardian = Math.max(0, guardians.size - after.guardian);
  stray.learner_guardian = Math.max(0, links.size - after.learner_guardian);
  stray.identifier = Math.max(0, identifiers.size - after.identifier);
  stray.enrolment = Math.max(0, enrolments.size - after.enrolment);
  for (const entity of ['learner', 'guardian', 'learner_guardian', 'identifier', 'enrolment'] as const) {
    checks.push(check(entity, 'canonical', '', '', 'stray', '0', String(stray[entity]), 'error'));
  }

  const issues: PeopleIssue[] = notes
    .filter((note) => note.severity !== 'info' && isPeopleEntity(note.entity))
    .map((note) => ({
      code: note.code,
      severity: note.severity === 'error' ? 'error' : 'warning',
      entity: note.entity as PeopleEntity,
      legacyTable: note.legacyTable,
      legacyId: note.legacyId,
      message: note.message,
    }));
  const assumptions = notes.filter((note) => note.severity === 'info').map((note) => note.message);

  return {
    counts: { before, after, stray },
    checks,
    issues,
    assumptions,
    unmappable,
    mapping,
    resolutions,
  };
}

/**
 * The report the migration left in the database.
 *
 * The report is read back from the database and re-derived from the legacy rows, so it says
 * what the database holds rather than what the plan intended.
 */
export async function readPeopleMigrationReport(
  reader: SqlReader
): Promise<PeopleMigrationVerification> {
  const source = await readPeoplePlanSource(reader);
  return verifyPeopleMigration(reader, source);
}
