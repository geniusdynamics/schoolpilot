# Tabbed Workspace System - Implementation Guide

## Overview

This guide provides comprehensive step-by-step instructions for implementing the tabbed workspace system in the Schoolpilot application. The implementation includes advanced features like tab pinning, grouping, bulk operations, performance optimizations, multi-module support, and role-based access control.

## Implementation Phases

### Phase 1: Core Tab Infrastructure
- Create tab management components with pinning and grouping
- Implement advanced tab state management with persistence
- Integrate with existing routing system and multi-module architecture
- Add performance optimizations (lazy loading, memory management)
- Implement role-based access control for tabs

### Phase 2: Advanced Action Registry
- Develop dynamic action registry system
- Create contextual action bar with bulk operations
- Implement keyboard shortcuts and accessibility features
- Add action history and analytics

### Phase 3: State Persistence & Performance
- Implement comprehensive tab state preservation
- Add memory management with configurable limits
- Optimize performance with lazy loading and virtualization
- Add state synchronization across browser tabs

### Phase 4: Advanced Navigation & Integration
- Modify existing navigation components for enhanced features
- Update module definitions with tab grouping support
- Add deep linking and URL state management
- Implement search and filtering capabilities

## Phase 1: Core Tab Infrastructure

### Step 1.1: Create Tab Store (Zustand)

**File**: `src/stores/tabStore.ts`

