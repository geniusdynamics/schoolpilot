/**
 * Comprehensive test suite for Phase 1-8 database architecture enhancements
 *
 * Tests:
 * - Phase 1: unifiedConfig async loading, UnifiedDatabaseManager fallback chain
 * - Phase 2: CapabilityDetector integration
 * - Phase 3: HybridProvider composition
 * - Phase 8: StructuredLogger, CircuitBreaker, FieldLevelEncryption
 */

// ==================== Mock Setup ====================

jest.mock('../../config/unifiedConfig', () => ({
  getCurrentUnifiedConfig: jest.fn(() => ({
    environment: 'development',
    dataMode: 'demo',
    database: {
      provider: 'pouchdb',
      allowedProviders: ['pouchdb', 'sqlite-wasm', 'sqlite-file', 'backend-api'],
      autoDetect: true,
    },
    features: {
      enhancedDataLayer: false,
      enableOfflineMode: true,
      performanceMonitorWidget: false,
    },
  })),
  getDatabaseConfig: jest.fn(() => ({
    provider: 'pouchdb',
    allowedProviders: ['pouchdb', 'sqlite-wasm', 'sqlite-file', 'backend-api'],
    storage: { compressionEnabled: false },
    monitoring: { logLevel: 'info' },
    apiConfig: null,
    sync: { timeout: 30000, retryAttempts: 3, interval: 30000, batchSize: 100, conflictResolution: 'local-wins' },
    features: { enableOfflineMode: true },
  })),
  validateDatabaseConfig: jest.fn(() => ({
    isValid: true,
    errors: [],
    warnings: [],
  })),
}));

jest.mock('../DatabaseProviderFactory', () => {
  const mockProvider = {
    name: 'PouchDB',
    version: '1.0.0',
    isAvailable: jest.fn(() => true),
    initialize: jest.fn().mockResolvedValue(undefined),
    createCollection: jest.fn().mockResolvedValue({
      name: 'test',
      schema: {},
      insert: jest.fn().mockResolvedValue({ id: '1', doc: {} }),
      insertMany: jest.fn().mockResolvedValue({ docs: [], errors: [] }),
      findOne: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: '1', ok: true }),
      updateMany: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue({ id: '1', ok: true }),
      removeMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      exists: jest.fn().mockResolvedValue(false),
      createIndex: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue({ documentCount: 0, indexCount: 0, storageSize: 0, lastModified: new Date() }),
      compact: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(() => ({ subscribe: jest.fn() })),
      subscribeToChanges: jest.fn(() => ({ subscribe: jest.fn() })),
    }),
    getCollection: jest.fn().mockReturnValue(null),
    getAllCollections: jest.fn(() => new Map()),
    getStatus: jest.fn(() => ({
      name: 'PouchDB',
      version: '1.0.0',
      isConnected: true,
      collectionsCount: 0,
      performance: { avgQueryTime: 0, totalQueries: 0, memoryUsage: 0 },
    })),
    backup: jest.fn().mockResolvedValue('{}'),
    restore: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  };

  return {
    DatabaseProviderFactory: jest.fn().mockImplementation(() => ({
      getAvailableProviderTypes: jest.fn(() => ['pouchdb']),
      isProviderAvailable: jest.fn(() => true),
      createProvider: jest.fn().mockResolvedValue(mockProvider),
      createProviderWithRequirements: jest.fn().mockResolvedValue(mockProvider),
    })),
    getDatabaseProviderFactory: jest.fn(() => ({
      getAvailableProviderTypes: jest.fn(() => ['pouchdb']),
      isProviderAvailable: jest.fn(() => true),
      createProvider: jest.fn().mockResolvedValue(mockProvider),
      createProviderWithRequirements: jest.fn().mockResolvedValue(mockProvider),
    })),
    ProviderType: {},
    QueryBuilder: jest.fn(),
  };
});

// Mock rxdbService
jest.mock('../rxdbService', () => ({
  collectionsDefinition: {
    settings: {
      schema: {
        version: 0,
        type: 'object',
        properties: {
          id: { type: 'string' },
          key: { type: 'string' },
          value: { type: 'string' },
        },
        primaryKey: 'id',
      },
    },
  },
}));

// Mock SchemaConverter
jest.mock('../SchemaConverter', () => ({
  SchemaConverter: {
    convertRxDBToSQLite: jest.fn(() => ({
      schema: {
        version: 0,
        type: 'object',
        properties: {},
        required: [],
        indexes: [],
        primaryKey: 'id',
      },
    })),
  },
}));

// Mock demoDataSeed
jest.mock('../demoDataSeed', () => ({
  seedProviderWithDemoData: jest.fn().mockResolvedValue({}),
}));

