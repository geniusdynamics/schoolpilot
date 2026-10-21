// ABOUTME: The legacy database migration M3 runs against: the P0-era learners and guardians, the
// ABOUTME: siblings, orphans and duplicates an installation can hold, and the drift it added.

import type { SqliteAdapter, SqliteBindValue } from '@/data/adapters/sqlite';
import {
  initialMockParentsGuardians,
  initialMockStudents,
} from '@/modules/administration/data/mockData';
import { collectionsDefinition } from '@/services/database/collections';
import { SchemaConverter } from '@/services/database/SchemaConverter';

import { buildClassGroupFixture, FIXTURE_NOW, type ClassGroupFixtureOptions } from './002-legacy-fixture';

export { FIXTURE_NOW };

/** The tables migration M3 reads, in the order the fixture creates them. */
export const PEOPLE_FIXTURE_TABLES = ['parents_guardians', 'student_guardian_relationships'] as const;

/** A legacy guardian row the seed does not carry. */
export interface ExtraGuardian {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly relationship_type: string;
  readonly email?: string;
}

/** The guardian a student row embeds; the seed's guardian rows fit this shape too. */
export interface EmbeddedGuardianRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly relationship_type?: string | null;
  readonly email?: string | null;
}

/** A sibling pair's guardian: one person, the number written nationally and internationally. */
export const SIBLING_GUARDIAN_NATIONAL: ExtraGuardian = {
  id: 'PG901',
  name: 'Amina Juma',
  phone: '0712345678',
  relationship_type: 'Mother',
  email: 'a.juma@example.com',
};

export const SIBLING_GUARDIAN_INTERNATIONAL: ExtraGuardian = {
  id: 'PG902',
  name: 'Amina Juma',
  phone: '+254 712 345 678',
  relationship_type: 'Mother',
};

/** A guardian whose row carries no phone the migration can normalise. */
export const GUARDIAN_WITHOUT_PHONE: ExtraGuardian = {
  id: 'PG903',
  name: 'No Phone Guardian',
  phone: '',
  relationship_type: 'Guardian',
};

/** A guardian whose row carries no name. */
export const GUARDIAN_WITHOUT_NAME: ExtraGuardian = {
  id: 'PG904',
  name: '',
  phone: '0733000111',
  relationship_type: 'Father',
};

/** The guardians the fixture adds to the seed. */
export const EXTRA_GUARDIANS = [
  SIBLING_GUARDIAN_NATIONAL,
  SIBLING_GUARDIAN_INTERNATIONAL,
  GUARDIAN_WITHOUT_PHONE,
  GUARDIAN_WITHOUT_NAME,
] as const;

/** A learner row the seed does not carry. */
export interface ExtraLearner {
  readonly id: string;
  readonly admissionNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly gender: string;
  readonly streamId: number | null;
  readonly className: string | null;
  readonly streamName: string | null;
  readonly status?: string;
  readonly admissionDate?: string;
  readonly upi?: string;
  readonly guardian?: EmbeddedGuardianRow;
}

