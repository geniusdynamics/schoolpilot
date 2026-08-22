import { logger } from '@/utils/logging';

// ABOUTME: Database configuration schema validation and repair utilities
// ABOUTME: Provides comprehensive validation, error reporting, and configuration repair tools

import { DatabaseProvider } from './environmentMatrix';

// Configuration validation schema interfaces
export interface ValidationRule<T = any> {
  field: string;
  validator: (value: T) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  autoFix?: (value: T) => T;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  canAutoFix: boolean;
  autoFixAvailable: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  currentValue: any;
  expectedValue?: any;
  autoFix?: () => any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  currentValue: any;
  recommendedValue?: any;
  autoFix?: () => any;
}

export interface ValidationInfo {
  field: string;
  message: string;
  currentValue: any;
}

export interface ConfigurationMigration {
  fromVersion: string;
  toVersion: string;
  description: string;
  migrate: (config: any) => any;
  validate?: (config: any) => boolean;
}

// Database configuration validation rules
export const DATABASE_CONFIG_VALIDATION_RULES: ValidationRule[] = [
  // Provider validation
  // NOTE: 'rxdb' removed from valid providers - Phase 1 of RXDB deprecation
  {
    field: 'provider',
    validator: (value: DatabaseProvider) => {
      const validProviders: DatabaseProvider[] = [
        'pouchdb', 'sqlite', 'sqlite-file', 'sqlite-wasm', 
        'memory', 'backend-api', 'livestore', 'hybrid'
      ];
      return validProviders.includes(value);
    },
    message: 'Invalid database provider',
    severity: 'error',
    autoFix: () => 'sqlite-wasm'
  },

  // Performance validation rules
  {
    field: 'performance.cacheSize',
    validator: (value: number) => value >= 10 && value <= 10000,
    message: 'Cache size must be between 10MB and 10GB',
    severity: 'error',
    autoFix: (value: number) => Math.max(10, Math.min(10000, value || 100))
  },
  {
    field: 'performance.queryTimeout',
    validator: (value: number) => value >= 1000 && value <= 300000,
    message: 'Query timeout must be between 1 second and 5 minutes',
    severity: 'error',
    autoFix: (value: number) => Math.max(1000, Math.min(300000, value || 30000))
  },
  {
    field: 'performance.batchSize',
    validator: (value: number) => value >= 1 && value <= 10000,
    message: 'Batch size must be between 1 and 10,000',
    severity: 'error',
    autoFix: (value: number) => Math.max(1, Math.min(10000, value || 100))
  },
  {
    field: 'performance.cacheSize',
    validator: (value: number) => value >= 50,
    message: 'Cache size below 50MB may impact performance',
    severity: 'warning',
    autoFix: () => 50
  },

  // Storage validation rules
  {
    field: 'storage.maxSize',
    validator: (value: number) => value >= 0,
    message: 'Storage max size cannot be negative',
    severity: 'error',
    autoFix: (value: number) => Math.max(0, value || 0)
  },
  {
    field: 'storage.retentionDays',
    validator: (value: number) => value >= 1 && value <= 3650,
    message: 'Retention days must be between 1 and 10 years',
    severity: 'error',
    autoFix: (value: number) => Math.max(1, Math.min(3650, value || 30))
  },
  {
    field: 'storage.maxSize',
    validator: (value: number) => value === 0 || value >= 100,
    message: 'Storage limit below 100MB may cause issues',
    severity: 'warning',
    autoFix: () => 100
  },

  // Sync validation rules
  {
    field: 'sync.interval',
    validator: (value: number) => value >= 5000,
    message: 'Sync interval must be at least 5 seconds',
    severity: 'error',
    autoFix: (value: number) => Math.max(5000, value || 30000)
  },
  {
    field: 'sync.retryAttempts',
    validator: (value: number) => value >= 1 && value <= 10,
    message: 'Retry attempts must be between 1 and 10',
    severity: 'error',
    autoFix: (value: number) => Math.max(1, Math.min(10, value || 3))
  },
  {
    field: 'sync.timeout',
    validator: (value: number) => value >= 10000 && value <= 600000,
    message: 'Sync timeout must be between 10 seconds and 10 minutes',
    severity: 'error',
    autoFix: (value: number) => Math.max(10000, Math.min(600000, value || 60000))
  },
  {
    field: 'sync.interval',
    validator: (value: number) => value >= 30000,
    message: 'Sync interval below 30 seconds may impact performance',
    severity: 'warning',
    autoFix: () => 30000
  },

  // Monitoring validation rules
  {
    field: 'monitoring.healthCheckInterval',
    validator: (value: number) => value >= 30000,
    message: 'Health check interval must be at least 30 seconds',
    severity: 'error',
    autoFix: (value: number) => Math.max(30000, value || 300000)
  },
  {
    field: 'monitoring.logLevel',
    validator: (value: string) => ['debug', 'info', 'warn', 'error'].includes(value),
    message: 'Invalid log level',
    severity: 'error',
    autoFix: () => 'info'
  },
  {
    field: 'monitoring.healthCheckInterval',
    validator: (value: number) => value >= 60000,
    message: 'Health check interval below 1 minute may be too frequent',
    severity: 'warning',
    autoFix: () => 300000
  },

  // API configuration validation
  {
    field: 'apiConfig.apiBaseUrl',
    validator: (value: string) => {
      if (!value) return true; // Optional field
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Invalid API base URL format',
    severity: 'error',
    autoFix: () => ''
  },
  {
    field: 'apiConfig.timeout',
    validator: (value: number) => !value || (value >= 5000 && value <= 300000),
    message: 'API timeout must be between 5 seconds and 5 minutes',
    severity: 'error',
    autoFix: (value: number) => Math.max(5000, Math.min(300000, value || 30000))
  }
];

// Configuration migration definitions
export const DATABASE_CONFIG_MIGRATIONS: ConfigurationMigration[] = [
  {
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    description: 'Migrate to enhanced database configuration structure',
    migrate: (config: any) => {
      // Migrate old flat structure to new nested structure
      const migrated = {
        ...config,
        performance: {
          enableIndexing: config.enableIndexing ?? true,
          enableCaching: config.enableCaching ?? false,
          cacheSize: config.cacheSize ?? 50,
          queryTimeout: config.queryTimeout ?? 30000,
          batchSize: config.batchSize ?? 100,
        },
        storage: {
          maxSize: config.maxSize ?? 0,
          compressionEnabled: config.compressionEnabled ?? false,
          encryptionEnabled: config.encryptionEnabled ?? false,
          backupEnabled: config.backupEnabled ?? false,
          retentionDays: config.retentionDays ?? 30,
        },
        sync: {
          enabled: config.syncEnabled ?? false,
          interval: config.syncInterval ?? 30000,
          conflictResolution: config.conflictResolution ?? 'manual',
          batchSize: config.syncBatchSize ?? 100,
          retryAttempts: config.retryAttempts ?? 3,
          timeout: config.syncTimeout ?? 60000,
        },
        monitoring: {
          enableHealthChecks: config.enableHealthChecks ?? true,
          healthCheckInterval: config.healthCheckInterval ?? 300000,
          enablePerformanceMetrics: config.enablePerformanceMetrics ?? false,
          enableErrorReporting: config.enableErrorReporting ?? false,
          logLevel: config.logLevel ?? 'info',
        },
        features: {
          enableFullTextSearch: config.enableFullTextSearch ?? true,
          enableTransactions: config.enableTransactions ?? false,
          enableRealTimeUpdates: config.enableRealTimeUpdates ?? false,
          enableOfflineMode: config.enableOfflineMode ?? true,
          enableDataValidation: config.enableDataValidation ?? true,
          enableAuditLog: config.enableAuditLog ?? false,
        },
      };

      // Remove old flat properties
      const oldProperties = [
        'enableIndexing', 'enableCaching', 'cacheSize', 'queryTimeout', 'batchSize',
        'maxSize', 'compressionEnabled', 'encryptionEnabled', 'backupEnabled', 'retentionDays',
        'syncEnabled', 'syncInterval', 'conflictResolution', 'syncBatchSize', 'retryAttempts', 'syncTimeout',
        'enableHealthChecks', 'healthCheckInterval', 'enablePerformanceMetrics', 'enableErrorReporting', 'logLevel',
        'enableFullTextSearch', 'enableTransactions', 'enableRealTimeUpdates', 'enableOfflineMode', 'enableDataValidation', 'enableAuditLog'
      ];

      oldProperties.forEach(prop => {
        delete migrated[prop];
      });

      return migrated;
    },
    validate: (config: any) => {
      return config.performance && config.storage && config.sync && config.monitoring && config.features;
    }
  },
  {
    fromVersion: '2.0.0',
    toVersion: '2.1.0',
    description: 'Add new provider types and enhanced API configuration',
    migrate: (config: any) => {
      const migrated = { ...config };

      // Update provider if using old values
      if (config.provider === 'sqlite') {
        migrated.provider = 'sqlite-wasm';
      }

      // Add new API configuration structure if missing
      if (config.apiConfig && typeof config.apiConfig === 'string') {
        migrated.apiConfig = {
          apiBaseUrl: config.apiConfig,
          authType: 'bearer',
          timeout: 30000,
        };
      }

      return migrated;
    },
    validate: (config: any) => {
      return config.provider !== 'sqlite' && (
        !config.apiConfig || typeof config.apiConfig === 'object'
      );
    }
  }
];

/**
 * Database Configuration Validator
 */
export class DatabaseConfigValidator {
  private rules: ValidationRule[];
  private migrations: ConfigurationMigration[];

  constructor(rules = DATABASE_CONFIG_VALIDATION_RULES, migrations = DATABASE_CONFIG_MIGRATIONS) {
    this.rules = rules;
    this.migrations = migrations;
  }

  /**
   * Validate database configuration
   */
  validate(config: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];
    const autoFixAvailable: string[] = [];

    for (const rule of this.rules) {
      const value = this.getNestedValue(config, rule.field);
      
      if (value !== undefined && !rule.validator(value)) {
        const issue = {
          field: rule.field,
          message: rule.message,
          currentValue: value,
          autoFix: rule.autoFix ? () => rule.autoFix!(value) : undefined
        };

        switch (rule.severity) {
          case 'error':
            errors.push(issue as ValidationError);
            break;
          case 'warning':
            warnings.push(issue as ValidationWarning);
            break;
          case 'info':
            info.push(issue as ValidationInfo);
            break;
        }

        if (rule.autoFix) {
          autoFixAvailable.push(rule.field);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      canAutoFix: autoFixAvailable.length > 0,
      autoFixAvailable
    };
  }

  /**
   * Auto-fix configuration issues
   */
  autoFix(config: any): { fixed: any; changes: string[] } {
    const fixed = JSON.parse(JSON.stringify(config)); // Deep clone
    const changes: string[] = [];

    for (const rule of this.rules) {
      const value = this.getNestedValue(fixed, rule.field);
      
      if (value !== undefined && !rule.validator(value) && rule.autoFix) {
        const newValue = rule.autoFix(value);
        this.setNestedValue(fixed, rule.field, newValue);
        changes.push(`${rule.field}: ${value} â†’ ${newValue}`);
      }
    }

    return { fixed, changes };
  }

  /**
   * Migrate configuration to latest version
   */
  migrate(config: any, currentVersion = '1.0.0'): { migrated: any; appliedMigrations: string[] } {
    let migrated = JSON.parse(JSON.stringify(config)); // Deep clone
    const appliedMigrations: string[] = [];

    // Find and apply migrations in order
    const applicableMigrations = this.migrations
      .filter(migration => this.shouldApplyMigration(migration, currentVersion))
      .sort((a, b) => this.compareVersions(a.fromVersion, b.fromVersion));

    for (const migration of applicableMigrations) {
      try {
        migrated = migration.migrate(migrated);
        appliedMigrations.push(`${migration.fromVersion} â†’ ${migration.toVersion}: ${migration.description}`);
        
        // Validate migration result if validator provided
        if (migration.validate && !migration.validate(migrated)) {
          throw new Error(`Migration validation failed for ${migration.fromVersion} â†’ ${migration.toVersion}`);
        }
      } catch (error) {
        logger.error(`Migration failed: ${migration.fromVersion} â†’ ${migration.toVersion}`, error);
        break; // Stop applying further migrations
      }
    }

    return { migrated, appliedMigrations };
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(environment: 'development' | 'staging' | 'production' = 'development'): any {
    const defaults = {
      provider: 'sqlite-wasm' as DatabaseProvider,
      autoDetect: true,
      connectionString: '',
      options: {},
      
      performance: {
        enableIndexing: true,
        enableCaching: environment === 'production',
        cacheSize: environment === 'production' ? 100 : 50,
        queryTimeout: 30000,
        batchSize: environment === 'production' ? 1000 : 100,
      },
      
      storage: {
        maxSize: environment === 'production' ? 0 : 500,
        compressionEnabled: environment === 'production',
        encryptionEnabled: false,
        backupEnabled: environment !== 'development',
        retentionDays: environment === 'production' ? 365 : 30,
      },
      
      sync: {
        enabled: false,
        interval: 30000,
        conflictResolution: 'manual' as const,
        batchSize: 100,
        retryAttempts: 3,
        timeout: 60000,
      },
      
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 300000,
        enablePerformanceMetrics: environment === 'production',
        enableErrorReporting: environment !== 'development',
        logLevel: environment === 'development' ? 'debug' as const : 'info' as const,
      },
      
      features: {
        enableFullTextSearch: true,
        enableTransactions: true,
        enableRealTimeUpdates: false,
        enableOfflineMode: true,
        enableDataValidation: true,
        enableAuditLog: environment === 'production',
      },
    };

    return defaults;
  }

  /**
   * Repair configuration by applying auto-fixes and migrations
   */
  repair(config: any, currentVersion = '1.0.0'): {
    repaired: any;
    changes: string[];
    migrations: string[];
    isValid: boolean;
  } {
    // First, migrate to latest version
    const { migrated, appliedMigrations } = this.migrate(config, currentVersion);
    
    // Then apply auto-fixes
    const { fixed, changes } = this.autoFix(migrated);
    
    // Validate final result
    const validation = this.validate(fixed);

    return {
      repaired: fixed,
      changes,
      migrations: appliedMigrations,
      isValid: validation.isValid
    };
  }

  // Helper methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private shouldApplyMigration(migration: ConfigurationMigration, currentVersion: string): boolean {
    return this.compareVersions(currentVersion, migration.fromVersion) <= 0;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }
}

// Export singleton instance
export const databaseConfigValidator = new DatabaseConfigValidator();