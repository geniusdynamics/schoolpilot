// ABOUTME: Tests the backup page over two real in-memory databases: Download writes an archive of both,
// ABOUTME: encrypted by default in production; Restore refuses a foreign file and replaces data on confirm.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyCanonicalSchema, createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { fixtureRow, insertRow } from '@/data/adapters/sqlite/__tests__/helpers';
import { createBackup, openBackupArchive, type BackupEnvironment } from '@/data/backup';
import { applySchemaMigrations } from '@/data/migrations';
import enSettings from '@/i18n/locales/en/settings.json';

const mocks = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  downloadBytes: vi.fn(),
  reloadApp: vi.fn(),
  showRestoreRecoveryScreen: vi.fn(),
  events: [] as string[],
  dataMode: 'development',
  environment: null as BackupEnvironment | null,
  saved: [] as string[],
  logout: vi.fn(async () => ({ success: true, message: 'Logged out successfully' })),
}));

/** The real English copy, with {{placeholders}} filled in as i18next does. */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values: Record<string, unknown> = {}) => {
      const text = key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], enSettings);
      if (typeof text !== 'string') return key;
      return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(values[name] ?? ''));
    },
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: mocks.showSuccess, showError: mocks.showError, showWarning: vi.fn(), showInfo: vi.fn() }),
}));

vi.mock('@/services/auth/authService', () => ({ authService: { logout: mocks.logout } }));

// The single-tab guard is a browser lock; its own tests cover it.
vi.mock('@/data/backup/tabLock', () => ({
  holdAppTabLock: vi.fn(),
  OtherTabsOpenError: class extends Error {},
  runAsOnlyTab: <T,>(work: () => Promise<T>) => work(),
}));

vi.mock('@/data/backup/browserEnvironment', () => ({
  browserBackupEnvironment: async () => mocks.environment,
  currentDataMode: () => mocks.dataMode,
  downloadBytes: mocks.downloadBytes,
  // jsdom cannot navigate; the reload is asserted as requested.
  reloadApp: mocks.reloadApp,
}));

vi.mock('@/data/backup/safetyStore', () => ({
  opfsSafetyCopies: {
    list: async () => mocks.saved.map((name) => ({ name, bytes: 1, modified: 0 })),
    read: async () => new Uint8Array(),
    remove: async () => undefined,
  },
}));

// Replacing the app's root is the screen's own business; here it is asserted as requested.
vi.mock('@/modules/settings/components/RestoreRecoveryScreen', () => ({
  showRestoreRecoveryScreen: mocks.showRestoreRecoveryScreen,
}));

import DatabaseBackupPage from '../DatabaseBackupPage';

async function openEmpty(): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter();
  await adapter.open();
  return adapter;
}

interface Install {
  canonical: SqliteAdapter;
  legacy: SqliteAdapter;
  environment: BackupEnvironment;
}

/** One install's two databases: the canonical tables with a school, and the legacy users table. */
async function install(school: string): Promise<Install> {
  const canonical = await openEmpty();
  await applyCanonicalSchema(canonical);
  await applySchemaMigrations(canonical);
  await insertRow(canonical, 'institution', { ...fixtureRow('institution'), name: school });
  const legacy = await openEmpty();
  await legacy.exec('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT)');
  await legacy.run('INSERT INTO users (id, username) VALUES (?, ?)', ['u1', `${school} admin`]);
  const database = (adapter: SqliteAdapter, fileName: string) => ({
    fileName,
    exportDatabase: () => adapter.exportDatabase(),
    importDatabase: (bytes: Uint8Array) => adapter.importDatabase(bytes),
  });
  return {
    canonical,
    legacy,
    environment: {
      canonical: database(canonical, 'schoolpilot-canonical.sqlite3'),
      legacy: database(legacy, 'schoolpilot_production.sqlite3'),
      appVersion: 'dev',
      dataMode: mocks.dataMode,
      openEmpty,
      safetyCopies: {
        save: async (fileName) => {
          mocks.saved.push(fileName);
          return fileName;
        },
        markRestoreInProgress: async () => {
          mocks.events.push('mark');
        },
        clearRestoreInProgress: async () => {
          mocks.events.push('clear');
        },
      },
    },
  };
}

const schoolName = async (adapter: SqliteAdapter) =>
  (await adapter.get<{ name: string }>('SELECT name FROM institution'))?.name;

