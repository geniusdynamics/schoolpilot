// ABOUTME: Applies the module schema migrations at startup, rolls them back, and reports the
// ABOUTME: schema version a diagnostics screen can read, all over the shared migration ledger.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { MigrationError } from './errors';
import { MIGRATIONS_TABLE, readApplied } from './ledger';
import { createMigrationRunner, type MigrationRunner } from './runner';
import {
  KNOWN_MIGRATION_VERSIONS,
  SCHEMA_MIGRATIONS,
  schemaMigrationFor,
} from './schemaMigrations';
import type {
  AppliedMigration,
  BackupPolicy,
  Migration,
  MigrationBackupStrategy,
  MigrationDescriptor,
  MigrationEvent,
  MigrationRollbackResult,
} from './types';

/** How a schema runner is built. Everything is optional: startup passes nothing. */
export interface SchemaMigrationOptions {
  /** The migrations to apply. The whole registry by default. */
  readonly migrations?: readonly Migration[];
  /** How the database is exported before a destructive migration or rollback. */
  readonly backup?: MigrationBackupStrategy;
  /** When a backup is taken. Defaults to `destructive`, the framework's default. */
  readonly backupPolicy?: BackupPolicy;
  /** Called for every progress event. */
  readonly onEvent?: (event: MigrationEvent) => void;
  /** The clock. Injectable so a test can pin the timestamps. */
  readonly now?: () => Date;
}

/** A schema migration the ledger records. */
export interface AppliedSchemaMigration extends AppliedMigration {
  /** The module the migration creates. */
  readonly module: string;
}

/** Where the module schemas of a database stand. */
export interface SchemaVersion {
  /** The highest schema version the ledger records; 0 when none has been applied. */
  readonly current: number;
  /** The highest schema version this build knows; 0 when it knows none. */
  readonly latest: number;
  /** True when every schema migration this build knows has been applied. */
  readonly complete: boolean;
  /** The applied schema migrations, in version order. */
  readonly applied: readonly AppliedSchemaMigration[];
  /** The schema migrations still to apply, in version order. */
  readonly pending: readonly MigrationDescriptor[];
}

/** The outcome of applying the module schemas at startup. */
export interface SchemaApplyResult {
  /** `completed` when the run applied something, `noop` when there was nothing to do. */
  readonly status: 'completed' | 'noop';
  /** The migrations this run applied. */
  readonly applied: readonly AppliedMigration[];
  /** The migrations the ledger already recorded. */
  readonly skipped: readonly AppliedMigration[];
  /** The highest schema version the database is at afterwards. */
  readonly version: number;
}

function schemaVersionOf(applied: readonly AppliedMigration[]): number {
  return applied.reduce(
    (highest, entry) => (schemaMigrationFor(entry.version) ? Math.max(highest, entry.version) : highest),
    0
  );
}

/**
 * Builds the runner the startup path uses.
 *
 * The runner is given the whole known catalog, not only the migrations it applies: the ledger
 * is shared with the legacy data migrations, and a version from the other band must not be
 * read as a database written by a newer build.
 */
export function createSchemaMigrationRunner(
  adapter: SqliteAdapter,
  options: SchemaMigrationOptions = {}
): MigrationRunner {
  return createMigrationRunner({
    adapter,
    migrations: options.migrations ?? SCHEMA_MIGRATIONS,
    knownVersions: KNOWN_MIGRATION_VERSIONS,
    backup: options.backup,
    backupPolicy: options.backupPolicy,
    onEvent: options.onEvent,
    now: options.now,
  });
}

/**
 * Applies every module schema the database does not have yet.
 *
 * The app calls this while it opens the canonical database, before any page can read or write
 * one of those tables. It throws when a migration fails: the failed migration is rolled back
 * with its ledger row, so the database is left at the position it had before that migration,
 * and the startup path is what makes the failure loud.
 */
export async function applySchemaMigrations(
  adapter: SqliteAdapter,
  options: SchemaMigrationOptions = {}
): Promise<SchemaApplyResult> {
  const runner = createSchemaMigrationRunner(adapter, options);
  const result = await runner.run();

  if (result.status === 'failed') {
    const failed = result.failed;
    throw new MigrationError(
      failed
        ? `The module schema did not apply: migration ${failed.version} (${failed.name}) failed: ${failed.error}`
        : 'The module schema did not apply, and the migration run did not name the migration that failed',
      {
        code: 'migration_failed',
        version: failed?.version,
        migrationName: failed?.name,
      }
    );
  }

  const skipped = result.skipped;
  const applied = result.status === 'noop' ? [] : result.applied;
  const recorded = [...skipped, ...applied];
  return {
    status: result.status === 'noop' ? 'noop' : 'completed',
    applied,
    skipped,
    version: schemaVersionOf(recorded),
  };
}

/**
 * Undoes the module schema migrations, newest first.
 *
 * `to` is a schema version to stop above, and defaults to `0`: every module table is dropped,
 * including the triggers and indexes it brought with it. Migrations of the other band are not
 * touched - a data migration the ledger records stays applied.
 */
export async function rollbackSchemaMigrations(
  adapter: SqliteAdapter,
  options: SchemaMigrationOptions & { readonly to?: number } = {}
): Promise<MigrationRollbackResult> {
  const runner = createSchemaMigrationRunner(adapter, options);
  return runner.rollbackTo(options.to ?? 0);
}

/** True when the migration ledger exists. A read must not create it. */
async function ledgerExists(adapter: SqliteAdapter): Promise<boolean> {
  const rows = await adapter.all<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [MIGRATIONS_TABLE]
  );
  return rows.length > 0;
}

/**
 * Reads where the module schemas of a database stand.
 *
 * This is the surface a diagnostics screen reads: the applied schema migrations in order, the
 * version the database is at, and what is still to apply. It only reads - a database that has
 * never opened the migration framework reports version 0 rather than gaining a ledger table
 * from a screen that asked a question.
 */
export async function readSchemaVersion(adapter: SqliteAdapter): Promise<SchemaVersion> {
  const applied = (await ledgerExists(adapter)) ? await readApplied(adapter) : [];
  const schemaApplied: AppliedSchemaMigration[] = [];
  for (const entry of applied) {
    const migration = schemaMigrationFor(entry.version);
    if (migration) schemaApplied.push({ ...entry, module: migration.module });
  }

  const appliedVersions = new Set(schemaApplied.map((entry) => entry.version));
  const latest = SCHEMA_MIGRATIONS.reduce(
    (highest, migration) => Math.max(highest, migration.version),
    0
  );
  return {
    current: schemaVersionOf(schemaApplied),
    latest,
    complete: SCHEMA_MIGRATIONS.every((migration) => appliedVersions.has(migration.version)),
    applied: schemaApplied,
    pending: SCHEMA_MIGRATIONS.filter((migration) => !appliedVersions.has(migration.version)).map(
      (migration) => ({ version: migration.version, name: migration.name })
    ),
  };
}
