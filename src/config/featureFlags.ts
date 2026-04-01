/**
 * Feature Flags Configuration
 * 
 * Controls rollout of new features for gradual migration.
 */

export interface FeatureFlags {
  /** Enable new URL-driven tab system */
  useNewTabSystem: boolean;
  
  /** Enable unified data service */
  useUnifiedDataService: boolean;
  
  /** Enable SQLite provider (standalone mode) */
  enableSQLiteProvider: boolean;
  
  /** Enable sync engine */
  enableSyncEngine: boolean;
  
  /** Enable ERPNext integration */
  enableERPNextIntegration: boolean;
  
  /** Enable mobile optimizations */
  enableMobileOptimizations: boolean;
}

// Default configuration
// CRITICAL: UDS and PouchDB are now ENABLED for data persistence
// This fixes CRIT-001: No Data Persistence
const defaultFlags: FeatureFlags = {
  useNewTabSystem: true,         // ENABLED: New tab system is stable
  useUnifiedDataService: true,   // ENABLED: Use real PouchDB provider instead of mock
  enableSQLiteProvider: false,   // Phase 2: SQLite OPFS alternative (optional)
  enableSyncEngine: false,       // Phase 2: Networked mode sync (requires CouchDB)
  enableERPNextIntegration: false, // Phase 3: ERPNext bridge
  enableMobileOptimizations: true  // ENABLED: Mobile responsiveness
};

// Load from localStorage (for development/testing)
function loadFlags(): FeatureFlags {
  try {
    if (typeof window === 'undefined') {
      return defaultFlags;
    }
    const stored = localStorage.getItem('sp_feature_flags');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultFlags, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load feature flags:', e);
  }
  return defaultFlags;
}

// Current flags
export const featureFlags = loadFlags();

// Helper to check if a feature is enabled
export function isEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

// Enable a feature (for testing)
export function enableFeature(flag: keyof FeatureFlags): void {
  featureFlags[flag] = true;
  saveFlags();
}

// Disable a feature
export function disableFeature(flag: keyof FeatureFlags): void {
  featureFlags[flag] = false;
  saveFlags();
}

// Toggle a feature
export function toggleFeature(flag: keyof FeatureFlags): boolean {
  featureFlags[flag] = !featureFlags[flag];
  saveFlags();
  return featureFlags[flag];
}

// Save flags to localStorage
function saveFlags(): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('sp_feature_flags', JSON.stringify(featureFlags));
  } catch (e) {
    console.warn('Failed to save feature flags:', e);
  }
}

// Reset to defaults
export function resetFlags(): void {
  Object.assign(featureFlags, defaultFlags);
  saveFlags();
}

// Development helper to enable all features
export function enableAllFeatures(): void {
  Object.keys(featureFlags).forEach(key => {
    (featureFlags as any)[key] = true;
  });
  saveFlags();
}

// Console helper for developers
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).featureFlags = {
    get: () => featureFlags,
    enable: enableFeature,
    disable: disableFeature,
    toggle: toggleFeature,
    reset: resetFlags,
    enableAll: enableAllFeatures
  };
  
  console.log('Feature flags available. Usage:');
  console.log('  featureFlags.get() - Show current flags');
  console.log('  featureFlags.enable("useNewTabSystem") - Enable new tabs');
  console.log('  featureFlags.toggle("useUnifiedDataService") - Toggle data service');
  console.log('  featureFlags.enableAll() - Enable all features (dev only)');
}
