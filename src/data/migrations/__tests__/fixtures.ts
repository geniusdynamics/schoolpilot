// ABOUTME: Fixtures for the migration tests: a real SQLite database, sample migrations and
// ABOUTME: helpers that read the ledger back, so the tests assert on the database itself.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

import type { Migration, MigrationContext } from '../types';

export interface MigrationFixture {
  readonly adapter: SqliteAdapter;
  /** The path of the database file; `:memory:` for an in-memory database. */
  readonly filename: string;
  /** Removes the temporary directory of a file-backed database. */
  readonly cleanup: () => Promise<void>;
}

/** Opens a real in-memory SQLite database. */
export async function createFixtureAdapter(): Promise<MigrationFixture> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  return { adapter, filename: ':memory:', cleanup: async () => undefined };
}

/** Opens a real SQLite database in a temporary directory, so a second process can open it. */
export async function createFileFixtureAdapter(): Promise<MigrationFixture> {
  const directory = await mkdtemp(join(tmpdir(), 'schoolpilot-migration-'));
  const filename = join(directory, 'schoolpilot.sqlite');
  const adapter = createNodeSqliteAdapter({ filename });
  await adapter.open();
  return {
    adapter,
    filename,
    cleanup: async () => {
      await adapter.close().catch(() => undefined);
      await rm(directory, { recursive: true, force: true });
    },
  };
}

/** The statements that create a table with one row in it. */
export function tableStatements(table: string): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, label TEXT NOT NULL)`,
    `INSERT INTO ${table} (id, label) VALUES ('${table}-1', '${table} row')`,
  ];
}

/** A migration that creates a table and fills it with one row. */
export function createTableMigration(
  version: number,
  name: string,
  table: string,
  options: { destructive?: boolean } = {}
): Migration {
  return {
    version,
    name,
    destructive: options.destructive,
    statements: tableStatements(table),
    async down(context: MigrationContext) {
      await context.exec(`DROP TABLE IF EXISTS ${table}`);
    },
  };
}

/**
 * A migration that always throws before it changes anything.
 *
 * It states a checksum of its own: a migration that throws has no fixed SQL to declare.
 */
export function createFailingMigration(
  version: number,
  name: string,
  message = 'the migration failed'
): Migration {
  return {
    version,
    name,
    checksum: `failing-migration-${version}`,
    async up() {
      throw new Error(message);
    },
  };
}

/** A migration that applies cleanly and cannot be undone, because it declares no `down`. */
export function createIrreversibleMigration(
  version: number,
  name: string,
  table: string
): Migration {
  return {
    version,
    name,
    statements: [`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, label TEXT NOT NULL)`],
  };
}

/** The rows of a table, ordered by id. */
export async function readRows(
  adapter: SqliteAdapter,
  table: string
): Promise<ReadonlyArray<Record<string, unknown>>> {
  return adapter.all<Record<string, unknown>>(`SELECT * FROM ${table} ORDER BY id`);
}

/** The names of the tables the database holds. */
export async function readTableNames(adapter: SqliteAdapter): Promise<string[]> {
  const rows = await adapter.all<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
  );
  return rows.map((row) => row.name);
}
