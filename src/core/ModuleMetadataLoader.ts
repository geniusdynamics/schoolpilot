import { logger } from '@/utils/logging';

/**
 * Module Metadata Loader
 * 
 * Loads and validates module.json files for all modules.
 * Provides centralized access to module metadata and dependency management.
 * 
 * @module core/ModuleMetadataLoader
 */

import type {
  ModuleMetadata,
  ModuleDependency,
  LoadedModule,
  DependencyValidationResult,
  ModuleValidationResult,
  ModuleValidationError,
  ModuleDiscoveryResult,
} from './types/module';

/**
 * Service for loading and managing module metadata
 */
class ModuleMetadataLoader {
  private modules = new Map<string, LoadedModule>();
  private loadingPromise: Promise<void> | null = null;
  private metadataCache = new Map<string, ModuleMetadata>();

  /**
   * Load metadata for all modules
   * Uses dynamic imports to discover module.json files
   */
  async loadAllMetadata(): Promise<ModuleDiscoveryResult> {
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.getDiscoveryResult();
    }

    this.loadingPromise = this.doLoadAllMetadata();
    await this.loadingPromise;
    return this.getDiscoveryResult();
  }

  /**
   * Internal method to load all metadata
   */
  private async doLoadAllMetadata(): Promise<void> {
    logger.info('[ModuleMetadataLoader] Discovering modules...');

    try {
      // Dynamic import all module.json files
      // Vite's import.meta.glob handles this at build time
      const moduleFiles = import.meta.glob('../modules/*/module.json', {
        eager: false,
        import: 'default',
      });

      for (const [path, loader] of Object.entries(moduleFiles)) {
        try {
          // Extract module ID from path: ../modules/{id}/module.json
          const moduleId = path.match(/modules\/([^/]+)/)?.[1];
          if (!moduleId) {
            logger.warn(`[ModuleMetadataLoader] Could not extract module ID from path: ${path}`);
            continue;
          }

          // Load the module.json
          const metadata = await loader() as ModuleMetadata;

          // Validate metadata
          const validation = this.validateMetadata(metadata, moduleId);
          if (!validation.valid) {
            logger.error(`[ModuleMetadataLoader] Invalid metadata for ${moduleId}:`, validation.errors);
            continue;
          }

          // Store in cache
          this.metadataCache.set(moduleId, metadata);

          // Create loaded module entry
          this.modules.set(moduleId, {
            id: moduleId,
            metadata,
            isEnabled: false, // Will be set by module registry
            isLoaded: true,
            loadedAt: new Date(),
          });

          logger.info(`[ModuleMetadataLoader] Loaded metadata for ${moduleId}`);
        } catch (error) {
          logger.error(`[ModuleMetadataLoader] Failed to load ${path}:`, error);
        }
      }

      // Validate dependencies after all modules loaded
      this.validateAllDependencies();

      logger.info(`[ModuleMetadataLoader] Loaded ${this.modules.size} modules`);
    } catch (error) {
      logger.error('[ModuleMetadataLoader] Failed to load modules:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a specific module
   */
  getMetadata(moduleId: string): ModuleMetadata | undefined {
    return this.metadataCache.get(moduleId);
  }

  /**
   * Get all loaded module metadata
   */
  getAllMetadata(): ModuleMetadata[] {
    return Array.from(this.metadataCache.values());
  }

  /**
   * Get all loaded modules
   */
  getAllModules(): LoadedModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get a specific loaded module
   */
  getModule(moduleId: string): LoadedModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Check if a module exists
   */
  hasModule(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Get dependency tree for a module
   * Returns modules in dependency order (dependencies first)
   */
  getDependencyTree(moduleId: string): string[] {
    const tree: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (recursionStack.has(id)) {
        logger.warn(`[ModuleMetadataLoader] Circular dependency detected involving ${id}`);
        return;
      }

      recursionStack.add(id);

      const module = this.modules.get(id);
      if (module) {
        // Visit dependencies first
        for (const dep of module.metadata.dependencies || []) {
          if (dep.required) {
            visit(dep.moduleId);
          }
        }
      }

      recursionStack.delete(id);
      visited.add(id);
      tree.push(id);
    };

    visit(moduleId);
    return tree;
  }

  /**
   * Get load order for all modules
   * Resolves dependencies to determine correct loading sequence
   */
  getLoadOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (recursionStack.has(id)) {
        logger.warn(`[ModuleMetadataLoader] Circular dependency detected: ${id}`);
        return;
      }

      recursionStack.add(id);

      const module = this.modules.get(id);
      if (module) {
        // Visit dependencies first
        for (const dep of module.metadata.dependencies || []) {
          if (dep.required && this.modules.has(dep.moduleId)) {
            visit(dep.moduleId);
          }
        }
      }

      recursionStack.delete(id);
      visited.add(id);
      order.push(id);
    };

    // Visit all modules
    for (const id of this.modules.keys()) {
      visit(id);
    }

    return order;
  }

  /**
   * Validate dependencies for a specific module
   */
  validateDependencies(moduleId: string): DependencyValidationResult {
    const module = this.modules.get(moduleId);
    if (!module) {
      return {
        valid: false,
        missing: [],
        versionMismatches: [],
        conflicts: [],
        circularDependencies: [],
        missingOptional: [],
      };
    }

    const result: DependencyValidationResult = {
      valid: true,
      missing: [],
      versionMismatches: [],
      conflicts: [],
      circularDependencies: [],
      missingOptional: [],
    };

    // Check required dependencies
    for (const dep of module.metadata.dependencies || []) {
      const depModule = this.modules.get(dep.moduleId);

      if (!depModule) {
        if (dep.required) {
          result.missing.push(dep);
          result.valid = false;
        } else {
          result.missingOptional.push(dep);
        }
        continue;
      }

      // Check version compatibility
      if (!this.checkVersionCompatibility(depModule.metadata.version, dep.version)) {
        result.versionMismatches.push({
          dependency: dep,
          installedVersion: depModule.metadata.version,
        });
        if (dep.required) {
          result.valid = false;
        }
      }
    }

    // Check conflicts
    for (const conflictId of module.metadata.conflicts || []) {
      if (this.modules.has(conflictId)) {
        result.conflicts.push(conflictId);
        result.valid = false;
      }
    }

    // Check for circular dependencies
    const circular = this.detectCircularDependency(moduleId);
    if (circular.length > 0) {
      result.circularDependencies.push(circular);
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate all module dependencies
   */
  private validateAllDependencies(): void {
    for (const [moduleId] of this.modules) {
      const result = this.validateDependencies(moduleId);
      if (!result.valid) {
        logger.warn(`[ModuleMetadataLoader] Dependency issues for ${moduleId}:`, {
          missing: result.missing.map(d => d.moduleId),
          versionMismatches: result.versionMismatches.map(v => ({
            module: v.dependency.moduleId,
            required: v.dependency.version,
            installed: v.installedVersion,
          })),
          conflicts: result.conflicts,
          circular: result.circularDependencies,
        });
      }
    }
  }

  /**
   * Validate module metadata structure
   */
  private validateMetadata(metadata: ModuleMetadata, expectedId: string): ModuleValidationResult {
    const errors: ModuleValidationError[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!metadata.id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Module metadata missing required field: id',
      });
    } else if (metadata.id !== expectedId) {
      errors.push({
        code: 'ID_MISMATCH',
        message: `Module ID mismatch: expected "${expectedId}", got "${metadata.id}"`,
      });
    }

    if (!metadata.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Module metadata missing required field: name',
      });
    }

    if (!metadata.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Module metadata missing required field: version',
      });
    } else if (!this.isValidSemver(metadata.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: `Module version "${metadata.version}" is not valid semver`,
        suggestion: 'Use format: major.minor.patch (e.g., 1.0.0)',
      });
    }

    // Validate dependencies
    for (const dep of metadata.dependencies || []) {
      if (!dep.moduleId) {
        errors.push({
          code: 'INVALID_DEPENDENCY',
          message: 'Dependency missing moduleId',
          path: 'dependencies',
        });
      }
      if (!dep.version) {
        errors.push({
          code: 'INVALID_DEPENDENCY',
          message: `Dependency ${dep.moduleId} missing version`,
          path: 'dependencies',
        });
      } else if (!this.isValidSemverRange(dep.version)) {
        warnings.push(`Dependency ${dep.moduleId} has unusual version format: ${dep.version}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a version satisfies a range
   * Simple semver range check (supports ^, ~, >=, <=, >, <)
   */
  private checkVersionCompatibility(installed: string, required: string): boolean {
    // Parse installed version
    const installedParts = installed.split('.').map(Number);
    const [installedMajor, installedMinor = 0, installedPatch = 0] = installedParts;

    // Handle caret (^) - compatible with major version
    if (required.startsWith('^')) {
      const range = required.slice(1);
      const [major, minor = 0, patch = 0] = range.split('.').map(Number);
      if (installedMajor !== major) return false;
      if (installedMajor === major && installedMinor < minor) return false;
      if (installedMajor === major && installedMinor === minor && installedPatch < patch) return false;
      return true;
    }

    // Handle tilde (~) - compatible with minor version
    if (required.startsWith('~')) {
      const range = required.slice(1);
      const [major, minor = 0, patch = 0] = range.split('.').map(Number);
      if (installedMajor !== major) return false;
      if (installedMinor < minor) return false;
      if (installedMinor === minor && installedPatch < patch) return false;
      return true;
    }

    // Handle exact version
    if (/^\d/.test(required)) {
      return installed === required;
    }

    // For complex ranges, return true (assume compatible)
    // Full semver parsing would require a library like 'semver'
    return true;
  }

  /**
   * Detect circular dependency for a module
   */
  private detectCircularDependency(moduleId: string, path: string[] = []): string[] {
    if (path.includes(moduleId)) {
      const cycleStart = path.indexOf(moduleId);
      return [...path.slice(cycleStart), moduleId];
    }

    const module = this.modules.get(moduleId);
    if (!module) return [];

    for (const dep of module.metadata.dependencies || []) {
      if (dep.required) {
        const circular = this.detectCircularDependency(dep.moduleId, [...path, moduleId]);
        if (circular.length > 0) return circular;
      }
    }

    return [];
  }

  /**
   * Check if string is valid semver
   */
  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+/.test(version);
  }

  /**
   * Check if string is valid semver range
   */
  private isValidSemverRange(range: string): boolean {
    // Support ^, ~, >=, <=, >, <, =, and ranges
    return /^[\^~>=<]*\d/.test(range) || range.includes('||') || range.includes(' - ');
  }

  /**
   * Get discovery result for current state
   */
  private getDiscoveryResult(): ModuleDiscoveryResult {
    return {
      modules: this.getAllMetadata(),
      errors: [], // Would be populated during loading
      count: this.modules.size,
    };
  }

  /**
   * Get all RBAC permissions from loaded modules
   * This aggregates rbacPermissions from all module.json files
   */
  getAllRbacPermissions(): Array<{
    id: string;
    name: string;
    description: string;
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete' | 'execute';
    feature?: string;
    moduleId: string;
  }> {
    const permissions: Array<{
      id: string;
      name: string;
      description: string;
      resource: string;
      action: 'create' | 'read' | 'update' | 'delete' | 'execute';
      feature?: string;
      moduleId: string;
    }> = [];

    for (const [moduleId, module] of this.modules) {
      const modulePermissions = module.metadata.rbacPermissions || [];
      for (const permission of modulePermissions) {
        permissions.push({
          ...permission,
          moduleId,
        });
      }
    }

    return permissions;
  }

  /**
   * Get all feature flags from loaded modules
   * This aggregates featureFlags from all module.json files
   */
  getAllFeatureFlags(): Array<{
    id: string;
    name: string;
    description: string;
    defaultValue: boolean;
    moduleId: string;
  }> {
    const flags: Array<{
      id: string;
      name: string;
      description: string;
      defaultValue: boolean;
      moduleId: string;
    }> = [];

    for (const [moduleId, module] of this.modules) {
      const moduleFlags = module.metadata.featureFlags || [];
      for (const flag of moduleFlags) {
        flags.push({
          ...flag,
          moduleId,
        });
      }
    }

    return flags;
  }

  /**
   * Reset loader (for testing)
   */
  reset(): void {
    this.modules.clear();
    this.metadataCache.clear();
    this.loadingPromise = null;
  }
}

// Export singleton instance
export const moduleMetadataLoader = new ModuleMetadataLoader();

// Also export class for testing/customization
export { ModuleMetadataLoader };
