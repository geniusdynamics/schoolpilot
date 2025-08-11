/**
 * Data Mode Policies
 * Defines switching rules and validation logic for data modes
 */

import { DataMode, Environment, canSwitchDataModes, getAllowedDataModes, isValidDataMode } from './environmentMatrix';

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

// Storage key for data mode
const DATA_MODE_STORAGE_KEY = 'app_data_mode';
const DATA_MODE_TIMESTAMP_KEY = 'app_data_mode_timestamp';

// Get stored data mode
export const getStoredDataMode = (): DataMode | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(DATA_MODE_STORAGE_KEY);
    return stored as DataMode | null;
  } catch {
    return null;
  }
};

// Store data mode
const storeDataMode = (dataMode: DataMode): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(DATA_MODE_STORAGE_KEY, dataMode);
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
    // Store the new data mode
    storeDataMode(newMode);
    
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
    localStorage.removeItem(DATA_MODE_STORAGE_KEY);
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