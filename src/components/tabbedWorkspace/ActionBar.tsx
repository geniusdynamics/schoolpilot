import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  MagnifyingGlassIcon as Search,
  EllipsisHorizontalIcon as MoreHorizontal,
} from '@heroicons/react/24/outline';

import { useActionRegistry, ActionDefinition, ActionGroup, ActionContext } from '../../services/ui/actionRegistry';
import { useTabStore } from '../../stores/tabStore';
import { cn } from '../../utils/cn';
import { getIcon } from '../../utils/iconMap';
import { logger } from '@/utils/logging';

interface ActionBarProps {
  className?: string;
  showSearch?: boolean;
  showGrouping?: boolean;
  showFilter?: boolean;
  maxVisibleActions?: number;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'expanded';
}

interface AdditionalProps {
  moduleContext?: string;
  userRole?: string;
  userPermissions?: string[];
  onSettingsClick?: () => void;
}

interface ActionButtonProps {
  action: ActionDefinition;
  context: ActionContext;
  size: 'sm' | 'md' | 'lg';
  variant: 'default' | 'compact' | 'expanded';
  onClick: () => void;
}

interface ActionGroupComponentProps {
  group: ActionGroup;
  context: ActionContext;
  size: 'sm' | 'md' | 'lg';
  variant: 'default' | 'compact' | 'expanded';
  isExpanded: boolean;
  onToggle: () => void;
  onActionClick: (actionId: string) => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  size,
  variant,
  onClick
}) => {
  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs';
      case 'lg': return 'px-4 py-3 text-base';
      default: return 'px-3 py-2 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-3 h-3';
      case 'lg': return 'w-5 h-5';
      default: return 'w-4 h-4';
    }
  };

  const getVariantStyles = () => {
    const baseStyles = 'inline-flex items-center gap-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1';
    
    switch (action.variant) {
      case 'primary':
        return cn(baseStyles, 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md');
      case 'danger':
        return cn(baseStyles, 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md');
      case 'ghost':
        return cn(baseStyles, 'text-green-700 hover:bg-green-50 hover:text-green-800');
      default: // secondary
        return cn(baseStyles, 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300');
    }
  };

  const showLabel = variant !== 'compact' || size === 'lg';
  const showIcon = true;

  return (
    <button
      onClick={onClick}
      disabled={action.disabled || action.loading}
      className={cn(
        getVariantStyles(),
        getButtonSize(),
        {
          'opacity-50 cursor-not-allowed': action.disabled,
          'cursor-wait': action.loading,
          'relative': action.badge || action.loading
        }
      )}
      title={action.tooltip || action.label}
      aria-label={action.label}
      data-action-id={action.id}
    >
      {/* Loading spinner */}
      {action.loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-md">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Icon */}
      {showIcon && action.icon && (
        <span className={cn(getIconSize(), action.loading && 'invisible')}>
          {(() => {
            const IconComponent = getIcon(action.icon);
            return IconComponent ? <IconComponent className={getIconSize()} /> : action.icon;
          })()}
        </span>
      )}

      {/* Label */}
      {showLabel && (
        <span className={cn(action.loading && 'invisible')}>
          {action.label}
        </span>
      )}

      {/* Badge */}
      {action.badge && (
        <span className={cn(
          'absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full',
          'min-w-[18px] h-[18px] flex items-center justify-center font-bold',
          action.loading && 'invisible'
        )}>
          {action.badge}
        </span>
      )}

      {/* Keyboard shortcut hint */}
      {action.shortcut && variant === 'expanded' && (
        <span className="text-xs opacity-60 ml-auto">
          {action.shortcut}
        </span>
      )}
    </button>
  );
};

const ActionGroupComponent: React.FC<ActionGroupComponentProps> = ({
  group,
  context,
  size,
  variant,
  isExpanded,
  onToggle,
  onActionClick
}) => {
  if (!group.collapsible) {
    return (
      <div className="space-y-1">
        {group.label && (
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wide px-1">
            {group.label}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {group.actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              context={context}
              size={size}
              variant={variant}
              onClick={() => onActionClick(action.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-200 rounded-lg">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-2 text-left',
          'hover:bg-green-50 transition-colors rounded-t-lg',
          !isExpanded && 'rounded-b-lg'
        )}
      >
        <span className="font-medium text-green-800">{group.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-600">
            {group.actions.length} action{group.actions.length !== 1 ? 's' : ''}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-green-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-green-600" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-2 border-t border-green-200 bg-green-25">
          <div className="flex flex-wrap gap-1">
            {group.actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                context={context}
                size={size}
                variant={variant}
                onClick={() => onActionClick(action.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ActionBarComponent: React.FC<ActionBarProps & AdditionalProps> = ({
  className,
  showSearch = true,
  showGrouping = true,
  showFilter = false,
  maxVisibleActions = 10,
  orientation = 'horizontal',
  size = 'md',
  variant = 'default'
}) => {
  const {
    getActionsForContext,
    getActionGroupsForContext,
    executeAction,
    searchActions,
    setCurrentContext
  } = useActionRegistry();
  
  const { activeTab, currentUserRole, userPermissions } = useTabStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showOverflow, setShowOverflow] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'primary' | 'secondary'>('all');

  // Create action context
  const actionContext: ActionContext | null = useMemo(() => {
    if (!activeTab || !currentUserRole) return null;
    
    return {
      activeTab: {
        id: activeTab.id,
        title: activeTab.title,
        path: activeTab.path,
        module: activeTab.module,
        submodule: activeTab.submodule,
        feature: activeTab.feature,
        metadata: activeTab.metadata
      },
      module: activeTab.module,
      submodule: activeTab.submodule,
      feature: activeTab.feature,
      user: {
        id: 'current-user', // This should come from auth context
        name: 'Current User',
        email: 'user@example.com',
        role: currentUserRole,
        permissions: userPermissions,
        moduleAccess: {} // This should come from auth context
      },
      data: activeTab.metadata
    };
  }, [activeTab, currentUserRole, userPermissions]);

  // Get actions and groups
  const { actions, groups, visibleActions, overflowActions } = useMemo(() => {
    if (!actionContext) {
      return { actions: [], groups: [], visibleActions: [], overflowActions: [] };
    }

    let allActions: ActionDefinition[] = [];
    let allGroups: ActionGroup[] = [];

    if (showGrouping) {
      allGroups = getActionGroupsForContext(actionContext);
      allActions = allGroups.flatMap(group => group.actions);
    } else {
      allActions = getActionsForContext(actionContext);
    }

    // Apply search filter
    if (searchQuery) {
      allActions = searchActions(searchQuery, actionContext);
      // Filter groups to only include those with matching actions
      allGroups = allGroups
        .map(group => ({
          ...group,
          actions: group.actions.filter(action => 
            allActions.some(a => a.id === action.id)
          )
        }))
        .filter(group => group.actions.length > 0);
    }

    // Apply variant filter
    if (filterBy !== 'all') {
      allActions = allActions.filter(action => action.variant === filterBy);
      allGroups = allGroups
        .map(group => ({
          ...group,
          actions: group.actions.filter(action => action.variant === filterBy)
        }))
        .filter(group => group.actions.length > 0);
    }

    // Split visible and overflow actions
    const visible = allActions.slice(0, maxVisibleActions);
    const overflow = allActions.slice(maxVisibleActions);

    return {
      actions: allActions,
      groups: allGroups,
      visibleActions: visible,
      overflowActions: overflow
    };
  }, [actionContext, showGrouping, searchQuery, filterBy, maxVisibleActions, getActionsForContext, getActionGroupsForContext, searchActions]);

  // Update context when active tab changes - use a ref to prevent infinite loops
  const previousActionContextRef = useRef<ActionContext | null>(null);
  
  useEffect(() => {
    if (actionContext && 
        (!previousActionContextRef.current || 
         previousActionContextRef.current.activeTab?.id !== actionContext.activeTab?.id ||
         previousActionContextRef.current.module !== actionContext.module ||
         previousActionContextRef.current.submodule !== actionContext.submodule)) {
      setCurrentContext(actionContext);
      previousActionContextRef.current = actionContext;
    }
  }, [actionContext, setCurrentContext]);

  // Handle action execution
  const handleActionClick = useCallback(async (actionId: string) => {
    if (!actionContext) return;
    
    try {
      await executeAction(actionId, actionContext);
    } catch (error) {
      logger.error('Failed to execute action:', error);
      // Here you could show a toast notification or error message
    }
  }, [actionContext, executeAction]);

  // Handle group toggle
  const handleGroupToggle = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  // Handle search
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  if (!actionContext || actions.length === 0) {
    return (
      <div
        data-testid="action-bar"
        className={cn(
        'flex items-center justify-center p-4 text-sm text-surface-muted-fg',
        'bg-surface-muted border border-surface-border rounded-lg',
        className
      )}>
        No actions available for current context
      </div>
    );
  }

  return (
    <div
      data-testid="action-bar"
      className={cn(
      'bg-surface-card border border-green-200 rounded-lg shadow-sm',
      orientation === 'vertical' ? 'flex flex-col' : 'flex flex-row items-center',
      className
    )}>
      {/* Header with search and filters */}
      {(showSearch || showFilter) && (
        <div className={cn(
          'flex items-center gap-2 p-2 border-b border-green-200',
          orientation === 'vertical' ? 'flex-col' : 'flex-row'
        )}>
          {/* Search */}
          {showSearch && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-muted-fg" />
              <input
                type="text"
                placeholder="Search actions..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={cn(
                  'w-full pl-8 pr-3 py-1.5 text-sm border border-green-300 rounded-md',
                  'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
                )}
              />
            </div>
          )}

          {/* Filter */}
          {showFilter && (
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className={cn(
                'px-3 py-1.5 text-sm border border-green-300 rounded-md',
                'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
              )}
            >
              <option value="all">All Actions</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          )}
        </div>
      )}

      {/* Actions content */}
      <div className={cn(
        'p-2',
        orientation === 'vertical' ? 'space-y-2' : 'flex items-center gap-2 flex-wrap'
      )}>
        {showGrouping ? (
          // Grouped actions
          groups.map((group) => (
            <ActionGroupComponent
              key={group.id}
              group={group}
              context={actionContext}
              size={size}
              variant={variant}
              isExpanded={expandedGroups.has(group.id) || !group.collapsible}
              onToggle={() => handleGroupToggle(group.id)}
              onActionClick={handleActionClick}
            />
          ))
        ) : (
          // Flat actions
          <>
            {visibleActions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                context={actionContext}
                size={size}
                variant={variant}
                onClick={() => handleActionClick(action.id)}
              />
            ))}
            
            {/* Overflow menu */}
            {overflowActions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowOverflow(!showOverflow)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 text-sm',
                    'bg-green-100 text-green-800 hover:bg-green-200 rounded-md',
                    'border border-green-300 transition-colors'
                  )}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>{overflowActions.length} more</span>
                </button>
                
                {showOverflow && (
                  <div className={cn(
                    'absolute top-full left-0 mt-1 bg-surface-card border border-green-200',
                    'rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto'
                  )}>
                    <div className="p-2 space-y-1">
                      {overflowActions.map((action) => (
                        <ActionButton
                          key={action.id}
                          action={action}
                          context={actionContext}
                          size="sm"
                          variant="expanded"
                          onClick={() => {
                            handleActionClick(action.id);
                            setShowOverflow(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Memoize ActionBar to prevent unnecessary re-renders
export const ActionBar = React.memo(ActionBarComponent, (prevProps, nextProps) => {
  // Custom comparison function for optimization
  return (
    prevProps.className === nextProps.className &&
    prevProps.showSearch === nextProps.showSearch &&
    prevProps.showGrouping === nextProps.showGrouping &&
    prevProps.showFilter === nextProps.showFilter &&
    prevProps.maxVisibleActions === nextProps.maxVisibleActions &&
    prevProps.orientation === nextProps.orientation &&
    prevProps.size === nextProps.size &&
    prevProps.variant === nextProps.variant &&
    prevProps.moduleContext === nextProps.moduleContext &&
    prevProps.userRole === nextProps.userRole &&
    JSON.stringify(prevProps.userPermissions) === JSON.stringify(nextProps.userPermissions) &&
    prevProps.onSettingsClick === nextProps.onSettingsClick
  );
});

ActionBar.displayName = 'ActionBar';

export type { ActionBarProps };
