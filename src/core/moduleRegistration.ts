// ABOUTME: Central module registration - dynamically imports and registers all module factories
// ABOUTME: This file ensures all modules are available for dynamic loading without static imports

import { moduleLoader } from './moduleLoader';
import { moduleRegistry } from './moduleRegistry';

import type { LoadedModule, ModuleMetadata } from './types/module';
import type { ModuleDefinition } from './types';
import { logger } from '@/utils/logging';

// Dynamic module import map - import directly from moduleDefinition files
// Note: dashboard is NOT a module â€” it's a static page accessible via the logo and the overflow menu
const moduleImports: Record<string, () => Promise<{ default: any }>> = {
  administration: () => import('@/modules/administration/moduleDefinition'),
  academics: () => import('@/modules/academics/moduleDefinition'),
  admissions: () => import('@/modules/admissions/moduleDefinition'),
  finance: () => import('@/modules/finance/moduleDefinition'),
  hr: () => import('@/modules/hr/moduleDefinition'),
  inventory: () => import('@/modules/inventory/moduleDefinition'),
  library: () => import('@/modules/library/moduleDefinition'),
  nutrition: () => import('@/modules/nutrition/moduleDefinition'),
  portal: () => import('@/modules/portal/moduleDefinition'),
  reports: () => import('@/modules/reports/moduleDefinition'),
  settings: () => import('@/modules/settings/moduleDefinition'),
};

// Dynamic module loader
async function loadModuleDefinition(moduleId: string): Promise<ModuleDefinition> {
  const importer = moduleImports[moduleId];
  if (!importer) {
    throw new Error(`No import function defined for module: ${moduleId}`);
  }

  const module: any = await importer();

  // Try default export first, then named export
  if (module.default) {
    return module.default;
  }

  // Fall back to named export (e.g., administrationModule, academicsModule)
  const namedExport = module[`${moduleId}Module`] || module[moduleId];
  if (namedExport) {
    return namedExport;
  }

  throw new Error(`Module ${moduleId} has no valid export (no default or named export found)`);
}

// Lifecycle hooks map (will be populated dynamically)


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
    navigation: def.navigation || [],
    path: def.path,
    icon: def.icon,
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

  // Default lifecycle hooks - modules can override these in their module definitions
  const hooks = {
    onRegister: async () => {
      logger.debug(`[ModuleRegistration] ${def.id} registered`);
    },
    onEnable: async () => {
      logger.debug(`[ModuleRegistration] ${def.id} enabled`);
    },
    onDisable: async () => {
      logger.debug(`[ModuleRegistration] ${def.id} disabled`);
    },
  };

  return {
    id: def.id,
    metadata,
    // Module components will be loaded lazily via the moduleDefinition
    components: {},
    hooks,
  };
}

/**
 * Register all module factories with the module loader
 */
export function registerModuleFactories(): void {
  logger.debug('[ModuleRegistration] Registering dynamic module factories...');
  
  const moduleIds = Object.keys(moduleImports);
  
  for (const moduleId of moduleIds) {
    const factory = async (): Promise<LoadedModule> => {
      const moduleDef = await loadModuleDefinition(moduleId);
      return convertToLoadedModule(moduleDef);
    };
    
    moduleLoader.registerFactory(moduleId, factory);
    logger.debug(`[ModuleRegistration] Registered factory for: ${moduleId}`);
  }
  
  logger.debug(`[ModuleRegistration] Registered ${moduleIds.length} dynamic module factories`);
}

/**
 * Register all modules directly with the module registry
 * This loads modules dynamically and registers them
 */
export async function registerAllModules(): Promise<void> {
  logger.debug('[ModuleRegistration] Dynamically loading and registering all modules...');

  const moduleIds = Object.keys(moduleImports);
  const loadedModules: LoadedModule[] = [];

  for (const moduleId of moduleIds) {
    try {
      const importer = moduleImports[moduleId];
      if (!importer) continue;
      
      const moduleExport: any = await importer();
      let moduleDefs: ModuleDefinition[];
      
      // Handle modules that export an array (like core) vs single module definition
      if (moduleExport.default && Array.isArray(moduleExport.default)) {
        moduleDefs = moduleExport.default;
      } else if (moduleExport.default) {
        moduleDefs = [moduleExport.default];
      } else {
        // Fall back to named export
        const namedExport = moduleExport[`${moduleId}Module`] || moduleExport[moduleId];
        if (namedExport) {
          moduleDefs = [namedExport];
        } else {
          logger.warn(`[ModuleRegistration] Module ${moduleId} has no valid export, skipping`);
          continue;
        }
      }

      for (const moduleDef of moduleDefs) {
        if (!moduleDef || !moduleDef.id) {
          logger.warn(`[ModuleRegistration] Skipping module with missing id in ${moduleId}`);
          continue;
        }
        
        const loadedModule = convertToLoadedModule(moduleDef);
        loadedModules.push(loadedModule);

        if (!moduleRegistry.isRegistered(moduleDef.id)) {
          await moduleRegistry.register(loadedModule, loadedModule.hooks);
          logger.debug(`[ModuleRegistration] Registered module: ${moduleDef.id} with ${loadedModule.metadata.navigation?.length || 0} navigation items`);
        } else {
          logger.debug(`[ModuleRegistration] Module ${moduleDef.id} already registered`);
        }
      }
    } catch (error) {
      logger.error(`[ModuleRegistration] Failed to load/register module ${moduleId}:`, error);
    }
  }

  logger.debug(`[ModuleRegistration] Loaded and registered ${loadedModules.length} modules`);
}

/**
 * Initialize all modules - registers factories and loads modules
 */
export async function initializeAllModules(): Promise<void> {
  logger.debug('[ModuleRegistration] Initializing all modules dynamically...');

  // Register factories first
  registerModuleFactories();

  // Register modules with registry (loads them dynamically)
  await registerAllModules();

  logger.debug('[ModuleRegistration] About to enable modules via moduleRegistry.initialize()');

  // Enable all modules
  await moduleRegistry.initialize();

  const enabledModules = moduleRegistry.getEnabledModules();
  logger.debug(`[ModuleRegistration] After initialization, enabled modules: ${enabledModules.length}`, enabledModules);

  logger.debug('[ModuleRegistration] All modules initialized');
}

// Auto-register factories when this module is imported
registerModuleFactories();
