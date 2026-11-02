// ABOUTME: The browser side of backup and restore: the two live databases, the OPFS safety-copy
// ABOUTME: store, an in-memory sqlite-wasm database for validation, downloads and the reload.

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

import type { BackupEnvironment } from './backupService';
import { opfsSafetyCopies } from './safetyStore';

type Sqlite3Module = Awaited<ReturnType<typeof import('@sqlite.org/sqlite-wasm').default>>;

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

/**
 * Reload the app at once after any restore attempt that reached the databases: every module read
 * the replaced data, both databases refuse writes until they are opened again, and only a fresh
 * load reads the files as they now are. What happened is shown by the reloaded app.
 */
export function reloadApp(): void {
  window.location.reload();
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
