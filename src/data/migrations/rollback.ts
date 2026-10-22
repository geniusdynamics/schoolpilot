// ABOUTME: The rollback: undoes the applied migrations above a version, newest first, each
// ABOUTME: in its own transaction, and refuses the whole rollback when one cannot be undone.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { createMigrationContext } from './context';
import { MigrationError, errorMessage } from './errors';
import { clearAttempt, ensureLedgerTables, readApplied, removeApplied } from './ledger';
import type { RunnerState } from './state';
import type {
  AppliedMigration,
  Migration,
  MigrationBackup,
  MigrationEvent,
  MigrationRollbackResult,
} from './types';

/** What the rollback needs from the runner that owns it. */
export interface RollbackHost {
  readonly adapter: SqliteAdapter;
  readonly migrations: ReadonlyMap<number, Migration>;
  readonly state: RunnerState;
  readonly clock: () => Date;
  emit(event: MigrationEvent): void;
  takeRollbackBackup(migrations: readonly Migration[]): Promise<MigrationBackup | undefined>;
}

/**
 * Undoes every applied migration above `version` that this runner knows.
 *
 * The migrations are undone newest first. Each `down` runs in its own transaction, and the
 * ledger row goes with it, so a `down` that throws leaves the database exactly as it was.
 * A migration above the target without a `down` refuses the whole rollback: nothing
 * changes. A rollback to `0` undoes every migration this runner owns; a ledger row from a
 * band the runner does not run is left where it is.
 */
export async function rollbackTo(
  host: RollbackHost,
  version: number
): Promise<MigrationRollbackResult> {
  await ensureLedgerTables(host.adapter);

  const applied = await readApplied(host.adapter);
  // The ledger is shared with the migrations of the other band. A runner undoes what it owns:
  // a data migration the ledger records is not this runner's to drop, and it has no body here.
  const targets = applied
    .filter((entry) => entry.version > version && host.migrations.has(entry.version))
    .sort((left, right) => right.version - left.version);

  if (version !== 0 && !applied.some((entry) => entry.version === version)) {
    const error = new MigrationError(
      `Migration ${version} is not applied, so it cannot be the target of a rollback`,
      { code: 'invalid_migration', version }
    );
    host.state.phase = 'failed';
    host.state.error = error.message;
    return { status: 'failed', undone: [], to: version, error: error.message };
  }

  const reversible = targets.map((target) => host.migrations.get(target.version));
  const irreversible = targets.find(
    (target) => !host.migrations.get(target.version)?.down
  );
  if (irreversible) {
    const error = new MigrationError(
      `Migration ${irreversible.version} (${irreversible.name}) cannot be rolled back because it has no down migration`,
      {
        code: 'not_reversible',
        version: irreversible.version,
        migrationName: irreversible.name,
      }
    );
    host.state.phase = 'failed';
    host.state.error = error.message;
    return { status: 'failed', undone: [], to: version, error: error.message };
  }

  host.emit({
    type: 'rollback_started',
    from: applied.length > 0 ? applied[applied.length - 1].version : 0,
    to: version,
    total: targets.length,
  });

  const backup = await host.takeRollbackBackup(
    reversible.filter((migration): migration is Migration => migration !== undefined)
  );
  if (backup) {
    host.state.backup = backup;
  }

  const undone: AppliedMigration[] = [];
  for (const target of targets) {
    const migration = host.migrations.get(target.version);
    if (!migration?.down) continue;
    host.state.current = { version: migration.version, name: migration.name };
    try {
      await host.adapter.transaction(async (tx) => {
        const capture = createMigrationContext(migration, tx);
        await migration.down?.(capture.context);
        await removeApplied(tx, target.version);
      });
    } catch (error) {
      const message = `Rolling back migration ${target.version} (${target.name}) failed: ${errorMessage(error)}`;
      host.state.phase = 'failed';
      host.state.current = undefined;
      host.state.error = message;
      host.emit({
        type: 'rollback_failed',
        version: target.version,
        name: target.name,
        error: message,
      });
      return { status: 'failed', undone, to: version, error: message };
    }

    // The attempt of the migration that was rolled back is stale: it is no longer applied
    // and it will not be run again, so the row goes.
    await clearAttempt(host.adapter, target.version);

    undone.push(target);
    host.state.applied = host.state.applied.filter(
      (entry) => entry.version !== target.version
    );
    host.state.remaining = [...host.state.remaining, { version: migration.version, name: migration.name }].sort(
      (left, right) => left.version - right.version
    );
    host.emit({ type: 'rollback_applied', version: target.version, name: target.name });
  }

  host.state.phase = 'completed';
  host.state.current = undefined;
  host.emit({ type: 'rollback_completed', to: version });
  return { status: 'completed', undone, to: version };
}
