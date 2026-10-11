// ABOUTME: Unit tests for SQLiteWASMProvider persistence: the OPFS SAH-pool storage worker must open or init fails closed.
// ABOUTME: Covers the VITE_DB_ALLOW_MEMORY opt-in, write-through of mutating SQL to the worker, and non-destructive shutdown.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDbInstances: any[] = [];
const mockState = vi.hoisted(() => ({ failLocalExec: null as RegExp | null, failCheckRc: false, localSql: [] as string[] }));

vi.mock('@sqlite.org/sqlite-wasm', () => {
  class MockDB {
    pointer = 1;
    exec = vi.fn((arg: any) => {
      const sql = typeof arg === 'string' ? arg : arg?.sql;
      if (mockState.failLocalExec && mockState.failLocalExec.test(sql)) throw new Error('local exec failed');
      mockState.localSql.push(sql);
      return [];
    });
    close = vi.fn();
    checkRc = vi.fn(() => {
      if (mockState.failCheckRc) throw new Error('sqlite3_deserialize failed');
    });
    constructor() {
      mockDbInstances.push(this);
    }
  }
  return {
    default: vi.fn().mockResolvedValue({
      oo1: { DB: MockDB },
      capi: {
        sqlite3_deserialize: vi.fn(() => 0),
        SQLITE_DESERIALIZE_FREEONCLOSE: 1,
        SQLITE_DESERIALIZE_RESIZEABLE: 2,
      },
      wasm: { allocFromTypedArray: vi.fn(() => 42) },
    }),
  };
});

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  SQLiteWASMProvider,
  STORAGE_WRITE_TIMEOUT_MS,
  StorageUnavailableError,
  getSQLiteStorageStatus,
  isPersistentStatement,
} from '../SQLiteWASMProvider';

type Reply = (msg: any) => any;

/** Minimal stand-in for the storage Web Worker; `reply` decides each response. */
class FakeStorageWorker {
  onmessage: ((event: { data: any }) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessageerror: ((event: any) => void) | null = null;
  sent: any[] = [];
  terminate = vi.fn();
  constructor(private reply: Reply) {}
  postMessage(msg: any) {
    this.sent.push(msg);
    const response = this.reply(msg);
    if (response !== undefined) {
      queueMicrotask(() => this.onmessage?.({ data: { id: msg.id, ...response } }));
    }
  }
}

const okWorker = () =>
  new FakeStorageWorker((msg) => (msg.type === 'open' ? { ok: true, bytes: new Uint8Array() } : { ok: true }));

const missingVfsWorker = () =>
  new FakeStorageWorker((msg) =>
    msg.type === 'open' ? { ok: false, error: 'Missing required OPFS APIs.' } : { ok: true }
  );

const makeProvider = (worker: FakeStorageWorker | (() => never)) => {
  const provider = new SQLiteWASMProvider({ name: 'persist_test', version: 1 });
  vi.spyOn(provider as any, 'createStorageWorker').mockImplementation(
    typeof worker === 'function' ? worker : () => worker
  );
  return provider;
};

describe('SQLiteWASMProvider persistent storage', () => {
  const originalStorage = (navigator as any).storage;

  beforeEach(() => {
    mockDbInstances.length = 0;
    mockState.failLocalExec = null;
    mockState.failCheckRc = false;
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: vi.fn(),
        persist: vi.fn().mockResolvedValue(true),
        persisted: vi.fn().mockResolvedValue(true),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'storage', { configurable: true, value: originalStorage });
  });

  it('rejects initialise() when the SAH-pool VFS is missing and opens no in-memory database', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const provider = makeProvider(missingVfsWorker());

    await expect(provider.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(provider.initialize()).rejects.toThrow(/Missing required OPFS APIs/);

    expect(mockDbInstances).toHaveLength(0);
    expect(provider.getStatus().isConnected).toBe(false);
    expect(getSQLiteStorageStatus().mode).toBe('unavailable');
  });

  it('rejects initialise() when Web Workers cannot be created', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const provider = makeProvider(() => {
      throw new Error('Worker is not defined');
    });

    await expect(provider.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(mockDbInstances).toHaveLength(0);
  });

  it('rejects initialise() when OPFS is not exposed by the browser', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
    const provider = makeProvider(okWorker());

    await expect(provider.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(mockDbInstances).toHaveLength(0);
  });

  it('uses a temporary in-memory database only when VITE_DB_ALLOW_MEMORY=true', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
    const provider = makeProvider(missingVfsWorker());

    await expect(provider.initialize()).resolves.toBeUndefined();

    expect(provider.getStatus().isConnected).toBe(true);
    expect(getSQLiteStorageStatus().mode).toBe('memory');
  });

