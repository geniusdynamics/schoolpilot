// ABOUTME: Tests that an interrupted migration resumes: a second process dies half-way
// ABOUTME: through a migration, and the next run rolls the partial work back and retries it.

import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMigrationRunner } from '@/data/migrations';
import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

import {
  createFileFixtureAdapter,
  createTableMigration,
  readRows,
  readTableNames,
  type MigrationFixture,
} from './fixtures';

const run = promisify(execFile);
const FIXED_NOW = new Date('2026-10-20T08:00:00.000Z');
const INTERRUPT_SCRIPT = join(__dirname, 'fixtures', 'interrupt.cjs');

describe('an interrupted migration', () => {
  let fixture: MigrationFixture;

  beforeEach(async () => {
    fixture = await createFileFixtureAdapter();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it('rolls the partial work back and retries the migration on the next run', async () => {
    const migrations = [
      createTableMigration(1, 'first table', 'gadget'),
      createTableMigration(2, 'second table', 'widget'),
    ];

    // The first migration runs and is recorded.
    const first = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [migrations[0]],
      now: () => FIXED_NOW,
    });
    expect((await first.run()).status).toBe('completed');
    await fixture.adapter.close();

    // A second process starts the second migration and dies half-way through it.
    const interruption = await run(process.execPath, [
      INTERRUPT_SCRIPT,
      fixture.filename,
      '2',
      'second table',
      'checksum-of-the-second-migration',
      'widget',
    ]).catch((error: { code?: number; stderr?: string }) => error);
    expect(interruption).toMatchObject({ code: 17 });

    const adapter: SqliteAdapter = createNodeSqliteAdapter({ filename: fixture.filename });
    await adapter.open();

    // The interrupted transaction was rolled back: the table the migration was creating is
    // not in the database, and the migration was not recorded.
    expect(await readTableNames(adapter)).not.toContain('widget');

    const ledger = await adapter.all<{ version: number }>(
      'SELECT version FROM _migrations ORDER BY version'
    );
    expect(ledger.map((row) => row.version)).toEqual([1]);

    // The attempt the interrupted process left behind says what happened.
    const attempts = await adapter.all<{ version: number; status: string }>(
      'SELECT version, status FROM _migration_attempts'
    );
    expect(attempts).toEqual([{ version: 2, status: 'running' }]);

    // The next run retries the migration, and this time it completes.
    const second = createMigrationRunner({
      adapter,
      migrations,
      now: () => FIXED_NOW,
    });
    const status = await second.status();
    expect(status.interrupted.map((entry) => entry.version)).toEqual([2]);

    const result = await second.resume();

    expect(result.status).toBe('completed');
    expect(result.applied.map((entry) => entry.version)).toEqual([2]);
    expect(await readTableNames(adapter)).toContain('widget');
    expect(await readRows(adapter, 'widget')).toHaveLength(1);

    const applied = await adapter.all<{ version: number }>(
      'SELECT version FROM _migrations ORDER BY version'
    );
    expect(applied.map((row) => row.version)).toEqual([1, 2]);

    const attemptsAfter = await adapter.all<{ version: number }>(
      'SELECT version FROM _migration_attempts'
    );
    expect(attemptsAfter).toEqual([]);

    await adapter.close();
  });

  it('leaves the database consistent when the interrupted migration is rolled back', async () => {
    const migrations = [
      createTableMigration(1, 'first table', 'gadget'),
      createTableMigration(2, 'second table', 'widget'),
    ];

    const first = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [migrations[0]],
      now: () => FIXED_NOW,
    });
    await first.run();
    await fixture.adapter.close();

    const interruption = await run(process.execPath, [
      INTERRUPT_SCRIPT,
      fixture.filename,
      '2',
      'second table',
      'checksum-of-the-second-migration',
      'widget',
    ]).catch((error: { code?: number; stderr?: string }) => error);
    expect(interruption).toMatchObject({ code: 17 });

    const adapter = createNodeSqliteAdapter({ filename: fixture.filename });
    await adapter.open();

    // Rolling the database back to the first version undoes nothing, because the second
    // migration was never applied - the ledger does not hold it.
    const runner = createMigrationRunner({
      adapter,
      migrations,
      now: () => FIXED_NOW,
    });
    const result = await runner.rollbackTo(1);

    expect(result.status).toBe('completed');
    expect(result.undone).toEqual([]);

    const ledger = await adapter.all<{ version: number }>(
      'SELECT version FROM _migrations ORDER BY version'
    );
    expect(ledger.map((row) => row.version)).toEqual([1]);
    expect(await readTableNames(adapter)).not.toContain('widget');

    await adapter.close();
  });
});