```typescript
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';

export interface Tab {
  id: string;
  title: string;
  path: string;
  module: string;
  submodule?: string;
  feature?: string;
  component?: React.ComponentType;
  isActive: boolean;
  closeable: boolean;
  isPinned: boolean;
  isDirty: boolean;
  order: number;
  createdAt: number;
  lastAccessedAt: number;
  groupId?: string;
  metadata?: Record<string, any>;
  permissions?: string[];
  userRole?: string;
  icon?: string;
  badge?: string | number;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
}

export interface TabState {
  scrollPosition: number;
  formData?: Record<string, any>;
  filters?: Record<string, any>;
  selectedItems?: string[];
  viewState?: Record<string, any>;
  lastUpdated: number;
}

export interface RecentlyClosedTab {
  tab: Tab;
  closedAt: number;
  state?: TabState;
}

interface TabStore {
  // State
  tabs: Tab[];
  groups: TabGroup[];
  activeTabId: string | null;
  tabStates: Record<string, TabState>;
  recentlyClosedTabs: RecentlyClosedTab[];
  maxTabs: number;
  maxRecentlyClosedTabs: number;
  searchQuery: string;
  currentUserRole: string;
  modulePermissions: Record<string, string[]>;
  
  // Basic Tab Actions
  createTab: (tab: Omit<Tab, 'id' | 'isActive' | 'order' | 'createdAt' | 'lastAccessedAt' | 'isPinned' | 'isDirty'>) => string;
  createTabWithPermissionCheck: (tab: Omit<Tab, 'id' | 'isActive' | 'order' | 'createdAt' | 'lastAccessedAt' | 'isPinned' | 'isDirty'>) => string | null;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  reorderTabs: (tabIds: string[]) => void;
  
  // Enhanced Tab Actions
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  togglePinTab: (tabId: string) => void;
  duplicateTab: (tabId: string) => string;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  restoreClosedTab: () => Tab | null;
  
  // Permission Management
  setUserRole: (role: string) => void;
  setModulePermissions: (module: string, permissions: string[]) => void;
  hasTabPermission: (tabId: string) => boolean;
  getAccessibleTabs: () => Tab[];
  
  // Bulk Operations
  closeAllTabs: () => void;
  closeAllExceptPinned: () => void;
  closeTabsToRight: (tabId: string) => void;
  closeTabsToLeft: (tabId: string) => void;
  closeTabsInGroup: (groupId: string) => void;
  
  // Group Management
  createGroup: (name: string, color: string) => string;
  deleteGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<TabGroup>) => void;
  addTabToGroup: (tabId: string, groupId: string) => void;
  removeTabFromGroup: (tabId: string) => void;
  toggleGroupCollapse: (groupId: string) => void;
  
  // State Management
  saveTabState: (tabId: string, state: Partial<TabState>) => void;
  getTabState: (tabId: string) => TabState | null;
  clearTabState: (tabId: string) => void;
  
  // Search and Filter
  setSearchQuery: (query: string) => void;
  getFilteredTabs: () => Tab[];
  
  // Utilities
  getActiveTab: () => Tab | null;
  getTabById: (tabId: string) => Tab | null;
  findTabByPath: (path: string) => Tab | null;
  getTabsByGroup: (groupId: string) => Tab[];
  getPinnedTabs: () => Tab[];
  getUnpinnedTabs: () => Tab[];
  getTabsByModule: (module: string) => Tab[];
  getTabsBySubmodule: (module: string, submodule: string) => Tab[];
}

// Debounced state persistence
const debouncedStatePersistence = debounce((tabId: string, state: Partial<TabState>) => {
  // This will be implemented in the store
}, 300);

export const useTabStore = create<TabStore>()(subscribeWithSelector(persist(
    (set, get) => ({
      // Initial State
      tabs: [],
      groups: [],
      activeTabId: null,
      tabStates: {},
      recentlyClosedTabs: [],
      maxTabs: 15,
      maxRecentlyClosedTabs: 10,
      searchQuery: '',
      currentUserRole: '',
      modulePermissions: {},
      
      // Basic Tab Management
      createTab: (tabData) => {
        const state = get();
        const existingTab = state.findTabByPath(tabData.path);
        
        if (existingTab) {
          state.activateTab(existingTab.id);
          return existingTab.id;
        }
        
        const newTab: Tab = {
          ...tabData,
          id: uuidv4(),
          isActive: true,
          isPinned: false,
          isDirty: false,
          order: state.tabs.length,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        };
        
        // Enforce max tabs limit by removing oldest unpinned tab
        let updatedTabs = [...state.tabs];
        if (updatedTabs.length >= state.maxTabs) {
          const oldestUnpinnedTab = updatedTabs
            .filter(tab => tab.closeable && !tab.isPinned)
            .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)[0];
          if (oldestUnpinnedTab) {
            state.closeTab(oldestUnpinnedTab.id);
            updatedTabs = get().tabs;
          }
        }
        
        // Deactivate other tabs
        updatedTabs = updatedTabs.map(tab => ({ ...tab, isActive: false }));
        updatedTabs.push(newTab);
        
        set({ 
          tabs: updatedTabs, 
          activeTabId: newTab.id 
        });
        
        return newTab.id;
      },
      
      closeTab: (tabId) => {
        const state = get();
        const tab = state.getTabById(tabId);
        const tabIndex = state.tabs.findIndex(t => t.id === tabId);
        
        if (tabIndex === -1 || !tab) return;
        
        // Save to recently closed if not pinned
        if (!tab.isPinned) {
          const recentlyClosedTab: RecentlyClosedTab = {
            tab,
            closedAt: Date.now(),
            state: state.getTabState(tabId)
          };
          
          const updatedRecentlyClosed = [recentlyClosedTab, ...state.recentlyClosedTabs]
            .slice(0, state.maxRecentlyClosedTabs);
          
          set({ recentlyClosedTabs: updatedRecentlyClosed });
        }
        
        const updatedTabs = state.tabs.filter(t => t.id !== tabId);
        let newActiveTabId = state.activeTabId;
        
        // If removing active tab, switch to adjacent tab
        if (state.activeTabId === tabId) {
          if (updatedTabs.length > 0) {
            const newIndex = Math.min(tabIndex, updatedTabs.length - 1);
            newActiveTabId = updatedTabs[newIndex]?.id || null;
            if (newActiveTabId) {
              updatedTabs[newIndex].isActive = true;
            }
          } else {
            newActiveTabId = null;
          }
        }
        
        // Clean up tab state
        const { [tabId]: removedState, ...remainingStates } = state.tabStates;
        
        set({ 
          tabs: updatedTabs, 
          activeTabId: newActiveTabId,
          tabStates: remainingStates
        });
      },
      
      activateTab: (tabId) => {
        const state = get();
        const updatedTabs = state.tabs.map(tab => ({
          ...tab,
          isActive: tab.id === tabId,
          lastAccessedAt: tab.id === tabId ? Date.now() : tab.lastAccessedAt
        }));
        
        set({ 
          tabs: updatedTabs, 
          activeTabId: tabId 
        });
      },
      
      updateTab: (tabId, updates) => {
        const state = get();
        const updatedTabs = state.tabs.map(tab => 
          tab.id === tabId ? { ...tab, ...updates } : tab
        );
        
        set({ tabs: updatedTabs });
      },
      
      reorderTabs: (tabIds) => {
        const state = get();
        const tabMap = new Map(state.tabs.map(tab => [tab.id, tab]));
        const reorderedTabs = tabIds
          .map(id => tabMap.get(id))
          .filter(Boolean)
          .map((tab, index) => ({ ...tab!, order: index }));
        
        set({ tabs: reorderedTabs });
      },
      
      // Enhanced Tab Actions
      pinTab: (tabId) => {
        const state = get();
        state.updateTab(tabId, { isPinned: true });
      },
      
      unpinTab: (tabId) => {
        const state = get();
        state.updateTab(tabId, { isPinned: false });
      },
      
      togglePinTab: (tabId) => {
        const state = get();
        const tab = state.getTabById(tabId);
        if (tab) {
          state.updateTab(tabId, { isPinned: !tab.isPinned });
        }
      },
      
      duplicateTab: (tabId) => {
        const state = get();
        const originalTab = state.getTabById(tabId);
        if (!originalTab) return '';
        
        const duplicatedTab = {
          ...originalTab,
          title: `${originalTab.title} (Copy)`,
          closeable: true,
          isPinned: false,
          isDirty: false
        };
        
        return state.createTab(duplicatedTab);
      },
      
      markTabDirty: (tabId, isDirty) => {
        const state = get();
        state.updateTab(tabId, { isDirty });
      },
      
      restoreClosedTab: () => {
        const state = get();
        const recentTab = state.recentlyClosedTabs[0];
        if (!recentTab) return null;
        
        const restoredTabId = state.createTab({
          ...recentTab.tab,
          closeable: true
        });
        
        // Restore tab state if available
        if (recentTab.state) {
          state.saveTabState(restoredTabId, recentTab.state);
        }
        
        // Remove from recently closed
        set({
          recentlyClosedTabs: state.recentlyClosedTabs.slice(1)
        });
        
        return state.getTabById(restoredTabId);
      },
      
      // Permission Management
      setUserRole: (role) => {
        set({ currentUserRole: role });
      },
      
      setModulePermissions: (module, permissions) => {
        const state = get();
        set({
          modulePermissions: {
            ...state.modulePermissions,
            [module]: permissions
          }
        });
      },
      
      hasTabPermission: (tabId) => {
        const state = get();
        const tab = state.getTabById(tabId);
        if (!tab || !tab.permissions) return true;
        
        const userPermissions = state.modulePermissions[tab.module] || [];
        return tab.permissions.every(permission => 
          userPermissions.includes(permission)
        );
      },
      
      getAccessibleTabs: () => {
        const state = get();
        return state.tabs.filter(tab => state.hasTabPermission(tab.id));
      },
      
      createTabWithPermissionCheck: (tabData) => {
        const state = get();
        
        // Check permissions if specified
        if (tabData.permissions) {
          const userPermissions = state.modulePermissions[tabData.module] || [];
          const hasPermission = tabData.permissions.every(permission => 
            userPermissions.includes(permission)
          );
          
          if (!hasPermission) {
            console.warn('Insufficient permissions to create tab:', tabData.title);
            return null;
          }
        }
        
        return state.createTab(tabData);
      },
      
      // Bulk Operations
      closeAllTabs: () => {
        set({ 
          tabs: [], 
          activeTabId: null, 
          tabStates: {} 
        });
      },
      
      closeAllExceptPinned: () => {
        const state = get();
        const pinnedTabs = state.tabs.filter(tab => tab.isPinned);
        const newActiveTab = pinnedTabs.find(tab => tab.isActive) || pinnedTabs[0];
        
        set({
          tabs: pinnedTabs.map(tab => ({
            ...tab,
            isActive: tab.id === newActiveTab?.id
          })),
          activeTabId: newActiveTab?.id || null
        });
      },
      
      closeTabsToRight: (tabId) => {
        const state = get();
        const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex === -1) return;
        
        const tabsToKeep = state.tabs.slice(0, tabIndex + 1);
        const newActiveTab = tabsToKeep.find(tab => tab.isActive) || tabsToKeep[tabsToKeep.length - 1];
        
        set({
          tabs: tabsToKeep.map(tab => ({
            ...tab,
            isActive: tab.id === newActiveTab?.id
          })),
          activeTabId: newActiveTab?.id || null
        });
      },
      
      closeTabsToLeft: (tabId) => {
        const state = get();
        const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex === -1) return;
        
        const tabsToKeep = state.tabs.slice(tabIndex);
        const newActiveTab = tabsToKeep.find(tab => tab.isActive) || tabsToKeep[0];
        
        set({
          tabs: tabsToKeep.map(tab => ({
            ...tab,
            isActive: tab.id === newActiveTab?.id
          })),
          activeTabId: newActiveTab?.id || null
        });
      },
      
      closeTabsInGroup: (groupId) => {
        const state = get();
        const tabsToKeep = state.tabs.filter(tab => tab.groupId !== groupId);
        const newActiveTab = tabsToKeep.find(tab => tab.isActive) || tabsToKeep[0];
        
        set({
          tabs: tabsToKeep.map(tab => ({
            ...tab,
            isActive: tab.id === newActiveTab?.id
          })),
          activeTabId: newActiveTab?.id || null
        });
      },
      
      // Group Management
      createGroup: (name, color) => {
        const state = get();
        const newGroup: TabGroup = {
          id: uuidv4(),
          name,
          color,
          collapsed: false,
          order: state.groups.length
        };
        
        set({ groups: [...state.groups, newGroup] });
        return newGroup.id;
      },
      
      deleteGroup: (groupId) => {
        const state = get();
        // Remove group from tabs
        const updatedTabs = state.tabs.map(tab => 
          tab.groupId === groupId ? { ...tab, groupId: undefined } : tab
        );
        
        set({
          groups: state.groups.filter(group => group.id !== groupId),
          tabs: updatedTabs
        });
      },
      
      updateGroup: (groupId, updates) => {
        const state = get();
        const updatedGroups = state.groups.map(group => 
          group.id === groupId ? { ...group, ...updates } : group
        );
        
        set({ groups: updatedGroups });
      },
      
      addTabToGroup: (tabId, groupId) => {
        const state = get();
        state.updateTab(tabId, { groupId });
      },
      
      removeTabFromGroup: (tabId) => {
        const state = get();
        state.updateTab(tabId, { groupId: undefined });
      },
      
      toggleGroupCollapse: (groupId) => {
        const state = get();
        const group = state.groups.find(g => g.id === groupId);
        if (group) {
          state.updateGroup(groupId, { collapsed: !group.collapsed });
        }
      },
      
      // State Management
      saveTabState: (tabId, stateUpdate) => {
        const state = get();
        const currentState = state.tabStates[tabId] || {};
        const updatedState = {
          ...currentState,
          ...stateUpdate,
          lastUpdated: Date.now()
        };
        
        set({
          tabStates: {
            ...state.tabStates,
            [tabId]: updatedState
          }
        });
        
        // Use debounced persistence for performance
        debouncedStatePersistence(tabId, updatedState);
      },
      
      getTabState: (tabId) => {
        return get().tabStates[tabId] || null;
      },
      
      clearTabState: (tabId) => {
        const state = get();
        const { [tabId]: removed, ...remaining } = state.tabStates;
        set({ tabStates: remaining });
      },
      
      // Search and Filter
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },
      
      getFilteredTabs: () => {
        const state = get();
        if (!state.searchQuery) return state.tabs;
        
        const query = state.searchQuery.toLowerCase();
        return state.tabs.filter(tab => 
          tab.title.toLowerCase().includes(query) ||
          tab.path.toLowerCase().includes(query) ||
          tab.module.toLowerCase().includes(query)
        );
      },
      
      // Utilities
      getActiveTab: () => {
        const state = get();
        return state.tabs.find(tab => tab.id === state.activeTabId) || null;
      },
      
      getTabById: (tabId) => {
        return get().tabs.find(tab => tab.id === tabId) || null;
      },
      
      findTabByPath: (path) => {
        return get().tabs.find(tab => tab.path === path) || null;
      },
      
      getTabsByGroup: (groupId) => {
        return get().tabs.filter(tab => tab.groupId === groupId);
      },
      
      getPinnedTabs: () => {
        return get().tabs.filter(tab => tab.isPinned);
      },
      
      getUnpinnedTabs: () => {
        return get().tabs.filter(tab => !tab.isPinned);
      },
      
      getTabsByModule: (module) => {
        return get().tabs.filter(tab => tab.module === module);
      },
      
      getTabsBySubmodule: (module, submodule) => {
        return get().tabs.filter(tab => 
          tab.module === module && tab.submodule === submodule
        );
      },
    }),
    {
      name: 'schoolpilot-tabs',
      partialize: (state) => ({
        tabs: state.tabs.map(({ component, ...tab }) => tab), // Exclude component from persistence
        groups: state.groups,
        activeTabId: state.activeTabId,
        maxTabs: state.maxTabs,
        maxRecentlyClosedTabs: state.maxRecentlyClosedTabs,
        recentlyClosedTabs: state.recentlyClosedTabs.slice(0, 5) // Limit persisted recently closed tabs
      }),
      version: 2, // Increment version for migration
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migration logic for older versions
          return {
            ...persistedState,
            groups: [],
            recentlyClosedTabs: [],
            maxRecentlyClosedTabs: 10,
            searchQuery: '',
            tabs: (persistedState.tabs || []).map((tab: any) => ({
              ...tab,
              isPinned: false,
              isDirty: false,
              lastAccessedAt: tab.createdAt || Date.now(),
              groupId: undefined,
              metadata: {}
            }))
          };
        }
        return persistedState;
      }
    }
  )
));

// Performance monitoring
if (typeof window !== 'undefined') {
  useTabStore.subscribe(
    (state) => state.tabs.length,
    (tabCount) => {
      if (tabCount > 20) {
        console.warn('High number of tabs detected:', tabCount);
      }
    }
  );
}
```

