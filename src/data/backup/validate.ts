// ABOUTME: Validates a database image from a backup in a throwaway in-memory database, before
// ABOUTME: anything the app stores is touched, and reports what the image holds for the manifest.

import { isSqliteImage, type SqliteAdapter } from '@/data/adapters/sqlite';
import { storageFor, type EntityName } from '@/domain/schema';
import { KNOWN_MIGRATION_VERSIONS, MIGRATIONS_TABLE } from '@/data/migrations';

/** Which of the app's two SQLite files an image is. */
export type BackupDatabaseRole = 'canonical' | 'legacy';

export type BackupValidationCode =
  | 'not_sqlite'
  | 'integrity'
  | 'missing_tables'
  | 'newer_schema'
  | 'unknown_migration';

/** The image must not be restored; the message is written for the person restoring. */
export class BackupValidationError extends Error {
  constructor(
    readonly code: BackupValidationCode,
    message: string
  ) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

/** What an image holds, for the manifest and the restore confirmation. */
export interface DatabaseImageReport {
  readonly role: BackupDatabaseRole;
  /** The versions its migration ledger records, ascending; empty when it has no ledger. */
  readonly migrations: number[];
  /** Row counts of a handful of tables a person recognises, for the tables the image has. */
  readonly rowCounts: Record<string, number>;
  /** The school's name, read from the canonical institution table. */
  readonly institutionName: string | null;
}

/**
 * Tables an image must have to be the file it claims to be. Only tables every build has written
 * since the format existed: an older backup lacks newer tables, and the app creates those itself
 * when it opens the restored database.
 */
const CANONICAL_REQUIRED: readonly EntityName[] = ['institution', 'learner'];
const LEGACY_REQUIRED: readonly string[] = ['users'];

const CANONICAL_COUNTED: readonly EntityName[] = ['institution', 'learner', 'enrolment', 'invoice', 'mark'];
const LEGACY_COUNTED: readonly string[] = ['users', 'students', 'staff'];

const LATEST_KNOWN_VERSION = Math.max(...KNOWN_MIGRATION_VERSIONS);

const ROLE_LABEL: Record<BackupDatabaseRole, string> = {
  canonical: 'school database',
  legacy: 'legacy records database',
};

const quoted = (table: string) => `"${table.replace(/"/g, '""')}"`;

async function tableNames(adapter: SqliteAdapter): Promise<Set<string>> {
  const rows = await adapter.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  return new Set(rows.map((row) => row.name));
}

async function checkIntegrity(adapter: SqliteAdapter, role: BackupDatabaseRole): Promise<void> {
  const rows = await adapter.all<{ integrity_check: string }>('PRAGMA integrity_check');
  const problems = rows.map((row) => row.integrity_check).filter((result) => result !== 'ok');
  if (rows.length === 0 || problems.length > 0) {
    throw new BackupValidationError(
      'integrity',
      `The ${ROLE_LABEL[role]} in this backup is damaged: ${problems.slice(0, 3).join('; ') || 'no integrity result'}`
    );
  }
}

/**
 * Refuse a ledger this build cannot run against.
 *
 * The migrations runner refuses a version it does not know when the app opens the database; by
 * then the old data is already replaced, so the same rule is applied here, before anything is.
 */
function checkMigrations(versions: readonly number[], role: BackupDatabaseRole): void {
  const unknown = versions.filter((version) => !KNOWN_MIGRATION_VERSIONS.includes(version));
  if (unknown.length === 0) return;
  const newer = unknown.filter((version) => version > LATEST_KNOWN_VERSION);
  if (newer.length > 0) {
    throw new BackupValidationError(
      'newer_schema',
      `The ${ROLE_LABEL[role]} in this backup was written by a newer version of SchoolPilot (schema version ${Math.max(...newer)}; this version knows up to ${LATEST_KNOWN_VERSION}). Update SchoolPilot, then restore it.`
    );
  }
  throw new BackupValidationError(
    'unknown_migration',
    `The ${ROLE_LABEL[role]} in this backup records migration(s) ${unknown.join(', ')}, which this version of SchoolPilot does not know.`
  );
}

async function countRows(
  adapter: SqliteAdapter,
  tables: Set<string>,
  counted: readonly { key: string; table: string }[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const { key, table } of counted) {
    if (!tables.has(table)) continue;
    const row = await adapter.get<{ total: number }>(`SELECT count(*) AS total FROM ${quoted(table)}`);
    counts[key] = Number(row?.total ?? 0);
  }
  return counts;
}

async function inspectOpen(adapter: SqliteAdapter, role: BackupDatabaseRole): Promise<DatabaseImageReport> {
  await checkIntegrity(adapter, role);
  const tables = await tableNames(adapter);

  const required =
    role === 'canonical' ? CANONICAL_REQUIRED.map((entity) => storageFor(entity).table) : LEGACY_REQUIRED;
  const missing = required.filter((table) => !tables.has(table));
  if (missing.length > 0) {
    throw new BackupValidationError(
      'missing_tables',
      `This file is not a SchoolPilot ${ROLE_LABEL[role]}: it has no ${missing.join(', ')} table.`
    );
  }

  const migrations = tables.has(MIGRATIONS_TABLE)
    ? (await adapter.all<{ version: number }>(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`)).map(
        (row) => Number(row.version)
      )
    : [];
  checkMigrations(migrations, role);

  const counted =
    role === 'canonical'
      ? CANONICAL_COUNTED.map((entity) => ({ key: entity, table: storageFor(entity).table }))
      : LEGACY_COUNTED.map((table) => ({ key: table, table }));
  const rowCounts = await countRows(adapter, tables, counted);

  let institutionName: string | null = null;
  if (role === 'canonical') {
    const row = await adapter.get<{ name: unknown }>(
      `SELECT name FROM ${quoted(storageFor('institution').table)} ORDER BY rowid LIMIT 1`
    );
    institutionName = typeof row?.name === 'string' ? row.name : null;
  }

  return { role, migrations, rowCounts, institutionName };
}

/**
 * Load an image into a fresh in-memory database and check it is a database this build can open.
 *
 * `openEmpty` hands back an open, empty, in-memory adapter (better-sqlite3 in node, sqlite-wasm
 * on the page's main thread in the browser); the stored databases are never involved.
 */
export async function inspectDatabaseImage(
  bytes: Uint8Array,
  role: BackupDatabaseRole,
  openEmpty: () => Promise<SqliteAdapter>
): Promise<DatabaseImageReport> {
  if (!isSqliteImage(bytes)) {
    throw new BackupValidationError(
      'not_sqlite',
      `The ${ROLE_LABEL[role]} in this backup is not a SQLite database file.`
    );
  }
  const adapter = await openEmpty();
  try {
    try {
      await adapter.importDatabase(bytes);
    } catch (error) {
      throw new BackupValidationError(
        'not_sqlite',
        `The ${ROLE_LABEL[role]} in this backup does not open as a database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return await inspectOpen(adapter, role);
  } catch (error) {
    // SQLite reports a damaged page on the first read that touches it, not only in integrity_check.
    if (error instanceof BackupValidationError) throw error;
    throw new BackupValidationError(
      'integrity',
      `The ${ROLE_LABEL[role]} in this backup could not be read: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await adapter.close().catch(() => undefined);
  }
}
