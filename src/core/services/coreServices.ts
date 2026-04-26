import { moduleRegistry } from '../moduleRegistry';

/**
 * Core Services Registry
 * Central registry for all core services that are available to all modules.
 * Services registered here are always available and don't depend on module loading.
 */
export interface ServiceDefinition<T> {
  name: string;
  service: T;
  dependencies?: string[]; // Names of other services this depends on
}

export class CoreServicesRegistry {
  private services = new Map<string, unknown>();
  private initialized = false;

  /**
   * Register a core service
   */
  register<T>(definition: ServiceDefinition<T>): void {
    if (this.initialized) {
      throw new Error(`Cannot register service "${definition.name}" after initialization`);
    }

    // Check dependencies
    const missingDeps = (definition.dependencies || []).filter(
      dep => !this.services.has(dep)
    );

    if (missingDeps.length > 0) {
      throw new Error(
        `Cannot register service "${definition.name}": missing dependencies: ${missingDeps.join(', ')}`
      );
    }

    this.services.set(definition.name, definition.service);
  }

  /**
   * Get a service by name
   */
  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found`);
    }
    return service as T;
  }

  /**
   * Check if a service exists
   */
  hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Initialize all services
   * Call this after all services are registered
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize services in dependency order
    const initialized = new Set<string>();

    const initializeService = async (name: string): Promise<void> => {
      if (initialized.has(name)) {
        return;
      }

      const serviceDef = Array.from(this.services.entries())
        .find(([n]) => n === name);

      if (!serviceDef) {
        throw new Error(`Service "${name}" not found during initialization`);
      }

      // Initialize dependencies first
      const deps = serviceDef[1]['dependencies'];
      if (deps) {
        for (const dep of deps) {
          await initializeService(dep);
        }
      }

      // Initialize the service
      const service = serviceDef[1];
      if (typeof service.initialize === 'function') {
        await service.initialize();
      }

      initialized.add(name);
    };

    for (const name of this.getServiceNames()) {
      await initializeService(name);
    }

    this.initialized = true;
  }

  /**
   * Check if all services are initialized
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear all services (for testing)
   */
  clear(): void {
    this.services.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const coreServicesRegistry = new CoreServicesRegistry();