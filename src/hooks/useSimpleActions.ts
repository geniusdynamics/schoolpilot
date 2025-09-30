/**
 * Simplified Action Registration Hook
 * Replaces the complex ActionRegistry with a simple, platform-aware action system
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { usePlatformInfo } from '../utils/platformDetection';

// ===== TYPES =====

export interface SimpleAction {
  id: string;
  label: string;
  icon: string | React.ComponentType;
  onClick: () => void | Promise<void>;
  
  // Optional properties
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  visible?: boolean;
  loading?: boolean;
  shortcut?: string;
  tooltip?: string;
  badge?: string | number;
  
  // Grouping and ordering
  group?: string;
  priority?: number;
  
  // Context
  module?: string;
  page?: string;
  requiredPermissions?: string[];
}

export interface ActionGroup {
  id: string;
  label: string;
  actions: SimpleAction[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  priority?: number;
}

export interface ActionStore {
  // State
  actions: Record<string, SimpleAction>;
  groups: Record<string, ActionGroup>;
  contextActions: SimpleAction[];
  currentContext: string | null;
  
  // Methods
  registerAction: (action: SimpleAction, context?: string) => void;
  registerActions: (actions: SimpleAction[], context?: string) => void;
  unregisterAction: (actionId: string, context?: string) => void;
  unregisterContext: (context: string) => void;
  updateAction: (actionId: string, updates: Partial<SimpleAction>) => void;
  getActionsForContext: (context: string) => SimpleAction[];
  setCurrentContext: (context: string | null) => void;
  clear: () => void;
}

// ===== STORE =====

export const useActionStore = create<ActionStore>()(subscribeWithSelector(
  (set, get) => ({
    // Initial state
    actions: {},
    groups: {},
    contextActions: [],
    currentContext: null,
    
    // Register a single action
    registerAction: (action, context) => {
      const state = get();
      const actionWithContext = {
        ...action,
        context: context || state.currentContext || 'global'
      };
      
      set({
        actions: {
          ...state.actions,
          [action.id]: actionWithContext
        }
      });
      
      // Update context actions if this matches current context
      if (context === state.currentContext || (!context && state.currentContext === 'global')) {
        get().updateContextActions();
      }
    },
    
    // Register multiple actions
    registerActions: (actions, context) => {
      const state = get();
      const newActions = { ...state.actions };
      const actionContext = context || state.currentContext || 'global';
      
      actions.forEach(action => {
        newActions[action.id] = {
          ...action,
          context: actionContext
        };
      });
      
      set({ actions: newActions });
      
      // Update context actions if any match current context
      if (context === state.currentContext || (!context && state.currentContext === 'global')) {
        get().updateContextActions();
      }
    },
    
    // Unregister an action
    unregisterAction: (actionId, context) => {
      const state = get();
      const action = state.actions[actionId];
      
      if (action && (!context || action.context === context)) {
        const { [actionId]: removed, ...remainingActions } = state.actions;
        set({ actions: remainingActions });
        get().updateContextActions();
      }
    },
    
    // Unregister all actions for a context
    unregisterContext: (context) => {
      const state = get();
      const filteredActions = Object.fromEntries(
        Object.entries(state.actions).filter(([_, action]) => action.context !== context)
      );
      
      set({ actions: filteredActions });
      get().updateContextActions();
    },
    
    // Update an existing action
    updateAction: (actionId, updates) => {
      const state = get();
      const action = state.actions[actionId];
      
      if (action) {
        set({
          actions: {
            ...state.actions,
            [actionId]: { ...action, ...updates }
          }
        });
        get().updateContextActions();
      }
    },
    
    // Get actions for a specific context
    getActionsForContext: (context) => {
      const state = get();
      return Object.values(state.actions)
        .filter(action => action.context === context && action.visible !== false)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    },
    
    // Set current context and update contextual actions
    setCurrentContext: (context) => {
      set({ currentContext: context });
      get().updateContextActions();
    },
    
    // Update contextual actions for current context
    updateContextActions: () => {
      const state = get();
      if (state.currentContext) {
        const contextActions = state.getActionsForContext(state.currentContext);
        set({ contextActions });
      } else {
        set({ contextActions: [] });
      }
    },
    
    // Clear all actions and state
    clear: () => {
      set({
        actions: {},
        groups: {},
        contextActions: [],
        currentContext: null
      });
    }
  })
));

// Add helper method to update contextual actions
const updateContextActions = () => {
  const state = useActionStore.getState();
  if (state.currentContext) {
    const contextActions = state.getActionsForContext(state.currentContext);
    useActionStore.setState({ contextActions });
  }
};

// ===== HOOKS =====

/**
 * Simple hook for registering actions in a component
 * Automatically handles cleanup on unmount
 */
