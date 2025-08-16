// ABOUTME: Tabbed workspace manager for handling module navigation and tab creation
// ABOUTME: Ensures proper tab creation when switching between modules and pages

import React, { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabStore } from '../../stores/tabStore';
import { useDynamicNavigation } from '../../hooks/useDynamicNavigation';
import { extractModuleId } from '../../utils/moduleUtils';

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

  // Create or activate tab for the current route
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

      const { module, child } = navigationItem;
      const moduleId = extractModuleId(module.name);
      
      console.log('🔍 [TabbedWorkspaceManager] Found navigation item:', { moduleId, module, child });

      // Check if we already have a tab for this path
      const existingTab = tabs.find(tab => tab.path === location.pathname);
      
      if (existingTab) {
        // Activate existing tab
        console.log('✅ [TabbedWorkspaceManager] Activating existing tab:', existingTab.id);
        try {
          await activateTab(existingTab.id);
        } catch (error) {
          console.error('❌ [TabbedWorkspaceManager] Error activating tab:', error);
        }
        return;
      }

      // Determine if this is a module dashboard or a child page
      const isModuleDashboard = !child;
      // For module dashboards, use a more appropriate title
      let pageTitle = 'Dashboard';
      if (child) {
        pageTitle = child.name;
      } else if (module.name) {
        // Extract a readable name from the module name
        const moduleName = module.name.replace('navigation:', '').replace('.title', '');
        // Capitalize first letter
        pageTitle = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
      }
      
      console.log('🔍 [TabbedWorkspaceManager] Creating new tab:', { 
        isModuleDashboard, 
        pageTitle, 
        path: location.pathname,
        moduleId
      });

      try {
        // Create a new tab
        const newTabId = await createTab({
          title: pageTitle,
          module: moduleId,
          path: location.pathname,
          content: {
            type: 'component',
            component: 'DynamicPageComponent' // Placeholder, will be rendered by TabbedWorkspace
          },
          permissions: [], // Will be checked by ProtectedRoute
          canClose: true,
          pinned: false
        });
        
        console.log('✅ [TabbedWorkspaceManager] Created new tab:', newTabId);
      } catch (error) {
        console.error('❌ [TabbedWorkspaceManager] Error creating tab:', error);
      }
    } finally {
      // Reset processing flag after a short delay to ensure stability
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }
  }, [location.pathname, tabs, createTab, activateTab, findNavigationItemForPath]);

  // Handle route changes
  useEffect(() => {
    handleRouteChange();
  }, [handleRouteChange]);

  // Ensure we always have at least the dashboard tab
  useEffect(() => {
    if (tabs.length === 0 && !isProcessingRef.current) {
      console.log('🔍 [TabbedWorkspaceManager] No tabs found, creating initial dashboard tab');
      
      isProcessingRef.current = true;
      
      // Create initial dashboard tab
      createTab({
        title: 'Dashboard',
        module: 'dashboard',
        path: '/dashboard',
        content: {
          type: 'component',
          component: 'DashboardPage'
        },
        permissions: [],
        canClose: false, // Dashboard should not be closable
        pinned: true
      }).then(tabId => {
        console.log('✅ [TabbedWorkspaceManager] Created initial dashboard tab:', tabId);
        // Navigate to dashboard if not already there
        if (location.pathname !== '/dashboard') {
          navigate('/dashboard');
        }
      }).catch(error => {
        console.error('❌ [TabbedWorkspaceManager] Error creating initial dashboard tab:', error);
      }).finally(() => {
        // Reset processing flag after a short delay
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 100);
      });
    }
  }, [tabs.length, createTab, navigate, location.pathname]);

  return <>{children}</>;
};

export default TabbedWorkspaceManager;