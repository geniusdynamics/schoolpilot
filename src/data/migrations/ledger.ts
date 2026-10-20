// ABOUTME: The migration ledger: the `_migrations` table of applied migrations, the attempt
// ABOUTME: journal that survives an interrupted run, and the record of the backups taken.

import type { SqliteAdapter, SqliteTransaction } from '@/data/adapters/sqlite';

import type {
  AppliedMigration,
  MigrationAttempt,
  MigrationBackup,
  MigrationChecksumKind,
} from './types';

/** The table that records the migrations the database has applied. */
export const MIGRATIONS_TABLE = '_migrations';

/** The journal that records an attempt that did not finish. */
export const ATTEMPTS_TABLE = '_migration_attempts';

/** The table that records where the backups live. */
export const BACKUPS_TABLE = '_migration_backups';

const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  checksum_kind TEXT NOT NULL DEFAULT 'explicit',
  applied_at TEXT NOT NULL
)`;

const ATTEMPTS_DDL = `
CREATE TABLE IF NOT EXISTS ${ATTEMPTS_TABLE} (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  checksum_kind TEXT NOT NULL DEFAULT 'explicit',
  status TEXT NOT NULL,
  error TEXT,
  attempted_at TEXT NOT NULL
)`;

const BACKUPS_DDL = `
CREATE TABLE IF NOT EXISTS ${BACKUPS_TABLE} (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  migration_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TEXT NOT NULL,
  bytes INTEGER
)`;

interface ColumnRow {
  readonly name: string;
}

/** Creates the ledger tables. Idempotent, so it is safe on every run. */
export async function ensureLedgerTables(adapter: SqliteAdapter): Promise<void> {
  await adapter.exec(LEDGER_DDL);
  await adapter.exec(ATTEMPTS_DDL);
  await adapter.exec(BACKUPS_DDL);
  await ensureChecksumKindColumn(adapter, MIGRATIONS_TABLE);
  await ensureChecksumKindColumn(adapter, ATTEMPTS_TABLE);
}

/**
 * Adds the checksum kind to a ledger table that was written before the kind was recorded.
 *
 * The rows that are already there were recorded with the old default, a hash of the version
 * and the name, which is an explicit identity rather than a declared one.
 */
async function ensureChecksumKindColumn(
  adapter: SqliteAdapter,
  table: string
): Promise<void> {
  const columns = await adapter.all<ColumnRow>(`PRAGMA table_info(${table})`);
  if (columns.length === 0) return;
  if (columns.some((column) => column.name === 'checksum_kind')) return;
  await adapter.exec(
    `ALTER TABLE ${table} ADD COLUMN checksum_kind TEXT NOT NULL DEFAULT 'explicit'`
  );
}

interface AppliedRow {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly checksum_kind: string;
  readonly applied_at: string;
}

interface AttemptRow {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly checksum_kind: string;
  readonly status: string;
  readonly error: string | null;
  readonly attempted_at: string;
}

interface BackupRow {
  readonly id: string;
  readonly version: number;
  readonly migration_name: string;
  readonly kind: string;
  readonly location: string;
  readonly created_at: string;
  readonly bytes: number | null;
}

function checksumKindOf(value: string): MigrationChecksumKind {
  return value === 'declared' ? 'declared' : 'explicit';
}

/** The migrations the ledger records, in version order. */
export async function readApplied(adapter: SqliteAdapter): Promise<AppliedMigration[]> {
  const rows = await adapter.all<AppliedRow>(
    `SELECT version, name, checksum, checksum_kind, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY version`
  );
  return rows.map((row) => ({
    version: row.version,
    name: row.name,
    checksum: row.checksum,
    checksumKind: checksumKindOf(row.checksum_kind),
    appliedAt: row.applied_at,
  }));
}

/** Records a migration as applied. Runs inside the migration's own transaction. */
export async function recordApplied(
  tx: SqliteTransaction,
  migration: AppliedMigration
): Promise<void> {
  await tx.run(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, name, checksum, checksum_kind, applied_at) VALUES (?, ?, ?, ?, ?)`,
    [
      migration.version,
      migration.name,
      migration.checksum,
      migration.checksumKind,
      migration.appliedAt,
    ]
  );
}

