// ABOUTME: The hub backup service: encrypted snapshots, retention, restore into a fresh instance,
// ABOUTME: the restore drill, the portable export and the status an operator or health page reads.

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import type { Repository } from '@/data/repository';
import type { FieldCipher } from '@/data/security';

import {
  ARCHIVE_MAGIC,
  encodeArchive,
  HEADER_LENGTH_BYTES,
  newArchiveNonce,
  parseHeaderBytes,
} from './archive';
import { digestDatabase } from './digest';
import { BackupError } from './errors';
import { exportDatabase } from './export';
import type { BackupSecret } from './key';
import { DEFAULT_RETENTION, selectExpiredBackups } from './retention';
import { restoreArchive } from './restore';
import { nextDailyTime } from './schedule';
import { snapshotDatabase, verifyDatabaseFile } from './snapshot';
import { readBackupState, writeBackupState } from './state';
import type {
  BackupEntry,
  BackupHeader,
  BackupKind,
  BackupRetentionPolicy,
  BackupState,
  BackupStatus,
  DatabaseDigest,
  DrillResult,
  DrillStatus,
  ExportManifest,
  RestoreResult,
} from './types';

/** The suffix every archive in the backup directory has. */
export const BACKUP_SUFFIX = '.spbk';

/** The state file, kept beside the archives so one directory is a whole backup set. */
export const STATE_FILE = 'state.json';

/** How often a restore drill is due. Spec 06 §3.3 asks for a monthly reminder. */
export const DRILL_INTERVAL_DAYS = 30;

export interface BackupServiceOptions {
  readonly adapter: SqliteAdapter;
  readonly repository: Repository;
  /** Where the archives, the state file and the drill output live. */
  readonly backupDir: string;
  /** Null when the hub has no key: every write then refuses with `key_missing`. */
  readonly secret?: BackupSecret | null;
  readonly retention?: Partial<BackupRetentionPolicy>;
  /** `HH:MM` in UTC, used only to report the next due time. */
  readonly dailyAt?: string;
  readonly now?: () => Date;
  /** The live database file, named in the header so an operator can tell instances apart. */
  readonly databaseFile?: string;
  /** Roots of the directories a restore, a drill and an export create. */
  readonly restoreDir?: string;
  readonly drillDir?: string;
  readonly exportDir?: string;
  /**
   * Opens the encrypted columns the portable export reads.
   *
   * A hub seals restricted columns at rest, so an export over a live hub needs the cipher to read
   * them; a plaintext database needs none and an omitted cipher leaves the values as stored.
   */
  readonly cipher?: FieldCipher;
}

/**
 * Owns the backup directory.
 *
 * The service never writes a plaintext database into the backup directory: a snapshot is
 * encrypted and the snapshot file is removed in a `finally`. A restore always targets a new
 * directory and refuses to overwrite an existing `schoolpilot.db`, so proving a backup works
 * can never destroy the database it is meant to protect.
 */
