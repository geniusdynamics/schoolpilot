/**
 * Comprehensive TabStore implementation with Zustand, RBAC integration, and state persistence
 * Based on the Comprehensive Tabbed Workspace System documentation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Tab, TabState, TabStore, TabContent } from '../types/tabbedWorkspace';

// Re-export TabContent for convenience
export type { TabContent };
import { HierarchicalTab, BreadcrumbItem } from '../types/hierarchical';
import { rbacService } from '../core/rbacService';

interface TabStoreState extends TabStore {
  // Internal state
  isStoreInitialized: boolean;
  _lastTabId: number;
  persistenceEnabled: boolean;
  // Hierarchical state
  hierarchicalTabs: HierarchicalTab[];
  breadcrumbs: BreadcrumbItem[];
  currentPath: string;
  enableHierarchicalMode: boolean;
  
  // Additional tab operations
  closeOtherTabs: (tabId: string) => void;
  
  // Storage management
  clearCorruptedData: () => void;
  resetStore: () => void;
  
  // Hierarchical operations
  setHierarchicalMode: (enabled: boolean) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setCurrentPath: (path: string) => void;
  addHierarchicalTab: (tab: HierarchicalTab) => void;
  updateHierarchicalTab: (tabId: string, updates: Partial<HierarchicalTab>) => void;
  removeHierarchicalTab: (tabId: string) => void;
  getHierarchicalTab: (tabId: string) => HierarchicalTab | null;
  navigateToPath: (path: string) => void;
  generateBreadcrumbsFromPath: (path: string) => BreadcrumbItem[];
}

// Generate unique tab ID
const generateTabId = (): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Validate tab permissions
const validateTabPermissions = (tab: Tab, userRole: string, userPermissions: string[]): boolean => {
  if (!tab.permissions || tab.permissions.length === 0) return true;
  
  // Check if user has any of the required permissions
  return tab.permissions.some(permission => userPermissions.includes(permission));
};

// Validate tab data integrity
const validateTabData = (tab: any): tab is Tab => {
  if (!tab || typeof tab !== 'object') return false;
  if (!tab.id || typeof tab.id !== 'string') return false;
  if (!tab.title || typeof tab.title !== 'string') return false;
  if (!tab.module || typeof tab.module !== 'string') return false;
  if (!tab.path || typeof tab.path !== 'string') return false;
  if (!tab.content || typeof tab.content !== 'object') return false;
  
  // Check for corrupted module names (should not contain colons)
  if (tab.module.includes(':')) {
    console.warn('Corrupted tab detected with invalid module name:', tab.module);
    return false;
  }
  
  return true;
};

// Clean corrupted tabs from persisted data
const cleanPersistedData = (persistedState: any) => {
  if (!persistedState || typeof persistedState !== 'object') {
    console.warn('Invalid persisted state detected, resetting...');
    return null;
  }
  
  let hasCorruption = false;
  
  // Clean tabs array
  if (Array.isArray(persistedState.tabs)) {
    const originalLength = persistedState.tabs.length;
    persistedState.tabs = persistedState.tabs.filter(validateTabData);
    if (persistedState.tabs.length !== originalLength) {
      hasCorruption = true;
      console.warn(`Removed ${originalLength - persistedState.tabs.length} corrupted tabs`);
    }
  } else {
    persistedState.tabs = [];
    hasCorruption = true;
  }
  
  // Clean pinned tabs array
  if (Array.isArray(persistedState.pinnedTabs)) {
    const validTabIds = new Set(persistedState.tabs.map((tab: Tab) => tab.id));
    const originalLength = persistedState.pinnedTabs.length;
    persistedState.pinnedTabs = persistedState.pinnedTabs.filter((id: string) => validTabIds.has(id));
    if (persistedState.pinnedTabs.length !== originalLength) {
      hasCorruption = true;
    }
  } else {
    persistedState.pinnedTabs = [];
    hasCorruption = true;
  }
  
  // Clean recently closed tabs
  if (Array.isArray(persistedState.recentlyClosedTabs)) {
    const originalLength = persistedState.recentlyClosedTabs.length;
    persistedState.recentlyClosedTabs = persistedState.recentlyClosedTabs.filter(validateTabData);
    if (persistedState.recentlyClosedTabs.length !== originalLength) {
      hasCorruption = true;
    }
  } else {
    persistedState.recentlyClosedTabs = [];
    hasCorruption = true;
  }
  
  // Ensure maxTabs is reasonable
  if (typeof persistedState.maxTabs !== 'number' || persistedState.maxTabs < 1 || persistedState.maxTabs > 50) {
    persistedState.maxTabs = 15;
    hasCorruption = true;
  }
  
  if (hasCorruption) {
    console.warn('Corrupted data detected and cleaned from localStorage');
  }
  
  return persistedState;
};

// Create the tab store with Zustand
export const useTabStore = create<TabStoreState>()
  (persist(
    immer((set, get) => ({
      // Core state
      tabs: [],
      activeTabId: null,
      pinnedTabs: [],
      recentlyClosedTabs: [],
      maxTabs: 15,
      tabGroups: {},
      currentUserRole: 'guest',
      userPermissions: [],
      // Hierarchical state
      hierarchicalTabs: [],
      breadcrumbs: [],
      currentPath: '',
      enableHierarchicalMode: false,
      
      // Internal state
      isStoreInitialized: false,
      _lastTabId: 0,
      persistenceEnabled: true,
      
      // Initialize store with user context - optimized to prevent re-render loops
      initialize: async (retryCount = 0) => {
        const state = get();
        if (state.isStoreInitialized) return;
        
        try {
          // Check if persistence is enabled and we have stored data
          if (state.persistenceEnabled) {
            const storageKey = 'tabbed-workspace-storage';
            const storedData = localStorage.getItem(storageKey);
            
            if (!storedData && state.tabs.length === 0) {
              // Create default dashboard tab if no stored tabs exist
              const dashboardTab: Tab = {
                id: generateTabId(),
                title: 'Dashboard',
                module: 'dashboard',
                path: '/dashboard',
                content: {
                  type: 'component',
                  component: 'DynamicPageComponent'
                },
                lastAccessed: Date.now(),
                canClose: false,
                pinned: true
              };
              set((draft) => {
                draft.tabs = [dashboardTab];
                draft.activeTabId = dashboardTab.id;
              });
            }
          }

          // Check for and clean any corrupted data
          console.log('Checking for corrupted tab data...');
          const currentTabs = state.tabs || [];
          const validTabs = currentTabs.filter(validateTabData);
          
          if (validTabs.length !== currentTabs.length) {
            console.warn(`Found ${currentTabs.length - validTabs.length} corrupted tabs, cleaning...`);
            set((draft) => {
              draft.tabs = validTabs;
              // Clean pinned tabs that reference non-existent tabs
              const validTabIds = new Set(validTabs.map(tab => tab.id));
              draft.pinnedTabs = draft.pinnedTabs.filter(id => validTabIds.has(id));
              // Clean recently closed tabs
              draft.recentlyClosedTabs = (draft.recentlyClosedTabs || []).filter(validateTabData);
            });
          }
          
          // Get current user role and permissions from RBAC service
          let userRole: string | null = null;
          let userPermissions: string[] = [];
          
          try {
            userRole = await rbacService.getCurrentUserRole();
            userPermissions = await rbacService.getUserPermissions();
          } catch (rbacError) {
            console.warn('RBAC service unavailable, using fallback values:', rbacError);
            userRole = 'super_admin'; // Fallback for demo/test mode
            userPermissions = ['*']; // Grant all permissions for demo
          }
          
          set((draft) => {
          draft.currentUserRole = userRole || 'guest';
          draft.userPermissions = userPermissions || [];
          draft.isStoreInitialized = true;
          });
          
          console.log(`TabStore initialized with role: ${userRole || 'guest'}, permissions: ${userPermissions?.length || 0}`);
          console.log(`Valid tabs after cleanup: ${get().tabs.length}`);
        } catch (error) {
          console.error('Failed to initialize tab store:', error);
          
          // Final fallback - no retries to prevent loops
          console.warn('RBAC initialization failed, falling back to guest mode');
          set((draft) => {
          draft.currentUserRole = 'guest';
          draft.userPermissions = [];
          draft.isStoreInitialized = true;
          });
        }
      },
      
      // Initialize store with configuration options
      initializeStore: (config: { maxTabs?: number; enablePersistence?: boolean; enableTabGroups?: boolean }) => {
        set((draft) => {
          if (config.maxTabs !== undefined) {
            draft.maxTabs = config.maxTabs;
          }
          // Note: persistence and tab groups are handled by the store configuration
          // This function is mainly for setting runtime configuration
        });
      },
      
      // Core operations with RBAC validation
      createTab: async (tabData: Omit<Tab, 'id' | 'lastAccessed'>) => {
        const state = get();
        
        // Ensure store is initialized before proceeding
        if (!state.isStoreInitialized) {
          console.warn('TabStore not initialized, attempting to initialize...');
          await get().initialize();
        }
        
        // Get updated state after potential initialization
        const updatedState = get();
        
        // Check if user has permission to create tabs in this module
        try {
          // Skip permission check in demo mode or if user is super admin
          const skipPermissionCheck = updatedState.currentUserRole === 'super_admin' || 
                                    updatedState.currentUserRole === 'demo_user' ||
                                    process.env.NODE_ENV === 'development';
          
          if (!skipPermissionCheck && tabData.module) {
            const hasModuleAccess = await rbacService.checkModuleAccess(updatedState.currentUserRole, tabData.module);
            if (!hasModuleAccess) {
              console.warn(`Access denied: No permission to access module ${tabData.module}, but allowing in fallback mode`);
              // Don't throw error, just log warning and continue
            }
          }
        } catch (error) {
          console.warn(`Error checking module access for ${tabData.module}:`, error);
          // If RBAC check fails and user is super_admin (demo mode), allow access
          if (updatedState.currentUserRole === 'super_admin') {
            console.warn(`RBAC check failed but user is super_admin, allowing access to ${tabData.module}`);
          }
        }
        
        // Check tab limit
        if (updatedState.tabs.length >= updatedState.maxTabs) {
          throw new Error(`Maximum tab limit (${updatedState.maxTabs}) reached`);
        }
        
        const newTab: Tab = {
          ...tabData,
          id: generateTabId(),
          lastAccessed: Date.now(),
          userRole: updatedState.currentUserRole,
        };
        
        // Validate tab permissions (but don't block if validation fails)
        try {
          if (!validateTabPermissions(newTab, updatedState.currentUserRole, updatedState.userPermissions)) {
            console.warn('Insufficient permissions to create this tab, but allowing in fallback mode');
          }
        } catch (error) {
          console.warn('Error validating tab permissions:', error);
        }
        
        set((draft) => {
          // Add the new tab with proper initialization
          draft.tabs.push({
            ...newTab,
            isLoading: false // Tab is ready immediately
          });
          // Set as active tab
          draft.activeTabId = newTab.id;
        });
        
        return newTab.id;
      },
      
      closeTab: (tabId: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        
        if (!tab || !tab.canClose) return;
        
        set((draft) => {
          // Add to recently closed if not pinned
          if (!tab.pinned) {
            draft.recentlyClosedTabs.unshift(tab);
            // Keep only last 10 closed tabs
            if (draft.recentlyClosedTabs.length > 10) {
              draft.recentlyClosedTabs = draft.recentlyClosedTabs.slice(0, 10);
            }
          }
          
          // Remove from tabs
          draft.tabs = draft.tabs.filter(t => t.id !== tabId);
          draft.pinnedTabs = draft.pinnedTabs.filter(id => id !== tabId);
          
          // Update active tab if necessary
          if (draft.activeTabId === tabId) {
            if (draft.tabs.length > 0) {
              // Activate the next tab or the last one
              const currentIndex = state.tabs.findIndex(t => t.id === tabId);
              const nextTab = draft.tabs[currentIndex] || draft.tabs[draft.tabs.length - 1];
              draft.activeTabId = nextTab?.id || null;
            } else {
              draft.activeTabId = null;
            }
          }
        });
      },
      
      activateTab: async (tabId: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        
        if (!tab) return;
        
        // Validate access (but don't block if validation fails)
        try {
          if (!validateTabPermissions(tab, state.currentUserRole, state.userPermissions)) {
            console.warn('Insufficient permissions to access this tab, but allowing in fallback mode');
          }
        } catch (error) {
          console.warn('Error validating tab permissions:', error);
        }
        
        set((draft) => {
          draft.activeTabId = tabId;
          // Update last accessed time
          const tabIndex = draft.tabs.findIndex(t => t.id === tabId);
          if (tabIndex !== -1) {
            draft.tabs[tabIndex].lastAccessed = Date.now();
          }
        });
      },
      
      updateTab: (tabId: string, updates: Partial<Tab>) => {
        set((draft) => {
          const tabIndex = draft.tabs.findIndex(t => t.id === tabId);
          if (tabIndex !== -1) {
            Object.assign(draft.tabs[tabIndex], updates);
          }
        });
      },
      
      reorderTabs: (fromIndex: number, toIndex: number) => {
        set((draft) => {
          const [movedTab] = draft.tabs.splice(fromIndex, 1);
          draft.tabs.splice(toIndex, 0, movedTab);
        });
      },
      
      // Advanced operations
      pinTab: (tabId: string) => {
        set((draft) => {
          const tab = draft.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.pinned = true;
            if (!draft.pinnedTabs.includes(tabId)) {
              draft.pinnedTabs.push(tabId);
            }
          }
        });
      },
      
      unpinTab: (tabId: string) => {
        set((draft) => {
          const tab = draft.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.pinned = false;
            draft.pinnedTabs = draft.pinnedTabs.filter(id => id !== tabId);
          }
        });
      },
      
      duplicateTab: async (tabId: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        
        if (!tab) throw new Error('Tab not found');
        
        const duplicatedTab = {
          ...tab,
          title: `${tab.title} (Copy)`,
          pinned: false,
          isDirty: false,
        };
        
        return await get().createTab(duplicatedTab);
      },
      
      restoreClosedTab: () => {
        const state = get();
        if (state.recentlyClosedTabs.length === 0) return null;
        
        const tabToRestore = state.recentlyClosedTabs[0];
        
        set((draft) => {
          draft.recentlyClosedTabs = draft.recentlyClosedTabs.slice(1);
          draft.tabs.push({
            ...tabToRestore,
            id: generateTabId(), // Generate new ID
            lastAccessed: Date.now(),
          });
        });
        
        return tabToRestore;
      },
      
      markTabDirty: (tabId: string, isDirty: boolean) => {
        set((draft) => {
          const tab = draft.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.isDirty = isDirty;
          }
        });
      },
      
      // Bulk operations
      closeAllTabs: () => {
        const state = get();
        const closableTabs = state.tabs.filter(tab => tab.canClose && !tab.pinned);
        
        set((draft) => {
          // Add to recently closed
          draft.recentlyClosedTabs = [...closableTabs, ...draft.recentlyClosedTabs].slice(0, 10);
          // Keep only pinned tabs
          draft.tabs = draft.tabs.filter(tab => tab.pinned);
          // Update active tab
          if (draft.tabs.length > 0) {
            draft.activeTabId = draft.tabs[0].id;
          } else {
            draft.activeTabId = null;
          }
        });
      },

      // Clear all tabs (including pinned)
      clearAllTabs: () => {
        const state = get();
        set((draft) => {
          // Add all tabs to recently closed
          draft.recentlyClosedTabs = [...state.tabs, ...draft.recentlyClosedTabs].slice(0, 10);
          draft.tabs = [];
          draft.pinnedTabs = [];
          draft.activeTabId = null;
        });
      },

      // Move tab to different position
      moveTab: (tabId: string, newIndex: number) => {
        set((draft) => {
          const currentIndex = draft.tabs.findIndex(t => t.id === tabId);
          if (currentIndex !== -1 && newIndex >= 0 && newIndex < draft.tabs.length) {
            const [movedTab] = draft.tabs.splice(currentIndex, 1);
            draft.tabs.splice(newIndex, 0, movedTab);
          }
        });
      },

      // Move tab to group
      moveTabToGroup: (tabId: string, groupId: string) => {
        set((draft) => {
          const tab = draft.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.groupId = groupId;
          }
        });
      },

      // Navigation history
      navigateBack: () => {
        const state = get();
        if (state.historyIndex > 0) {
          set((draft) => {
            draft.historyIndex = state.historyIndex - 1;
            const targetTabId = state.history[draft.historyIndex];
            if (targetTabId) {
              draft.activeTabId = targetTabId;
            }
          });
        }
      },

      navigateForward: () => {
        const state = get();
        if (state.historyIndex < (state.history?.length || 0) - 1) {
          set((draft) => {
            draft.historyIndex = state.historyIndex + 1;
            const targetTabId = state.history[draft.historyIndex];
            if (targetTabId) {
              draft.activeTabId = targetTabId;
            }
          });
        }
      },
      
      closeOtherTabs: (tabId: string) => {
        const state = get();
        const tabsToClose = state.tabs.filter(tab => 
          tab.id !== tabId && // Don't close the specified tab (usually active)
          tab.canClose && 
          !tab.pinned // Don't close pinned tabs
        );
        
        set((draft) => {
          // Add to recently closed
          draft.recentlyClosedTabs = [...tabsToClose, ...draft.recentlyClosedTabs].slice(0, 10);
          // Remove the tabs to close
          draft.tabs = draft.tabs.filter(tab => 
            tab.id === tabId || // Keep the specified tab
            tab.pinned || // Keep pinned tabs
            !tab.canClose // Keep tabs that can't be closed
          );
        });
      },

      closeAllExceptPinned: () => {
        const state = get();
        const tabsToClose = state.tabs.filter(tab => tab.canClose && !tab.pinned);
        
        set((draft) => {
          // Add to recently closed
          draft.recentlyClosedTabs = [...tabsToClose, ...draft.recentlyClosedTabs].slice(0, 10);
          // Keep only pinned tabs
          draft.tabs = draft.tabs.filter(tab => tab.pinned || !tab.canClose);
          // Update active tab if the current active tab was closed
          if (draft.activeTabId && !draft.tabs.find(t => t.id === draft.activeTabId)) {
            if (draft.tabs.length > 0) {
              draft.activeTabId = draft.tabs[0].id;
            } else {
              draft.activeTabId = null;
            }
          }
        });
      },
      
      closeTabsToRight: (tabId: string) => {
        const state = get();
        const tabIndex = state.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const tabsToClose = state.tabs.slice(tabIndex + 1).filter(tab => tab.canClose && !tab.pinned);
        
        set((draft) => {
          draft.recentlyClosedTabs = [...tabsToClose, ...draft.recentlyClosedTabs].slice(0, 10);
          draft.tabs = draft.tabs.filter((tab, index) => 
            index <= tabIndex || tab.pinned || !tab.canClose
          );
        });
      },
      
      closeTabsToLeft: (tabId: string) => {
        const state = get();
        const tabIndex = state.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const tabsToClose = state.tabs.slice(0, tabIndex).filter(tab => tab.canClose && !tab.pinned);
        
        set((draft) => {
          draft.recentlyClosedTabs = [...tabsToClose, ...draft.recentlyClosedTabs].slice(0, 10);
          draft.tabs = draft.tabs.filter((tab, index) => 
            index >= tabIndex || tab.pinned || !tab.canClose
          );
        });
      },
      
      // Search and organization
      searchTabs: (query: string) => {
        const state = get();
        const lowercaseQuery = query.toLowerCase();
        return state.tabs.filter(tab => 
          tab.title.toLowerCase().includes(lowercaseQuery) ||
          tab.module.toLowerCase().includes(lowercaseQuery) ||
          tab.path.toLowerCase().includes(lowercaseQuery)
        );
      },
      
      getTabsByModule: (module: string) => {
        const state = get();
        return state.tabs.filter(tab => tab.module === module);
      },
      
      getRecentTabs: (limit = 5) => {
        const state = get();
        return [...state.tabs]
          .sort((a, b) => b.lastAccessed - a.lastAccessed)
          .slice(0, limit);
      },
      
      getAccessibleTabs: () => {
        const state = get();
        return state.tabs.filter(tab => 
          validateTabPermissions(tab, state.currentUserRole, state.userPermissions)
        );
      },

      // Get tab by ID
      getTabById: (tabId: string) => {
        const state = get();
        return state.tabs.find(tab => tab.id === tabId) || null;
      },
      
      // RBAC operations
      validateTabAccess: (tabId: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab) return false;
        
        return validateTabPermissions(tab, state.currentUserRole, state.userPermissions);
      },
      
      updateUserPermissions: (permissions: string[]) => {
        set((draft) => {
          draft.userPermissions = permissions;
        });
      },
      
      setUserRole: (role: string) => {
        set((draft) => {
          draft.currentUserRole = role;
        });
      },
      
      // State management
      saveTabState: (tabId: string, state: Partial<TabState>) => {
        set((draft) => {
          const tab = draft.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.state = { ...tab.state, ...state };
          }
        });
      },
      
      getTabState: (tabId: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        return tab?.state || null;
      },
      
      clearTabState: (tabId: string) => {
        set((draft) => {
          const tab = draft.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.state = undefined;
          }
        });
      },
      
      // Hierarchical operations
      setHierarchicalMode: (enabled: boolean) => {
        set((draft) => {
          draft.enableHierarchicalMode = enabled;
        });
      },
      
      updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => {
        set((draft) => {
          draft.breadcrumbs = breadcrumbs;
        });
      },
      
      setCurrentPath: (path: string) => {
        set((draft) => {
          draft.currentPath = path;
          // Auto-generate breadcrumbs from path
          draft.breadcrumbs = get().generateBreadcrumbsFromPath(path);
        });
      },
      
      addHierarchicalTab: (tab: HierarchicalTab) => {
        set((draft) => {
          const existingIndex = draft.hierarchicalTabs.findIndex(t => t.id === tab.id);
          if (existingIndex >= 0) {
            draft.hierarchicalTabs[existingIndex] = tab;
          } else {
            draft.hierarchicalTabs.push(tab);
          }
        });
      },
      
      updateHierarchicalTab: (tabId: string, updates: Partial<HierarchicalTab>) => {
        set((draft) => {
          const tab = draft.hierarchicalTabs.find(t => t.id === tabId);
          if (tab) {
            Object.assign(tab, updates);
          }
        });
      },
      
      removeHierarchicalTab: (tabId: string) => {
        set((draft) => {
          draft.hierarchicalTabs = draft.hierarchicalTabs.filter(t => t.id !== tabId);
        });
      },
      
      getHierarchicalTab: (tabId: string) => {
        const state = get();
        return state.hierarchicalTabs.find(t => t.id === tabId) || null;
      },
      
      navigateToPath: (path: string) => {
        set((draft) => {
          draft.currentPath = path;
          draft.breadcrumbs = get().generateBreadcrumbsFromPath(path);
        });
      },
      
      generateBreadcrumbsFromPath: (path: string) => {
        if (!path) return [];
        
        const segments = path.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];
        
        let currentPath = '';
        segments.forEach((segment, index) => {
          currentPath += `/${segment}`;
          breadcrumbs.push({
            id: `breadcrumb-${index}`,
            label: segment.charAt(0).toUpperCase() + segment.slice(1),
            path: currentPath,
            isActive: index === segments.length - 1
          });
        });
        
        return breadcrumbs;
      },
      
      // Storage management functions
      clearCorruptedData: () => {
        try {
          const storageKey = 'tabbed-workspace-storage';
          const storedData = localStorage.getItem(storageKey);
          
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            const cleanedData = cleanPersistedData(parsedData.state);
            
            if (cleanedData) {
              localStorage.setItem(storageKey, JSON.stringify({ ...parsedData, state: cleanedData }));
              console.log('Corrupted data cleaned from localStorage');
            } else {
              localStorage.removeItem(storageKey);
              console.log('Invalid data removed from localStorage');
            }
          }
          
          // Force reload the store state
          const currentState = get();
          set({
            ...currentState,
            tabs: [],
            pinnedTabs: [],
            recentlyClosedTabs: [],
            activeTabId: null,
            maxTabs: 15,
            tabGroups: []
          });
          
        } catch (error) {
          console.error('Error clearing corrupted data:', error);
          get().resetStore();
        }
      },
      
      resetStore: () => {
        try {
          localStorage.removeItem('tabbed-workspace-storage');
          console.log('Tab store reset - localStorage cleared');
          
          // Reset to initial state
          set({
            tabs: [],
            activeTabId: null,
            pinnedTabs: [],
            recentlyClosedTabs: [],
            maxTabs: 15,
            tabGroups: [],
            currentUserRole: 'guest',
            userPermissions: [],
            _initialized: false,
            _lastTabId: 0,
            hierarchicalTabs: [],
            breadcrumbs: [],
            currentPath: '',
            enableHierarchicalMode: false
          });
          
        } catch (error) {
          console.error('Error resetting store:', error);
        }
      },
    })),
    {
      name: 'tabbed-workspace-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        pinnedTabs: state.pinnedTabs,
        recentlyClosedTabs: state.recentlyClosedTabs,
        maxTabs: state.maxTabs,
        tabGroups: state.tabGroups,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error rehydrating tab store:', error);
          return;
        }
        
        if (state) {
          // Clean any corrupted data during rehydration
          const cleanedData = cleanPersistedData({
            tabs: state.tabs || [],
            pinnedTabs: state.pinnedTabs || [],
            recentlyClosedTabs: state.recentlyClosedTabs || [],
            maxTabs: state.maxTabs || 15,
            tabGroups: state.tabGroups || []
          });
          
          if (cleanedData) {
            // Update state with cleaned data
            Object.assign(state, cleanedData);
            console.log('Tab store rehydrated with cleaned data');
          } else {
            // Reset to defaults if data is completely corrupted
            Object.assign(state, {
              tabs: [],
              pinnedTabs: [],
              recentlyClosedTabs: [],
              maxTabs: 15,
              tabGroups: []
            });
            console.warn('Tab store reset due to corrupted data');
          }
        }
      },
    }
  ));

// Export convenience hooks
export const useActiveTab = () => {
  return useTabStore(state => {
    const { tabs, activeTabId } = state;
    return tabs.find(tab => tab.id === activeTabId) || null;
  });
};

export const usePinnedTabs = () => {
  return useTabStore(state => {
    const { tabs, pinnedTabs } = state;
    return tabs.filter(tab => pinnedTabs.includes(tab.id));
  });
};

export const useTabsByModule = (module: string) => {
  return useTabStore(state => state.getTabsByModule(module));
};