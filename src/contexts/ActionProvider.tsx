import { logger } from '@/utils/logging';

// ABOUTME: ActionProvider context for managing contextual actions across the application
// ABOUTME: Stable implementation using React state instead of Zustand to prevent infinite loops

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useActionRegistry } from '@/services/ui/actionRegistry';

// Action definition interface
export interface ActionDefinition {
  id: string;
  label: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick?: (context?: any) => void | Promise<void>;
  disabled?: boolean;
  visible?: boolean;
  tooltip?: string;
  module?: string;
  submodule?: string;
  feature?: string;
  permissions?: string[];
  requiredRoles?: string[];
}

// Action group interface
export interface ActionGroup {
  id: string;
  label: string;
  actions: ActionDefinition[];
  module: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

// Context interface
export interface ActionContext {
  module: string;
  submodule?: string;
  feature?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
  };
  data?: Record<string, any>;
}

// ActionProvider context interface
interface ActionProviderContextType {
  currentContext: ActionContext | null;
  contextualActions: ActionDefinition[];
  contextualGroups: ActionGroup[];
  executeAction: (actionId: string, customContext?: Partial<ActionContext>) => Promise<void>;
  registerAction: (action: ActionDefinition) => void;
  registerActionGroup: (module: string, page: string, group: ActionGroup) => void;
  getActionsForModule: (module: string) => ActionGroup[];
  searchActions: (query: string) => ActionDefinition[];
  getActionById: (actionId: string) => ActionDefinition | null;
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

// ActionProvider component - Stable implementation without Zustand
export const ActionProvider: React.FC<ActionProviderProps> = ({
  children,
  defaultModule = 'dashboard',
  defaultSubmodule,
  defaultFeature
}) => {
  const { user } = useAuth();
  
  // Local state instead of Zustand store to prevent infinite loops
  const [actions, setActions] = useState<Record<string, ActionDefinition>>({});
  const [groups, setGroups] = useState<Record<string, ActionGroup>>({});
  const [currentContext, setCurrentContext] = useState<ActionContext | null>(null);
  
  // Refs to prevent infinite updates
  const lastContextUpdate = useRef<number>(0);
  const contextUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Build stable context
  const buildContext = useCallback((): ActionContext | null => {
    if (!user) return null;
    
    return {
      module: defaultModule,
      submodule: defaultSubmodule,
      feature: defaultFeature,
      user: {
        id: user.id || '',
        name: user.fullName || '',
        email: user.email || '',
        role: user.role || 'guest',
        permissions: user.permissions || []
      },
      data: {}
    };
  }, [user, defaultModule, defaultSubmodule, defaultFeature]);

  // Update context with throttling to prevent infinite loops
  useEffect(() => {
    const newContext = buildContext();
    
    if (newContext) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastContextUpdate.current;
      
      // Throttle updates to prevent loops (500ms minimum between updates)
      if (timeSinceLastUpdate > 500) {
        setCurrentContext(newContext);
        lastContextUpdate.current = now;
      } else {
        // Clear existing timeout
        if (contextUpdateTimeout.current) {
          clearTimeout(contextUpdateTimeout.current);
        }
        
        // Schedule delayed update
        contextUpdateTimeout.current = setTimeout(() => {
          setCurrentContext(newContext);
          lastContextUpdate.current = Date.now();
          contextUpdateTimeout.current = null;
        }, 500 - timeSinceLastUpdate);
      }
    }
    
    return () => {
      if (contextUpdateTimeout.current) {
        clearTimeout(contextUpdateTimeout.current);
        contextUpdateTimeout.current = null;
      }
    };
  }, [buildContext]);

  // Action registration
  const registerAction = useCallback((action: ActionDefinition) => {
    setActions(prev => ({
      ...prev,
      [action.id]: action
    }));
  }, []);

  const registerActionGroup = useCallback((module: string, page: string, group: ActionGroup) => {
    setGroups(prev => ({
      ...prev,
      [group.id]: { ...group, module }
    }));
    
    // Register individual actions from the group
    group.actions.forEach(action => {
      registerAction({ ...action, module, submodule: page });
    });
  }, [registerAction]);

  // Get contextual actions
  const contextualActions = useMemo(() => {
    if (!currentContext) return [];
    
    return Object.values(actions).filter(action => {
      // Basic module matching
      if (action.module && action.module !== currentContext.module) return false;
      if (action.submodule && action.submodule !== currentContext.submodule) return false;
      if (action.feature && action.feature !== currentContext.feature) return false;
      
      // Permission checking
      if (action.requiredRoles && !action.requiredRoles.includes(currentContext.user.role)) return false;
      if (action.permissions && !action.permissions.every(p => currentContext.user.permissions.includes(p))) return false;
      
      return true;
    });
  }, [currentContext, actions]);

  // Get contextual groups
  const contextualGroups = useMemo(() => {
    if (!currentContext) return [];
    
    return Object.values(groups).filter(group => {
      if (group.module !== currentContext.module) return false;
      if (group.requiredRoles && !group.requiredRoles.includes(currentContext.user.role)) return false;
      if (group.requiredPermissions && !group.requiredPermissions.every(p => currentContext.user.permissions.includes(p))) return false;
      
      return true;
    });
  }, [currentContext, groups]);

  // Action execution
  const executeAction = useCallback(async (actionId: string, customContext?: Partial<ActionContext>) => {
    const action = actions[actionId];
    if (!action) {
      logger.error(`Action not found: ${actionId}`);
      return;
    }

    const context = customContext ? { ...currentContext, ...customContext } : currentContext;
    
    try {
      if (action.onClick) {
        await action.onClick(context);
      }
    } catch (error) {
      logger.error(`Error executing action ${actionId}:`, error);
    }
  }, [actions, currentContext]);

  // Other methods
  const getActionsForModule = useCallback((module: string) => {
    return Object.values(groups).filter(group => group.module === module);
  }, [groups]);

  const searchActions = useCallback((query: string) => {
    const searchTerm = query.toLowerCase();
    return contextualActions.filter(action =>
      action.label.toLowerCase().includes(searchTerm) ||
      action.tooltip?.toLowerCase().includes(searchTerm) ||
      action.id.toLowerCase().includes(searchTerm)
    );
  }, [contextualActions]);

  const getActionById = useCallback((actionId: string) => {
    return actions[actionId] || null;
  }, [actions]);

  const updateContext = useCallback((updates: Partial<ActionContext>) => {
    if (currentContext) {
      setCurrentContext({ ...currentContext, ...updates });
    }
  }, [currentContext]);

  const setModuleContext = useCallback((module: string, submodule?: string, feature?: string) => {
    updateContext({ module, submodule, feature });
  }, [updateContext]);

  // Context value
  const contextValue: ActionProviderContextType = useMemo(() => ({
    currentContext,
    contextualActions,
    contextualGroups,
    executeAction,
    registerAction,
    registerActionGroup,
    getActionsForModule,
    searchActions,
    getActionById,
    updateContext,
    setModuleContext
  }), [
    currentContext,
    contextualActions,
    contextualGroups,
    executeAction,
    registerAction,
    registerActionGroup,
    getActionsForModule,
    searchActions,
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