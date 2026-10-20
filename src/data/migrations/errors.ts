// ABOUTME: The typed errors the migration framework raises, so a caller can tell a failed
// ABOUTME: migration from a checksum mismatch or a body that ran something else.

export type MigrationErrorCode =
  /** The migration list itself is not usable: two migrations share a version, or a version is not a number. */
  | 'invalid_migration'
  /** Two migrations share a version. */
  | 'duplicate_version'
  /** The migration declares neither its SQL nor a checksum, so it has no identity. */
  | 'missing_checksum'
  /** The ledger records a different checksum for a migration than the one being run. */
  | 'checksum_mismatch'
  /** The body of a migration ran statements other than the ones it declared. */
  | 'declared_statements_mismatch'
  /** The database records a migration the current build does not know. */
  | 'unknown_migration'
  /** The migration body threw. */
  | 'migration_failed'
  /** A migration above the rollback target has no `down`. */
  | 'not_reversible'
  /** The backup could not be taken. */
  | 'backup_failed';

export interface MigrationErrorOptions {
  readonly code: MigrationErrorCode;
  readonly version?: number;
  readonly migrationName?: string;
  readonly cause?: unknown;
}

/** Every failure the framework reports. */
export class MigrationError extends Error {
  readonly code: MigrationErrorCode;
  readonly version?: number;
  readonly migrationName?: string;

  constructor(message: string, options: MigrationErrorOptions) {
    super(message);
    this.name = 'MigrationError';
    this.code = options.code;
    this.version = options.version;
    this.migrationName = options.migrationName;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/** The message of any thrown value. */
export function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return String(value);
}
