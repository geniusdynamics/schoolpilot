// ABOUTME: Single canonical authenticated layout shell (URL-driven tab system).
// ABOUTME: Consolidated from Layout.tsx + LayoutNew.tsx — the legacy workspace shell
// ABOUTME was retired (useNewTabSystem defaulted true; old code lives in git history).

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavItem } from '../core/types';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useAuth } from '../contexts/AuthContext';
import { useFullWidth } from '../contexts/FullWidthContext';
import { useSecondarySidebar, SECONDARY_SIDEBAR_WIDTHS } from '../contexts/SecondarySidebarContext';
import { useTabs } from '../hooks/tabs';
import type { Tab } from '../services/tabs/types';
import { routeToTabMapper } from '../services/tabs/RouteToTabMapper';
import { normalizeModuleId } from '../utils/moduleStyles';
import Header from './Header';
import PrimarySidebar from './PrimarySidebar';
import SecondarySidebar from './SecondarySidebar';
import TopOverflowMenu from './TopOverflowMenu';
import LoadingScreen from './LoadingScreen';
import SettingsPopup from './SettingsPopup';
import { TabBar } from './tabbedWorkspace/TabBar';
import { TabWorkspaceErrorBoundary } from './tabbedWorkspace/TabWorkspaceErrorBoundary';

