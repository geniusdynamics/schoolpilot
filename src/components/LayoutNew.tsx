/**
 * Layout Component (New)
 * 
 * Updated layout component using URL-driven tab system.
 * This replaces the old Layout.tsx once fully tested.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useAuth } from '../contexts/AuthContext';
import { useTabs } from '../hooks/tabs';
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

const LayoutNew: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
    markDirty
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
        const moduleId = moduleMatch[1];
        setSelectedModuleKey(moduleId);
        
        // Auto-open submenu if we have a valid module
        const mainModules = getMainModules();
        const hasModule = mainModules.some(m => m.id === moduleId || m.name?.includes(moduleId));
        if (hasModule) {
          setIsSubmenuOpen(true);
        }
      }
      setIsReady(true);
    }
  }, [navLoading, location.pathname, getMainModules]);
  
  // Handle module selection from sidebar
  const handleModuleSelect = useCallback((moduleKey: string) => {
    if (moduleKey === selectedModuleKey) {
      // Toggle submenu if clicking same module
      setIsSubmenuOpen(prev => !prev);
    } else {
      setSelectedModuleKey(moduleKey);
      setIsSubmenuOpen(true);
      
      // Open module dashboard in new tab
      const dashboardUrl = `/${moduleKey}`;
      openTab(dashboardUrl, { pinned: false });
    }
  }, [selectedModuleKey, openTab]);
  
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
  const handleNavItemClick = useCallback((item: { path: string; name?: string }) => {
    if (item.path) {
      openTab(item.path, { pinned: false });
    }
  }, [openTab]);
  
  // Get navigation items for current module
  const currentModuleNav = useMemo(() => {
    if (!selectedModuleKey) return [];
    
    const module = navigationItems.find(item => 
      item.id === selectedModuleKey || 
      item.name?.toLowerCase().includes(selectedModuleKey.toLowerCase())
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
      <TabWorkspaceErrorBoundary
        onError={(error, errorInfo) => {
          console.error('Tab error:', error, errorInfo);
        }}
      >
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
      <Header onSettings={() => setShowSettings(true)} />
      
      <div className="flex flex-1 pt-16">
        {/* Primary Sidebar - Module Selection */}
        <PrimarySidebar 
          selectedModuleKey={selectedModuleKey} 
          onModuleSelect={handleModuleSelect} 
        />
        
        {/* Secondary Sidebar - Submenu */}
        <SecondarySidebar 
          selectedModuleKey={selectedModuleKey} 
          isOpen={isSubmenuOpen} 
          onClose={() => setIsSubmenuOpen(false)}
          onItemClick={handleNavItemClick}
          items={currentModuleNav}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tab Bar */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onTabClick={handleTabClick}
              onTabClose={handleTabClose}
              onTabReorder={handleTabReorder}
              onTabPin={pinTab}
              onTabUnpin={unpinTab}
              onNewTab={handleNewTab}
              maxTabs={20}
              showCloseButton={true}
              showNewTabButton={true}
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