### Step 1.2: Create Tab Bar Component

**File**: `src/components/tabs/TabBar.tsx`

```typescript
import React from 'react';
import { X, ChevronLeft, ChevronRight, Pin, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabStore } from '@/stores/tabStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { TabComponent } from './TabComponent';
import { TabGroupHeader } from './TabGroupHeader';

interface TabBarProps {
  className?: string;
  showSearch?: boolean;
  showBulkActions?: boolean;
  moduleFilter?: string;
}

export const TabBar: React.FC<TabBarProps> = ({ 
  className,
  showSearch = true,
  showBulkActions = true,
  moduleFilter
}) => {
  const { 
    tabs, 
    groups,
    activeTabId, 
    searchQuery,
    setSearchQuery,
    getFilteredTabs,
    getAccessibleTabs,
    closeAllTabs,
    closeAllExceptPinned,
    restoreClosedTab,
    recentlyClosedTabs,
    getTabsByModule
  } = useTabStore();
  
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const [showSearchInput, setShowSearchInput] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  let filteredTabs = getFilteredTabs();
  
  // Apply module filter if specified
  if (moduleFilter) {
    filteredTabs = filteredTabs.filter(tab => tab.module === moduleFilter);
  }
  
  // Apply permission filtering
  filteredTabs = filteredTabs.filter(tab => getAccessibleTabs().includes(tab));
  const pinnedTabs = filteredTabs.filter(tab => tab.isPinned);
  const unpinnedTabs = filteredTabs.filter(tab => !tab.isPinned);
  
  // Group tabs by their groupId
  const groupedTabs = React.useMemo(() => {
    const grouped: Record<string, typeof filteredTabs> = {};
    const ungrouped: typeof filteredTabs = [];
    
    filteredTabs.forEach(tab => {
      if (tab.groupId) {
        if (!grouped[tab.groupId]) {
          grouped[tab.groupId] = [];
        }
        grouped[tab.groupId].push(tab);
      } else {
        ungrouped.push(tab);
      }
    });
    
    return { grouped, ungrouped };
  }, [filteredTabs]);
  
  const scrollTabs = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = 200;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(
          container.scrollWidth - container.clientWidth,
          scrollPosition + scrollAmount
        );
    
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };
  
  const toggleSearch = () => {
    setShowSearchInput(!showSearchInput);
    if (!showSearchInput) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };
  
  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollContainerRef.current 
    ? scrollPosition < scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
    : false;
  
  if (tabs.length === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      "flex flex-col bg-gray-50 border-b border-gray-200",
      className
    )}>
      {/* Search Bar */}
      {showSearch && showSearchInput && (
        <div className="px-4 py-2 border-b border-gray-200">
          <Input
            ref={searchInputRef}
            placeholder="Search tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>
      )}
      
      {/* Tab Bar */}
      <div className="flex items-center">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollTabs('left')}
            className="flex-shrink-0 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        
        {/* Tab Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 flex overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Pinned Tabs */}
          {pinnedTabs.map((tab) => (
            <TabComponent key={tab.id} tab={tab} />
          ))}
          
          {/* Separator between pinned and unpinned */}
          {pinnedTabs.length > 0 && unpinnedTabs.length > 0 && (
            <div className="w-px bg-gray-300 mx-1 self-stretch" />
          )}
          
          {/* Grouped Tabs */}
          {Object.entries(groupedTabs.grouped).map(([groupId, groupTabs]) => {
            const group = groups.find(g => g.id === groupId);
            if (!group) return null;
            
            return (
              <div key={groupId} className="flex">
                <TabGroupHeader group={group} tabs={groupTabs} />
                {!group.collapsed && groupTabs.map((tab) => (
                  <TabComponent key={tab.id} tab={tab} />
                ))}
              </div>
            );
          })}
          
          {/* Ungrouped Tabs */}
          {groupedTabs.ungrouped.filter(tab => !tab.isPinned).map((tab) => (
            <TabComponent key={tab.id} tab={tab} />
          ))}
        </div>
        
        {/* Scroll Right Button */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollTabs('right')}
            className="flex-shrink-0 px-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1 px-2">
          {/* Search Toggle */}
          {showSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSearch}
              className={cn(
                "p-2",
                showSearchInput && "bg-blue-100 text-blue-600"
              )}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          
          {/* Bulk Actions Menu */}
          {showBulkActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={closeAllExceptPinned}>
                  Close All Except Pinned
                </DropdownMenuItem>
                <DropdownMenuItem onClick={closeAllTabs}>
                  Close All Tabs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={restoreClosedTab}
                  disabled={recentlyClosedTabs.length === 0}
                >
                  Restore Last Closed Tab
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Step 1.3: Create Tab Component

**File**: `src/components/tabs/TabComponent.tsx`

```typescript
import React from 'react';
import { X, Pin, Copy, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabStore, Tab as TabType } from '@/stores/tabStore';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';

