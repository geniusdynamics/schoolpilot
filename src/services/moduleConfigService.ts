// ABOUTME: Service for managing dynamic module configuration and loading
// ABOUTME: Handles client-configurable module settings without code changes

import moduleConfig from '../config/modules.json';

export interface ModuleConfig {
  enabledModules: string[];
  disabledModules: string[];
  moduleSettings: Record<string, {
    enabled: boolean;
    required: boolean;
    description: string;
  }>;
  moduleDependencies: Record<string, string[]>;
}

export interface ModuleInfo {
  id: string;
  enabled: boolean;
  required: boolean;
  description: string;
  dependencies: string[];
  dependencySatisfied: boolean;
  missingDependencies: string[];
}

class ModuleConfigService {
  private config: ModuleConfig;

  constructor() {
    this.config = moduleConfig;
  }

  // Get all module configuration
  getConfig(): ModuleConfig {
    return this.config;
  }

  // Check if a module is enabled
  isModuleEnabled(moduleId: string): boolean {
    return this.config.enabledModules.includes(moduleId);
  }

  // Check if a module is required
  isModuleRequired(moduleId: string): boolean {
    return this.config.moduleSettings[moduleId]?.required || false;
  }

  // Get module dependencies
  getModuleDependencies(moduleId: string): string[] {
    return this.config.moduleDependencies[moduleId] || [];
  }

  // Check if module dependencies are satisfied
  checkDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
    const dependencies = this.getModuleDependencies(moduleId);
    const missing = dependencies.filter(dep => !this.isModuleEnabled(dep));
    
    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  // Get all module information
  getAllModuleInfo(): ModuleInfo[] {
    const allModules = Object.keys(this.config.moduleSettings);
    
    return allModules.map(moduleId => {
      const dependencies = this.getModuleDependencies(moduleId);
      const { satisfied, missing } = this.checkDependencies(moduleId);
      
      return {
        id: moduleId,
        enabled: this.isModuleEnabled(moduleId),
        required: this.isModuleRequired(moduleId),
        description: this.config.moduleSettings[moduleId]?.description || '',
        dependencies,
        dependencySatisfied: satisfied,
        missingDependencies: missing
      };
    });
  }

  // Enable a module
  enableModule(moduleId: string): boolean {
    if (!this.config.moduleSettings[moduleId]) {
      console.warn(`Module ${moduleId} not found in configuration`);
      return false;
    }

    // Check dependencies
    const { satisfied, missing } = this.checkDependencies(moduleId);
    if (!satisfied) {
      console.warn(`Cannot enable ${moduleId}: missing dependencies: ${missing.join(', ')}`);
      return false;
    }

    if (!this.isModuleEnabled(moduleId)) {
      this.config.enabledModules.push(moduleId);
      this.config.disabledModules = this.config.disabledModules.filter(id => id !== moduleId);
    }

    return true;
  }

  // Disable a module
  disableModule(moduleId: string): boolean {
    if (this.isModuleRequired(moduleId)) {
      console.warn(`Cannot disable required module: ${moduleId}`);
      return false;
    }

    // Check if other enabled modules depend on this one
    const dependentModules = Object.entries(this.config.moduleDependencies)
      .filter(([_, deps]) => deps.includes(moduleId))
      .map(([id, _]) => id)
      .filter(id => this.isModuleEnabled(id));

    if (dependentModules.length > 0) {
      console.warn(`Cannot disable ${moduleId}: other modules depend on it: ${dependentModules.join(', ')}`);
      return false;
    }

    this.config.enabledModules = this.config.enabledModules.filter(id => id !== moduleId);
    if (!this.config.disabledModules.includes(moduleId)) {
      this.config.disabledModules.push(moduleId);
    }

    return true;
  }

  // Get enabled modules only
  getEnabledModules(): string[] {
    return this.config.enabledModules;
  }

  // Get disabled modules only
  getDisabledModules(): string[] {
    return this.config.disabledModules;
  }

  // Validate configuration
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allModules = Object.keys(this.config.moduleSettings);

    // Check for invalid enabled modules
    const invalidEnabled = this.config.enabledModules.filter(id => !allModules.includes(id));
    if (invalidEnabled.length > 0) {
      errors.push(`Invalid enabled modules: ${invalidEnabled.join(', ')}`);
    }

    // Check for invalid disabled modules
    const invalidDisabled = this.config.disabledModules.filter(id => !allModules.includes(id));
    if (invalidDisabled.length > 0) {
      errors.push(`Invalid disabled modules: ${invalidDisabled.join(', ')}`);
    }

    // Check dependencies
    for (const moduleId of this.config.enabledModules) {
      const { satisfied, missing } = this.checkDependencies(moduleId);
      if (!satisfied) {
        errors.push(`Module ${moduleId} has unsatisfied dependencies: ${missing.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const moduleConfigService = new ModuleConfigService();
export default moduleConfigService; 