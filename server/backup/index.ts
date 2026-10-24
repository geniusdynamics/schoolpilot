// ABOUTME: Public surface of the hub backup layer: the service, the scheduler, the archive format
// ABOUTME: and the key, digest, retention and export helpers the CLI and tests share.

export {
  ARCHIVE_MAGIC,
  AUTH_TAG_BYTES,
  decodeArchive,
  encodeArchive,
  HEADER_LENGTH_BYTES,
  newArchiveNonce,
  parseHeaderBytes,
  readArchiveHeader,
  type ArchiveParts,
} from './archive';
export { BackupError, isBackupError, type BackupErrorCode } from './errors';
export { digestDatabase, digestTable, overallDigest, quoteIdentifier } from './digest';
export {
  RESTRICTED_ENTITIES,
  exportDatabase,
  renderCsv,
  type ExportOptions,
} from './export';
export {
  BACKUP_PASSPHRASE_ENV,
  deriveArchiveKey,
  resolveBackupSecret,
  type BackupSecret,
  type BackupSecretSource,
} from './key';
export { DEFAULT_RETENTION, isoWeekKey, selectExpiredBackups } from './retention';
export {
  BackupScheduler,
  isBackupDue,
  nextDailyTime,
  parseDailyTime,
  RETRY_DELAY_MS,
  type BackupSchedulerOptions,
} from './schedule';
export {
  BackupService,
  BACKUP_SUFFIX,
  DRILL_INTERVAL_DAYS,
  STATE_FILE,
  drillStatus,
  type BackupServiceOptions,
} from './service';
export { restoreArchive, type RestoreArchiveOptions } from './restore';
export { snapshotDatabase, verifyDatabaseFile } from './snapshot';
export { readBackupState, writeBackupState } from './state';
export type {
  BackupContent,
  BackupEncryption,
  BackupEntry,
  BackupHeader,
  BackupKind,
  BackupReference,
  BackupRetentionPolicy,
  BackupState,
  BackupStatus,
  DatabaseDigest,
  DrillResult,
  DrillStatus,
  ExportFile,
  ExportManifest,
  RestoreResult,
  TableDigest,
} from './types';
