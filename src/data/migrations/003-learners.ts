// ABOUTME: Migration M3: the legacy students and guardians become canonical learners, guardians,
// ABOUTME: links and identifiers, with one enrolment per learner from current_class_stream_id.

import type { SqliteBindValue } from '@/data/adapters/sqlite';
import {
  enrolmentSchema,
  guardianSchema,
  identifierSchema,
  learnerGuardianSchema,
  learnerSchema,
} from '@/domain/schema';

import { tableExists, type SqlReader } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
} from './001-institution-calendar';
import { CREATED_TABLE } from './002-class-groups';
import { readPeoplePlanSource } from './003-legacy-people';
import { planPeopleMigration, PEOPLE_ENTITIES, type PeopleMigrationPlan } from './003-people-plan';
import {
  readPeopleMigrationReport,
  verifyPeopleMigration,
  type PeopleCheck,
  type PeopleMigrationVerification,
} from './003-people-verification';
import type { Migration, MigrationContext } from './types';

export { readPeopleMigrationReport, type PeopleCheck, type PeopleMigrationVerification };
export { NATIONAL_ID_SCHEME, planPeopleMigration, UPI_SCHEME } from './003-people-plan';
export type { PeopleEntity, PeopleMigrationPlan } from './003-people-plan';
export { readPeoplePlanSource, type PeoplePlanSource } from './003-legacy-people';
export {
  PHONE_NORMALISATION_RULE,
  normaliseLegacyPhone,
  type NormalisedPhone,
} from './003-people-rules';

/** The canonical tables migration M3 writes. */
export const CANONICAL_TABLES: Record<(typeof PEOPLE_ENTITIES)[number], string> = {
  learner: 'learner',
  guardian: 'guardian',
  learner_guardian: 'learner_guardian',
  identifier: 'identifier',
  enrolment: 'enrolment',
};

/** The created-rows table M2 introduced; M3 records its own rows in it under its version. */
const CREATED_DDL = `CREATE TABLE IF NOT EXISTS "${CREATED_TABLE}" (
   migration_version INTEGER NOT NULL,
   entity TEXT NOT NULL,
   id TEXT NOT NULL,
   PRIMARY KEY (migration_version, entity, id)
 )`;

/** The options the migration takes. */
export interface LearnerMigrationOptions {
  /** The clock; the audit timestamps are derived from it. */
  readonly now?: () => Date;
}

async function insertRow(
  context: MigrationContext,
  table: string,
  row: Record<string, SqliteBindValue | undefined>
): Promise<void> {
  const columns: string[] = [];
  const values: SqliteBindValue[] = [];
  for (const [column, value] of Object.entries(row)) {
    if (value === undefined) continue;
    columns.push(column);
    values.push(value);
  }
  await context.run(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );
}

