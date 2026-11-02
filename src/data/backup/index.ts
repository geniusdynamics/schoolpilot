// ABOUTME: Public surface of the browser backup: the archive format, its encryption, the restore
// ABOUTME: validation and sequence, and the single-tab guard. The browser wiring is browserEnvironment.

export {
  ARCHIVE_FORMAT,
  ARCHIVE_FORMAT_VERSION,
  BackupArchiveError,
  buildBackupArchive,
  looksLikeBackupArchive,
  openBackupArchive,
  sha256Hex,
  type BackupArchiveErrorCode,
  type BackupManifest,
  type BackupManifestFile,
} from './archive';
export {
  applyRestore,
  BackupRestoreError,
  createBackup,
  prepareRestore,
  type BackupDatabase,
  type BackupEnvironment,
  type PreparedRestore,
  type SafetyCopyStore,
} from './backupService';
export {
  BackupPassphraseError,
  EncryptedBackupFormatError,
  isEncryptedBackup,
  MIN_PASSPHRASE_LENGTH,
  PBKDF2_ITERATIONS,
} from './encryption';
export { holdAppTabLock, OtherTabsOpenError, runAsOnlyTab } from './tabLock';
export {
  BackupValidationError,
  inspectDatabaseImage,
  type BackupDatabaseRole,
  type BackupValidationCode,
  type DatabaseImageReport,
} from './validate';
