// ABOUTME: Utility for registering module data hooks with the global context
// ABOUTME: Ensures consistent data hook registration and discovery
// ABOUTME: Provides automatic integration with AppDataContext

import { useEffect } from 'react';
import { DataHookConfig } from './useDataHookFactory';
import { moduleDataRegistry, registerDataHook } from '../services/ModuleDataRegistry';

/**
 * Hook for registering a data hook with the global context
 * @param config Configuration for the data hook
 */
export function useDataHookRegistration<T>(config: DataHookConfig<T>): void {
  // Don't call useAppData during initialization to avoid circular dependency
  // The registration happens independently of the AppDataProvider

  // Register the data hook with the registry
  useEffect(() => {
    console.log(`Registering data hook for ${config.entityName} from ${config.entityModule} module`);
    registerDataHook(config);

    // Return cleanup function
    return () => {
      // Cleanup logic if needed
    };
  }, [config.entityName, config.entityModule]);

  // Note: We don't call useAppData here to avoid circular dependency during AppDataProvider initialization
  // The data integration happens later when the AppDataProvider is fully initialized
}

/**
 * Helper function to register a data hook configuration
 * @param config Configuration for the data hook
 */
export function registerDataHookConfig<T>(config: DataHookConfig<T>): void {
  registerDataHook(config);
}

/**
 * Get all registered data hooks
 */
export function getAllRegisteredDataHooks() {
  return moduleDataRegistry.getAll();
}

/**
 * Check if a data hook is registered
 * @param entityName Name of the entity
 */
export function isDataHookRegistered(entityName: string): boolean {
  return moduleDataRegistry.isRegistered(entityName);
}