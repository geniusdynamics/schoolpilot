// ABOUTME: Tests the node file copy backup strategy on a real database file: the copy, the
// ABOUTME: restore over the live database and the discard that removes the copy.

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

import { createFileBackupStrategy } from '../nodeBackup';

interface FileFixture {
  readonly adapter: SqliteAdapter;
  readonly source: string;
  readonly directory: string;
  readonly cleanup: () => Promise<void>;
}

async function createFileFixture(): Promise<FileFixture> {
  const directory = await mkdtemp(join(tmpdir(), 'schoolpilot-filebackup-'));
  const source = join(directory, 'schoolpilot.sqlite');
  const backups = join(directory, 'backups');
  const adapter = createNodeSqliteAdapter({ filename: source });
  await adapter.open();
  return {
    adapter,
    source,
    directory: backups,
    cleanup: async () => {
      await adapter.close().catch(() => undefined);
      await rm(directory, { recursive: true, force: true });
    },
  };
}

describe('the node file copy backup strategy', () => {
  let fixture: FileFixture;

  beforeEach(async () => {
    fixture = await createFileFixture();
    await fixture.adapter.exec('CREATE TABLE gadget (id TEXT PRIMARY KEY, label TEXT NOT NULL)');
    await fixture.adapter.run('INSERT INTO gadget (id, label) VALUES (?, ?)', [
      'g1',
      'the gadget',
    ]);
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it('copies the database file and records where the copy is', async () => {
    const strategy = createFileBackupStrategy({
      source: fixture.source,
      directory: fixture.directory,
    });

    const backup = await strategy.take(fixture.adapter, {
      version: 3,
      name: 'third table',
    });

    expect(backup.kind).toBe('file');
    expect(backup.version).toBe(3);
    expect(backup.migrationName).toBe('third table');
    expect(existsSync(backup.location)).toBe(true);
    expect(backup.bytes).toBeGreaterThan(0);

    // The copy holds the database that was there when it was taken.
    const copy = await readFile(backup.location);
    const source = await readFile(fixture.source);
    expect(copy.length).toBe(source.length);
  });

  it('restores the copy over the live database', async () => {
    const strategy = createFileBackupStrategy({
      source: fixture.source,
      directory: fixture.directory,
    });
    const backup = await strategy.take(fixture.adapter, {
      version: 1,
      name: 'first table',
    });

    // The database changes after the backup was taken.
    await fixture.adapter.run('INSERT INTO gadget (id, label) VALUES (?, ?)', [
      'g2',
      'the second gadget',
    ]);

    // The restore closes the adapter and puts the copy back.
    await strategy.restore(backup, fixture.adapter);

    const reopened = createNodeSqliteAdapter({ filename: fixture.source });
    await reopened.open();
    const rows = await reopened.all<{ id: string }>('SELECT id FROM gadget ORDER BY id');
    expect(rows.map((row) => row.id)).toEqual(['g1']);
    await reopened.close();
  });

  it('removes the copy when it leaves the retention window', async () => {
    const strategy = createFileBackupStrategy({
      source: fixture.source,
      directory: fixture.directory,
    });
    const backup = await strategy.take(fixture.adapter, {
      version: 1,
      name: 'first table',
    });

    expect(existsSync(backup.location)).toBe(true);

    await strategy.discard?.(backup);

    expect(existsSync(backup.location)).toBe(false);
  });
});
