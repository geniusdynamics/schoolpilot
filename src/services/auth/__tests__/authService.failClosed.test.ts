// ABOUTME: Unit tests proving authService fails closed: live mode never falls back to demo login.
// ABOUTME: Covers wrong password, storage errors, empty users table (create administrator) and stale demo sessions.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword } from '@/utils/passwordHash';

type Row = Record<string, any>;

const matches = (row: Row, selector: Row = {}) =>
  Object.entries(selector).every(([key, value]) => row[key] === value);

function makeCollection(rows: Row[] = []) {
  return {
    rows,
    find: vi.fn(async (query: { selector?: Row } = {}) => rows.filter((r) => matches(r, query.selector))),
    findOne: vi.fn(async (query: { selector?: Row } = {}) => rows.find((r) => matches(r, query.selector)) ?? null),
    insert: vi.fn(async (doc: Row) => {
      const row = { id: doc.id ?? `id_${rows.length + 1}`, ...doc };
      rows.push(row);
      return row;
    }),
    update: vi.fn(async (id: string, patch: Row) => {
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, patch);
      return row;
    }),
  };
}

/** Like SQLite: querying a column the table does not have throws. */
function makeStrictCollection(columns: string[], rows: Row[] = []) {
  const collection = makeCollection(rows);
  const guard = (query: { selector?: Row } = {}) => {
    const unknown = Object.keys(query.selector ?? {}).find((key) => !columns.includes(key));
    if (unknown) throw new Error(`no such column: "${unknown}"`);
  };
  const { find, findOne } = collection;
  collection.find = vi.fn(async (query: { selector?: Row } = {}) => { guard(query); return find(query); });
  collection.findOne = vi.fn(async (query: { selector?: Row } = {}) => { guard(query); return findOne(query); });
  return collection;
}

const state = vi.hoisted(() => ({
  hasIndexedDB: true,
  dbInitError: null as Error | null,
  provider: {} as unknown,
  collections: {} as Record<string, any>,
  config: { dataMode: 'production', demo: { active: false } } as Record<string, any>,
  // What getConfig() returns before init() has loaded storage (environment defaults).
  defaultConfig: { dataMode: 'production', demo: { active: true } } as Record<string, any>,
  configLoaded: false,
  storedDataMode: 'production' as string | null,
  legacyDataMode: null as string | null,
  switchToDemo: null as any,
}));

vi.mock('@/services/database/detection/CapabilityDetector', () => ({
  CapabilityDetector: {
    getInstance: () => ({ hasCapability: async () => state.hasIndexedDB }),
  },
}));

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    initialize: vi.fn(async () => {
      if (state.dbInitError) throw state.dbInitError;
    }),
    isServiceInitialized: () => !state.dbInitError,
    getDetectedProviderType: () => 'sqlite-wasm',
    getDatabase: vi.fn(async () => ({})),
    getProvider: () => state.provider,
    getCollection: (name: string) => state.collections[name] ?? null,
  },
}));

vi.mock('@/config/unifiedConfig', () => ({
  unifiedConfigManager: {
    getConfig: () => (state.configLoaded ? state.config : state.defaultConfig),
    init: vi.fn(async () => {
      await Promise.resolve();
      // Mirrors the real manager: a legacy dataMode key is migrated into storage during init.
      if (state.legacyDataMode && state.storedDataMode === null) {
        state.storedDataMode = state.legacyDataMode;
        state.legacyDataMode = null;
      }
      state.configLoaded = true;
    }),
    switchToDemo: (...args: unknown[]) => state.switchToDemo(...args),
  },
  getStoredDataMode: () => state.storedDataMode,
}));

vi.mock('@/config/errorTracking', () => ({ reportError: vi.fn() }));
vi.mock('@/core/rbacService', () => ({ rbacService: { assignRoleToUser: vi.fn() } }));
vi.mock('@/services/auth/userPermissionsService', () => ({
  userPermissionsService: { getUserPermissions: vi.fn(async () => []) },
}));

async function freshAuthService() {
  vi.resetModules();
  const mod = await import('@/services/auth/authService');
  await mod.authService.isAuthenticated(); // waits for initialisation
  return mod.authService;
}

async function storedHash(password: string) {
  const h = await hashPassword(password, 1000);
  return `${h.hash}:${h.salt}:${h.iterations}`;
}

const live = () => ({ dataMode: 'production', demo: { active: false } });

