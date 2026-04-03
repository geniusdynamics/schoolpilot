/**
 * ConfigurationMigration - Migration system for database configuration schemas
 *
 * Detects old configuration formats, migrates them to the current schema,
 * supports dry-run mode, rollback, and validates migrated configurations.
 *
 * Requirements: 18.1-18.11
 */

export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  changes: string[];
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  errors: string[];
  warnings: string[];
  migratedConfig: Record<string, any>;
}

export interface MigrationConfig {
  version: string;
  migrations: Record<string, (config: Record<string, any>) => Record<string, any>>;
}

export interface MigrationReport {
  migrationNeeded: boolean;
  currentVersion: string;
  targetVersion: string;
  steps: MigrationStep[];
  dryRun: boolean;
  result?: MigrationResult;
}

/**
 * ConfigurationMigration - Handles configuration version migrations
 */
export class ConfigurationMigration {
  private readonly currentVersion: string;
  private migrations: Map<string, (config: Record<string, any>) => Record<string, any>> = new Map();

  constructor(currentVersion: string) {
    this.currentVersion = currentVersion;
    this.registerDefaultMigrations();
  }

  /**
   * Register a migration function for a specific version transition
   */
  registerMigration(fromVersion: string, migrate: (config: Record<string, any>) => Record<string, any>): void {
    this.migrations.set(fromVersion, migrate);
  }

  /**
   * Check if migration is needed
   */
  needsMigration(config: Record<string, any>): boolean {
    const configVersion = this.extractVersion(config);
    return this.compareVersions(configVersion, this.currentVersion) < 0;
  }

  /**
   * Get current version of a configuration
   */
  getVersion(config: Record<string, any>): string {
    return this.extractVersion(config);
  }

