// ABOUTME: Central module registration - imports and registers all module factories
// ABOUTME: This file ensures all modules are available for dynamic loading

import { moduleLoader } from './moduleLoader';
import { moduleRegistry } from './moduleRegistry';
import { modularSystem } from './ModularSystem';
import type { LoadedModule, ModuleMetadata } from './types/module';
import type { ModuleDefinition } from './types';
import { logger } from '@/utils/logging';

// Import all module definitions
import academicsModule from '@/modules/academics/moduleDefinition';
import administrationModule from '@/modules/administration/moduleDefinition';
import admissionsModule from '@/modules/admissions/moduleDefinition';
import financeModule from '@/modules/finance/moduleDefinition';
import hrModule from '@/modules/hr/moduleDefinition';
import inventoryModule from '@/modules/inventory/moduleDefinition';
import libraryModule from '@/modules/library/moduleDefinition';
import nutritionModule from '@/modules/nutrition/moduleDefinition';
import portalModule from '@/modules/portal/moduleDefinition';
import reportsModule from '@/modules/reports/moduleDefinition';
import settingsModule from '@/modules/settings/moduleDefinition';
import coreModules from '@/modules/core/moduleDefinition';

// Module definitions array (flatten coreModules array)
const allModuleDefinitions: ModuleDefinition[] = [
  ...(Array.isArray(coreModules) ? coreModules : [coreModules]),
  administrationModule,
  admissionsModule,
  academicsModule,
  portalModule,
  financeModule,
  hrModule,
  inventoryModule,
  libraryModule,
  nutritionModule,
  reportsModule,
  settingsModule,
];

/**
 * Convert ModuleDefinition to LoadedModule format
 */
function convertToLoadedModule(def: ModuleDefinition): LoadedModule {
  const metadata: ModuleMetadata = {
    id: def.id,
    name: def.name,
    description: def.description,
    version: def.version || '1.0.0',
    author: { name: 'SchoolPilot Team' },
    license: 'MIT',
    dependencies: (def.dependencies || []).map(dep => ({
      moduleId: dep.moduleId,
      version: dep.version,
      required: dep.required !== false,
      reason: dep.reason,
      imports: dep.imports,
    })),
    optionalDependencies: (def.optionalDependencies || []).map(dep => ({
      moduleId: dep.moduleId,
      version: dep.version,
      required: false,
      reason: dep.reason,
    })),
    schemas: def.schemas || [],
    migrations: def.migrations,
    provides: {
      entities: def.provides?.entities || [],
      services: def.provides?.services || [],
      hooks: def.provides?.hooks || [],
      routes: (def.navigation || []).map(n => n.path).filter(Boolean) as string[],
    },
    capabilities: {
      offlineSupport: def.capabilities?.offlineSupport ?? true,
      requiresBackend: def.capabilities?.requiresBackend ?? false,
      multiTenant: def.capabilities?.multiTenant ?? false,
      supportsSync: def.capabilities?.supportsSync ?? true,
      realTime: def.capabilities?.realTime ?? false,
    },
    config: def.config || {},
    minSchoolPilotVersion: def.minSchoolPilotVersion || '1.0.0',
    targetSchoolPilotVersion: def.targetSchoolPilotVersion || '1.0.0',
  };

  return {
    id: def.id,
    metadata,
    // Module components will be loaded lazily via the moduleDefinition
    components: {},
    hooks: {
      onRegister: async () => {
        logger.debug(`[ModuleRegistration] ${def.id} registered`);
      },
      onEnable: async () => {
        logger.debug(`[ModuleRegistration] ${def.id} enabled`);
      },
      onDisable: async () => {
        logger.debug(`[ModuleRegistration] ${def.id} disabled`);
      },
    },
  };
}

/**
 * Register all module factories with the module loader
 */
export function registerModuleFactories(): void {
  logger.debug('[ModuleRegistration] Registering module factories...');
  
  for (const moduleDef of allModuleDefinitions) {
    const factory = async (): Promise<LoadedModule> => {
      return convertToLoadedModule(moduleDef);
    };
    
    moduleLoader.registerFactory(moduleDef.id, factory);
    logger.debug(`[ModuleRegistration] Registered factory for: ${moduleDef.id}`);
  }
  
  logger.debug(`[ModuleRegistration] Registered ${allModuleDefinitions.length} module factories`);
}

/**
 * Register all modules directly with the module registry
 * This is an alternative approach that bypasses the loader factories
 */
export async function registerAllModules(): Promise<void> {
  logger.debug('[ModuleRegistration] Registering all modules with registry...');
  
  const loadedModules = allModuleDefinitions.map(convertToLoadedModule);
  
  // Register in dependency order
  const resolution = modularSystem.getDependencyGraph();
  
  for (const module of loadedModules) {
    if (!moduleRegistry.isRegistered(module.id)) {
      try {
        await moduleRegistry.register(module, module.hooks);
        logger.debug(`[ModuleRegistration] Registered module: ${module.id}`);
      } catch (error) {
        logger.error(`[ModuleRegistration] Failed to register module ${module.id}:`, error);
      }
    }
  }
  
  logger.debug(`[ModuleRegistration] Registered ${loadedModules.length} modules`);
}

/**
 * Initialize all modules - registers factories and loads modules
 */
export async function initializeAllModules(): Promise<void> {
  logger.debug('[ModuleRegistration] Initializing all modules...');
  
  // Register factories first
  registerModuleFactories();
  
  // Register modules with registry
  await registerAllModules();
  
  // Enable all modules
  await moduleRegistry.initialize();
  
  logger.debug('[ModuleRegistration] All modules initialized');
}

// Auto-register factories when this module is imported
registerModuleFactories();
