import type { ModuleMetadata, LoadedModule } from '@/core/types/module';

export interface ExportDefinition {
  name: string;
  type: 'service' | 'entity' | 'hook' | 'component' | 'util' | 'type';
  description?: string;
  deprecated?: boolean;
  since?: string;
}

export interface ModuleExports {
  moduleId: string;
  services: Map<string, unknown>;
  entities: Map<string, unknown>;
  hooks: Map<string, unknown>;
  components: Map<string, unknown>;
  utils: Map<string, unknown>;
  types: Map<string, unknown>;
}

export interface ExportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Manages exports from modules.
 * Provides a registry for services, entities, hooks, components, and utilities.
 */
export class ModuleExportsManager {
  private exports = new Map<string, ModuleExports>();
  private metadata = new Map<string, ModuleMetadata>();

  /**
   * Register module exports
   */
  registerModule(module: LoadedModule, exports: Partial<Omit<ModuleExports, 'moduleId'>> = {}): void {
    const { id, metadata } = module;
    
    this.metadata.set(id, metadata);
    this.exports.set(id, {
      moduleId: id,
      services: exports.services || new Map(),
      entities: exports.entities || new Map(),
      hooks: exports.hooks || new Map(),
      components: exports.components || new Map(),
      utils: exports.utils || new Map(),
      types: exports.types || new Map()
    });
  }

  /**
   * Register a service export
   */
  registerService(moduleId: string, name: string, service: unknown): void {
    const moduleExports = this.exports.get(moduleId);
    if (!moduleExports) {
      throw new Error(`Module "${moduleId}" is not registered for exports`);
    }
    moduleExports.services.set(name, service);
  }

  /**
   * Register an entity export
   */
  registerEntity(moduleId: string, name: string, entity: unknown): void {
    const moduleExports = this.exports.get(moduleId);
    if (!moduleExports) {
      throw new Error(`Module "${moduleId}" is not registered for exports`);
    }
    moduleExports.entities.set(name, entity);
  }

  /**
   * Register a hook export
   */
  registerHook(moduleId: string, name: string, hook: unknown): void {
    const moduleExports = this.exports.get(moduleId);
    if (!moduleExports) {
      throw new Error(`Module "${moduleId}" is not registered for exports`);
    }
    moduleExports.hooks.set(name, hook);
  }

  /**
   * Register a component export
   */
  registerComponent(moduleId: string, name: string, component: unknown): void {
    const moduleExports = this.exports.get(moduleId);
    if (!moduleExports) {
      throw new Error(`Module "${moduleId}" is not registered for exports`);
    }
    moduleExports.components.set(name, component);
  }

  /**
   * Register a utility export
   */
  registerUtil(moduleId: string, name: string, util: unknown): void {
    const moduleExports = this.exports.get(moduleId);
    if (!moduleExports) {
      throw new Error(`Module "${moduleId}" is not registered for exports`);
    }
    moduleExports.utils.set(name, util);
  }

  /**
   * Get a service from any module
   */
  getService<T = unknown>(moduleId: string, name: string): T | undefined {
    return this.exports.get(moduleId)?.services.get(name) as T | undefined;
  }

  /**
   * Get an entity from any module
   */
  getEntity<T = unknown>(moduleId: string, name: string): T | undefined {
    return this.exports.get(moduleId)?.entities.get(name) as T | undefined;
  }

  /**
   * Get a hook from any module
   */
  getHook<T = unknown>(moduleId: string, name: string): T | undefined {
    return this.exports.get(moduleId)?.hooks.get(name) as T | undefined;
  }

  /**
   * Get a component from any module
   */
  getComponent<T = unknown>(moduleId: string, name: string): T | undefined {
    return this.exports.get(moduleId)?.components.get(name) as T | undefined;
  }

  /**
   * Get a utility from any module
   */
  getUtil<T = unknown>(moduleId: string, name: string): T | undefined {
    return this.exports.get(moduleId)?.utils.get(name) as T | undefined;
  }

