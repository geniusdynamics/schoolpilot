// ABOUTME: Dynamic module loader for plugin-like architecture
// ABOUTME: Automatically discovers and loads modules from individual module directories

import { ModuleDefinition } from './types';
import { moduleRegistry } from './moduleRegistry';
import { rbacService } from './rbacService';

// Core modules (always available)
import coreModules from '../modules/core/moduleDefinition.tsx';
import administrationModule from '../modules/administration/moduleDefinition.tsx';
import academicsModule from '../modules/academics/moduleDefinition.tsx';
import financeModule from '../modules/finance/moduleDefinition.tsx';
import hrModule from '../modules/hr/moduleDefinition.tsx';
import inventoryModule from '../modules/inventory/moduleDefinition.tsx';
import libraryModule from '../modules/library/moduleDefinition.tsx';
import nutritionModule from '../modules/nutrition/moduleDefinition.tsx';

import { corePermissions, coreDefaultRoles } from '../modules/core/rbac.ts';
import { administrationPermissions, administrationDefaultRoles } from '../modules/administration/rbac.ts';
import { academicsPermissions, academicsDefaultRoles } from '../modules/academics/rbac.ts';
import { financePermissions, financeDefaultRoles } from '../modules/finance/rbac.ts';
import { hrPermissions, hrDefaultRoles } from '../modules/hr/rbac.ts';
import { inventoryPermissions, inventoryDefaultRoles } from '../modules/inventory/rbac.ts';
import { libraryPermissions, libraryDefaultRoles } from '../modules/library/rbac.ts';
import { nutritionPermissions, nutritionDefaultRoles } from '../modules/nutrition/rbac.ts';

// Collect all available modules
const collectAvailableModules = (): ModuleDefinition[] => {
  const modules: ModuleDefinition[] = [];

  // Add core modules
  modules.push(...coreModules);

  // Add feature modules
  modules.push(
    administrationModule,
    academicsModule,
    financeModule,
    hrModule,
    inventoryModule,
    libraryModule,
    nutritionModule
  );

  return modules;
};

// Attach RBAC to modules
coreModules.forEach(m => { m.rbacPermissions = corePermissions; m.defaultRoles = coreDefaultRoles; });
administrationModule.rbacPermissions = administrationPermissions;
administrationModule.defaultRoles = administrationDefaultRoles;
academicsModule.rbacPermissions = academicsPermissions;
academicsModule.defaultRoles = academicsDefaultRoles;
financeModule.rbacPermissions = financePermissions;
financeModule.defaultRoles = financeDefaultRoles;
hrModule.rbacPermissions = hrPermissions;
hrModule.defaultRoles = hrDefaultRoles;
inventoryModule.rbacPermissions = inventoryPermissions;
inventoryModule.defaultRoles = inventoryDefaultRoles;
libraryModule.rbacPermissions = libraryPermissions;
libraryModule.defaultRoles = libraryDefaultRoles;
nutritionModule.rbacPermissions = nutritionPermissions;
nutritionModule.defaultRoles = nutritionDefaultRoles;

// Initialize dynamic modules
export const initializeDynamicModules = async (): Promise<void> => {
  console.log('Initializing dynamic modules...');
  
  const availableModules = collectAvailableModules();
  
  // Register all available modules (with RBAC attached)
  availableModules.forEach(module => {
    moduleRegistry.registerModule(module);
    rbacService.registerModule(module);
    console.log(`Registered module: ${module.id} (${module.version})`);
  });
  
  console.log(`Total modules registered: ${moduleRegistry.getAllModules().length}`);
  console.log(`Active modules: ${moduleRegistry.getEnabledModules().length}`);
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