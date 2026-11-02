// ABOUTME: Unit tests for the SQLite storage worker message handler (OPFS SAH-pool VFS owner).
// ABOUTME: Verifies open installs the SAH-pool VFS and returns a snapshot, exec persists, and failures are reported.

import { describe, it, expect, vi } from 'vitest';
import { createSqliteWorkerHandler } from '../sqliteWorker';

const makeSqlite3 = (overrides: { install?: () => Promise<unknown>; importDb?: () => Promise<number> } = {}) => {
  const db = { exec: vi.fn(), close: vi.fn() };
  const DB = vi.fn(() => db);
  const pool = {
    importDb: vi.fn<(name: string, data: unknown) => Promise<number>>(() =>
      overrides.importDb ? overrides.importDb() : Promise.resolve(512)
    ),
  };
  const sqlite3 = {
    pool,
    installOpfsSAHPoolVfs: vi.fn(overrides.install ?? (() => Promise.resolve(pool))),
    oo1: { DB },
    capi: { sqlite3_js_db_export: vi.fn(() => new Uint8Array([1, 2, 3])) },
  };
  return { sqlite3, db, DB };
};

describe('sqliteWorker handler', () => {
  it('installs the opfs-sahpool VFS, opens the database file and returns its snapshot', async () => {
    const { sqlite3, DB } = makeSqlite3();
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    await handle({ id: 1, type: 'open', dbName: 'schoolpilot_production' });

    expect(sqlite3.installOpfsSAHPoolVfs).toHaveBeenCalled();
    expect(DB).toHaveBeenCalledWith('file:/schoolpilot_production.sqlite3?vfs=opfs-sahpool', 'c');
    expect(post).toHaveBeenCalledWith(
      { id: 1, ok: true, bytes: new Uint8Array([1, 2, 3]) },
      expect.any(Array)
    );
  });

  it('reports a missing VFS as a failed open instead of opening a memory database', async () => {
    const { sqlite3, DB } = makeSqlite3({ install: () => Promise.reject(new Error('Missing required OPFS APIs.')) });
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    await handle({ id: 7, type: 'open', dbName: 'x' });

    expect(DB).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith({ id: 7, ok: false, error: 'Missing required OPFS APIs.' });
  });

  it('executes forwarded statements in order and acknowledges each one', async () => {
    const { sqlite3, db } = makeSqlite3();
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    const opening = handle({ id: 1, type: 'open', dbName: 'x' });
    const writing = handle({ id: 2, type: 'exec', sql: 'INSERT INTO t (id) VALUES (?)', bind: ['a'] });
    await Promise.all([opening, writing]);

    expect(db.exec).toHaveBeenCalledWith({ sql: 'INSERT INTO t (id) VALUES (?)', bind: ['a'] });
    expect(post).toHaveBeenLastCalledWith({ id: 2, ok: true });
  });

  it('reports exec errors and a write before open', async () => {
    const { sqlite3, db } = makeSqlite3();
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    await handle({ id: 3, type: 'exec', sql: 'DELETE FROM t' });
    expect(post).toHaveBeenLastCalledWith({ id: 3, ok: false, error: expect.stringMatching(/not open/i) });

    await handle({ id: 4, type: 'open', dbName: 'x' });
    db.exec.mockImplementationOnce(() => {
      throw new Error('disk I/O error');
    });
    await handle({ id: 5, type: 'exec', sql: 'DELETE FROM t' });
    expect(post).toHaveBeenLastCalledWith({ id: 5, ok: false, error: 'disk I/O error' });
  });

  it('closes the database on request', async () => {
    const { sqlite3, db } = makeSqlite3();
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    await handle({ id: 1, type: 'open', dbName: 'x' });
    await handle({ id: 2, type: 'close' });

    expect(db.close).toHaveBeenCalled();
    expect(post).toHaveBeenLastCalledWith({ id: 2, ok: true });
  });

  /** A byte image with the SQLite header, the shape the pool's import accepts. */
  const sqliteImage = () => {
    const bytes = new Uint8Array(1024);
    bytes.set(new TextEncoder().encode('SQLite format 3\u0000'));
    return bytes;
  };

  it('exports the open database file through its queue', async () => {
    const { sqlite3 } = makeSqlite3();
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    await handle({ id: 1, type: 'open', dbName: 'x' });
    sqlite3.capi.sqlite3_js_db_export.mockReturnValueOnce(new Uint8Array([9, 9]));
    await handle({ id: 2, type: 'export' });

    expect(post).toHaveBeenLastCalledWith({ id: 2, ok: true, bytes: new Uint8Array([9, 9]) }, expect.any(Array));
  });

  it('replaces the file through the pool and reopens it', async () => {
    const { sqlite3, db, DB } = makeSqlite3();
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);
    const image = sqliteImage();

    await handle({ id: 1, type: 'open', dbName: 'schoolpilot_production' });
    await handle({ id: 2, type: 'import', bytes: image });

    expect(db.close).toHaveBeenCalledTimes(1);
    expect(sqlite3.pool.importDb).toHaveBeenCalledWith('/schoolpilot_production.sqlite3', expect.any(Function));
    // The chunked import is fed the whole image once, then told it is done.
    const feed = sqlite3.pool.importDb.mock.calls[0]?.[1] as () => Uint8Array | undefined;
    expect(feed()).toBe(image);
    expect(feed()).toBeUndefined();
    expect(DB).toHaveBeenCalledTimes(2);
    expect(DB).toHaveBeenLastCalledWith('file:/schoolpilot_production.sqlite3?vfs=opfs-sahpool', 'c');
    expect(post).toHaveBeenLastCalledWith({ id: 2, ok: true });
  });

  it('refuses bytes that are not a database without closing the open one', async () => {
    const { sqlite3, db } = makeSqlite3();
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    await handle({ id: 1, type: 'open', dbName: 'x' });
    await handle({ id: 2, type: 'import', bytes: new TextEncoder().encode('{"collections":{}}') });

    expect(db.close).not.toHaveBeenCalled();
    expect(sqlite3.pool.importDb).not.toHaveBeenCalled();
    expect(post).toHaveBeenLastCalledWith({ id: 2, ok: false, error: expect.stringMatching(/not a SQLite database/) });
  });

  it('reopens the database when the pool import fails', async () => {
    const { sqlite3, DB } = makeSqlite3({ importDb: () => Promise.reject(new Error('No available handles to import to.')) });
    const post = vi.fn();
    const handle = createSqliteWorkerHandler(async () => sqlite3, post);

    await handle({ id: 1, type: 'open', dbName: 'x' });
    await handle({ id: 2, type: 'import', bytes: sqliteImage() });
    await handle({ id: 3, type: 'exec', sql: 'SELECT 1' });

    expect(DB).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledWith({ id: 2, ok: false, error: 'No available handles to import to.' });
    expect(post).toHaveBeenLastCalledWith({ id: 3, ok: true });
  });
});
