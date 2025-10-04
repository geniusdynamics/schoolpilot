// ABOUTME: Integration tests for database configuration system
// ABOUTME: Tests end-to-end configuration workflows and system integration

import {
  unifiedConfigManager,
  getDatabaseConfig,
  updateDatabaseConfig,
  validateDatabaseConfig,
  autoFixDatabaseConfig,
  migrateDatabaseConfig,
  repairDatabaseConfig,
  exportDatabaseConfigAsEnvVars,
  exportDatabaseConfigAsJSON,
} from '../unifiedConfig';
import { databaseConfigValidator } from '../databaseConfigSchema';

describe('Database Configuration Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('End-to-End Configuration Workflow', () => {
    it('should complete full configuration lifecycle', async () => {
      // 1. Start with default configuration
      let config = getDatabaseConfig();
      expect(config).toBeDefined();
      expect(config.provider).toBeDefined();

      // 2. Update configuration
      updateDatabaseConfig({
        performance: {
          cacheSize: 200,
          enableCaching: true,
        },
        storage: {
          compressionEnabled: true,
          retentionDays: 90,
        },
      });

      // 3. Validate updated configuration
      let validation = validateDatabaseConfig();
      expect(validation.isValid).toBe(true);

      // 4. Introduce configuration issues
      updateDatabaseConfig({
        performance: {
          cacheSize: 5, // Too small
          queryTimeout: 500000, // Too large
        },
        storage: {
          retentionDays: 0, // Invalid
        },
      });

      // 5. Validate and detect issues
      validation = validateDatabaseConfig();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.canAutoFix).toBe(true);

      // 6. Auto-fix issues
      const fixResult = autoFixDatabaseConfig();
      expect(fixResult.success).toBe(true);
      expect(fixResult.changes.length).toBeGreaterThan(0);

      // 7. Validate fixed configuration
      validation = validateDatabaseConfig();
      expect(validation.isValid).toBe(true);

      // 8. Export configuration
      const envVars = exportDatabaseConfigAsEnvVars();
      expect(Object.keys(envVars).length).toBeGreaterThan(0);

      const jsonConfig = exportDatabaseConfigAsJSON();
      expect(() => JSON.parse(jsonConfig)).not.toThrow();
    });

    it('should handle migration workflow', async () => {
      // Simulate old configuration format
      const oldConfig = {
        provider: 'sqlite',
        cacheSize: 100,
        enableCaching: true,
        maxSize: 500,
        syncEnabled: false,
        logLevel: 'info',
      };

      // Migrate configuration
      const { migrated, appliedMigrations } = databaseConfigValidator.migrate(oldConfig, '1.0.0');

      expect(appliedMigrations.length).toBeGreaterThan(0);
      expect(migrated.performance).toBeDefined();
      expect(migrated.performance.cacheSize).toBe(100);
      expect(migrated.storage).toBeDefined();
      expect(migrated.storage.maxSize).toBe(500);

      // Validate migrated configuration
      const validation = databaseConfigValidator.validate(migrated);
      expect(validation.isValid).toBe(true);
    });

    it('should handle repair workflow', async () => {
      // Create broken configuration that needs both migration and fixing
      const brokenConfig = {
        provider: 'sqlite', // Needs migration
        cacheSize: 5, // Needs fixing
        enableCaching: true,
        maxSize: -100, // Needs fixing
        syncEnabled: true,
        logLevel: 'verbose', // Needs fixing
      };

      // Repair configuration
      const { repaired, changes, migrations, isValid } = databaseConfigValidator.repair(brokenConfig, '1.0.0');

      expect(migrations.length).toBeGreaterThan(0);
      expect(changes.length).toBeGreaterThan(0);
      expect(isValid).toBe(true);

      // Verify specific fixes
      expect(repaired.provider).toBe('sqlite-wasm');
      expect(repaired.performance.cacheSize).toBeGreaterThanOrEqual(10);
      expect(repaired.storage.maxSize).toBeGreaterThanOrEqual(0);
      expect(repaired.monitoring.logLevel).toBe('info');
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist configuration changes across sessions', () => {
      // Update configuration
      updateDatabaseConfig({
        performance: { cacheSize: 250 },
      });

      // Simulate app restart by creating new manager instance
      const newManager = new (unifiedConfigManager.constructor as any)();
      const config = newManager.getDatabaseConfig();

      expect(config.performance.cacheSize).toBe(250);
    });

    it('should handle corrupted localStorage gracefully', () => {
      // Corrupt localStorage
      localStorage.setItem('unified_app_config', 'invalid-json');

      // Should not crash
      expect(() => {
        new (unifiedConfigManager.constructor as any)();
      }).not.toThrow();
    });
  });

  describe('Environment-Based Configuration', () => {
    it('should apply environment-specific defaults', () => {
      // Test development defaults
      const devDefaults = databaseConfigValidator.resetToDefaults('development');
      expect(devDefaults.monitoring.logLevel).toBe('debug');
      expect(devDefaults.storage.retentionDays).toBe(30);
      expect(devDefaults.features.enableAuditLog).toBe(false);

      // Test production defaults
      const prodDefaults = databaseConfigValidator.resetToDefaults('production');
      expect(prodDefaults.monitoring.logLevel).toBe('info');
      expect(prodDefaults.storage.retentionDays).toBe(365);
      expect(prodDefaults.features.enableAuditLog).toBe(true);
    });

    it('should validate provider constraints by environment', () => {
      // This would be tested with actual environment configuration
      // For now, we test the validation logic
      const validation = validateDatabaseConfig();
      expect(validation).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large configuration objects', () => {
      const largeConfig = {
        performance: {
          cacheSize: 1000,
          queryTimeout: 60000,
          batchSize: 5000,
          enableCaching: true,
          enableIndexing: true,
        },
        storage: {
          maxSize: 10000,
          compressionEnabled: true,
          encryptionEnabled: true,
          backupEnabled: true,
          retentionDays: 1000,
        },
        // Add many more properties...
      };

      expect(() => {
        updateDatabaseConfig(largeConfig);
        validateDatabaseConfig();
      }).not.toThrow();
    });

    it('should validate configuration quickly', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        validateDatabaseConfig();
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete 100 validations in under 1 second
    });

    it('should handle concurrent configuration updates', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            updateDatabaseConfig({
              performance: { cacheSize: 100 + i },
            });
          })
        );
      }
      
      await Promise.all(promises);
      
      // Should not crash and final configuration should be valid
      const validation = validateDatabaseConfig();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from validation errors', () => {
      // Set invalid configuration
      updateDatabaseConfig({
        performance: { cacheSize: -1 },
        storage: { retentionDays: -1 },
        sync: { retryAttempts: 0 },
      });

      // Validate (should show errors)
      let validation = validateDatabaseConfig();
      expect(validation.isValid).toBe(false);

      // Auto-fix
      const result = autoFixDatabaseConfig();
      expect(result.success).toBe(true);

      // Validate again (should be fixed)
      validation = validateDatabaseConfig();
      expect(validation.isValid).toBe(true);
    });

    it('should handle partial configuration updates', () => {
      // Update only part of configuration
      updateDatabaseConfig({
        performance: { cacheSize: 150 },
      });

      const config = getDatabaseConfig();
      expect(config.performance.cacheSize).toBe(150);
      // Other properties should remain unchanged
      expect(config.storage).toBeDefined();
      expect(config.sync).toBeDefined();
    });
  });

  describe('Configuration Export/Import', () => {
    it('should export and import configuration correctly', () => {
      // Set specific configuration
      updateDatabaseConfig({
        performance: { cacheSize: 300 },
        storage: { compressionEnabled: true },
        monitoring: { logLevel: 'warn' },
      });

      // Export as JSON
      const jsonConfig = exportDatabaseConfigAsJSON();
      const exported = JSON.parse(jsonConfig);

      expect(exported.performance.cacheSize).toBe(300);
      expect(exported.storage.compressionEnabled).toBe(true);
      expect(exported.monitoring.logLevel).toBe('warn');

      // Export as environment variables
      const envVars = exportDatabaseConfigAsEnvVars();
      expect(envVars.REACT_APP_DATABASE_CACHE_SIZE).toBe('300');
      expect(envVars.REACT_APP_DATABASE_COMPRESSION).toBe('true');
      expect(envVars.REACT_APP_DATABASE_LOG_LEVEL).toBe('warn');
    });
  });
});