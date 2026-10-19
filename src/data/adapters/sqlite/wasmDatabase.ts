// ABOUTME: sqlite-wasm statement execution shared by the browser worker and embedders that
// ABOUTME: already own a wasm database handle (including the headless contract tests).

import type { SqliteDriver, SqliteRow, SqliteRunResult, SqliteValue } from './driver';

/** Values sqlite-wasm can return; binary variants are normalised to Uint8Array. */
type WasmValue = string | number | null | bigint | Uint8Array | Int8Array | ArrayBuffer;

type WasmRow = Record<string, WasmValue>;

/** The subset of sqlite-wasm's `oo1.DB` this package calls. */
export interface WasmDatabase {
  exec(sql: string): unknown;
  exec(options: { sql: string; bind?: SqliteValue[] }): unknown;
  exec(options: {
    sql: string;
    bind?: SqliteValue[];
    rowMode: 'object';
    returnValue: 'resultRows';
  }): WasmRow[];
  close(): void;
}

/** Convert sqlite-wasm's wider binary value types to the adapter's `Uint8Array` rows. */
export function toSqliteRows(rows: readonly WasmRow[]): SqliteRow[] {
  return rows.map((row) => {
    const normalized: SqliteRow = {};
    for (const [column, value] of Object.entries(row)) {
      if (value instanceof ArrayBuffer) {
        normalized[column] = new Uint8Array(value);
      } else if (value instanceof Int8Array) {
        normalized[column] = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      } else {
        normalized[column] = value;
      }
    }
    return normalized;
  });
}

/** Run a statement and report SQLite's change count and last rowid for it. */
export function runWasmStatement(
  database: WasmDatabase,
  sql: string,
  params: readonly SqliteValue[]
): SqliteRunResult {
  database.exec({ sql, bind: [...params] });
  const [row] = database.exec({
    sql: 'SELECT changes() AS changes, last_insert_rowid() AS last_insert_rowid',
    rowMode: 'object',
    returnValue: 'resultRows',
  });

  const changes = row?.changes;
  const lastInsertRowid = row?.last_insert_rowid;
  return {
    changes: typeof changes === 'number' ? changes : Number(changes ?? 0),
    lastInsertRowid:
      typeof lastInsertRowid === 'number' || typeof lastInsertRowid === 'bigint'
        ? lastInsertRowid
        : 0,
  };
}

/**
 * Wrap an already-open sqlite-wasm database in the driver port. Opening and closing stay
 * with the caller: the browser worker owns the connection, and tests open an in-memory one.
 */
export function createWasmDatabaseDriver(database: WasmDatabase): SqliteDriver {
  return {
    name: 'wasm',
    open: async () => undefined,
    close: async () => {
      database.close();
    },
    exec: async (sql) => {
      database.exec(sql);
    },
    all: async (sql, params) =>
      toSqliteRows(
        database.exec({
          sql,
          bind: [...params],
          rowMode: 'object',
          returnValue: 'resultRows',
        })
      ),
    get: async (sql, params) => {
      const [row] = database.exec({
        sql,
        bind: [...params],
        rowMode: 'object',
        returnValue: 'resultRows',
      });
      return row ? toSqliteRows([row])[0] : null;
    },
    run: async (sql, params) => runWasmStatement(database, sql, params),
  };
}
