// ABOUTME: Module loader for registering and initializing all modules
// ABOUTME: Uses true dynamic module loading for plugin-like architecture

import { moduleRegistry } from './moduleRegistry';
import { initializeDynamicModules, getAvailableModules } from '../services/dynamicModuleLoader';

// Initialize all modules using the new dynamic system
const loadedModules = new Map<string, Promise<any>>();

const loadModule = async (moduleId: string) => {
  const existing = loadedModules.get(moduleId);
  if (existing) return existing;

  const loadPromise = (async () => {
    try {
      // Using @vite-ignore because this is an intentional dynamic import
      const module = await import(/* @vite-ignore */ `../modules/${moduleId}`);
      return module;
    } catch (error) {
      loadedModules.delete(moduleId);
      throw new Error(`Failed to load module ${moduleId}: ${error}`);
    }
  })();

  loadedModules.set(moduleId, loadPromise);
  return loadPromise;
};

export const initializeModules = async (): Promise<void> => {
  console.log('🚀 Initializing modules with dynamic loader...');
  
  // Use the new true dynamic module loading
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