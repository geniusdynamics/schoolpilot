// ABOUTME: Custom hook for programmatic tab navigation and management
// ABOUTME: Provides convenient methods for creating, switching, closing, and organizing tabs

import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabStore, Tab, TabContent, TabGroup } from '../stores/tabStore';
import { useAuth } from '../contexts/AuthContext';
import { useActionProvider } from '../contexts/ActionProvider';
import { useToastHelpers } from './useToast';

// Navigation options for creating tabs
interface TabNavigationOptions {
  // Tab creation options
  title?: string;
  icon?: string;
  closable?: boolean;
  pinned?: boolean;
  selected?: boolean;
  
  // Content options
  contentType?: 'component' | 'url' | 'html' | 'text' | 'empty';
  component?: React.ComponentType<any>;
  props?: Record<string, any>;
  url?: string;
  html?: string;
  text?: string;
  
  // Context options
  module?: string;
  submodule?: string;
  feature?: string;
  metadata?: Record<string, any>;
  moduleData?: Record<string, any>;
  
  // Group options
  groupId?: string;
  groupTitle?: string;
  
  // Behavior options
  replaceCurrentTab?: boolean;
  insertAfterCurrent?: boolean;
  activateImmediately?: boolean;
  forceCreate?: boolean; // Add this line
}

// Tab navigation result
interface TabNavigationResult {
  tabId: string;
  tab: Tab;
  wasCreated: boolean;
  wasActivated: boolean;
}

// Hook return type
interface UseTabNavigationReturn {
  // Current state
  activeTab: Tab | null;
  allTabs: Tab[];
  tabGroups: TabGroup[];
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  
  // Navigation methods
  navigateToTab: (path: string, options?: TabNavigationOptions) => Promise<TabNavigationResult>;
  navigateToModule: (module: string, submodule?: string, options?: TabNavigationOptions) => Promise<TabNavigationResult>;
  navigateToComponent: (component: React.ComponentType<any>, title: string, options?: TabNavigationOptions) => Promise<TabNavigationResult>;
  navigateToUrl: (url: string, title?: string, options?: TabNavigationOptions) => Promise<TabNavigationResult>;
  
  // Tab management
  createTab: (path: string, options?: TabNavigationOptions) => Promise<TabNavigationResult>;
  activateTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  closeCurrentTab: () => void;
  closeAllTabs: () => void;
  closeOtherTabs: (keepTabId?: string) => void;
  duplicateTab: (tabId: string) => Promise<TabNavigationResult>;
  
  // Tab organization
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  moveTab: (tabId: string, newIndex: number) => void;
  moveTabToGroup: (tabId: string, groupId: string) => void;
  
  // Group management
  createTabGroup: (title: string, tabIds?: string[]) => string;
  deleteTabGroup: (groupId: string) => void;
  renameTabGroup: (groupId: string, newTitle: string) => void;
  
  // History navigation
  navigateBack: () => void;
  navigateForward: () => void;
  
  // Utility methods
  findTabByPath: (path: string) => Tab | null;
  findTabByModule: (module: string, submodule?: string) => Tab | null;
  getTabsInGroup: (groupId: string) => Tab[];
  isTabActive: (tabId: string) => boolean;
  
  // Bulk operations
  closeTabsByModule: (module: string) => void;
  closeTabsByGroup: (groupId: string) => void;
  refreshTab: (tabId: string) => void;
  refreshAllTabs: () => void;
}