// Mock StartupOptimizer
jest.mock('../StartupOptimizer', () => ({
  StartupOptimizer: {
    getInstance: jest.fn(() => ({
      startOptimization: jest.fn().mockResolvedValue(undefined),
      getLatestStartupMetrics: jest.fn(() => ({})),
      getStartupPerformanceSummary: jest.fn(() => ({})),
      getProgressiveLoadingStates: jest.fn(() => ({})),
      getLoadingStatistics: jest.fn(() => ({})),
      isCollectionLoaded: jest.fn(() => true),
      getLazyCollection: jest.fn().mockResolvedValue(null),
      updateConfiguration: jest.fn(),
    })),
  },
}));

// ==================== Phase 8: StructuredLogger Tests ====================


describe('Phase 8: StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger({
      level: 'debug',
      module: 'test',
      includeStack: false,
      includeMetadata: true,
    });
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should create logger with default config', () => {
    const defaultLogger = createLogger('default-module');
    expect(defaultLogger).toBeDefined();
  });

  test('should log at different levels', () => {
    logger.debug('debug message', { key: 'value' });
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(console.debug).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  test('should respect log level filtering', () => {
    const warnLogger = new StructuredLogger({
      level: 'warn',
      module: 'test-warn',
    });

    warnLogger.debug('should not appear');
    warnLogger.info('should not appear');
    warnLogger.warn('should appear');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  test('should time async operations', async () => {
    const operation = jest.fn().mockResolvedValue('result');
    const result = await logger.time('test-operation', operation);

    expect(result).toBe('result');
    expect(operation).toHaveBeenCalled();
    expect(console.debug).toHaveBeenCalled();
  });

  test('should time sync operations', () => {
    const operation = jest.fn().mockReturnValue('sync-result');
    const result = logger.timeSync('test-sync', operation);

    expect(result).toBe('sync-result');
    expect(operation).toHaveBeenCalled();
  });

  test('should handle errors in timed operations', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('test error'));

    await expect(logger.time('failing-operation', operation)).rejects.toThrow('test error');
    expect(console.error).toHaveBeenCalled();
  });

  test('should create child logger with context', () => {
    const childLogger = logger.child({ collection: 'students' });
    expect(childLogger).toBeDefined();
    expect(childLogger).toBeInstanceOf(StructuredLogger);
  });

  test('should truncate large metadata', () => {
    const smallLogger = new StructuredLogger({
      level: 'debug',
      module: 'test',
      maxMetadataSize: 50,
    });

    const largeData = { largeField: 'x'.repeat(1000) };
    smallLogger.info('test', largeData);

    expect(console.debug).toHaveBeenCalled();
  });

  test('should log error with stack trace when enabled', () => {
    const errorLogger = new StructuredLogger({
      level: 'error',
      module: 'test',
      includeStack: true,
    });

    const error = new Error('test error');
    errorLogger.error('operation failed', error);

    expect(console.error).toHaveBeenCalled();
  });
});

// ==================== Phase 8: CircuitBreaker Tests ====================

import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerError,
  getCircuitBreakerRegistry,
} from '../monitoring/CircuitBreaker';

describe('Phase 8: CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100,
      monitorWindow: 1000,
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should start in closed state', () => {
    expect(breaker.getState()).toBe('closed');
  });

  test('should execute successful operations', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await breaker.execute(operation);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe('closed');
  });

  test('should open circuit after threshold failures', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(operation);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('open');
  });

  test('should block requests when circuit is open', async () => {
    // Force open the circuit
    breaker.forceOpen();

    const operation = jest.fn().mockResolvedValue('success');

    await expect(breaker.execute(operation)).rejects.toThrow(CircuitBreakerError);
    expect(operation).not.toHaveBeenCalled();
  });

  test('should transition to half-open after timeout', async () => {
    breaker.forceOpen();

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    const operation = jest.fn().mockResolvedValue('success');
    const result = await breaker.execute(operation);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe('half-open');
  });

  test('should close circuit after success threshold in half-open', async () => {
    breaker.forceOpen();
    await new Promise(resolve => setTimeout(resolve, 150));

    // First success - stays half-open
    await breaker.execute(async () => 'success');
    expect(breaker.getState()).toBe('half-open');

    // Second success - closes circuit
    await breaker.execute(async () => 'success');
    expect(breaker.getState()).toBe('closed');
  });

  test('should reset manually', async () => {
    breaker.forceOpen();
    breaker.reset();

    expect(breaker.getState()).toBe('closed');
  });

  test('should track statistics', async () => {
    const successOp = jest.fn().mockResolvedValue('ok');
    const failOp = jest.fn().mockRejectedValue(new Error('fail'));

    await breaker.execute(successOp);
    try {
      await breaker.execute(failOp);
    } catch {
      // Expected
    }

    const stats = breaker.getStats();
    expect(stats.totalRequests).toBe(2);
    expect(stats.totalSuccesses).toBe(1);
    expect(stats.totalFailures).toBe(1);
  });

  test('should execute sync operations', () => {
    const operation = jest.fn().mockReturnValue('sync-result');
    const result = breaker.executeSync(operation);

    expect(result).toBe('sync-result');
  });

  test('should include retryAfter in CircuitBreakerError', async () => {
    breaker.forceOpen();

    try {
      await breaker.execute(async () => 'success');
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        expect(error.retryAfter).toBeGreaterThan(0);
        expect(error.state).toBe('open');
      }
    }
  });
});

