// ABOUTME: The registry of module schema migrations: the three module schemas turned into numbered
// ABOUTME: migrations that declare the module's own DDL, so the tables have one source of truth.

import { LEDGER_DDL } from '@/domain/finance/ledger/store';
import { RECONCILIATION_DDL } from '@/domain/finance/reconciliation/store';
import { SEQUENCE_DDL } from '@/domain/sequences/store';

import { dropStatementsFor, schemaObjectsOf, type SchemaObject } from './schemaDdl';
import type { Migration } from './types';

/**
 * The first version a schema migration may take.
 *
 * The legacy data migrations (P1 C01-C05) own 1-99, the module schemas own 100-199. A version
 * is an identity in one shared ledger, so the two bands must never overlap: a data migration
 * and a schema migration that shared a version would be the same row in `_migrations`.
 */
export const SCHEMA_MIGRATION_FLOOR = 100;

/**
 * The versions the legacy data migrations use.
 *
 * A schema runner does not run them, but it has to know they exist: the ledger is shared, and
 * the framework refuses a version it has never heard of as a database written by a newer build.
 * The migration suite holds this list to the exported migrations themselves, so it cannot drift.
 */
export const LEGACY_DATA_MIGRATION_VERSIONS: readonly number[] = [1, 2, 3, 4, 5];

/** A migration that creates a module's tables, as the module declares them. */
export interface ModuleSchemaMigration extends Migration {
  /** The module the tables belong to. A diagnostics screen shows it. */
  readonly module: string;
  /** The objects the migration creates, read from the DDL it applies. */
  readonly objects: readonly SchemaObject[];
}

interface ModuleSchemaSpec {
  readonly version: number;
  readonly module: string;
  readonly name: string;
  /** The module's own DDL constant. Never a copy of it. */
  readonly ddl: readonly string[];
}

/**
 * Builds a schema migration out of a module's DDL.
 *
 * The `up` is the module's declared DDL, unchanged, so the migration and `ensureSchema` can
 * never disagree. The `down` is derived from the same text: the objects read out of the CREATE
 * statements, dropped in reverse.
 *
 * The migration is marked `destructive` although its `up` only creates: the framework uses the
 * flag for both directions, and the `down` drops the tables together with whatever they hold.
 * A caller that rolls back a populated database therefore gets the backup the framework takes
 * before a destructive rollback, when it gave the runner a backup strategy.
 */
export function moduleSchemaMigration(spec: ModuleSchemaSpec): ModuleSchemaMigration {
  const objects = schemaObjectsOf(spec.ddl);
  return {
    version: spec.version,
    module: spec.module,
    name: spec.name,
    objects,
    statements: [...spec.ddl],
    destructive: true,
    async down(context) {
      for (const statement of dropStatementsFor(spec.ddl)) {
        await context.exec(statement);
      }
    },
  };
}

/** The sequences module: the counter, the issued-number ledger and the offline device blocks. */
export const sequencesSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 100,
  module: 'sequences',
  name: 'the sequence store: counters, issued numbers and device blocks',
  ddl: SEQUENCE_DDL,
});

/** The ledger module: journal entries, their lines, the periods and the immutability. */
export const ledgerSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 101,
  module: 'ledger',
  name: 'the ledger: journal entries, lines, periods, their indexes and immutability triggers',
  ddl: LEDGER_DDL,
});

/** The reconciliation module: imported statements, their lines and the match history. */
export const reconciliationSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 102,
  module: 'reconciliation',
  name: 'reconciliation: statements, their lines, the matches and the immutable-match triggers',
  ddl: RECONCILIATION_DDL,
});

/**
 * The module schema migrations this build applies at startup, in version order.
 *
 * Adding a module table is adding its DDL to this list - not a change to the runner, the
 * startup path or the ledger.
 */
export const SCHEMA_MIGRATIONS: readonly ModuleSchemaMigration[] = [
  sequencesSchemaMigration,
  ledgerSchemaMigration,
  reconciliationSchemaMigration,
];

/** The versions of the schema migrations, in order. */
export const SCHEMA_MIGRATION_VERSIONS: readonly number[] = SCHEMA_MIGRATIONS.map(
  (migration) => migration.version
);

/**
 * Every version this build knows, in either band.
 *
 * The startup runner applies only the schema migrations, but it is given this list so a ledger
 * row written by a data migration is not mistaken for one written by a newer build.
 */
export const KNOWN_MIGRATION_VERSIONS: readonly number[] = [
  ...LEGACY_DATA_MIGRATION_VERSIONS,
  ...SCHEMA_MIGRATION_VERSIONS,
];

/** The schema migration that owns a version, if this build has one. */
export function schemaMigrationFor(version: number): ModuleSchemaMigration | undefined {
  return SCHEMA_MIGRATIONS.find((migration) => migration.version === version);
}
