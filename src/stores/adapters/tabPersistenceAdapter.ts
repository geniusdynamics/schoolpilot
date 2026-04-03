// ABOUTME: Zustand storage adapter for TabPersistenceService
// ABOUTME: Bridges Zustand persist middleware with TabPersistenceService for enhanced persistence

import { StateStorage } from 'zustand/middleware';
import { tabPersistenceService } from '../../services/tabs/TabPersistenceService';
import { Tab } from '../../types/tabbedWorkspace';

/**
 * Interface for persisted tab state
 * Matches the structure expected by Zustand persist middleware
 */
interface PersistedTabState {
  tabs: Tab[];
  pinnedTabs: string[];
  recentlyClosedTabs: Tab[];
  maxTabs: number;
  tabGroups: Record<string, any>;
}

/**
 * TabPersistenceAdapter - Storage adapter for Zustand persist middleware
 * 
 * Provides integration between Zustand's persist middleware and TabPersistenceService,
 * enabling advanced persistence features like IndexedDB fallback, schema versioning,
 * and better error handling.
 * 
 * Features:
 * - Automatic fallback from IndexedDB to localStorage
 * - Schema versioning for data migration
 * - Better error handling and recovery
 * 
 * Note: Currently wraps TabPersistenceService which handles Tab[] arrays.
 * Additional state (pinnedTabs, recentlyClosedTabs, etc.) is stored separately in localStorage.
 * 
 * @example
 * ```typescript
 * import { tabPersistenceAdapter } from './adapters/tabPersistenceAdapter';
 * 
 * persist(
 *   (set, get) => ({ ... }),
 *   {
 *     name: 'tabbed-workspace-storage',
 *     storage: tabPersistenceAdapter,
 *     // ... other options
 *   }
 * )
 * ```
 */
export const tabPersistenceAdapter: StateStorage = {
  /**
   * Load persisted state from storage
   * 
   * @param name - Storage key name
   * @returns Serialized state string or null if no data exists
   */
  getItem: async (name: string): Promise<string | null> => {
    try {
      console.log('[TabPersistenceAdapter] Loading tabs from persistence service...');
      
      // Load tabs from TabPersistenceService (uses IndexedDB with localStorage fallback)
      const tabs = await tabPersistenceService.loadTabs();
      
      // Load additional state from localStorage
      const additionalStateKey = `${name}_additional`;
      const additionalStateStr = localStorage.getItem(additionalStateKey);
      let additionalState: Partial<PersistedTabState> = {};
      
      if (additionalStateStr) {
        try {
          additionalState = JSON.parse(additionalStateStr);
        } catch (e) {
          console.warn('[TabPersistenceAdapter] Failed to parse additional state, using defaults');
        }
      }

      // Combine tabs from service with additional state
      const zustandState: PersistedTabState = {
        tabs: tabs || [],
        pinnedTabs: additionalState.pinnedTabs || [],
        recentlyClosedTabs: additionalState.recentlyClosedTabs || [],
        maxTabs: additionalState.maxTabs || 15,
        tabGroups: additionalState.tabGroups || {}
      };

      console.log(`[TabPersistenceAdapter] Loaded ${zustandState.tabs.length} tabs`);
      
      // Zustand expects the state wrapped in a 'state' property
      return JSON.stringify({ state: zustandState });
    } catch (error) {
      console.error('[TabPersistenceAdapter] Error loading tabs:', error);
      return null;
    }
  },

  /**
   * Save state to storage
   * 
   * @param name - Storage key name
   * @param value - Serialized state string
   */
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      const state = parsed.state as PersistedTabState;

      console.log(`[TabPersistenceAdapter] Saving ${state.tabs?.length || 0} tabs...`);

      // Save tabs using TabPersistenceService (uses IndexedDB with localStorage fallback)
      await tabPersistenceService.saveTabs(state.tabs || []);

      // Save additional state to localStorage
      const additionalState = {
        pinnedTabs: state.pinnedTabs || [],
        recentlyClosedTabs: state.recentlyClosedTabs || [],
        maxTabs: state.maxTabs || 15,
        tabGroups: state.tabGroups || {}
      };
      
      const additionalStateKey = `${name}_additional`;
      localStorage.setItem(additionalStateKey, JSON.stringify(additionalState));

      console.log('[TabPersistenceAdapter] Tabs saved successfully');
    } catch (error) {
      console.error('[TabPersistenceAdapter] Error saving tabs:', error);
      // Don't throw - let the app continue even if persistence fails
      // The service will handle fallback to localStorage
    }
  },

  /**
   * Clear all persisted state
   * 
   * @param name - Storage key name
   */
  removeItem: async (name: string): Promise<void> => {
    try {
      console.log('[TabPersistenceAdapter] Clearing all persisted tabs...');
      
      // Clear tabs from TabPersistenceService
      await tabPersistenceService.clearTabs();
      
      // Clear additional state from localStorage
      const additionalStateKey = `${name}_additional`;
      localStorage.removeItem(additionalStateKey);
      
      console.log('[TabPersistenceAdapter] Tabs cleared successfully');
    } catch (error) {
      console.error('[TabPersistenceAdapter] Error clearing tabs:', error);
      // Don't throw - let the app continue
    }
  }
};