/**
 * Records the stronger identity of a migration that was applied with an explicit checksum.
 *
 * The migration declared its SQL after it had shipped; the ledger follows, so the next run
 * compares the declared identity.
 */
export async function updateAppliedIdentity(
  adapter: SqliteAdapter,
  version: number,
  checksum: string,
  checksumKind: MigrationChecksumKind
): Promise<void> {
  await adapter.run(
    `UPDATE ${MIGRATIONS_TABLE} SET checksum = ?, checksum_kind = ? WHERE version = ?`,
    [checksum, checksumKind, version]
  );
}

/** Removes a migration from the ledger. Runs inside the rollback's own transaction. */
export async function removeApplied(
  tx: SqliteTransaction,
  version: number
): Promise<void> {
  await tx.run(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`, [version]);
}

/** The attempts that did not finish, in version order. */
export async function readAttempts(adapter: SqliteAdapter): Promise<MigrationAttempt[]> {
  const rows = await adapter.all<AttemptRow>(
    `SELECT version, name, checksum, checksum_kind, status, error, attempted_at FROM ${ATTEMPTS_TABLE} ORDER BY version`
  );
  return rows.map((row) => ({
    version: row.version,
    name: row.name,
    checksum: row.checksum,
    checksumKind: checksumKindOf(row.checksum_kind),
    status: row.status === 'failed' ? 'failed' : 'running',
    error: row.error ?? undefined,
    attemptedAt: row.attempted_at,
  }));
}

/**
 * Records an attempt.
 *
 * The attempt is committed before the migration body starts, so an interrupted run leaves a
 * trace: the version is not in the ledger, and the attempt says why.
 */
export async function recordAttempt(
  adapter: SqliteAdapter,
  attempt: MigrationAttempt
): Promise<void> {
  await adapter.run(
    `INSERT OR REPLACE INTO ${ATTEMPTS_TABLE} (version, name, checksum, checksum_kind, status, error, attempted_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      attempt.version,
      attempt.name,
      attempt.checksum,
      attempt.checksumKind,
      attempt.status,
      attempt.error ?? null,
      attempt.attemptedAt,
    ]
  );
}

/** Forgets an attempt: the migration is applied, or the attempt was abandoned. */
export async function clearAttempt(adapter: SqliteAdapter, version: number): Promise<void> {
  await adapter.run(`DELETE FROM ${ATTEMPTS_TABLE} WHERE version = ?`, [version]);
}

/** The backups the database holds, newest last. */
export async function readBackups(adapter: SqliteAdapter): Promise<MigrationBackup[]> {
  const rows = await adapter.all<BackupRow>(
    `SELECT id, version, migration_name, kind, location, created_at, bytes FROM ${BACKUPS_TABLE} ORDER BY created_at, id`
  );
  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    migrationName: row.migration_name,
    kind: row.kind === 'file' ? 'file' : 'dump',
    location: row.location,
    createdAt: row.created_at,
    bytes: row.bytes ?? undefined,
  }));
}

/** Records where a backup lives. */
export async function recordBackup(
  adapter: SqliteAdapter,
  backup: MigrationBackup
): Promise<void> {
  await adapter.run(
    `INSERT OR REPLACE INTO ${BACKUPS_TABLE} (id, version, migration_name, kind, location, created_at, bytes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      backup.id,
      backup.version,
      backup.migrationName,
      backup.kind,
      backup.location,
      backup.createdAt,
      backup.bytes ?? null,
    ]
  );
}

/** Forgets a backup that left the retention window. */
export async function removeBackup(adapter: SqliteAdapter, id: string): Promise<void> {
  await adapter.run(`DELETE FROM ${BACKUPS_TABLE} WHERE id = ?`, [id]);
}
