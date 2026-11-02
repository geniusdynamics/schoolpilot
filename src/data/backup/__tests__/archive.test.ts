// ABOUTME: Tests the backup archive: a plain and an encrypted round trip, the manifest it records,
// ABOUTME: and the refusals for a tampered byte, a missing file, a newer format and a foreign file.

import { webcrypto } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  ARCHIVE_FORMAT_VERSION,
  BackupArchiveError,
  buildBackupArchive,
  MANIFEST_NAME,
  openBackupArchive,
  sha256Hex,
  type BackupArchiveInput,
  type BackupManifest,
} from '../archive';
import { BackupPassphraseError } from '../encryption';
import { readZip, writeZip } from '../zip';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});

/** Stand-ins for the two database images; the archive treats them as opaque bytes. */
const canonical = new Uint8Array(1024).map((_, index) => index % 251);
const legacy = new Uint8Array(512).map((_, index) => (index * 7) % 256);

const input: BackupArchiveInput = {
  createdAt: '2026-11-02T10:15:00.000Z',
  appVersion: '3.4.0',
  dataMode: 'production',
  institutionName: 'Mwangaza Academy',
  files: [
    { role: 'canonical' as const, name: 'schoolpilot-canonical.sqlite3', bytes: canonical, migrations: [100, 101], rowCounts: { learner: 30 } },
    { role: 'legacy' as const, name: 'schoolpilot_production.sqlite3', bytes: legacy, migrations: [], rowCounts: { users: 2 } },
  ],
};

describe('backup archive', () => {
  it('round-trips an unencrypted archive that says it is unencrypted', async () => {
    const built = await buildBackupArchive(input);
    expect(built.encrypted).toBe(false);
    expect(built.manifest).toMatchObject({
      format: 'schoolpilot-browser-backup',
      formatVersion: ARCHIVE_FORMAT_VERSION,
      createdAt: input.createdAt,
      appVersion: '3.4.0',
      dataMode: 'production',
      institutionName: 'Mwangaza Academy',
      encryption: 'none',
    });
    expect(built.manifest.files[0]).toEqual({
      role: 'canonical',
      name: 'schoolpilot-canonical.sqlite3',
      bytes: 1024,
      sha256: await sha256Hex(canonical),
      migrations: [100, 101],
      rowCounts: { learner: 30 },
    });
    // A plain zip: the entries carry their real file names.
    expect(readZip(built.bytes).map((entry) => entry.name)).toEqual([
      MANIFEST_NAME,
      'schoolpilot-canonical.sqlite3',
      'schoolpilot_production.sqlite3',
    ]);

    const opened = await openBackupArchive(built.bytes);
    expect(opened.manifest).toEqual(built.manifest);
    expect(Array.from(opened.images.canonical)).toEqual(Array.from(canonical));
    expect(Array.from(opened.images.legacy)).toEqual(Array.from(legacy));
  });

  it('round-trips an encrypted archive and asks for the passphrase', async () => {
    const built = await buildBackupArchive({ ...input, passphrase: 'mwangaza-backup-2026' });
    expect(built.encrypted).toBe(true);
    expect(built.manifest.encryption).toBe('AES-256-GCM');

    await expect(openBackupArchive(built.bytes)).rejects.toMatchObject({ code: 'passphrase_required' });
    await expect(openBackupArchive(built.bytes, 'wrong passphrase')).rejects.toBeInstanceOf(
      BackupPassphraseError
    );
    const opened = await openBackupArchive(built.bytes, 'mwangaza-backup-2026');
    expect(Array.from(opened.images.legacy)).toEqual(Array.from(legacy));
  });

  it('detects a single changed byte through the manifest checksum', async () => {
    const built = await buildBackupArchive(input);
    // Rebuild the zip with one byte of the canonical image changed: the zip's own CRC is
    // recomputed, so only the manifest's SHA-256 can notice.
    const entries = readZip(built.bytes).map((entry) => {
      if (entry.name !== 'schoolpilot-canonical.sqlite3') return entry;
      const data = entry.data.slice();
      data[100] ^= 0x01;
      return { name: entry.name, data };
    });

    const error = await openBackupArchive(writeZip(entries)).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BackupArchiveError);
    expect((error as BackupArchiveError).code).toBe('checksum');
    expect((error as Error).message).toMatch(/schoolpilot-canonical\.sqlite3/);
  });

  it('refuses an archive whose manifest names a file it does not hold', async () => {
    const built = await buildBackupArchive(input);
    const entries = readZip(built.bytes).filter((entry) => entry.name !== 'schoolpilot_production.sqlite3');

    await expect(openBackupArchive(writeZip(entries))).rejects.toMatchObject({ code: 'missing_file' });
  });

  it('refuses an archive written in a newer format', async () => {
    const built = await buildBackupArchive(input);
    const entries = readZip(built.bytes).map((entry) => {
      if (entry.name !== MANIFEST_NAME) return entry;
      const manifest = JSON.parse(new TextDecoder().decode(entry.data)) as BackupManifest;
      const newer = { ...manifest, formatVersion: ARCHIVE_FORMAT_VERSION + 1 };
      return { name: entry.name, data: new TextEncoder().encode(JSON.stringify(newer)) };
    });

    await expect(openBackupArchive(writeZip(entries))).rejects.toMatchObject({ code: 'newer_format' });
  });

  it('refuses a file that is neither a backup archive nor an encrypted backup', async () => {
    await expect(openBackupArchive(new TextEncoder().encode('{"collections":{}}'))).rejects.toMatchObject({
      code: 'not_a_backup',
    });
    // A bare SQLite file is a database, not a backup archive.
    const sqlite = new TextEncoder().encode('SQLite format 3\u0000'.padEnd(512, '\u0000'));
    await expect(openBackupArchive(sqlite)).rejects.toMatchObject({ code: 'not_a_backup' });
  });
});