/** The learners the fixture adds: the awkward cases, plus a sibling pair and a control. */
export const EXTRA_LEARNERS: readonly ExtraLearner[] = [
  {
    id: 'S901',
    admissionNumber: 'ADM901',
    firstName: 'Amina',
    lastName: 'Juma',
    gender: 'Female',
    streamId: 1,
    className: 'Form 1',
    streamName: 'A',
    admissionDate: '2020-01-06',
    upi: 'UPI-A',
    guardian: SIBLING_GUARDIAN_NATIONAL,
  },
  {
    id: 'S902',
    admissionNumber: 'ADM902',
    firstName: 'Fatuma',
    lastName: 'Juma',
    gender: 'Female',
    streamId: 1,
    className: 'Form 1',
    streamName: 'A',
    admissionDate: '2021-01-11',
    upi: 'UPI-B',
    guardian: SIBLING_GUARDIAN_INTERNATIONAL,
  },
  {
    // No class stream: the learner row is written, the enrolment cannot be.
    id: 'S903',
    admissionNumber: 'ADM903',
    firstName: 'Noor',
    lastName: 'Noclass',
    gender: 'Female',
    streamId: null,
    className: null,
    streamName: null,
    admissionDate: '2024-09-02',
  },
  {
    // No guardian at all: the learner and the enrolment are written, no link is.
    id: 'S905',
    admissionNumber: 'ADM905',
    firstName: 'Peter',
    lastName: 'Noguardian',
    gender: 'Male',
    streamId: 2,
    className: 'Form 1',
    streamName: 'B',
  },
  {
    id: 'S906',
    admissionNumber: 'ADM906',
    firstName: 'Shared',
    lastName: 'Upi One',
    gender: 'Male',
    streamId: 1,
    className: 'Form 1',
    streamName: 'A',
    upi: 'UPI-DUP',
    guardian: initialMockParentsGuardians[9],
  },
  {
    id: 'S907',
    admissionNumber: 'ADM907',
    firstName: 'Shared',
    lastName: 'Upi Two',
    gender: 'Female',
    streamId: 2,
    className: 'Form 1',
    streamName: 'B',
    upi: 'UPI-DUP',
    guardian: initialMockParentsGuardians[10],
  },
  {
    // The guardian row carries no phone: the guardian and the link are reported.
    id: 'S908',
    admissionNumber: 'ADM908',
    firstName: 'Grace',
    lastName: 'Nophone',
    gender: 'Female',
    streamId: 3,
    className: 'Form 2',
    streamName: 'A',
    guardian: GUARDIAN_WITHOUT_PHONE,
  },
  {
    // The guardian row carries no name: the guardian and the link are reported.
    id: 'S909',
    admissionNumber: 'ADM909',
    firstName: 'Hassan',
    lastName: 'Noname',
    gender: 'Male',
    streamId: 3,
    className: 'Form 2',
    streamName: 'A',
    guardian: GUARDIAN_WITHOUT_NAME,
  },
  {
    // An alumnus: the learner graduated and the enrolment completed.
    id: 'S911',
    admissionNumber: 'ADM911',
    firstName: 'Alice',
    lastName: 'Alumni',
    gender: 'Female',
    streamId: 1,
    className: 'Form 1',
    streamName: 'A',
    status: 'Alumni',
    admissionDate: '2019-01-07',
    guardian: initialMockParentsGuardians[5],
  },
  {
    // A learner who left for another school.
    id: 'S912',
    admissionNumber: 'ADM912',
    firstName: 'Brian',
    lastName: 'Transferred',
    gender: 'Male',
    streamId: 2,
    className: 'Form 1',
    streamName: 'B',
    status: 'Transferred',
    admissionDate: '2023-05-02',
    guardian: initialMockParentsGuardians[6],
  },
  {
    // A learner admitted inside the academic year: the enrolment is a new admission.
    id: 'S913',
    admissionNumber: 'ADM913',
    firstName: 'Carol',
    lastName: 'New',
    gender: 'Female',
    streamId: 3,
    className: 'Form 2',
    streamName: 'A',
    admissionDate: '2024-10-15',
  },
  {
    // The admission number the first learner already holds: the row cannot become a learner.
    id: 'S914',
    admissionNumber: 'ADM001',
    firstName: 'Duplicate',
    lastName: 'Admission',
    gender: 'Male',
    streamId: 1,
    className: 'Form 1',
    streamName: 'A',
  },
];

/** One statement that a learner has a guardian, beyond the student's embedded copy. */
export interface ExtraRelationship {
  readonly id: string;
  readonly studentId: string;
  readonly guardianId: string;
  readonly isPrimary: boolean;
  readonly relationshipType: string;
  readonly canPickUp: boolean;
  readonly receivesCommunication: boolean;
}

