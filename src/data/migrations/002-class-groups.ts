// ABOUTME: Migration M2: the legacy classes and streams become canonical levels and year-scoped
// ABOUTME: class groups, using the mapping the operator confirmed before the run.

import type { SqliteBindValue } from '@/data/adapters/sqlite';
import {
  campusSchema,
  classGroupSchema,
  levelSchema,
  programmeSchema,
  stageSchema,
} from '@/domain/schema';

import { tableExists, type SqlReader } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
} from './001-institution-calendar';
import {
  planClassGroupMigration,
  readClassGroupPlanSource,
  type ClassGroupMigrationPlan,
} from './002-class-groups-plan';
import { verifyClassGroupMigration } from './002-class-groups-verification';
import { readLevelMapping } from './002-level-mapping';
import type { Migration, MigrationContext } from './types';

export {
  readClassGroupMigrationReport,
  type ClassGroupCheck,
  type ClassGroupMigrationVerification,
} from './002-class-groups-verification';
export {
  LEVEL_MAPPING_TABLE,
  levelMappingKey,
  proposeAcademicYear,
  proposeLevelMapping,
  readLevelMapping,
  readLevelMappingSource,
  saveLevelMapping,
  type LevelDefinition,
  type LevelMappingEntry,
  type LevelMappingProposal,
  type LevelMappingSource,
  type MappingConfidence,
  type MappingYear,
} from './002-level-mapping';
export {
  planClassGroupMigration,
  readClassGroupPlanSource,
  type ClassGroupCounts,
  type ClassGroupMigrationPlan,
  type ClassGroupPlanSource,
  type LearnerResolution,
} from './002-class-groups-plan';

/** The table the migration uses to remember what it created, so `down` removes exactly that. */
export const CREATED_TABLE = '_legacy_migration_created';

/** The canonical tables migration M2 writes. */
export const CANONICAL_TABLES = {
  campus: 'campus',
  programme: 'programme',
  stage: 'stage',
  level: 'level',
  class_group: 'class_group',
  academic_year: 'academic_year',
  calendar: 'calendar',
  institution: 'institution',
} as const;

const CREATED_DDL = `CREATE TABLE IF NOT EXISTS "${CREATED_TABLE}" (
   migration_version INTEGER NOT NULL,
   entity TEXT NOT NULL,
   id TEXT NOT NULL,
   PRIMARY KEY (migration_version, entity, id)
 )`;

