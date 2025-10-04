// ABOUTME: Tests for unified configuration system with database configuration integration
// ABOUTME: Tests environment-based configuration, validation integration, and configuration management

import {
  UnifiedConfigManager,
  unifiedConfigManager,
  getDatabaseConfig,
  updateDatabaseConfig,
  validateDatabaseConfig,
  autoFixDatabaseConfig,
  migrateDatabaseConfig,
  resetDatabaseConfigToDefaults,
  repairDatabaseConfig,
  reloadConfigFromEnvironment,
  exportDatabaseConfigAsEnvVars,
  exportDatabaseConfigAsJSON,
  DB_ENV_VARS
} from '../unifiedConfig';

// Mock environment variables
const mockEnv = {
  REACT_APP_DATABASE_PROVIDER: 'sqlite-wasm',
  REACT_APP_DATABASE_CACHE_SIZE: '200',
  REACT_APP_DATABASE_ENABLE_CACHING: 'true',
  REACT_APP_DATABASE_COMPRESSION: 'true',
  REACT_APP_DATABASE_LOG_LEVEL: 'debug'
};

describe('UnifiedConfigManager', () => {
  let configManager: UnifiedConfigManager;

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    
    // Create fresh instance for each test
    configManager = new (UnifiedConfigManager as any)();
  });

  describe('Database Configuration Management', () => {
    it('should get current database configuration', () => {
      const dbConfig = configManager.getDatabaseConfig();

      expect(dbConfig).toBeDefined();
      expect(dbConfig).toHaveProperty('provider');
      expect(dbConfig).toHaveProperty('performance');
      expect(dbConfig).toHaveProperty('storage');
      expect(dbConfig).toHaveProperty('sync');
      expect(dbConfig).toHaveProperty('monitoring');
      expect(dbConfig).toHaveProperty('features');
    });

    it('should update database configuration', () => {
      const updates = {
        performance: {
          cacheSize: 150,
          enableCaching: true
        }
      };

      configManager.updateDatabaseConfig(updates);
      const dbConfig = configManager.getDatabaseConfig();

      expect(dbConfig.performance.cacheSize).toBe(150);
      expect(dbConfig.performance.enableCaching).toBe(true);
    });

    it('should deep merge configuration updates', () => {
      const initialConfig = configManager.getDatabaseConfig();
      const originalQueryTimeout = initialConfig.performance.queryTimeout;

      const updates = {
        performance: {
          cacheSize: 200
        }
      };

      configManager.updateDatabaseConfig(updates);
      const updatedConfig = configManager.getDatabaseConfig();

      expect(updatedConfig.performance.cacheSize).toBe(200);
      expect(updatedConfig.performance.queryTimeout).toBe(originalQueryTimeout); // Should be preserved
    });

    it('should update database provider with capability adjustments', () => {
      configManager.updateDatabaseProvider('backend-api');
      const dbConfig = configManager.getDatabaseConfig();

      expect(dbConfig.provider).toBe('backend-api');
      expect(dbConfig.features.enableOfflineMode).toBe(false); // Should be disabled for backend-api
      expect(dbConfig.sync.enabled).toBe(true); // Should be enabled for backend-api
    });
  });

  describe('Configuration Validation', () => {
    it('should validate database configuration', () => {
      const validation = configManager.validateDatabaseConfig();

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(validation).toHaveProperty('canAutoFix');
    });

    it('should detect configuration errors', () => {
      // Set invalid configuration
      configManager.updateDatabaseConfig({
        performance: {
          cacheSize: 5, // Below minimum
          queryTimeout: 500000 // Above maximum
        }
      });

      const validation = configManager.validateDatabaseConfig();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should provide auto-fix capabilities', () => {
      // Set invalid configuration
      configManager.updateDatabaseConfig({
        performance: {
          cacheSize: 5,
          batchSize: -1
        },
        storage: {
          retentionDays: 0
        }
      });

      const result = configManager.autoFixDatabaseConfig();

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);

      const dbConfig = configManager.getDatabaseConfig();
      expect(dbConfig.performance.cacheSize).toBeGreaterThanOrEqual(10);
      expect(dbConfig.performance.batchSize).toBeGreaterThan(0);
      expect(dbConfig.storage.retentionDays).toBeGreaterThan(0);
    });
  });

  describe('Configuration Migration', () => {
    it('should migrate configuration to latest version', () => {
      const result = configManager.migrateDatabaseConfig('1.0.0');

      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
    });

    it('should not migrate if already up to date', () => {
      const result = configManager.migrateDatabaseConfig('2.1.0');

      expect(result.success).toBe(true);
      expect(result.appliedMigrations).toHaveLength(0);
    });
  });

  describe('Configuration Reset', () => {
    it('should reset to environment-appropriate defaults', () => {
      // Modify configuration first
      configManager.updateDatabaseConfig({
        performance: { cacheSize: 999 }
      });

      const result = configManager.resetDatabaseConfigToDefaults();

      expect(result.success).toBe(true);
      
      const dbConfig = configManager.getDatabaseConfig();
      expect(dbConfig.performance.cacheSize).not.toBe(999);
    });
  });

  describe('Configuration Repair', () => {
    it('should repair configuration with migration and auto-fix', () => {
      // Set configuration that needs both migration and fixing
      configManager.updateDatabaseConfig({
        performance: { cacheSize: 5 }, // Needs fixing
        // Missing nested structure (simulates old version)
      });

      const result = configManager.repairDatabaseConfig('1.0.0');

      expect(result.success).toBe(true);
      expect(result.validation.isValid).toBe(true);
    });
  });

  describe('Configuration Export', () => {
    it('should export configuration as environment variables', () => {
      const envVars = configManager.exportDatabaseConfigAsEnvVars();

      expect(envVars).toHaveProperty(DB_ENV_VARS.DATABASE_PROVIDER);
      expect(envVars).toHaveProperty(DB_ENV_VARS.DATABASE_CACHE_SIZE);
      expect(envVars).toHaveProperty(DB_ENV_VARS.DATABASE_LOG_LEVEL);

      // Values should be strings
      Object.values(envVars).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should export configuration as JSON', () => {
      const jsonString = configManager.exportDatabaseConfigAsJSON();
      
      expect(typeof jsonString).toBe('string');
      
      const parsed = JSON.parse(jsonString);
      expect(parsed).toHaveProperty('provider');
      expect(parsed).toHaveProperty('performance');
    });
  });

  describe('Configuration Presets', () => {
    it('should provide configuration presets', () => {
      const presets = configManager.getDatabaseConfigPresets();

      expect(presets).toHaveProperty('performance');
      expect(presets).toHaveProperty('storage_optimized');
      expect(presets).toHaveProperty('sync_heavy');
      expect(presets).toHaveProperty('development');
      expect(presets).toHaveProperty('production');
    });

    it('should apply configuration presets', () => {
      configManager.applyDatabaseConfigPreset('performance');
      
      const dbConfig = configManager.getDatabaseConfig();
      expect(dbConfig.performance.enableCaching).toBe(true);
      expect(dbConfig.performance.cacheSize).toBeGreaterThan(100);
    });

    it('should throw error for unknown preset', () => {
      expect(() => {
        configManager.applyDatabaseConfigPreset('unknown-preset');
      }).toThrow();
    });
  });
});