/** The relationship rows the fixture adds. */
export const EXTRA_RELATIONSHIPS: readonly ExtraRelationship[] = [
  {
    // A second guardian of a learner whose embedded guardian is the primary one.
    id: 'REL001',
    studentId: 'S005',
    guardianId: 'PG005',
    isPrimary: false,
    relationshipType: 'Aunt',
    canPickUp: true,
    receivesCommunication: false,
  },
  {
    // The relationship agrees with the embedded copy; the pair is one link.
    id: 'REL002',
    studentId: 'S006',
    guardianId: 'PG010',
    isPrimary: true,
    relationshipType: 'Father',
    canPickUp: true,
    receivesCommunication: true,
  },
  {
    // A second guardian marked primary: the embedded one keeps the flag.
    id: 'REL003',
    studentId: 'S007',
    guardianId: 'PG008',
    isPrimary: true,
    relationshipType: 'Guardian',
    canPickUp: false,
    receivesCommunication: true,
  },
  {
    // A relationship to a guardian the legacy database does not hold.
    id: 'REL004',
    studentId: 'S912',
    guardianId: 'PG999',
    isPrimary: false,
    relationshipType: 'Guardian',
    canPickUp: false,
    receivesCommunication: true,
  },
  {
    // The only guardian of a learner, not marked primary: the link is promoted.
    id: 'REL005',
    studentId: 'S913',
    guardianId: 'PG005',
    isPrimary: false,
    relationshipType: 'Mother',
    canPickUp: false,
    receivesCommunication: true,
  },
];

/** How the fixture differs from the P0-era seed. */
export interface PeopleFixtureOptions extends ClassGroupFixtureOptions {
  /** Whether the fixture holds the guardian and relationship tables. */
  readonly withGuardians?: boolean;
  /** Whether the fixture holds the awkward learners the seed never did. */
  readonly withAwkwardLearners?: boolean;
  /**
   * Whether the fixture holds the columns an installation added and the P0-era schema does not
   * declare: the guardians' national id and a learner's medical notes.
   */
  readonly withDriftColumns?: boolean;
}

/** The text the legacy provider writes for a numeric id. */
function legacyIdText(value: unknown, doubleIds: boolean): SqliteBindValue {
  if (typeof value === 'number' && doubleIds && Number.isInteger(value)) return `${value}.0`;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'string') return value;
  return null;
}

/** A value the legacy table can hold; nested objects and arrays travel as JSON text. */
function legacyValue(value: unknown): SqliteBindValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return JSON.stringify(value);
}

async function insertRows(
  adapter: SqliteAdapter,
  table: string,
  rows: readonly Record<string, unknown>[]
): Promise<void> {
  for (const row of rows) {
    const columns = Object.keys(row);
    await adapter.run(
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})`
        + ` VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => legacyValue(row[column]))
    );
  }
}

/** Creates a legacy table with the DDL the legacy converter produces. */
async function createLegacyTable(adapter: SqliteAdapter, table: string): Promise<void> {
  const schema = collectionsDefinition[table].schema;
  const conversion = SchemaConverter.convertRxDBToSQLite(table, schema);
  await adapter.exec(SchemaConverter.generateCreateTableSQL(conversion.sqlSchema));
}

/** The guardian table rows: the seed's guardians, then the ones an installation added. */
function guardianRows(): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return [
    ...initialMockParentsGuardians.map((guardian) => ({
      ...guardian,
      created_at: timestamp,
      updated_at: timestamp,
    })),
    ...EXTRA_GUARDIANS.map((guardian) => ({
      ...guardian,
      created_at: timestamp,
      updated_at: timestamp,
    })),
  ];
}

