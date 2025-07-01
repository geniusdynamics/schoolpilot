// ABOUTME: Module loader for registering and initializing all modules
// ABOUTME: Uses dynamic module loading for plugin-like architecture

import { moduleRegistry } from './moduleRegistry';
import { initializeDynamicModules, getAvailableModules } from './dynamicModuleLoader';

// Initialize all modules
export const initializeModules = async (): Promise<void> => {
  console.log('Initializing modules...');
  
  // Use dynamic module loading
  await initializeDynamicModules();
};

// Get dynamic navigation items
export const getDynamicNavigationItems = () => {
  return moduleRegistry.getNavigationItems();
};

// Check if a module is enabled
export const isModuleEnabled = (moduleId: string): boolean => {
  return moduleRegistry.isModuleEnabled(moduleId);
};

// Get module by ID
export const getModule = (moduleId: string) => {
  return moduleRegistry.getModule(moduleId);
};

// Get all enabled modules
export const getEnabledModules = () => {
  return moduleRegistry.getEnabledModules();
};

// Get modules by feature
export const getModulesByFeature = (feature: string) => {
  return moduleRegistry.getModulesByFeature(feature);
};

// Get all available features
export const getAllFeatures = () => {
  return moduleRegistry.getAllFeatures();
};

// Get module settings
export const getModuleSettings = () => {
  return moduleRegistry.getModuleSettings();
};

// Enable/disable modules
export const enableModule = (moduleId: string): boolean => {
  return moduleRegistry.enableModule(moduleId);
};

export const disableModule = (moduleId: string): boolean => {
  return moduleRegistry.disableModule(moduleId);
};

// Check module dependencies
export const checkModuleDependencies = (moduleId: string) => {
  return moduleRegistry.checkDependencies(moduleId);
};

// Export the registry for direct access if needed
export { moduleRegistry }; 