/**
 * Config index
 * Central re-export point for all configuration modules.
 */

// Core — environment detection, base types, constants
export * from './core';

// Features — feature flags, defaults, presets
export * from './features';

// Data mode — mode switching, validation, state
export * from './dataMode';

// Unified orchestrator — re-exports configManager + adds backward-compat utility functions
// Note: unifiedConfig.ts re-exports configManager, so we only need unifiedConfig here
export * from './unifiedConfig';
