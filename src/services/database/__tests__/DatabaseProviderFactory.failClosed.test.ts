// ABOUTME: Unit tests proving DatabaseProviderFactory fails closed when SQLite cannot open persistent storage.
// ABOUTME: StorageUnavailableError must reach the caller; no PouchDB, backend or in-memory mock fallback unless memory is allowed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sqlite.org/sqlite-wasm', () => ({ default: vi.fn() }));

import { DatabaseProviderFactory, ProviderSelectionStrategy } from '../DatabaseProviderFactory';
import { StorageUnavailableError } from '../SQLiteWASMProvider';
import type { DatabaseConfig, IDatabaseProvider } from '../interfaces';

const baseProvider = (name: string, available: boolean, init: () => Promise<void>): IDatabaseProvider =>
  ({
    name,
    version: '1.0.0',
    initialize: vi.fn(init),
    isAvailable: () => available,
    destroy: vi.fn(async () => {}),
    getStatus: () => ({ isConnected: true, isReady: true, error: null }),
  }) as unknown as IDatabaseProvider;

// getProviderType() keys providers by constructor name, so the fakes carry the real class names.
class FakeSQLiteWASMProvider {}
class FakePouchDBProvider {}
class FakeBackendAPIProvider {}

const asType = <T extends object>(ctor: new () => T, provider: IDatabaseProvider): IDatabaseProvider =>
  Object.setPrototypeOf(provider, ctor.prototype);

const sqliteStrategy: ProviderSelectionStrategy = { selectProvider: () => 'sqlite-wasm' };
const pouchStrategy: ProviderSelectionStrategy = { selectProvider: () => 'pouchdb' };

const config: DatabaseConfig = { name: 'fail_closed_test', version: 1 } as DatabaseConfig;
const requirements = {
  collectionsCount: 1,
  requiresOffline: true,
  requiresSync: false,
  requiresReactivity: false,
  performanceLevel: 'standard' as const,
  storageQuota: 1,
};

describe('DatabaseProviderFactory fail-closed storage', () => {
  let pouch: IDatabaseProvider;
  let backend: IDatabaseProvider;

  beforeEach(() => {
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', '');
    pouch = asType(FakePouchDBProvider, baseProvider('PouchDB', true, async () => {}));
    backend = asType(FakeBackendAPIProvider, baseProvider('BackendAPI', true, async () => {}));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const factoryWith = (strategy: ProviderSelectionStrategy, sqlite: IDatabaseProvider) => {
    const factory = new DatabaseProviderFactory(strategy);
    factory.registerProvider(sqlite);
    factory.registerProvider(pouch);
    factory.registerProvider(backend);
    return factory;
  };

  it('rethrows StorageUnavailableError from SQLite instead of falling back', async () => {
    const sqlite = asType(
      FakeSQLiteWASMProvider,
      baseProvider('SQLiteWASM', true, async () => {
        throw new StorageUnavailableError('Missing required OPFS APIs.');
      })
    );
    const factory = factoryWith(sqliteStrategy, sqlite);

    const result = factory.createProviderWithRequirements(config, requirements);

    await expect(result).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(result).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(pouch.initialize).not.toHaveBeenCalled();
    expect(backend.initialize).not.toHaveBeenCalled();
    expect(factory.getActiveProvider()).toBeNull();
  });

  it('lets SQLite report missing OPFS itself rather than skipping it as unavailable', async () => {
    const sqlite = asType(
      FakeSQLiteWASMProvider,
      baseProvider('SQLiteWASM', false, async () => {
        throw new StorageUnavailableError('OPFS (Origin Private File System) is not available in this browser');
      })
    );
    const factory = factoryWith(sqliteStrategy, sqlite);

    await expect(factory.createProviderWithRequirements(config, requirements)).rejects.toBeInstanceOf(
      StorageUnavailableError
    );
    expect(sqlite.initialize).toHaveBeenCalled();
    expect(pouch.initialize).not.toHaveBeenCalled();
  });

  it('rethrows StorageUnavailableError when SQLite is reached as a fallback', async () => {
    pouch = asType(
      FakePouchDBProvider,
      baseProvider('PouchDB', true, async () => {
        throw new Error('IndexedDB blocked');
      })
    );
    const sqlite = asType(
      FakeSQLiteWASMProvider,
      baseProvider('SQLiteWASM', true, async () => {
        throw new StorageUnavailableError('Missing required OPFS APIs.');
      })
    );
    const factory = factoryWith(pouchStrategy, sqlite);

    await expect(factory.createProviderWithRequirements(config, requirements)).rejects.toBeInstanceOf(
      StorageUnavailableError
    );
    expect(backend.initialize).not.toHaveBeenCalled();
  });

  it('does not fall back to PouchDB when SQLite fails with a plain Error', async () => {
    const sqlite = asType(
      FakeSQLiteWASMProvider,
      baseProvider('SQLiteWASM', true, async () => {
        throw new Error('wasm init failed');
      })
    );
    const factory = factoryWith(sqliteStrategy, sqlite);

    const result = factory.createProviderWithRequirements(config, requirements);

    await expect(result).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(result).rejects.toThrow(/wasm init failed/);
    expect(pouch.initialize).not.toHaveBeenCalled();
    expect(backend.initialize).not.toHaveBeenCalled();
  });

  it('fails closed when SQLite is the primary store but is not registered', async () => {
    const factory = new DatabaseProviderFactory(sqliteStrategy);
    factory.registerProvider(pouch);

    await expect(factory.createProviderWithRequirements(config, requirements)).rejects.toBeInstanceOf(
      StorageUnavailableError
    );
    expect(pouch.initialize).not.toHaveBeenCalled();
  });

  it('does not substitute the in-memory mock provider unless VITE_DB_ALLOW_MEMORY=true', async () => {
    const failing = async () => {
      throw new Error('init failed');
    };
    const sqlite = asType(FakeSQLiteWASMProvider, baseProvider('SQLiteWASM', true, failing));
    pouch = asType(FakePouchDBProvider, baseProvider('PouchDB', true, failing));
    backend = asType(FakeBackendAPIProvider, baseProvider('BackendAPI', true, failing));

    // SQLite primary no longer reaches the fallback chain, so exercise the mock
    // refusal with a non-SQLite primary whose stores all fail.
    const closed = new DatabaseProviderFactory(pouchStrategy);
    closed.registerProvider(pouch);
    closed.registerProvider(backend);
    await expect(closed.createProviderWithRequirements(config, requirements)).rejects.toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
    });

    // With memory explicitly allowed, a failing SQLite may still fall through to the mock.

    vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
    const open = factoryWith(sqliteStrategy, sqlite);
    const provider = await open.createProviderWithRequirements(config, requirements);
    expect(provider.name).toBe('MockProvider');
  });

  it('still uses a working SQLite provider', async () => {
    const sqlite = asType(FakeSQLiteWASMProvider, baseProvider('SQLiteWASM', true, async () => {}));
    const factory = factoryWith(sqliteStrategy, sqlite);

    await expect(factory.createProviderWithRequirements(config, requirements)).resolves.toBe(sqlite);
    expect(pouch.initialize).not.toHaveBeenCalled();
  });
});