interface TabComponentProps {
  tab: TabType;
  className?: string;
}

export const TabComponent: React.FC<TabComponentProps> = ({ tab, className }) => {
  const { 
    activateTab, 
    closeTab,
    pinTab,
    unpinTab,
    duplicateTab,
    closeTabsToRight,
    closeTabsToLeft,
    groups
  } = useEnhancedTabStore();
  
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  
  const handleTabClick = () => {
    activateTab(tab.id);
  };
  
  const handleTabClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tab.id);
  };
  
  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tab.isPinned) {
      unpinTab(tab.id);
    } else {
      pinTab(tab.id);
    }
  };
  
  const handleDuplicate = () => {
    duplicateTab(tab.id);
    setShowContextMenu(false);
  };
  
  const handleCloseToRight = () => {
    closeTabsToRight(tab.id);
    setShowContextMenu(false);
  };
  
  const handleCloseToLeft = () => {
    closeTabsToLeft(tab.id);
    setShowContextMenu(false);
  };
  
  const group = tab.groupId ? groups.find(g => g.id === tab.groupId) : null;
  
  return (
    <div
      onClick={handleTabClick}
      className={cn(
        "flex items-center px-3 py-2 border-r border-gray-200 cursor-pointer",
        "min-w-0 flex-shrink-0 max-w-xs group transition-all duration-200",
        "relative",
        tab.isActive
          ? "bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm"
          : "bg-gray-50 text-gray-700 hover:bg-gray-100",
        tab.isPinned && "bg-blue-50",
        className
      )}
      style={{
        borderLeftColor: group?.color,
        borderLeftWidth: group ? '3px' : undefined
      }}
    >
      {/* Pin Indicator */}
      {tab.isPinned && (
        <Pin className="h-3 w-3 mr-1 text-blue-500 flex-shrink-0" />
      )}
      
      {/* Dirty Indicator */}
      {tab.isDirty && (
        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 flex-shrink-0" />
      )}
      
      {/* Tab Title */}
      <span className="truncate text-sm font-medium mr-2 flex-1">
        {tab.title}
      </span>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Pin Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePinToggle}
          className={cn(
            "p-0 h-5 w-5 rounded-full hover:bg-gray-200",
            tab.isPinned && "opacity-100 text-blue-500"
          )}
          title={tab.isPinned ? "Unpin tab" : "Pin tab"}
        >
          <Pin className={cn(
            "h-3 w-3",
            tab.isPinned && "fill-current"
          )} />
        </Button>
        
        {/* Context Menu */}
        <DropdownMenu open={showContextMenu} onOpenChange={setShowContextMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-5 w-5 rounded-full hover:bg-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Tab
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCloseToLeft}>
              Close Tabs to Left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCloseToRight}>
              Close Tabs to Right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                closeTab(tab.id);
                setShowContextMenu(false);
              }}
              className="text-red-600"
            >
              <X className="h-4 w-4 mr-2" />
              Close Tab
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Close Button */}
        {tab.closeable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTabClose}
            className={cn(
              "p-0 h-5 w-5 rounded-full hover:bg-red-100 hover:text-red-600",
              tab.isActive && "opacity-100"
            )}
            title="Close tab"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