/** The learner rows the fixture adds, with the guardian each row embeds. */
function extraLearnerRows(doubleIds: boolean): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return EXTRA_LEARNERS.map((learner) => ({
    id: learner.id,
    admission_no: learner.admissionNumber,
    first_name: learner.firstName,
    last_name: learner.lastName,
    gender: learner.gender,
    current_class_stream_id:
      learner.streamId === null ? null : legacyIdText(learner.streamId, doubleIds),
    status: learner.status ?? 'Active',
    current_class_name: learner.className,
    current_class_stream_name: learner.streamName,
    display_name: `${learner.firstName} ${learner.lastName}`,
    upi_no: learner.upi ?? null,
    admission_date: learner.admissionDate ?? null,
    primary_guardian:
      learner.guardian === undefined
        ? null
        : {
            ...learner.guardian,
            created_at: timestamp,
            updated_at: timestamp,
          },
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/** The relationship table rows. */
function relationshipRows(): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return EXTRA_RELATIONSHIPS.map((relationship) => ({
    id: relationship.id,
    student_id: relationship.studentId,
    guardian_id: relationship.guardianId,
    is_primary: relationship.isPrimary,
    relationship_type: relationship.relationshipType,
    can_pickup: relationship.canPickUp,
    receives_communication: relationship.receivesCommunication,
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/**
 * Writes the columns of a P0-era student row that migration M2's fixture does not carry.
 *
 * The legacy seed keeps the guardian, the category and the contact details on the student row.
 * Migration M2 reads the class only, so its fixture writes the class columns; the fixture here
 * writes the rest back, so the database holds the rows an installation of the legacy build
 * holds.
 */
async function restoreSeedStudentColumns(adapter: SqliteAdapter): Promise<void> {
  for (const student of initialMockStudents) {
    await adapter.run(
      `UPDATE "students" SET "primary_guardian" = ?, "student_category_name" = ?,
         "dormitory_name" = ?, "address" = ?, "county" = ?, "district" = ?, "phone" = ?,
         "email" = ?, "remarks" = ?, "primary_school" = ?, "middle_name" = ?,
         "date_of_birth" = ?
       WHERE "id" = ?`,
      [
        student.primary_guardian === undefined || student.primary_guardian === null
          ? null
          : JSON.stringify(student.primary_guardian),
        student.student_category_name ?? null,
        student.dormitory_name ?? null,
        student.address ?? null,
        student.county ?? null,
        student.district ?? null,
        student.phone ?? null,
        student.email ?? null,
        student.remarks ?? null,
        student.primary_school ?? null,
        student.middle_name ?? null,
        student.date_of_birth ?? null,
        student.id,
      ]
    );
  }
}

/**
 * Builds the legacy database migration M3 reads.
 *
 * The tables are created with the DDL the legacy converter produces. The rows are the P0-era
 * seed, plus the drift an installation can hold: siblings whose guardian is written with a
 * national and an international number, a learner with no class stream, a learner whose stream
 * does not exist, two learners who share a UPI, guardians with no phone and with no name, a
 * learner with no guardian, and a learner whose admission number is already taken.
 */
export async function buildPeopleFixture(
  adapter: SqliteAdapter,
  options: PeopleFixtureOptions = {}
): Promise<void> {
  await buildClassGroupFixture(adapter, options);
  if (!(options.withGuardians ?? true)) return;

  for (const table of PEOPLE_FIXTURE_TABLES) {
    await createLegacyTable(adapter, table);
  }
  const driftColumns = options.withDriftColumns ?? true;
  if (driftColumns) {
    await adapter.exec(`ALTER TABLE "parents_guardians" ADD COLUMN "national_id" TEXT`);
  }
  await insertRows(adapter, 'parents_guardians', guardianRows());
  await insertRows(adapter, 'student_guardian_relationships', relationshipRows());
  await restoreSeedStudentColumns(adapter);
  if (options.withAwkwardLearners ?? true) {
    await insertRows(adapter, 'students', extraLearnerRows(options.doubleIds ?? true));
    await adapter.run(`UPDATE "students" SET "upi_no" = ? WHERE "id" = ?`, ['UPI-001', 'S001']);
    await adapter.run(`UPDATE "students" SET "upi_no" = ? WHERE "id" = ?`, ['UPI-002', 'S002']);
    await adapter.run(`UPDATE "students" SET "upi_no" = ? WHERE "id" = ?`, ['UPI-003', 'S003']);
  }
  if (driftColumns) {
    await adapter.exec(`ALTER TABLE "students" ADD COLUMN "medical_notes" TEXT`);
    await adapter.run(`UPDATE "students" SET "medical_notes" = ? WHERE "id" = ?`, [
      'Asthma; Peanut allergy',
      'S001',
    ]);
    await adapter.run(`UPDATE "parents_guardians" SET "national_id" = ? WHERE "id" = ?`, [
      'NIN-001',
      SIBLING_GUARDIAN_NATIONAL.id,
    ]);
    await adapter.run(`UPDATE "parents_guardians" SET "national_id" = ? WHERE "id" = ?`, [
      'NIN-001',
      SIBLING_GUARDIAN_INTERNATIONAL.id,
    ]);
    await adapter.run(`UPDATE "parents_guardians" SET "national_id" = ? WHERE "id" = ?`, [
      'NIN-SHARED',
      'PG003',
    ]);
    await adapter.run(`UPDATE "parents_guardians" SET "national_id" = ? WHERE "id" = ?`, [
      'NIN-SHARED',
      'PG011',
    ]);
  }
}