  /**
   * Perform migration (with optional dry-run mode)
   */
  async migrate(
    config: Record<string, any>,
    options: { dryRun?: boolean; targetVersion?: string } = {},
  ): Promise<MigrationReport> {
    const { dryRun = false, targetVersion = this.currentVersion } = options;
    const currentVersion = this.extractVersion(config);

    if (this.compareVersions(currentVersion, targetVersion) >= 0) {
      return {
        migrationNeeded: false,
        currentVersion,
        targetVersion,
        steps: [],
        dryRun,
      };
    }

    const steps = this.buildMigrationPath(currentVersion, targetVersion);

    if (dryRun) {
      return {
        migrationNeeded: true,
        currentVersion,
        targetVersion,
        steps,
        dryRun: true,
      };
    }

    // Execute migration
    let migratedConfig = { ...config };
    const errors: string[] = [];
    const warnings: string[] = [];
    const executedSteps: MigrationStep[] = [];

    for (const step of steps) {
      try {
        const migrateFn = this.migrations.get(step.fromVersion);
        if (!migrateFn) {
          errors.push(`No migration function registered for version ${step.fromVersion}`);
          break;
        }

        migratedConfig = migrateFn(migratedConfig);
        migratedConfig._version = step.toVersion;
        executedSteps.push(step);
      } catch (error) {
        errors.push(`Migration step ${step.fromVersion} -> ${step.toVersion} failed: ${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }

    return {
      migrationNeeded: true,
      currentVersion,
      targetVersion,
      steps: executedSteps,
      dryRun: false,
      result: {
        success: errors.length === 0,
        fromVersion: currentVersion,
        toVersion: targetVersion,
        steps: executedSteps,
        errors,
        warnings,
        migratedConfig,
      },
    };
  }

  /**
   * Rollback to previous version (if backup available)
   */
  rollback(backupConfig: Record<string, any>): Record<string, any> {
    return { ...backupConfig };
  }

  /**
   * Validate a migrated configuration
   */
  validateMigrated(config: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config._version) {
      errors.push('Missing _version field');
    } else if (config._version !== this.currentVersion) {
      errors.push(`Version mismatch: expected ${this.currentVersion}, got ${config._version}`);
    }

    // Validate required sections exist
    const requiredSections = ['provider', 'general'];
    for (const section of requiredSections) {
      if (!(section in config)) {
        errors.push(`Missing required section: ${section}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // ==================== Internal Methods ====================

  private extractVersion(config: Record<string, any>): string {
    return config._version || config.version || config.schemaVersion || '1.0.0';
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] ?? 0;
      const partB = partsB[i] ?? 0;

      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }

    return 0;
  }

  private buildMigrationPath(from: string, to: string): MigrationStep[] {
    const steps: MigrationStep[] = [];
    let current = from;

    while (this.compareVersions(current, to) < 0) {
      const migrateFn = this.migrations.get(current);
      if (!migrateFn) {
        break;
      }

      // Find next version (this is simplified - in production you'd have a version graph)
      const nextVersion = this.getNextVersion(current);
      if (!nextVersion || this.compareVersions(nextVersion, to) > 0) {
        break;
      }

      steps.push({
        fromVersion: current,
        toVersion: nextVersion,
        description: `Migrate from ${current} to ${nextVersion}`,
        changes: this.getMigrationChanges(current),
      });

      current = nextVersion;
    }

    return steps;
  }

  private getNextVersion(version: string): string | null {
    // Simplified version chain - extend for production
    const versionChain: Record<string, string> = {
      '1.0.0': '1.1.0',
      '1.1.0': '1.2.0',
      '1.2.0': '2.0.0',
      '2.0.0': '2.1.0',
    };

    return versionChain[version] || null;
  }

  private getMigrationChanges(fromVersion: string): string[] {
    const changes: Record<string, string[]> = {
      '1.0.0': [
        'Added nested configuration structure',
        'Moved flat fields to performance/storage/sync sections',
      ],
      '1.1.0': [
        'Added feature flags system',
        'Added monitoring configuration',
      ],
      '1.2.0': [
        'Migrated to v2 schema with deployment scenarios',
        'Added hybrid provider configuration',
      ],
      '2.0.0': [
        'Added capability-based provider selection',
        'Added configuration templates support',
      ],
    };

    return changes[fromVersion] || ['Unknown changes'];
  }

  private registerDefaultMigrations(): void {
    // Migration from v1.0.0 to v1.1.0: Flatten to nested structure
    this.registerMigration('1.0.0', (config) => {
      const migrated = { ...config };

      // Move flat fields to nested structure
      if (migrated.cacheSize !== undefined) {
        migrated.performance = migrated.performance || {};
        migrated.performance.cacheSize = migrated.cacheSize;
        delete migrated.cacheSize;
      }

      if (migrated.syncEnabled !== undefined) {
        migrated.sync = migrated.sync || {};
        migrated.sync.enabled = migrated.syncEnabled;
        delete migrated.syncEnabled;
      }

      migrated._version = '1.1.0';
      return migrated;
    });

    // Migration from v1.1.0 to v1.2.0: Add feature flags
    this.registerMigration('1.1.0', (config) => {
      const migrated = { ...config };

      if (!migrated.features) {
        migrated.features = {
          enableFullTextSearch: true,
          enableTransactions: true,
          enableRealTimeUpdates: true,
          enableOfflineMode: true,
          enableDataValidation: true,
          enableAuditLog: true,
        };
      }

      migrated._version = '1.2.0';
      return migrated;
    });

    // Migration from v1.2.0 to v2.0.0: Deployment scenarios
    this.registerMigration('1.2.0', (config) => {
      const migrated = { ...config };

      if (!migrated.deployment) {
        migrated.deployment = {
          scenario: 'standalone',
          environment: 'browser-client',
        };
      }

      // Rename old provider field to nested structure
      if (migrated.provider && typeof migrated.provider === 'string') {
        migrated.provider = { type: migrated.provider, fallbackChain: [] };
      }

      migrated._version = '2.0.0';
      return migrated;
    });

    // Migration from v2.0.0 to v2.1.0: Capability-based selection
    this.registerMigration('2.0.0', (config) => {
      const migrated = { ...config };

      // Add monitoring configuration if not present
      if (!migrated.monitoring) {
        migrated.monitoring = {
          enableHealthChecks: true,
          healthCheckInterval: 300000,
          enablePerformanceMetrics: true,
          enableErrorReporting: true,
          logLevel: 'info',
        };
      }

      migrated._version = '2.1.0';
      return migrated;
    });
  }
}

/**
 * Create a migration manager with the current schema version
 */
export function createMigrationManager(currentVersion = '2.1.0'): ConfigurationMigration {
  return new ConfigurationMigration(currentVersion);
}