export class BackupService {
  readonly backupDir: string;
  readonly retention: BackupRetentionPolicy;
  private readonly adapter: SqliteAdapter;
  private readonly repository: Repository;
  private readonly cipher: FieldCipher | undefined;
  private readonly secret: BackupSecret | null;
  private readonly dailyAt: string;
  private readonly now: () => Date;
  private readonly databaseFile: string;
  private readonly restoreDir: string;
  private readonly drillDir: string;
  private readonly exportDir: string;
  private cache: BackupStatus | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: BackupServiceOptions) {
    this.adapter = options.adapter;
    this.repository = options.repository;
    this.cipher = options.cipher;
    this.backupDir = path.resolve(options.backupDir);
    this.secret = options.secret ?? null;
    this.retention = { ...DEFAULT_RETENTION, ...options.retention };
    this.dailyAt = options.dailyAt ?? '02:00';
    this.now = options.now ?? (() => new Date());
    this.databaseFile = options.databaseFile ?? 'schoolpilot.db';
    this.restoreDir = options.restoreDir ?? path.join(path.dirname(this.backupDir), 'restores');
    this.drillDir = options.drillDir ?? path.join(path.dirname(this.backupDir), 'drills');
    this.exportDir = options.exportDir ?? path.join(path.dirname(this.backupDir), 'exports');
  }

  /** True when a key is configured. */
  get isConfigured(): boolean {
    return this.secret !== null;
  }

  /** The last status computed, for the synchronous `/health` body. */
  cachedStatus(): BackupStatus | null {
    return this.cache;
  }

  /** The persisted state; callers treat a missing file as empty. */
  readState(): Promise<BackupState> {
    return readBackupState(this.stateFile());
  }

  /** The archives on disk, newest first. */
  async list(): Promise<{ entries: BackupEntry[]; unreadable: number }> {
    let names: string[];
    try {
      names = await fs.promises.readdir(this.backupDir);
    } catch (error) {
      if (isMissing(error)) return { entries: [], unreadable: 0 };
      throw new BackupError('backup_failed', `the backup directory could not be read: ${this.backupDir}`, {
        cause: error,
      });
    }

    const entries: BackupEntry[] = [];
    let unreadable = 0;

    for (const name of names) {
      if (!name.endsWith(BACKUP_SUFFIX) || name.startsWith('.')) continue;
      const file = path.join(this.backupDir, name);
      try {
        const header = await this.readHeaderFile(file);
        const stat = await fs.promises.stat(file);
        entries.push({
          id: header.id,
          file,
          bytes: stat.size,
          createdAt: header.createdAt,
          kind: header.kind,
          digest: header.content.digest,
          rows: header.content.rows,
        });
      } catch {
        unreadable += 1;
      }
    }

    entries.sort((left, right) => {
      const byTime = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return byTime !== 0 ? byTime : right.id.localeCompare(left.id);
    });

    return { entries, unreadable };
  }

  /** The whole status: archives, key, schedule, retention and the drill reminder. */
  async status(): Promise<BackupStatus> {
    const [{ entries, unreadable }, state] = await Promise.all([this.list(), this.readState()]);
    const now = this.now();
    const newest = entries[0];
    const oldest = entries[entries.length - 1];

    return {
      available: this.isConfigured,
      encryption: {
        algorithm: 'aes-256-gcm',
        kdf: 'scrypt',
        keyId: this.secret?.keyId ?? null,
      },
      schedule: {
        dailyAt: this.dailyAt,
        nextDueAt: nextDueAt(state, this.dailyAt, now),
      },
      retention: this.retention,
      directory: this.backupDir,
      backups: {
        count: entries.length,
        newestAt: newest?.createdAt ?? null,
        oldestAt: oldest?.createdAt ?? null,
        totalBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
        unreadable,
      },
      lastBackupAt: newest?.createdAt ?? latest(state.lastAutomaticAt, state.lastManualAt),
      lastAutomaticAt: state.lastAutomaticAt ?? null,
      lastManualAt: state.lastManualAt ?? null,
      lastRestoreAt: state.lastRestoreAt ?? null,
      lastDrillAt: state.lastDrillAt ?? null,
      lastFailure: state.lastFailure ?? null,
      drill: drillStatus(state, now),
    };
  }

  /** Recomputes and caches the status. */
  async refresh(): Promise<BackupStatus> {
    this.cache = await this.status();
    return this.cache;
  }

  /** Takes an encrypted backup now; serialised so a manual and an automatic backup never race. */
  create(kind: BackupKind, at?: Date): Promise<BackupEntry> {
    const run = this.queue.then(
      () => this.createNow(kind, at),
      () => this.createNow(kind, at)
    );
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  /** Records a failed automatic attempt, so the scheduler backs off instead of retrying every minute. */
  async recordFailure(at: Date, error: unknown): Promise<void> {
    const state = await this.readState();
    await writeBackupState(this.stateFile(), {
      ...state,
      lastAttemptAt: at.toISOString(),
      lastFailure: {
        at: at.toISOString(),
        message: error instanceof Error ? error.message : String(error),
      },
    });
    await this.refresh();
  }

  /** The header of one archive, without decrypting it. */
  async readHeader(id: string): Promise<BackupHeader> {
    return this.readHeaderFile(this.pathOf(id));
  }

  /** Restores an archive from this hub's directory into a new directory under `restoreDir`. */
  async restore(id: string, at?: Date): Promise<RestoreResult> {
    const now = at ?? this.now();
    return this.restoreFile(this.pathOf(id), uniqueDirectory(this.restoreDir, 'restore', now), now);
  }

  /** Restores an archive file into `targetDir`; the CLI's disaster-recovery entry point. */
  async restoreFile(backupFile: string, targetDir: string, at?: Date): Promise<RestoreResult> {
    return this.performRestore(backupFile, targetDir, at ?? this.now(), true);
  }

  /**
   * Proves the newest backup restores: it is decrypted, written to a scratch directory,
   * verified and removed again. A successful drill resets the monthly reminder.
   */
  async drill(at?: Date): Promise<DrillResult> {
    const now = at ?? this.now();
    const started = Date.now();
    const { entries } = await this.list();
    const newest = entries[0];
    if (!newest) {
      throw new BackupError('backup_not_found', 'there is no backup to drill');
    }

    const scratch = uniqueDirectory(this.drillDir, 'drill', now);
    try {
      const restored = await this.performRestore(newest.file, scratch, now, false);
      const state = await this.readState();
      await writeBackupState(this.stateFile(), {
        ...state,
        lastDrillAt: now.toISOString(),
        lastDrillDigest: restored.digest.overall,
      });
      await this.refresh();

      return {
        backupId: newest.id,
        performedAt: now.toISOString(),
        digest: restored.digest,
        durationMs: Date.now() - started,
      };
    } finally {
      await fs.promises.rm(scratch, { recursive: true, force: true });
    }
  }

  /** Writes the portable JSON + CSV export into a new directory under `exportDir`. */
  async exportAll(options: { includeRestricted?: boolean } = {}, at?: Date): Promise<ExportManifest> {
    const now = at ?? this.now();
    const destination = uniqueDirectory(this.exportDir, 'export', now);
    const manifest = await exportDatabase({
      adapter: this.adapter,
      destination,
      includeRestricted: options.includeRestricted === true,
      generatedAt: now,
      ...(this.cipher !== undefined ? { cipher: this.cipher } : {}),
    });
    await this.refresh();
    return manifest;
  }

  /** The checksum of the live database, in the same shape a restore reports. */
  checksum(): Promise<DatabaseDigest> {
    return digestDatabase(this.adapter);
  }

  // ==================== Private Methods ====================

  private async createNow(kind: BackupKind, at?: Date): Promise<BackupEntry> {
    if (!this.secret) {
      throw new BackupError(
        'key_missing',
        'no backup key is configured; set SCHOOLPILOT_BACKUP_PASSPHRASE or --backup-key-file'
      );
    }

    const now = at ?? this.now();
    const createdAt = now.toISOString();
    const id = backupId(now);
    const snapshotFile = path.join(this.backupDir, `.snapshot-${id}.db`);
    const archiveFile = path.join(this.backupDir, `${id}${BACKUP_SUFFIX}`);

    await fs.promises.mkdir(this.backupDir, { recursive: true });
    await this.repository.whenIdle();

    try {
      await snapshotDatabase(this.adapter, snapshotFile);
      const digest = await verifyDatabaseFile(snapshotFile);
      const plaintext = await fs.promises.readFile(snapshotFile);
      const nonce = newArchiveNonce();

      const header: BackupHeader = {
        format: 'schoolpilot-backup',
        version: 1,
        id,
        kind,
        createdAt,
        application: 'schoolpilot',
        source: { database: path.basename(this.databaseFile) },
        encryption: {
          algorithm: 'aes-256-gcm',
          kdf: 'scrypt',
          salt: nonce.salt,
          iv: nonce.iv,
          keyId: this.secret.keyId,
        },
        content: {
          digest: sha256(plaintext),
          rows: digest.rows,
          plainBytes: plaintext.length,
          tables: digest.tables,
        },
      };

      const archive = encodeArchive(header, plaintext, this.secret);
      await writeAtomic(archiveFile, archive);

      const entry: BackupEntry = {
        id,
        file: archiveFile,
        bytes: archive.length,
        createdAt,
        kind,
        digest: header.content.digest,
        rows: header.content.rows,
      };

      await this.prune();
      await this.recordSuccess(kind, createdAt, id);
      return entry;
    } finally {
      await fs.promises.rm(snapshotFile, { force: true });
    }
  }

  private async performRestore(
    backupFile: string,
    targetDir: string,
    now: Date,
    record: boolean
  ): Promise<RestoreResult> {
    if (!this.secret) {
      throw new BackupError('key_missing', 'no backup key is configured, so an archive cannot be read');
    }

    const result = await restoreArchive({
      backupFile,
      targetDir,
      secret: this.secret,
      now,
    });

    if (record) {
      const state = await this.readState();
      await writeBackupState(this.stateFile(), {
        ...state,
        lastRestoreAt: result.restoredAt,
      });
      await this.refresh();
    }

    return result;
  }

  /** Deletes the archives the retention policy does not keep. */
  private async prune(): Promise<void> {
    try {
      const { entries } = await this.list();
      const expired = selectExpiredBackups(
        entries.map((entry) => ({ id: entry.id, createdAt: entry.createdAt })),
        this.retention
      );

      for (const reference of expired) {
        const entry = entries.find((candidate) => candidate.id === reference.id);
        if (entry) await fs.promises.rm(entry.file, { force: true });
      }
    } catch (error) {
      // A failed prune must not lose the archive that was just written.
      console.error('the backup retention pass failed:', error);
    }
  }

  private async recordSuccess(kind: BackupKind, createdAt: string, id: string): Promise<void> {
    const state = await this.readState();
    const next: BackupState = {
      ...state,
      lastBackupId: id,
      lastAttemptAt: createdAt,
      ...(kind === 'automatic' ? { lastAutomaticAt: createdAt } : {}),
      ...(kind === 'manual' ? { lastManualAt: createdAt } : {}),
    };
    delete next.lastFailure;
    await writeBackupState(this.stateFile(), next);
    await this.refresh();
  }

  /** Reads only the magic, length and header of an archive. */
  private async readHeaderFile(file: string): Promise<BackupHeader> {
    const handle = await fs.promises.open(file, 'r');
    try {
      const prefix = Buffer.alloc(ARCHIVE_MAGIC.length + HEADER_LENGTH_BYTES);
      const prefixRead = await handle.read(prefix, 0, prefix.length, 0);
      if (prefixRead.bytesRead !== prefix.length) {
        throw new BackupError('archive_invalid', `the backup is too short: ${file}`);
      }
      if (!prefix.subarray(0, ARCHIVE_MAGIC.length).equals(ARCHIVE_MAGIC)) {
        throw new BackupError('archive_invalid', `the backup magic is missing: ${file}`);
      }

      const headerLength = prefix.readUInt32BE(ARCHIVE_MAGIC.length);
      if (headerLength === 0 || headerLength > 1024 * 1024) {
        throw new BackupError('archive_invalid', `the backup header length is out of range: ${file}`);
      }

      const headerBytes = Buffer.alloc(headerLength);
      const headerRead = await handle.read(headerBytes, 0, headerLength, prefix.length);
      if (headerRead.bytesRead !== headerLength) {
        throw new BackupError('archive_invalid', `the backup header is truncated: ${file}`);
      }
      return parseHeaderBytes(headerBytes);
    } finally {
      await handle.close();
    }
  }

  /** The archive path of an id, refusing anything that would escape the backup directory. */
  private pathOf(id: string): string {
    if (!/^[A-Za-z0-9._-]+$/.test(id) || path.basename(id) !== id) {
      throw new BackupError('backup_not_found', `"${id}" is not a backup id`);
    }
    const file = path.join(this.backupDir, `${id}${BACKUP_SUFFIX}`);
    if (path.dirname(file) !== this.backupDir || !fs.existsSync(file)) {
      throw new BackupError('backup_not_found', `there is no backup with id ${id}`);
    }
    return file;
  }

  private stateFile(): string {
    return path.join(this.backupDir, STATE_FILE);
  }
}

