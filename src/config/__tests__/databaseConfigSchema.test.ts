// ABOUTME: Comprehensive tests for database configuration schema validation
// ABOUTME: Tests validation rules, auto-fix capabilities, migration system, and error handling

import { 
  DatabaseConfigValidator, 
  databaseConfigValidator,
  DATABASE_CONFIG_VALIDATION_RULES,
  DATABASE_CONFIG_MIGRATIONS
} from '../databaseConfigSchema';
import { DatabaseProvider } from '../environmentMatrix';

describe('DatabaseConfigValidator', () => {
  let validator: DatabaseConfigValidator;

  beforeEach(() => {
    validator = new DatabaseConfigValidator();
  });

  describe('Validation Rules', () => {
    describe('Provider Validation', () => {
      it('should validate correct provider types', () => {
        const config = { provider: 'sqlite-wasm' as DatabaseProvider };
        const result = validator.validate(config);
        
        const providerErrors = result.errors.filter(e => e.field === 'provider');
        expect(providerErrors).toHaveLength(0);
      });

      it('should reject invalid provider types', () => {
        const config = { provider: 'invalid-provider' as any };
        const result = validator.validate(config);
        
        const providerErrors = result.errors.filter(e => e.field === 'provider');
        expect(providerErrors).toHaveLength(1);
        expect(providerErrors[0].message).toContain('Invalid database provider');
      });

      it('should auto-fix invalid provider types', () => {
        const config = { provider: 'invalid-provider' as any };
        const { fixed } = validator.autoFix(config);
        
        expect(fixed.provider).toBe('sqlite-wasm');
      });
    });

    describe('Performance Validation', () => {
      it('should validate cache size within range', () => {
        const config = {
          performance: { cacheSize: 100 }
        };
        const result = validator.validate(config);
        
        const cacheSizeErrors = result.errors.filter(e => e.field === 'performance.cacheSize');
        expect(cacheSizeErrors).toHaveLength(0);
      });

      it('should reject cache size below minimum', () => {
        const config = {
          performance: { cacheSize: 5 }
        };
        const result = validator.validate(config);
        
        const cacheSizeErrors = result.errors.filter(e => e.field === 'performance.cacheSize');
        expect(cacheSizeErrors).toHaveLength(1);
      });

      it('should auto-fix cache size below minimum', () => {
        const config = {
          performance: { cacheSize: 5 }
        };
        const { fixed } = validator.autoFix(config);

        // The error rule clamps 5 to the hard minimum (10); the follow-up warning rule
        // ("below 50MB may impact performance") then bumps it to the recommended 50.
        expect(fixed.performance.cacheSize).toBe(50);
      });

      it('should validate query timeout within range', () => {
        const config = {
          performance: { queryTimeout: 30000 }
        };
        const result = validator.validate(config);
        
        const timeoutErrors = result.errors.filter(e => e.field === 'performance.queryTimeout');
        expect(timeoutErrors).toHaveLength(0);
      });

      it('should reject query timeout above maximum', () => {
        const config = {
          performance: { queryTimeout: 400000 }
        };
        const result = validator.validate(config);
        
        const timeoutErrors = result.errors.filter(e => e.field === 'performance.queryTimeout');
        expect(timeoutErrors).toHaveLength(1);
      });
    });

    describe('Storage Validation', () => {
      it('should validate positive retention days', () => {
        const config = {
          storage: { retentionDays: 30 }
        };
        const result = validator.validate(config);
        
        const retentionErrors = result.errors.filter(e => e.field === 'storage.retentionDays');
        expect(retentionErrors).toHaveLength(0);
      });

      it('should reject zero retention days', () => {
        const config = {
          storage: { retentionDays: 0 }
        };
        const result = validator.validate(config);
        
        const retentionErrors = result.errors.filter(e => e.field === 'storage.retentionDays');
        expect(retentionErrors).toHaveLength(1);
      });

      it('should auto-fix negative max size', () => {
        const config = {
          storage: { maxSize: -100 }
        };
        const { fixed } = validator.autoFix(config);
        
        expect(fixed.storage.maxSize).toBe(0);
      });
    });

    describe('Sync Validation', () => {
      it('should validate sync interval above minimum', () => {
        const config = {
          sync: { interval: 30000 }
        };
        const result = validator.validate(config);
        
        const intervalErrors = result.errors.filter(e => e.field === 'sync.interval');
        expect(intervalErrors).toHaveLength(0);
      });

      it('should reject sync interval below minimum', () => {
        const config = {
          sync: { interval: 1000 }
        };
        const result = validator.validate(config);
        
        const intervalErrors = result.errors.filter(e => e.field === 'sync.interval');
        expect(intervalErrors).toHaveLength(1);
      });

      it('should validate retry attempts within range', () => {
        const config = {
          sync: { retryAttempts: 3 }
        };
        const result = validator.validate(config);
        
        const retryErrors = result.errors.filter(e => e.field === 'sync.retryAttempts');
        expect(retryErrors).toHaveLength(0);
      });
    });

    describe('Monitoring Validation', () => {
      it('should validate valid log levels', () => {
        const config = {
          monitoring: { logLevel: 'info' }
        };
        const result = validator.validate(config);
        
        const logLevelErrors = result.errors.filter(e => e.field === 'monitoring.logLevel');
        expect(logLevelErrors).toHaveLength(0);
      });

      it('should reject invalid log levels', () => {
        const config = {
          monitoring: { logLevel: 'verbose' }
        };
        const result = validator.validate(config);
        
        const logLevelErrors = result.errors.filter(e => e.field === 'monitoring.logLevel');
        expect(logLevelErrors).toHaveLength(1);
      });

      it('should auto-fix invalid log levels', () => {
        const config = {
          monitoring: { logLevel: 'verbose' }
        };
        const { fixed } = validator.autoFix(config);
        
        expect(fixed.monitoring.logLevel).toBe('info');
      });
    });

    describe('API Configuration Validation', () => {
      it('should validate valid API URLs', () => {
        const config = {
          apiConfig: { apiBaseUrl: 'https://api.example.com' }
        };
        const result = validator.validate(config);
        
        const urlErrors = result.errors.filter(e => e.field === 'apiConfig.apiBaseUrl');
        expect(urlErrors).toHaveLength(0);
      });

      it('should reject invalid API URLs', () => {
        const config = {
          apiConfig: { apiBaseUrl: 'not-a-url' }
        };
        const result = validator.validate(config);
        
        const urlErrors = result.errors.filter(e => e.field === 'apiConfig.apiBaseUrl');
        expect(urlErrors).toHaveLength(1);
      });

      it('should auto-fix invalid API URLs', () => {
        const config = {
          apiConfig: { apiBaseUrl: 'not-a-url' }
        };
        const { fixed } = validator.autoFix(config);
        
        expect(fixed.apiConfig.apiBaseUrl).toBe('');
      });
    });
  });

  describe('Auto-Fix Functionality', () => {
    it('should fix multiple issues in one pass', () => {
      const config = {
        provider: 'invalid-provider',
        performance: {
          cacheSize: 5,
          queryTimeout: 400000,
          batchSize: -1
        },
        storage: {
          retentionDays: 0
        },
        sync: {
          interval: 1000,
          retryAttempts: 0
        },
        monitoring: {
          logLevel: 'verbose'
        }
      };

      const { fixed, changes } = validator.autoFix(config);

      expect(fixed.provider).toBe('sqlite-wasm');
      // cacheSize: error rule clamps 5 → 10, warning rule then raises it to the
      // recommended 50. batchSize -1 clamps to the minimum 1; retentionDays 0
      // falls back to the 30-day default; sync.interval passes the error rule at
      // 5000 then the <30s warning rule raises it to 30000; retryAttempts 0 falls
      // back to the default 3.
      expect(fixed.performance.cacheSize).toBe(50);
      expect(fixed.performance.queryTimeout).toBe(300000);
      expect(fixed.performance.batchSize).toBe(1);
      expect(fixed.storage.retentionDays).toBe(30);
      expect(fixed.sync.interval).toBe(30000);
      expect(fixed.sync.retryAttempts).toBe(3);
      expect(fixed.monitoring.logLevel).toBe('info');
      expect(changes.length).toBeGreaterThan(0);
    });

    it('should not modify valid configuration', () => {
      const config = {
        provider: 'sqlite-wasm',
        performance: {
          cacheSize: 100,
          queryTimeout: 30000,
          batchSize: 1000
        },
        storage: {
          retentionDays: 365
        },
        sync: {
          interval: 30000,
          retryAttempts: 3
        },
        monitoring: {
          logLevel: 'info'
        }
      };

      const { fixed, changes } = validator.autoFix(config);

      expect(fixed).toEqual(config);
      expect(changes).toHaveLength(0);
    });
  });

  describe('Migration System', () => {
    it('should migrate from v1.0.0 to v2.0.0', () => {
      const oldConfig = {
        provider: 'sqlite-wasm',
        cacheSize: 100,
        enableCaching: true,
        maxSize: 500,
        syncEnabled: false,
        logLevel: 'info'
      };

      const { migrated } = validator.migrate(oldConfig, '1.0.0');

      expect(migrated.performance).toBeDefined();
      expect(migrated.performance.cacheSize).toBe(100);
      expect(migrated.performance.enableCaching).toBe(true);
      expect(migrated.storage).toBeDefined();
      expect(migrated.storage.maxSize).toBe(500);
      expect(migrated.sync).toBeDefined();
      expect(migrated.sync.enabled).toBe(false);
      expect(migrated.monitoring).toBeDefined();
      expect(migrated.monitoring.logLevel).toBe('info');
    });

    it('should migrate from v2.0.0 to v2.1.0', () => {
      const oldConfig = {
        provider: 'sqlite',
        apiConfig: 'https://api.example.com'
      };

      const { migrated } = validator.migrate(oldConfig, '2.0.0');

      expect(migrated.provider).toBe('sqlite-wasm');
      expect(migrated.apiConfig).toEqual({
        apiBaseUrl: 'https://api.example.com',
        authType: 'bearer',
        timeout: 30000
      });
    });

    it('should apply multiple migrations in sequence', () => {
      const oldConfig = {
        provider: 'sqlite',
        cacheSize: 50,
        enableCaching: false,
        apiConfig: 'https://api.example.com'
      };

      const { migrated, appliedMigrations } = validator.migrate(oldConfig, '1.0.0');

      expect(appliedMigrations.length).toBeGreaterThan(0);
      expect(migrated.provider).toBe('sqlite-wasm');
      expect(migrated.performance).toBeDefined();
      expect(migrated.apiConfig).toEqual({
        apiBaseUrl: 'https://api.example.com',
        authType: 'bearer',
        timeout: 30000
      });
    });

    it('should not apply migrations if already up to date', () => {
      const currentConfig = {
        provider: 'sqlite-wasm',
        performance: { cacheSize: 100 }
      };

      const { migrated, appliedMigrations } = validator.migrate(currentConfig, '2.1.0');

      expect(appliedMigrations).toHaveLength(0);
      expect(migrated).toEqual(currentConfig);
    });
  });

  describe('Reset to Defaults', () => {
    it('should create development defaults', () => {
      const defaults = validator.resetToDefaults('development');

      expect(defaults.provider).toBe('sqlite-wasm');
      expect(defaults.performance.cacheSize).toBe(50);
      expect(defaults.storage.maxSize).toBe(500);
      expect(defaults.storage.retentionDays).toBe(30);
      expect(defaults.monitoring.logLevel).toBe('debug');
      expect(defaults.features.enableAuditLog).toBe(false);
    });

    it('should create production defaults', () => {
      const defaults = validator.resetToDefaults('production');

      expect(defaults.provider).toBe('sqlite-wasm');
      expect(defaults.performance.cacheSize).toBe(100);
      expect(defaults.storage.maxSize).toBe(0);
      expect(defaults.storage.retentionDays).toBe(365);
      expect(defaults.monitoring.logLevel).toBe('info');
      expect(defaults.features.enableAuditLog).toBe(true);
    });
  });

  describe('Repair Functionality', () => {
    it('should repair configuration with migration and auto-fix', () => {
      const brokenConfig = {
        provider: 'sqlite',
        cacheSize: 5,
        enableCaching: true,
        maxSize: -100,
        syncEnabled: true,
        logLevel: 'verbose'
      };

      const { repaired, changes, migrations, isValid } = validator.repair(brokenConfig, '1.0.0');

      expect(migrations.length).toBeGreaterThan(0);
      expect(changes.length).toBeGreaterThan(0);
      expect(repaired.provider).toBe('sqlite-wasm');
      // cacheSize 5: error rule clamps to 10, warning rule then raises to 50
      expect(repaired.performance.cacheSize).toBe(50);
      expect(repaired.storage.maxSize).toBe(0);
      expect(repaired.monitoring.logLevel).toBe('info');
      expect(isValid).toBe(true);
    });
  });

  describe('Validation Result Structure', () => {
    it('should return complete validation result', () => {
      const config = {
        provider: 'invalid-provider',
        performance: { cacheSize: 5 }
      };

      const result = validator.validate(config);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('canAutoFix');
      expect(result).toHaveProperty('autoFixAvailable');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.canAutoFix).toBe(true);
      expect(result.autoFixAvailable.length).toBeGreaterThan(0);
    });

    it('should provide detailed error information', () => {
      const config = {
        provider: 'invalid-provider'
      };

      const result = validator.validate(config);
      const error = result.errors[0];

      expect(error).toHaveProperty('field');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('currentValue');
      expect(error).toHaveProperty('autoFix');

      expect(error.field).toBe('provider');
      expect(error.currentValue).toBe('invalid-provider');
      expect(typeof error.autoFix).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty configuration', () => {
      const config = {};
      const result = validator.validate(config);

      expect(result.isValid).toBe(true); // Empty config should be valid (uses defaults)
    });

    it('should handle null values', () => {
      const config = {
        performance: {
          cacheSize: null
        }
      };

      const result = validator.validate(config);
      // Should not crash, may have validation issues
      expect(result).toBeDefined();
    });

    it('should handle undefined nested objects', () => {
      const config = {
        provider: 'sqlite-wasm'
        // performance, storage, etc. are undefined
      };

      const result = validator.validate(config);
      expect(result).toBeDefined();
    });
  });
});

