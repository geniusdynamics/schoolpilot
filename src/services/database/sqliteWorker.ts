// ABOUTME: Dedicated Web Worker that owns the persistent SQLite database on the OPFS SAH-pool VFS.
// ABOUTME: Opens the file, returns a snapshot for the main-thread working copy, and applies every forwarded write.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// The driver module, not the adapter package index: the index would pull the canonical
// adapter's own worker into this one.
import { isSqliteImage } from '@/data/adapters/sqlite/driver';

/** Name of the persistent VFS registered by installOpfsSAHPoolVfs() (its default). */
export const PERSISTENT_VFS = 'opfs-sahpool';

export type StorageWorkerRequest =
  | { id: number; type: 'open'; dbName: string }
  | { id: number; type: 'exec'; sql: string; bind?: unknown }
  | { id: number; type: 'export' }
  | { id: number; type: 'import'; bytes: Uint8Array }
  /** Start-up recovery: overwrite the file without opening it, then release the pool. */
  | { id: number; type: 'replaceFile'; dbName: string; bytes: Uint8Array }
  | { id: number; type: 'close' };

export type StorageWorkerResponse =
  | { id: number; ok: true; bytes?: Uint8Array }
  | { id: number; ok: false; error: string };

type Post = (message: StorageWorkerResponse, transfer?: Transferable[]) => void;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Build the worker's message handler. Requests are applied strictly in arrival
 * order so a write can never overtake the open that precedes it.
 */
export function createSqliteWorkerHandler(loadSqlite: () => Promise<any>, post: Post) {
  let sqlite3: any = null;
  /** The SAH pool utility; a backup restore replaces the file through it. */
  let pool: any = null;
  let db: any = null;
  let dbName: string | null = null;
  let queue: Promise<void> = Promise.resolve();

  const open = (name: string) => new sqlite3.oo1.DB(`file:/${name}.sqlite3?vfs=${PERSISTENT_VFS}`, 'c');

  /**
   * Replace the database file with an image. The image is checked before the database is
   * closed, so a file that is not a database never touches it; the database is reopened
   * whatever the import does. The chunked import truncates the slot first (the plain one
   * writes over the old bytes without shortening the file); a failed write after that loses
   * the old file inside the pool, which the restore puts back from its snapshot.
   */
  const assertImage = (bytes: Uint8Array): void => {
    if (!isSqliteImage(bytes) || bytes.byteLength % 512 !== 0) {
      throw new Error('The image to import is not a SQLite database file');
    }
  };

  const importInto = async (name: string, bytes: Uint8Array): Promise<void> => {
    let delivered = false;
    await pool.importDb(`/${name}.sqlite3`, () => {
      if (delivered) return undefined;
      delivered = true;
      return bytes;
    });
  };

  const importImage = async (bytes: Uint8Array): Promise<void> => {
    if (!db || !pool || !dbName) throw new Error('Persistent database is not open');
    assertImage(bytes);
    const name = dbName;
    db.close();
    db = null;
    try {
      await importInto(name, bytes);
    } finally {
      db = open(name);
    }
  };

  /**
   * Overwrite a database file before anything has opened it - the recovery of an interrupted
   * restore, whose file may be half-written and must not be read. The pool is paused afterwards
   * either way, which releases its access handles at once, so the app's own storage worker can
   * install the pool as soon as this worker has answered.
   */
  const replaceFile = async (name: string, bytes: Uint8Array): Promise<void> => {
    if (db) throw new Error('A database is open in this worker; it cannot replace a file');
    assertImage(bytes);
    sqlite3 = sqlite3 ?? (await loadSqlite());
    pool = await sqlite3.installOpfsSAHPoolVfs({});
    try {
      await importInto(name, bytes);
    } finally {
      pool.pauseVfs();
    }
  };

  const handle = async (request: StorageWorkerRequest): Promise<void> => {
    try {
      switch (request.type) {
        case 'open': {
          sqlite3 = sqlite3 ?? (await loadSqlite());
          pool = await sqlite3.installOpfsSAHPoolVfs({});
          db = open(request.dbName);
          dbName = request.dbName;
          const bytes: Uint8Array = sqlite3.capi.sqlite3_js_db_export(db);
          post({ id: request.id, ok: true, bytes }, [bytes.buffer]);
          return;
        }
        case 'export': {
          if (!db) throw new Error('Persistent database is not open');
          const bytes: Uint8Array = sqlite3.capi.sqlite3_js_db_export(db);
          post({ id: request.id, ok: true, bytes }, [bytes.buffer]);
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
          if (!db) throw new Error('Persistent database is not open');
          db.exec(request.bind === undefined ? { sql: request.sql } : { sql: request.sql, bind: request.bind });
          post({ id: request.id, ok: true });
          return;
        }
        case 'close': {
          db?.close();
          db = null;
          dbName = null;
          post({ id: request.id, ok: true });
          return;
        }
      }
    } catch (error) {
      post({ id: request.id, ok: false, error: errorMessage(error) });
    }
  };

  return (request: StorageWorkerRequest): Promise<void> => {
    queue = queue.then(() => handle(request));
    return queue;
  };
}

// Attach to the worker scope only when actually running inside a Web Worker.
if (typeof (globalThis as any).WorkerGlobalScope !== 'undefined') {
  const scope = globalThis as unknown as {
    postMessage: (message: unknown, transfer?: Transferable[]) => void;
    onmessage: ((event: MessageEvent<StorageWorkerRequest>) => void) | null;
  };
  const handle = createSqliteWorkerHandler(
    () => sqlite3InitModule({ print: console.log, printErr: console.error }),
    (message, transfer) => scope.postMessage(message, transfer ?? [])
  );
  scope.onmessage = (event) => {
    void handle(event.data);
  };
}