```

### Step 1.4: Create Tab Group Header Component

**File**: `src/components/tabs/TabGroupHeader.tsx`

```typescript
import React from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabStore, TabGroup, Tab } from '@/stores/tabStore';
import { Button } from '@/components/ui/Button';

interface TabGroupHeaderProps {
  group: TabGroup;
  tabs: Tab[];
  className?: string;
}

export const TabGroupHeader: React.FC<TabGroupHeaderProps> = ({ 
  group, 
  tabs, 
  className 
}) => {
  const { 
    toggleGroupCollapse,
    closeTabsInGroup,
    deleteGroup
  } = useEnhancedTabStore();
  
  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGroupCollapse(group.id);
  };
  
  const handleCloseGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeTabsInGroup(group.id);
  };
  
  return (
    <div
      className={cn(
        "flex items-center px-2 py-2 bg-gray-100 border-r border-gray-200",
        "min-w-0 flex-shrink-0 group cursor-pointer",
        className
      )}
      style={{ borderTopColor: group.color, borderTopWidth: '2px' }}
      onClick={handleToggleCollapse}
    >
      {/* Collapse/Expand Icon */}
      {group.collapsed ? (
        <ChevronRight className="h-3 w-3 mr-1 text-gray-500" />
      ) : (
        <ChevronDown className="h-3 w-3 mr-1 text-gray-500" />
      )}
      
      {/* Group Name */}
      <span className="text-xs font-medium text-gray-600 mr-1">
        {group.name}
      </span>
      
      {/* Tab Count */}
      <span className="text-xs text-gray-400 mr-2">
        ({tabs.length})
      </span>
      
      {/* Close Group Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCloseGroup}
        className="p-0 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 hover:text-red-600"
        title="Close all tabs in group"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
```

### Step 1.5: Create Tab Content Container

**File**: `src/components/tabs/TabContent.tsx`

```typescript
import React, { Suspense } from 'react';
import { useTabStore } from '@/stores/tabStore';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface TabContentProps {
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ className }) => {
  const { tabs, activeTabId, getActiveTab } = useTabStore();
  const activeTab = getActiveTab();
  
  if (!activeTab) {
    return (
      <div className={cn(
        "flex-1 flex items-center justify-center text-gray-500",
        className
      )}>
        <div className="text-center">
          <p className="text-lg font-medium">No active tab</p>
          <p className="text-sm">Select a page from the navigation menu</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "h-full",
            tab.isActive ? "block" : "hidden"
          )}
        >
          <ErrorBoundary
            fallback={
              <div className="p-8 text-center">
                <p className="text-red-600 font-medium">Error loading tab content</p>
                <p className="text-sm text-gray-500 mt-2">
                  There was an error loading the content for "{tab.title}"
                </p>
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center p-8">
                  <Spinner size="lg" />
                  <span className="ml-2 text-gray-600">Loading {tab.title}...</span>
                </div>
              }
            >
              <TabContentRenderer tab={tab} />
            </Suspense>
          </ErrorBoundary>
        </div>
      ))}
    </div>
  );
};

// Separate component for rendering tab content
interface TabContentRendererProps {
  tab: Tab;
}

const TabContentRenderer: React.FC<TabContentRendererProps> = ({ tab }) => {
  const { saveTabState, getTabState } = useTabStore();
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Restore scroll position when tab becomes active
  React.useEffect(() => {
    if (tab.isActive && containerRef.current) {
      const savedState = getTabState(tab.id);
      if (savedState?.scrollPosition) {
        containerRef.current.scrollTop = savedState.scrollPosition;
      }
    }
  }, [tab.isActive, tab.id, getTabState]);
  
  // Save scroll position when tab becomes inactive
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !tab.isActive) return;
    
    const handleScroll = () => {
      saveTabState(tab.id, {
        scrollPosition: container.scrollTop
      });
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [tab.isActive, tab.id, saveTabState]);
  
  // Render the tab's component
  const Component = tab.component;
  
  if (!Component) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No component defined for this tab</p>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className="h-full overflow-auto"
    >
      <Component />
    </div>
  );
};
```

## Phase 2: Contextual Action Bar

### Step 2.1: Create Action Registry Context

**File**: `src/contexts/ActionContext.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ActionDefinition {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  visible?: boolean;
  tooltip?: string;
  shortcut?: string;
}

interface ActionContextValue {
  actions: Record<string, ActionDefinition[]>;
  registerActions: (key: string, actions: ActionDefinition[]) => void;
  unregisterActions: (key: string) => void;
  updateAction: (key: string, actionId: string, updates: Partial<ActionDefinition>) => void;
  getActionsForKey: (key: string) => ActionDefinition[];
}

const ActionContext = createContext<ActionContextValue | null>(null);

export const useActionRegistry = () => {
  const context = useContext(ActionContext);
  if (!context) {
    throw new Error('useActionRegistry must be used within ActionProvider');
  }
  return context;
};

interface ActionProviderProps {
  children: React.ReactNode;
}

export const ActionProvider: React.FC<ActionProviderProps> = ({ children }) => {
  const [actions, setActions] = useState<Record<string, ActionDefinition[]>>({});
  
  const registerActions = useCallback((key: string, newActions: ActionDefinition[]) => {
    setActions(prev => ({
      ...prev,
      [key]: newActions
    }));
  }, []);
  
  const unregisterActions = useCallback((key: string) => {
    setActions(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);
  
  const updateAction = useCallback((
    key: string, 
    actionId: string, 
    updates: Partial<ActionDefinition>
  ) => {
    setActions(prev => {
      const keyActions = prev[key] || [];
      const updatedActions = keyActions.map(action => 
        action.id === actionId ? { ...action, ...updates } : action
      );
      
      return {
        ...prev,
        [key]: updatedActions
      };
    });
  }, []);
  
  const getActionsForKey = useCallback((key: string) => {
    return actions[key] || [];
  }, [actions]);
  
  const value: ActionContextValue = {
    actions,
    registerActions,
    unregisterActions,
    updateAction,
    getActionsForKey
  };
  
  return (
    <ActionContext.Provider value={value}>
      {children}
    </ActionContext.Provider>
  );
};
```

### Step 2.2: Create Contextual Action Bar Component

**File**: `src/components/tabs/ContextualActionBar.tsx`

```typescript
import React from 'react';
import { cn } from '@/lib/utils';
import { useTabStore } from '@/stores/tabStore';
import { useActionRegistry, ActionDefinition } from '@/contexts/ActionContext';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import * as Icons from 'lucide-react';

interface ContextualActionBarProps {
  className?: string;
}

export const ContextualActionBar: React.FC<ContextualActionBarProps> = ({ 
  className 
}) => {
  const { getActiveTab } = useTabStore();
  const { getActionsForKey } = useActionRegistry();
  
  const activeTab = getActiveTab();
  
  if (!activeTab) {
    return null;
  }
  
  const actionKey = `${activeTab.module}:${activeTab.path}`;
  const actions = getActionsForKey(actionKey).filter(action => 
    action.visible !== false
  );
  
  if (actions.length === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200",
      className
    )}>
      {actions.map((action) => (
        <ActionButton key={action.id} action={action} />
      ))}
    </div>
  );
};

interface ActionButtonProps {
  action: ActionDefinition;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action }) => {
  const IconComponent = Icons[action.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
  
  const button = (
    <Button
      variant={action.variant}
      size="sm"
      onClick={action.onClick}
      disabled={action.disabled}
      className="flex items-center gap-2"
    >
      {IconComponent && <IconComponent className="h-4 w-4" />}
      <span>{action.label}</span>
      {action.shortcut && (
        <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 rounded">
          {action.shortcut}
        </kbd>
      )}
    </Button>
  );
  
  if (action.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{action.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return button;
};
```

## Integration Instructions

### Step 3: Update Layout Component

**File**: `src/components/Layout.tsx` (modifications)

```typescript
// Add these imports
import { TabBar } from './tabs/TabBar';
import { TabContent } from './tabs/TabContent';
import { ContextualActionBar } from './tabs/ContextualActionBar';
import { ActionProvider } from '@/contexts/ActionContext';
import { useTabStore } from '@/stores/tabStore';

// Modify the Layout component to include tab functionality
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { tabs } = useTabStore();
  const showTabInterface = tabs.length > 0;
  
  return (
    <ActionProvider>
      <div className="h-screen flex flex-col">
        {/* Existing Header */}
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Existing Sidebars */}
          <PrimarySidebar />
          <SecondarySidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Existing Breadcrumbs */}
            <BreadcrumbNavigation />
            
            {/* Tab Interface */}
            {showTabInterface ? (
              <>
                <TabBar />
                <ContextualActionBar />
                <TabContent className="flex-1 overflow-hidden" />
              </>
            ) : (
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </ActionProvider>
  );
};
```

### Step 4: Create Tab Navigation Hook

**File**: `src/hooks/useTabNavigation.ts`

```typescript
import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabStore } from '@/stores/tabStore';
import { PageComponentLoader } from '@/core/PageComponentLoader';

