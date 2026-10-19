// ABOUTME: Shared fixtures for the SQLite adapter contract suite: the two real drivers and
// ABOUTME: row-insertion helpers that encode JSON and boolean values the way SQLite stores them.

import { createRequire } from 'node:module';

import { databaseSchemaFor, storageFor, type EntityName } from '@/domain/schema';
import { validFixtures } from '@/domain/schema/__tests__/fixtures';

import {
  createNodeSqliteAdapter,
  createSqliteAdapter,
  createWasmDatabaseDriver,
  type SqliteAdapter,
  type SqliteBindValue,
  type WasmDatabase,
} from '..';

type Sqlite3Initializer = typeof import('@sqlite.org/sqlite-wasm').default;

const require = createRequire(import.meta.url);
const wasmModule = require('@sqlite.org/sqlite-wasm') as { default: Sqlite3Initializer };

export interface DriverCase {
  readonly name: string;
  readonly create: () => Promise<SqliteAdapter>;
}

async function opened(adapter: SqliteAdapter): Promise<SqliteAdapter> {
  await adapter.open();
  return adapter;
}

export const driverCases: DriverCase[] = [
  {
    name: 'better-sqlite3 (node)',
    create: () => opened(createNodeSqliteAdapter()),
  },
  {
    name: 'sqlite-wasm (in-process)',
    create: async () => {
      const sqlite3 = await wasmModule.default();
      const database = new sqlite3.oo1.DB(':memory:', 'c');
      return opened(createSqliteAdapter(createWasmDatabaseDriver(database as unknown as WasmDatabase)));
    },
  },
];

/** A syntactically valid UUIDv7-shaped id, distinct per suffix. */
export function testId(suffix: number): string {
  return `01930000-0000-7000-8000-${String(suffix).padStart(12, '0')}`;
}

/** A mutable copy of the canonical valid fixture for an entity. */
export function fixtureRow(entity: EntityName): Record<string, unknown> {
  return structuredClone(validFixtures[entity]) as unknown as Record<string, unknown>;
}

function encodeValue(value: unknown): SqliteBindValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Insert a fixture-shaped row using only columns the entity declares. Optional properties
 * that are absent stay NULL, which is what the partial unique indexes need to observe.
 */
export function insertRow(
  adapter: SqliteAdapter | { run(sql: string, params?: readonly SqliteBindValue[]): Promise<unknown> },
  entity: EntityName,
  row: Record<string, unknown>
): Promise<unknown> {
  const table = storageFor(entity).table;
  const properties = databaseSchemaFor(entity).properties;
  const columns = Object.keys(row).filter((column) => column in properties);

  const sql = `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${columns
    .map(() => '?')
    .join(', ')})`;
  return adapter.run(sql, columns.map((column) => encodeValue(row[column])));
}

/** Apply the DDL for the entities the contract suite exercises. */
export const CONTRACT_ENTITIES: readonly EntityName[] = [
  'learner',
  'enrolment',
  'invoice',
  'mark',
  'fee_schedule',
];
