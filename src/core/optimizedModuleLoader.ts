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
    // Use the enhanced dynamic module loader to discover and load modules
    const loadedModules = await dynamicModuleLoader.discoverAndLoadModules();
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
    
    // Load module
    const module = await dynamicModuleLoader.loadModuleById(moduleId);
    
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
  return dynamicModuleLoader.loadModuleById(moduleId);
}

// Export default functions
export default {
  initializeModules: initializeModulesOptimized,
  loadModule,
  loadLazyModule
};