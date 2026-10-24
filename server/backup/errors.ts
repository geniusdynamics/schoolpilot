// ABOUTME: The typed refusals of the backup layer, so a route and an operator see a stable code
// ABOUTME: instead of a message parsed out of a native SQLite or crypto error.

export type BackupErrorCode =
  | 'key_missing'
  | 'key_invalid'
  | 'wrong_key'
  | 'archive_invalid'
  | 'archive_corrupt'
  | 'backup_not_found'
  | 'restore_target_exists'
  | 'digest_mismatch'
  | 'database_invalid'
  | 'backup_failed';

/** A backup, restore, drill or export the hub refused. */
export class BackupError extends Error {
  readonly code: BackupErrorCode;

  constructor(
    code: BackupErrorCode,
    message: string,
    options?: { readonly cause?: unknown }
  ) {
    super(message, options);
    this.name = 'BackupError';
    this.code = code;
  }
}

/** True when an error came from the backup layer. */
export function isBackupError(error: unknown): error is BackupError {
  return error instanceof BackupError;
}
