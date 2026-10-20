// ABOUTME: Unit tests proving UnifiedDatabaseManager fails closed when persistent SQLite storage is unavailable.
// ABOUTME: Neither the fallback chain, the capability swap nor attemptRecovery may replace SQLite with another store.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sqlite.org/sqlite-wasm', () => ({ default: vi.fn() }));

const factory = vi.hoisted(() => ({
  getAvailableProviderTypes: vi.fn(() => ['pouchdb']),
  isProviderAvailable: vi.fn((type: string) => type === 'pouchdb'),
  createProviderWithRequirements: vi.fn(),
}));

vi.mock('../DatabaseProviderFactory', () => ({
  getDatabaseProviderFactory: () => factory,
}));

const seedMock = vi.hoisted(() => vi.fn(async () => ({ totalRecords: 0 })));
vi.mock('../demoDataSeed', () => ({ seedProviderWithDemoData: seedMock }));

vi.mock('../detection/CapabilityDetector', () => ({
  CapabilityDetector: {
    getInstance: () => ({
      getProviderRecommendation: async () => ({ recommended: 'pouchdb', alternatives: ['backend-api'] }),
    }),
  },
}));

import { UnifiedDatabaseManager } from '../UnifiedDatabaseManager';
import { StorageUnavailableError } from '../SQLiteWASMProvider';

describe('UnifiedDatabaseManager fail-closed storage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DB_PROVIDER', 'sqlite-wasm');
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    factory.isProviderAvailable.mockImplementation((type: string) => type === 'pouchdb');
    factory.createProviderWithRequirements.mockReset();
    factory.createProviderWithRequirements.mockRejectedValue(new StorageUnavailableError('Missing required OPFS APIs.'));
    (UnifiedDatabaseManager as any).instance = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects with StorageUnavailableError when SQLite has no OPFS, without falling back to PouchDB', async () => {
    const manager = UnifiedDatabaseManager.getInstance();

    await expect(manager.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);

    expect(factory.createProviderWithRequirements).not.toHaveBeenCalled();
    expect(manager.getProviderType()).toBe('sqlite-wasm');
    expect(manager.getProvider()).toBeNull();
  });

  it('rethrows the provider StorageUnavailableError without recovering onto PouchDB', async () => {
    factory.isProviderAvailable.mockImplementation(() => true);
    const manager = UnifiedDatabaseManager.getInstance();

    await expect(manager.initialize()).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });

    expect(factory.createProviderWithRequirements).toHaveBeenCalledTimes(1);
    expect(manager.getProviderType()).toBe('sqlite-wasm');
    expect(manager.getProvider()).toBeNull();
  });

  it('attemptRecovery refuses to swap stores after a storage failure', async () => {
    factory.isProviderAvailable.mockImplementation(() => true);
    const manager = UnifiedDatabaseManager.getInstance();
    await expect(manager.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);

    await expect(manager.attemptRecovery()).resolves.toBe(false);
    expect(factory.createProviderWithRequirements).toHaveBeenCalledTimes(1);
    expect(manager.getProviderType()).toBe('sqlite-wasm');
  });

  it('does not run attemptRecovery onto PouchDB when SQLite fails with a non-storage error', async () => {
    factory.isProviderAvailable.mockImplementation(() => true);
    factory.createProviderWithRequirements.mockRejectedValue(new Error('Failed to create database provider: boom'));
    const manager = UnifiedDatabaseManager.getInstance();
    const recovery = vi.spyOn(manager, 'attemptRecovery');

    await expect(manager.initialize()).rejects.toThrow(/boom/);

    expect(recovery).not.toHaveBeenCalled();
    expect(factory.createProviderWithRequirements).toHaveBeenCalledTimes(1);
    expect(manager.getProviderType()).toBe('sqlite-wasm');
  });

  it('keeps data when the app version changes (no clearAllData on schema version change)', async () => {
    vi.stubEnv('VITE_APP_VERSION', '9.9.9');
    localStorage.setItem('sp-db-version', '1.0.0');
    const manager = UnifiedDatabaseManager.getInstance();
    const clear = vi.spyOn(manager, 'clearAllData').mockResolvedValue(undefined);

    await (manager as any).checkAndHandleSchemaVersion();

    expect(clear).not.toHaveBeenCalled();
    expect(localStorage.getItem('sp-db-version')).toBe('9.9.9');
  });

  it('seedDatabase never clears existing data and only seeds empty collections', async () => {
    const manager = UnifiedDatabaseManager.getInstance();
    (manager as any).provider = { name: 'fake' };

    await manager.seedDatabase({ dataMode: 'demo', volume: 'medium' });

    expect(seedMock).toHaveBeenCalledTimes(1);
    expect(seedMock.mock.calls[0][1]).toMatchObject({ clearExisting: false, onlyIfEmpty: true });
  });

  it('hands an OPFS-less SQLite to its provider when VITE_DB_ALLOW_MEMORY=true instead of swapping stores', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
    const manager = UnifiedDatabaseManager.getInstance();

    // The mocked factory still rejects; the point is that SQLite is attempted, not PouchDB.
    await expect(manager.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);

    expect(factory.createProviderWithRequirements).toHaveBeenCalledTimes(1);
    expect(manager.getProviderType()).toBe('sqlite-wasm');
  });
});
