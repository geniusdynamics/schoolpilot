/**
 * Comprehensive TabStore implementation with Zustand, RBAC integration, and state persistence
 * Based on the Comprehensive Tabbed Workspace System documentation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Tab, TabState, TabStore } from '../types/tabbedWorkspace';
import { HierarchicalTab, BreadcrumbItem } from '../types/hierarchical';
import { rbacService } from '../core/rbacService';

interface TabStoreState extends TabStore {
  // Internal state
  _initialized: boolean;
  _lastTabId: number;
  // Hierarchical state
  hierarchicalTabs: HierarchicalTab[];
  breadcrumbs: BreadcrumbItem[];
  currentPath: string;
  enableHierarchicalMode: boolean;
  
  // Additional tab operations
  closeOtherTabs: (tabId: string) => void;
  
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
      _initialized: false,
      _lastTabId: 0,
      
      // Initialize store with user context
      initialize: async () => {
        const state = get();
        if (state._initialized) return;
        
        try {
          // Get current user role and permissions from RBAC service
          const userRole = await rbacService.getCurrentUserRole();
          const userPermissions = await rbacService.getUserPermissions();
          
          set((draft) => {
            draft.currentUserRole = userRole || 'guest';
            draft.userPermissions = userPermissions || [];
            draft._initialized = true;
          });
        } catch (error) {
          console.error('Failed to initialize tab store:', error);
          set((draft) => {
            draft.currentUserRole = 'guest';
            draft.userPermissions = [];
            draft._initialized = true;
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
        
        // Check if user has permission to create tabs in this module
        const hasModuleAccess = await rbacService.checkModuleAccess(state.currentUserRole, tabData.module);
        if (!hasModuleAccess) {
          throw new Error(`Access denied: No permission to access module ${tabData.module}`);
        }
        
        // Check tab limit
        if (state.tabs.length >= state.maxTabs) {
          throw new Error(`Maximum tab limit (${state.maxTabs}) reached`);
        }
        
        const newTab: Tab = {
          ...tabData,
          id: generateTabId(),
          lastAccessed: Date.now(),
          userRole: state.currentUserRole,
        };
        
        // Validate tab permissions
        if (!validateTabPermissions(newTab, state.currentUserRole, state.userPermissions)) {
          throw new Error('Insufficient permissions to create this tab');
        }
        
        set((draft) => {
          draft.tabs.push(newTab);
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
        
        // Validate access
        if (!validateTabPermissions(tab, state.currentUserRole, state.userPermissions)) {
          throw new Error('Insufficient permissions to access this tab');
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