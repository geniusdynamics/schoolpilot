// ABOUTME: Tests the migration runner against a real SQLite database: the ordered apply, the
// ABOUTME: no-op re-run, the failed migration, the resume path, the ledger and the rollback.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createMigrationRunner,
  MIGRATIONS_TABLE,
  MigrationError,
  type Migration,
  type MigrationEvent,
} from '@/data/migrations';

import {
  createFailingMigration,
  createFixtureAdapter,
  createIrreversibleMigration,
  createTableMigration,
  readRows,
  readTableNames,
  type MigrationFixture,
} from './fixtures';

const FIXED_NOW = new Date('2026-10-20T08:00:00.000Z');

describe('the migration runner', () => {
  let fixture: MigrationFixture;

  beforeEach(async () => {
    fixture = await createFixtureAdapter();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it('applies every migration in version order and records it in the ledger', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(2, 'second table', 'widget'),
        createTableMigration(1, 'first table', 'gadget'),
      ],
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.status).toBe('completed');
    expect(result.applied.map((entry) => entry.version)).toEqual([1, 2]);
    expect(await readTableNames(fixture.adapter)).toEqual(
      expect.arrayContaining(['gadget', 'widget'])
    );

    const ledger = await fixture.adapter.all<{
      version: number;
      name: string;
      checksum: string;
      checksum_kind: string;
      applied_at: string;
    }>(
      `SELECT version, name, checksum, checksum_kind, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY version`
    );

    expect(ledger.map((row) => row.version)).toEqual([1, 2]);
    expect(ledger.map((row) => row.name)).toEqual(['first table', 'second table']);
    expect(ledger.every((row) => row.checksum.length > 0)).toBe(true);
    expect(ledger.every((row) => row.checksum_kind === 'declared')).toBe(true);
    expect(ledger.every((row) => row.applied_at === FIXED_NOW.toISOString())).toBe(true);
  });

  it('is a no-op when every migration is already applied', async () => {
    const migrations = [createTableMigration(1, 'first table', 'gadget')];
    const first = createMigrationRunner({
      adapter: fixture.adapter,
      migrations,
      now: () => FIXED_NOW,
    });
    await first.run();

    const events: MigrationEvent[] = [];
    const second = createMigrationRunner({
      adapter: fixture.adapter,
      migrations,
      now: () => FIXED_NOW,
      onEvent: (event) => events.push(event),
    });
    const result = await second.run();

    expect(result.status).toBe('noop');
    expect(result.applied).toEqual([]);
    expect(result.skipped.map((entry) => entry.version)).toEqual([1]);
    expect(events.map((event) => event.type)).toEqual(['run_started', 'run_completed']);
  });

  it('leaves the schema consistent when a migration throws', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createFailingMigration(2, 'broken migration', 'the widget table is missing'),
      ],
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.status).toBe('failed');
    expect(result.failed?.version).toBe(2);
    expect(result.failed?.error).toContain('the widget table is missing');

    // The migration that ran before the failure stays applied.
    const ledger = await fixture.adapter.all<{ version: number }>(
      `SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`
    );
    expect(ledger.map((row) => row.version)).toEqual([1]);

    // The failed migration left no table behind and no row in the ledger.
    expect(await readTableNames(fixture.adapter)).not.toContain('widget');

    const attempts = await fixture.adapter.all<{
      version: number;
      status: string;
      error: string;
    }>(`SELECT version, status, error FROM _migration_attempts`);
    expect(attempts).toEqual([
      { version: 2, status: 'failed', error: 'the widget table is missing' },
    ]);
  });

  it('retries a failed migration on the next run and applies it', async () => {
    const broken = createFailingMigration(2, 'broken migration');
    const first = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [broken],
      now: () => FIXED_NOW,
    });
    expect((await first.run()).status).toBe('failed');

    // The retry runs the same migration, now with a body that succeeds.
    const fixed = createTableMigration(2, 'broken migration', 'widget');
    const second = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [fixed],
      now: () => FIXED_NOW,
    });
    const result = await second.resume();

    expect(result.status).toBe('completed');
    expect(result.applied.map((entry) => entry.version)).toEqual([2]);
    expect(await readRows(fixture.adapter, 'widget')).toHaveLength(1);

    const attempts = await fixture.adapter.all<{ version: number }>(
      `SELECT version FROM _migration_attempts`
    );
    expect(attempts).toEqual([]);
  });

  it('refuses to run a migration whose declared SQL changed', async () => {
    const migrations: Migration[] = [
      {
        version: 1,
        name: 'first table',
        statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY)'],
      },
    ];
    const first = createMigrationRunner({
      adapter: fixture.adapter,
      migrations,
      now: () => FIXED_NOW,
    });
    await first.run();

    const changed = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        {
          version: 1,
          name: 'first table',
          statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY, extra TEXT)'],
        },
      ],
      now: () => FIXED_NOW,
    });
    const result = await changed.run();

    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('checksum');
  });

  it('refuses a migration that runs something other than what it declared', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        {
          version: 1,
          name: 'a migration that lies',
          statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY)'],
          async up(context) {
            await context.exec('CREATE TABLE widget (id TEXT PRIMARY KEY)');
          },
        },
      ],
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('declared');

    // The table the body really ran is rolled back with it.
    expect(await readTableNames(fixture.adapter)).not.toContain('widget');
    const ledger = await fixture.adapter.all<{ version: number }>(
      `SELECT version FROM ${MIGRATIONS_TABLE}`
    );
    expect(ledger).toEqual([]);
  });

  it('refuses a migration that declares neither its SQL nor a checksum', () => {
    expect(() =>
      createMigrationRunner({
        adapter: fixture.adapter,
        migrations: [{ version: 1, name: 'no identity', async up() {} }],
      })
    ).toThrow(MigrationError);
  });

  it('records the kind of the checksum it took', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        {
          version: 2,
          name: 'a migration with dynamic SQL',
          checksum: 'the identity of the second migration',
          async up(context) {
            await context.exec('CREATE TABLE widget (id TEXT PRIMARY KEY)');
          },
        },
      ],
      now: () => FIXED_NOW,
    });
    await runner.run();

    const ledger = await fixture.adapter.all<{ version: number; checksum_kind: string }>(
      `SELECT version, checksum_kind FROM ${MIGRATIONS_TABLE} ORDER BY version`
    );
    expect(ledger).toEqual([
      { version: 1, checksum_kind: 'declared' },
      { version: 2, checksum_kind: 'explicit' },
    ]);
  });

  it('lets an explicit checksum be tightened into a declared one', async () => {
    const explicit: Migration = {
      version: 1,
      name: 'first table',
      checksum: 'the identity of the first build',
      async up(context) {
        await context.exec('CREATE TABLE gadget (id TEXT PRIMARY KEY)');
      },
    };
    const first = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [explicit],
      now: () => FIXED_NOW,
    });
    await first.run();

    const ledger = await fixture.adapter.all<{ checksum_kind: string }>(
      `SELECT checksum_kind FROM ${MIGRATIONS_TABLE}`
    );
    expect(ledger).toEqual([{ checksum_kind: 'explicit' }]);

    // The next build declares the SQL of the same migration.
    const declared: Migration = {
      version: 1,
      name: 'first table',
      statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY)'],
      async up(context) {
        await context.exec('CREATE TABLE gadget (id TEXT PRIMARY KEY)');
      },
    };
    const second = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [declared],
      now: () => FIXED_NOW,
    });
    const result = await second.run();

    expect(result.status).toBe('noop');

    const tightened = await fixture.adapter.all<{ checksum_kind: string }>(
      `SELECT checksum_kind FROM ${MIGRATIONS_TABLE}`
    );
    expect(tightened).toEqual([{ checksum_kind: 'declared' }]);
  });

  it('refuses to run against a database that holds an unknown migration', async () => {
    const first = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [createTableMigration(7, 'future migration', 'gadget')],
      now: () => FIXED_NOW,
    });
    await first.run();

    const older = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [createTableMigration(1, 'first table', 'gadget')],
      now: () => FIXED_NOW,
    });
    const result = await older.run();

    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('does not know');
  });

  it('emits the progress events of a run', async () => {
    const events: MigrationEvent[] = [];
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createTableMigration(2, 'second table', 'widget'),
      ],
      now: () => FIXED_NOW,
      onEvent: (event) => events.push(event),
    });

    await runner.run();

    expect(events.map((event) => event.type)).toEqual([
      'run_started',
      'migration_started',
      'migration_applied',
      'migration_started',
      'migration_applied',
      'run_completed',
    ]);

    const started = events[1];
    const applied = events[2];
    expect(started).toMatchObject({ version: 1, name: 'first table', index: 1, total: 2 });
    expect(applied).toMatchObject({ version: 1, name: 'first table', index: 1, total: 2 });
    expect(typeof (applied as { durationMs: number }).durationMs).toBe('number');
  });

  it('reports the status of the database', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createTableMigration(2, 'second table', 'widget'),
      ],
      now: () => FIXED_NOW,
    });
    await runner.run();

    const status = await runner.status();

    expect(status.total).toBe(2);
    expect(status.completed).toBe(2);
    expect(status.pending).toBe(0);
    expect(status.phase).toBe('completed');
    expect(status.applied.map((entry) => entry.version)).toEqual([1, 2]);
    expect(status.remaining).toEqual([]);
  });

  it('rolls the database back to a version, newest migration first', async () => {
    const events: MigrationEvent[] = [];
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createTableMigration(2, 'second table', 'widget'),
        createTableMigration(3, 'third table', 'sprocket'),
      ],
      now: () => FIXED_NOW,
      onEvent: (event) => events.push(event),
    });
    await runner.run();

    const result = await runner.rollbackTo(1);

    expect(result.status).toBe('completed');
    expect(result.undone.map((entry) => entry.version)).toEqual([3, 2]);
    expect(await readTableNames(fixture.adapter)).not.toContain('widget');
    expect(await readTableNames(fixture.adapter)).not.toContain('sprocket');
    expect(await readTableNames(fixture.adapter)).toContain('gadget');

    const ledger = await fixture.adapter.all<{ version: number }>(
      `SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`
    );
    expect(ledger.map((row) => row.version)).toEqual([1]);

    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['rollback_started', 'rollback_applied', 'rollback_completed'])
    );
  });

  it('clears the attempt of a migration it rolls back', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [createTableMigration(1, 'first table', 'gadget')],
      now: () => FIXED_NOW,
    });
    await runner.run();

    // An attempt that was left behind by an interrupted run.
    await fixture.adapter.run(
      `INSERT INTO _migration_attempts (version, name, checksum, checksum_kind, status, error, attempted_at)
       VALUES (1, 'first table', 'abc', 'declared', 'running', NULL, ?)`,
      [FIXED_NOW.toISOString()]
    );

    await runner.rollbackTo(0);

    const attempts = await fixture.adapter.all<{ version: number }>(
      `SELECT version FROM _migration_attempts`
    );
    expect(attempts).toEqual([]);

    const status = await runner.status();
    expect(status.interrupted).toEqual([]);
  });

  it('refuses a rollback when a migration above the target cannot be undone', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createIrreversibleMigration(2, 'irreversible migration', 'widget'),
      ],
      now: () => FIXED_NOW,
    });
    await runner.run();

    const result = await runner.rollbackTo(0);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('cannot be rolled back');

    // Nothing changed: the refusal happens before any migration is undone.
    const ledger = await fixture.adapter.all<{ version: number }>(
      `SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`
    );
    expect(ledger.map((row) => row.version)).toEqual([1, 2]);
  });

  it('rejects two migrations that share a version', () => {
    expect(
      () =>
        createMigrationRunner({
          adapter: fixture.adapter,
          migrations: [
            createTableMigration(1, 'first table', 'gadget'),
            createTableMigration(1, 'other table', 'widget'),
          ],
        })
    ).toThrow(MigrationError);
  });
});
