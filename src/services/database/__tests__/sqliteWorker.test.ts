// ABOUTME: Unit tests for the SQLite storage worker message handler (OPFS SAH-pool VFS owner).
// ABOUTME: Verifies open installs the SAH-pool VFS and returns a snapshot, exec persists, and failures are reported.

import { describe, it, expect, vi } from 'vitest';
import { createSqliteWorkerHandler } from '../sqliteWorker';

const makeSqlite3 = (overrides: { install?: () => Promise<unknown> } = {}) => {
  const db = { exec: vi.fn(), close: vi.fn() };
  const DB = vi.fn(() => db);
  const sqlite3 = {
    installOpfsSAHPoolVfs: vi.fn(overrides.install ?? (() => Promise.resolve({}))),
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
});
