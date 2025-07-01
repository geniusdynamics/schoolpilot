// ABOUTME: Custom hook for dynamic navigation management
// ABOUTME: Provides real-time navigation updates and module management

import { useState, useEffect, useCallback } from 'react';
import { NavItem } from '../core/types';
import { 
  getDynamicNavigationItems, 
  isModuleEnabled, 
  enableModule, 
  disableModule,
  getEnabledModules,
  checkModuleDependencies
} from '../core/moduleLoader';

export const useDynamicNavigation = () => {
  const [navigationItems, setNavigationItems] = useState<NavItem[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load navigation items
  const loadNavigationItems = useCallback(() => {
    setIsLoading(true);
    try {
      const items = getDynamicNavigationItems();
      setNavigationItems(items);
      
      // Get enabled module IDs
      const modules = getEnabledModules();
      setEnabledModules(modules.map(m => m.id));
    } catch (error) {
      console.error('Error loading navigation items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enable a module
  const enableModuleById = useCallback((moduleId: string) => {
    const success = enableModule(moduleId);
    if (success) {
      loadNavigationItems(); // Reload navigation
    }
    return success;
  }, [loadNavigationItems]);

  // Disable a module
  const disableModuleById = useCallback((moduleId: string) => {
    const success = disableModule(moduleId);
    if (success) {
      loadNavigationItems(); // Reload navigation
    }
    return success;
  }, [loadNavigationItems]);

  // Check if a module is enabled
  const checkModuleStatus = useCallback((moduleId: string) => {
    return isModuleEnabled(moduleId);
  }, []);

  // Check module dependencies
  const checkDependencies = useCallback((moduleId: string) => {
    return checkModuleDependencies(moduleId);
  }, []);

  // Get main modules (top-level groups)
  const getMainModules = useCallback(() => {
    return navigationItems.filter(item => item.isGroup);
  }, [navigationItems]);

  // Get sub-navigation for a specific module
  const getModuleNavigation = useCallback((moduleName: string) => {
    const module = navigationItems.find(item => item.name === moduleName && item.isGroup);
    return module?.children || [];
  }, [navigationItems]);

  // Search navigation items
  const searchNavigation = useCallback((query: string) => {
    if (!query.trim()) return navigationItems;

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

    searchInItems(navigationItems);
    return results;
  }, [navigationItems]);

  // Initialize on mount
  useEffect(() => {
    loadNavigationItems();
  }, [loadNavigationItems]);

  return {
    navigationItems,
    enabledModules,
    isLoading,
    getMainModules,
    getModuleNavigation,
    searchNavigation,
    enableModule: enableModuleById,
    disableModule: disableModuleById,
    isModuleEnabled: checkModuleStatus,
    checkDependencies,
    refresh: loadNavigationItems
  };
};

export default useDynamicNavigation; 