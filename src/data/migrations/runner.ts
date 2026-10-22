// ABOUTME: The migration runner: applies numbered migrations in order, one transaction each,
// ABOUTME: records them in the ledger, backs the database up first and resumes an interrupted run.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import {
  takeBackup,
  takeRollbackBackup,
  type BackupHost,
} from './backupPolicy';
import { compareIdentities, identityMismatchMessage, migrationIdentity } from './checksum';
import { assertDeclaredStatements, createMigrationContext } from './context';
import { MigrationError, errorMessage } from './errors';
import {
  clearAttempt,
  ensureLedgerTables,
  readApplied,
  readAttempts,
  recordApplied,
  recordAttempt,
  updateAppliedIdentity,
} from './ledger';
import {
  assertEveryMigrationHasAnIdentity,
  descriptorOf,
  sortMigrations,
} from './list';
import { rollbackTo, type RollbackHost } from './rollback';
import { createRunnerState, type RunnerState } from './state';
import type {
  AppliedMigration,
  BackupPolicy,
  Migration,
  MigrationAttempt,
  MigrationBackup,
  MigrationBackupStrategy,
  MigrationEvent,
  MigrationRollbackResult,
  MigrationRunResult,
  MigrationStatus,
} from './types';

/** How a runner is built. */
export interface MigrationRunnerOptions {
  /** The storage adapter every statement runs on. */
  readonly adapter: SqliteAdapter;
  /** The migrations to run, in any order; the runner sorts them by version. */
  readonly migrations: readonly Migration[];
  /**
   * The versions this build knows, including ones this runner does not run.
   *
   * The ledger is shared by every band of migration, so a runner that runs one band has to know
   * the others: a row it did not write must not be refused as a database written by a newer
   * build. Defaults to the versions of `migrations`, which is the one-band case.
   */
  readonly knownVersions?: readonly number[];
  /** How the database is exported before a destructive migration runs. */
  readonly backup?: MigrationBackupStrategy;
  /** When a backup is taken. Defaults to `destructive`. */
  readonly backupPolicy?: BackupPolicy;
  /** How many backups are kept. Defaults to 5. */
  readonly backupRetention?: number;
  /** Called for every progress event. */
  readonly onEvent?: (event: MigrationEvent) => void;
  /** The clock. Injectable so a caller can pin the timestamps. */
  readonly now?: () => Date;
}

const DEFAULT_RETENTION = 5;

/**
 * The migration runner.
 *
 * Every migration body runs inside one transaction that also writes the ledger row, so the
 * body and the record of it commit together or not at all: an interrupted run leaves the
 * database at the state before the migration, and the next run retries it from the start.
 */
export class MigrationRunner implements BackupHost, RollbackHost {
  readonly adapter: SqliteAdapter;
  /** The migrations the runner knows about, keyed by version. */
  readonly migrations: ReadonlyMap<number, Migration>;
  readonly backup: MigrationBackupStrategy | undefined;
  readonly policy: BackupPolicy;
  readonly retention: number;
  readonly clock: () => Date;
  readonly state: RunnerState = createRunnerState();

  private readonly list: readonly Migration[];
  /** The versions this runner applies. */
  private readonly owned: ReadonlySet<number>;
  /** The versions this build knows, including the bands this runner does not apply. */
  private readonly known: ReadonlySet<number>;
  private readonly listeners = new Set<(event: MigrationEvent) => void>();

  constructor(options: MigrationRunnerOptions) {
    this.adapter = options.adapter;
    this.list = sortMigrations(options.migrations);
    this.migrations = new Map(this.list.map((migration) => [migration.version, migration]));
    this.owned = new Set(this.list.map((migration) => migration.version));
    this.known = new Set(options.knownVersions ?? this.owned);
    this.backup = options.backup;
    this.policy = options.backupPolicy ?? 'destructive';
    this.retention = Math.max(0, options.backupRetention ?? DEFAULT_RETENTION);
    this.clock = options.now ?? (() => new Date());
    if (options.onEvent) this.listeners.add(options.onEvent);

    // Every migration has to have an identity before the runner starts: a migration that
    // declares neither its SQL nor a checksum cannot be told apart from another one.
    assertEveryMigrationHasAnIdentity(this.list);
  }

  /** The live status of the runner. */
  get current(): MigrationStatus {
    const state = this.state;
    const total = this.list.length;
    return {
      phase: state.phase,
      total,
      completed: state.applied.length,
      pending: state.remaining.length,
      current: state.current,
      applied: state.applied,
      remaining: state.remaining,
      interrupted: state.interrupted,
      error: state.error,
      failed: state.failed,
      backup: state.backup,
    };
  }

