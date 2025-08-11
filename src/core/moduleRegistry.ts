// ABOUTME: Module registry system for dynamic module loading and navigation management
// ABOUTME: This system allows modules to be registered, enabled/disabled, and their navigation to be dynamically generated

import { ModuleDefinition, NavItem } from './types';
import { MODULE_ORDER } from '../moduleOrder';
import { moduleConfigService } from '../services/moduleConfigService';

// Helper to identify core modules
const CORE_MODULE_IDS = ['dashboard', 'settings', 'reports'];

// Module Registry Class
class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();

  // Register a new module
  registerModule(module: ModuleDefinition): void {
    this.modules.set(module.id, module);
  }

  // Unregister a module
  unregisterModule(moduleId: string): void {
    this.modules.delete(moduleId);
  }

  // Enable a module (updates config service)
  enableModule(moduleId: string): boolean {
    return moduleConfigService.enableModule(moduleId);
  }

  // Disable a module (updates config service)
  disableModule(moduleId: string): boolean {
    return moduleConfigService.disableModule(moduleId);
  }

  // Get all registered modules
  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  // Get enabled modules only
  getEnabledModules(): ModuleDefinition[] {
    const allModules = Array.from(this.modules.values());
    console.log('[ModuleRegistry] DEBUG: All registered modules:', allModules.map(m => m.id));
    
    const enabledModules = allModules.filter(module => {
      const isCoreModule = CORE_MODULE_IDS.includes(module.id);
      const isConfigEnabled = moduleConfigService.isModuleEnabled(module.id);
      const isEnabled = isCoreModule || isConfigEnabled;
      
      console.log(`[ModuleRegistry] DEBUG: Module ${module.id} - core: ${isCoreModule}, configEnabled: ${isConfigEnabled}, finalEnabled: ${isEnabled}`);
      return isEnabled;
    });
    
    console.log('[ModuleRegistry] DEBUG: Final enabled modules:', enabledModules.map(m => m.id));
    return enabledModules;
  }

  // Get a specific module
  getModule(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId);
  }

  // Check if a module is enabled (based on config service and core modules)
  isModuleEnabled(moduleId: string): boolean {
    if (['dashboard', 'settings', 'reports'].includes(moduleId)) {
      return true;
    }
    return moduleConfigService.isModuleEnabled(moduleId);
  }

  // Get navigation items from all enabled modules
  getNavigationItems(): NavItem[] {
    let enabledModules = this.getEnabledModules();
    console.log('[ModuleRegistry] DEBUG: getNavigationItems() - enabled modules:', enabledModules.map(m => m.id));
    
    // Sort by MODULE_ORDER, then alphabetically for extras
    enabledModules = enabledModules.sort((a, b) => {
      const aIdx = MODULE_ORDER.indexOf(a.id);
      const bIdx = MODULE_ORDER.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      // Both not in MODULE_ORDER: sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    const navigationItems: NavItem[] = [];
    enabledModules.forEach(module => {
      console.log(`[ModuleRegistry] DEBUG: Processing navigation for module ${module.id}:`, {
        name: module.name,
        path: module.path,
        navigationChildren: module.navigation?.length || 0,
        isActive: this.isModuleEnabled(module.id)
      });
      
      const mainNavItem: NavItem = {
        name: module.name,
        path: module.path,
        icon: module.icon,
        isGroup: (module.navigation?.length || 0) > 0,
        modulePath: module.path,
        children: module.navigation || [],
        isActive: this.isModuleEnabled(module.id) // Use the updated isModuleEnabled
      };
      navigationItems.push(mainNavItem);
    });
    
    console.log('[ModuleRegistry] DEBUG: Final navigation items:', navigationItems.map(item => ({
      name: item.name,
      path: item.path,
      childrenCount: item.children?.length || 0,
      isActive: item.isActive
    })));
    
    return navigationItems;
  }

  // Get navigation items for a specific module
  getModuleNavigation(moduleId: string): NavItem[] {
    const module = this.modules.get(moduleId);
    return module ? module.navigation : [];
  }

  // Check module dependencies
  checkDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
    const module = this.modules.get(moduleId);
    if (!module || !module.dependencies) {
      return { satisfied: true, missing: [] };
    }

    const missing = module.dependencies.filter(dep => !this.isModuleEnabled(dep)); // Use the updated isModuleEnabled
    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  // Get modules by feature
  getModulesByFeature(feature: string): ModuleDefinition[] {
    return this.getEnabledModules().filter(module =>
      module.features?.includes(feature)
    );
  }

  // Get all available features
  getAllFeatures(): string[] {
    const features = new Set<string>();
    this.getEnabledModules().forEach(module => {
      module.features?.forEach(feature => features.add(feature));
    });
    return Array.from(features);
  }

  // Get settings for all modules
  getModuleSettings(): Array<{ moduleId: string; settings: ModuleDefinition['settings'] }> {
    return this.getEnabledModules()
      .filter(module => module.settings)
      .map(module => ({
        moduleId: module.id,
        settings: module.settings
      }));
  }
}

// Create singleton instance
export const moduleRegistry = new ModuleRegistry();

// Helper function to register modules from a module definition file
export const registerModuleFromDefinition = (moduleDefinition: ModuleDefinition): void => {
  moduleRegistry.registerModule(moduleDefinition);
};

// Helper function to get navigation items (for backward compatibility)
export const getNavigationItems = (): NavItem[] => {
  return moduleRegistry.getNavigationItems();
};

// Export the registry instance
export default moduleRegistry; 