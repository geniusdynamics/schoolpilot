import { logger } from '@/utils/logging';

// ABOUTME: Module Collection Registry - Auto-discovery system
// ABOUTME: No more manual editing! Modules register themselves automatically
// ABOUTME: Each module exports MODULE_COLLECTIONS_CONFIG, core aggregates them

import type { ModuleCollectionsConfig, ModuleCollectionsRegistry } from '@/core/types/moduleCollections';

/**
 * Import collection configs from all modules
 * When adding a new module, just add its import here - that's it!
 */
import { financeModuleCollections } from '@/modules/finance/data/collectionConfig';
import { administrationModuleCollections } from '@/modules/administration/data/collectionConfig';
import { academicsModuleCollections } from '@/modules/academics/data/collectionConfig';
import { hrModuleCollections } from '@/modules/hr/data/collectionConfig';
import { inventoryModuleCollections } from '@/modules/inventory/data/collectionConfig';
import { libraryModuleCollections } from '@/modules/library/data/collectionConfig';
import { nutritionModuleCollections } from '@/modules/nutrition/data/collectionConfig';
import { admissionsModuleCollections } from '@/modules/admissions/data/collectionConfig';

/**
 * All module collection configs
 * Add new module config here when creating a new module
 */
const MODULE_CONFIGS: ModuleCollectionsConfig[] = [
  financeModuleCollections,
  administrationModuleCollections,
  academicsModuleCollections,
  hrModuleCollections,
  inventoryModuleCollections,
  libraryModuleCollections,
  nutritionModuleCollections,
  admissionsModuleCollections,
];

/**
 * Core system collections (always present, not module-specific)
 */
const CORE_ALIASES: Record<string, string> = {
  app_settings: 'schoolDetails',
  school_details: 'schoolDetails',
  users: 'users',
  roles: 'roles',
};

/**
 * Auto-generate the registry from module configs
 */
function generateRegistry(configs: ModuleCollectionsConfig[]): ModuleCollectionsRegistry {
  const aliases: Record<string, string> = { ...CORE_ALIASES };
  const schemas: Record<string, any> = {};
  const modules: Array<{ name: string; collectionCount: number }> = [];

  for (const config of configs) {
    // Merge aliases
    Object.assign(aliases, config.aliases);
    
    // Merge schemas
    if (config.schemas) {
      Object.assign(schemas, config.schemas);
    }
    
    // Track module metadata
    modules.push({
      name: config.moduleName,
      collectionCount: Object.keys(config.aliases).length
    });
  }

  // Extract AppData keys (values from aliases, unique, sorted)
  const appDataKeys = [...new Set(Object.values(aliases))].sort();

  return {
    aliases,
    appDataKeys,
    schemas,
    modules
  };
}

/**
 * The auto-generated registry
 * This replaces the hardcoded APP_DATA_ARRAY_KEYS and COLLECTION_KEY_ALIASES
 */
export const MODULE_COLLECTIONS_REGISTRY: ModuleCollectionsRegistry = generateRegistry(MODULE_CONFIGS);

/**
 * Convenience exports (backward compatible with existing code)
 */
export const APP_DATA_ARRAY_KEYS = MODULE_COLLECTIONS_REGISTRY.appDataKeys as readonly string[];
export const COLLECTION_KEY_ALIASES = MODULE_COLLECTIONS_REGISTRY.aliases;

/**
 * Debug helper - see what modules are registered
 */
export function getModuleRegistryInfo(): string {
  const lines = [
    '📦 Module Collections Registry',
    `Total modules: ${MODULE_COLLECTIONS_REGISTRY.modules.length}`,
    `Total collections: ${MODULE_COLLECTIONS_REGISTRY.appDataKeys.length}`,
    '',
    'Module breakdown:'
  ];
  
  for (const mod of MODULE_COLLECTIONS_REGISTRY.modules) {
    lines.push(`  • ${mod.name}: ${mod.collectionCount} collections`);
  }
  
  return lines.join('\n');
}

/**
 * Register a new module dynamically (for plugin system)
 */
export function registerModuleCollections(config: ModuleCollectionsConfig): void {
  // This would be used for runtime plugin registration
  // For now, modules are statically imported
  logger.info(`[ModuleRegistry] Would register module: ${config.moduleName}`);
  logger.info(`[ModuleRegistry] Collections: ${Object.keys(config.aliases).join(', ')}`);
}
