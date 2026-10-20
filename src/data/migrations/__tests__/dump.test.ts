// ABOUTME: Tests the SQL export and the restore against a real SQLite database: the restore
// ABOUTME: is atomic, a dump with comments restores, and a broken dump changes nothing.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { dumpDatabase, restoreDatabase, validateDump } from '@/data/migrations';

import { readRows, readTableNames, type MigrationFixture } from './fixtures';
import { createFixtureAdapter } from './fixtures';

const COMMENTED_DDL = `CREATE TABLE notes (
  id TEXT PRIMARY KEY,          -- the identifier of the note
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'note'   /* the kind of the note */
)`;

describe('the SQL export and the restore', () => {
  let fixture: MigrationFixture;

  beforeEach(async () => {
    fixture = await createFixtureAdapter();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it('leaves the database untouched when a restore fails', async () => {
    await fixture.adapter.exec('CREATE TABLE gadget (id TEXT PRIMARY KEY, label TEXT NOT NULL)');
    await fixture.adapter.exec('CREATE TABLE keep (id TEXT PRIMARY KEY, label TEXT NOT NULL)');
    await fixture.adapter.run('INSERT INTO keep (id, label) VALUES (?, ?)', ['k1', 'the row']);

    const dump = await dumpDatabase(fixture.adapter);

    // A dump whose last statement does not parse.
    const broken = `${dump}\nCREATE TABLE broken (id TEXT PRIMARY KEY,`;

    await expect(restoreDatabase(fixture.adapter, broken)).rejects.toThrow();

    // The database that was there before the restore is still there, with its rows.
    const tables = await readTableNames(fixture.adapter);
    expect(tables).toContain('gadget');
    expect(tables).toContain('keep');
    expect(tables).not.toContain('broken');
    expect(await readRows(fixture.adapter, 'keep')).toEqual([
      { id: 'k1', label: 'the row' },
    ]);
  });

  it('refuses a dump that does not restore, and changes nothing', async () => {
    await fixture.adapter.exec('CREATE TABLE gadget (id TEXT PRIMARY KEY, label TEXT NOT NULL)');
    await fixture.adapter.run('INSERT INTO gadget (id, label) VALUES (?, ?)', [
      'g1',
      'the gadget',
    ]);

    await expect(
      validateDump(fixture.adapter, 'CREATE TABLE broken (id TEXT PRIMARY KEY,', ['gadget'])
    ).rejects.toThrow(/does not restore/);

    // The database the check ran against is exactly as it was.
    expect(await readTableNames(fixture.adapter)).toEqual(['gadget']);
    expect(await readRows(fixture.adapter, 'gadget')).toEqual([
      { id: 'g1', label: 'the gadget' },
    ]);
  });

  it('exports a table whose definition carries comments', async () => {
    await fixture.adapter.exec(COMMENTED_DDL);
    await fixture.adapter.run('INSERT INTO notes (id, body) VALUES (?, ?)', [
      'n1',
      'the note',
    ]);

    const dump = await dumpDatabase(fixture.adapter);

    // The comments are gone: a comment that survived would swallow the rest of the
    // statement when the dump is replayed.
    expect(dump).not.toContain('the identifier of the note');
    expect(dump).not.toContain('the kind of the note');
    expect(dump).toContain('DEFAULT \'note\'');

    const target = createNodeSqliteAdapter({ filename: ':memory:' });
    await target.open();
    await restoreDatabase(target, dump);

    expect(await readTableNames(target)).toContain('notes');
    expect(await readRows(target, 'notes')).toEqual([
      { id: 'n1', body: 'the note', kind: 'note' },
    ]);

    // The default of the column survived the export.
    await target.run('INSERT INTO notes (id, body) VALUES (?, ?)', ['n2', 'another note']);
    const rows = await readRows(target, 'notes');
    expect(rows[1]).toMatchObject({ id: 'n2', kind: 'note' });

    await target.close();
  });

  it('restores a dump into a database that holds other tables', async () => {
    await fixture.adapter.exec('CREATE TABLE gadget (id TEXT PRIMARY KEY, label TEXT NOT NULL)');
    await fixture.adapter.run('INSERT INTO gadget (id, label) VALUES (?, ?)', [
      'g1',
      'the gadget',
    ]);
    const dump = await dumpDatabase(fixture.adapter);

    await fixture.adapter.exec('CREATE TABLE other (id TEXT PRIMARY KEY)');

    await restoreDatabase(fixture.adapter, dump);

    // The restore replaces the database: the table that was not in the dump is gone.
    expect(await readTableNames(fixture.adapter)).not.toContain('other');
    expect(await readRows(fixture.adapter, 'gadget')).toEqual([
      { id: 'g1', label: 'the gadget' },
    ]);
  });

  it('does not change the database while it exports it', async () => {
    await fixture.adapter.exec('CREATE TABLE gadget (id TEXT PRIMARY KEY, label TEXT NOT NULL)');
    await fixture.adapter.run('INSERT INTO gadget (id, label) VALUES (?, ?)', [
      'g1',
      'the gadget',
    ]);

    const before = await dumpDatabase(fixture.adapter);
    const after = await dumpDatabase(fixture.adapter);

    expect(after).toBe(before);
    expect(await readRows(fixture.adapter, 'gadget')).toEqual([
      { id: 'g1', label: 'the gadget' },
    ]);
  });

  it('exports a table whose rows hold text, numbers and nulls', async () => {
    await fixture.adapter.exec(
      'CREATE TABLE mixed (id TEXT PRIMARY KEY, label TEXT, amount REAL, note TEXT)'
    );
    await fixture.adapter.run(
      'INSERT INTO mixed (id, label, amount, note) VALUES (?, ?, ?, ?)',
      ['m1', 'a label', 12.5, null]
    );

    const dump = await dumpDatabase(fixture.adapter);
    const target: SqliteAdapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await target.open();
    await restoreDatabase(target, dump);

    expect(await readRows(target, 'mixed')).toEqual([
      { id: 'm1', label: 'a label', amount: 12.5, note: null },
    ]);

    await target.close();
  });
});
