import { logger } from '@/utils/logging';

// ABOUTME: Utility for registering module data hooks with the global context
// ABOUTME: Ensures consistent data hook registration and discovery
// ABOUTME: Provides automatic integration with AppDataContext

import { useEffect, useMemo } from 'react';
import { DataHookConfig, EntityData } from './useDataHookFactory';
import { moduleDataRegistry, registerDataHook } from '../services/module/ModuleDataRegistry';

/**
 * Hook for registering module data hooks with the global context
 * Ensures consistent data hook registration and discovery
 * Provides automatic integration with AppDataContext
 */
export function useDataHookRegistration<T extends EntityData>(
  config: DataHookConfig<T>
): void {
  // Memoize the registration key to prevent unnecessary re-registrations
  const registrationKey = useMemo(() => {
    return `${config.entityModule}:${config.entityName}`;
  }, [config.entityModule, config.entityName]);

  useEffect(() => {
    logger.info(`🔧 [useDataHookRegistration] Registering data hook for ${config.entityName} in ${config.entityModule}`);
    
    // Register the data hook with the global registry
    moduleDataRegistry.register({
      entityName: config.entityName,
      moduleName: config.entityModule,
      hookName: `use${config.entityName.charAt(0).toUpperCase() + config.entityName.slice(1)}Data`,
      requiresBackend: config.requiresBackend || false,
      allowOffline: config.allowOffline || true,
      syncPriority: config.syncPriority || 'medium'
    });
  }, [registrationKey]); // Use the memoized key instead of individual properties
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