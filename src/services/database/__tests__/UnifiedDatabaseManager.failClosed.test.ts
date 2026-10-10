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

  it('hands an OPFS-less SQLite to its provider when VITE_DB_ALLOW_MEMORY=true instead of swapping stores', async () => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
    const manager = UnifiedDatabaseManager.getInstance();

    // The mocked factory still rejects; the point is that SQLite is attempted, not PouchDB.
    await expect(manager.initialize()).rejects.toBeInstanceOf(StorageUnavailableError);

    expect(factory.createProviderWithRequirements).toHaveBeenCalledTimes(1);
    expect(manager.getProviderType()).toBe('sqlite-wasm');
  });
});
