/**
 * Layout Component (New)
 * 
 * Updated layout component using URL-driven tab system.
 * This replaces the old Layout.tsx once fully tested.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '../core/types';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useAuth } from '../contexts/AuthContext';
import { useTabs } from '../hooks/tabs';
import type { Tab } from '../services/tabs/types';
import Header from './Header';
import PrimarySidebar from './PrimarySidebar';
import SecondarySidebar from './SecondarySidebar';
import LoadingScreen from './LoadingScreen';
import SettingsPopup from './SettingsPopup';
import { TabBar } from './tabbedWorkspace/TabBar';
import { TabWorkspaceErrorBoundary } from './tabbedWorkspace/TabWorkspaceErrorBoundary';

// Props for Layout
interface LayoutProps {
  children?: React.ReactNode;
}

const normalizeModuleId = (value?: string): string => {
  if (!value) return '';
  if (value.startsWith('/')) {
    return value.replace(/^\/+/, '').split('/')[0] || '';
  }
  return value.replace('navigation:', '').replace('.title', '').split('.')[0] || '';
};

const routeModuleId = (path?: string): string => {
  if (!path) return '';
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return trimmed.split('/')[0] || '';
};

const flattenNavigationItems = (items: NavItem[]): NavItem[] => {
  return items.flatMap(item => [item, ...(item.children ? flattenNavigationItems(item.children) : [])]);
};

const normalizeRoutePath = (path?: string): string => {
  if (!path) return '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const [pathname] = normalized.split('?');
  return pathname.replace(/\/+$/, '') || '/';
};

const LayoutNew: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { hasModuleAccess, hasPermission } = useAuth();
  const { getMainModules, isLoading: navLoading, navigationItems } = useDynamicNavigation(true);
  
  // New tab system
  const {
    tabs: urlTabs,
    activeTab,
    activeTabId,
    activateTab,
    closeTab,
    reorderTabs,
    pinTab,
    unpinTab,
    openTab,
    switchModuleSession,
    closeOtherTabs,
    closeTabsToRight,
    closeTabsToLeft,
    closeAllTabs,
    closeAllExceptPinned,
    duplicateTab
  } = useTabs();
  
  // Transform URL-driven tabs to format expected by TabBar component
  const tabs = useMemo(() => {
    return urlTabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      path: tab.url, // Map url to path for compatibility
      module: tab.module,
      icon: tab.icon,
      pinned: tab.pinned,
      isDirty: tab.isDirty,
      canClose: !tab.pinned, // Can close if not pinned
      lastAccessed: tab.metadata?.lastAccessed || Date.now(),
      metadata: tab.metadata || {}
    }));
  }, [urlTabs]);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModuleKey, setSelectedModuleKey] = useState('');
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const moduleDashboardRoute = useCallback((moduleId: string) => {
    const modules = getMainModules();
    const selectedModule = modules.find(module => normalizeModuleId(module.modulePath || module.path || module.name) === moduleId);
    const preferredChild = selectedModule?.children?.find(child => child.path?.includes('/dashboard'));
    const firstChildPath = selectedModule?.children?.find(child => !!child.path)?.path;
    const moduleBasePath = selectedModule?.modulePath || selectedModule?.path || `/${moduleId}`;
    const fallbackDashboardPath = moduleId === 'dashboard'
      ? '/dashboard'
      : `${moduleBasePath.replace(/\/$/, '')}/dashboard`;

    return preferredChild?.path || firstChildPath || fallbackDashboardPath;
  }, [getMainModules]);

  const canRestorePinnedTab = useCallback(async (tab: Tab) => {
    const moduleId = routeModuleId(tab.url);
    if (!moduleId) {
      return false;
    }

    const canAccessModule = await hasModuleAccess(moduleId);
    if (!canAccessModule) {
      return false;
    }

    const normalizedTabPath = normalizeRoutePath(tab.url);
    const matchingNavItem = flattenNavigationItems(navigationItems).find(item => {
      const itemPath = normalizeRoutePath(item.path);
      return itemPath === normalizedTabPath || normalizedTabPath.startsWith(`${itemPath}/`);
    });
    const requiredPermissions = matchingNavItem?.permissions || [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const permissionChecks = await Promise.all(requiredPermissions.map(permission => hasPermission(permission)));
    return permissionChecks.every(Boolean);
  }, [hasModuleAccess, hasPermission, navigationItems]);

  const transitionToModule = useCallback(async (moduleId: string) => {
    const nextRoute = moduleDashboardRoute(moduleId);
    const canAccessModule = await hasModuleAccess(moduleId);

    if (!canAccessModule) {
      return;
    }

    setSelectedModuleKey(moduleId);
    setIsSubmenuOpen(true);
    await switchModuleSession(nextRoute, {
      preservePinned: true,
      refresh: true,
      pinned: moduleId === 'dashboard',
      canPreserveTab: canRestorePinnedTab
    });
  }, [canRestorePinnedTab, hasModuleAccess, moduleDashboardRoute, switchModuleSession]);
  
  // Initialize - create a tab for current route if not exists
  useEffect(() => {
    if (!navLoading && tabs.length === 0) {
      // Create initial tab for current route
      const currentPath = location.pathname + location.search;
      if (currentPath !== '/') {
        openTab(currentPath, { pinned: location.pathname === '/dashboard' });
      }
    }
  }, [navLoading, location.pathname, location.search, tabs.length, openTab]);
  
  // Determine current module from URL
  useEffect(() => {
    if (!navLoading) {
      const path = location.pathname;
      const moduleMatch = path.match(/^\/([^\/]+)/);
      if (moduleMatch && moduleMatch[1]) {
        const moduleId = normalizeModuleId(moduleMatch[1]);
        setSelectedModuleKey(moduleId);
        
        // Auto-open submenu if we have a valid module
        const mainModules = getMainModules();
        const hasModule = mainModules.some(m => normalizeModuleId(m.modulePath || m.path || m.name) === moduleId);
        if (hasModule) {
          setIsSubmenuOpen(true);
        }
      }
      setIsReady(true);
    }
  }, [navLoading, location.pathname, getMainModules]);
  
  // Handle module selection from sidebar
  const handleModuleSelect = useCallback(async (moduleKey: string) => {
    const moduleId = normalizeModuleId(moduleKey);
    if (!moduleId) {
      return;
    }

    if (moduleId === selectedModuleKey) {
      // Toggle submenu if clicking same module
      setIsSubmenuOpen(prev => !prev);
    } else {
      await transitionToModule(moduleId);
    }
  }, [selectedModuleKey, transitionToModule]);
  
  // Handle tab click
  const handleTabClick = useCallback((tabId: string) => {
    activateTab(tabId);
  }, [activateTab]);
  
  // Handle tab close
  const handleTabClose = useCallback((tabId: string) => {
    closeTab(tabId);
  }, [closeTab]);
  
  // Handle tab reorder
  const handleTabReorder = useCallback((sourceIndex: number, destinationIndex: number) => {
    const newOrder = [...tabs];
    const [moved] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(destinationIndex, 0, moved);
    reorderTabs(newOrder.map(t => t.id));
  }, [tabs, reorderTabs]);
  
  // Handle new tab button click
  const handleNewTab = useCallback(() => {
    // Open dashboard as default new tab
    openTab('/dashboard', { pinned: false });
  }, [openTab]);
  
  // Handle navigation item click from secondary sidebar
  const handleNavItemClick = useCallback(async (item: { path: string; name?: string }) => {
    if (item.path) {
      const nextModuleId = routeModuleId(item.path);
      if (nextModuleId && nextModuleId !== selectedModuleKey) {
        await transitionToModule(nextModuleId);
        return;
      }
      openTab(item.path, { pinned: false });
    }
  }, [openTab, selectedModuleKey, transitionToModule]);
  
  // Get navigation items for current module
  const currentModuleNav = useMemo(() => {
    if (!selectedModuleKey) return [];
    
    const module = navigationItems.find(item => 
      normalizeModuleId(item.modulePath || item.path || item.name) === selectedModuleKey
    );
    
    return module?.children || [];
  }, [navigationItems, selectedModuleKey]);
  
  // Render tab content
  const renderTabContent = () => {
    if (!activeTab) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome to SchoolPilot</h2>
            <p className="text-gray-500 mb-6">Select a module from the sidebar to get started</p>
            <button
              onClick={() => openTab('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <TabWorkspaceErrorBoundary>
        <div className="flex-1 overflow-auto bg-white">
          {/* 
            The actual page content is rendered by React Router
            We just provide the container
          */}
          {children}
        </div>
      </TabWorkspaceErrorBoundary>
    );
  };
  
  if (!isReady) {
    return (
      <LoadingScreen 
        message="Initializing..."
        spinner={true}
        overlay={true}
      />
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen w-screen bg-slate-100">
      <Header
        onSettings={() => setShowSettings(true)}
        currentModule={selectedModuleKey}
        onModuleSelect={handleModuleSelect}
      />
      
      <div className="flex flex-1 pt-16">
        {/* Fixed sidebars - positioned with CSS position:fixed, no flex space */}
        <PrimarySidebar 
          selectedModuleKey={selectedModuleKey} 
          onModuleSelect={handleModuleSelect} 
        />
        
        <SecondarySidebar 
          selectedModuleKey={selectedModuleKey} 
          isOpen={isSubmenuOpen} 
          onClose={() => setIsSubmenuOpen(false)}
          onItemClick={handleNavItemClick}
          items={currentModuleNav}
        />
        
        {/* Main Content Area */}
        <main 
          className="flex-1 flex flex-col overflow-hidden min-w-0"
          style={{
            marginLeft: isSubmenuOpen ? 'calc(5rem + 14rem)' : '5rem'
          }}
        >
          {/* Tab Bar */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <TabBar
              tabs={tabs as any}
              activeTabId={activeTabId}
              onTabClick={handleTabClick}
              onTabClose={handleTabClose}
              onTabReorder={handleTabReorder}
              onTabPin={pinTab}
              onTabUnpin={unpinTab}
              onTabDuplicate={duplicateTab}
              onCloseOtherTabs={closeOtherTabs}
              onCloseTabsToRight={closeTabsToRight}
              onCloseTabsToLeft={closeTabsToLeft}
              onCloseAllTabs={closeAllTabs}
              onCloseAllExceptPinned={closeAllExceptPinned}
              onNewTab={handleNewTab}
              maxTabs={20}
              showAddButton={true}
            />
          </div>
          
          {/* Tab Content */}
          {renderTabContent()}
        </main>
      </div>
      
      {/* Settings Modal */}
      <SettingsPopup 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
};

export default LayoutNew;