/** The monthly drill reminder: due when neither a drill nor a restore has run in 30 days. */
export function drillStatus(state: BackupState, now: Date): DrillStatus {
  const last = latest(state.lastDrillAt, state.lastRestoreAt);
  if (!last) {
    return {
      due: true,
      intervalDays: DRILL_INTERVAL_DAYS,
      dueAt: null,
      reason: 'never_performed',
    };
  }

  const dueAt = new Date(Date.parse(last) + DRILL_INTERVAL_DAYS * 86400000);
  const due = now.getTime() >= dueAt.getTime();
  return {
    due,
    intervalDays: DRILL_INTERVAL_DAYS,
    dueAt: due ? null : dueAt.toISOString(),
    reason: due ? 'interval_elapsed' : 'on_schedule',
  };
}

/** The next automatic backup: now when none has run, otherwise the next daily occurrence. */
function nextDueAt(state: BackupState, dailyAt: string, now: Date): string {
  if (!state.lastAutomaticAt) return now.toISOString();
  const last = Date.parse(state.lastAutomaticAt);
  if (!Number.isFinite(last)) return now.toISOString();
  return nextDailyTime(new Date(last), dailyAt).toISOString();
}

/** The newer of two ISO timestamps, or null. */
function latest(left: string | undefined, right: string | undefined): string | null {
  const values = [left, right].filter((value): value is string => typeof value === 'string');
  if (values.length === 0) return null;
  return values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function backupId(now: Date): string {
  const stamp = now.toISOString().replace(/[-:.]/g, '');
  return `backup-${stamp}-${randomBytes(3).toString('hex')}`;
}

function uniqueDirectory(root: string, prefix: string, now: Date): string {
  const stamp = now.toISOString().replace(/[-:.]/g, '');
  return path.join(root, `${prefix}-${stamp}-${randomBytes(3).toString('hex')}`);
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function writeAtomic(file: string, bytes: Buffer): Promise<void> {
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.promises.writeFile(temporary, bytes);
  await fs.promises.rename(temporary, file);
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ENOENT'
  );
}
