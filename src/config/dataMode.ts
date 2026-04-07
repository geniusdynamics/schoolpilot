/**
 * Data Mode Configuration
 * Data mode management, switching, validation, and state.
 */

// Re-export everything from dataModePolicies for convenience
export type {
  DataModeSwitchResult,
  DataModeState,
} from './dataModePolicies';

export {
  switchDataMode,
  validateDataMode,
  getDataModeState,
  getStoredDataMode,
} from './dataModePolicies';
