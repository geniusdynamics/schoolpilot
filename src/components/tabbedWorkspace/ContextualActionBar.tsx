import { logger } from '@/utils/logging';

// ABOUTME: ContextualActionBar component for tab-specific actions and contextual operations
// ABOUTME: Provides dynamic actions based on active tab context with RBAC integration

import React, { useState, useMemo, useCallback } from 'react';
import { MoreHorizontal, Search, Settings, RefreshCw } from 'lucide-react';
import { useTabStore } from '../../stores/tabStore';
import { useActionRegistry, ActionDefinition, ActionContext } from '../../services/ui/actionRegistry';
import { cn } from '../../utils/cn';
import { getIcon } from '../../utils/iconMap';

interface ContextualActionBarProps {
  className?: string;
  moduleContext?: string;
  userRole?: string;
  userPermissions?: string[];
  onSettingsClick?: () => void;
  showSearch?: boolean;
  showRefresh?: boolean;
  showSave?: boolean;
  showShare?: boolean;
  showDownload?: boolean;
  showUpload?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  maxVisibleActions?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'standard' | 'expanded';
  position?: 'top' | 'bottom' | 'inline';
}

interface ActionButtonProps {
  action: ActionDefinition;
  size: 'sm' | 'md' | 'lg';
  variant: 'minimal' | 'standard' | 'expanded';
  onClick: () => void;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  size,
  variant,
  onClick,
  disabled = false
}) => {
  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';
    
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };
    
    const variantClasses = {
      minimal: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100',
      standard: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm',
      expanded: 'text-white bg-blue-600 hover:bg-blue-700 shadow-md'
    };
    
    return cn(
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      {
        'opacity-50 cursor-not-allowed': disabled || action.disabled,
        'cursor-wait': action.loading
      }
    );
  };
  
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-3 h-3';
      case 'lg': return 'w-5 h-5';
      default: return 'w-4 h-4';
    }
  };
  
  const showLabel = variant === 'expanded' || (variant === 'standard' && size === 'lg');
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || action.disabled || action.loading}
      className={getButtonClasses()}
      title={action.tooltip || action.label}
      aria-label={action.label}
    >
      {action.loading ? (
        <RefreshCw className={cn(getIconSize(), 'animate-spin')} />
      ) : (
        action.icon && (
          <span className={getIconSize()}>
            {(() => {
              const IconComponent = getIcon(action.icon);
              return IconComponent ? <IconComponent className={getIconSize()} /> : action.icon;
            })()}
          </span>
        )
      )}
      
      {showLabel && (
        <span className={cn(action.icon && 'ml-2')}>
          {action.label}
        </span>
      )}
      
      {action.badge && (
        <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
          {action.badge}
        </span>
      )}
    </button>
  );
};