// Custom hook implementation
export const useTabNavigation = (): UseTabNavigationReturn => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setModuleContext } = useActionProvider();
  const { showWarning, showError, showInfo } = useToastHelpers();
  
  const {
    tabs,
    activeTabId,
    groups,
    history,
    historyIndex,
    createTab: storeCreateTab,
    activateTab: storeActivateTab,
    closeTab: storeCloseTab,
    updateTab,
    moveTab: storeMoveTab,
    pinTab: storePinTab,
    unpinTab: storeUnpinTab,
    createGroup,
    deleteGroup,
    updateGroup,
    moveTabToGroup: storeMoveTabToGroup,
    navigateBack: storeNavigateBack,
    navigateForward: storeNavigateForward,
    getTabById,
    clearAllTabs
  } = useTabStore();
  
  // Current state
  const activeTab = useMemo(() => {
    return activeTabId ? getTabById(activeTabId) : null;
  }, [activeTabId, getTabById]);
  
  const canNavigateBack = historyIndex > 0;
  const canNavigateForward = historyIndex < (history?.length || 0) - 1;
  
  // Helper function to create tab content
  const createTabContent = (options: TabNavigationOptions): TabContent => {
    const { contentType = 'url', component, props, url, html, text } = options;
    
    switch (contentType) {
      case 'component':
        return {
          type: 'component',
          component: component!,
          props: props || {}
        };
      case 'url':
        return {
          type: 'url',
          url: url || location.pathname
        };
      case 'html':
        return {
          type: 'html',
          html: html || ''
        };
      case 'text':
        return {
          type: 'text',
          text: text || ''
        };
      default:
        return { type: 'empty' };
    }
  };
  
  // Helper function to extract module info from path
  const extractModuleFromPath = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    return {
      module: segments[0] || 'dashboard',
      submodule: segments[1],
      feature: segments[2]
    };
  };
  
  // Create tab with full options
  const createTab = useCallback(async (path: string, options: TabNavigationOptions = {}): Promise<TabNavigationResult> => {
    const {
      title,
      icon,
      closable = true,
      pinned = false,
      selected = true,
      module,
      submodule,
      feature,
      metadata = {},
      moduleData = {},
      groupId,
      replaceCurrentTab = false,
      insertAfterCurrent = false,
      activateImmediately = true
    } = options;
    
    // Extract module info if not provided
    const moduleInfo = module ? { module, submodule, feature } : extractModuleFromPath(path);
    
    // Create tab content
    const content = createTabContent(options);
    
    // Generate title if not provided
    const tabTitle = title || path.split('/').pop() || 'New Tab';
    
    try {
      // Create the tab
      const tabId = storeCreateTab({
        title: tabTitle,
        path,
        icon,
        closable,
        pinned,
        selected,
        content,
        module: moduleInfo.module,
        submodule: moduleInfo.submodule,
        feature: moduleInfo.feature,
        metadata: {
          ...metadata,
          createdBy: user?.id,
          createdAt: new Date().toISOString()
        },
        moduleData,
        groupId
      });
      
      const tab = getTabById(tabId)!;
      
      // Handle replacement or insertion
      if (replaceCurrentTab && activeTabId) {
        storeCloseTab(activeTabId);
      }
      
      // Activate if requested
      if (activateImmediately) {
        storeActivateTab(tabId);
        
        // Update action context
        setModuleContext(moduleInfo.module, moduleInfo.submodule, moduleInfo.feature);
      }
      
      return {
        tabId,
        tab,
        wasCreated: true,
        wasActivated: activateImmediately
      };
    } catch (error) {
      // Handle tab limit exceeded error
      if (error instanceof Error && error.message.includes('Maximum tab limit')) {
        console.warn('Tab limit reached, attempting to close oldest non-pinned tab');
        
        // Find the oldest non-pinned, closable tab
        const oldestTab = tabs
          ?.filter(tab => !tab.pinned && tab.closable !== false)
          ?.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0))
          ?.[0];
        
        if (oldestTab) {
          console.log(`Closing oldest tab: ${oldestTab.title} to make room for new tab`);
          storeCloseTab(oldestTab.id);
          
          // Try creating the tab again
          try {
            const tabId = storeCreateTab({
              title: tabTitle,
              path,
              icon,
              closable,
              pinned,
              selected,
              content,
              module: moduleInfo.module,
              submodule: moduleInfo.submodule,
              feature: moduleInfo.feature,
              metadata: {
                ...metadata,
                createdBy: user?.id,
                createdAt: new Date().toISOString(),
                autoClosedTab: oldestTab.title // Track which tab was closed
              },
              moduleData,
              groupId
            });
            
            const tab = getTabById(tabId)!;
            
            // Handle replacement or insertion
            if (replaceCurrentTab && activeTabId) {
              storeCloseTab(activeTabId);
            }
            
            // Activate if requested
            if (activateImmediately) {
              storeActivateTab(tabId);
              
              // Update action context
              setModuleContext(moduleInfo.module, moduleInfo.submodule, moduleInfo.feature);
            }
            
            // Show notification about auto-closed tab
            showInfo(`Automatically closed "${oldestTab.title}" to make room for the new tab`, {
              title: 'Tab Limit Reached',
              duration: 4000
            });
            console.info(`✅ New tab created. Auto-closed "${oldestTab.title}" to make room.`);
            
            return {
              tabId,
              tab,
              wasCreated: true,
              wasActivated: activateImmediately
            };
          } catch (retryError) {
            console.error('Failed to create tab even after closing oldest tab:', retryError);
            throw new Error('Unable to create new tab. Please close some tabs manually and try again.');
          }
        } else {
          // No closable tabs found
          throw new Error('Maximum tab limit reached. Please close some tabs before opening new ones.');
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  }, [storeCreateTab, getTabById, activeTabId, storeCloseTab, storeActivateTab, setModuleContext, user?.id, tabs, showInfo, showError, showWarning]);
  
  // Navigate to tab (create if doesn't exist)
  const navigateToTab = useCallback(async (path: string, options: TabNavigationOptions = {}): Promise<TabNavigationResult> => {
    // Extract module information from target path
    const targetModuleInfo = extractModuleFromPath(path);
    
    console.log('🚀 Navigation Decision:', {
      targetPath: path,
      targetModule: targetModuleInfo.module,
      willUseTabSystem: true // Always use tab system for internal navigation
    });
    
    // Check if this is an external URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // For external URLs, use React Router navigation
      window.open(path, '_blank');
      return {
        tabId: '',
        tab: {} as Tab,
        wasCreated: false,
        wasActivated: false
      };
    }
    
    // Always use tab system for internal navigation
    
    // Check if tab already exists, unless forceCreate is true
    if (!options.forceCreate) {
      const existingTab = tabs?.find(tab => tab.path === path);
      
      if (existingTab) {
        storeActivateTab(existingTab.id);
        
        const moduleInfo = extractModuleFromPath(path);
        setModuleContext(moduleInfo.module, moduleInfo.submodule, moduleInfo.feature);
        
        return {
          tabId: existingTab.id,
          tab: existingTab,
          wasCreated: false,
          wasActivated: true
        };
      }
    }
    
    // Create new tab for same-module navigation
    const result = await createTab(path, options);
    
    return result;
  }, [tabs, storeActivateTab, navigate, setModuleContext, createTab, location.pathname]);
  
  // Navigate to module
  const navigateToModule = useCallback(async (module: string, submodule?: string, options: TabNavigationOptions = {}): Promise<TabNavigationResult> => {
    const path = `/${module}${submodule ? `/${submodule}` : ''}`;
    return navigateToTab(path, { ...options, module, submodule });
  }, [navigateToTab]);
  
  // Navigate to component
  const navigateToComponent = useCallback(async (component: React.ComponentType<any>, title: string, options: TabNavigationOptions = {}): Promise<TabNavigationResult> => {
    const path = `/component/${title.toLowerCase().replace(/\s+/g, '-')}`;
    return createTab(path, {
      ...options,
      title,
      contentType: 'component',
      component,
      activateImmediately: true
    });
  }, [createTab]);
  
  // Navigate to URL
  const navigateToUrl = useCallback(async (url: string, title?: string, options: TabNavigationOptions = {}): Promise<TabNavigationResult> => {
    const tabTitle = title || url;
    return createTab(url, {
      ...options,
      title: tabTitle,
      contentType: 'url',
      url,
      activateImmediately: true
    });
  }, [createTab]);
  
  // Tab management methods
  const activateTab = useCallback((tabId: string) => {
    storeActivateTab(tabId);
    const tab = getTabById(tabId);
    if (tab?.path) {
      // Always update module context when activating a tab
      const moduleInfo = extractModuleFromPath(tab.path);
      setModuleContext(moduleInfo.module, moduleInfo.submodule, moduleInfo.feature);
      
      // Navigate with React Router only if we need to update the URL
      // This ensures the URL stays in sync with the active tab
      if (location.pathname !== tab.path) {
        navigate(tab.path);
      }
    }
  }, [storeActivateTab, getTabById, navigate, setModuleContext, location.pathname]);
  
  const closeTab = useCallback((tabId: string) => {
    storeCloseTab(tabId);
  }, [storeCloseTab]);
  
  const closeCurrentTab = useCallback(() => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  }, [activeTabId, closeTab]);
  
  const closeAllTabs = useCallback(() => {
    clearAllTabs();
  }, [clearAllTabs]);
  
  const closeOtherTabs = useCallback((keepTabId?: string) => {
    const tabToKeep = keepTabId || activeTabId;
    if (!tabToKeep) return;
    
    tabs?.forEach(tab => {
      if (tab.id !== tabToKeep) {
        closeTab(tab.id);
      }
    });
  }, [tabs, activeTabId, closeTab]);
  
  const duplicateTab = useCallback(async (tabId: string): Promise<TabNavigationResult> => {
    const tab = getTabById(tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`);
    }
    
    return createTab(tab.path || '', {
      title: `${tab.title} (Copy)`,
      icon: tab.icon,
      contentType: tab.content.type as any,
      component: tab.content.type === 'component' ? tab.content.component : undefined,
      props: tab.content.type === 'component' ? tab.content.props : undefined,
      url: tab.content.type === 'url' ? tab.content.url : undefined,
      html: tab.content.type === 'html' ? tab.content.html : undefined,
      text: tab.content.type === 'text' ? tab.content.text : undefined,
      module: tab.module,
      submodule: tab.submodule,
      feature: tab.feature,
      metadata: { ...tab.metadata },
      moduleData: { ...tab.moduleData }
    });
  }, [getTabById, createTab]);
  
  // Tab organization methods
  const pinTab = useCallback((tabId: string) => {
    storePinTab(tabId);
  }, [storePinTab]);
  
  const unpinTab = useCallback((tabId: string) => {
    storeUnpinTab(tabId);
  }, [storeUnpinTab]);
  
  const moveTab = useCallback((tabId: string, newIndex: number) => {
    storeMoveTab(tabId, newIndex);
  }, [storeMoveTab]);
  
  const moveTabToGroup = useCallback((tabId: string, groupId: string) => {
    storeMoveTabToGroup(tabId, groupId);
  }, [storeMoveTabToGroup]);
  
  // Group management methods
  const createTabGroup = useCallback((title: string, tabIds: string[] = []): string => {
    return createGroup({ title, tabIds });
  }, [createGroup]);
  
  const deleteTabGroup = useCallback((groupId: string) => {
    deleteGroup(groupId);
  }, [deleteGroup]);
  
  const renameTabGroup = useCallback((groupId: string, newTitle: string) => {
    updateGroup(groupId, { title: newTitle });
  }, [updateGroup]);
  
  // History navigation
  const navigateBack = useCallback(() => {
    storeNavigateBack();
  }, [storeNavigateBack]);
  
  const navigateForward = useCallback(() => {
    storeNavigateForward();
  }, [storeNavigateForward]);
  
  // Utility methods
  const findTabByPath = useCallback((path: string): Tab | null => {
    return tabs?.find(tab => tab.path === path) || null;
  }, [tabs]);
  
  const findTabByModule = useCallback((module: string, submodule?: string): Tab | null => {
    return tabs?.find(tab => 
      tab.module === module && 
      (!submodule || tab.submodule === submodule)
    ) || null;
  }, [tabs]);
  
  const getTabsInGroup = useCallback((groupId: string): Tab[] => {
    return tabs?.filter(tab => tab.groupId === groupId) || [];
  }, [tabs]);
  
  const isTabActive = useCallback((tabId: string): boolean => {
    return activeTabId === tabId;
  }, [activeTabId]);
  
  // Bulk operations
  const closeTabsByModule = useCallback((module: string) => {
    tabs?.forEach(tab => {
      if (tab.module === module) {
        closeTab(tab.id);
      }
    });
  }, [tabs, closeTab]);
  
  const closeTabsByGroup = useCallback((groupId: string) => {
    tabs?.forEach(tab => {
      if (tab.groupId === groupId) {
        closeTab(tab.id);
      }
    });
  }, [tabs, closeTab]);
  
  const refreshTab = useCallback((tabId: string) => {
    const tab = getTabById(tabId);
    if (tab) {
      updateTab(tabId, {
        metadata: {
          ...tab.metadata,
          lastRefreshed: new Date().toISOString()
        }
      });
    }
  }, [getTabById, updateTab]);
  
  const refreshAllTabs = useCallback(() => {
    tabs?.forEach(tab => {
      refreshTab(tab.id);
    });
  }, [tabs, refreshTab]);
  
  return {
    // Current state
    activeTab,
    allTabs: tabs || [],
    tabGroups: groups || [],
    canNavigateBack,
    canNavigateForward,
    
    // Navigation methods
    navigateToTab,
    navigateToModule,
    navigateToComponent,
    navigateToUrl,
    
    // Tab management
    createTab,
    activateTab,
    closeTab,
    closeCurrentTab,
    closeAllTabs,
    closeOtherTabs,
    duplicateTab,
    
    // Tab organization
    pinTab,
    unpinTab,
    moveTab,
    moveTabToGroup,
    
    // Group management
    createTabGroup,
    deleteTabGroup,
    renameTabGroup,
    
    // History navigation
    navigateBack,
    navigateForward,
    
    // Utility methods
    findTabByPath,
    findTabByModule,
    getTabsInGroup,
    isTabActive,
    
    // Bulk operations
    closeTabsByModule,
    closeTabsByGroup,
    refreshTab,
    refreshAllTabs
  };
};

// Export types
export type { TabNavigationOptions, TabNavigationResult, UseTabNavigationReturn };