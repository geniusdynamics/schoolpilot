import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

const defaultFlags: FeatureFlags = {
  useNewTabSystem: true,
  useUnifiedDataService: true,
  enableSQLiteProvider: false,
  enableSyncEngine: false,
  enableERPNextIntegration: false,
  enableMobileOptimizations: true
};

export interface FeatureFlagStore {
  flags: FeatureFlags;
  isEnabled: (flag: keyof FeatureFlags) => boolean;
  enableFeature: (flag: keyof FeatureFlags) => void;
  disableFeature: (flag: keyof FeatureFlags) => void;
  toggleFeature: (flag: keyof FeatureFlags) => void;
  resetFlags: () => void;
  enableAllFeatures: () => void;
}

export const useFeatureFlagStore = create<FeatureFlagStore>()(
  persist(
    (set, get) => ({
      flags: { ...defaultFlags },
      
      isEnabled: (flag) => {
        return get().flags[flag] ?? false;
      },
      
      enableFeature: (flag) => 
        set((state) => ({ flags: { ...state.flags, [flag]: true } })),
        
      disableFeature: (flag) => 
        set((state) => ({ flags: { ...state.flags, [flag]: false } })),
        
      toggleFeature: (flag) => 
        set((state) => ({ flags: { ...state.flags, [flag]: !state.flags[flag] } })),
        
      resetFlags: () => 
        set({ flags: { ...defaultFlags } }),
        
      enableAllFeatures: () => 
        set((state) => {
          const allEnabled = { ...state.flags };
          (Object.keys(allEnabled) as Array<keyof FeatureFlags>).forEach(key => {
            allEnabled[key] = true;
          });
          return { flags: allEnabled };
        }),
    }),
    {
      name: 'sp_feature_flags_store',
      storage: createJSONStorage(() => localStorage),
      version: 1, // Add versioning for future expiration/cleanup logic
    }
  )
);

// Console helper for developers
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).featureFlags = {
    get: () => useFeatureFlagStore.getState().flags,
    enable: useFeatureFlagStore.getState().enableFeature,
    disable: useFeatureFlagStore.getState().disableFeature,
    toggle: useFeatureFlagStore.getState().toggleFeature,
    reset: useFeatureFlagStore.getState().resetFlags,
    enableAll: useFeatureFlagStore.getState().enableAllFeatures
  };
}
