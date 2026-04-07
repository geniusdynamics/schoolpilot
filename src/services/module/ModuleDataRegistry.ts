// ABOUTME: Centralized registry for module data hooks and their integration with AppDataContext
// ABOUTME: Provides automatic registration and discovery of module data entities
// ABOUTME: Ensures consistent data access patterns across all modules

import { DataHookConfig } from '../../hooks/useDataHookFactory';
import { globalProviders, ProviderMetadata, getProviderMetadata } from '../../globalProvidersRegistry';

// Interface for registered module data
export interface RegisteredModuleData {
  entityName: string;
  moduleName: string;
  hookName: string;
  requiresBackend: boolean;
  allowOffline: boolean;
  syncPriority: 'low' | 'medium' | 'high' | 'critical';
  initialDataKey?: string;
}

// Registry for all module data entities
class ModuleDataRegistry {
  private static instance: ModuleDataRegistry;
  private registry: Map<string, RegisteredModuleData> = new Map();
  
  private constructor() {
    // Initialize registry from global providers
    this.initializeFromGlobalProviders();
  }
  
  // Singleton pattern
  public static getInstance(): ModuleDataRegistry {
    if (!ModuleDataRegistry.instance) {
      ModuleDataRegistry.instance = new ModuleDataRegistry();
    }
    return ModuleDataRegistry.instance;
  }
  
  // Initialize registry from global providers
  private initializeFromGlobalProviders(): void {
    for (const key in globalProviders) {
      const item = globalProviders[key];
      const metadata = item.metadata;
      
      if (metadata.type === 'data' && metadata.entityName) {
        this.register({
          entityName: metadata.entityName,
          moduleName: metadata.module,
          hookName: metadata.name,
          requiresBackend: metadata.requiresBackend || false,
          allowOffline: metadata.allowOffline !== false,
          syncPriority: metadata.syncPriority || 'medium'
        });
      }
    }
  }
  
  // Register a module data entity
  public register(data: RegisteredModuleData): void {
    this.registry.set(data.entityName, data);
  }
  
  // Get all registered module data entities
  public getAll(): RegisteredModuleData[] {
    return Array.from(this.registry.values());
  }
  
  // Get a specific module data entity by entity name
  public getByEntityName(entityName: string): RegisteredModuleData | undefined {
    return this.registry.get(entityName);
  }
  
  // Get all module data entities for a specific module
  public getByModule(moduleName: string): RegisteredModuleData[] {
    return this.getAll().filter(item => item.moduleName === moduleName);
  }
  
  // Check if an entity is registered
  public isRegistered(entityName: string): boolean {
    return this.registry.has(entityName);
  }
  
  // Get hook metadata for a specific entity
  public getHookMetadata(entityName: string): ProviderMetadata | undefined {
    const data = this.getByEntityName(entityName);
    if (!data) return undefined;
    
    return getProviderMetadata(data.hookName);
  }
  
  // Get all entities that require backend
  public getBackendRequiredEntities(): string[] {
    return this.getAll()
      .filter(item => item.requiresBackend)
      .map(item => item.entityName);
  }
  
  // Get all entities that allow offline operations
  public getOfflineCapableEntities(): string[] {
    return this.getAll()
      .filter(item => item.allowOffline)
      .map(item => item.entityName);
  }
  
  // Get all entities by sync priority
  public getEntitiesBySyncPriority(priority: 'low' | 'medium' | 'high' | 'critical'): string[] {
    return this.getAll()
      .filter(item => item.syncPriority === priority)
      .map(item => item.entityName);
  }
}

// Export singleton instance
export const moduleDataRegistry = ModuleDataRegistry.getInstance();

// Helper function to register a data hook configuration
export function registerDataHook<T>(config: DataHookConfig<T>): void {
  moduleDataRegistry.register({
    entityName: config.entityName,
    moduleName: config.entityModule,
    hookName: `use${config.entityName.charAt(0).toUpperCase() + config.entityName.slice(1, -1)}Data`,
    requiresBackend: config.requiresBackend || false,
    allowOffline: config.allowOffline !== false,
    syncPriority: config.syncPriority || 'medium'
  });
}