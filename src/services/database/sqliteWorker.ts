// ABOUTME: Dedicated Web Worker that owns the persistent SQLite database on the OPFS SAH-pool VFS.
// ABOUTME: Opens the file, returns a snapshot for the main-thread working copy, and applies every forwarded write.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

/** Name of the persistent VFS registered by installOpfsSAHPoolVfs() (its default). */
export const PERSISTENT_VFS = 'opfs-sahpool';

export type StorageWorkerRequest =
  | { id: number; type: 'open'; dbName: string }
  | { id: number; type: 'exec'; sql: string; bind?: unknown }
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
  let db: any = null;
  let queue: Promise<void> = Promise.resolve();

  const handle = async (request: StorageWorkerRequest): Promise<void> => {
    try {
      switch (request.type) {
        case 'open': {
          sqlite3 = sqlite3 ?? (await loadSqlite());
          await sqlite3.installOpfsSAHPoolVfs({});
          db = new sqlite3.oo1.DB(`file:/${request.dbName}.sqlite3?vfs=${PERSISTENT_VFS}`, 'c');
          const bytes: Uint8Array = sqlite3.capi.sqlite3_js_db_export(db);
          post({ id: request.id, ok: true, bytes }, [bytes.buffer]);
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
