// ABOUTME: Dynamic module loader for plugin-like architecture
// ABOUTME: Automatically discovers and loads modules from individual module directories

import { ModuleDefinition } from './types';
import { moduleRegistry } from './moduleRegistry';
import { rbacService } from './rbacService';
import fs from 'fs';
import path from 'path';

// Core modules (always available)
import coreModules from '../modules/core/moduleDefinition';

// Individual module definitions (dynamically imported)
// Note: In a real implementation, these would be dynamically discovered
// For now, we'll import them statically but structure for future dynamic loading

// Collect all available modules
const collectAvailableModules = (): ModuleDefinition[] => {
  const modules: ModuleDefinition[] = [];

  // Add core modules
  modules.push(...coreModules);

  return modules;
};

// Initialize dynamic modules
export const initializeDynamicModules = async (): Promise<void> => {
  console.log('Initializing dynamic modules...');
  
  const availableModules = collectAvailableModules();
  
  // Register all available modules
  availableModules.forEach(module => {
    moduleRegistry.registerModule(module);
    console.log(`Registered module: ${module.id} (${module.version})`);
  });
  
  console.log(`Total modules registered: ${moduleRegistry.getAllModules().length}`);
  console.log(`Active modules: ${moduleRegistry.getEnabledModules().length}`);

  // Administration module
  let administrationModule: ModuleDefinition | null = null;
  try {
    const administrationModuleImport = await import('../modules/administration/moduleDefinition');
    administrationModule = administrationModuleImport.default || administrationModuleImport.administrationModule;
    // Register RBAC definitions if present
    try {
      const rbacModule = await import('../modules/administration/rbac');
      if (rbacModule && rbacModule.default) {
        const { rbacService } = await import('./rbacService');
        rbacService.registerModule(rbacModule.default);
      }
    } catch (rbacError) {
      console.warn('Administration RBAC not available:', rbacError);
    }
  } catch (error) {
    console.warn('Administration module not available:', error);
  }

  // Core module RBAC
  try {
    const coreRbacModule = await import('../modules/core/rbac');
    if (coreRbacModule && coreRbacModule.default) {
      const { rbacService } = await import('./rbacService');
      rbacService.registerModule(coreRbacModule.default);
    }
  } catch (coreRbacError) {
    console.warn('Core RBAC not available:', coreRbacError);
  }

  // Register RBAC for all modules
  await registerAllModuleRBAC();
};

// Helper to dynamically discover and register RBAC for all modules
const MODULES_PATH = path.resolve(__dirname, '../modules');

export const registerAllModuleRBAC = async () => {
  const moduleDirs = fs.readdirSync(MODULES_PATH, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'core')
    .map(dirent => dirent.name);

  for (const moduleName of moduleDirs) {
    const rbacPath = path.join(MODULES_PATH, moduleName, 'rbac.ts');
    if (fs.existsSync(rbacPath)) {
      const rbacModule = await import(`../modules/${moduleName}/rbac`);
      // Optionally register permissions/roles here if needed
      // (The module loader will also register via moduleDefinition)
      if (rbacModule && rbacModule.default) {
        rbacService.registerModule(rbacModule.default);
      }
    }
  }
};

// Get all available modules
export const getAvailableModules = (): ModuleDefinition[] => {
  return collectAvailableModules();
};

// Check if a specific module is available
export const isModuleAvailable = (moduleId: string): boolean => {
  const availableModules = collectAvailableModules();
  return availableModules.some(module => module.id === moduleId);
};

// Get module by ID
export const getModuleById = (moduleId: string): ModuleDefinition | undefined => {
  const availableModules = collectAvailableModules();
  return availableModules.find(module => module.id === moduleId);
};

// Future: Dynamic module discovery
// This would scan the modules directory and dynamically import modules
export const discoverModules = async (): Promise<ModuleDefinition[]> => {
  // In a real implementation, this would:
  // 1. Scan the modules directory
  // 2. Look for moduleDefinition.tsx files
  // 3. Dynamically import them
  // 4. Return the discovered modules
  
  console.log('Module discovery not yet implemented - using static imports');
  return collectAvailableModules();
};

// Export the registry for direct access
export { moduleRegistry }; 