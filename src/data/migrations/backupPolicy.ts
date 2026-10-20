// ABOUTME: When the framework takes a backup and what it keeps: the policy that decides, the
// ABOUTME: export that runs and the retention window that discards.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { MigrationError, errorMessage } from './errors';
import { readBackups, recordBackup, removeBackup } from './ledger';
import type {
  BackupPolicy,
  Migration,
  MigrationBackup,
  MigrationBackupStrategy,
  MigrationDescriptor,
  MigrationEvent,
} from './types';

/** What the backup policy needs from the runner that owns it. */
export interface BackupHost {
  readonly adapter: SqliteAdapter;
  readonly backup?: MigrationBackupStrategy;
  readonly policy: BackupPolicy;
  readonly retention: number;
  readonly clock: () => Date;
  emit(event: MigrationEvent): void;
}

/** True when the policy asks for a backup before this migration runs. */
export function needsBackup(policy: BackupPolicy, migration: Migration): boolean {
  if (policy === 'never') return false;
  if (policy === 'always') return true;
  return migration.destructive === true;
}

/**
 * True when the policy asks for a backup before these migrations are undone.
 *
 * A rollback that destroys data needs a backup just as much as a migration that does, so
 * the decision covers every migration the rollback is about to undo.
 */
export function rollbackNeedsBackup(
  policy: BackupPolicy,
  migrations: readonly Migration[]
): boolean {
  if (policy === 'never') return false;
  if (policy === 'always') return true;
  return migrations.some((migration) => migration.destructive === true);
}

/** Exports the database and records where the export landed. */
async function capture(
  host: BackupHost,
  descriptor: MigrationDescriptor
): Promise<MigrationBackup> {
  let taken: MigrationBackup;
  try {
    taken = await (host.backup as MigrationBackupStrategy).take(host.adapter, descriptor);
  } catch (error) {
    throw new MigrationError(
      `The backup before migration ${descriptor.version} (${descriptor.name}) failed: ${errorMessage(error)}`,
      {
        code: 'backup_failed',
        version: descriptor.version,
        migrationName: descriptor.name,
        cause: error,
      }
    );
  }
  // The runner stamps the backup with its own clock, so the record of the backup and the
  // record of the migration carry the same time.
  const backup: MigrationBackup = { ...taken, createdAt: host.clock().toISOString() };
  await recordBackup(host.adapter, backup);
  host.emit({ type: 'backup_created', backup });
  return backup;
}

/** Takes a backup before a migration runs, when the policy asks for one. */
export async function takeBackup(
  host: BackupHost,
  migration: Migration
): Promise<MigrationBackup | undefined> {
  if (!host.backup) return undefined;
  if (!needsBackup(host.policy, migration)) return undefined;
  const backup = await capture(host, {
    version: migration.version,
    name: migration.name,
  });
  await pruneBackups(host);
  return backup;
}

/**
 * Takes a backup before a rollback undoes anything.
 *
 * The backup covers the migrations the rollback is about to undo, so a rollback that
 * destroys data can be undone itself.
 */
export async function takeRollbackBackup(
  host: BackupHost,
  migrations: readonly Migration[]
): Promise<MigrationBackup | undefined> {
  if (!host.backup) return undefined;
  if (!rollbackNeedsBackup(host.policy, migrations)) return undefined;
  const newest = migrations[0];
  if (!newest) return undefined;
  const backup = await capture(host, {
    version: newest.version,
    name: newest.name,
  });
  await pruneBackups(host);
  return backup;
}

/** Discards the backups that fell out of the retention window. */
export async function pruneBackups(host: BackupHost): Promise<void> {
  const backups = await readBackups(host.adapter);
  const excess = backups.length - host.retention;
  if (excess <= 0) return;
  for (const backup of backups.slice(0, excess)) {
    if (host.backup?.discard) {
      await host.backup.discard(backup);
    }
    await removeBackup(host.adapter, backup.id);
  }
}
