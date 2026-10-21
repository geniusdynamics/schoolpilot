// ABOUTME: Dedicated worker that owns the adapter's SQLite database on the OPFS SAH-pool VFS
// ABOUTME: and answers parameterised query/run requests, unlike the write-through provider worker.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

import type { SqliteRow, SqliteValue } from './driver';
import { runWasmStatement, toSqliteRows } from './wasmDatabase';
import type {
  SqliteWorkerRequest,
  SqliteWorkerResponse,
} from './workerProtocol';

/** Same persistent VFS the application's storage worker installs. */
export const ADAPTER_PERSISTENT_VFS = 'opfs-sahpool';

type Sqlite3Module = Awaited<ReturnType<typeof sqlite3InitModule>>;
type Sqlite3Database = InstanceType<Sqlite3Module['oo1']['DB']>;

interface WorkerScope {
  postMessage(message: SqliteWorkerResponse): void;
  onmessage: ((event: MessageEvent<SqliteWorkerRequest>) => void) | null;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

let sqlite3: Sqlite3Module | null = null;
let database: Sqlite3Database | null = null;
let queue: Promise<void> = Promise.resolve();

function rows(sql: string, params: readonly SqliteValue[]): SqliteRow[] {
  if (!database) throw new Error('Persistent database is not open');
  return toSqliteRows(
    database.exec({
      sql,
      bind: [...params],
      rowMode: 'object',
      returnValue: 'resultRows',
    })
  );
}

async function handle(request: SqliteWorkerRequest, post: (response: SqliteWorkerResponse) => void) {
  try {
    switch (request.type) {
      case 'open': {
        sqlite3 = sqlite3 ?? (await sqlite3InitModule({ print: console.log, printErr: console.error }));
        // A named pool directory, not the default one: the legacy data layer keeps its own
        // OPFS SAH pool open in its worker, and two pools cannot share the same files — the
        // second install fails to create its access handles ("another open Access Handle").
        await sqlite3.installOpfsSAHPoolVfs({ directory: '/schoolpilot-canonical' });
        database = new sqlite3.oo1.DB({
          filename: `file:/${request.dbName}.sqlite3?vfs=${ADAPTER_PERSISTENT_VFS}`,
          flags: 'c',
        });
        post({ id: request.id, ok: true });
        return;
      }
      case 'exec': {
        if (!database) throw new Error('Persistent database is not open');
        database.exec(request.sql);
        post({ id: request.id, ok: true });
        return;
      }
      case 'all': {
        post({ id: request.id, ok: true, rows: rows(request.sql, request.params) });
        return;
      }
      case 'get': {
        const [row] = rows(request.sql, request.params);
        post({ id: request.id, ok: true, row: row ?? null });
        return;
      }
      case 'run': {
        if (!database) throw new Error('Persistent database is not open');
        post({
          id: request.id,
          ok: true,
          result: runWasmStatement(database, request.sql, request.params),
        });
        return;
      }
      case 'close': {
        database?.close();
        database = null;
        post({ id: request.id, ok: true });
        return;
      }
    }
  } catch (error) {
    post({ id: request.id, ok: false, error: errorMessage(error) });
  }
}

// Attach only inside a real worker; importing this module elsewhere must be side-effect free.
if (typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined') {
  const scope = globalThis as unknown as WorkerScope;
  scope.onmessage = (event) => {
    const request = event.data;
    queue = queue.then(() => handle(request, (response) => scope.postMessage(response)));
  };
}
