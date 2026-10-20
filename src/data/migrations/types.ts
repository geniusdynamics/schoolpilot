// ABOUTME: The public types of the migration framework: what a migration is, how it declares
// ABOUTME: its SQL, what the runner reports and which progress events it emits.

import type {
  SqliteAdapter,
  SqliteBindValue,
  SqliteRow,
  SqliteRunResult,
} from '@/data/adapters/sqlite';

/**
 * The handle a migration body uses to read and write.
 *
 * Every statement goes through the context: it carries the transaction the framework
 * opened, so a migration can never write outside it and can never deadlock on the
 * adapter's statement queue.
 */
export interface MigrationContext {
  /** The version of the migration being applied. */
  readonly version: number;
  /** The name of the migration being applied. */
  readonly name: string;
  exec(sql: string): Promise<void>;
  all<T extends object = SqliteRow>(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<T[]>;
  get<T extends object = SqliteRow>(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<T | null>;
  run(sql: string, params?: readonly SqliteBindValue[]): Promise<SqliteRunResult>;
}

/** How the identity of a migration was established. */
export type MigrationChecksumKind =
  /** The migration declared its SQL; the checksum covers it. */
  | 'declared'
  /** The migration declared a checksum of its own; the framework cannot check its SQL. */
  | 'explicit';

/**
 * A numbered migration.
 *
 * The version orders the migrations and identifies one; it is an ordering key, not an
 * entity id. The name is what the progress screen shows.
 */
export interface Migration {
  /** Position in the ordered migration list. Unique, ascending, never reused. */
  readonly version: number;
  /** Human label shown by the progress screen and recorded in the ledger. */
  readonly name: string;
  /**
   * The SQL the migration runs.
   *
   * A migration declares its SQL, and the framework holds it to that declaration: the
   * statements the body runs are captured and compared with these, and a body that runs
   * something else is refused. When the migration declares its SQL and no `up`, the
   * framework runs the statements itself.
   */
  readonly statements?: readonly string[];
  /**
   * The identity of a migration whose SQL cannot be declared.
   *
   * A migration with dynamic SQL has no fixed text to hash, so it states its identity
   * itself. A migration with neither a declared body nor an explicit checksum is refused
   * when the runner is built.
   */
  readonly checksum?: string;
  /**
   * A destructive migration always takes a backup before it runs.
   *
   * Destructive means the migration drops or rewrites data - a dropped column, a rewritten
   * table, a deleted column's rows. The framework cannot tell, so the migration says.
   */
  readonly destructive?: boolean;
  /**
   * Applies the migration. Runs inside the framework's transaction.
   *
   * Optional when the SQL is declared: the framework runs the declared statements then.
   */
  readonly up?: (context: MigrationContext) => Promise<void>;
  /**
   * Undoes the migration.
   *
   * Optional: a migration without a `down` cannot be rolled back. `rollbackTo` refuses the
   * whole rollback when one of the migrations above the target has no `down`. The `down`
   * body is not part of the declaration; the checksum covers the `up` body.
   */
  readonly down?: (context: MigrationContext) => Promise<void>;
}

/** The identity of a migration, without its body. */
export interface MigrationDescriptor {
  readonly version: number;
  readonly name: string;
}

/** A migration the ledger records as applied. */
export interface AppliedMigration {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly checksumKind: MigrationChecksumKind;
  readonly appliedAt: string;
}

/**
 * The outcome of an attempt to apply a migration.
 *
 * `running` means the process died while the migration was in flight; `failed` means the
 * migration threw. Either way the version is not in the ledger, so the next run retries it.
 */
export interface MigrationAttempt {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly checksumKind: MigrationChecksumKind;
  readonly status: 'running' | 'failed';
  readonly error?: string;
  readonly attemptedAt: string;
}

/** A backup taken before a migration ran. */
export interface MigrationBackup {
  /** Opaque id of the backup. */
  readonly id: string;
  /** The migration the backup was taken for. */
  readonly version: number;
  /** The name of the migration the backup was taken for. */
  readonly migrationName: string;
  /** How the database was exported. */
  readonly kind: 'file' | 'dump';
  /** Where the backup lives: a path, or the logical location of a stored dump. */
  readonly location: string;
  /** When the backup was taken. */
  readonly createdAt: string;
  /** The size of the backup in bytes, when the strategy knows it. */
  readonly bytes?: number;
}

/**
 * How the database is exported before a migration runs.
 *
 * The framework owns the policy - when to back up and how many backups to keep - and the
 * strategy owns the mechanics, so a browser build can store the snapshot in OPFS while a
 * node build copies the database file.
 */
export interface MigrationBackupStrategy {
  /** Exports the database. Called before the migration's transaction opens. */
  take(adapter: SqliteAdapter, migration: MigrationDescriptor): Promise<MigrationBackup>;
  /** Restores a backup into the database the adapter is connected to. */
  restore(backup: MigrationBackup, adapter: SqliteAdapter): Promise<void>;
  /** Removes the artefact of a backup that left the retention window. */
  discard?(backup: MigrationBackup): Promise<void>;
}

/** When the framework takes a backup. */
export type BackupPolicy =
  /** Before every migration marked destructive. The default. */
  | 'destructive'
  /** Before every migration. */
  | 'always'
  /** Never. The opt-out. */
  | 'never';

/** The phase a migration run is in. */
export type MigrationPhase = 'idle' | 'running' | 'completed' | 'failed';

/** What the progress screen renders. */
export interface MigrationStatus {
  readonly phase: MigrationPhase;
  /** Every migration the runner knows about. */
  readonly total: number;
  /** How many of them the ledger records as applied. */
  readonly completed: number;
  /** How many of them are still to apply. */
  readonly pending: number;
  /** The migration being applied right now. */
  readonly current?: MigrationDescriptor;
  /** The migrations the ledger records, in version order. */
  readonly applied: readonly AppliedMigration[];
  /** The migrations still to apply, in version order. */
  readonly remaining: readonly MigrationDescriptor[];
  /** The versions whose previous attempt was interrupted and will be retried. */
  readonly interrupted: readonly MigrationDescriptor[];
  /** The failure that stopped the run. */
  readonly error?: string;
  /** The migration that failed. */
  readonly failed?: MigrationDescriptor & { readonly error: string };
  /** The backup taken before the current or the failed migration. */
  readonly backup?: MigrationBackup;
}

/** The progress events the runner emits. */
export type MigrationEvent =
  | { readonly type: 'run_started'; readonly total: number; readonly pending: number }
  | {
      readonly type: 'migration_started';
      readonly version: number;
      readonly name: string;
      readonly index: number;
      readonly total: number;
    }
  | {
      readonly type: 'migration_applied';
      readonly version: number;
      readonly name: string;
      readonly index: number;
      readonly total: number;
      readonly durationMs: number;
    }
  | {
      readonly type: 'migration_failed';
      readonly version: number;
      readonly name: string;
      readonly error: string;
    }
  | { readonly type: 'backup_created'; readonly backup: MigrationBackup }
  | {
      readonly type: 'rollback_started';
      readonly from: number;
      readonly to: number;
      readonly total: number;
    }
  | { readonly type: 'rollback_applied'; readonly version: number; readonly name: string }
  | {
      readonly type: 'rollback_failed';
      readonly version: number;
      readonly name: string;
      readonly error: string;
    }
  | { readonly type: 'rollback_completed'; readonly to: number }
  | {
      readonly type: 'run_completed';
      readonly applied: number;
      readonly skipped: number;
    }
  | {
      readonly type: 'run_failed';
      readonly version: number | null;
      readonly name: string | null;
      readonly error: string;
    };

/** The outcome of a migration run. */
export interface MigrationRunResult {
  /** `completed` when at least one migration ran, `noop` when there was nothing to do. */
  readonly status: 'completed' | 'noop' | 'failed';
  /** The migrations this run applied. */
  readonly applied: readonly AppliedMigration[];
  /** The migrations the ledger already recorded. */
  readonly skipped: readonly AppliedMigration[];
  /** The backups this run took. */
  readonly backups: readonly MigrationBackup[];
  /** The migration that failed, and why. */
  readonly failed?: { readonly version: number; readonly name: string; readonly error: string };
}

/** The outcome of a rollback. */
export interface MigrationRollbackResult {
  readonly status: 'completed' | 'failed';
  /** The migrations that were undone, newest first. */
  readonly undone: readonly AppliedMigration[];
  /** The version the database is at now. */
  readonly to: number;
  readonly error?: string;
}