export const useTabNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTab, findTabByPath, setActiveTab } = useTabStore();
  
  const openInTab = useCallback(async (
    path: string, 
    title: string, 
    module: string
  ) => {
    // Check if tab already exists
    const existingTab = findTabByPath(path);
    if (existingTab) {
      setActiveTab(existingTab.id);
      navigate(path);
      return;
    }
    
    // Load the component for this path
    try {
      const component = await PageComponentLoader.loadComponent(path);
      
      // Create new tab
      const tabId = addTab({
        title,
        path,
        module,
        component,
        closeable: true
      });
      
      // Navigate to the path
      navigate(path);
    } catch (error) {
      console.error('Failed to load component for tab:', error);
      // Fallback to regular navigation
      navigate(path);
    }
  }, [navigate, findTabByPath, setActiveTab, addTab]);
  
  const openInCurrentView = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);
  
  return {
    openInTab,
    openInCurrentView,
    currentPath: location.pathname
  };
};
```

## Next Steps

1. **Test Phase 1**: Implement and test the basic tab functionality
2. **Implement Phase 2**: Add contextual action bars
3. **Update Navigation**: Modify existing navigation components to use tab system
4. **Add State Persistence**: Implement advanced state management features
5. **Performance Optimization**: Add lazy loading and memory management
6. **Testing**: Create comprehensive test suite for tab functionality

## Migration Strategy

1. **Feature Flag**: Implement behind a feature flag for gradual rollout
2. **Backward Compatibility**: Ensure existing navigation still works
3. **User Preference**: Allow users to toggle between tab and traditional modes
4. **Progressive Enhancement**: Start with core modules and expand gradually

This implementation guide provides the foundation for the tabbed workspace system while maintaining compatibility with the existing Schoolpilot architecture.