  /**
   * Search for a service across all modules
   */
  findService<T = unknown>(name: string): { moduleId: string; service: T } | undefined {
    for (const [moduleId, exports] of this.exports) {
      const service = exports.services.get(name);
      if (service) {
        return { moduleId, service: service as T };
      }
    }
    return undefined;
  }

  /**
   * Find all services matching a pattern
   */
  findServices<T = unknown>(pattern: RegExp | string): Array<{ moduleId: string; name: string; service: T }> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    const results: Array<{ moduleId: string; name: string; service: T }> = [];

    for (const [moduleId, exports] of this.exports) {
      for (const [name, service] of exports.services) {
        if (regex.test(name)) {
          results.push({ moduleId, name, service: service as T });
        }
      }
    }

    return results;
  }

  /**
   * Get all exports from a module
   */
  getModuleExports(moduleId: string): ModuleExports | undefined {
    return this.exports.get(moduleId);
  }

  /**
   * List all available services
   */
  listServices(): Array<{ moduleId: string; name: string }> {
    const results: Array<{ moduleId: string; name: string }> = [];
    for (const [moduleId, exports] of this.exports) {
      for (const name of exports.services.keys()) {
        results.push({ moduleId, name });
      }
    }
    return results;
  }

  /**
   * List all available entities
   */
  listEntities(): Array<{ moduleId: string; name: string }> {
    const results: Array<{ moduleId: string; name: string }> = [];
    for (const [moduleId, exports] of this.exports) {
      for (const name of exports.entities.keys()) {
        results.push({ moduleId, name });
      }
    }
    return results;
  }

  /**
   * Validate exports against module.json provides declarations
   */
  validateExports(moduleId: string): ExportValidationResult {
    const result: ExportValidationResult = { valid: true, errors: [], warnings: [] };
    const metadata = this.metadata.get(moduleId);
    const moduleExports = this.exports.get(moduleId);

    if (!metadata) {
      result.valid = false;
      result.errors.push(`Module "${moduleId}" metadata not found`);
      return result;
    }

    if (!moduleExports) {
      result.valid = false;
      result.errors.push(`Module "${moduleId}" exports not registered`);
      return result;
    }

    // Check that declared services are exported
    const declaredServices = metadata.provides?.services || [];
    for (const serviceName of declaredServices) {
      if (!moduleExports.services.has(serviceName)) {
        result.valid = false;
        result.errors.push(
          `Service "${serviceName}" is declared in module.json but not exported`
        );
      }
    }

    // Check that declared entities are exported
    const declaredEntities = metadata.provides?.entities || [];
    for (const entityName of declaredEntities) {
      if (!moduleExports.entities.has(entityName)) {
        result.valid = false;
        result.errors.push(
          `Entity "${entityName}" is declared in module.json but not exported`
        );
      }
    }

    // Check that declared hooks are exported
    const declaredHooks = metadata.provides?.hooks || [];
    for (const hookName of declaredHooks) {
      if (!moduleExports.hooks.has(hookName)) {
        result.valid = false;
        result.errors.push(
          `Hook "${hookName}" is declared in module.json but not exported`
        );
      }
    }

    // Warn about exported but undeclared services
    for (const serviceName of moduleExports.services.keys()) {
      if (!declaredServices.includes(serviceName)) {
        result.warnings.push(
          `Service "${serviceName}" is exported but not declared in module.json`
        );
      }
    }

    return result;
  }

  /**
   * Validate all registered modules
   */
  validateAll(): Map<string, ExportValidationResult> {
    const results = new Map<string, ExportValidationResult>();
    for (const moduleId of this.exports.keys()) {
      results.set(moduleId, this.validateExports(moduleId));
    }
    return results;
  }

  /**
   * Unregister a module's exports
   */
  unregisterModule(moduleId: string): void {
    this.exports.delete(moduleId);
    this.metadata.delete(moduleId);
  }

  /**
   * Clear all exports
   */
  clear(): void {
    this.exports.clear();
    this.metadata.clear();
  }

  /**
   * Get number of registered modules
   */
  get size(): number {
    return this.exports.size;
  }
}

// Singleton instance
export const moduleExports = new ModuleExportsManager();
