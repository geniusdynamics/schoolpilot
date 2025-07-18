// Optimized Module Loader
// Integrates enhanced module loader with performance optimization

import { dynamicModuleLoader } from '../services/dynamicModuleLoader';
import { moduleRegistry } from './moduleRegistry';
import { rbacService } from './rbacService';
import { ModuleDefinition } from './types';

// Initialize and load modules with optimization
export async function initializeModulesOptimized(): Promise<ModuleDefinition[]> {
  console.log('🚀 [OptimizedModuleLoader] Initializing modules with optimization...');

  try {
    // Get available module IDs
    const availableModuleIds = await dynamicModuleLoader.getAvailableModules();
    console.log(`[OptimizedModuleLoader] Available modules:`, availableModuleIds);

    // Load actual module definitions
    const loadedModules: ModuleDefinition[] = [];

    for (const moduleId of availableModuleIds) {
      try {
        const module = await loadModuleDefinition(moduleId);
        if (module) {
          loadedModules.push(module);
          console.log(`[OptimizedModuleLoader] Successfully loaded module: ${moduleId}`);
        } else {
          console.warn(`[OptimizedModuleLoader] Failed to load module: ${moduleId}`);
        }
      } catch (error) {
        console.error(`[OptimizedModuleLoader] Error loading module ${moduleId}:`, error);
      }
    }

    console.log(`[OptimizedModuleLoader] Successfully loaded ${loadedModules.length} modules`);

    // Register modules with the module registry and RBAC service
    loadedModules.forEach(module => {
      console.log(`[OptimizedModuleLoader] Registering module: ${module.id}`);
      moduleRegistry.registerModule(module);
      rbacService.registerModule(module);
    });

    // Initialize super admin role with all permissions
    rbacService.initializeSuperAdminRole();

    // Generate performance report
    const performanceReport = dynamicModuleLoader.generatePerformanceReport();
    console.log('📊 [OptimizedModuleLoader] Module loading performance report:', performanceReport);

    console.log(`✅ [OptimizedModuleLoader] Successfully registered ${loadedModules.length} modules with registry and RBAC`);

    return loadedModules;
  } catch (error) {
    console.error('❌ [OptimizedModuleLoader] Error initializing modules:', error);
    throw error;
  }
}

// Discover available modules
async function discoverAvailableModules(): Promise<string[]> {
  try {
    // Use import.meta.glob to discover module directories with moduleDefinition.tsx files
    const moduleDirectories = import.meta.glob('../modules/*/moduleDefinition.tsx', { eager: true });

    // Extract module IDs from paths
    const moduleIds = Object.keys(moduleDirectories).map(path => {
      const match = path.match(/\.\.\/modules\/([^/]+)\/moduleDefinition\.tsx$/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];

    console.log(`[OptimizedModuleLoader] Discovered module files:`, Object.keys(moduleDirectories));
    console.log(`[OptimizedModuleLoader] Extracted module IDs:`, moduleIds);

    return moduleIds;
  } catch (error) {
    console.error('Failed to discover modules:', error);
    return [];
  }
}

// Load module definition from file
async function loadModuleDefinition(moduleId: string): Promise<ModuleDefinition | null> {
  try {
    console.log(`[OptimizedModuleLoader] Loading definition for module: ${moduleId}`);

    // Try to import the module definition
    let moduleDefinition: ModuleDefinition | null = null;

    switch (moduleId) {
      case 'dashboard':
        const { dashboardModule } = await import('../modules/core/moduleDefinition');
        moduleDefinition = dashboardModule;
        break;
      case 'administration':
        const { administrationModule } = await import('../modules/administration/moduleDefinition');
        moduleDefinition = administrationModule;
        break;
      case 'academics':
        const { academicsModule } = await import('../modules/academics/moduleDefinition');
        moduleDefinition = academicsModule;
        break;
      case 'finance':
        const { financeModule } = await import('../modules/finance/moduleDefinition');
        moduleDefinition = financeModule;
        break;
      case 'hr':
        const { hrModule } = await import('../modules/hr/moduleDefinition');
        moduleDefinition = hrModule;
        break;
      case 'inventory':
        const { inventoryModule } = await import('../modules/inventory/moduleDefinition');
        moduleDefinition = inventoryModule;
        break;
      case 'library':
        const { libraryModule } = await import('../modules/library/moduleDefinition');
        moduleDefinition = libraryModule;
        break;
      case 'nutrition':
        const { nutritionModule } = await import('../modules/nutrition/moduleDefinition');
        moduleDefinition = nutritionModule;
        break;
      case 'reports':
        const { reportsModule } = await import('../modules/core/moduleDefinition');
        moduleDefinition = reportsModule;
        break;
      case 'settings':
        const { settingsModule } = await import('../modules/core/moduleDefinition');
        moduleDefinition = settingsModule;
        break;
      default:
        console.warn(`[OptimizedModuleLoader] Unknown module: ${moduleId}`);
        return null;
    }

    if (moduleDefinition) {
      console.log(`✅ [OptimizedModuleLoader] Successfully loaded definition for module: ${moduleId}`, {
        hasNavigation: !!moduleDefinition.navigation,
        navigationCount: moduleDefinition.navigation?.length || 0
      });
    }

    return moduleDefinition;
  } catch (error) {
    console.error(`❌ [OptimizedModuleLoader] Error loading definition for module ${moduleId}:`, error);
    return null;
  }
}

// Load a specific module
export async function loadModule(moduleId: string): Promise<ModuleDefinition | null> {
  console.log(`🔍 [OptimizedModuleLoader] Loading module: ${moduleId}`);

  try {
    // Check if module is already loaded
    const existingModule = moduleRegistry.getModule(moduleId);
    if (existingModule) {
      console.log(`[OptimizedModuleLoader] Module ${moduleId} is already loaded`);
      return existingModule;
    }

    // Load module directly from definition file
    const module = await loadModuleDefinition(moduleId);

    if (module) {
      // Register module
      moduleRegistry.registerModule(module);
      console.log(`✅ [OptimizedModuleLoader] Successfully loaded module: ${moduleId}`);
      return module;
    } else {
      console.error(`❌ [OptimizedModuleLoader] Failed to load module: ${moduleId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ [OptimizedModuleLoader] Error loading module ${moduleId}:`, error);
    return null;
  }
}

// Load a lazy module
export async function loadLazyModule(moduleId: string): Promise<ModuleDefinition | null> {
  return loadModuleDefinition(moduleId);
}

// Export default functions
export default {
  initializeModules: initializeModulesOptimized,
  loadModule,
  loadLazyModule
};