// Props for Layout
interface LayoutProps {
  children?: React.ReactNode;
}

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

  const location = useLocation();
  const { hasModuleAccess, hasPermission } = useAuth();
  const { getMainModules, isLoading: navLoading, navigationItems } = useDynamicNavigation(true);
  
  // Full-width mode + secondary minimize context for margin calc
  const { isFullWidth } = useFullWidth();
  const { isSecondaryMinimized } = useSecondarySidebar();
  
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

  const getModuleChildrenCount = useCallback((moduleId: string): number => {
    const module = navigationItems.find(item =>
      normalizeModuleId(item.modulePath || item.path || item.name) === moduleId
    );
    return module?.children?.length || 0;
  }, [navigationItems]);

  const transitionToModule = useCallback(async (moduleId: string) => {
    const nextRoute = moduleDashboardRoute(moduleId);
    const canAccessModule = await hasModuleAccess(moduleId);

    if (!canAccessModule) {
      return;
    }

    setSelectedModuleKey(moduleId);
    const childrenCount = getModuleChildrenCount(moduleId);
    if (childrenCount >= 2) {
      setIsSubmenuOpen(true);
    } else {
      setIsSubmenuOpen(false);
    }
    await switchModuleSession(nextRoute, {
      preservePinned: true,
      refresh: false,
      pinned: moduleId === 'dashboard',
      canPreserveTab: canRestorePinnedTab
    });
  }, [canRestorePinnedTab, getModuleChildrenCount, hasModuleAccess, moduleDashboardRoute, switchModuleSession]);
  
  // Initialize - ensure a tab exists for the current route
  useEffect(() => {
    if (navLoading) return;

    const currentPath = location.pathname + location.search;
    if (currentPath === '/') return;

    // Never mirror a path the router cannot render (for example a stale
    // #/bulk-streams hit): unknown routes must not become workspace tabs.
    if (!routeToTabMapper.isKnownAppRoute(currentPath)) return;

    // Check if current URL already has a matching tab
    const hasMatchingTab = tabs.some(
      t => t.path === currentPath || t.path === location.pathname
    );

    if (!hasMatchingTab) {
      // If the only tab is a default dashboard tab, keep it and add current route tab
      const isDefaultDashboard = tabs.length === 1 && tabs[0].url === '/dashboard';
      if (isDefaultDashboard) {
        openTab(currentPath, { pinned: false });
      } else {
        openTab(currentPath, { pinned: location.pathname === '/dashboard' });
      }
    }
  }, [navLoading, location.pathname, location.search, tabs, openTab]);
  
  // Determine current module from URL
  useEffect(() => {
    if (!navLoading) {
      const path = location.pathname;
      const moduleMatch = path.match(/^\/([^/]+)/);
      if (moduleMatch && moduleMatch[1]) {
        const moduleId = normalizeModuleId(moduleMatch[1]);
        setSelectedModuleKey(moduleId);
        
        // Auto-open submenu only if module has 2+ navigation items
        const mainModules = getMainModules();
        const hasModule = mainModules.some(m => normalizeModuleId(m.modulePath || m.path || m.name) === moduleId);
        if (hasModule) {
          const childrenCount = getModuleChildrenCount(moduleId);
          setIsSubmenuOpen(childrenCount >= 2);
        } else {
          // Close sidebar for modules with no navigation (e.g. dashboard)
          setIsSubmenuOpen(false);
        }
      }
      setIsReady(true);
    }
  }, [navLoading, location.pathname, getMainModules, getModuleChildrenCount]);
  
  // Handle module selection from sidebar
  const handleModuleSelect = useCallback(async (moduleKey: string) => {
    const moduleId = normalizeModuleId(moduleKey);
    if (!moduleId) {
      return;
    }

    if (moduleId === selectedModuleKey) {
      const childrenCount = getModuleChildrenCount(moduleId);
      if (childrenCount >= 2) {
        setIsSubmenuOpen(prev => !prev);
      }
    } else {
      await transitionToModule(moduleId);
    }
  }, [selectedModuleKey, getModuleChildrenCount, transitionToModule]);
  
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
    // Open dashboard as default new tab ├óÔé¼ÔÇØ pinned so it survives close-others
    openTab('/dashboard', { pinned: true });
  }, [openTab]);
  
  // Handle navigation item click from secondary sidebar
  const handleNavItemClick = useCallback(async (item: { path: string; name?: string }) => {
    if (!item.path) return;
    // Always open a new tab from sidebar nav - do NOT call transitionToModule
    // (which closes other tabs) for sidebar nav clicks. Module switching is
    // handled by handleModuleSelect on the primary sidebar.
    openTab(item.path, { pinned: false });
  }, [openTab]);
  
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
        <div className="flex-1 flex items-center justify-center bg-surface-muted">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">├░┼©ÔÇ£┼í</div>
            <h2 className="text-2xl font-bold text-surface-foreground mb-2">Welcome to SchoolPilot</h2>
            <p className="text-surface-muted-fg mb-6">Select a module from the sidebar to get started</p>
            <button
              onClick={() => openTab('/dashboard')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <TabWorkspaceErrorBoundary>
        <div className="flex-1 overflow-auto bg-surface-card">
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
        {/* Floating TopOverflowMenu ├óÔé¼ÔÇØ utmost top-left, same level as top navbar; z-[60] keeps it above PrimarySidebar (z-50) */}
        <div className="fixed top-0 left-0 z-[60] w-16 sm:w-20">
          <TopOverflowMenu
            currentModule={selectedModuleKey}
            onModuleSelect={handleModuleSelect}
          />
        </div>

        {/* Primary Sidebar ├óÔé¼ÔÇØ hidden via width animation in fullwidth mode */}
        <PrimarySidebar 
          selectedModuleKey={selectedModuleKey} 
          onModuleSelect={handleModuleSelect}
          collapsed={isFullWidth}
        />
        
        {/* Secondary Sidebar ├óÔé¼ÔÇØ slides to far-left in fullwidth mode */}
        <SecondarySidebar 
          selectedModuleKey={selectedModuleKey} 
          isOpen={isSubmenuOpen} 
          isSecondaryAsPrimary={isFullWidth}
          onClose={() => setIsSubmenuOpen(false)}
          onItemClick={handleNavItemClick}
          items={currentModuleNav}
        />
        
        {/* Main Content Area ÔÇö margin mirrors SecondarySidebar actual width */}
        <main 
          className="flex-1 flex flex-col overflow-hidden min-w-0 transition-[margin] duration-300 ease-in-out"
          style={{
            marginLeft: (() => {
              const primaryWidth = isFullWidth ? '0rem' : '5rem';
              const secondaryWidth = !isSubmenuOpen
                ? '0rem'
                : isSecondaryMinimized
                  ? SECONDARY_SIDEBAR_WIDTHS.MINIMIZED
                  : SECONDARY_SIDEBAR_WIDTHS.EXPANDED;
              return primaryWidth === '0rem' && secondaryWidth === '0rem' ? '0rem' : `calc(${primaryWidth} + ${secondaryWidth})`;
            })()
          }}
        >
          {/* Tab Bar */}
          <div className="flex-shrink-0 bg-surface-card border-b border-surface-border">
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