describe('Singleton Validator', () => {
  it('should provide singleton instance', () => {
    expect(databaseConfigValidator).toBeInstanceOf(DatabaseConfigValidator);
  });

  it('should use default rules and migrations', () => {
    const result = databaseConfigValidator.validate({
      provider: 'invalid-provider'
    });

    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Validation Rules Export', () => {
  it('should export validation rules', () => {
    expect(DATABASE_CONFIG_VALIDATION_RULES).toBeDefined();
    expect(Array.isArray(DATABASE_CONFIG_VALIDATION_RULES)).toBe(true);
    expect(DATABASE_CONFIG_VALIDATION_RULES.length).toBeGreaterThan(0);
  });

  it('should have properly structured validation rules', () => {
    const rule = DATABASE_CONFIG_VALIDATION_RULES[0];

    expect(rule).toHaveProperty('field');
    expect(rule).toHaveProperty('validator');
    expect(rule).toHaveProperty('message');
    expect(rule).toHaveProperty('severity');

    expect(typeof rule.field).toBe('string');
    expect(typeof rule.validator).toBe('function');
    expect(typeof rule.message).toBe('string');
    expect(['error', 'warning', 'info']).toContain(rule.severity);
  });
});

describe('Migration Definitions Export', () => {
  it('should export migration definitions', () => {
    expect(DATABASE_CONFIG_MIGRATIONS).toBeDefined();
    expect(Array.isArray(DATABASE_CONFIG_MIGRATIONS)).toBe(true);
    expect(DATABASE_CONFIG_MIGRATIONS.length).toBeGreaterThan(0);
  });

  it('should have properly structured migrations', () => {
    const migration = DATABASE_CONFIG_MIGRATIONS[0];

    expect(migration).toHaveProperty('fromVersion');
    expect(migration).toHaveProperty('toVersion');
    expect(migration).toHaveProperty('description');
    expect(migration).toHaveProperty('migrate');

    expect(typeof migration.fromVersion).toBe('string');
    expect(typeof migration.toVersion).toBe('string');
    expect(typeof migration.description).toBe('string');
    expect(typeof migration.migrate).toBe('function');
  });
});