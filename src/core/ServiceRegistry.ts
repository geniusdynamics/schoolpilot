import { EventEmitter } from 'events';

export interface ServiceDefinition<T = unknown> {
  name: string;
  moduleId: string;
  instance: T;
  dependencies: string[];
  singleton: boolean;
  initialized: boolean;
}

export interface ServiceRegistration<T = unknown> {
  name: string;
  moduleId: string;
  factory: () => T | Promise<T>;
  dependencies?: string[];
  singleton?: boolean;
}

export type ServiceStatus = 'registered' | 'initializing' | 'ready' | 'error';

export interface ServiceState {
  name: string;
  status: ServiceStatus;
  error?: Error;
}

/**
 * Central registry for cross-module services.
 * Manages service discovery, initialization, and dependency injection.
 */
export class ServiceRegistry extends EventEmitter {
  private services = new Map<string, ServiceDefinition>();
  private factories = new Map<string, ServiceRegistration>();
  private instances = new Map<string, unknown>();

  // Event types
  static readonly SERVICE_REGISTERED = 'service:registered';
  static readonly SERVICE_INITIALIZING = 'service:initializing';
  static readonly SERVICE_READY = 'service:ready';
  static readonly SERVICE_ERROR = 'service:error';
  static readonly ALL_READY = 'services:all-ready';

  /**
   * Register a service factory
   */
  register<T>(registration: ServiceRegistration<T>): void {
    const { name, moduleId } = registration;
    const key = this.getKey(moduleId, name);

    if (this.factories.has(key)) {
      throw new Error(`Service "${name}" from module "${moduleId}" is already registered`);
    }

    this.factories.set(key, {
      ...registration,
      dependencies: registration.dependencies || [],
      singleton: registration.singleton ?? true
    });

    this.emit(ServiceRegistry.SERVICE_REGISTERED, { name, moduleId });
  }

  /**
   * Get or create a service instance
   */
  async get<T>(moduleId: string, name: string): Promise<T> {
    const key = this.getKey(moduleId, name);

    // Return cached singleton instance
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }

    const registration = this.factories.get(key);
    if (!registration) {
      throw new Error(`Service "${name}" from module "${moduleId}" is not registered`);
    }

    // Initialize dependencies first
    for (const dep of registration.dependencies || []) {
      const [depModule, depName] = dep.includes('.') 
        ? dep.split('.') 
        : [moduleId, dep];
      await this.get(depModule, depName);
    }

    this.emit(ServiceRegistry.SERVICE_INITIALIZING, { name, moduleId });

    try {
      const instance = await registration.factory();

      if (registration.singleton) {
        this.instances.set(key, instance);
      }

      const definition: ServiceDefinition = {
        name,
        moduleId,
        instance,
        dependencies: registration.dependencies || [],
        singleton: registration.singleton ?? true,
        initialized: true
      };

      this.services.set(key, definition);
      this.emit(ServiceRegistry.SERVICE_READY, { name, moduleId, instance });

      return instance as T;
    } catch (error) {
      this.emit(ServiceRegistry.SERVICE_ERROR, { name, moduleId, error });
      throw error;
    }
  }

  /**
   * Get a service synchronously (only if already initialized)
   */
  getSync<T>(moduleId: string, name: string): T | undefined {
    const key = this.getKey(moduleId, name);
    return this.instances.get(key) as T | undefined;
  }

  /**
   * Check if a service is registered
   */
  has(moduleId: string, name: string): boolean {
    const key = this.getKey(moduleId, name);
    return this.factories.has(key);
  }

  /**
   * Check if a service is ready (initialized)
   */
  isReady(moduleId: string, name: string): boolean {
    const key = this.getKey(moduleId, name);
    return this.services.get(key)?.initialized ?? false;
  }

  /**
   * Find services by name pattern
   */
  find(pattern: string | RegExp): Array<{ moduleId: string; name: string }> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    const results: Array<{ moduleId: string; name: string }> = [];

    for (const [key, registration] of this.factories) {
      if (regex.test(registration.name)) {
        results.push({
          moduleId: registration.moduleId,
          name: registration.name
        });
      }
    }

    return results;
  }

  /**
   * Find services by module
   */
  findByModule(moduleId: string): string[] {
    const results: string[] = [];
    for (const [, registration] of this.factories) {
      if (registration.moduleId === moduleId) {
        results.push(registration.name);
      }
    }
    return results;
  }

  /**
   * Get service state
   */
  getState(moduleId: string, name: string): ServiceState {
    const key = this.getKey(moduleId, name);
    const definition = this.services.get(key);
    
    if (!this.factories.has(key)) {
      return { name, status: 'error', error: new Error('Not registered') };
    }

    if (!definition) {
      return { name, status: 'registered' };
    }

    return { name, status: 'ready' };
  }

  /**
   * Get all service states
   */
  getAllStates(): ServiceState[] {
    const states: ServiceState[] = [];
    for (const [key] of this.factories) {
      const [moduleId, name] = key.split(':', 2);
      states.push(this.getState(moduleId, name));
    }
    return states;
  }

  /**
   * Initialize all registered services
   */
  async initializeAll(): Promise<void> {
    const promises: Promise<unknown>[] = [];
    
    for (const [key, registration] of this.factories) {
      if (!this.instances.has(key)) {
        promises.push(this.get(registration.moduleId, registration.name));
      }
    }

    await Promise.all(promises);
    this.emit(ServiceRegistry.ALL_READY);
  }

  /**
   * Unregister a service
   */
  unregister(moduleId: string, name: string): void {
    const key = this.getKey(moduleId, name);
    this.factories.delete(key);
    this.services.delete(key);
    this.instances.delete(key);
  }

  /**
   * Unregister all services from a module
   */
  unregisterModule(moduleId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, registration] of this.factories) {
      if (registration.moduleId === moduleId) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.factories.delete(key);
      this.services.delete(key);
      this.instances.delete(key);
    }
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.factories.clear();
    this.services.clear();
    this.instances.clear();
  }

  /**
   * Get total number of registered services
   */
  get size(): number {
    return this.factories.size;
  }

  /**
   * Get number of initialized services
   */
  get initializedCount(): number {
    return this.instances.size;
  }

  private getKey(moduleId: string, name: string): string {
    return `${moduleId}:${name}`;
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();
