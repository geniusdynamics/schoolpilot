// ABOUTME: ActionProvider context for managing contextual actions across the application
// ABOUTME: Provides React context wrapper around the action registry system with tab integration

import React, { createContext, useContext, useEffect, useMemo, ReactNode, useRef, useCallback } from 'react';
import { useActionRegistry, ActionDefinition, ActionGroup, ActionContext } from '../services/actionRegistry';
import { useTabStore } from '../stores/tabStore';
import { useAuth } from './AuthContext';

// ActionProvider context interface
interface ActionProviderContextType {
  // Current action context
  currentContext: ActionContext | null;
  
  // Actions for current context
  contextualActions: ActionDefinition[];
  contextualGroups: ActionGroup[];
  
  // Action execution
  executeAction: (actionId: string, customContext?: Partial<ActionContext>) => Promise<void>;
  
  // Action registration (for dynamic actions)
  registerAction: (action: ActionDefinition) => void;
  registerActionGroup: (module: string, page: string, group: ActionGroup) => void;
  
  // Action queries
  getActionsForModule: (module: string) => ActionGroup[];
  searchActions: (query: string) => ActionDefinition[];
  getActionById: (actionId: string) => ActionDefinition | null;
  
  // Context management
  updateContext: (updates: Partial<ActionContext>) => void;
  setModuleContext: (module: string, submodule?: string, feature?: string) => void;
}

// Create the context
const ActionProviderContext = createContext<ActionProviderContextType | null>(null);

// ActionProvider props
interface ActionProviderProps {
  children: ReactNode;
  defaultModule?: string;
  defaultSubmodule?: string;
  defaultFeature?: string;
}

