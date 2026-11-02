// ABOUTME: Backup and restore of the app's two SQLite databases as one archive: snapshot both at one
// ABOUTME: point, validate an upload without touching storage, then replace both with a rollback.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

import { buildBackupArchive, openBackupArchive, type BackupManifest } from './archive';
import {
  inspectDatabaseImage,
  type BackupDatabaseRole,
  type DatabaseImageReport,
} from './validate';

/** One of the app's databases, as the backup sees it: a whole file to export and replace. */
export interface BackupDatabase {
  /** The file's name in the browser's storage; the archive stores it under that name. */
  readonly fileName: string;
  exportDatabase(): Promise<Uint8Array>;
  importDatabase(bytes: Uint8Array): Promise<void>;
}

/** Where the copy of the data a restore replaces is kept. Answers where it landed. */
export interface SafetyCopyStore {
  save(fileName: string, bytes: Uint8Array): Promise<string>;
}

export interface BackupEnvironment {
  readonly canonical: BackupDatabase;
  readonly legacy: BackupDatabase;
  readonly appVersion: string;
  readonly dataMode: string;
  readonly safetyCopies: SafetyCopyStore;
  /** An open, empty, in-memory database to load an image into for validation. */
  openEmpty(): Promise<SqliteAdapter>;
  now?(): Date;
}

/** An upload that has been opened and validated, and nothing more. */
export interface PreparedRestore {
  readonly manifest: BackupManifest;
  readonly encrypted: boolean;
  readonly images: Record<BackupDatabaseRole, Uint8Array>;
  readonly reports: Record<BackupDatabaseRole, DatabaseImageReport>;
}

/** The restore did not complete; `rolledBack` says whether the previous data is back in place. */
export class BackupRestoreError extends Error {
  constructor(
    message: string,
    readonly rolledBack: boolean,
    readonly safetyCopy: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'BackupRestoreError';
  }
}

const ROLES: readonly BackupDatabaseRole[] = ['canonical', 'legacy'];

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function stamp(date: Date, withSeconds: boolean): string {
  const iso = date.toISOString();
  const day = iso.slice(0, 10).replace(/-/g, '');
  const time = iso.slice(11, withSeconds ? 19 : 16).replace(/:/g, '');
  return `${day}-${time}`;
}

