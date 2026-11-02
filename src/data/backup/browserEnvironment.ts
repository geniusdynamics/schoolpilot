// ABOUTME: The browser side of backup and restore: the two live databases, the OPFS store for the
// ABOUTME: safety copy a restore leaves behind, and an in-memory sqlite-wasm database for validation.

import {
  createSqliteAdapter,
  createWasmDatabaseDriver,
  inMemoryWasmImage,
  type SqliteAdapter,
  type WasmDatabase,
} from '@/data/adapters/sqlite';
import { CANONICAL_DB_NAME, canonicalAdapter, openCanonicalRepository } from '@/data/canonicalRepository';
import { getAppMode } from '@/config/unifiedConfig';
import { SQLiteWASMProvider } from '@/services/database/SQLiteWASMProvider';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';

import type { BackupEnvironment, SafetyCopyStore } from './backupService';

type Sqlite3Module = Awaited<ReturnType<typeof import('@sqlite.org/sqlite-wasm').default>>;

/** The OPFS directory the safety copies live in, beside (never inside) the SQLite pools. */
export const SAFETY_COPY_DIRECTORY = 'schoolpilot-restore-safety';

let sqlite3: Promise<Sqlite3Module> | null = null;

/**
 * An empty in-memory database on the page's own sqlite-wasm. The OPFS pools are exclusive, so
 * validation cannot borrow a worker; an upload is loaded here and nowhere else.
 */
async function openEmptyInMemory(): Promise<SqliteAdapter> {
  sqlite3 ??= import('@sqlite.org/sqlite-wasm').then((module) =>
    module.default({ print: () => undefined, printErr: console.error })
  );
  const loaded = await sqlite3;
  const database = new loaded.oo1.DB(':memory:', 'c');
  const adapter = createSqliteAdapter(
    createWasmDatabaseDriver(database as unknown as WasmDatabase, inMemoryWasmImage(loaded, database))
  );
  await adapter.open();
  return adapter;
}

/** Hand bytes to the browser as a downloaded file. */
export function downloadBytes(fileName: string, bytes: Uint8Array, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** A safety copy stored in this browser. */
export interface SafetyCopy {
  readonly name: string;
  readonly bytes: number;
  readonly modified: number;
}

async function safetyDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(SAFETY_COPY_DIRECTORY, { create: true });
}

/**
 * The safety copies a restore writes before it replaces anything. They stay in this browser's
 * OPFS until somebody deletes them; where OPFS cannot be written from the page, the copy is
 * downloaded instead, so it is never skipped.
 */
export const opfsSafetyCopies: SafetyCopyStore & {
  list(): Promise<SafetyCopy[]>;
  read(name: string): Promise<Uint8Array>;
  remove(name: string): Promise<void>;
} = {
  async save(fileName, bytes) {
    const directory = await safetyDirectory();
    const handle = await directory.getFileHandle(fileName, { create: true });
    if (typeof handle.createWritable !== 'function') {
      await directory.removeEntry(fileName);
      downloadBytes(fileName, bytes, 'application/zip');
      return `${fileName} (downloaded)`;
    }
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return `${SAFETY_COPY_DIRECTORY}/${fileName}`;
  },

  async list() {
    const directory = await safetyDirectory();
    const copies: SafetyCopy[] = [];
    for await (const entry of directory.values()) {
      if (entry.kind !== 'file') continue;
      const file = await (entry as FileSystemFileHandle).getFile();
      copies.push({ name: entry.name, bytes: file.size, modified: file.lastModified });
    }
    return copies.sort((a, b) => b.modified - a.modified);
  },

  async read(name) {
    const directory = await safetyDirectory();
    const file = await (await directory.getFileHandle(name)).getFile();
    return new Uint8Array(await file.arrayBuffer());
  },

  async remove(name) {
    const directory = await safetyDirectory();
    await directory.removeEntry(name);
  },
};

/**
 * Reload the app after a restore, once the person has had a moment to read that it worked:
 * every module read the replaced data before, and only a fresh load reads the restored files.
 */
export function reloadAfterRestore(): void {
  window.setTimeout(() => window.location.reload(), 1500);
}

/** The data mode this install runs in: production, demo or development. */
export function currentDataMode(): string {
  return getAppMode();
}

/**
 * The live databases of this install, as the backup sees them.
 *
 * The canonical database is the one every module reads through; the legacy one is the SQLite
 * file the document collections still live in. Any other legacy storage provider cannot be
 * exported as a file, so a backup refuses rather than writing an archive that lacks it.
 */
export async function browserBackupEnvironment(): Promise<BackupEnvironment> {
  await openCanonicalRepository();
  const canonical = canonicalAdapter();
  if (!canonical) throw new Error('The school database is not open, so it cannot be backed up.');

  const manager = UnifiedDatabaseManager.getInstance();
  const provider = manager.getProvider();
  if (!(provider instanceof SQLiteWASMProvider)) {
    throw new Error(
      `Backups from the browser need the SQLite storage; this install uses ${manager.getProviderType() ?? 'no storage provider'}.`
    );
  }

  return {
    canonical: {
      fileName: `${CANONICAL_DB_NAME}.sqlite3`,
      exportDatabase: () => canonical.exportDatabase(),
      importDatabase: (bytes) => canonical.importDatabase(bytes),
    },
    legacy: {
      fileName: provider.databaseFileName(),
      exportDatabase: () => provider.exportDatabase(),
      importDatabase: (bytes) => provider.importDatabase(bytes),
    },
    appVersion: import.meta.env.VITE_APP_VERSION || 'dev',
    dataMode: currentDataMode(),
    safetyCopies: opfsSafetyCopies,
    openEmpty: openEmptyInMemory,
  };
}
