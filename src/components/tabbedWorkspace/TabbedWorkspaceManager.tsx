// ABOUTME: Tabbed workspace manager for handling module navigation and tab creation
// ABOUTME: Ensures proper tab creation when switching between modules and pages
// ABOUTME: Enhanced with TabStateManager for improved module dashboard detection and platform adaptation

import React, { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabStore } from '../../stores/tabStore';
import { useDynamicNavigation } from '../../hooks/useDynamicNavigation';
import { extractModuleId } from '../../utils/moduleUtils';
import { TabStateManager, defaultTabStateConfig } from '../../services/TabStateManager';

interface TabbedWorkspaceManagerProps {
  children: React.ReactNode;
}

export const TabbedWorkspaceManager: React.FC<TabbedWorkspaceManagerProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { navigationItems } = useDynamicNavigation(true);
  
  const {
    tabs,
    activeTabId,
    createTab,
    activateTab,
    getTabById
  } = useTabStore();
  
  // Refs to prevent infinite loops
  const previousPathRef = useRef<string>(location.pathname);
  const isProcessingRef = useRef<boolean>(false);
  
  // Initialize TabStateManager
  const tabStateManager = useRef<TabStateManager>(new TabStateManager(defaultTabStateConfig));
  
  // Initialize TabStateManager with store reference
  useEffect(() => {
    tabStateManager.current.setStore({ tabs, createTab, activateTab, closeTab: (id: string) => {} });
    
    // Set platform information for adaptive behavior
    const platform = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'web' : 'desktop';
    const touchDevice = 'ontouchstart' in window;
    tabStateManager.current.setPlatformInfo({ platform, touchDevice });
    
    console.log('🔧 [TabbedWorkspaceManager] TabStateManager initialized for platform:', platform);
  }, [tabs, createTab, activateTab]);

  // Find the module and navigation item for the current path
  const findNavigationItemForPath = useCallback((path: string) => {
    for (const module of navigationItems) {
      // Check if this is the module's main path (dashboard)
      if (module.path === path) {
        return { module, child: null };
      }
      
      if (module.children) {
        for (const child of module.children) {
          if (child.path === path) {
            return { module, child };
          }
        }
      }
    }
    return null;
  }, [navigationItems]);

  // Create or activate tab for the current route using TabStateManager
  const handleRouteChange = useCallback(async () => {
    // Prevent infinite loops
    if (isProcessingRef.current || previousPathRef.current === location.pathname) {
      return;
    }
    
    isProcessingRef.current = true;
    previousPathRef.current = location.pathname;
    
    try {
      console.log('🔍 [TabbedWorkspaceManager] Handling route change to:', location.pathname);
      
      const navigationItem = findNavigationItemForPath(location.pathname);
      
      if (!navigationItem) {
        console.warn('⚠️ [TabbedWorkspaceManager] No navigation item found for path:', location.pathname);
        return;
      }

      console.log('🔍 [TabbedWorkspaceManager] Found navigation item:', navigationItem);

      // Use TabStateManager for enhanced tab creation with proper dashboard detection
      const result = await tabStateManager.current.createModuleTab(navigationItem, location);
      
      if (result.action === 'created') {
        console.log('✅ [TabbedWorkspaceManager] Created new tab via TabStateManager:', result.tabId);
      } else if (result.action === 'activated') {
        console.log('✅ [TabbedWorkspaceManager] Activated existing tab via TabStateManager:', result.tabId);
      } else if (result.action === 'error') {
        console.error('❌ [TabbedWorkspaceManager] Error from TabStateManager:', result.message);
      }
      
    } finally {
      // Reset processing flag after a short delay to ensure stability
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }
  }, [location.pathname, tabs, findNavigationItemForPath]);

  // Handle route changes
  useEffect(() => {
    handleRouteChange();
  }, [handleRouteChange]);

  // Log tab statistics periodically for debugging
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = tabStateManager.current.getTabStatistics();
      console.log('📊 [TabbedWorkspaceManager] Tab Statistics:', stats);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
};

export default TabbedWorkspaceManager;