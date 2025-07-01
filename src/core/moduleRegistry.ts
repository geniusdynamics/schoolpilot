// ABOUTME: Module registry system for dynamic module loading and navigation management
// ABOUTME: This system allows modules to be registered, enabled/disabled, and their navigation to be dynamically generated

import { ModuleDefinition, NavItem } from './types';
import { MODULE_ORDER } from '../moduleOrder';

// Module Registry Class
class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();
  private enabledModules: Set<string> = new Set();

  // Register a new module
  registerModule(module: ModuleDefinition): void {
    this.modules.set(module.id, module);
    if (module.isActive) {
      this.enabledModules.add(module.id);
    }
  }

  // Unregister a module
  unregisterModule(moduleId: string): void {
    this.modules.delete(moduleId);
    this.enabledModules.delete(moduleId);
  }

  // Enable a module
  enableModule(moduleId: string): boolean {
    const module = this.modules.get(moduleId);
    if (module) {
      this.enabledModules.add(moduleId);
      return true;
    }
    return false;
  }

  // Disable a module
  disableModule(moduleId: string): boolean {
    const module = this.modules.get(moduleId);
    if (module) {
      this.enabledModules.delete(moduleId);
      return true;
    }
    return false;
  }

  // Get all registered modules
  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  // Get enabled modules only
  getEnabledModules(): ModuleDefinition[] {
    return Array.from(this.modules.values()).filter(module => 
      this.enabledModules.has(module.id)
    );
  }

  // Get a specific module
  getModule(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId);
  }

  // Check if a module is enabled
  isModuleEnabled(moduleId: string): boolean {
    return this.enabledModules.has(moduleId);
  }

  // Get navigation items from all enabled modules
  getNavigationItems(): NavItem[] {
    let enabledModules = this.getEnabledModules();
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
      const mainNavItem: NavItem = {
        name: module.name,
        path: module.path,
        icon: module.icon,
        isGroup: module.navigation.length > 0,
        modulePath: module.path,
        children: module.navigation,
        isActive: module.isActive
      };
      navigationItems.push(mainNavItem);
    });
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

    const missing = module.dependencies.filter(dep => !this.enabledModules.has(dep));
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