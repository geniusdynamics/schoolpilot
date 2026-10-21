// ABOUTME: The legacy people source: the students, guardians and relationship rows migration M3
// ABOUTME: reads, and the canonical class groups, years and institution it resolves them through.

import type { SqliteRow } from '@/data/adapters/sqlite';

import {
  legacyDay,
  legacyFlag,
  legacyId,
  legacyKey,
  legacyRef,
  legacyText,
  tableExists,
  type SqlReader,
} from './001-legacy-calendar';
import { LEGACY_ID_MAP_TABLE } from './001-institution-calendar';
import { normaliseLegacyPhone } from './003-people-rules';

/** The legacy tables migration M3 reads. */
export const LEGACY_SOURCES = {
  students: 'students',
  guardians: 'parents_guardians',
  relationships: 'student_guardian_relationships',
} as const;

/** A legacy learner row, with the fields the canonical learner and enrolment take. */
export interface LegacyLearner {
  readonly id: string;
  readonly admissionNumber: string | null;
  readonly firstName: string | null;
  readonly middleName: string | null;
  readonly lastName: string | null;
  readonly gender: string | null;
  readonly dateOfBirth: string | null;
  readonly admissionDate: string | null;
  readonly status: string | null;
  readonly streamId: string | null;
  readonly className: string | null;
  readonly streamName: string | null;
  /** The KEMIS UPI the legacy row carries; it becomes a learner identifier. */
  readonly upi: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly county: string | null;
  readonly district: string | null;
  readonly religion: string | null;
  readonly remarks: string | null;
  readonly categoryName: string | null;
  readonly dormitoryName: string | null;
  readonly previousSchool: string | null;
  /** A medical note column an installation carries; the P0-era schema does not declare one. */
  readonly medicalNotes: string | null;
  /** The legacy exam summary, JSON text; it becomes `attributes.ke.kcpe`. */
  readonly examSummary: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** A legacy guardian row, or the copy a student row carries in `primary_guardian`. */
export interface LegacyGuardian {
  /** The legacy guardian id; the identity the links and the id map name. */
  readonly id: string;
  /** Where the row was read from: the guardian table, or a student row's embedded copy. */
  readonly legacyTable: 'parents_guardians' | 'students';
  /** The learner whose row carried an embedded copy; null for a guardian table row. */
  readonly learnerId: string | null;
  readonly name: string | null;
  /** The phone as the legacy row spells it. */
  readonly phone: string | null;
  /** The E.164 form the de-duplication compares; null when it cannot be normalised. */
  readonly normalisedPhone: string | null;
  readonly relationshipType: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly location: string | null;
  /** A national id column an installation carries; the P0-era schema does not declare one. */
  readonly nationalId: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** One legacy statement that a learner has a guardian. */
export interface LegacyGuardianLink {
  /** The relationship row id; null for a link read from a student's embedded guardian. */
  readonly id: string | null;
  readonly learnerId: string;
  readonly guardianId: string;
  readonly isPrimary: boolean;
  readonly relationshipType: string | null;
  /** Null when the source carries no such flag. */
  readonly canPickUp: boolean | null;
  readonly receivesCommunication: boolean | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** A canonical class group migration M2 wrote, and the year, level and programme it sits in. */
export interface CanonicalClassGroup {
  readonly id: string;
  readonly academicYearId: string;
  readonly levelId: string;
  readonly programmeId: string;
  readonly name: string;
}

/** A canonical academic year. */
export interface CanonicalYear {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: string;
}

/** Every row migration M3 plans from. */
export interface PeoplePlanSource {
  readonly institutionId: string | null;
  readonly institutionCountry: string | null;
  readonly learners: readonly LegacyLearner[];
  readonly guardians: readonly LegacyGuardian[];
  readonly links: readonly LegacyGuardianLink[];
  readonly classGroups: readonly CanonicalClassGroup[];
  /** The normalised legacy stream id to the class group migration M2 made of it. */
  readonly classGroupByStream: ReadonlyMap<string, string>;
  readonly years: readonly CanonicalYear[];
}

/** Reads a legacy table, or nothing when the database does not hold it. */
async function readTable(reader: SqlReader, table: string): Promise<SqliteRow[]> {
  if (!(await tableExists(reader, table))) return [];
  return reader.all<SqliteRow>(`SELECT * FROM ${table} ORDER BY id`);
}

/** A value out of a parsed JSON object as text, or null when it is not one. */
function jsonText(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

/** A value out of a parsed JSON object as a flag. */
function jsonFlag(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.trim() === '1' || value.trim().toLowerCase() === 'true';
  return false;
}

/** Parses a JSON object a legacy row carries as text. */
function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Reads the legacy students. */
function readLearners(rows: readonly SqliteRow[]): LegacyLearner[] {
  return rows.map((row) => ({
    id: legacyId(row),
    admissionNumber: legacyText(row, 'admission_no'),
    firstName: legacyText(row, 'first_name'),
    middleName: legacyText(row, 'middle_name'),
    lastName: legacyText(row, 'last_name'),
    gender: legacyText(row, 'gender'),
    dateOfBirth: legacyDay(row, 'date_of_birth'),
    admissionDate: legacyDay(row, 'admission_date'),
    status: legacyText(row, 'status'),
    streamId: legacyRef(row, 'current_class_stream_id'),
    className: legacyText(row, 'current_class_name'),
    streamName: legacyText(row, 'current_class_stream_name'),
    upi: legacyText(row, 'upi_no'),
    phone: legacyText(row, 'phone'),
    email: legacyText(row, 'email'),
    address: legacyText(row, 'address'),
    county: legacyText(row, 'county'),
    district: legacyText(row, 'district'),
    religion: legacyText(row, 'religion'),
    remarks: legacyText(row, 'remarks'),
    categoryName: legacyText(row, 'student_category_name'),
    dormitoryName: legacyText(row, 'dormitory_name'),
    previousSchool: legacyText(row, 'primary_school'),
    medicalNotes: legacyText(row, 'medical_notes'),
    examSummary: legacyText(row, 'exam_result_summary'),
    createdAt: legacyText(row, 'created_at'),
    updatedAt: legacyText(row, 'updated_at'),
  }));
}

/** A guardian row as the canonical model sees it, from either source. */
function guardianRow(
  id: string,
  legacyTable: LegacyGuardian['legacyTable'],
  learnerId: string | null,
  read: (key: string) => string | null,
  createdAt: string | null,
  updatedAt: string | null
): LegacyGuardian {
  const phone = read('phone');
  return {
    id,
    legacyTable,
    learnerId,
    name: read('name'),
    phone,
    normalisedPhone: normaliseLegacyPhone(phone).value,
    relationshipType: read('relationship_type'),
    email: read('email'),
    address: read('address'),
    location: read('location'),
    nationalId: read('national_id'),
    createdAt,
    updatedAt,
  };
}

/** Reads the guardian table. */
function readGuardians(rows: readonly SqliteRow[]): LegacyGuardian[] {
  return rows
    .map((row) =>
      guardianRow(
        legacyId(row),
        'parents_guardians',
        null,
        (key) => legacyText(row, key),
        legacyText(row, 'created_at'),
        legacyText(row, 'updated_at')
      )
    )
    .filter((guardian) => guardian.id !== '');
}

/**
 * Reads the guardian copy every student row carries.
 *
 * The legacy seed repeats the guardian in `primary_guardian`; the copy names the same legacy
 * guardian id as the guardian table, so the two are one row. A copy without an id is keyed by
 * the student it came from, so it still has a stable identity in the report.
 */
function readEmbeddedGuardians(rows: readonly SqliteRow[]): LegacyGuardian[] {
  const guardians: LegacyGuardian[] = [];
  for (const row of rows) {
    const embedded = parseJsonObject(row['primary_guardian']);
    if (embedded === null) continue;
    const learnerId = legacyId(row);
    const id = legacyKey(jsonText(embedded, 'id')) ?? `embedded:${learnerId}`;
    guardians.push(
      guardianRow(
        id,
        'students',
        learnerId,
        (key) => jsonText(embedded, key),
        jsonText(embedded, 'created_at'),
        jsonText(embedded, 'updated_at')
      )
    );
  }
  return guardians;
}

/** Reads the relationship table. */
function readRelationshipLinks(rows: readonly SqliteRow[]): LegacyGuardianLink[] {
  const links: LegacyGuardianLink[] = [];
  for (const row of rows) {
    const learnerId = legacyRef(row, 'student_id');
    const guardianId = legacyRef(row, 'guardian_id');
    if (learnerId === null || guardianId === null) continue;
    links.push({
      id: legacyId(row),
      learnerId,
      guardianId,
      isPrimary: legacyFlag(row, 'is_primary'),
      relationshipType: legacyText(row, 'relationship_type'),
      canPickUp: legacyFlag(row, 'can_pickup'),
      receivesCommunication: legacyFlag(row, 'receives_communication'),
      createdAt: legacyText(row, 'created_at'),
      updatedAt: legacyText(row, 'updated_at'),
    });
  }
  return links;
}

/** Reads the guardian each student row embeds as a primary link. */
function readEmbeddedLinks(rows: readonly SqliteRow[]): LegacyGuardianLink[] {
  const links: LegacyGuardianLink[] = [];
  for (const row of rows) {
    const embedded = parseJsonObject(row['primary_guardian']);
    if (embedded === null) continue;
    const learnerId = legacyId(row);
    const guardianId = legacyKey(jsonText(embedded, 'id')) ?? `embedded:${learnerId}`;
    links.push({
      id: null,
      learnerId,
      guardianId,
      isPrimary: true,
      relationshipType: jsonText(embedded, 'relationship_type'),
      canPickUp: jsonFlag(embedded, 'can_pickup') ? true : null,
      receivesCommunication: null,
      createdAt: jsonText(embedded, 'created_at'),
      updatedAt: jsonText(embedded, 'updated_at'),
    });
  }
  return links;
}

/** Reads the canonical institution. */
async function readInstitution(
  reader: SqlReader
): Promise<{ id: string | null; country: string | null }> {
  if (!(await tableExists(reader, 'institution'))) return { id: null, country: null };
  const row = await reader.get<SqliteRow>(
    `SELECT id, country FROM "institution" ORDER BY rowid LIMIT 1`
  );
  if (row === null) return { id: null, country: null };
  return { id: legacyText(row, 'id'), country: legacyText(row, 'country') };
}

/** Reads the canonical class groups migration M2 wrote. */
async function readClassGroups(reader: SqlReader): Promise<CanonicalClassGroup[]> {
  if (!(await tableExists(reader, 'class_group'))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT id, academic_year_id, level_id, programme_id, name FROM "class_group" ORDER BY id`
  );
  const groups: CanonicalClassGroup[] = [];
  for (const row of rows) {
    const id = legacyText(row, 'id');
    const academicYearId = legacyText(row, 'academic_year_id');
    const levelId = legacyText(row, 'level_id');
    const programmeId = legacyText(row, 'programme_id');
    if (id === null || academicYearId === null || levelId === null || programmeId === null) continue;
    groups.push({
      id,
      academicYearId,
      levelId,
      programmeId,
      name: legacyText(row, 'name') ?? '',
    });
  }
  return groups;
}

/** Reads the class group each legacy stream became, through M2's id map. */
async function readClassGroupByStream(reader: SqlReader): Promise<Map<string, string>> {
  const byStream = new Map<string, string>();
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return byStream;
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_id, canonical_id FROM "${LEGACY_ID_MAP_TABLE}"
      WHERE legacy_table = 'class_streams' AND canonical_entity = 'class_group'
      ORDER BY legacy_id`
  );
  for (const row of rows) {
    const legacyStream = legacyKey(legacyText(row, 'legacy_id'));
    const canonicalId = legacyText(row, 'canonical_id');
    if (legacyStream === null || canonicalId === null) continue;
    byStream.set(legacyStream, canonicalId);
  }
  return byStream;
}

/** Reads the canonical academic years. */
async function readYears(reader: SqlReader): Promise<CanonicalYear[]> {
  if (!(await tableExists(reader, 'academic_year'))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT id, name, start_date, end_date, status FROM "academic_year" ORDER BY start_date, name`
  );
  const years: CanonicalYear[] = [];
  for (const row of rows) {
    const id = legacyText(row, 'id');
    const name = legacyText(row, 'name');
    const startDate = legacyDay(row, 'start_date');
    const endDate = legacyDay(row, 'end_date');
    if (id === null || name === null || startDate === null || endDate === null) continue;
    years.push({ id, name, startDate, endDate, status: legacyText(row, 'status') ?? '' });
  }
  return years;
}

/** Reads every legacy row and every canonical row migration M3 plans from. */
export async function readPeoplePlanSource(reader: SqlReader): Promise<PeoplePlanSource> {
  const learnerRows = await readTable(reader, LEGACY_SOURCES.students);
  const guardianRows = await readTable(reader, LEGACY_SOURCES.guardians);
  const relationshipRows = await readTable(reader, LEGACY_SOURCES.relationships);
  const institution = await readInstitution(reader);

  return {
    institutionId: institution.id,
    institutionCountry: institution.country,
    learners: readLearners(learnerRows),
    // The guardian table comes first: a row of the table wins over a student's stale copy.
    guardians: [...readGuardians(guardianRows), ...readEmbeddedGuardians(learnerRows)],
    // The relationship table comes first, so its flags win over an embedded copy's silence.
    links: [...readRelationshipLinks(relationshipRows), ...readEmbeddedLinks(learnerRows)],
    classGroups: await readClassGroups(reader),
    classGroupByStream: await readClassGroupByStream(reader),
    years: await readYears(reader),
  };
}