/** The options the migration takes. */
export interface ClassGroupMigrationOptions {
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
export async function writeClassGroupPlan(
  context: MigrationContext,
  plan: ClassGroupMigrationPlan
): Promise<void> {
  await context.exec(CREATED_DDL);

  if (plan.campusCreated !== null) {
    const row = campusSchema.parse(plan.campusCreated);
    await insertRow(context, 'campus', {
      id: row.id,
      institution_id: row.institution_id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      is_main: row.is_main ? 1 : 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  if (plan.programmeCreated !== null) {
    const row = programmeSchema.parse(plan.programmeCreated);
    await insertRow(context, 'programme', {
      id: row.id,
      institution_id: row.institution_id,
      curriculum_pack_code: row.curriculum_pack_code,
      pack_version: row.pack_version,
      name: row.name,
      calendar_id: row.calendar_id,
      status: row.status,
      ...(row.overrides === undefined ? {} : { overrides: JSON.stringify(row.overrides) }),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  for (const stage of plan.stagesCreated) {
    const row = stageSchema.parse(stage);
    await insertRow(context, 'stage', {
      id: row.id,
      institution_id: row.institution_id,
      programme_id: row.programme_id,
      code: row.code,
      name: row.name,
      sequence: row.sequence,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  for (const level of plan.levels) {
    const row = levelSchema.parse(level);
    await insertRow(context, 'level', {
      id: row.id,
      institution_id: row.institution_id,
      stage_id: row.stage_id,
      code: row.code,
      name: row.name,
      ordinal: row.ordinal,
      ...(row.typical_age === undefined ? {} : { typical_age: row.typical_age }),
      ...(row.next_level_id === undefined ? {} : { next_level_id: row.next_level_id }),
      is_terminal: row.is_terminal ? 1 : 0,
      ...(row.national_assessment_code === undefined
        ? {}
        : { national_assessment_code: row.national_assessment_code }),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  for (const classGroup of plan.classGroups) {
    const row = classGroupSchema.parse(classGroup);
    await insertRow(context, 'class_group', {
      id: row.id,
      institution_id: row.institution_id,
      campus_id: row.campus_id,
      academic_year_id: row.academic_year_id,
      programme_id: row.programme_id,
      level_id: row.level_id,
      name: row.name,
      ...(row.capacity === undefined ? {} : { capacity: row.capacity }),
      ...(row.room === undefined ? {} : { room: row.room }),
      homeroom_teacher_ids: JSON.stringify(row.homeroom_teacher_ids),
      created_at: row.created_at,
      updated_at: row.updated_at,
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
      [context.version, 'info', 'assumption', 'class_group', 'classes', '', assumption]
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
      `Migration M2 writes the canonical tables (${missing.join(', ')}), but the database does not hold them; apply the canonical schema first`
    );
  }
}

/**
 * True when M1's report tables are there.
 *
 * M2 is a later migration: it appends to the id map, the unmappable rows and the notes M1
 * created. A database without them has not run M1, so the run is refused rather than writing
 * a second set of report tables under a different shape.
 */
async function assertReportTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const table of [LEGACY_ID_MAP_TABLE, LEGACY_UNMAPPABLE_TABLE, LEGACY_NOTES_TABLE]) {
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M2 appends to the report tables migration M1 created (${missing.join(', ')}); run migration M1 first`
    );
  }
}

/** The rows M2 owns: a second run would duplicate them, so the migration refuses a non-empty one. */
async function assertTargetsEmpty(reader: SqlReader): Promise<void> {
  for (const table of ['level', 'class_group'] as const) {
    const row = await reader.get<{ total: number }>(`SELECT COUNT(*) AS total FROM "${table}"`);
    const total = row?.total ?? 0;
    if (total > 0) {
      throw new Error(
        `Migration M2 writes the canonical table "${table}", but it already holds ${total} row(s); the canonical data is newer than the legacy data, so there is nothing to migrate`
      );
    }
  }
}

/**
 * Builds migration M2.
 *
 * The migration reads the legacy classes and streams and the mapping the operator confirmed,
 * then writes the levels and the year-scoped class groups in the framework's transaction, so
 * the rows and the ledger row commit together or not at all. Its SQL is not declared: the
 * rows are generated from the confirmed mapping, so the migration states a checksum of its
 * own instead.
 */
export function createClassGroupMigration(
  options: ClassGroupMigrationOptions = {}
): Migration {
  return {
    version: 2,
    name: 'migrate the classes and streams into levels and class groups',
    checksum: 'm2-class-groups-v1',
    destructive: true,
    async up(context: MigrationContext) {
      await assertCanonicalTables(context);
      await assertReportTables(context);
      await assertTargetsEmpty(context);

      const decisions = await readLevelMapping(context);
      if (decisions.length === 0) {
        throw new Error(
          'Migration M2 needs the confirmed level mapping: run the level mapping step before the migration, so the operator decides which level each class becomes'
        );
      }

      const source = await readClassGroupPlanSource(context);
      const referenceTimestamp = (options.now?.() ?? new Date())
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');
      const plan = planClassGroupMigration(source, decisions, { referenceTimestamp });

      // A decision the operator did not make, or a class the mapping does not cover, stops the
      // migration before it writes: the operator confirms the mapping, not the migration.
      const fatal = plan.issues.filter((issue) => issue.severity === 'error');
      if (fatal.length > 0) {
        throw new Error(
          `Migration M2 cannot map this database: ${fatal.map((issue) => issue.message).join('; ')}`
        );
      }
      if (plan.classGroups.length === 0) {
        throw new Error(
          'Migration M2 could not map a single class group: the legacy database holds no class the confirmed mapping covers'
        );
      }

      await writeClassGroupPlan(context, plan);
      const verification = await verifyClassGroupMigration(context, source.mapping, decisions);

      const issueFailures = verification.issues.filter((issue) => issue.severity === 'error');
      if (issueFailures.length > 0) {
        throw new Error(
          `Migration M2 wrote a mapping it cannot verify: ${issueFailures
            .map((issue) => issue.message)
            .join('; ')}`
        );
      }

      const failures = verification.checks.filter(
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
          `Migration M2 wrote ${failures.length} row(s) that do not match the legacy classes: ${detail}`
        );
      }
    },
    async down(context: MigrationContext) {
      // Everything the migration created is recorded, so the rollback removes exactly that and
      // never a row it found. The rows go in the order the foreign keys need.
      if (await tableExists(context, CREATED_TABLE)) {
        for (const entity of ['class_group', 'level', 'stage', 'programme', 'campus'] as const) {
          await context.run(
            `DELETE FROM "${CANONICAL_TABLES[entity]}"
               WHERE id IN (SELECT id FROM "${CREATED_TABLE}"
                             WHERE migration_version = ? AND entity = ?)`,
            [context.version, entity]
          );
        }
        await context.exec(`DROP TABLE IF EXISTS "${CREATED_TABLE}"`);
      } else {
        // A database written before the created-rows table existed can still be rolled back
        // for the rows the id map names. The scaffolding has no record, so it stays.
        for (const entity of ['class_group', 'level'] as const) {
          await context.exec(
            `DELETE FROM "${CANONICAL_TABLES[entity]}"
               WHERE id IN (SELECT canonical_id FROM "${LEGACY_ID_MAP_TABLE}"
                             WHERE canonical_entity = '${entity}')`
          );
        }
      }

      await context.exec(
        `DELETE FROM "${LEGACY_ID_MAP_TABLE}"
           WHERE (legacy_table = 'classes' AND canonical_entity IN ('level', 'class_group'))
              OR (legacy_table = 'class_streams' AND canonical_entity = 'class_group')`
      );
      await context.exec(
        `DELETE FROM "${LEGACY_UNMAPPABLE_TABLE}"
           WHERE (legacy_table IN ('classes', 'class_streams')
                  AND canonical_entity IN ('level', 'class_group'))
              OR (legacy_table = 'students' AND canonical_entity = 'class_group')`
      );
      await context.run(
        `DELETE FROM "${LEGACY_NOTES_TABLE}" WHERE migration_version = ?`,
        [context.version]
      );
    },
  };
}

/** Migration M2: the legacy classes and streams become levels and class groups. */
export const migrateClassGroups: Migration = createClassGroupMigration();
