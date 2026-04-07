import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Core action definition interface with RBAC support
export interface ActionDefinition {
  id: string;
  label: string;
  icon: string | React.ComponentType<any>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick?: (context?: ActionContext) => void | Promise<void>;
  execute?: (context?: ActionContext) => void | Promise<void>;
  disabled?: boolean;
  visible?: boolean;
  tooltip?: string;
  shortcut?: string;
  badge?: string | number;
  loading?: boolean;
  group?: string;
  priority?: number;
  module?: string;
  submodule?: string;
  feature?: string;
  category?: string;
  context?: string[];
  permissions?: string[];
  requiredPermissions?: string[];
  requiredRoles?: string[];
  condition?: (context: ActionContext) => boolean;
}

// Action group for organizing related actions
export interface ActionGroup {
  id: string;
  label: string;
  actions: ActionDefinition[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  module: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  priority?: number;
}

// Context information for action execution and filtering
export interface ActionContext {
  activeTab?: {
    id: string;
    title: string;
    path: string;
    module: string;
    submodule?: string;
    feature?: string;
    metadata?: Record<string, any>;
  };
  selectedTabs?: string[];
  module: string;
  submodule?: string;
  feature?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    moduleAccess: Record<string, string[]>;
    departmentId?: string;
    classIds?: string[];
  };
  data?: Record<string, any>;
  moduleData?: Record<string, any>;
}

// Action registry store interface
interface ActionRegistryStore {
  // State
  actions: Record<string, ActionDefinition>;
  groups: Record<string, ActionGroup>;
  moduleActions: Record<string, Record<string, ActionDefinition[]>>;
  contextualActions: ActionDefinition[];
  currentContext: ActionContext | null;
  
  // Registration methods
  registerAction: (action: ActionDefinition) => void;
  registerActions: (module: string, page: string, actions: ActionDefinition[]) => void;
  registerActionGroup: (module: string, page: string, group: ActionGroup) => void;
  registerModuleActions: (module: string, actions: ActionDefinition[]) => void;
  
  // Retrieval methods
  getActionsForContext: (context: ActionContext) => ActionDefinition[];
  getActionGroupsForContext: (context: ActionContext) => ActionGroup[];
  getActionsForModule: (module: string, userPermissions: string[], userRole: string) => ActionGroup[];
  getActionById: (actionId: string) => ActionDefinition | null;
  
  // Permission and filtering methods
  hasPermission: (action: ActionDefinition, userPermissions: string[], userRole: string) => boolean;
  filterActionsByRole: (actions: ActionDefinition[], userRole: string, userPermissions: string[]) => ActionDefinition[];
  filterActionsByContext: (actions: ActionDefinition[], context: ActionContext) => ActionDefinition[];
  
  // Execution methods
  executeAction: (actionId: string, context: ActionContext) => Promise<void>;
  updateAction: (actionId: string, updates: Partial<ActionDefinition>) => void;
  
  // Context management
  setCurrentContext: (context: ActionContext) => void;
  updateContextualActions: () => void;
  
  // Utility methods
  getActionsByModule: (module: string) => ActionDefinition[];
  getActionsByGroup: (groupId: string) => ActionDefinition[];
  searchActions: (query: string, context: ActionContext) => ActionDefinition[];
}

