// ABOUTME: Data mode switching rules and validation for the unified configuration.
// ABOUTME: dataMode itself is persisted only in the unified config key; this module derives it from there.

/**
 * Data Mode Policies
 * Defines switching rules and validation logic for data modes
 */

import { DataMode, Environment, canSwitchDataModes, getAllowedDataModes, isValidDataMode } from './environmentMatrix';
import { CONFIG_STORAGE_KEY } from './core';

// Data Mode Switch Result
export interface DataModeSwitchResult {
  success: boolean;
  previousMode: DataMode;
  newMode: DataMode;
  requiresReload: boolean;
  message?: string;
  error?: string;
}

// Data Mode State
export interface DataModeState {
  current: DataMode;
  available: DataMode[];
  canSwitch: boolean;
  requiresConfirmation: boolean;
  lastSwitched?: Date;
}

// Legacy key that used to hold dataMode separately from the unified config.
// It is only read once to migrate old installations, then removed.
export const LEGACY_DATA_MODE_STORAGE_KEY = 'app_data_mode';
const DATA_MODE_TIMESTAMP_KEY = 'app_data_mode_timestamp';

const isDataMode = (value: unknown): value is DataMode => value === 'demo' || value === 'production';

// Get stored data mode, derived from the unified configuration key
export const getStoredDataMode = (): DataMode | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    const dataMode = parsed && typeof parsed === 'object' ? (parsed as { dataMode?: unknown }).dataMode : undefined;
    return isDataMode(dataMode) ? dataMode : null;
  } catch {
    return null;
  }
};

// Read and remove the legacy dataMode key. Returns its value when it was a valid data mode.
export const takeLegacyDataMode = (): DataMode | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const legacy = localStorage.getItem(LEGACY_DATA_MODE_STORAGE_KEY);
    if (legacy === null) return null;
    localStorage.removeItem(LEGACY_DATA_MODE_STORAGE_KEY);
    return isDataMode(legacy) ? legacy : null;
  } catch {
    return null;
  }
};

// Remove the legacy dataMode key so the unified config key stays the only one holding dataMode.
export const removeLegacyDataMode = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(LEGACY_DATA_MODE_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};

// Record when the data mode was switched. The mode itself is persisted by the unified config manager.
const recordDataModeSwitch = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(DATA_MODE_TIMESTAMP_KEY, new Date().toISOString());
  } catch {
    // Ignore storage errors
  }
};

// Get data mode state
export const getDataModeState = (currentMode: DataMode, environment: Environment): DataModeState => {
  const available = getAllowedDataModes(environment);
  const canSwitch = canSwitchDataModes(environment);
  
  let lastSwitched: Date | undefined;
  if (typeof window !== 'undefined') {
    try {
      const timestamp = localStorage.getItem(DATA_MODE_TIMESTAMP_KEY);
      if (timestamp) {
        lastSwitched = new Date(timestamp);
      }
    } catch {
      // Ignore errors
    }
  }
  
  return {
    current: currentMode,
    available,
    canSwitch,
    requiresConfirmation: environment === 'production' || environment === 'staging',
    lastSwitched,
  };
};

// Validate data mode switch
export const validateDataMode = (newMode: DataMode, environment: Environment): { valid: boolean; error?: string } => {
  // Check if the new mode is valid for the environment
  if (!isValidDataMode(newMode, environment)) {
    return {
      valid: false,
      error: `Data mode '${newMode}' is not allowed in '${environment}' environment`,
    };
  }
  
  // Check if switching is allowed
  if (!canSwitchDataModes(environment)) {
    return {
      valid: false,
      error: `Data mode switching is not allowed in '${environment}' environment`,
    };
  }
  
  return { valid: true };
};

// Switch data mode
export const switchDataMode = async (
  newMode: DataMode,
  currentMode: DataMode,
  environment: Environment,
  options: {
    skipConfirmation?: boolean;
    skipValidation?: boolean;
  } = {}
): Promise<DataModeSwitchResult> => {
  const { skipConfirmation = false, skipValidation = false } = options;
  
  // Validate the switch if not skipped
  if (!skipValidation) {
    const validation = validateDataMode(newMode, environment);
    if (!validation.valid) {
      return {
        success: false,
        previousMode: currentMode,
        newMode,
        requiresReload: false,
        error: validation.error,
      };
    }
  }
  
  // Check if confirmation is required
  const requiresConfirmation = environment === 'production' || environment === 'staging';
  if (requiresConfirmation && !skipConfirmation) {
    // In a real implementation, this would show a confirmation dialog
    // For now, we'll assume confirmation is given
  }
  
  try {
    // Record the switch; the caller persists the new mode in the unified config
    recordDataModeSwitch();
    
    // Determine if reload is required
    const requiresReload = currentMode !== newMode;
    
    return {
      success: true,
      previousMode: currentMode,
      newMode,
      requiresReload,
      message: `Successfully switched from '${currentMode}' to '${newMode}' mode`,
    };
  } catch (error) {
    return {
      success: false,
      previousMode: currentMode,
      newMode,
      requiresReload: false,
      error: `Failed to switch data mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// Clear stored data mode
export const clearStoredDataMode = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(LEGACY_DATA_MODE_STORAGE_KEY);
    localStorage.removeItem(DATA_MODE_TIMESTAMP_KEY);
  } catch {
    // Ignore storage errors
  }
};

// Get data mode history (simplified)
export const getDataModeHistory = (): { mode: DataMode; timestamp: Date }[] => {
  // In a real implementation, this would return a history of mode switches
  // For now, return current mode if available
  const current = getStoredDataMode();
  const timestamp = typeof window !== 'undefined' ? localStorage.getItem(DATA_MODE_TIMESTAMP_KEY) : null;
  
  if (current && timestamp) {
    return [{ mode: current, timestamp: new Date(timestamp) }];
  }
  
  return [];
};