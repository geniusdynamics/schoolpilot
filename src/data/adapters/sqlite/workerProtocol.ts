// ABOUTME: Message shapes between the adapter's main thread and its OPFS worker; requests are
// ABOUTME: applied in arrival order so a statement can never overtake the open before it.

import type { SqliteRow, SqliteRunResult, SqliteValue } from './driver';

export type SqliteWorkerRequest =
  | { id: number; type: 'open'; dbName: string }
  | { id: number; type: 'exec'; sql: string }
  | { id: number; type: 'all'; sql: string; params: SqliteValue[] }
  | { id: number; type: 'get'; sql: string; params: SqliteValue[] }
  | { id: number; type: 'run'; sql: string; params: SqliteValue[] }
  | { id: number; type: 'export' }
  | { id: number; type: 'import'; bytes: Uint8Array }
  /** Start-up recovery: overwrite a file without opening it, then release the pool. */
  | { id: number; type: 'replaceFile'; dbName: string; bytes: Uint8Array }
  | { id: number; type: 'close' };

export type SqliteWorkerRequestInput =
  | { type: 'open'; dbName: string }
  | { type: 'exec'; sql: string }
  | { type: 'all'; sql: string; params: SqliteValue[] }
  | { type: 'get'; sql: string; params: SqliteValue[] }
  | { type: 'run'; sql: string; params: SqliteValue[] }
  | { type: 'export' }
  | { type: 'import'; bytes: Uint8Array }
  | { type: 'close' };

export type SqliteWorkerResponse =
  | {
      id: number;
      ok: true;
      rows?: SqliteRow[];
      row?: SqliteRow | null;
      result?: SqliteRunResult;
      /** The database file image an `export` request asked for. */
      bytes?: Uint8Array;
    }
  | { id: number; ok: false; error: string };
