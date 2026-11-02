// ABOUTME: The portable backup archive: a stored zip of manifest.json and the app's two SQLite files,
// ABOUTME: optionally encrypted whole; opening one checks every file against the manifest's SHA-256.

import {
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
} from './encryption';
import type { BackupDatabaseRole } from './validate';
import { looksLikeZip, readZip, writeZip, ZipFormatError } from './zip';

export const ARCHIVE_FORMAT = 'schoolpilot-browser-backup';
/** Bumped when a reader of the previous version could not restore the archive correctly. */
export const ARCHIVE_FORMAT_VERSION = 1;
export const MANIFEST_NAME = 'manifest.json';

const ROLES: readonly BackupDatabaseRole[] = ['canonical', 'legacy'];

/** One database file in the archive, as the manifest records it. */
export interface BackupManifestFile {
  readonly role: BackupDatabaseRole;
  /** The file's real name in the browser's storage, and its name inside the zip. */
  readonly name: string;
  readonly bytes: number;
  readonly sha256: string;
  /** The versions its `_migrations` ledger records. */
  readonly migrations: readonly number[];
  readonly rowCounts: Readonly<Record<string, number>>;
}

export interface BackupManifest {
  readonly format: typeof ARCHIVE_FORMAT;
  readonly formatVersion: number;
  readonly createdAt: string;
  readonly appVersion: string;
  readonly dataMode: string;
  readonly institutionName: string | null;
  /** `none` is written out so an unencrypted archive says so, not merely omits it. */
  readonly encryption: 'none' | 'AES-256-GCM';
  readonly files: readonly BackupManifestFile[];
}

export interface BackupArchiveInput {
  readonly createdAt: string;
  readonly appVersion: string;
  readonly dataMode: string;
  readonly institutionName: string | null;
  readonly files: readonly (Omit<BackupManifestFile, 'bytes' | 'sha256'> & { readonly bytes: Uint8Array })[];
  /** Encrypt the whole archive under this passphrase; omitted for an unencrypted archive. */
  readonly passphrase?: string;
}

export type BackupArchiveErrorCode =
  | 'not_a_backup'
  | 'passphrase_required'
  | 'damaged'
  | 'newer_format'
  | 'missing_file'
  | 'checksum';

/** The file cannot be restored; the message is written for the person restoring. */
export class BackupArchiveError extends Error {
  constructor(
    readonly code: BackupArchiveErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'BackupArchiveError';
  }
}

/** Lower-case hex SHA-256 through WebCrypto. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Build the archive bytes and the manifest written into them. */
export async function buildBackupArchive(input: BackupArchiveInput): Promise<{
  bytes: Uint8Array;
  manifest: BackupManifest;
  encrypted: boolean;
}> {
  const encrypted = input.passphrase !== undefined;
  const files: BackupManifestFile[] = [];
  for (const file of input.files) {
    files.push({
      role: file.role,
      name: file.name,
      bytes: file.bytes.byteLength,
      sha256: await sha256Hex(file.bytes),
      migrations: [...file.migrations],
      rowCounts: { ...file.rowCounts },
    });
  }
  const manifest: BackupManifest = {
    format: ARCHIVE_FORMAT,
    formatVersion: ARCHIVE_FORMAT_VERSION,
    createdAt: input.createdAt,
    appVersion: input.appVersion,
    dataMode: input.dataMode,
    institutionName: input.institutionName,
    encryption: encrypted ? 'AES-256-GCM' : 'none',
    files,
  };

  const zip = writeZip(
    [
      { name: MANIFEST_NAME, data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) },
      ...input.files.map((file) => ({ name: file.name, data: file.bytes })),
    ],
    new Date(input.createdAt)
  );
  const bytes = input.passphrase !== undefined ? await encryptBackup(zip, input.passphrase) : zip;
  return { bytes, manifest, encrypted };
}

function parseManifest(data: Uint8Array): BackupManifest {
  let parsed: Partial<BackupManifest>;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)) as Partial<BackupManifest>;
  } catch {
    throw new BackupArchiveError('damaged', 'The backup manifest is not readable.');
  }
  if (parsed.format !== ARCHIVE_FORMAT || typeof parsed.formatVersion !== 'number') {
    throw new BackupArchiveError('not_a_backup', 'The zip file is not a SchoolPilot backup: its manifest is not one.');
  }
  if (parsed.formatVersion > ARCHIVE_FORMAT_VERSION) {
    throw new BackupArchiveError(
      'newer_format',
      `This backup was written by a newer version of SchoolPilot (backup format ${parsed.formatVersion}; this version reads up to ${ARCHIVE_FORMAT_VERSION}). Update SchoolPilot, then restore it.`
    );
  }
  if (!Array.isArray(parsed.files)) {
    throw new BackupArchiveError('damaged', 'The backup manifest lists no files.');
  }
  return parsed as BackupManifest;
}

/** True when the bytes look like something this module wrote: an encrypted backup or a zip. */
export function looksLikeBackupArchive(bytes: Uint8Array): boolean {
  return isEncryptedBackup(bytes) || looksLikeZip(bytes);
}

/**
 * Open an archive: decrypt it when it is encrypted, read the zip, and check every database file
 * against the size and SHA-256 the manifest records. Nothing is restored here.
 */
export async function openBackupArchive(
  bytes: Uint8Array,
  passphrase?: string
): Promise<{ manifest: BackupManifest; images: Record<BackupDatabaseRole, Uint8Array>; encrypted: boolean }> {
  const encrypted = isEncryptedBackup(bytes);
  if (encrypted && passphrase === undefined) {
    throw new BackupArchiveError('passphrase_required', 'This backup is encrypted. Enter its passphrase to open it.');
  }
  if (!encrypted && !looksLikeZip(bytes)) {
    throw new BackupArchiveError(
      'not_a_backup',
      'This file is not a SchoolPilot backup. Choose a file downloaded from Settings › Backup.'
    );
  }
  const zip = encrypted ? await decryptBackup(bytes, passphrase as string) : bytes;

  let entries;
  try {
    entries = readZip(zip);
  } catch (error) {
    if (error instanceof ZipFormatError) throw new BackupArchiveError('damaged', `The backup file is damaged: ${error.message}`);
    throw error;
  }
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]));
  const manifestData = byName.get(MANIFEST_NAME);
  if (!manifestData) {
    throw new BackupArchiveError('not_a_backup', 'The zip file is not a SchoolPilot backup: it has no manifest.');
  }
  const manifest = parseManifest(manifestData);

  const images = {} as Record<BackupDatabaseRole, Uint8Array>;
  for (const role of ROLES) {
    const listed = manifest.files.filter((file) => file.role === role);
    if (listed.length !== 1) {
      throw new BackupArchiveError('missing_file', `The backup manifest does not list exactly one ${role} database.`);
    }
    const file = listed[0];
    const data = byName.get(file.name);
    if (!data) {
      throw new BackupArchiveError('missing_file', `The backup lists ${file.name} but does not contain it.`);
    }
    if (data.byteLength !== file.bytes || (await sha256Hex(data)) !== file.sha256) {
      throw new BackupArchiveError(
        'checksum',
        `${file.name} in this backup does not match the checksum its manifest records; the file was changed or damaged.`
      );
    }
    images[role] = data;
  }
  return { manifest, images, encrypted };
}
