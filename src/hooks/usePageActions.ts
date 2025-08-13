// ABOUTME: Hook for pages to register their actions with the ActionRegistry
// ABOUTME: Provides a simple interface for pages to define contextual actions that appear in the ActionBar

import { useEffect, useCallback } from 'react';
import { useActionRegistry, ActionDefinition, ActionGroup } from '../services/actionRegistry';
import { useTabStore } from '../stores/tabStore';
import { useAuth } from '../contexts/AuthContext';

export interface PageActionDefinition extends Omit<ActionDefinition, 'module' | 'submodule'> {
  // Page actions don't need to specify module/submodule as they're inferred from context
}

export interface PageActionGroup extends Omit<ActionGroup, 'module'> {
  actions: PageActionDefinition[];
}

export interface UsePageActionsOptions {
  module?: string;
  submodule?: string;
  feature?: string;
  autoRegister?: boolean; // Whether to automatically register actions on mount
}

export interface UsePageActionsReturn {
  registerAction: (action: PageActionDefinition) => void;
  registerActions: (actions: PageActionDefinition[]) => void;
  registerActionGroup: (group: PageActionGroup) => void;
  unregisterAction: (actionId: string) => void;
  unregisterAllActions: () => void;
  updateAction: (actionId: string, updates: Partial<PageActionDefinition>) => void;
  isActionRegistered: (actionId: string) => boolean;
}

/**
 * Hook for pages to register contextual actions that appear in the ActionBar
 * 
 * @param actions - Array of actions to register for this page
 * @param options - Configuration options
 * @returns Object with methods to manage page actions
 * 
 * @example
 * ```tsx
 * // In a page component
 * const { registerActions } = usePageActions([
 *   {
 *     id: 'add-student',
 *     label: 'Add Student',
 *     icon: 'Plus',
 *     variant: 'primary',
 *     onClick: () => setShowAddModal(true)
 *   },
 *   {
 *     id: 'export-data',
 *     label: 'Export',
 *     icon: 'Download',
 *     variant: 'secondary',
 *     onClick: () => handleExport()
 *   }
 * ]);
 * ```
 */
export const usePageActions = (
  actions: PageActionDefinition[] = [],
  options: UsePageActionsOptions = {}
): UsePageActionsReturn => {
  const { registerActions: storeRegisterActions, registerActionGroup: storeRegisterActionGroup } = useActionRegistry();
  const { activeTab } = useTabStore();
  const { user } = useAuth();
  
  // Get module/submodule from options or active tab
  const module = options.module || activeTab?.module || 'unknown';
  const submodule = options.submodule || activeTab?.submodule || activeTab?.path?.split('/')[2] || 'default';
  const feature = options.feature || activeTab?.feature;
  
  // Track registered action IDs for cleanup
  const registeredActionIds = new Set<string>();
  
  // Register a single action
  const registerAction = useCallback((action: PageActionDefinition) => {
    const fullAction: ActionDefinition = {
      ...action,
      module,
      submodule,
      feature,
      // Set default values
      variant: action.variant || 'secondary',
      priority: action.priority || 0,
      visible: action.visible !== false,
      disabled: action.disabled || false,
      requiredPermissions: action.requiredPermissions || [],
      requiredRoles: action.requiredRoles || []
    };
    
    storeRegisterActions(module, submodule, [fullAction]);
    registeredActionIds.add(action.id);
  }, [module, submodule, feature, storeRegisterActions]);
  
  // Register multiple actions
  const registerActions = useCallback((actionsToRegister: PageActionDefinition[]) => {
    const fullActions: ActionDefinition[] = actionsToRegister.map(action => ({
      ...action,
      module,
      submodule,
      feature,
      // Set default values
      variant: action.variant || 'secondary',
      priority: action.priority || 0,
      visible: action.visible !== false,
      disabled: action.disabled || false,
      requiredPermissions: action.requiredPermissions || [],
      requiredRoles: action.requiredRoles || []
    }));
    
    storeRegisterActions(module, submodule, fullActions);
    actionsToRegister.forEach(action => registeredActionIds.add(action.id));
  }, [module, submodule, feature, storeRegisterActions]);
  
  // Register an action group
  const registerActionGroup = useCallback((group: PageActionGroup) => {
    const fullGroup: ActionGroup = {
      ...group,
      module,
      actions: group.actions.map(action => ({
        ...action,
        module,
        submodule,
        feature,
        // Set default values
        variant: action.variant || 'secondary',
        priority: action.priority || 0,
        visible: action.visible !== false,
        disabled: action.disabled || false,
        requiredPermissions: action.requiredPermissions || [],
        requiredRoles: action.requiredRoles || []
      }))
    };
    
    storeRegisterActionGroup(module, submodule, fullGroup);
    group.actions.forEach(action => registeredActionIds.add(action.id));
  }, [module, submodule, feature, storeRegisterActionGroup]);
  
  // Unregister a single action
  const unregisterAction = useCallback((actionId: string) => {
    // Note: The ActionRegistry doesn't have an unregister method yet
    // This would need to be implemented in the store
    registeredActionIds.delete(actionId);
    console.warn('Action unregistration not yet implemented in ActionRegistry');
  }, []);
  
  // Unregister all actions registered by this hook
  const unregisterAllActions = useCallback(() => {
    registeredActionIds.forEach(actionId => {
      unregisterAction(actionId);
    });
    registeredActionIds.clear();
  }, [unregisterAction]);
  
  // Update an existing action
  const updateAction = useCallback((actionId: string, updates: Partial<PageActionDefinition>) => {
    const { updateAction: storeUpdateAction } = useActionRegistry.getState();
    storeUpdateAction(actionId, updates);
  }, []);
  
  // Check if an action is registered
  const isActionRegistered = useCallback((actionId: string) => {
    return registeredActionIds.has(actionId);
  }, []);
  
  // Auto-register actions on mount if enabled
  useEffect(() => {
    if (options.autoRegister !== false && actions.length > 0) {
      registerActions(actions);
    }
    
    // Cleanup on unmount
    return () => {
      if (options.autoRegister !== false) {
        unregisterAllActions();
      }
    };
  }, [actions, options.autoRegister, registerActions, unregisterAllActions]);
  
  return {
    registerAction,
    registerActions,
    registerActionGroup,
    unregisterAction,
    unregisterAllActions,
    updateAction,
    isActionRegistered
  };
};

/**
 * Simplified hook for pages that just need to register a list of actions
 * 
 * @param actions - Array of actions to register
 * @param deps - Dependency array for re-registration
 * 
 * @example
 * ```tsx
 * // Simple usage in a page component
 * useSimplePageActions([
 *   {
 *     id: 'add-item',
 *     label: 'Add Item',
 *     icon: 'Plus',
 *     onClick: () => handleAdd()
 *   }
 * ]);
 * ```
 */
export const useSimplePageActions = (
  actions: PageActionDefinition[],
  deps: React.DependencyList = []
) => {
  const { registerActions } = usePageActions();
  
  useEffect(() => {
    if (actions.length > 0) {
      registerActions(actions);
    }
  }, [registerActions, ...deps]);
};

export default usePageActions;