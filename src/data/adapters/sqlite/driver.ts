// ABOUTME: The SQLite driver port and public adapter surface shared by the browser and node
// ABOUTME: implementations, so repositories code against one statement contract.

import type { DatabaseSchema } from '@/utils/databaseAgnosticSchema';

/** Values SQLite can store in a column and return from a query. */
export type SqliteValue = string | number | bigint | null | Uint8Array;

/** Values a caller may bind; booleans are encoded as 1/0 at the adapter boundary. */
export type SqliteBindValue = SqliteValue | boolean;

/** A decoded result row keyed by column name. */
export type SqliteRow = Record<string, SqliteValue>;

export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

/**
 * The small surface a storage engine must provide. The shared core owns DDL application,
 * parameter normalisation, queuing, transactions, row decoding and error mapping; a driver
 * only executes statements and reports rows.
 */
export interface SqliteDriver {
  readonly name: 'node' | 'wasm';
  open(): Promise<void>;
  close(): Promise<void>;
  exec(sql: string): Promise<void>;
  all(sql: string, params: readonly SqliteValue[]): Promise<unknown[]>;
  get(sql: string, params: readonly SqliteValue[]): Promise<unknown>;
  run(sql: string, params: readonly SqliteValue[]): Promise<SqliteRunResult>;
}

/** Statement methods available inside a transaction callback. */
export interface SqliteTransaction {
  exec(sql: string): Promise<void>;
  all<T extends object = SqliteRow>(sql: string, params?: readonly SqliteBindValue[]): Promise<T[]>;
  get<T extends object = SqliteRow>(sql: string, params?: readonly SqliteBindValue[]): Promise<T | null>;
  run(sql: string, params?: readonly SqliteBindValue[]): Promise<SqliteRunResult>;
}

/**
 * The storage adapter repositories use. There is exactly one implementation; only the
 * driver beneath it changes between the browser worker and Node.
 */
export interface SqliteAdapter extends SqliteTransaction {
  readonly driverName: SqliteDriver['name'];
  readonly isOpen: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  /** Apply generated DDL in one transaction; safe to call repeatedly. */
  applySchema(schemas: readonly DatabaseSchema[]): Promise<void>;
  transaction<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T>;
}

/** True when a driver value is one of the column types SQLite can bind and return. */
export function isSqliteValue(value: unknown): value is SqliteValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    value instanceof Uint8Array
  );
}