describe('authService fails closed', () => {
  beforeEach(() => {
    localStorage.clear();
    state.hasIndexedDB = true;
    state.dbInitError = null;
    state.provider = {};
    state.collections = { users: makeCollection(), user_roles: makeCollection(), rbac_roles: makeCollection() };
    state.config = live();
    state.defaultConfig = { dataMode: 'production', demo: { active: true } };
    state.configLoaded = false;
    state.storedDataMode = 'production';
    state.legacyDataMode = null;
    state.switchToDemo = vi.fn(async () => {});
  });

  it('rejects a wrong password in live mode (probe C04)', async () => {
    state.collections.users.rows.push({
      id: 'u1', username: 'admin', isActive: true, hashed_password: await storedHash('correct horse battery'),
    });
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'definitely-wrong' });

    expect(result.success).toBe(false);
    expect(auth.getCurrentSession()).toBeNull();
    expect(state.switchToDemo).not.toHaveBeenCalled();
  });

  it('accepts the right password in live mode with a non-demo session', async () => {
    state.collections.users.rows.push({
      id: 'u1', username: 'admin', isActive: true, hashed_password: await storedHash('correct horse battery'),
    });
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'correct horse battery' });

    expect(result.success).toBe(true);
    expect(result.session?.isDemo).toBe(false);
  });

  it('never accepts the legacy admin123 seed password in live mode', async () => {
    state.collections.users.rows.push({
      id: 'u1', username: 'admin', isActive: true, hashed_password: 'mockhashedpassword',
    });
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'admin123' });

    expect(result.success).toBe(false);
  });

  it('returns storage-unavailable (not demo) when the database fails to initialise', async () => {
    state.dbInitError = new Error('OPFS unavailable');
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'anything' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('storage-unavailable');
    expect(result.session).toBeUndefined();
    expect(state.switchToDemo).not.toHaveBeenCalled();
    expect((await auth.getLoginState()).status).toBe('storage-unavailable');
  });

  it('returns storage-unavailable when IndexedDB is missing', async () => {
    state.hasIndexedDB = false;
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'anything' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('storage-unavailable');
    expect(state.switchToDemo).not.toHaveBeenCalled();
  });

  it('returns storage-unavailable when there is no database provider', async () => {
    state.provider = null;
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'anything' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('storage-unavailable');
    expect(state.switchToDemo).not.toHaveBeenCalled();
  });

  it('returns storage-unavailable when the users collection is missing', async () => {
    delete state.collections.users;
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'anything' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('storage-unavailable');
    expect(state.switchToDemo).not.toHaveBeenCalled();
  });

  it('returns an explicit error when reading users throws', async () => {
    state.collections.users.find.mockRejectedValue(new Error('disk I/O error'));
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'anything' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('storage-unavailable');
    expect(result.session).toBeUndefined();
    expect(state.switchToDemo).not.toHaveBeenCalled();
  });

  it('offers the create-administrator path when the users table is empty', async () => {
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'admin123' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('no-administrator');
    expect(state.switchToDemo).not.toHaveBeenCalled();
    expect(await auth.getLoginState()).toEqual({ mode: 'live', status: 'needs-administrator' });
  });

  it('creates the first administrator, who can then sign in', async () => {
    const auth = await freshAuthService();

    const created = await auth.createInitialAdministrator({
      username: 'principal', displayName: 'The Principal', password: 'a-long-secret',
    });
    expect(created.success).toBe(true);
    expect(state.collections.users.rows).toHaveLength(1);
    expect(state.collections.users.rows[0].hashed_password).not.toContain('a-long-secret');
    // Stored with the users/user_roles schema columns so SQLite keeps them.
    expect(state.collections.users.rows[0]).toMatchObject({ is_active: true, role: 'super_admin', role_id: 'super_admin' });
    expect(state.collections.user_roles.rows[0]).toMatchObject({ user_id: state.collections.users.rows[0].id, role_id: 'super_admin' });

    expect((await auth.login({ username: 'principal', password: 'wrong-password' })).success).toBe(false);
    const ok = await auth.login({ username: 'principal', password: 'a-long-secret' });
    expect(ok.success).toBe(true);
    expect(ok.user?.role).toBe('super_admin');
    expect(await auth.getLoginState()).toEqual({ mode: 'live', status: 'ready' });
  });

  it('signs in a user whose row carries only the schema column is_active (SQLite stores 1)', async () => {
    state.collections.users.rows.push({
      id: 'u1', username: 'admin', is_active: 1, hashed_password: await storedHash('correct horse battery'),
    });
    const auth = await freshAuthService();

    const ok = await auth.login({ username: 'admin', password: 'correct horse battery' });

    expect(ok.success).toBe(true);
    expect(ok.user?.isActive).toBe(true);
  });

  it('reads user roles by the schema columns user_id/role_id', async () => {
    state.collections.users.rows.push({
      id: 'u1', username: 'bursar', is_active: 1, role: 'user', hashed_password: await storedHash('correct horse battery'),
    });
    state.collections.user_roles = makeStrictCollection(
      ['id', 'user_id', 'role_id', 'created_at', 'updated_at'],
      [{ id: 'ur1', user_id: 'u1', role_id: 'bursar' }],
    );
    const auth = await freshAuthService();

    const ok = await auth.login({ username: 'bursar', password: 'correct horse battery' });

    expect(ok.success).toBe(true);
    expect(ok.user?.role).toBe('bursar');
  });

  it('rejects a user whose is_active column is false', async () => {
    state.collections.users.rows.push({
      id: 'u1', username: 'admin', is_active: 0, hashed_password: await storedHash('correct horse battery'),
    });
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'correct horse battery' });

    expect(result.success).toBe(false);
  });

  it('rejects an administrator password shorter than 10 characters', async () => {
    const auth = await freshAuthService();

    const created = await auth.createInitialAdministrator({
      username: 'principal', displayName: 'The Principal', password: 'short',
    });

    expect(created.success).toBe(false);
    expect(state.collections.users.rows).toHaveLength(0);
  });

  it('refuses to create another administrator once users exist', async () => {
    state.collections.users.rows.push({ id: 'u1', username: 'admin', isActive: true, hashed_password: 'x:y:1' });
    const auth = await freshAuthService();

    const created = await auth.createInitialAdministrator({
      username: 'intruder', displayName: 'Intruder', password: 'a-long-secret',
    });

    expect(created.success).toBe(false);
    expect(state.collections.users.rows).toHaveLength(1);
  });

  it('does not restore a demo session in live mode', async () => {
    localStorage.setItem('schoolpilot_auth_session', JSON.stringify({
      user: { id: 'USR_DEMO_ADMIN', username: 'admin', role: 'super_admin', permissions: ['*'], moduleAccess: [] },
      token: 'demo_x',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      isDemo: true,
    }));
    const auth = await freshAuthService();

    expect(await auth.isAuthenticated()).toBe(false);
    expect(auth.getCurrentSession()).toBeNull();
  });

  it('rejects a wrong password when the unloaded default config says demo.active but storage says production', async () => {
    state.config = { dataMode: 'production', demo: { active: true } };
    state.defaultConfig = { dataMode: 'production', demo: { active: true } };
    state.storedDataMode = 'production';
    state.collections.users.rows.push({
      id: 'u1', username: 'admin', isActive: true, hashed_password: await storedHash('correct horse battery'),
    });
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'admin', password: 'definitely-wrong' });

    expect(result.success).toBe(false);
    expect(result.session).toBeUndefined();
    expect((await auth.getLoginState()).mode).toBe('live');
  });

  it('treats a fresh install with no persisted data mode as live, even if environment defaults say demo', async () => {
    state.storedDataMode = null;
    state.defaultConfig = { dataMode: 'demo', demo: { active: true } };
    state.config = { dataMode: 'demo', demo: { active: true } };
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'teacher', password: 'anything' });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('no-administrator');
    expect(await auth.getLoginState()).toEqual({ mode: 'live', status: 'needs-administrator' });
  });

  it('waits for the configuration to load before deciding the mode', async () => {
    state.storedDataMode = null;
    state.legacyDataMode = 'demo';
    const auth = await freshAuthService();

    expect((await auth.getLoginState()).mode).toBe('demo');
  });

  it('uses demo login only when the persisted configuration is a demo database', async () => {
    state.config = { dataMode: 'demo', demo: { active: true } };
    state.storedDataMode = 'demo';
    const auth = await freshAuthService();

    const result = await auth.login({ username: 'teacher', password: 'anything' });

    expect(result.success).toBe(true);
    expect(result.session?.isDemo).toBe(true);
    expect((await auth.getLoginState()).mode).toBe('demo');
  });
});