function slug(name: string | null): string {
  const cleaned = (name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return cleaned || 'school';
}

function databaseOf(env: BackupEnvironment, role: BackupDatabaseRole): BackupDatabase {
  return role === 'canonical' ? env.canonical : env.legacy;
}

/**
 * Export both databases at one point in time.
 *
 * Each database answers through its own ordered queue, so an export sees every write issued
 * before it and none after. The two exports are issued together, in the same tick, so no write
 * the caller starts afterwards can land between them; the page blocks input while this runs.
 */
async function snapshot(env: BackupEnvironment): Promise<Record<BackupDatabaseRole, Uint8Array>> {
  const [canonical, legacy] = await Promise.all([
    env.canonical.exportDatabase(),
    env.legacy.exportDatabase(),
  ]);
  return { canonical, legacy };
}

/**
 * Write a backup archive of both databases.
 *
 * The snapshot is validated the same way an upload is, so a damaged database is reported now,
 * while the school still has it, rather than when somebody needs the backup.
 */
export async function createBackup(
  env: BackupEnvironment,
  options: { readonly passphrase?: string } = {}
): Promise<{ bytes: Uint8Array; manifest: BackupManifest; fileName: string }> {
  const now = env.now?.() ?? new Date();
  const images = await snapshot(env);
  const reports = {} as Record<BackupDatabaseRole, DatabaseImageReport>;
  for (const role of ROLES) {
    reports[role] = await inspectDatabaseImage(images[role], role, env.openEmpty);
  }

  const archive = await buildBackupArchive({
    createdAt: now.toISOString(),
    appVersion: env.appVersion,
    dataMode: env.dataMode,
    institutionName: reports.canonical.institutionName,
    files: ROLES.map((role) => ({
      role,
      name: databaseOf(env, role).fileName,
      bytes: images[role],
      migrations: reports[role].migrations,
      rowCounts: reports[role].rowCounts,
    })),
    passphrase: options.passphrase,
  });

  const extension = archive.encrypted ? 'spbackup' : 'zip';
  return {
    bytes: archive.bytes,
    manifest: archive.manifest,
    fileName: `schoolpilot-backup-${slug(reports.canonical.institutionName)}-${stamp(now, false)}.${extension}`,
  };
}

/** Open and validate an uploaded backup without touching the stored databases. */
export async function prepareRestore(
  env: BackupEnvironment,
  bytes: Uint8Array,
  passphrase?: string
): Promise<PreparedRestore> {
  const opened = await openBackupArchive(bytes, passphrase);
  const reports = {} as Record<BackupDatabaseRole, DatabaseImageReport>;
  for (const role of ROLES) {
    reports[role] = await inspectDatabaseImage(opened.images[role], role, env.openEmpty);
  }
  return { manifest: opened.manifest, encrypted: opened.encrypted, images: opened.images, reports };
}

/** The manifest of a safety copy: recorded leniently, because a damaged database is exactly what one may be replacing. */
async function describeLeniently(
  image: Uint8Array,
  role: BackupDatabaseRole,
  env: BackupEnvironment
): Promise<Pick<DatabaseImageReport, 'migrations' | 'rowCounts' | 'institutionName'>> {
  try {
    return await inspectDatabaseImage(image, role, env.openEmpty);
  } catch {
    return { migrations: [], rowCounts: {}, institutionName: null };
  }
}

/**
 * Replace both databases with a prepared backup.
 *
 * First the current data is saved as an unencrypted archive (the safety copy). Replacing two
 * files is not atomic: when a replacement fails, every database already replaced - and the one
 * that failed, whose file may be half-written - is put back from that snapshot. The caller
 * reloads the app afterwards; nothing that was read before the restore is valid after it.
 */
export async function applyRestore(
  env: BackupEnvironment,
  prepared: PreparedRestore
): Promise<{ safetyCopy: string }> {
  const now = env.now?.() ?? new Date();
  const current = await snapshot(env);
  const described = {
    canonical: await describeLeniently(current.canonical, 'canonical', env),
    legacy: await describeLeniently(current.legacy, 'legacy', env),
  };
  const safety = await buildBackupArchive({
    createdAt: now.toISOString(),
    appVersion: env.appVersion,
    dataMode: env.dataMode,
    institutionName: described.canonical.institutionName,
    files: ROLES.map((role) => ({
      role,
      name: databaseOf(env, role).fileName,
      bytes: current[role],
      migrations: described[role].migrations,
      rowCounts: described[role].rowCounts,
    })),
  });
  // Nothing is replaced unless the copy of what would be lost is stored first.
  const safetyCopy = await env.safetyCopies.save(`backup-before-restore-${stamp(now, true)}.zip`, safety.bytes);

  const touched: BackupDatabaseRole[] = [];
  for (const role of ROLES) {
    touched.push(role);
    try {
      await databaseOf(env, role).importDatabase(prepared.images[role]);
    } catch (error) {
      const rollbackFailures: string[] = [];
      for (const replaced of touched) {
        try {
          await databaseOf(env, replaced).importDatabase(current[replaced]);
        } catch (rollbackError) {
          rollbackFailures.push(`${replaced}: ${message(rollbackError)}`);
        }
      }
      const rolledBack = rollbackFailures.length === 0;
      throw new BackupRestoreError(
        rolledBack
          ? `The restore failed and the previous data was put back: ${message(error)}`
          : `The restore failed (${message(error)}) and the previous data could not be put back (${rollbackFailures.join('; ')}). A copy of it is saved as ${safetyCopy}.`,
        rolledBack,
        safetyCopy,
        { cause: error }
      );
    }
  }
  return { safetyCopy };
}