export const useSimpleActions = (
  actions: SimpleAction[],
  context?: string,
  deps?: React.DependencyList
) => {
  const store = useActionStore();
  const { isMobile } = usePlatformInfo();
  const registeredActionsRef = useRef<Set<string>>(new Set());
  
  // Generate a unique context ID if none provided
  const contextId = useRef(context || `ctx_${Math.random().toString(36).substr(2, 9)}`);
  
  // Adapt actions for platform
  const adaptedActions = useCallback((actions: SimpleAction[]): SimpleAction[] => {
    if (!isMobile) return actions;
    
    // For mobile, prioritize primary actions and hide labels for space
    return actions.map(action => ({
      ...action,
      // Hide secondary actions on mobile if too many
      visible: action.visible !== false && (action.variant === 'primary' || actions.length <= 3),
      // Increase touch target priority
      priority: action.variant === 'primary' ? (action.priority || 0) + 100 : action.priority
    }));
  }, [isMobile]);
  
  // Track previous actions to prevent unnecessary re-renders
  const previousActionsRef = useRef<SimpleAction[]>([]);
  
  // Memoize actions to ensure stable reference
  const stableActions = useMemo(() => {
    // Deep comparison to check if actions have actually changed
    const hasChanged = actions.length !== previousActionsRef.current.length ||
      actions.some((action, index) => {
        const prevAction = previousActionsRef.current[index];
        return !prevAction || 
          action.id !== prevAction.id ||
          action.label !== prevAction.label ||
          action.variant !== prevAction.variant ||
          action.visible !== prevAction.visible ||
          action.disabled !== prevAction.disabled ||
          action.priority !== prevAction.priority;
      });
    
    if (hasChanged) {
      previousActionsRef.current = actions;
      return actions;
    }
    
    return previousActionsRef.current;
  }, [actions]);
  
  // Register actions
  useEffect(() => {
    if (stableActions.length === 0) return;
    
    const processedActions = adaptedActions(stableActions);
    
    // Unregister old actions
    registeredActionsRef.current.forEach(actionId => {
      store.unregisterAction(actionId, contextId.current);
    });
    registeredActionsRef.current.clear();
    
    // Register new actions
    processedActions.forEach(action => {
      store.registerAction(action, contextId.current);
      registeredActionsRef.current.add(action.id);
    });
    
    return () => {
      // Cleanup on unmount or deps change
      registeredActionsRef.current.forEach(actionId => {
        store.unregisterAction(actionId, contextId.current);
      });
      registeredActionsRef.current.clear();
    };
  }, deps ? [...deps, stableActions] : [stableActions, adaptedActions]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      store.unregisterContext(contextId.current);
    };
  }, []);
  
  return {
    context: contextId.current,
    updateAction: store.updateAction,
    getActions: () => store.getActionsForContext(contextId.current)
  };
};

/**
 * Hook to get actions for the current context
 * Useful for rendering action bars
 */
export const useContextActions = (context?: string) => {
  const store = useActionStore();
  const targetContext = context || store.currentContext;
  
  useEffect(() => {
    if (context && context !== store.currentContext) {
      store.setCurrentContext(context);
    }
  }, [context, store]);
  
  return {
    actions: targetContext ? store.getActionsForContext(targetContext) : store.contextActions,
    setContext: store.setCurrentContext,
    currentContext: store.currentContext
  };
};

/**
 * Hook for global actions that persist across contexts
 */
export const useGlobalActions = (actions: SimpleAction[]) => {
  return useSimpleActions(actions, 'global');
};

/**
 * Hook for page-level actions (most common use case)
 * Automatically sets context based on current route
 */
export const usePageActions = (actions: SimpleAction[], page?: string) => {
  const contextId = page || window.location.pathname.replace(/\//g, '_') || 'page';
  return useSimpleActions(actions, contextId);
};

/**
 * Hook for module-level actions
 */
export const useModuleActions = (actions: SimpleAction[], module: string) => {
  return useSimpleActions(actions, `module_${module}`);
};

/**
 * Utility hook for dynamic actions that can be updated
 */
export const useDynamicActions = (initialActions: SimpleAction[] = []) => {
  const store = useActionStore();
  const contextRef = useRef(`dynamic_${Math.random().toString(36).substr(2, 9)}`);
  
  const addAction = useCallback((action: SimpleAction) => {
    store.registerAction(action, contextRef.current);
  }, [store]);
  
  const removeAction = useCallback((actionId: string) => {
    store.unregisterAction(actionId, contextRef.current);
  }, [store]);
  
  const updateAction = useCallback((actionId: string, updates: Partial<SimpleAction>) => {
    store.updateAction(actionId, updates);
  }, [store]);
  
  const clearActions = useCallback(() => {
    store.unregisterContext(contextRef.current);
  }, [store]);
  
  // Initialize with initial actions
  useEffect(() => {
    if (initialActions.length > 0) {
      store.registerActions(initialActions, contextRef.current);
    }
    
    return () => {
      store.unregisterContext(contextRef.current);
    };
  }, []);
  
  return {
    addAction,
    removeAction,
    updateAction,
    clearActions,
    getActions: () => store.getActionsForContext(contextRef.current),
    context: contextRef.current
  };
};

/**
 * Hook for conditional actions that depend on state
 */
export const useConditionalActions = (
  getActions: () => SimpleAction[],
  deps: React.DependencyList
) => {
  const actions = getActions();
  return useSimpleActions(actions, undefined, deps);
};

export default useSimpleActions;