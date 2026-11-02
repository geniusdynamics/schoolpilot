// ABOUTME: Dedicated worker that owns the adapter's SQLite database on the OPFS SAH-pool VFS
// ABOUTME: and answers parameterised query/run requests, unlike the write-through provider worker.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

import { isSqliteImage, type SqliteRow, type SqliteValue } from './driver';
import { runWasmStatement, toSqliteRows } from './wasmDatabase';
import type {
  SqliteWorkerRequest,
  SqliteWorkerResponse,
} from './workerProtocol';

/** Same persistent VFS the application's storage worker installs. */
export const ADAPTER_PERSISTENT_VFS = 'opfs-sahpool';

/**
 * A named pool directory, not the default one: the legacy data layer keeps its own OPFS SAH
 * pool open in its worker, and two pools cannot share the same files.
 */
const CANONICAL_POOL_DIRECTORY = '/schoolpilot-canonical';

type Sqlite3Module = Awaited<ReturnType<typeof sqlite3InitModule>>;
type Sqlite3Database = InstanceType<Sqlite3Module['oo1']['DB']>;

interface WorkerScope {
  postMessage(message: SqliteWorkerResponse): void;
  onmessage: ((event: MessageEvent<SqliteWorkerRequest>) => void) | null;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

type SahPoolUtil = Awaited<ReturnType<Sqlite3Module['installOpfsSAHPoolVfs']>>;

let sqlite3: Sqlite3Module | null = null;
let pool: SahPoolUtil | null = null;
let database: Sqlite3Database | null = null;
/** The open database's name inside the pool, so an import can replace that file and reopen it. */
let openName: string | null = null;
let queue: Promise<void> = Promise.resolve();

function poolPath(dbName: string): string {
  return `/${dbName}.sqlite3`;
}

function openPooled(module: Sqlite3Module, dbName: string): Sqlite3Database {
  return new module.oo1.DB({
    filename: `file:${poolPath(dbName)}?vfs=${ADAPTER_PERSISTENT_VFS}`,
    flags: 'c',
  });
}

/**
 * Replace the open database file with an image, through the pool's own import.
 *
 * The pool cannot overwrite a file a connection holds, so the database is closed first, and
 * the worker is never left without a database: whatever happens, the file is opened again.
 *
 * The image is checked before the close (the same checks `importDb` makes), so a file that is
 * not a database never touches the old one. The import itself goes through the chunked path,
 * which truncates the slot first - the plain path writes over the old bytes without shortening
 * the file. A failed write after that point loses the old file inside the pool; the caller
 * (the backup restore) holds a snapshot of it and imports that back.
 */
async function importImage(bytes: Uint8Array): Promise<void> {
  if (!sqlite3 || !pool || !database || !openName) throw new Error('Persistent database is not open');
  assertImage(bytes);
  const name = openName;
  database.close();
  database = null;
  try {
    await importInto(pool, name, bytes);
  } finally {
    database = openPooled(sqlite3, name);
  }
  // Reading the schema proves the imported file opens as a database.
  database.exec('SELECT count(*) FROM sqlite_master');
}

function assertImage(bytes: Uint8Array): void {
  if (!isSqliteImage(bytes) || bytes.byteLength % 512 !== 0) {
    throw new Error('The image to import is not a SQLite database file');
  }
}

async function importInto(target: SahPoolUtil, name: string, bytes: Uint8Array): Promise<void> {
  let delivered = false;
  await target.importDb(poolPath(name), () => {
    if (delivered) return undefined;
    delivered = true;
    return bytes;
  });
}

/**
 * Overwrite a database file before anything has opened it - the recovery of an interrupted
 * restore, whose file may be half-written and must not be read. The pool is paused afterwards
 * either way, which releases its access handles at once, so the adapter's own worker can install
 * the pool as soon as this one has answered. A worker that ran this is terminated, not reused.
 */
async function replaceFile(dbName: string, bytes: Uint8Array): Promise<void> {
  if (database) throw new Error('A database is open in this worker; it cannot replace a file');
  assertImage(bytes);
  sqlite3 = sqlite3 ?? (await sqlite3InitModule({ print: console.log, printErr: console.error }));
  const recoveryPool = await sqlite3.installOpfsSAHPoolVfs({ directory: CANONICAL_POOL_DIRECTORY });
  try {
    await importInto(recoveryPool, dbName, bytes);
  } finally {
    recoveryPool.pauseVfs();
  }
}

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
        // The pool handle is kept: a backup restore replaces the file through it.
        pool = await sqlite3.installOpfsSAHPoolVfs({ directory: CANONICAL_POOL_DIRECTORY });
        database = openPooled(sqlite3, request.dbName);
        openName = request.dbName;
        post({ id: request.id, ok: true });
        return;
      }
      case 'export': {
        if (!sqlite3 || !database) throw new Error('Persistent database is not open');
        post({ id: request.id, ok: true, bytes: sqlite3.capi.sqlite3_js_db_export(database) });
        return;
      }
      case 'import': {
        await importImage(request.bytes);
        post({ id: request.id, ok: true });
        return;
      }
      case 'replaceFile': {
        await replaceFile(request.dbName, request.bytes);
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
        openName = null;
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