export const ContextualActionBar: React.FC<ContextualActionBarProps> = ({
  className,
  moduleContext = 'dashboard',
  userRole = 'guest',
  userPermissions = [],
  onSettingsClick,
  showSearch = true,
  showRefresh = true,
  showSave = false,
  showShare = false,
  showDownload = false,
  showUpload = false,
  showEdit = false,
  showDelete = false,
  maxVisibleActions = 8,
  size = 'md',
  variant = 'standard',
  position = 'top'
}) => {
  const { activeTab, tabs } = useTabStore();
  const { getActionsForContext, executeAction } = useActionRegistry();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverflow, setShowOverflow] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get current active tab
  const currentTab = useMemo(() => {
    return activeTab ? tabs.find(tab => tab.id === activeTab) : null;
  }, [activeTab, tabs]);
  
  // Create action context
  const actionContext: ActionContext | null = useMemo(() => {
    if (!currentTab) return null;
    
    return {
      activeTab: {
        id: currentTab.id,
        title: currentTab.title,
        path: currentTab.path || '',
        module: currentTab.module || moduleContext,
        submodule: currentTab.submodule,
        feature: currentTab.feature,
        metadata: currentTab.metadata
      },
      module: currentTab.module || moduleContext,
      submodule: currentTab.submodule,
      feature: currentTab.feature,
      user: {
        id: 'current-user',
        name: 'Current User',
        email: 'user@example.com',
        role: userRole,
        permissions: userPermissions,
        moduleAccess: {}
      },
      data: currentTab.metadata
    };
  }, [currentTab, moduleContext, userRole, userPermissions]);
  
  // Get contextual actions
  const contextualActions = useMemo(() => {
    if (!actionContext) return [];
    return getActionsForContext(actionContext);
  }, [actionContext, getActionsForContext]);
  
  // Create built-in actions based on props
  const builtInActions = useMemo(() => {
    const actions: ActionDefinition[] = [];
    
    if (showRefresh) {
      actions.push({
        id: 'refresh',
        label: 'Refresh',
        icon: 'RefreshCw',
        tooltip: 'Refresh current tab content',
        variant: 'secondary',
        loading: isRefreshing,
        handler: async () => {
          setIsRefreshing(true);
          // Simulate refresh
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsRefreshing(false);
        }
      });
    }
    
    if (showSave && currentTab?.isDirty) {
      actions.push({
        id: 'save',
        label: 'Save',
        icon: 'Save',
        tooltip: 'Save changes',
        variant: 'primary',
        handler: async () => {
          // Handle save logic
          logger.info('Saving tab:', currentTab.id);
        }
      });
    }
    
    if (showShare) {
      actions.push({
        id: 'share',
        label: 'Share',
        icon: 'Share2',
        tooltip: 'Share this tab',
        variant: 'secondary',
        handler: async () => {
          // Handle share logic
          logger.info('Sharing tab:', currentTab?.id);
        }
      });
    }
    
    if (showDownload) {
      actions.push({
        id: 'download',
        label: 'Download',
        icon: 'Download',
        tooltip: 'Download content',
        variant: 'secondary',
        handler: async () => {
          // Handle download logic
          logger.info('Downloading from tab:', currentTab?.id);
        }
      });
    }
    
    if (showUpload) {
      actions.push({
        id: 'upload',
        label: 'Upload',
        icon: 'Upload',
        tooltip: 'Upload content',
        variant: 'secondary',
        handler: async () => {
          // Handle upload logic
          logger.info('Uploading to tab:', currentTab?.id);
        }
      });
    }
    
    if (showEdit) {
      actions.push({
        id: 'edit',
        label: 'Edit',
        icon: 'Edit',
        tooltip: 'Edit content',
        variant: 'secondary',
        handler: async () => {
          // Handle edit logic
          logger.info('Editing tab:', currentTab?.id);
        }
      });
    }
    
    if (showDelete) {
      actions.push({
        id: 'delete',
        label: 'Delete',
        icon: 'Trash2',
        tooltip: 'Delete content',
        variant: 'danger',
        handler: async () => {
          // Handle delete logic
          if (confirm('Are you sure you want to delete this content?')) {
            logger.info('Deleting from tab:', currentTab?.id);
          }
        }
      });
    }
    
    return actions;
  }, [showRefresh, showSave, showShare, showDownload, showUpload, showEdit, showDelete, currentTab, isRefreshing]);
  
  // Combine all actions
  const allActions = useMemo(() => {
    return [...builtInActions, ...contextualActions];
  }, [builtInActions, contextualActions]);
  
  // Filter actions based on search
  const filteredActions = useMemo(() => {
    if (!searchQuery) return allActions;
    return allActions.filter(action => 
      (action.label?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      action.tooltip?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allActions, searchQuery]);
  
  // Split visible and overflow actions
  const visibleActions = filteredActions.slice(0, maxVisibleActions);
  const overflowActions = filteredActions.slice(maxVisibleActions);
  
  // Handle action execution
  const handleActionClick = useCallback(async (action: ActionDefinition) => {
    if (!actionContext) return;
    
    try {
      if (action.handler) {
        await action.handler();
      } else {
        await executeAction(action.id, actionContext);
      }
    } catch (error) {
      logger.error('Failed to execute action:', error);
    }
  }, [actionContext, executeAction]);
  
  // Handle search
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);
  
  if (!currentTab) {
    return null;
  }
  
  const containerClasses = cn(
    'flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2',
    {
      'border-t border-b-0': position === 'bottom',
      'border-0 bg-gray-50': position === 'inline'
    },
    className
  );
  
  return (
    <div className={containerClasses}>
      {/* Left side - Tab info and search */}
      <div className="flex items-center space-x-4">
        {/* Tab info */}
        <div className="flex items-center space-x-2">
          {currentTab.icon && (
            <span className="text-gray-600">
              {currentTab.icon}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900">
            {currentTab.title}
          </span>
          {currentTab.isDirty && (
            <span className="w-2 h-2 bg-orange-400 rounded-full" title="Unsaved changes" />
          )}
        </div>
        
        {/* Search */}
        {showSearch && allActions.length > 3 && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search actions..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center space-x-2">
        {/* Visible actions */}
        {visibleActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            size={size}
            variant={variant}
            onClick={() => handleActionClick(action)}
          />
        ))}
        
        {/* Overflow menu */}
        {overflowActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className={cn(
                'inline-flex items-center justify-center rounded-md p-2',
                'text-gray-600 hover:text-gray-800 hover:bg-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showOverflow && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                <div className="p-2 space-y-1">
                  {overflowActions.map((action) => (
                    <ActionButton
                      key={action.id}
                      action={action}
                      size="sm"
                      variant="minimal"
                      onClick={() => {
                        handleActionClick(action);
                        setShowOverflow(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Settings button */}
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className={cn(
              'inline-flex items-center justify-center rounded-md p-2',
              'text-gray-600 hover:text-gray-800 hover:bg-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ContextualActionBar;