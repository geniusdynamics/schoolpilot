// ABOUTME: Stable ActionProvider implementation without infinite loops
// ABOUTME: Rewritten to avoid Zustand store cascading updates and context loops

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Action definition interface (simplified)
export interface StableActionDefinition {
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

// Action group interface (simplified)
export interface StableActionGroup {
  id: string;
  label: string;
  actions: StableActionDefinition[];
  module: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

// Context interface (simplified)
export interface StableActionContext {
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
interface StableActionProviderContextType {
  currentContext: StableActionContext | null;
  contextualActions: StableActionDefinition[];
  contextualGroups: StableActionGroup[];
  executeAction: (actionId: string, customContext?: Partial<StableActionContext>) => Promise<void>;
  registerAction: (action: StableActionDefinition) => void;
  registerActionGroup: (module: string, page: string, group: StableActionGroup) => void;
  getActionsForModule: (module: string) => StableActionGroup[];
  searchActions: (query: string) => StableActionDefinition[];
  getActionById: (actionId: string) => StableActionDefinition | null;
  updateContext: (updates: Partial<StableActionContext>) => void;
  setModuleContext: (module: string, submodule?: string, feature?: string) => void;
}

// Create the context
const StableActionProviderContext = createContext<StableActionProviderContextType | null>(null);

// ActionProvider props
interface StableActionProviderProps {
  children: ReactNode;
  defaultModule?: string;
  defaultSubmodule?: string;
  defaultFeature?: string;
}

// Stable ActionProvider component
export const StableActionProvider: React.FC<StableActionProviderProps> = ({
  children,
  defaultModule = 'dashboard',
  defaultSubmodule,
  defaultFeature
}) => {
  const { user } = useAuth();
  
  // Local state instead of Zustand store
  const [actions, setActions] = useState<Record<string, StableActionDefinition>>({});
  const [groups, setGroups] = useState<Record<string, StableActionGroup>>({});
  const [currentContext, setCurrentContext] = useState<StableActionContext | null>(null);
  
  // Refs to prevent infinite updates
  const lastContextUpdate = useRef<number>(0);
  const contextUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Build stable context
  const buildContext = useCallback((): StableActionContext | null => {
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
  }, [user?.id, user?.role, user?.fullName, user?.email, defaultModule, defaultSubmodule, defaultFeature]);

  // Update context with throttling
  useEffect(() => {
    const newContext = buildContext();
    
    if (newContext) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastContextUpdate.current;
      
      // Throttle updates to prevent loops
      if (timeSinceLastUpdate > 500) { // 500ms minimum between updates
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
  const registerAction = useCallback((action: StableActionDefinition) => {
    setActions(prev => ({
      ...prev,
      [action.id]: action
    }));
  }, []);

  const registerActionGroup = useCallback((module: string, page: string, group: StableActionGroup) => {
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
  const contextualActions = React.useMemo(() => {
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
  const contextualGroups = React.useMemo(() => {
    if (!currentContext) return [];
    
    return Object.values(groups).filter(group => {
      if (group.module !== currentContext.module) return false;
      if (group.requiredRoles && !group.requiredRoles.includes(currentContext.user.role)) return false;
      if (group.requiredPermissions && !group.requiredPermissions.every(p => currentContext.user.permissions.includes(p))) return false;
      
      return true;
    });
  }, [currentContext, groups]);

  // Action execution
  const executeAction = useCallback(async (actionId: string, customContext?: Partial<StableActionContext>) => {
    const action = actions[actionId];
    if (!action) {
      console.error(`Action not found: ${actionId}`);
      return;
    }

    const context = customContext ? { ...currentContext, ...customContext } : currentContext;
    
    try {
      if (action.onClick) {
        await action.onClick(context);
      }
    } catch (error) {
      console.error(`Error executing action ${actionId}:`, error);
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

  const updateContext = useCallback((updates: Partial<StableActionContext>) => {
    if (currentContext) {
      setCurrentContext({ ...currentContext, ...updates });
    }
  }, [currentContext]);

  const setModuleContext = useCallback((module: string, submodule?: string, feature?: string) => {
    updateContext({ module, submodule, feature });
  }, [updateContext]);

  // Context value
  const contextValue: StableActionProviderContextType = React.useMemo(() => ({
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
    <StableActionProviderContext.Provider value={contextValue}>
      {children}
    </StableActionProviderContext.Provider>
  );
};

// Hook to use the ActionProvider context
export const useStableActionProvider = (): StableActionProviderContextType => {
  const context = useContext(StableActionProviderContext);
  
  if (!context) {
    throw new Error('useStableActionProvider must be used within a StableActionProvider');
  }
  
  return context;
};

// Hook for action execution with automatic context
export const useActionExecution = () => {
  const { executeAction, currentContext } = useStableActionProvider();
  
  return {
    executeAction,
    canExecuteAction: (actionId: string) => {
      if (!currentContext) return false;
      
      const { getActionById } = useStableActionProvider();
      const action = getActionById(actionId);
      if (!action) return false;
      
      // Simple permission check
      if (action.requiredRoles && !action.requiredRoles.includes(currentContext.user.role)) {
        return false;
      }
      if (action.permissions && !action.permissions.every(p => currentContext.user.permissions.includes(p))) {
        return false;
      }
      
      return true;
    },
    currentContext
  };
};

// Hook for contextual actions
export const useContextualActions = () => {
  const { contextualActions, contextualGroups, currentContext } = useStableActionProvider();
  
  return {
    actions: contextualActions,
    groups: contextualGroups,
    context: currentContext,
    hasActions: contextualActions.length > 0 || contextualGroups.length > 0
  };
};

// Export types
export type { StableActionProviderContextType };