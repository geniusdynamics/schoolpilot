// ABOUTME: Feature flag service for controlling tabbed mode per module
// ABOUTME: Allows gradual rollout of tabbed mode functionality

import { getCurrentUnifiedConfig } from '@/config/unifiedConfig';

export interface TabbedModeConfig {
  // Global enable/disable
  globalEnabled: boolean;
  
  // Module-specific overrides
  moduleOverrides: Record<string, boolean>;
  
  // Feature-specific flags
  enableTabbedMode: boolean;
  enablePerModuleControl: boolean;
}

class TabbedModeFeatureFlag {
  private config: TabbedModeConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  // Load configuration from unified config
  private loadConfig(): TabbedModeConfig {
    try {
      console.log('TabbedModeFeatureFlag: Loading configuration...');
      const unifiedConfig = getCurrentUnifiedConfig();
      console.log('TabbedModeFeatureFlag: Unified config:', unifiedConfig);
      
      const config = {
        globalEnabled: unifiedConfig.features?.enableTabbedMode ?? false,
        moduleOverrides: unifiedConfig.features?.tabbedModeModuleOverrides || {},
        enableTabbedMode: unifiedConfig.features?.enableTabbedMode ?? false,
        enablePerModuleControl: unifiedConfig.features?.enablePerModuleControl ?? false
      };
      
      console.log('TabbedModeFeatureFlag: Loaded config:', config);
      return config;
    } catch (error) {
      console.warn('Failed to load tabbed mode config, using defaults:', error);
      
      return {
        globalEnabled: false,
        moduleOverrides: {},
        enableTabbedMode: false,
        enablePerModuleControl: false
      };
    }
  }
  
  // Check if tabbed mode is enabled for a specific module
  public isTabbedModeEnabled(moduleId: string): boolean {
    // If global flag is disabled, tabbed mode is off everywhere
    if (!this.config.globalEnabled) {
      return false;
    }
    
    // If per-module control is disabled, use global setting
    if (!this.config.enablePerModuleControl) {
      return this.config.enableTabbedMode;
    }
    
    // Check for module-specific override
    if (moduleId in this.config.moduleOverrides) {
      return this.config.moduleOverrides[moduleId];
    }
    
    // Default to global setting if no override
    return this.config.enableTabbedMode;
  }
  
  // Check if tabbed mode is globally enabled
  public isGloballyEnabled(): boolean {
    return this.config.globalEnabled && this.config.enableTabbedMode;
  }
  
  // Get all module overrides
  public getModuleOverrides(): Record<string, boolean> {
    return { ...this.config.moduleOverrides };
  }
  
  // Check if per-module control is enabled
  public isPerModuleControlEnabled(): boolean {
    return this.config.enablePerModuleControl;
  }
  
  // Force enable tabbed mode for testing
  public forceEnable(): void {
    this.config.globalEnabled = true;
    this.config.enableTabbedMode = true;
  }
  
  // Force disable tabbed mode for testing
  public forceDisable(): void {
    this.config.globalEnabled = false;
    this.config.enableTabbedMode = false;
  }
  
  // Update configuration (for runtime changes)
  public updateConfig(newConfig: Partial<TabbedModeConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
  
  // Reset to default configuration
  public resetConfig(): void {
    this.config = this.loadConfig();
  }
  
  // Update module override
  public setModuleOverride(moduleId: string, enabled: boolean): void {
    this.config.moduleOverrides[moduleId] = enabled;
  }
  
  // Remove module override (will use global setting)
  public removeModuleOverride(moduleId: string): void {
    delete this.config.moduleOverrides[moduleId];
  }
}

// Create singleton instance
export const tabbedModeFeatureFlag = new TabbedModeFeatureFlag();

// Convenience functions
export const isTabbedModeEnabled = (moduleId: string = 'global'): boolean => {
  return tabbedModeFeatureFlag.isTabbedModeEnabled(moduleId);
};

export const isTabbedModeGloballyEnabled = (): boolean => {
  return tabbedModeFeatureFlag.isGloballyEnabled();
};

export const getTabbedModeModuleOverrides = (): Record<string, boolean> => {
  return tabbedModeFeatureFlag.getModuleOverrides();
};

export const isPerModuleControlEnabled = (): boolean => {
  return tabbedModeFeatureFlag.isPerModuleControlEnabled();
};

// Runtime configuration functions
export const setTabbedModeModuleOverride = (moduleId: string, enabled: boolean): void => {
  tabbedModeFeatureFlag.setModuleOverride(moduleId, enabled);
};

export const removeTabbedModeModuleOverride = (moduleId: string): void => {
  tabbedModeFeatureFlag.removeModuleOverride(moduleId);
};

export const updateTabbedModeConfig = (newConfig: Partial<TabbedModeConfig>): void => {
  tabbedModeFeatureFlag.updateConfig(newConfig);
};

export default tabbedModeFeatureFlag;