function chooseFile(name: string, bytes: Uint8Array) {
  const input = screen.getByTestId('restore-file') as HTMLInputElement;
  const file = new File([bytes], name);
  // jsdom's File has no arrayBuffer(); the page reads the bytes through it.
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.slice().buffer });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('DatabaseBackupPage', () => {
  let installs: Install[] = [];

  beforeAll(() => {
    if (!globalThis.crypto?.subtle) {
      Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    }
  });

  beforeEach(() => {
    mocks.downloadBytes.mockReset();
    mocks.showSuccess.mockReset();
    mocks.logout.mockClear();
    mocks.reloadApp.mockClear();
    mocks.showRestoreRecoveryScreen.mockClear();
    mocks.saved = [];
    mocks.events = [];
    mocks.dataMode = 'development';
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(async () => {
    for (const entry of installs) {
      await entry.canonical.close();
      await entry.legacy.close();
    }
    installs = [];
    vi.restoreAllMocks();
  });

  it('states that the downloaded file is the only copy if the browser storage is cleared', () => {
    render(<DatabaseBackupPage />);
    expect(screen.getByText(/the only copy of the school's data/)).toBeTruthy();
    expect(screen.getByText('No backup has been downloaded from this browser')).toBeTruthy();
  });

  it('downloads an unencrypted archive of both databases and says it is unencrypted', async () => {
    const source = await install('Mwangaza Academy');
    installs.push(source);
    mocks.environment = source.environment;
    render(<DatabaseBackupPage />);

    expect(screen.getByText(/This backup will not be encrypted/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }));

    await waitFor(() => expect(mocks.downloadBytes).toHaveBeenCalledTimes(1));
    const [fileName, bytes, type] = mocks.downloadBytes.mock.calls[0] as [string, Uint8Array, string];
    expect(fileName).toMatch(/^schoolpilot-backup-mwangaza-academy-\d{8}-\d{4}\.zip$/);
    expect(type).toBe('application/zip');
    const archive = await openBackupArchive(bytes);
    expect(archive.manifest.encryption).toBe('none');
    expect(archive.manifest.institutionName).toBe('Mwangaza Academy');
    expect(archive.manifest.files.map((file) => file.name)).toEqual([
      'schoolpilot-canonical.sqlite3',
      'schoolpilot_production.sqlite3',
    ]);
    await waitFor(() => expect(screen.getByText(/downloaded/)).toBeTruthy());
  });

  it('encrypts by default in production and waits for a confirmed passphrase', async () => {
    mocks.dataMode = 'production';
    const source = await install('Mwangaza Academy');
    installs.push(source);
    mocks.environment = source.environment;
    render(<DatabaseBackupPage />);

    expect(screen.getByText('A forgotten passphrase cannot be recovered')).toBeTruthy();
    const download = screen.getByRole('button', { name: 'Download backup' }) as HTMLButtonElement;
    expect(download.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('backup-passphrase'), { target: { value: 'mwangaza-2026' } });
    fireEvent.change(screen.getByTestId('backup-passphrase-confirm'), { target: { value: 'mwangaza-2025' } });
    expect(screen.getByText('The two passphrases do not match.')).toBeTruthy();
    expect(download.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('backup-passphrase-confirm'), { target: { value: 'mwangaza-2026' } });
    expect(download.disabled).toBe(false);
    fireEvent.click(download);

    await waitFor(() => expect(mocks.downloadBytes).toHaveBeenCalledTimes(1), { timeout: 15_000 });
    const [fileName, bytes] = mocks.downloadBytes.mock.calls[0] as [string, Uint8Array];
    expect(fileName).toMatch(/\.spbackup$/);
    await expect(openBackupArchive(bytes)).rejects.toMatchObject({ code: 'passphrase_required' });
    expect((await openBackupArchive(bytes, 'mwangaza-2026')).manifest.encryption).toBe('AES-256-GCM');
  }, 30_000);

  it('refuses a file that is not a backup and replaces nothing', async () => {
    const target = await install('Placeholder School');
    installs.push(target);
    mocks.environment = target.environment;
    render(<DatabaseBackupPage />);

    chooseFile('legacy-snapshot.json', new TextEncoder().encode('{"collections":{}}'));
    fireEvent.click(await screen.findByRole('button', { name: 'Check backup' }));

    expect((await screen.findByTestId('restore-error')).textContent).toMatch(/not a SchoolPilot backup/);
    expect(screen.queryByRole('button', { name: 'Restore this backup' })).toBeNull();
    expect(await schoolName(target.canonical)).toBe('Placeholder School');
  });

  /** Check a backup file and confirm its restore, as a person would. */
  async function restoreThrough(fileName: string, bytes: Uint8Array) {
    chooseFile(fileName, bytes);
    fireEvent.click(await screen.findByRole('button', { name: 'Check backup' }));
    expect((await screen.findByTestId('backup-summary')).textContent).toContain('Mwangaza Academy');
    fireEvent.click(screen.getByRole('button', { name: 'Restore this backup' }));
    const confirm = (await screen.findByRole('button', { name: 'Replace data and restore' })) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByText('I understand that the current data in this browser will be replaced'));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
  }

  it('restores a backup after an explicit confirmation, then signs out and reloads at once', async () => {
    const source = await install('Mwangaza Academy');
    const target = await install('Placeholder School');
    installs.push(source, target);
    const backup = await createBackup(source.environment);
    mocks.environment = target.environment;
    render(<DatabaseBackupPage />);

    await restoreThrough(backup.fileName, backup.bytes);

    await waitFor(() => expect(mocks.reloadApp).toHaveBeenCalledTimes(1));
    expect(await schoolName(target.canonical)).toBe('Mwangaza Academy');
    expect(mocks.saved).toEqual([expect.stringMatching(/^backup-before-restore-\d{8}-\d{6}\.zip$/)]);
    expect(mocks.events).toEqual(['mark', 'clear']);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    // The message is shown by the reloaded app, not by this page in the old app state.
    expect(JSON.parse(sessionStorage.getItem('schoolpilot.backup.notice')!)).toEqual({
      kind: 'restored',
      school: 'Mwangaza Academy',
    });
    // Nothing from the old page state can write into the restored database.
    await expect(target.canonical.run('DELETE FROM institution')).rejects.toMatchObject({ code: 'replaced' });
    expect(mocks.showRestoreRecoveryScreen).not.toHaveBeenCalled();
  });

  it('reloads after a restore that failed and was rolled back, and says so after the reload', async () => {
    const source = await install('Mwangaza Academy');
    const target = await install('Placeholder School');
    installs.push(source, target);
    const backup = await createBackup(source.environment);
    let legacyImports = 0;
    mocks.environment = {
      ...target.environment,
      legacy: {
        ...target.environment.legacy,
        importDatabase: async (bytes) => {
          legacyImports += 1;
          if (legacyImports === 1) throw new Error('the storage worker stopped');
          await target.legacy.importDatabase(bytes);
        },
      },
    };
    render(<DatabaseBackupPage />);

    await restoreThrough(backup.fileName, backup.bytes);

    await waitFor(() => expect(mocks.reloadApp).toHaveBeenCalledTimes(1));
    expect(await schoolName(target.canonical)).toBe('Placeholder School');
    expect(JSON.parse(sessionStorage.getItem('schoolpilot.backup.notice')!)).toMatchObject({
      kind: 'rolledBack',
      message: expect.stringMatching(/the storage worker stopped/),
    });
    // The signed-in account still belongs to the data that is back in place.
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.showRestoreRecoveryScreen).not.toHaveBeenCalled();
  });

  it('stops the app with the safety copy when the rollback fails too', async () => {
    const source = await install('Mwangaza Academy');
    const target = await install('Placeholder School');
    installs.push(source, target);
    const backup = await createBackup(source.environment);
    mocks.environment = {
      ...target.environment,
      legacy: {
        ...target.environment.legacy,
        importDatabase: async () => {
          throw new Error('the storage worker stopped');
        },
      },
    };
    render(<DatabaseBackupPage />);

    await restoreThrough(backup.fileName, backup.bytes);

    await waitFor(() => expect(mocks.showRestoreRecoveryScreen).toHaveBeenCalledTimes(1));
    expect(mocks.showRestoreRecoveryScreen).toHaveBeenCalledWith({
      reason: 'rollbackFailed',
      safetyCopy: expect.stringMatching(/^backup-before-restore-\d{8}-\d{6}\.zip$/),
      error: expect.stringMatching(/could not be put back/),
    });
    // No reload (the marker would put the copy back, but the person is told first) and no retry.
    expect(mocks.reloadApp).not.toHaveBeenCalled();
    expect(mocks.events).toEqual(['mark']);
    expect(screen.queryByRole('button', { name: 'Restore this backup' })).toBeNull();
  });
});
