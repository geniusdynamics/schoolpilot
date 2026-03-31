// ABOUTME: Parity tests for unifiedConfig facade after runtime logic extraction.
// ABOUTME: Verifies environment/database behavior remains stable from public API entry points.

import {
  UnifiedConfigManager,
  DB_ENV_VARS,
  detectOptimalConfiguration,
} from '../unifiedConfig';

describe('unifiedConfig facade parity', () => {
  let configManager: UnifiedConfigManager;
  const envBackup: Record<string, string | undefined> = {};
  const managedEnvKeys = [
    DB_ENV_VARS.DATABASE_PROVIDER,
    DB_ENV_VARS.DATABASE_CACHE_SIZE,
    DB_ENV_VARS.DATABASE_ENABLE_CACHING,
    DB_ENV_VARS.DATABASE_COMPRESSION,
    DB_ENV_VARS.DATABASE_LOG_LEVEL,
    DB_ENV_VARS.DATABASE_SYNC_CONFLICT_RESOLUTION,
    DB_ENV_VARS.DATABASE_API_BASE_URL,
    DB_ENV_VARS.DATABASE_API_AUTH_TYPE,
    DB_ENV_VARS.DATABASE_API_TIMEOUT,
  ];

  beforeEach(() => {
    localStorage.clear();
    configManager = new (UnifiedConfigManager as any)();

    managedEnvKeys.forEach((key) => {
      envBackup[key] = process.env[key];
      delete process.env[key];
    });
  });

  afterEach(() => {
    managedEnvKeys.forEach((key) => {
      if (envBackup[key] === undefined) {
        delete process.env[key];
        return;
      }
      process.env[key] = envBackup[key];
    });
  });

  it('reloadFromEnvironment applies env overrides with the same parsing semantics', () => {
    process.env[DB_ENV_VARS.DATABASE_PROVIDER] = 'sqlite-wasm';
    process.env[DB_ENV_VARS.DATABASE_CACHE_SIZE] = '432';
    process.env[DB_ENV_VARS.DATABASE_ENABLE_CACHING] = 'true';
    process.env[DB_ENV_VARS.DATABASE_COMPRESSION] = 'false';
    process.env[DB_ENV_VARS.DATABASE_LOG_LEVEL] = 'debug';
    process.env[DB_ENV_VARS.DATABASE_SYNC_CONFLICT_RESOLUTION] = 'merge';
    process.env[DB_ENV_VARS.DATABASE_API_BASE_URL] = 'https://api.schoolpilot.test';
    process.env[DB_ENV_VARS.DATABASE_API_AUTH_TYPE] = 'api-key';
    process.env[DB_ENV_VARS.DATABASE_API_TIMEOUT] = '4500';

    configManager.reloadFromEnvironment();
    const config = configManager.getDatabaseConfig();

    expect(config.provider).toBe('sqlite-wasm');
    expect(config.performance.cacheSize).toBe(432);
    expect(config.performance.enableCaching).toBe(true);
    expect(config.storage.compressionEnabled).toBe(false);
    expect(config.monitoring.logLevel).toBe('debug');
    expect(config.sync.conflictResolution).toBe('merge');
    expect(config.apiConfig?.apiBaseUrl).toBe('https://api.schoolpilot.test');
    expect(config.apiConfig?.authType).toBe('api-key');
    expect(config.apiConfig?.timeout).toBe(4500);
  });

  it('exportDatabaseConfigAsEnvVars preserves serialized key/value behavior', () => {
    configManager.updateDatabaseConfig({
      provider: 'sqlite-wasm',
      autoDetect: true,
      connectionString: 'file://schoolpilot.sqlite',
      performance: { cacheSize: 321, enableCaching: false, queryTimeout: 9000, batchSize: 333 },
      storage: { maxSize: 111, compressionEnabled: true, encryptionEnabled: false, backupEnabled: true, retentionDays: 30 },
      sync: { enabled: true, interval: 1234, conflictResolution: 'manual', batchSize: 12, retryAttempts: 7, timeout: 4321 },
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 60000,
        enablePerformanceMetrics: false,
        enableErrorReporting: true,
        logLevel: 'warn',
      },
      features: {
        enableFullTextSearch: true,
        enableTransactions: false,
        enableRealTimeUpdates: true,
        enableOfflineMode: true,
        enableDataValidation: true,
        enableAuditLog: false,
      },
      apiConfig: {
        apiBaseUrl: 'https://api.schoolpilot.test',
        apiKey: 'key_123',
        authToken: 'token_456',
        authType: 'bearer',
        timeout: 9876,
      },
    });

    const envVars = configManager.exportDatabaseConfigAsEnvVars();
    expect(envVars[DB_ENV_VARS.DATABASE_PROVIDER]).toBe('sqlite-wasm');
    expect(envVars[DB_ENV_VARS.DATABASE_CACHE_SIZE]).toBe('321');
    expect(envVars[DB_ENV_VARS.DATABASE_ENABLE_CACHING]).toBe('false');
    expect(envVars[DB_ENV_VARS.DATABASE_LOG_LEVEL]).toBe('warn');
    expect(envVars[DB_ENV_VARS.DATABASE_API_BASE_URL]).toBe('https://api.schoolpilot.test');
    expect(envVars[DB_ENV_VARS.DATABASE_API_TIMEOUT]).toBe('9876');
  });

  it('detectOptimalConfiguration keeps facade contract', () => {
    const optimal = detectOptimalConfiguration();
    expect(typeof optimal.useEnhancedFeatures).toBe('boolean');
    expect(optimal.features).toMatchObject({
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      globalNotifications: true,
      performanceMonitorWidget: false,
    });
  });
});