/** Writes the canonical rows of a plan, the id map, the unmappable rows and the notes. */
export async function writePeoplePlan(
  context: MigrationContext,
  plan: PeopleMigrationPlan
): Promise<void> {
  await context.exec(CREATED_DDL);

  for (const entry of plan.learners) {
    const row = learnerSchema.parse(entry);
    await insertRow(context, 'learner', {
      id: row.id,
      institution_id: row.institution_id,
      given_name: row.given_name,
      ...(row.middle_names === undefined
        ? {}
        : { middle_names: JSON.stringify(row.middle_names) }),
      family_name: row.family_name,
      ...(row.preferred_name === undefined ? {} : { preferred_name: row.preferred_name }),
      name_order: row.name_order,
      gender: row.gender,
      ...(row.date_of_birth === undefined ? {} : { date_of_birth: row.date_of_birth }),
      ...(row.nationality === undefined ? {} : { nationality: row.nationality }),
      ...(row.languages === undefined ? {} : { languages: JSON.stringify(row.languages) }),
      ...(row.photo_attachment_id === undefined
        ? {}
        : { photo_attachment_id: row.photo_attachment_id }),
      ...(row.phones === undefined ? {} : { phones: JSON.stringify(row.phones) }),
      ...(row.emails === undefined ? {} : { emails: JSON.stringify(row.emails) }),
      ...(row.address === undefined ? {} : { address: JSON.stringify(row.address) }),
      ...(row.attributes === undefined ? {} : { attributes: JSON.stringify(row.attributes) }),
      admission_number: row.admission_number,
      ...(row.admission_date === undefined ? {} : { admission_date: row.admission_date }),
      status: row.status,
      ...(row.house_id === undefined ? {} : { house_id: row.house_id }),
      residence_status: row.residence_status,
      ...(row.special_needs === undefined
        ? {}
        : { special_needs: JSON.stringify(row.special_needs) }),
      ...(row.medical === undefined ? {} : { medical: JSON.stringify(row.medical) }),
      ...(row.previous_school === undefined ? {} : { previous_school: row.previous_school }),
      ...(row.household_id === undefined ? {} : { household_id: row.household_id }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.guardians) {
    const row = guardianSchema.parse(entry);
    await insertRow(context, 'guardian', {
      id: row.id,
      institution_id: row.institution_id,
      given_name: row.given_name,
      ...(row.middle_names === undefined
        ? {}
        : { middle_names: JSON.stringify(row.middle_names) }),
      family_name: row.family_name,
      ...(row.preferred_name === undefined ? {} : { preferred_name: row.preferred_name }),
      name_order: row.name_order,
      gender: row.gender,
      ...(row.date_of_birth === undefined ? {} : { date_of_birth: row.date_of_birth }),
      ...(row.nationality === undefined ? {} : { nationality: row.nationality }),
      ...(row.languages === undefined ? {} : { languages: JSON.stringify(row.languages) }),
      ...(row.photo_attachment_id === undefined
        ? {}
        : { photo_attachment_id: row.photo_attachment_id }),
      ...(row.phones === undefined ? {} : { phones: JSON.stringify(row.phones) }),
      ...(row.emails === undefined ? {} : { emails: JSON.stringify(row.emails) }),
      ...(row.address === undefined ? {} : { address: JSON.stringify(row.address) }),
      ...(row.attributes === undefined ? {} : { attributes: JSON.stringify(row.attributes) }),
      ...(row.occupation === undefined ? {} : { occupation: row.occupation }),
      ...(row.employer === undefined ? {} : { employer: row.employer }),
      ...(row.national_id === undefined ? {} : { national_id: row.national_id }),
      ...(row.is_staff_member_id === undefined
        ? {}
        : { is_staff_member_id: row.is_staff_member_id }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.identifiers) {
    const row = identifierSchema.parse(entry);
    await insertRow(context, 'identifier', {
      id: row.id,
      institution_id: row.institution_id,
      owner_type: row.owner_type,
      owner_id: row.owner_id,
      scheme: row.scheme,
      value: row.value,
      ...(row.issued_by === undefined ? {} : { issued_by: row.issued_by }),
      ...(row.verified_at === undefined ? {} : { verified_at: row.verified_at }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.links) {
    const row = learnerGuardianSchema.parse(entry);
    await insertRow(context, 'learner_guardian', {
      id: row.id,
      institution_id: row.institution_id,
      learner_id: row.learner_id,
      guardian_id: row.guardian_id,
      relationship: row.relationship,
      is_primary: row.is_primary ? 1 : 0,
      has_parental_responsibility: row.has_parental_responsibility ? 1 : 0,
      is_fee_payer: row.is_fee_payer ? 1 : 0,
      ...(row.fee_share_percent === undefined
        ? {}
        : { fee_share_percent: row.fee_share_percent }),
      can_pick_up: row.can_pick_up ? 1 : 0,
      receives_reports: row.receives_reports ? 1 : 0,
      receives_sms: row.receives_sms ? 1 : 0,
      preferred_channel: row.preferred_channel,
      ...(row.preferred_language === undefined
        ? {}
        : { preferred_language: row.preferred_language }),
      ...(row.priority === undefined ? {} : { priority: row.priority }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.enrolments) {
    const row = enrolmentSchema.parse(entry);
    await insertRow(context, 'enrolment', {
      id: row.id,
      institution_id: row.institution_id,
      learner_id: row.learner_id,
      academic_year_id: row.academic_year_id,
      programme_id: row.programme_id,
      level_id: row.level_id,
      class_group_id: row.class_group_id,
      ...(row.pathway_id === undefined ? {} : { pathway_id: row.pathway_id }),
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date ?? null,
      entry_reason: row.entry_reason,
      exit_reason: row.exit_reason ?? null,
      ...(row.fee_category_ids === undefined
        ? {}
        : { fee_category_ids: JSON.stringify(row.fee_category_ids) }),
      ...(row.sponsorship_id === undefined ? {} : { sponsorship_id: row.sponsorship_id }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.mapping) {
    await context.run(
      `INSERT INTO "${LEGACY_ID_MAP_TABLE}" (legacy_table, legacy_id, canonical_entity, canonical_id)
       VALUES (?, ?, ?, ?)`,
      [entry.legacyTable, entry.legacyId, entry.canonicalEntity, entry.canonicalId]
    );
  }

  for (const row of plan.unmappable) {
    await context.run(
      `INSERT INTO "${LEGACY_UNMAPPABLE_TABLE}" (legacy_table, legacy_id, canonical_entity, reason, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [row.legacyTable, row.legacyId, row.canonicalEntity, row.reason, row.detail ?? null]
    );
  }

  for (const issue of plan.issues) {
    await context.run(
      `INSERT INTO "${LEGACY_NOTES_TABLE}" (migration_version, severity, code, entity, legacy_table, legacy_id, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        context.version,
        issue.severity,
        issue.code,
        issue.entity,
        issue.legacyTable,
        issue.legacyId,
        issue.message,
      ]
    );
  }

  for (const assumption of plan.assumptions) {
    await context.run(
      `INSERT INTO "${LEGACY_NOTES_TABLE}" (migration_version, severity, code, entity, legacy_table, legacy_id, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [context.version, 'info', 'assumption', 'learner', 'students', '', assumption]
    );
  }

  for (const row of plan.created) {
    await context.run(
      `INSERT INTO "${CREATED_TABLE}" (migration_version, entity, id) VALUES (?, ?, ?)`,
      [context.version, row.entity, row.id]
    );
  }
}

async function assertCanonicalTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const table of Object.values(CANONICAL_TABLES)) {
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M3 writes the canonical tables (${missing.join(', ')}), but the database does not hold them; apply the canonical schema first`
    );
  }
}

/**
 * True when M1's report tables are there.
 *
 * M3 is a later migration: it appends to the id map, the unmappable rows and the notes M1
 * created. A database without them has not run M1, so the run is refused rather than writing a
 * second set of report tables under a different shape.
 */
async function assertReportTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const table of [LEGACY_ID_MAP_TABLE, LEGACY_UNMAPPABLE_TABLE, LEGACY_NOTES_TABLE]) {
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M3 appends to the report tables migration M1 created (${missing.join(', ')}); run migration M1 first`
    );
  }
}

/**
 * True when M2's class groups are there.
 *
 * A learner's class is the class group its `current_class_stream_id` became. A database with
 * no class group has not run M2, and migrating it would write every learner with no class at
 * all - the one thing the migration exists to prevent.
 */
async function assertClassGroupsMigrated(reader: SqlReader): Promise<void> {
  if (!(await tableExists(reader, 'class_group'))) {
    throw new Error(
      'Migration M3 places every learner in the class group migration M2 wrote, but the database holds no class_group table; run migration M2 first'
    );
  }
  const row = await reader.get<{ total: number }>(`SELECT COUNT(*) AS total FROM "class_group"`);
  if ((row?.total ?? 0) === 0) {
    throw new Error(
      'Migration M3 places every learner in the class group migration M2 wrote, but the database holds no class group; run migration M2 first'
    );
  }
}

/** The rows M3 owns: a second run would duplicate them, so the migration refuses a non-empty one. */
async function assertTargetsEmpty(reader: SqlReader): Promise<void> {
  for (const table of Object.values(CANONICAL_TABLES)) {
    const row = await reader.get<{ total: number }>(`SELECT COUNT(*) AS total FROM "${table}"`);
    const total = row?.total ?? 0;
    if (total > 0) {
      throw new Error(
        `Migration M3 writes the canonical table "${table}", but it already holds ${total} row(s); the canonical data is newer than the legacy data, so there is nothing to migrate`
      );
    }
  }
}

/**
 * Builds migration M3.
 *
 * The migration reads the legacy students, guardians and relationships and the class groups
 * migration M2 wrote, then writes the canonical learners, guardians, links, identifiers and
 * enrolments in the framework's transaction, so the rows and the ledger row commit together or
 * not at all. Its SQL is not declared: the ids are generated and the rows are written one by
 * one, so the migration states a checksum of its own instead.
 */
export function createLearnerMigration(options: LearnerMigrationOptions = {}): Migration {
  return {
    version: 3,
    name: 'migrate the learners, guardians and enrolments',
    checksum: 'm3-learners-v1',
    destructive: true,
    async up(context: MigrationContext) {
      await assertCanonicalTables(context);
      await assertReportTables(context);
      await assertClassGroupsMigrated(context);
      await assertTargetsEmpty(context);

      const source = await readPeoplePlanSource(context);
      const referenceTimestamp = (options.now?.() ?? new Date())
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');
      const plan = planPeopleMigration(source, { referenceTimestamp });

      // An error stops the migration before it writes: a learner without a class is data the
      // operator has to look at, not a row the migration invents a class for.
      const fatal = plan.issues.filter((issue) => issue.severity === 'error');
      if (fatal.length > 0) {
        throw new Error(
          `Migration M3 cannot map this database: ${fatal.map((issue) => issue.message).join('; ')}`
        );
      }
      if (plan.learners.length === 0) {
        throw new Error(
          'Migration M3 could not write a single learner: the legacy database holds no student the canonical model can take'
        );
      }

      await writePeoplePlan(context, plan);
      const verification = await verifyPeopleMigration(context, source);

      const issueFailures = verification.issues.filter((issue) => issue.severity === 'error');
      if (issueFailures.length > 0) {
        throw new Error(
          `Migration M3 wrote a mapping it cannot verify: ${issueFailures
            .map((issue) => issue.message)
            .join('; ')}`
        );
      }

      const failures: readonly PeopleCheck[] = verification.checks.filter(
        (entry) => !entry.ok && entry.severity === 'error'
      );
      if (failures.length > 0) {
        const detail = failures
          .slice(0, 5)
          .map(
            (entry) =>
              `${entry.entity} ${entry.legacyId || '(no id)'}: ${entry.check} was ${entry.actual}, expected ${entry.expected}`
          )
          .join('; ');
        throw new Error(
          `Migration M3 wrote ${failures.length} row(s) that do not match the legacy rows: ${detail}`
        );
      }
    },
    async down(context: MigrationContext) {
      // Everything the migration created is recorded, so the rollback removes exactly that and
      // never a row it found. The rows go in the order the foreign keys need.
      if (await tableExists(context, CREATED_TABLE)) {
        for (const entity of [
          'enrolment',
          'learner_guardian',
          'identifier',
          'guardian',
          'learner',
        ] as const) {
          await context.run(
            `DELETE FROM "${CANONICAL_TABLES[entity]}"
               WHERE id IN (SELECT id FROM "${CREATED_TABLE}"
                             WHERE migration_version = ? AND entity = ?)`,
            [context.version, entity]
          );
        }
        // The table and M2's rows stay: a rollback to version 2 must leave M2 able to undo
        // its own rows later.
        await context.run(`DELETE FROM "${CREATED_TABLE}" WHERE migration_version = ?`, [
          context.version,
        ]);
      }

      await context.exec(
        `DELETE FROM "${LEGACY_ID_MAP_TABLE}"
           WHERE (legacy_table = 'students' AND canonical_entity IN ('learner', 'learner_guardian', 'enrolment', 'identifier'))
              OR (legacy_table = 'student_guardian_relationships' AND canonical_entity = 'learner_guardian')
              OR (legacy_table = 'parents_guardians' AND canonical_entity IN ('guardian', 'identifier'))`
      );
      await context.exec(
        `DELETE FROM "${LEGACY_UNMAPPABLE_TABLE}"
           WHERE canonical_entity IN ('learner', 'guardian', 'learner_guardian', 'identifier', 'enrolment')
             AND legacy_table IN ('students', 'parents_guardians', 'student_guardian_relationships')`
      );
      await context.run(`DELETE FROM "${LEGACY_NOTES_TABLE}" WHERE migration_version = ?`, [
        context.version,
      ]);
    },
  };
}

/** Migration M3: the legacy students and guardians become canonical people and enrolments. */
export const migrateLearners: Migration = createLearnerMigration();
