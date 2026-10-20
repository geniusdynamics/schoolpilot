// ABOUTME: Tests the migration framework over the canonical schema of A03: a real SQLite
// ABOUTME: database with the spec 02 tables, a couple of sample migrations and a dump of it.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyCanonicalSchema, createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import { createDumpBackupStrategy, createMigrationRunner } from '@/data/migrations';
import { validFixtures } from '@/domain/schema/__tests__/fixtures';

import { readRows, readTableNames, type MigrationFixture } from './fixtures';
import { createFixtureAdapter } from './fixtures';

const FIXED_NOW = new Date('2026-10-20T08:00:00.000Z');
const ADD_NOTE = 'ALTER TABLE learner ADD COLUMN migration_note TEXT';
const DROP_NOTE = 'ALTER TABLE learner DROP COLUMN migration_note';

describe('migrations over the canonical schema', () => {
  let fixture: MigrationFixture;

  beforeEach(async () => {
    fixture = await createFixtureAdapter();
    await applyCanonicalSchema(fixture.adapter);
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it('adds a column to a canonical table', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        {
          version: 1,
          name: 'add the migration note to the learner',
          statements: [ADD_NOTE],
          async down(context) {
            await context.exec(DROP_NOTE);
          },
        },
      ],
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.status).toBe('completed');
    const columns = await fixture.adapter.all<{ name: string }>('PRAGMA table_info(learner)');
    expect(columns.map((column) => column.name)).toContain('migration_note');
  });

  it('rolls the canonical schema back to the state before the migration', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        {
          version: 1,
          name: 'add the migration note to the learner',
          statements: [ADD_NOTE],
          async down(context) {
            await context.exec(DROP_NOTE);
          },
        },
      ],
      now: () => FIXED_NOW,
    });
    await runner.run();

    const result = await runner.rollbackTo(0);

    expect(result.status).toBe('completed');
    const columns = await fixture.adapter.all<{ name: string }>('PRAGMA table_info(learner)');
    expect(columns.map((column) => column.name)).not.toContain('migration_note');
  });

  it('dumps and restores the canonical schema', async () => {
    const institution = validFixtures.institution as unknown as Record<string, string>;
    const institutionColumns = Object.keys(institution);
    await fixture.adapter.run(
      `INSERT INTO institution (${institutionColumns.map((column) => `"${column}"`).join(', ')})
       VALUES (${institutionColumns.map(() => '?').join(', ')})`,
      institutionColumns.map((column) => institution[column])
    );

    const strategy = createDumpBackupStrategy();
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        {
          version: 1,
          name: 'add the migration note to the learner',
          destructive: true,
          statements: [ADD_NOTE],
        },
      ],
      backup: strategy,
      now: () => FIXED_NOW,
    });

    const result = await runner.run();
    expect(result.status).toBe('completed');
    expect(result.backups).toHaveLength(1);

    await strategy.restore(result.backups[0], fixture.adapter);

    // The canonical tables are back, with the row they held, and without the column the
    // migration added.
    const tables = await readTableNames(fixture.adapter);
    expect(tables).toContain('learner');
    expect(tables).toContain('institution');
    expect(await readRows(fixture.adapter, 'institution')).toHaveLength(1);

    const columns = await fixture.adapter.all<{ name: string }>('PRAGMA table_info(learner)');
    expect(columns.map((column) => column.name)).not.toContain('migration_note');
  });

  it('keeps the migrations of two runners over one database in step', async () => {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();

    const first = createMigrationRunner({
      adapter,
      migrations: [
        {
          version: 1,
          name: 'add the gadget table',
          statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY)'],
        },
      ],
      now: () => FIXED_NOW,
    });
    expect((await first.run()).status).toBe('completed');

    const second = createMigrationRunner({
      adapter,
      migrations: [
        {
          version: 1,
          name: 'add the gadget table',
          statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY)'],
        },
        {
          version: 2,
          name: 'add the widget table',
          statements: ['CREATE TABLE widget (id TEXT PRIMARY KEY)'],
        },
      ],
      now: () => FIXED_NOW,
    });
    const result = await second.run();

    expect(result.status).toBe('completed');
    expect(result.skipped.map((entry) => entry.version)).toEqual([1]);
    expect(result.applied.map((entry) => entry.version)).toEqual([2]);

    await adapter.close();
  });
});
