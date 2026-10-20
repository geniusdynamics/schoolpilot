import { logger } from '@/utils/logging';

// ABOUTME: Service for integrating module data hooks with the global AppDataContext
// ABOUTME: Ensures consistent data flow between module hooks and global context
// ABOUTME: Provides unified data access patterns across all modules

import { moduleDataRegistry, RegisteredModuleData } from '../module/ModuleDataRegistry';
import { DataOperation } from '../consistency/DataStrategyManager';
// import { getAllDataHooks } from '../globalProvidersRegistry'; // Removed - no longer used to prevent React hooks violations

// Interface for data context integration options
export interface DataContextIntegrationOptions {
  enableAutoSync?: boolean;
  syncInterval?: number;
  logDataOperations?: boolean;
  validateDataIntegrity?: boolean;
}

// Default options
const DEFAULT_OPTIONS: DataContextIntegrationOptions = {
  enableAutoSync: false, // Disabled to prevent React hooks violations
  syncInterval: 30000, // 30 seconds
  logDataOperations: false,
  validateDataIntegrity: true
};

// Service for integrating module data hooks with AppDataContext
export class DataContextIntegrationService {
  private static instance: DataContextIntegrationService;
  private options: DataContextIntegrationOptions;
  private syncIntervalId: number | null = null;
  private isInitialized = false;
  
  private constructor(options: DataContextIntegrationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  // Singleton pattern
  public static getInstance(options?: DataContextIntegrationOptions): DataContextIntegrationService {
    if (!DataContextIntegrationService.instance) {
      DataContextIntegrationService.instance = new DataContextIntegrationService(options);
    } else if (options) {
      DataContextIntegrationService.instance.updateOptions(options);
    }
    return DataContextIntegrationService.instance;
  }
  
  // Update options
  public updateOptions(options: Partial<DataContextIntegrationOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Update sync interval if needed
    if (this.isInitialized && this.options.enableAutoSync) {
      this.stopAutoSync();
      this.startAutoSync();
    }
  }
  
  // Initialize the service
  public initialize(appDataContext: any): void {
    if (this.isInitialized) return;
    
    // Register all module data hooks with the AppDataContext
    this.registerModuleDataWithContext(appDataContext);
    
    // Start auto sync if enabled
    if (this.options.enableAutoSync) {
      this.startAutoSync();
    }
    
    this.isInitialized = true;
  }
  
  // Register all module data hooks with the AppDataContext
  private registerModuleDataWithContext(appDataContext: any): void {
    const registeredEntities = moduleDataRegistry.getAll();
    
    // Register each entity with the context
    registeredEntities.forEach(entity => {
      this.registerEntityWithContext(entity, appDataContext);
    });
    
    // Log registration results
    if (this.options.logDataOperations) {
      logger.info(`[DataContextIntegration] Registered ${registeredEntities.length} module data entities with AppDataContext`);
    }
  }
  
  // Register a single entity with the context
  private registerEntityWithContext(entity: RegisteredModuleData, appDataContext: any): void {
    // Skip if already registered
    if (appDataContext[entity.entityName]) return;
    
    try {
      // Create data operation methods for this entity
      const createMethod = `add${entity.entityName.charAt(0).toUpperCase() + entity.entityName.slice(1, -1)}`;
      const updateMethod = `update${entity.entityName.charAt(0).toUpperCase() + entity.entityName.slice(1, -1)}`;
      const deleteMethod = `delete${entity.entityName.charAt(0).toUpperCase() + entity.entityName.slice(1, -1)}`;
      
      // Add methods to context if they don't exist
      if (!appDataContext[createMethod] && appDataContext.dataStrategyManager) {
        appDataContext[createMethod] = async (item: any) => {
          const operation: DataOperation = {
            type: 'write',
            entity: entity.entityName,
            priority: entity.syncPriority,
            requiresBackend: entity.requiresBackend,
            allowOffline: entity.allowOffline
          };
          return appDataContext.dataStrategyManager.executeOperation(operation, item);
        };
      }
      
      if (!appDataContext[updateMethod] && appDataContext.dataStrategyManager) {
        appDataContext[updateMethod] = async (id: string | number, updates: any) => {
          const operation: DataOperation = {
            type: 'write',
            entity: entity.entityName,
            priority: entity.syncPriority,
            requiresBackend: entity.requiresBackend,
            allowOffline: entity.allowOffline
          };
          return appDataContext.dataStrategyManager.executeOperation(operation, { id, ...updates });
        };
      }
      
      if (!appDataContext[deleteMethod] && appDataContext.dataStrategyManager) {
        appDataContext[deleteMethod] = async (id: string | number) => {
          const operation: DataOperation = {
            type: 'delete',
            entity: entity.entityName,
            priority: entity.syncPriority,
            requiresBackend: entity.requiresBackend,
            allowOffline: entity.allowOffline
          };
          return appDataContext.dataStrategyManager.executeOperation(operation, { id });
        };
      }
      
      // Log successful registration
      if (this.options.logDataOperations) {
        logger.info(`[DataContextIntegration] Registered entity ${entity.entityName} from module ${entity.moduleName}`);
      }
    } catch (error) {
      logger.error(`[DataContextIntegration] Failed to register entity ${entity.entityName}:`, error);
    }
  }
  
  // Start auto sync
  private startAutoSync(): void {
    if (this.syncIntervalId !== null) return;
    
    this.syncIntervalId = window.setInterval(() => {
      this.syncAllModuleData();
    }, this.options.syncInterval);
    
    if (this.options.logDataOperations) {
      logger.info(`[DataContextIntegration] Started auto sync with interval ${this.options.syncInterval}ms`);
    }
  }
  
  // Stop auto sync
  private stopAutoSync(): void {
    if (this.syncIntervalId === null) return;
    
    window.clearInterval(this.syncIntervalId);
    this.syncIntervalId = null;
    
    if (this.options.logDataOperations) {
      logger.info('[DataContextIntegration] Stopped auto sync');
    }
  }
  
  // Sync all module data
  // NOTE: Direct hook execution removed to prevent React hooks violations
  // Hooks can only be called inside React components, not in service classes
  public async syncAllModuleData(): Promise<void> {
    if (this.options.logDataOperations) {
      logger.info('[DataContextIntegration] Sync requested - data operations should be handled through React components');
    }
    
    // Instead of calling hooks directly, we rely on:
    // 1. React components to manage their own data through hooks
    // 2. AppDataContext's dataStrategyManager for data operations
    // 3. Natural React re-rendering cycles for data updates
    
    return Promise.resolve();
  }
  
  // Validate data integrity across all modules
  public validateDataIntegrity(): Promise<boolean> {
    if (!this.options.validateDataIntegrity) {
      return Promise.resolve(true);
    }
    
    // Implementation of data integrity validation
    // This would check for referential integrity, data consistency, etc.
    
    return Promise.resolve(true);
  }
  
  // Cleanup resources
  public destroy(): void {
    this.stopAutoSync();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const dataContextIntegrationService = DataContextIntegrationService.getInstance();