// ABOUTME: ActionProvider context for managing contextual actions across the application
// ABOUTME: Provides React context wrapper around the action registry system with tab integration

import React, { createContext, useContext, useEffect, useMemo, ReactNode, useRef, useCallback } from 'react';
import { isEqual } from 'lodash'; // Add this import for deep equality check
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
  const { activeTabId, getTabById } = useTabStore();
  
  // Get selected tab IDs separately to avoid dependency on entire tabs array
  // Use a stable selector to prevent unnecessary re-renders
  const selectedTabIds = useTabStore(
    useCallback(
      (state) => {
        const ids = state.tabs.filter(tab => tab.selected).map(tab => tab.id);
        return ids;
      },
      []
    ),
    (prev, next) => {
      // Custom equality check for array of IDs
      if (prev.length !== next.length) return false;
      return prev.every((id, index) => id === next[index]);
    }
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

  // Build current action context based on active tab and user
  const actionContext = useMemo((): ActionContext | null => {
    if (!user) return null;

    const activeTab = activeTabId ? getTabById(activeTabId) : null;
    
    // Determine module context
    let module = defaultModule;
    let submodule = defaultSubmodule;
    let feature = defaultFeature;
    let metadata: Record<string, any> = {};

    if (activeTab) {
      // Extract context from active tab
      module = activeTab.module || defaultModule;
      submodule = activeTab.submodule || defaultSubmodule;
      feature = activeTab.feature || defaultFeature;
      metadata = activeTab.metadata || {};
    }

    return {
      activeTab: activeTab ? {
        id: activeTab.id,
        title: activeTab.title,
        path: activeTab.path || '',
        module: activeTab.module || module,
        submodule: activeTab.submodule,
        feature: activeTab.feature,
        metadata: activeTab.metadata
      } : undefined,
      selectedTabs: selectedTabIds,
      module,
      submodule,
      feature,
      user: {
        id: user.id || '',
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'guest',
        permissions: user.permissions || [],
        moduleAccess: user.moduleAccess || {},
        departmentId: user.departmentId,
        classIds: user.classIds
      },
      data: metadata,
      moduleData: activeTab?.moduleData
    };
  }, [user, activeTabId, selectedTabIds, getTabById, defaultModule, defaultSubmodule, defaultFeature]);

  // Get contextual actions and groups
  const contextualActions = useMemo(() => {
    return actionContext ? getActionsForContext(actionContext) : [];
  }, [actionContext, getActionsForContext]);

  const contextualGroups = useMemo(() => {
    return actionContext ? getActionGroupsForContext(actionContext) : [];
  }, [actionContext, getActionGroupsForContext]);

  // Update action registry context when our context changes
  const prevContextRef = useRef<ActionContext | null>(null);
  const isUpdatingContext = useRef(false);
  
  useEffect(() => {
    if (actionContext && 
        !isUpdatingContext.current && 
        (!prevContextRef.current || !isEqual(actionContext, prevContextRef.current))) {
      
      isUpdatingContext.current = true;
      
      // Use a timeout to prevent synchronous updates that could cause loops
      const timeoutId = setTimeout(() => {
        setCurrentContext(actionContext);
        prevContextRef.current = actionContext;
        isUpdatingContext.current = false;
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        isUpdatingContext.current = false;
      };
    }
  }, [actionContext, setCurrentContext]);

  // Action execution with context merging
  const executeAction = async (actionId: string, customContext?: Partial<ActionContext>) => {
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
  };

  // Context management helpers
  const updateContext = (updates: Partial<ActionContext>) => {
    if (!actionContext) return;
    
    const updatedContext = {
      ...actionContext,
      ...updates,
      user: { ...actionContext.user, ...updates.user },
      data: { ...actionContext.data, ...updates.data }
    };
    
    setCurrentContext(updatedContext);
  };

  const setModuleContext = (module: string, submodule?: string, feature?: string) => {
    updateContext({ module, submodule, feature });
  };

  // Wrapped action queries with current context
  const wrappedSearchActions = (query: string) => {
    return actionContext ? searchActions(query, actionContext) : [];
  };

  const wrappedGetActionsForModule = (module: string) => {
    if (!user) return [];
    return getActionsForModule(module, user.permissions || [], user.role || 'guest');
  };

  // Context value
  const contextValue: ActionProviderContextType = {
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
  };

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