// ActionProvider component
export const ActionProvider: React.FC<ActionProviderProps> = ({
  children,
  defaultModule = 'dashboard',
  defaultSubmodule,
  defaultFeature
}) => {
  const { user } = useAuth();
  const { activeTabId, tabs } = useTabStore((state) => ({
    activeTabId: state.activeTabId,
    tabs: state.tabs
  }));
  
  // Get selected tab IDs and active tab in a stable way
  const selectedTabIds = useMemo(() => tabs.map(tab => tab.id), [tabs]);
  const activeTab = useMemo(() => 
    activeTabId ? tabs.find(tab => tab.id === activeTabId) || null : null, 
    [activeTabId, tabs]
  );
  const {
    registerAction,
    registerActionGroup,
    getActionsForContext,
    getActionGroupsForContext,
    getActionsForModule,
    searchActions,
    getActionById,
    executeAction: registryExecuteAction,
    setCurrentContext,
    currentContext
  } = useActionRegistry();

  // Memoize user object to prevent unnecessary re-renders
  const stableUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id || '',
      name: user.fullName || '',
      email: user.email || '',
      role: user.role || 'guest',
      permissions: user.permissions || [],
      moduleAccess: (user.moduleAccess && typeof user.moduleAccess === 'object' && !Array.isArray(user.moduleAccess)) 
        ? user.moduleAccess as Record<string, string[]>
        : {} as Record<string, string[]>,
      departmentId: undefined,
      classIds: undefined
    };
  }, [user?.id, user?.role, user?.fullName, user?.email, JSON.stringify(user?.permissions || [])]);

  // Build current action context based on active tab and user
  const actionContext = useMemo((): ActionContext | null => {
    if (!stableUser) return null;
    
    // Determine module context
    let module = defaultModule;
    let submodule = defaultSubmodule;
    let feature = defaultFeature;
    let metadata: Record<string, any> = {};

    if (activeTab) {
      // Extract context from active tab
      module = activeTab.module || defaultModule;
      submodule = (activeTab as any).submodule || defaultSubmodule;
      feature = (activeTab as any).feature || defaultFeature;
      metadata = activeTab.metadata || {};
    }

    return {
      activeTab: activeTab ? {
        id: activeTab.id,
        title: activeTab.title,
        path: activeTab.path || '',
        module: activeTab.module || module,
        submodule: (activeTab.metadata as any)?.submodule,
        feature: (activeTab.metadata as any)?.feature,
        metadata: activeTab.metadata
      } : undefined,
      selectedTabs: selectedTabIds,
      module,
      submodule,
      feature,
      user: stableUser,
      data: metadata,
      moduleData: (activeTab?.metadata as any)?.moduleData
    };
  }, [
    stableUser,
    activeTabId, 
    selectedTabIds.join(','), 
    defaultModule, 
    defaultSubmodule, 
    defaultFeature,
    activeTab?.id,
    activeTab?.module,
    activeTab?.path
  ]);

  // Get contextual actions and groups with debouncing
  const contextualActions = useMemo(() => {
    if (!actionContext) return [];
    
    try {
      return getActionsForContext(actionContext);
    } catch (error) {
      console.error('Error getting contextual actions:', error);
      return [];
    }
  }, [actionContext?.module, actionContext?.submodule, actionContext?.feature, actionContext?.user.id, actionContext?.user.role]);

  const contextualGroups = useMemo(() => {
    if (!actionContext) return [];
    
    try {
      return getActionGroupsForContext(actionContext);
    } catch (error) {
      console.error('Error getting contextual groups:', error);
      return [];
    }
  }, [actionContext?.module, actionContext?.submodule, actionContext?.feature, actionContext?.user.id, actionContext?.user.role]);

  // Update action registry context when our context changes
  const prevContextRef = useRef<ActionContext | null>(null);
  const isUpdatingContext = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTime = useRef<number>(0);
  
  useEffect(() => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    if (actionContext && !isUpdatingContext.current) {
      // Throttle updates to prevent excessive calls
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      const minUpdateInterval = 200; // Minimum 200ms between updates
      
      // Create a stable string representation for comparison
      const currentContextString = JSON.stringify({
        module: actionContext.module,
        submodule: actionContext.submodule,
        feature: actionContext.feature,
        userId: actionContext.user.id,
        userRole: actionContext.user.role,
        activeTabId: actionContext.activeTab?.id,
        selectedTabsCount: actionContext.selectedTabs?.length || 0
      });
      
      const prevContextString = prevContextRef.current ? JSON.stringify({
        module: prevContextRef.current.module,
        submodule: prevContextRef.current.submodule,
        feature: prevContextRef.current.feature,
        userId: prevContextRef.current.user.id,
        userRole: prevContextRef.current.user.role,
        activeTabId: prevContextRef.current.activeTab?.id,
        selectedTabsCount: prevContextRef.current.selectedTabs?.length || 0
      }) : null;
      
      if (currentContextString !== prevContextString) {
        isUpdatingContext.current = true;
        
        // Calculate delay based on time since last update
        const delay = Math.max(0, minUpdateInterval - timeSinceLastUpdate);
        
        // Debounce the update to prevent rapid successive calls
        updateTimeoutRef.current = setTimeout(() => {
          try {
            setCurrentContext(actionContext);
            prevContextRef.current = actionContext;
            lastUpdateTime.current = Date.now();
          } catch (error) {
            console.error('Error updating action context:', error);
          } finally {
            isUpdatingContext.current = false;
            updateTimeoutRef.current = null;
          }
        }, delay);
      }
    }
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      isUpdatingContext.current = false;
    };
  }, [actionContext]); // Removed setCurrentContext from dependencies

  // Action execution with context merging
  const executeAction = useCallback(async (actionId: string, customContext?: Partial<ActionContext>) => {
    if (!actionContext) {
      console.error('No action context available for execution');
      return;
    }

    const mergedContext = customContext ? {
      ...actionContext,
      ...customContext,
      user: { ...actionContext.user, ...customContext.user },
      data: { ...actionContext.data, ...customContext.data }
    } : actionContext;

    await registryExecuteAction(actionId, mergedContext);
  }, [actionContext, registryExecuteAction]);

  // Context management helpers
  const updateContext = useCallback((updates: Partial<ActionContext>) => {
    if (!actionContext) return;
    
    const updatedContext = {
      ...actionContext,
      ...updates,
      user: { ...actionContext.user, ...updates.user },
      data: { ...actionContext.data, ...updates.data }
    };
    
    setCurrentContext(updatedContext);
  }, [actionContext, setCurrentContext]);

  const setModuleContext = useCallback((module: string, submodule?: string, feature?: string) => {
    updateContext({ module, submodule, feature });
  }, [updateContext]);

  // Wrapped action queries with current context
  const wrappedSearchActions = useCallback((query: string) => {
    return actionContext ? searchActions(query, actionContext) : [];
  }, [actionContext, searchActions]);

  const wrappedGetActionsForModule = useCallback((module: string) => {
    if (!user) return [];
    return getActionsForModule(module, user.permissions || [], user.role || 'guest');
  }, [user, getActionsForModule]);

  // Context value
  const contextValue: ActionProviderContextType = useMemo(() => ({
    currentContext: actionContext,
    contextualActions,
    contextualGroups,
    executeAction,
    registerAction,
    registerActionGroup,
    getActionsForModule: wrappedGetActionsForModule,
    searchActions: wrappedSearchActions,
    getActionById,
    updateContext,
    setModuleContext
  }), [
    actionContext,
    contextualActions,
    contextualGroups,
    executeAction,
    registerAction,
    registerActionGroup,
    wrappedGetActionsForModule,
    wrappedSearchActions,
    getActionById,
    updateContext,
    setModuleContext
  ]);

  return (
    <ActionProviderContext.Provider value={contextValue}>
      {children}
    </ActionProviderContext.Provider>
  );
};

// Hook to use the ActionProvider context
export const useActionProvider = (): ActionProviderContextType => {
  const context = useContext(ActionProviderContext);
  
  if (!context) {
    throw new Error('useActionProvider must be used within an ActionProvider');
  }
  
  return context;
};

// Hook for action execution with automatic context
export const useActionExecution = () => {
  const { executeAction, currentContext } = useActionProvider();
  const actionRegistry = useActionRegistry();
  
  return {
    executeAction,
    canExecuteAction: (actionId: string) => {
      if (!currentContext) return false;
      
      const action = actionRegistry.getActionById(actionId);
      if (!action) return false;
      
      return actionRegistry.hasPermission(
        action,
        currentContext.user.permissions,
        currentContext.user.role
      );
    },
    currentContext
  };
};

// Hook for contextual actions
export const useContextualActions = () => {
  const { contextualActions, contextualGroups, currentContext } = useActionProvider();
  
  return {
    actions: contextualActions,
    groups: contextualGroups,
    context: currentContext,
    hasActions: contextualActions.length > 0 || contextualGroups.length > 0
  };
};

// Export types
export type { ActionProviderContextType };