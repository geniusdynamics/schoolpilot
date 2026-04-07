// ABOUTME: Custom hook for dynamic navigation management
// ABOUTME: Provides real-time navigation updates and module management

import { useState, useCallback, useEffect, useMemo } from 'react';
import { NavItem } from '@/core/types';
import { 
  getDynamicNavigationItems, 
  isModuleEnabled, 
  enableModule, 
  disableModule,
  getEnabledModules,
  checkModuleDependencies
} from '@/core/moduleLoader';
// Removed unused hook utilities import

// NOTE: getEnabledModules now always includes core modules (dashboard, settings, reports)
// so navigationItems will always include these regardless of config.

export const useDynamicNavigation = (autoLoad: boolean = true) => {
  const [navigationItems, setNavigationItems] = useState<NavItem[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize autoLoad to prevent unnecessary re-renders
  const stableAutoLoad = useMemo(() => autoLoad, [autoLoad]);

  // Load navigation items with stable implementation
  const loadNavigationItems = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const items = getDynamicNavigationItems();
      setNavigationItems(Array.isArray(items) ? items : []);
      console.log('[useDynamicNavigation] navigationItems:', items);
      
      // Get enabled module IDs
      const modules = getEnabledModules();
      setEnabledModules(modules.map(m => m.id));
      console.log('[useDynamicNavigation] enabledModules:', modules);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error loading navigation items');
      console.error('Error loading navigation items:', error);
      setError(error);
      // Provide fallback empty arrays to maintain hook stability
      setNavigationItems([]);
      setEnabledModules([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array since getDynamicNavigationItems and getEnabledModules are stable

  // Enable a module
  const enableModuleById = useCallback((moduleId: string) => {
    if (!moduleId || typeof moduleId !== 'string') {
      console.warn('[useDynamicNavigation] Invalid moduleId provided to enableModule:', moduleId);
      return false;
    }
    const success = enableModule(moduleId);
    if (success) {
      loadNavigationItems(); // Reload navigation
    }
    return success;
  }, [loadNavigationItems]);

  // Disable a module
  const disableModuleById = useCallback((moduleId: string) => {
    if (!moduleId || typeof moduleId !== 'string') {
      console.warn('[useDynamicNavigation] Invalid moduleId provided to disableModule:', moduleId);
      return false;
    }
    const success = disableModule(moduleId);
    if (success) {
      loadNavigationItems(); // Reload navigation
    }
    return success;
  }, [loadNavigationItems]);

  // Check if a module is enabled
  const checkModuleStatus = useCallback((moduleId: string) => {
    if (!moduleId || typeof moduleId !== 'string') {
      return false;
    }
    return isModuleEnabled(moduleId);
  }, []);

  // Check module dependencies
  const checkDependencies = useCallback((moduleId: string) => {
    return checkModuleDependencies(moduleId);
  }, []);

  // Memoize navigation items to prevent unnecessary recalculations
  const memoizedNavigationItems = useMemo(() => {
    try {
      return Array.isArray(navigationItems) ? navigationItems : [];
    } catch (err) {
      console.error('[useDynamicNavigation] Error memoizing navigation items:', err);
      return [];
    }
  }, [navigationItems]);
  const memoizedEnabledModules = useMemo(() => {
    return Array.isArray(enabledModules) ? enabledModules : [];
  }, [enabledModules]);

  // Get main modules (top-level groups) with stable memoization
  const getMainModules = useCallback(() => {
    return memoizedNavigationItems.filter(item => item.isGroup);
  }, [memoizedNavigationItems]);

  // Get sub-navigation for a specific module with stable memoization
  const getModuleNavigation = useCallback((moduleName: string) => {
    const module = memoizedNavigationItems.find(item => item.name === moduleName && item.isGroup);
    return module?.children || [];
  }, [memoizedNavigationItems]);

  // Search navigation items with stable memoization
  const searchNavigation = useCallback((query: string) => {
    if (!query.trim()) return memoizedNavigationItems;

    const searchTerm = query.toLowerCase();
    const results: NavItem[] = [];

    const searchInItems = (items: NavItem[]) => {
      items.forEach(item => {
        // Check if item name contains search term
        if (item.name.toLowerCase().includes(searchTerm)) {
          results.push(item);
        }

        // Search in children
        if (item.children) {
          searchInItems(item.children);
        }
      });
    };

    searchInItems(memoizedNavigationItems);
    return results;
  }, [memoizedNavigationItems]);

  // Initialize on mount with stable dependencies
  useEffect(() => {
    if (stableAutoLoad) {
      try {
        loadNavigationItems();
      } catch (err) {
        console.error('[useDynamicNavigation] Auto-load failed:', err);
      }
    }
  }, [stableAutoLoad, loadNavigationItems]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    navigationItems: memoizedNavigationItems,
    enabledModules: memoizedEnabledModules,
    isLoading,
    error,
    getMainModules,
    getModuleNavigation,
    searchNavigation,
    enableModule: enableModuleById,
    disableModule: disableModuleById,
    isModuleEnabled: checkModuleStatus,
    checkDependencies,
    refresh: loadNavigationItems
  }), [memoizedNavigationItems, memoizedEnabledModules, isLoading, error, getMainModules, getModuleNavigation, searchNavigation, enableModuleById, disableModuleById, checkModuleStatus, checkDependencies, loadNavigationItems]);
};

export default useDynamicNavigation;