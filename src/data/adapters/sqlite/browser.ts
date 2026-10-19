// ABOUTME: Browser SQLite driver: a main-thread client for the adapter's OPFS worker, plus the
// ABOUTME: factory applications call to get a persistent SQLite adapter.

import { createSqliteAdapter, type SqliteAdapterOptions } from './core';
import type {
  SqliteAdapter,
  SqliteDriver,
  SqliteRunResult,
  SqliteValue,
} from './driver';
import { SqliteAdapterError } from './errors';
import type {
  SqliteWorkerRequest,
  SqliteWorkerRequestInput,
  SqliteWorkerResponse,
} from './workerProtocol';

/** How long the worker may take to open the database or answer one statement. */
export const WASM_REQUEST_TIMEOUT_MS = 30000;

export interface WasmSqliteAdapterOptions extends SqliteAdapterOptions {
  /** Database file name inside the OPFS SAH pool (without `.sqlite3`). */
  readonly dbName?: string;
}

type SqliteWorkerSuccess = Extract<SqliteWorkerResponse, { ok: true }>;

interface PendingRequest {
  resolve: (response: SqliteWorkerSuccess) => void;
  reject: (error: Error) => void;
}

/** Main-thread half of the adapter worker protocol. */
class WasmWorkerDriver implements SqliteDriver {
  readonly name = 'wasm' as const;
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();

  constructor(private readonly dbName: string) {}

  async open(): Promise<void> {
    if (this.worker) return;
    if (typeof Worker === 'undefined') {
      throw new SqliteAdapterError('Web Workers are not available in this environment', {
        code: 'driver',
      });
    }

    const worker = new Worker(new URL('./browserWorker.ts', import.meta.url), {
      type: 'module',
      name: 'schoolpilot-sqlite-adapter',
    });
    worker.onmessage = (event: MessageEvent<SqliteWorkerResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response?.id);
      if (!pending) return;
      this.pending.delete(response.id);
      if (response.ok) {
        pending.resolve(response);
      } else {
        // A plain Error lets the adapter core classify UNIQUE / NOT NULL failures.
        pending.reject(new Error(response.error));
      }
    };
    const failAll = (message: string) => {
      const error = new SqliteAdapterError(message, { code: 'driver' });
      this.pending.forEach((pending) => pending.reject(error));
      this.pending.clear();
    };
    worker.onerror = (event) => failAll(`SQLite worker failed: ${event.message || 'unknown error'}`);
    worker.onmessageerror = () => failAll('SQLite worker sent an unreadable message');
    this.worker = worker;

    try {
      await this.request({ type: 'open', dbName: this.dbName });
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.worker) return;
    try {
      await this.request({ type: 'close' });
    } finally {
      this.dispose();
    }
  }

  async exec(sql: string): Promise<void> {
    await this.request({ type: 'exec', sql });
  }

  async all(sql: string, params: readonly SqliteValue[]): Promise<unknown[]> {
    const response = await this.request({ type: 'all', sql, params: [...params] });
    return response.rows ?? [];
  }

  async get(sql: string, params: readonly SqliteValue[]): Promise<unknown> {
    const response = await this.request({ type: 'get', sql, params: [...params] });
    return response.row ?? null;
  }

  async run(sql: string, params: readonly SqliteValue[]): Promise<SqliteRunResult> {
    const response = await this.request({ type: 'run', sql, params: [...params] });
    return response.result ?? { changes: 0, lastInsertRowid: 0 };
  }

  private async request(message: SqliteWorkerRequestInput): Promise<SqliteWorkerSuccess> {
    const worker = this.worker;
    if (!worker) {
      throw new SqliteAdapterError('SQLite worker is not open', { code: 'not_open' });
    }

    const id = this.nextId++;
    const request = { ...message, id } as SqliteWorkerRequest;

    return new Promise<SqliteWorkerSuccess>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new SqliteAdapterError(
            `SQLite worker did not respond within ${WASM_REQUEST_TIMEOUT_MS / 1000}s`,
            { code: 'driver' }
          )
        );
      }, WASM_REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      worker.postMessage(request);
    });
  }

  private dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach((pending) =>
      pending.reject(new SqliteAdapterError('SQLite worker was closed', { code: 'not_open' }))
    );
    this.pending.clear();
  }
}

/** Create a browser adapter backed by the OPFS worker; call `open()` before use. */
export function createWasmSqliteAdapter(
  options: WasmSqliteAdapterOptions = {}
): SqliteAdapter {
  return createSqliteAdapter(new WasmWorkerDriver(options.dbName ?? 'schoolpilot'), {
    foreignKeys: options.foreignKeys,
  });
}
