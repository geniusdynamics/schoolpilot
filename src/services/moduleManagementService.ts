// ABOUTME: Service for managing modules through the UI
// ABOUTME: Allows runtime enabling/disabling of modules with validation

import { moduleConfigService, ModuleInfo } from './moduleConfigService';
import { dynamicModuleLoader } from './dynamicModuleLoader';
import { moduleRegistry } from '../core/moduleRegistry';
import { rbacService } from '../core/rbacService';

export interface ModuleManagementResult {
  success: boolean;
  message: string;
  errors?: string[];
  moduleInfo?: ModuleInfo;
}

class ModuleManagementService {
  // Get all module information for UI display
  getAllModuleInfo(): ModuleInfo[] {
    return moduleConfigService.getAllModuleInfo();
  }

  // Enable a module at runtime
  async enableModule(moduleId: string): Promise<ModuleManagementResult> {
    try {
      console.log(`🔄 Enabling module: ${moduleId}`);
      
      // Check if module can be enabled
      const canEnable = moduleConfigService.enableModule(moduleId);
      if (!canEnable) {
        return {
          success: false,
          message: `Cannot enable module ${moduleId}`,
          errors: ['Module dependencies not satisfied or module not found']
        };
      }

      // Load the module dynamically
      const module = await dynamicModuleLoader.loadModuleById(moduleId);
      if (!module) {
        return {
          success: false,
          message: `Failed to load module ${moduleId}`,
          errors: ['Module definition not found or invalid']
        };
      }

      // Register with registry and RBAC
      moduleRegistry.registerModule(module);
      rbacService.registerModule(module);

      const moduleInfo = moduleConfigService.getAllModuleInfo().find(m => m.id === moduleId);
      
      return {
        success: true,
        message: `Successfully enabled module ${moduleId}`,
        moduleInfo
      };
    } catch (error) {
      console.error(`❌ Error enabling module ${moduleId}:`, error);
      return {
        success: false,
        message: `Error enabling module ${moduleId}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Disable a module at runtime
  async disableModule(moduleId: string): Promise<ModuleManagementResult> {
    try {
      console.log(`🔄 Disabling module: ${moduleId}`);
      
      // Check if module can be disabled
      const canDisable = moduleConfigService.disableModule(moduleId);
      if (!canDisable) {
        return {
          success: false,
          message: `Cannot disable module ${moduleId}`,
          errors: ['Module is required or has dependent modules']
        };
      }

      // Unload from dynamic loader
      dynamicModuleLoader.unloadModule(moduleId);

      // Unregister from registry (RBAC will automatically filter based on registered modules)
      moduleRegistry.unregisterModule(moduleId);

      const moduleInfo = moduleConfigService.getAllModuleInfo().find(m => m.id === moduleId);
      
      return {
        success: true,
        message: `Successfully disabled module ${moduleId}`,
        moduleInfo
      };
    } catch (error) {
      console.error(`❌ Error disabling module ${moduleId}:`, error);
      return {
        success: false,
        message: `Error disabling module ${moduleId}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Reload a module
  async reloadModule(moduleId: string): Promise<ModuleManagementResult> {
    try {
      console.log(`🔄 Reloading module: ${moduleId}`);
      
      const module = await dynamicModuleLoader.reloadModule(moduleId);
      if (!module) {
        return {
          success: false,
          message: `Failed to reload module ${moduleId}`,
          errors: ['Module not found or failed to load']
        };
      }

      // Re-register with updated module
      moduleRegistry.registerModule(module);
      rbacService.registerModule(module);

      const moduleInfo = moduleConfigService.getAllModuleInfo().find(m => m.id === moduleId);
      
      return {
        success: true,
        message: `Successfully reloaded module ${moduleId}`,
        moduleInfo
      };
    } catch (error) {
      console.error(`❌ Error reloading module ${moduleId}:`, error);
      return {
        success: false,
        message: `Error reloading module ${moduleId}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Get module loading statistics
  getLoadingStats() {
    return dynamicModuleLoader.getLoadingStats();
  }

  // Validate current configuration
  validateConfiguration(): { valid: boolean; errors: string[] } {
    return moduleConfigService.validateConfig();
  }

  // Get module dependencies
  getModuleDependencies(moduleId: string): string[] {
    return moduleConfigService.getModuleDependencies(moduleId);
  }

  // Check if module dependencies are satisfied
  checkModuleDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
    return moduleConfigService.checkDependencies(moduleId);
  }

  // Get modules that depend on a specific module
  getDependentModules(moduleId: string): string[] {
    const config = moduleConfigService.getConfig();
    const dependentModules: string[] = [];
    
    Object.entries(config.moduleDependencies).forEach(([id, deps]) => {
      if (deps.includes(moduleId) && moduleConfigService.isModuleEnabled(id)) {
        dependentModules.push(id);
      }
    });
    
    return dependentModules;
  }
}

// Export singleton instance
export const moduleManagementService = new ModuleManagementService();
export default moduleManagementService; 