  it('opens the persistent store, requests durable storage and reports the result', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const worker = okWorker();
    const provider = makeProvider(worker);

    await provider.initialize();

    expect(worker.sent[0]).toMatchObject({ type: 'open', dbName: 'persist_test' });
    expect((navigator as any).storage.persist).toHaveBeenCalled();
    expect(getSQLiteStorageStatus()).toMatchObject({ mode: 'opfs-sahpool', persisted: true });
  });

  it('opens a single storage connection for concurrent and repeated initialise() calls', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const provider = makeProvider(okWorker());

    await Promise.all([provider.initialize(), provider.initialize()]);
    await provider.initialize({ name: 'other_name', version: 1 });

    expect((provider as any).createStorageWorker).toHaveBeenCalledTimes(1);
  });

  it('forwards mutating statements to the storage worker and resolves writes only once persisted', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const worker = okWorker();
    const provider = makeProvider(worker);
    await provider.initialize();

    const collection = await provider.createCollection('students', {
      title: 'students',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: { id: { type: 'string' }, first_name: { type: 'string' } },
    } as any);
    worker.sent.length = 0;

    await collection.insert({ id: 'S1', first_name: 'Amani' } as any);

    const forwarded = worker.sent.filter((m) => m.type === 'exec').map((m) => m.sql);
    expect(forwarded.some((sql: string) => /^INSERT INTO students/.test(sql))).toBe(true);
    expect(forwarded.some((sql: string) => /^SELECT/i.test(sql))).toBe(false);
  });

  it('rejects a write when the storage worker fails to persist it', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const worker = new FakeStorageWorker((msg) => {
      if (msg.type === 'open') return { ok: true, bytes: new Uint8Array() };
      if (msg.type === 'exec' && /^INSERT/.test(msg.sql)) return { ok: false, error: 'disk I/O error' };
      return { ok: true };
    });
    const provider = makeProvider(worker);
    await provider.initialize();
    const collection = await provider.createCollection('students', {
      title: 'students',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: { id: { type: 'string' } },
    } as any);

    await expect(collection.insert({ id: 'S1' } as any)).rejects.toThrow(/disk I\/O error/);
  });

  it('destroy() closes the persistent store without dropping tables', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const worker = okWorker();
    const provider = makeProvider(worker);
    await provider.initialize();
    await provider.createCollection('students', {
      title: 'students',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: { id: { type: 'string' } },
    } as any);
    worker.sent.length = 0;

    await provider.destroy();

    expect(worker.sent.some((m) => m.type === 'exec' && /DROP TABLE/i.test(m.sql))).toBe(false);
    expect(worker.sent.some((m) => m.type === 'close')).toBe(true);
    expect(worker.terminate).toHaveBeenCalled();
  });

  const schema = {
    title: 'students',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: { id: { type: 'string' }, first_name: { type: 'string' } },
  } as any;

  /** Worker that succeeds except for exec statements matching `failing`. */
  const failingWorker = (failing: RegExp) =>
    new FakeStorageWorker((msg) => {
      if (msg.type === 'open') return { ok: true, bytes: new Uint8Array() };
      if (msg.type === 'exec' && failing.test(msg.sql)) return { ok: false, error: 'disk I/O error' };
      return { ok: true };
    });

  const openWith = async (worker: FakeStorageWorker) => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    const provider = makeProvider(worker);
    await provider.initialize();
    const collection = await provider.createCollection('students', schema);
    return { provider, collection };
  };

  describe('every initialisation failure fails closed', () => {
    it('wraps a WASM init failure in StorageUnavailableError', async () => {
      vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
      (sqlite3InitModule as any).mockRejectedValueOnce(new Error('wasm streaming compile failed'));
      const provider = makeProvider(okWorker());
      const result = provider.initialize();
      await expect(result).rejects.toBeInstanceOf(StorageUnavailableError);
      await expect(result).rejects.toThrow(/wasm streaming compile failed/);
    });

    it('wraps a working-copy (deserialize) failure in StorageUnavailableError', async () => {
      vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
      mockState.failCheckRc = true;
      const worker = new FakeStorageWorker((msg) =>
        msg.type === 'open' ? { ok: true, bytes: new Uint8Array([1, 2, 3]) } : { ok: true }
      );
      await expect(makeProvider(worker).initialize()).rejects.toBeInstanceOf(StorageUnavailableError);
      expect(worker.terminate).toHaveBeenCalled();
    });

    it('wraps an encryption failure in StorageUnavailableError', async () => {
      vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
      mockState.failLocalExec = /PRAGMA key/;
      const provider = new SQLiteWASMProvider({ name: 'persist_test', version: 1, encryptionKey: 'k' } as any);
      vi.spyOn(provider as any, 'createStorageWorker').mockImplementation(() => okWorker());
      await expect(provider.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);
    });
  });

  describe('writes resolve only after the worker confirms them', () => {
    it('updateMany rejects when the worker fails the COMMIT', async () => {
      const { collection } = await openWith(failingWorker(/^COMMIT/));
      await expect(collection.updateMany({}, { first_name: 'B' } as any)).rejects.toThrow();
    });

    it('removeMany rejects when the worker fails the COMMIT', async () => {
      const { collection } = await openWith(failingWorker(/^COMMIT/));
      await expect(collection.removeMany({})).rejects.toThrow();
    });

    it('transaction() rejects when the worker fails the COMMIT', async () => {
      const { provider } = await openWith(failingWorker(/^COMMIT/));
      await expect(provider.transaction(async () => 'done')).rejects.toThrow();
    });

    it('transaction() rejects when the worker fails the ROLLBACK', async () => {
      const { provider } = await openWith(failingWorker(/^ROLLBACK/));
      await expect(
        provider.transaction(async () => {
          throw new Error('callback failed');
        })
      ).rejects.toBeInstanceOf(StorageUnavailableError);
    });

    it('restore() rejects when the worker fails the COMMIT', async () => {
      const { provider } = await openWith(failingWorker(/^COMMIT/));
      const backup = JSON.stringify({ metadata: { timestamp: 'now' }, data: {} });
      await expect(provider.restore(backup)).rejects.toThrow();
    });

    it.each([
      ['createIndex', /^CREATE\s+INDEX/i, (c: any) => c.createIndex({ name: 'fn', fields: ['first_name'] })],
      ['compact', /^VACUUM/, (c: any) => c.compact()],
      ['destroy', /^DROP TABLE/, (c: any) => c.destroy()],
    ])('%s rejects when the worker fails its DDL', async (_name, failing, act) => {
      const { collection } = await openWith(failingWorker(failing));
      await expect(act(collection)).rejects.toThrow();
    });

    it('createCollection rejects when the worker fails CREATE TABLE', async () => {
      vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
      const provider = makeProvider(failingWorker(/^CREATE TABLE/i));
      await provider.initialize();
      await expect(provider.createCollection('students', schema)).rejects.toThrow();
    });
  });

  describe('after a persistence failure', () => {
    it('marks storage unavailable and rejects every later write with StorageUnavailableError', async () => {
      const { collection } = await openWith(failingWorker(/^INSERT/));
      await expect(collection.insert({ id: 'S1' } as any)).rejects.toThrow();
      // Later writes must not even be applied to the main-thread copy.
      expect(getSQLiteStorageStatus().mode).toBe('unavailable');
      const localCalls = mockState.localSql.length;
      await expect(collection.remove('S1')).rejects.toBeInstanceOf(StorageUnavailableError);
      const laterSql = mockState.localSql.slice(localCalls);
      expect(laterSql.some((sql: string) => /^(UPDATE|INSERT|DELETE)/i.test(sql))).toBe(false);
    });
  });

  describe('a dead or silent worker', () => {
    it('rejects a pending write with StorageUnavailableError when the worker never answers', async () => {
      const worker = new FakeStorageWorker((msg) => {
        if (msg.type === 'open') return { ok: true, bytes: new Uint8Array() };
        if (msg.type === 'exec' && /^INSERT/.test(msg.sql)) return undefined; // never answers
        return { ok: true };
      });
      const { collection } = await openWith(worker);
      vi.useFakeTimers();
      try {
        const write = collection.insert({ id: 'S1' } as any);
        const assertion = expect(write).rejects.toBeInstanceOf(StorageUnavailableError);
        await vi.advanceTimersByTimeAsync(STORAGE_WRITE_TIMEOUT_MS + 10);
        await assertion;
      } finally {
        vi.useRealTimers();
      }
      expect(getSQLiteStorageStatus().mode).toBe('unavailable');
    });

    it.each(['onerror', 'onmessageerror'])('rejects pending writes with StorageUnavailableError on worker %s', async (handler) => {
      const worker = new FakeStorageWorker((msg) => {
        if (msg.type === 'open') return { ok: true, bytes: new Uint8Array() };
        if (msg.type === 'exec' && /^INSERT/.test(msg.sql)) {
          queueMicrotask(() => (worker as any)[handler]?.({ message: 'worker crashed' }));
          return undefined;
        }
        return { ok: true };
      });
      const { collection } = await openWith(worker);
      await expect(collection.insert({ id: 'S1' } as any)).rejects.toBeInstanceOf(StorageUnavailableError);
      expect(getSQLiteStorageStatus().mode).toBe('unavailable');
    });
  });
});

describe('isPersistentStatement', () => {
  it.each([
    ['INSERT INTO students (id) VALUES (?)', true],
    ['  update students SET a = ?', true],
    ['DELETE FROM students WHERE id = ?', true],
    ['CREATE TABLE IF NOT EXISTS t (id TEXT)', true],
    ['BEGIN TRANSACTION', true],
    ['COMMIT', true],
    ['ROLLBACK', true],
    ['PRAGMA foreign_keys = ON;', true],
    ['SELECT * FROM students', false],
    ['PRAGMA table_info(students)', false],
    ['PRAGMA journal_mode = WAL;', false],
    ['PRAGMA optimize;', false],
  ])('%s → %s', (sql, expected) => {
    expect(isPersistentStatement(sql)).toBe(expected);
  });
});