// Create the action registry store
export const useActionRegistry = create<ActionRegistryStore>()(subscribeWithSelector(
  (set, get) => ({
    // Initial state
    actions: {},
    groups: {},
    moduleActions: {},
    contextualActions: [],
    currentContext: null,
    
    // Registration methods
    registerAction: (action) => {
      const state = get();
      set({
        actions: {
          ...state.actions,
          [action.id]: action
        }
      });
    },
    
    registerActions: (module, page, actions) => {
      const state = get();
      
      // Register individual actions
      const newActions = { ...state.actions };
      actions.forEach(action => {
        newActions[action.id] = { ...action, module, submodule: page };
      });
      
      // Register module actions
      const moduleKey = `${module}.${page}`;
      const newModuleActions = {
        ...state.moduleActions,
        [module]: {
          ...state.moduleActions[module],
          [page]: actions
        }
      };
      
      set({
        actions: newActions,
        moduleActions: newModuleActions
      });
    },
    
    registerActionGroup: (module, page, group) => {
      const state = get();
      
      // Register the group
      const groupWithModule = {
        ...group,
        module,
        actions: group.actions.map(action => ({
          ...action,
          module,
          submodule: page
        }))
      };
      
      // Register individual actions from the group
      const newActions = { ...state.actions };
      groupWithModule.actions.forEach(action => {
        newActions[action.id] = action;
      });
      
      set({
        actions: newActions,
        groups: {
          ...state.groups,
          [group.id]: groupWithModule
        }
      });
    },
    
    registerModuleActions: (module, actions) => {
      const state = get();
      
      const newActions = { ...state.actions };
      actions.forEach(action => {
        newActions[action.id] = { ...action, module };
      });
      
      set({
        actions: newActions,
        moduleActions: {
          ...state.moduleActions,
          [module]: {
            ...state.moduleActions[module],
            global: actions
          }
        }
      });
    },
    
    // Permission validation
    hasPermission: (action, userPermissions, userRole) => {
      // Check required permissions
      if (action.requiredPermissions && action.requiredPermissions.length > 0) {
        const hasAllPermissions = action.requiredPermissions.every(permission =>
          userPermissions.includes(permission)
        );
        if (!hasAllPermissions) return false;
      }
      
      // Check required roles
      if (action.requiredRoles && action.requiredRoles.length > 0) {
        if (!action.requiredRoles.includes(userRole)) return false;
      }
      
      return true;
    },
    
    filterActionsByRole: (actions, userRole, userPermissions) => {
      const state = get();
      return actions.filter(action => {
        // Check basic permission
        if (!state.hasPermission(action, userPermissions, userRole)) {
          return false;
        }
        
        // Check visibility
        if (action.visible === false) return false;
        
        return true;
      });
    },
    
    filterActionsByContext: (actions, context) => {
      return actions.filter(action => {
        // Check if action matches current module/submodule
        if (action.module !== context.module) return false;
        if (action.submodule && action.submodule !== context.submodule) return false;
        if (action.feature && action.feature !== context.feature) return false;
        
        // Check custom condition
        if (action.condition && !action.condition(context)) return false;
        
        return true;
      });
    },
    
    // Retrieval methods
    getActionsForContext: (context) => {
      const state = get();
      const allActions = Object.values(state.actions);
      
      // Filter by context (module, submodule, feature)
      let contextActions = state.filterActionsByContext(allActions, context);
      
      // Filter by permissions and role
      contextActions = state.filterActionsByRole(
        contextActions,
        context.user.role,
        context.user.permissions
      );
      
      // Sort by priority
      return contextActions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    },
    
    getActionGroupsForContext: (context) => {
      const state = get();
      const allGroups = Object.values(state.groups);
      
      return allGroups
        .filter(group => {
          // Check module match
          if (group.module !== context.module) return false;
          
          // Check group permissions
          if (group.requiredPermissions) {
            const hasPermissions = group.requiredPermissions.every(permission =>
              context.user.permissions.includes(permission)
            );
            if (!hasPermissions) return false;
          }
          
          // Check group roles
          if (group.requiredRoles) {
            if (!group.requiredRoles.includes(context.user.role)) return false;
          }
          
          return true;
        })
        .map(group => ({
          ...group,
          actions: state.filterActionsByRole(
            group.actions,
            context.user.role,
            context.user.permissions
          )
        }))
        .filter(group => group.actions.length > 0)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    },
    
    getActionsForModule: (module, userPermissions, userRole) => {
      const state = get();
      const moduleActions = state.moduleActions[module] || {};
      const groups: ActionGroup[] = [];
      
      Object.entries(moduleActions).forEach(([page, actions]) => {
        const filteredActions = state.filterActionsByRole(actions, userRole, userPermissions);
        
        if (filteredActions.length > 0) {
          groups.push({
            id: `${module}-${page}`,
            label: page.charAt(0).toUpperCase() + page.slice(1),
            actions: filteredActions,
            module,
            defaultExpanded: true
          });
        }
      });
      
      return groups;
    },
    
    getActionById: (actionId) => {
      return get().actions[actionId] || null;
    },
    
    // Execution methods
    executeAction: async (actionId, context) => {
      const state = get();
      const action = state.getActionById(actionId);
      
      if (!action) {
        console.error(`Action not found: ${actionId}`);
        return;
      }
      
      // Validate permissions before execution
      if (!state.hasPermission(action, context.user.permissions, context.user.role)) {
        console.error(`Insufficient permissions to execute action: ${actionId}`);
        return;
      }
      
      // Check if action is disabled
      if (action.disabled) {
        console.warn(`Action is disabled: ${actionId}`);
        return;
      }
      
      try {
        // Set loading state
        state.updateAction(actionId, { loading: true });
        
        // Execute the action
        if (action.execute) {
          await action.execute(context);
        } else if (action.onClick) {
          await action.onClick(context);
        }
        
        console.log(`Action executed successfully: ${actionId}`);
      } catch (error) {
        console.error(`Error executing action ${actionId}:`, error);
        throw error;
      } finally {
        // Clear loading state
        state.updateAction(actionId, { loading: false });
      }
    },
    
    updateAction: (actionId, updates) => {
      const state = get();
      const action = state.actions[actionId];
      
      if (action) {
        set({
          actions: {
            ...state.actions,
            [actionId]: {
              ...action,
              ...updates
            }
          }
        });
      }
    },
    
    // Context management
    setCurrentContext: (context) => {
      const state = get();
      
      // Create a stable comparison key to avoid deep object comparison
      const createContextKey = (ctx: ActionContext | null) => {
        if (!ctx) return null;
        return `${ctx.module}:${ctx.submodule || ''}:${ctx.feature || ''}:${ctx.user.id}:${ctx.user.role}:${ctx.activeTab?.id || ''}`;
      };
      
      const currentKey = createContextKey(state.currentContext);
      const newKey = createContextKey(context);
      
      // Only update if context actually changed
      if (currentKey === newKey) {
        return;
      }
      
      set({ currentContext: context });
      
      // Debounce contextual actions update to prevent rapid successive calls
      const updateActions = () => {
        const latestState = get();
        if (latestState.currentContext) {
          const contextualActions = latestState.getActionsForContext(latestState.currentContext);
          // Only update if actions actually changed
          const currentActionsIds = latestState.contextualActions.map(a => a.id).sort().join(',');
          const newActionsIds = contextualActions.map(a => a.id).sort().join(',');
          
          if (currentActionsIds !== newActionsIds) {
            set({ contextualActions });
          }
        }
      };
      
      // Use a longer timeout to prevent cascading updates
      setTimeout(updateActions, 150);
    },
    
    updateContextualActions: () => {
      const state = get();
      if (state.currentContext) {
        const contextualActions = state.getActionsForContext(state.currentContext);
        
        // Only update if actions actually changed to prevent unnecessary re-renders
        const currentActionsIds = state.contextualActions.map(a => a.id).sort().join(',');
        const newActionsIds = contextualActions.map(a => a.id).sort().join(',');
        
        if (currentActionsIds !== newActionsIds) {
          set({ contextualActions });
        }
      }
    },
    
    // Utility methods
    getActionsByModule: (module) => {
      const state = get();
      return Object.values(state.actions).filter(action => action.module === module);
    },
    
    getActionsByGroup: (groupId) => {
      const state = get();
      const group = state.groups[groupId];
      return group ? group.actions : [];
    },
    
    searchActions: (query, context) => {
      const state = get();
      const searchTerm = query.toLowerCase();
      const contextActions = state.getActionsForContext(context);
      
      return contextActions.filter(action =>
        action.label.toLowerCase().includes(searchTerm) ||
        action.tooltip?.toLowerCase().includes(searchTerm) ||
        action.id.toLowerCase().includes(searchTerm)
      );
    }
  })
));

// Helper function to create action definitions
export const createAction = (action: Omit<ActionDefinition, 'id'> & { id?: string }): ActionDefinition => {
  return {
    id: action.id || `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    variant: 'secondary',
    disabled: false,
    visible: true,
    priority: 0,
    requiredPermissions: [],
    ...action
  };
};

// Helper function to create action groups
export const createActionGroup = (group: Omit<ActionGroup, 'id'> & { id?: string }): ActionGroup => {
  return {
    id: group.id || `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    collapsible: true,
    defaultExpanded: true,
    priority: 0,
    ...group
  };
};

// Export types for external use
export type { ActionDefinition, ActionGroup };