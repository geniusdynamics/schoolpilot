// ABOUTME: Tests the pre-migration backup against a real SQLite database: the backup that is
// ABOUTME: taken, where it is recorded, the retention window and restoring it.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDumpBackupStrategy,
  createMigrationRunner,
  type MigrationBackup,
} from '@/data/migrations';

import {
  createFixtureAdapter,
  createTableMigration,
  readRows,
  readTableNames,
  type MigrationFixture,
} from './fixtures';

const FIXED_NOW = new Date('2026-10-20T08:00:00.000Z');

describe('the pre-migration backup', () => {
  let fixture: MigrationFixture;

  beforeEach(async () => {
    fixture = await createFixtureAdapter();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it('takes a backup before a destructive migration and records where it lives', async () => {
    const strategy = createDumpBackupStrategy();
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'destructive migration', 'gadget', { destructive: true }),
      ],
      backup: strategy,
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.status).toBe('completed');
    expect(result.backups).toHaveLength(1);
    const backup = result.backups[0];
    expect(backup.kind).toBe('dump');
    expect(backup.version).toBe(1);
    expect(backup.migrationName).toBe('destructive migration');
    expect(backup.location.length).toBeGreaterThan(0);

    const recorded = await fixture.adapter.all<{
      id: string;
      version: number;
      location: string;
    }>('SELECT id, version, location FROM _migration_backups');
    expect(recorded).toHaveLength(1);
    expect(recorded[0].id).toBe(backup.id);
    expect(recorded[0].location).toBe(backup.location);
  });

  it('takes no backup for a migration that is not destructive', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [createTableMigration(1, 'safe migration', 'gadget')],
      backup: createDumpBackupStrategy(),
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.status).toBe('completed');
    expect(result.backups).toEqual([]);
  });

  it('takes a backup before every migration when the policy says so', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createTableMigration(2, 'second table', 'widget'),
      ],
      backup: createDumpBackupStrategy(),
      backupPolicy: 'always',
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.backups).toHaveLength(2);
  });

  it('takes no backup when the policy opts out', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'destructive migration', 'gadget', { destructive: true }),
      ],
      backup: createDumpBackupStrategy(),
      backupPolicy: 'never',
      now: () => FIXED_NOW,
    });

    const result = await runner.run();

    expect(result.backups).toEqual([]);
    const recorded = await fixture.adapter.all<{ id: string }>(
      'SELECT id FROM _migration_backups'
    );
    expect(recorded).toEqual([]);
  });

  it('restores the database the backup was taken from', async () => {
    const strategy = createDumpBackupStrategy();
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createTableMigration(2, 'destructive migration', 'widget', { destructive: true }),
      ],
      backup: strategy,
      now: () => FIXED_NOW,
    });

    const result = await runner.run();
    expect(result.status).toBe('completed');
    expect(await readTableNames(fixture.adapter)).toContain('widget');

    const backup = result.backups[0];
    await strategy.restore(backup, fixture.adapter);

    // The restore brought the database back to the state before the destructive migration:
    // the widget table is gone, the gadget table and its row are back.
    const tables = await readTableNames(fixture.adapter);
    expect(tables).not.toContain('widget');
    expect(tables).toContain('gadget');
    expect(await readRows(fixture.adapter, 'gadget')).toHaveLength(1);

    // The ledger came back with the backup, so the migration runs again.
    const ledger = await fixture.adapter.all<{ version: number }>(
      'SELECT version FROM _migrations ORDER BY version'
    );
    expect(ledger.map((row) => row.version)).toEqual([1]);
  });

  it('takes a backup before a rollback that undoes a destructive migration', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createTableMigration(2, 'destructive migration', 'widget', { destructive: true }),
      ],
      backup: createDumpBackupStrategy(),
      now: () => FIXED_NOW,
    });
    await runner.run();

    const before = await fixture.adapter.all<{ id: string }>(
      'SELECT id FROM _migration_backups'
    );
    expect(before).toHaveLength(1);

    const result = await runner.rollbackTo(1);
    expect(result.status).toBe('completed');

    // The rollback took a backup of its own, so it can be undone.
    const after = await fixture.adapter.all<{ id: string }>(
      'SELECT id FROM _migration_backups'
    );
    expect(after).toHaveLength(2);
  });

  it('takes no backup before a rollback that undoes nothing destructive', async () => {
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget'),
        createTableMigration(2, 'second table', 'widget'),
      ],
      backup: createDumpBackupStrategy(),
      now: () => FIXED_NOW,
    });
    await runner.run();

    const before = await fixture.adapter.all<{ id: string }>(
      'SELECT id FROM _migration_backups'
    );
    expect(before).toHaveLength(0);

    const result = await runner.rollbackTo(1);
    expect(result.status).toBe('completed');

    const after = await fixture.adapter.all<{ id: string }>(
      'SELECT id FROM _migration_backups'
    );
    expect(after).toHaveLength(0);
  });

  it('keeps the newest backups and discards the ones that fall out of the window', async () => {
    const discarded: string[] = [];
    const strategy = {
      ...createDumpBackupStrategy(),
      async discard(backup: MigrationBackup) {
        discarded.push(backup.id);
      },
    };
    const runner = createMigrationRunner({
      adapter: fixture.adapter,
      migrations: [
        createTableMigration(1, 'first table', 'gadget', { destructive: true }),
        createTableMigration(2, 'second table', 'widget', { destructive: true }),
        createTableMigration(3, 'third table', 'sprocket', { destructive: true }),
      ],
      backup: strategy,
      backupRetention: 2,
      now: () => FIXED_NOW,
    });

    await runner.run();

    const recorded = await fixture.adapter.all<{ id: string }>(
      'SELECT id FROM _migration_backups ORDER BY created_at, id'
    );
    expect(recorded).toHaveLength(2);
    expect(discarded).toHaveLength(1);
  });
});
