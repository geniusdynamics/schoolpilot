// ABOUTME: Tests whole-database export and import on both real drivers: rows and the migration
// ABOUTME: ledger survive the round trip, a file database is replaced, and a non-database is refused.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { applySchemaMigrations } from '@/data/migrations';

import { createNodeSqliteAdapter, isSqliteImage, type SqliteAdapter } from '..';

import { driverCases, testId } from './helpers';

async function seed(adapter: SqliteAdapter): Promise<void> {
  await adapter.exec('CREATE TABLE note (id TEXT PRIMARY KEY, body TEXT NOT NULL)');
  await adapter.run('INSERT INTO note (id, body) VALUES (?, ?)', [testId(1), 'kept by the backup']);
  await adapter.run('INSERT INTO note (id, body) VALUES (?, ?)', [testId(2), 'and this one']);
  // The real module schemas, so the ledger the restore validation reads is in the image.
  await applySchemaMigrations(adapter);
}

const ledger = (adapter: SqliteAdapter) =>
  adapter.all<{ version: number; name: string }>('SELECT version, name FROM _migrations ORDER BY version');

describe.each(driverCases)('whole-database image ($name)', ({ create }) => {
  it('exports an image another adapter imports with its rows and migration ledger', async () => {
    const source = await create();
    const target = await create();
    try {
      await seed(source);
      const image = await source.exportDatabase();
      expect(isSqliteImage(image)).toBe(true);

      await target.exec('CREATE TABLE replaced_by_the_import (id INTEGER)');
      await target.importDatabase(image);

      expect(await target.all('SELECT id, body FROM note ORDER BY id')).toEqual([
        { id: testId(1), body: 'kept by the backup' },
        { id: testId(2), body: 'and this one' },
      ]);
      const sourceLedger = await ledger(source);
      expect(sourceLedger.length).toBeGreaterThan(0);
      expect(await ledger(target)).toEqual(sourceLedger);
      expect(
        await target.all("SELECT name FROM sqlite_master WHERE name = 'replaced_by_the_import'")
      ).toEqual([]);
      // The connection settings are applied again on the replaced database.
      expect(await target.get('PRAGMA busy_timeout')).toEqual({ timeout: 5000 });
    } finally {
      await source.close();
      await target.close();
    }
  });

  it('refuses every write after an import, while reads and a further import still work', async () => {
    const source = await create();
    const target = await create();
    try {
      await seed(source);
      const image = await source.exportDatabase();
      await target.importDatabase(image);

      const refusals = [
        target.run('INSERT INTO note (id, body) VALUES (?, ?)', [testId(3), 'from the old page state']),
        target.exec("UPDATE note SET body = 'stale'"),
        target.transaction(async (tx) => {
          await tx.run('DELETE FROM note');
        }),
        target.applySchema([]),
      ];
      for (const refused of refusals) {
        await expect(refused).rejects.toMatchObject({ code: 'replaced' });
      }
      expect(await target.all('SELECT id FROM note ORDER BY id')).toHaveLength(2);

      // A failed restore imports the old database back through the same call.
      await target.importDatabase(image);
      expect(await target.get<{ total: number }>('SELECT count(*) AS total FROM note')).toEqual({ total: 2 });
    } finally {
      await source.close();
      await target.close();
    }
  });

  it('refuses bytes that are not a database and keeps the current one', async () => {
    const adapter = await create();
    try {
      await seed(adapter);
      await expect(
        adapter.importDatabase(new TextEncoder().encode('{"collections":{}}'))
      ).rejects.toThrow(/not a SQLite database/);
      expect(await adapter.all('SELECT id FROM note')).toHaveLength(2);
    } finally {
      await adapter.close();
    }
  });
});

describe('node driver on a database file', () => {
  it('replaces the file and stays open on the imported contents', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolpilot-image-'));
    const filename = path.join(directory, 'school.sqlite3');
    const source = createNodeSqliteAdapter();
    const target = createNodeSqliteAdapter({ filename });
    try {
      await source.open();
      await seed(source);
      await target.open();
      await target.exec('CREATE TABLE before_restore (id INTEGER)');

      await target.importDatabase(await source.exportDatabase());
      expect(await target.all('SELECT id FROM note')).toHaveLength(2);
      await target.close();
      // Opening again is a fresh start on the imported file: writes are accepted.
      await target.open();
      await target.run('INSERT INTO note (id, body) VALUES (?, ?)', [testId(9), 'after a reload']);
      await target.close();

      // The file on disk is the imported database, not just the open connection.
      const reopened = createNodeSqliteAdapter({ filename });
      await reopened.open();
      expect(await reopened.all('SELECT id FROM note')).toHaveLength(3);
      expect(await ledger(reopened)).toEqual(await ledger(source));
      await reopened.close();
      expect(fs.existsSync(`${filename}.import`)).toBe(false);
    } finally {
      await source.close();
      await target.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