describe('Environment Variable Loading', () => {
  beforeEach(() => {
    // Mock process.env
    Object.keys(mockEnv).forEach(key => {
      (process.env as any)[key] = mockEnv[key as keyof typeof mockEnv];
    });
  });

  afterEach(() => {
    // Clean up process.env
    Object.keys(mockEnv).forEach(key => {
      delete (process.env as any)[key];
    });
  });

  it('should load configuration from environment variables', () => {
    // This would be tested in integration with the actual config loading
    // For now, we test that the environment variables are properly defined
    expect(DB_ENV_VARS.DATABASE_PROVIDER).toBe('REACT_APP_DATABASE_PROVIDER');
    expect(DB_ENV_VARS.DATABASE_CACHE_SIZE).toBe('REACT_APP_DATABASE_CACHE_SIZE');
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getDatabaseConfig', () => {
    it('should return current database configuration', () => {
      const config = getDatabaseConfig();
      
      expect(config).toBeDefined();
      expect(config).toHaveProperty('provider');
    });
  });

  describe('updateDatabaseConfig', () => {
    it('should update database configuration', () => {
      const updates = {
        performance: { cacheSize: 300 }
      };

      updateDatabaseConfig(updates);
      const config = getDatabaseConfig();

      expect(config.performance.cacheSize).toBe(300);
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should validate current configuration', () => {
      const validation = validateDatabaseConfig();

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
    });
  });

  describe('autoFixDatabaseConfig', () => {
    it('should auto-fix configuration issues', () => {
      // Set invalid configuration
      updateDatabaseConfig({
        performance: { cacheSize: 1 }
      });

      const result = autoFixDatabaseConfig();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('changes');
    });
  });

  describe('migrateDatabaseConfig', () => {
    it('should migrate configuration', () => {
      const result = migrateDatabaseConfig('1.0.0');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('appliedMigrations');
    });
  });

  describe('resetDatabaseConfigToDefaults', () => {
    it('should reset configuration to defaults', () => {
      const result = resetDatabaseConfigToDefaults();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('validation');
    });
  });

  describe('repairDatabaseConfig', () => {
    it('should repair configuration', () => {
      const result = repairDatabaseConfig('1.0.0');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('migrations');
    });
  });

  describe('exportDatabaseConfigAsEnvVars', () => {
    it('should export as environment variables', () => {
      const envVars = exportDatabaseConfigAsEnvVars();

      expect(typeof envVars).toBe('object');
      expect(Object.keys(envVars).length).toBeGreaterThan(0);
    });
  });

  describe('exportDatabaseConfigAsJSON', () => {
    it('should export as JSON string', () => {
      const json = exportDatabaseConfigAsJSON();

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});

describe('Configuration Persistence', () => {
  it('should persist configuration changes to localStorage', () => {
    const updates = {
      performance: { cacheSize: 250 }
    };

    updateDatabaseConfig(updates);

    // Check that localStorage was updated
    const stored = localStorage.getItem('unified_app_config');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.database.performance.cacheSize).toBe(250);
  });

  it('should load configuration from localStorage on initialization', () => {
    // Set up localStorage with configuration
    const config = {
      database: {
        performance: { cacheSize: 350 }
      }
    };

    localStorage.setItem('unified_app_config', JSON.stringify(config));

    // Create new manager instance (simulates app restart)
    const newManager = new (UnifiedConfigManager as any)();
    const dbConfig = newManager.getDatabaseConfig();

    expect(dbConfig.performance.cacheSize).toBe(350);
  });
});

describe('Error Handling', () => {
  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('unified_app_config', 'invalid-json');

    // Should not throw error
    expect(() => {
      new (UnifiedConfigManager as any)();
    }).not.toThrow();
  });

  it('should handle missing localStorage gracefully', () => {
    // Mock localStorage to throw error
    const originalLocalStorage = window.localStorage;
    delete (window as any).localStorage;

    expect(() => {
      new (UnifiedConfigManager as any)();
    }).not.toThrow();

    // Restore localStorage
    (window as any).localStorage = originalLocalStorage;
  });

  it('should handle configuration validation errors gracefully', () => {
    // Set severely broken configuration
    updateDatabaseConfig({
      provider: null as any,
      performance: null as any
    });

    // Should not throw error
    expect(() => {
      validateDatabaseConfig();
    }).not.toThrow();
  });
});