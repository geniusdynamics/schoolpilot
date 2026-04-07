// ABOUTME: Configuration for tabbed mode feature flags
// ABOUTME: Controls which modules have tabbed mode enabled

import { TabbedModeConfig } from '../services/ui/tabbedModeFeatureFlag';

// Default tabbed mode configuration
export const defaultTabbedModeConfig: TabbedModeConfig = {
  // Global enable/disable for tabbed mode
  globalEnabled: true,
  
  // Enable per-module control
  enablePerModuleControl: true,
  
  // Global default for tabbed mode (when per-module control is disabled)
  enableTabbedMode: true,
  
  // Module-specific overrides
  // true = enable tabbed mode, false = use traditional navigation
  moduleOverrides: {
    // Core modules - enable tabbed mode
    'dashboard': true,
    'settings': true,
    'reports': true,
    
    // Academic modules - enable tabbed mode gradually
    'academics': false, // Disabled for now, enable after testing
    'administration': false, // Disabled for now
    'finance': false, // Disabled for now
    'hr': false, // Disabled for now
    'inventory': false, // Disabled for now
    'library': false, // Disabled for now
    'nutrition': false, // Disabled for now
    'admissions': false, // Disabled for now
    
    // Additional modules
    'audit': false, // Disabled for now
  }
};

// Development/testing configuration
export const devTabbedModeConfig: TabbedModeConfig = {
  globalEnabled: true,
  enablePerModuleControl: true,
  enableTabbedMode: true,
  moduleOverrides: {
    // Enable all modules in development for testing
    'dashboard': true,
    'settings': true,
    'reports': true,
    'academics': true,
    'administration': true,
    'finance': true,
    'hr': true,
    'inventory': true,
    'library': true,
    'nutrition': true,
    'admissions': true,
    'audit': true,
  }
};

// Production configuration - conservative rollout
export const prodTabbedModeConfig: TabbedModeConfig = {
  globalEnabled: true,
  enablePerModuleControl: true,
  enableTabbedMode: true,
  moduleOverrides: {
    // Start with core modules only
    'dashboard': true,
    'settings': true,
    'reports': true,
    
    // Gradually enable others after testing
    'academics': false,
    'administration': false,
    'finance': false,
    'hr': false,
    'inventory': false,
    'library': false,
    'nutrition': false,
    'admissions': false,
    'audit': false,
  }
};

export default defaultTabbedModeConfig;