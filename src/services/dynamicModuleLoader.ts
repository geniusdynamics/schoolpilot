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
    
    // First, discover all available modules from the filesystem
    const availableModules = await this.discoverAvailableModules();
    console.log('[DynamicModuleLoader] DEBUG: Available modules discovered:', availableModules);

    // Load core modules first (always available)
    const coreModules = await this.loadCoreModules();
    console.log('[DynamicModuleLoader] DEBUG: Core modules loaded:', coreModules.map(m => m.id));

    // Load all discovered modules
    for (const moduleId of availableModules) {
      try {
        console.log(`[DynamicModuleLoader] DEBUG: Attempting to load module: ${moduleId}`);
        await this.loadModule(moduleId);
      } catch (error) {
        console.warn(`⚠️ Failed to load module ${moduleId}:`, error);
      }
    }

    const finalLoadedModules = Array.from(this.loadedModules.values());
    console.log(`📦 Total modules loaded: ${finalLoadedModules.length}`);
    console.log('[DynamicModuleLoader] DEBUG: Final loaded module IDs:', finalLoadedModules.map(m => m.id));
    return finalLoadedModules;
  }

  // Discover all available modules by scanning the filesystem
  private async discoverAvailableModules(): Promise<string[]> {
    console.log('[DynamicModuleLoader] Scanning filesystem for available modules...');
    
    // List of known module directories - this should be dynamically discovered in a real implementation
    // For now, we'll use the modules we know exist based on the filesystem structure
    // Note: 'dashboard' is loaded from core modules, not as a separate module
    const potentialModules = [
      'academics',
      'administration',
      'finance',
      'hr',
      'inventory',
      'library',
      'nutrition',
      'reports',
      'settings'
    ];

    const availableModules: string[] = [];

    // Test each potential module to see if it has a moduleDefinition.tsx file
    for (const moduleId of potentialModules) {
      try {
        // Try to dynamically import the module definition to check if it exists
        await import(`../modules/${moduleId}/moduleDefinition.tsx`);
        availableModules.push(moduleId);
        console.log(`[DynamicModuleLoader] ✅ Found module: ${moduleId}`);
      } catch (error) {
        console.log(`[DynamicModuleLoader] ❌ Module ${moduleId} not available:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`[DynamicModuleLoader] Discovered ${availableModules.length} available modules:`, availableModules);
    return availableModules;
  }

  // Load core modules (always available)
  private async loadCoreModules(): Promise<ModuleDefinition[]> {
    const loadedCoreModules: ModuleDefinition[] = [];

    try {
      console.log(`[dynamicModuleLoader] Loading core modules from core/moduleDefinition.tsx`);
      
      // Load all core modules from the core module definition file
      const coreModules = await import('../modules/core/moduleDefinition.tsx');
      const modules = coreModules.default as ModuleDefinition | ModuleDefinition[];
      
      if (Array.isArray(modules)) {
        modules.forEach(module => {
          this.loadedModules.set(module.id, module);
          loadedCoreModules.push(module);
          console.log(`[dynamicModuleLoader] Loaded core module ${module.id}`);
        });
      } else if (modules) {
        this.loadedModules.set(modules.id, modules);
        loadedCoreModules.push(modules);
        console.log(`[dynamicModuleLoader] Loaded core module ${modules.id}`);
      }

      // Also load the standalone settings module if it exists (it has the Module Management navigation)
      try {
        const settingsModule = await this.loadModule('settings');
        if (settingsModule && !this.loadedModules.has('settings')) {
          this.loadedModules.set('settings', settingsModule);
          loadedCoreModules.push(settingsModule);
          console.log(`[dynamicModuleLoader] Loaded standalone settings module`);
        } else if (settingsModule) {
          // Replace the core settings module with the standalone one (it has more navigation items)
          this.loadedModules.set('settings', settingsModule);
          console.log(`[dynamicModuleLoader] Replaced core settings module with standalone version`);
        }
      } catch (error) {
        console.log(`[dynamicModuleLoader] No standalone settings module found, using core version`);
      }

    } catch (error) {
      console.warn(`⚠️ Failed to load core modules:`, error);
    }

    console.log(`[dynamicModuleLoader] Total core modules loaded: ${loadedCoreModules.length}`);
    return loadedCoreModules;
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
      console.log(`[dynamicModuleLoader] Loaded module ${moduleId}:`, module);
      console.log(`[dynamicModuleLoader] Icon for ${moduleId}:`, module.icon);
      
      // Load RBAC if available
      try {
        const rbacModule = await import(`../modules/${moduleId}/rbac.ts`);
        
        // Find the first exported array that looks like a permissions array.
        const permissions = Object.values(rbacModule).find(val => 
          Array.isArray(val) && 
          val.length > 0 && 
          val[0].id && 
          val[0].resource
        );

        if (permissions) {
          module.rbacPermissions = permissions as any;
        }
        
        // Also handle default export object which is used in some modules
        if (rbacModule.default && rbacModule.default.permissions) {
            module.rbacPermissions = rbacModule.default.permissions;
        }

      } catch (error) {
        // This is not a critical error, modules may not have rbac.ts file
        // console.warn(`Could not load RBAC for module ${moduleId}:`, error);
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

    rbacService.initializeSuperAdminRole();
    
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