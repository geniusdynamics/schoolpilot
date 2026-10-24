// ABOUTME: The public shapes of the hub backup layer: archive headers, digests, retention entries,
// ABOUTME: status, restore results and the state file an automatic backup scheduler reads.

/** What caused a backup to be taken. */
export type BackupKind = 'automatic' | 'manual' | 'pre_restore';

/** One table's canonical rows, hashed so two databases can be compared without copying them. */
export interface TableDigest {
  /** The physical table name. */
  readonly table: string;
  /** The canonical entity name, when the table belongs to the registry. */
  readonly entity: string | null;
  readonly rows: number;
  /** SHA-256 over the table's rows in canonical JSON order. */
  readonly digest: string;
}

/** A logical checksum of a database: per table, plus one digest over the whole set. */
export interface DatabaseDigest {
  readonly algorithm: 'sha256';
  readonly overall: string;
  readonly rows: number;
  readonly tables: readonly TableDigest[];
}

/** The plaintext content description an archive header carries. */
export interface BackupContent {
  /** SHA-256 of the plaintext SQLite file, so a restore can prove it wrote those exact bytes. */
  readonly digest: string;
  readonly rows: number;
  readonly plainBytes: number;
  readonly tables: readonly TableDigest[];
}

/** How an archive is encrypted; every field the reader needs is here, none of it is secret. */
export interface BackupEncryption {
  readonly algorithm: 'aes-256-gcm';
  readonly kdf: 'scrypt';
  /** Base64 of the per-archive scrypt salt. */
  readonly salt: string;
  /** Base64 of the AES-GCM initialisation vector. */
  readonly iv: string;
  /** A short hash of the key, so a wrong key is reported before the cipher runs. */
  readonly keyId: string;
}

/** The authenticated header of a backup archive. */
export interface BackupHeader {
  readonly format: 'schoolpilot-backup';
  readonly version: 1;
  readonly id: string;
  readonly kind: BackupKind;
  readonly createdAt: string;
  readonly application: 'schoolpilot';
  readonly source: {
    readonly database: string;
  };
  readonly encryption: BackupEncryption;
  readonly content: BackupContent;
}

/** One archive on disk, as a listing reports it. */
export interface BackupEntry {
  readonly id: string;
  readonly file: string;
  readonly bytes: number;
  readonly createdAt: string;
  readonly kind: BackupKind;
  readonly digest: string;
  readonly rows: number;
}

/** How many of each cadence a backup directory keeps. */
export interface BackupRetentionPolicy {
  readonly daily: number;
  readonly weekly: number;
  readonly monthly: number;
}

/** The minimal reference the retention decision needs. */
export interface BackupReference {
  readonly id: string;
  readonly createdAt: string;
}

/** The persisted state of the backup service; one small JSON file beside the archives. */
export interface BackupState {
  lastAutomaticAt?: string;
  lastManualAt?: string;
  lastBackupId?: string;
  lastAttemptAt?: string;
  lastRestoreAt?: string;
  lastDrillAt?: string;
  lastDrillDigest?: string;
  lastFailure?: {
    readonly at: string;
    readonly message: string;
  };
}

/** Why a restore drill is or is not due. */
export interface DrillStatus {
  readonly due: boolean;
  readonly intervalDays: number;
  /** When the next drill falls due; null when it is due now. */
  readonly dueAt: string | null;
  readonly reason: 'never_performed' | 'interval_elapsed' | 'on_schedule';
}

/** The status the health page and an operator read. */
export interface BackupStatus {
  /** True when a key is configured, so a backup can be written and read. */
  readonly available: boolean;
  readonly encryption: {
    readonly algorithm: 'aes-256-gcm';
    readonly kdf: 'scrypt';
    readonly keyId: string | null;
  };
  readonly schedule: {
    readonly dailyAt: string;
    readonly nextDueAt: string | null;
  };
  readonly retention: BackupRetentionPolicy;
  readonly directory: string;
  readonly backups: {
    readonly count: number;
    readonly newestAt: string | null;
    readonly oldestAt: string | null;
    readonly totalBytes: number;
    readonly unreadable: number;
  };
  readonly lastBackupAt: string | null;
  readonly lastAutomaticAt: string | null;
  readonly lastManualAt: string | null;
  readonly lastRestoreAt: string | null;
  readonly lastDrillAt: string | null;
  readonly lastFailure: BackupState['lastFailure'] | null;
  readonly drill: DrillStatus;
}

/** What a restore to a fresh directory produced. */
export interface RestoreResult {
  readonly backupId: string;
  readonly restoredAt: string;
  readonly databaseFile: string;
  readonly bytes: number;
  readonly digest: DatabaseDigest;
}

/** What a restore drill proved. */
export interface DrillResult {
  readonly backupId: string;
  readonly performedAt: string;
  readonly digest: DatabaseDigest;
  readonly durationMs: number;
}

/** One file of a portable export. */
export interface ExportFile {
  readonly entity: string;
  readonly json: string;
  readonly csv: string;
  readonly rows: number;
  /** SHA-256 of each file, so an export can be verified after it leaves the hub. */
  readonly checksums: {
    readonly json: string;
    readonly csv: string;
  };
}

/** The manifest written into a portable export directory. */
export interface ExportManifest {
  readonly format: 'schoolpilot-export';
  readonly version: 1;
  readonly generatedAt: string;
  readonly directory: string;
  readonly includeRestricted: boolean;
  readonly excludedEntities: readonly string[];
  readonly redactedColumns: readonly {
    readonly entity: string;
    readonly column: string;
  }[];
  readonly digest: DatabaseDigest;
  readonly files: readonly ExportFile[];
}
