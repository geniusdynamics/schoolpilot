// ABOUTME: True dynamic module loader that scans and loads modules automatically
// ABOUTME: No hard-coded imports - truly pluggable architecture

import { ModuleDefinition } from '../core/types';
import { moduleRegistry } from '../core/moduleRegistry';
import { rbacService } from '../core/rbacService';
import { moduleConfigService } from './moduleConfigService';

// Module discovery and loading
class DynamicModuleLoader {
  private loadedModules: Map<string, ModuleDefinition> = new Map();

  // Discover and load all available modules
  async discoverAndLoadModules(): Promise<ModuleDefinition[]> {
    console.log('🔍 Discovering modules dynamically...');
    
    const modules: ModuleDefinition[] = [];
    const enabledModuleIds = moduleConfigService.getEnabledModules();
    
    // Load core modules first (always available)
    const coreModules = await this.loadCoreModules();
    modules.push(...coreModules);
    
    // Load feature modules based on configuration
    for (const moduleId of enabledModuleIds) {
      if (moduleId === 'dashboard') continue; // Dashboard is handled separately
      
      try {
        const module = await this.loadModule(moduleId);
        if (module) {
          modules.push(module);
          console.log(`✅ Loaded module: ${moduleId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load module ${moduleId}:`, error);
      }
    }
    
    console.log(`📦 Total modules loaded: ${modules.length}`);
    return modules;
  }

  // Load core modules (always available)
  private async loadCoreModules(): Promise<ModuleDefinition[]> {
    try {
      const coreModules = await import('../modules/core/moduleDefinition.tsx');
      const modules = coreModules.default;
      
      // Handle both single module and array of modules
      if (Array.isArray(modules)) {
        return modules;
      } else {
        return [modules];
      }
    } catch (error) {
      console.warn('⚠️ Failed to load core modules:', error);
      return [];
    }
  }

  // Load a specific module dynamically
  private async loadModule(moduleId: string): Promise<ModuleDefinition | null> {
    try {
      // Check if module is already loaded
      if (this.loadedModules.has(moduleId)) {
        return this.loadedModules.get(moduleId)!;
      }

      // Dynamically import module definition
      const moduleDef = await import(`../modules/${moduleId}/moduleDefinition.tsx`);
      const module = moduleDef.default;
      
      // Load RBAC if available
      try {
        const rbac = await import(`../modules/${moduleId}/rbac.ts`);
        if (rbac.defaultPermissions) {
          module.rbacPermissions = rbac.defaultPermissions;
        }
        if (rbac.defaultRoles) {
          module.defaultRoles = rbac.defaultRoles;
        }
      } catch (rbacError) {
        console.warn(`⚠️ No RBAC found for module ${moduleId}:`, rbacError);
      }

      // Cache the loaded module
      this.loadedModules.set(moduleId, module);
      
      return module;
    } catch (error) {
      console.error(`❌ Failed to load module ${moduleId}:`, error);
      return null;
    }
  }

  // Load a module by ID (for runtime loading)
  async loadModuleById(moduleId: string): Promise<ModuleDefinition | null> {
    return this.loadModule(moduleId);
  }

  // Unload a module
  unloadModule(moduleId: string): boolean {
    if (this.loadedModules.has(moduleId)) {
      this.loadedModules.delete(moduleId);
      console.log(`🗑️ Unloaded module: ${moduleId}`);
      return true;
    }
    return false;
  }

  // Get all loaded modules
  getLoadedModules(): ModuleDefinition[] {
    return Array.from(this.loadedModules.values());
  }

  // Check if a module is loaded
  isModuleLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }

  // Get module by ID
  getModule(moduleId: string): ModuleDefinition | undefined {
    return this.loadedModules.get(moduleId);
  }

  // Reload a module
  async reloadModule(moduleId: string): Promise<ModuleDefinition | null> {
    this.unloadModule(moduleId);
    return this.loadModule(moduleId);
  }

  // Get module loading statistics
  getLoadingStats() {
    const enabledModules = moduleConfigService.getEnabledModules();
    const loadedModules = this.getLoadedModules();
    
    return {
      totalEnabled: enabledModules.length,
      totalLoaded: loadedModules.length,
      loadedModules: loadedModules.map(m => m.id),
      missingModules: enabledModules.filter(id => !this.isModuleLoaded(id))
    };
  }
}

// Export singleton instance
export const dynamicModuleLoader = new DynamicModuleLoader();

// Initialize modules (replaces the old hard-coded approach)
export const initializeDynamicModules = async (): Promise<void> => {
  console.log('🚀 Initializing dynamic modules...');
  
  try {
    // Validate configuration first
    const validation = moduleConfigService.validateConfig();
    if (!validation.valid) {
      console.error('❌ Module configuration validation failed:', validation.errors);
      throw new Error('Invalid module configuration');
    }

    // Discover and load modules
    const modules = await dynamicModuleLoader.discoverAndLoadModules();
    
    // Register modules with registry and RBAC service
    modules.forEach(module => {
      moduleRegistry.registerModule(module);
      rbacService.registerModule(module);
    });
    
    console.log(`✅ Successfully initialized ${modules.length} modules`);
    
    // Log statistics
    const stats = dynamicModuleLoader.getLoadingStats();
    console.log('📊 Module loading statistics:', stats);
    
  } catch (error) {
    console.error('❌ Failed to initialize dynamic modules:', error);
    throw error;
  }
};

// Get available modules (for backward compatibility)
export const getAvailableModules = async (): Promise<ModuleDefinition[]> => {
  return dynamicModuleLoader.getLoadedModules();
};

// Check if a module is available
export const isModuleAvailable = (moduleId: string): boolean => {
  return dynamicModuleLoader.isModuleLoaded(moduleId);
};

// Get module by ID
export const getModuleById = (moduleId: string): ModuleDefinition | undefined => {
  return dynamicModuleLoader.getModule(moduleId);
};

export default dynamicModuleLoader; 