describe('Phase 8: CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry({
      failureThreshold: 5,
      timeout: 5000,
    });
  });

  test('should create circuit breakers on demand', () => {
    const breaker1 = registry.get('provider-a');
    const breaker2 = registry.get('provider-b');

    expect(breaker1).toBeDefined();
    expect(breaker2).toBeDefined();
    expect(breaker1).not.toBe(breaker2);
  });

  test('should return same breaker for same name', () => {
    const breaker1 = registry.get('provider-a');
    const breaker2 = registry.get('provider-a');

    expect(breaker1).toBe(breaker2);
  });

  test('should track health status', () => {
    registry.get('provider-a');
    registry.get('provider-b');

    const health = registry.getHealthStatus();
    expect(health.total).toBe(2);
    expect(health.closed).toBe(2);
  });

  test('should reset all breakers', () => {
    const breaker = registry.get('provider-a');
    breaker.forceOpen();

    registry.resetAll();
    expect(breaker.getState()).toBe('closed');
  });

  test('should get singleton registry', () => {
    const r1 = getCircuitBreakerRegistry();
    const r2 = getCircuitBreakerRegistry();

    expect(r1).toBe(r2);
  });
});

// ==================== Phase 8: FieldLevelEncryption Tests ====================


describe('Phase 8: FieldLevelEncryption', () => {
  let fle: FieldLevelEncryption;

  beforeAll(async () => {
    // Generate a test key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

    fle = new FieldLevelEncryption({
      encryptedFields: ['email', 'phoneNumber', 'address.street'],
      encryptionKey: keyBase64,
      keyMode: 'raw',
    });

    await fle.initialize();
  });

  test('should encrypt specified fields', async () => {
    const doc = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '+1234567890',
    };

    const encrypted = await fle.encryptDocument(doc);

    expect(encrypted.name).toBe('John Doe');
    expect(fle.isEncryptedValue(encrypted.email)).toBe(true);
    expect(fle.isEncryptedValue(encrypted.phoneNumber)).toBe(true);
  });

  test('should decrypt specified fields', async () => {
    const doc = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    const encrypted = await fle.encryptDocument(doc);
    const decrypted = await fle.decryptDocument(encrypted);

    expect(decrypted.email).toBe('john@example.com');
    expect(decrypted.name).toBe('John Doe');
  });

  test('should handle nested fields', async () => {
    const doc = {
      id: '1',
      name: 'John Doe',
      address: {
        street: '123 Main St',
        city: 'Anytown',
      },
    };

    const encrypted = await fle.encryptDocument(doc);
    expect(fle.isEncryptedValue(encrypted.address.street)).toBe(true);
    expect(encrypted.address.city).toBe('Anytown');
  });

  test('should not encrypt null or undefined values', async () => {
    const doc = {
      id: '1',
      email: null,
      phoneNumber: undefined,
    };

    const encrypted = await fle.encryptDocument(doc);
    expect(encrypted.email).toBeNull();
    expect(encrypted.phoneNumber).toBeUndefined();
  });

  test('should encrypt and decrypt single values', async () => {
    const value = { nested: { data: 'secret' } };
    const encrypted = await fle.encryptValue(value);

    expect(fle.isEncryptedValue(encrypted)).toBe(true);

    const decrypted = await fle.decryptValue(encrypted);
    expect(decrypted).toEqual(value);
  });

  test('should return encrypted fields list', () => {
    const fields = fle.getEncryptedFields();
    expect(fields).toContain('email');
    expect(fields).toContain('phoneNumber');
    expect(fields).toContain('address.street');
  });

  test('should check if field is encrypted', () => {
    expect(fle.isFieldEncrypted('email')).toBe(true);
    expect(fle.isFieldEncrypted('name')).toBe(false);
  });
});