  /** Subscribes to the progress events. Returns the unsubscribe. */
  subscribe(listener: (event: MigrationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Reads the ledger and reports where the database stands. */
  async status(): Promise<MigrationStatus> {
    await ensureLedgerTables(this.adapter);
    // The ledger is shared, so a runner reports only the migrations it owns: a data migration
    // from the other band is not part of this runner's count.
    const applied = (await readApplied(this.adapter)).filter((entry) =>
      this.owned.has(entry.version)
    );
    const attempts = await readAttempts(this.adapter);
    const appliedVersions = new Set(applied.map((entry) => entry.version));

    this.state.applied = applied;
    this.state.remaining = this.list
      .filter((migration) => !appliedVersions.has(migration.version))
      .map(descriptorOf);
    this.state.interrupted = attempts
      .filter((attempt) => this.owned.has(attempt.version) && !appliedVersions.has(attempt.version))
      .map(descriptorOf);
    return this.current;
  }

  /**
   * Applies every migration the ledger does not record yet.
   *
   * The migrations run in version order. A migration that throws is rolled back with its
   * ledger row, the run stops there, and the result says which migration failed. Running
   * again retries it: an unrecorded migration was never applied.
   */
  async run(): Promise<MigrationRunResult> {
    await ensureLedgerTables(this.adapter);

    const applied = await readApplied(this.adapter);
    const attempts = await readAttempts(this.adapter);
    const appliedByVersion = new Map(applied.map((entry) => [entry.version, entry]));
    const appliedVersions = new Set(appliedByVersion.keys());

    // An attempt of a migration that is in the ledger is stale: the migration committed and
    // the process died before the attempt was cleared. The ledger wins.
    for (const attempt of attempts) {
      if (appliedVersions.has(attempt.version)) {
        await clearAttempt(this.adapter, attempt.version);
      }
    }

    const unknown = applied.filter((entry) => !this.known.has(entry.version));
    if (unknown.length > 0) {
      return this.fail(
        new MigrationError(
          `The database records migration ${unknown[0].version} (${unknown[0].name}), which this build does not know`,
          {
            code: 'unknown_migration',
            version: unknown[0].version,
            migrationName: unknown[0].name,
          }
        )
      );
    }

    for (const migration of this.list) {
      const record = appliedByVersion.get(migration.version);
      if (!record) continue;
      const identity = migrationIdentity(migration);
      const recorded = { kind: record.checksumKind, value: record.checksum };
      const decision = compareIdentities(recorded, identity);
      if (decision === 'mismatch') {
        return this.fail(
          new MigrationError(
            identityMismatchMessage(migration.version, migration.name, recorded, identity),
            {
              code: 'checksum_mismatch',
              version: migration.version,
              migrationName: migration.name,
            }
          )
        );
      }
      if (decision === 'tighten') {
        // The migration declared its SQL after it had shipped. The ledger follows, so the
        // next run compares the declared identity.
        await updateAppliedIdentity(
          this.adapter,
          migration.version,
          identity.value,
          identity.kind
        );
        appliedByVersion.set(migration.version, {
          ...record,
          checksum: identity.value,
          checksumKind: identity.kind,
        });
      }
    }

    const appliedList = [...appliedByVersion.values()]
      .filter((entry) => this.owned.has(entry.version))
      .sort((left, right) => left.version - right.version);
    const pending = this.list.filter(
      (migration) => !appliedVersions.has(migration.version)
    );
    const interrupted = attempts
      .filter((attempt) => this.owned.has(attempt.version) && !appliedVersions.has(attempt.version))
      .map(descriptorOf);

    this.state.phase = 'running';
    this.state.current = undefined;
    this.state.applied = appliedList;
    this.state.remaining = pending.map(descriptorOf);
    this.state.interrupted = interrupted;
    this.state.error = undefined;
    this.state.failed = undefined;
    this.state.backup = undefined;

    this.emit({
      type: 'run_started',
      total: this.list.length,
      pending: pending.length,
    });

    if (pending.length === 0) {
      this.state.phase = 'completed';
      this.emit({ type: 'run_completed', applied: 0, skipped: appliedList.length });
      return { status: 'noop', applied: [], skipped: appliedList, backups: [] };
    }

    const newlyApplied: AppliedMigration[] = [];
    const backups: MigrationBackup[] = [];

    for (const [index, migration] of pending.entries()) {
      const descriptor = descriptorOf(migration);
      this.state.current = descriptor;

      let backup: MigrationBackup | undefined;
      try {
        backup = await takeBackup(this, migration);
      } catch (error) {
        const failure =
          error instanceof MigrationError
            ? error
            : new MigrationError(errorMessage(error), {
                code: 'backup_failed',
                cause: error,
              });
        this.state.phase = 'failed';
        this.state.current = undefined;
        this.state.failed = { ...descriptor, error: failure.message };
        this.state.error = failure.message;
        return this.fail(failure);
      }
      if (backup) {
        backups.push(backup);
        this.state.backup = backup;
      }

      const identity = migrationIdentity(migration);
      const attempt: MigrationAttempt = {
        version: migration.version,
        name: migration.name,
        checksum: identity.value,
        checksumKind: identity.kind,
        status: 'running',
        attemptedAt: this.clock().toISOString(),
      };
      await recordAttempt(this.adapter, attempt);

      this.emit({
        type: 'migration_started',
        version: migration.version,
        name: migration.name,
        index: index + 1,
        total: pending.length,
      });

      const startedAt = Date.now();
      try {
        await this.adapter.transaction(async (tx) => {
          const capture = createMigrationContext(migration, tx);
          if (migration.up) {
            await migration.up(capture.context);
          } else {
            for (const statement of migration.statements ?? []) {
              await capture.context.exec(statement);
            }
          }
          assertDeclaredStatements(migration, capture.statements);
          await recordApplied(tx, {
            version: migration.version,
            name: migration.name,
            checksum: identity.value,
            checksumKind: identity.kind,
            appliedAt: this.clock().toISOString(),
          });
        });
      } catch (error) {
        await recordAttempt(this.adapter, {
          ...attempt,
          status: 'failed',
          error: errorMessage(error),
        });
        // A framework error already names the migration; an error the body threw does not.
        const failure = new MigrationError(
          error instanceof MigrationError
            ? error.message
            : `Migration ${migration.version} (${migration.name}) failed: ${errorMessage(error)}`,
          {
            code: error instanceof MigrationError ? error.code : 'migration_failed',
            version: migration.version,
            migrationName: migration.name,
            cause: error,
          }
        );
        this.state.phase = 'failed';
        this.state.current = undefined;
        this.state.failed = { ...descriptor, error: failure.message };
        this.state.error = failure.message;
        this.emit({
          type: 'migration_failed',
          version: migration.version,
          name: migration.name,
          error: failure.message,
        });
        this.emit({
          type: 'run_failed',
          version: migration.version,
          name: migration.name,
          error: failure.message,
        });
        return {
          status: 'failed',
          applied: newlyApplied,
          skipped: appliedList,
          backups,
          failed: {
            version: migration.version,
            name: migration.name,
            error: failure.message,
          },
        };
      }

      await clearAttempt(this.adapter, migration.version);
      const record: AppliedMigration = {
        version: migration.version,
        name: migration.name,
        checksum: identity.value,
        checksumKind: identity.kind,
        appliedAt: this.clock().toISOString(),
      };
      newlyApplied.push(record);
      this.state.applied = [...this.state.applied, record];
      this.state.remaining = this.state.remaining.filter(
        (entry) => entry.version !== migration.version
      );
      this.emit({
        type: 'migration_applied',
        version: migration.version,
        name: migration.name,
        index: index + 1,
        total: pending.length,
        durationMs: Date.now() - startedAt,
      });
    }

    this.state.phase = 'completed';
    this.state.current = undefined;
    this.emit({
      type: 'run_completed',
      applied: newlyApplied.length,
      skipped: appliedList.length,
    });
    return { status: 'completed', applied: newlyApplied, skipped: appliedList, backups };
  }

  /**
   * The documented resume path.
   *
   * It is the same work as {@link MigrationRunner.run}: a migration the ledger does not
   * record was never applied, so it is retried from the start. A migration that was
   * interrupted half-way left its work inside a transaction that never committed, so the
   * database is still at the state before it.
   */
  async resume(): Promise<MigrationRunResult> {
    return this.run();
  }

  /**
   * Undoes every applied migration above `version`.
   *
   * The migrations are undone newest first, each in its own transaction, and the ledger row
   * goes with them. A migration above the target without a `down` refuses the whole
   * rollback: nothing changes.
   */
  async rollbackTo(version: number): Promise<MigrationRollbackResult> {
    return rollbackTo(this, version);
  }

  /** Takes the backup that covers a rollback, when the policy asks for one. */
  async takeRollbackBackup(
    migrations: readonly Migration[]
  ): Promise<MigrationBackup | undefined> {
    return takeRollbackBackup(this, migrations);
  }

  /** Records a framework-level failure and reports it. */
  private fail(error: MigrationError): MigrationRunResult {
    this.state.phase = 'failed';
    this.state.error = error.message;
    this.emit({
      type: 'run_failed',
      version: error.version ?? null,
      name: error.migrationName ?? null,
      error: error.message,
    });
    return {
      status: 'failed',
      applied: [],
      skipped: [],
      backups: [],
      failed:
        error.version === undefined
          ? undefined
          : {
              version: error.version,
              name: error.migrationName ?? `migration ${error.version}`,
              error: error.message,
            },
    };
  }

  /** Hands an event to every listener. A listener that throws does not stop the run. */
  emit(event: MigrationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A listener that throws must not stop the migration run.
      }
    }
  }
}

/** Builds a runner over an adapter and a list of migrations. */
export function createMigrationRunner(options: MigrationRunnerOptions): MigrationRunner {
  return new MigrationRunner(options);
}
