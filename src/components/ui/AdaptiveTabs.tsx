/**
 * AdaptiveTabs - Unified Tab Component for SchoolPilot3
 * Provides platform-aware tabbed interface for web, desktop, and mobile
 */

import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { X, Plus, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { usePlatformInfo, getPlatformConfig } from '../utils/platformDetection';
import { getIcon } from '../utils/iconMap';

// ===== TYPES =====

export interface TabConfig {
  id: string;
  title: string;
  content: React.ComponentType<any> | React.ReactNode;
  
  // Optional properties
  icon?: string | React.ComponentType;
  badge?: string | number;
  disabled?: boolean;
  closeable?: boolean;
  loading?: boolean;
  
  // Metadata
  path?: string;
  module?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface ActionConfig {
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
}

export interface AdaptiveTabsProps {
  // Core functionality
  tabs: TabConfig[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabAdd?: () => void;
  
  // Behavior
  variant?: 'workspace' | 'page' | 'form';
  closeable?: boolean;
  draggable?: boolean;
  persistent?: boolean;
  scrollable?: boolean;
  
  // Actions
  actions?: ActionConfig[];
  showActionBar?: boolean;
  maxVisibleActions?: number;
  
  // Appearance
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tabClassName?: string;
  contentClassName?: string;
  
  // Platform customization
  mobileBreakpoint?: number;
  adaptiveLayout?: boolean;
  
  // Advanced
  maxTabs?: number;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  renderTabContent?: (tab: TabConfig) => React.ReactNode;
}

// ===== CONTEXT =====

interface TabContextValue {
  activeTab: string | null;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  tabs: TabConfig[];
  actions: ActionConfig[];
  platformConfig: any;
  variant: AdaptiveTabsProps['variant'];
}

const TabContext = createContext<TabContextValue | null>(null);

export const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabContext must be used within AdaptiveTabs');
  }
  return context;
};

// ===== SUBCOMPONENTS =====

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onSelect: () => void;
  onClose?: () => void;
  className?: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  isActive,
  onSelect,
  onClose,
  className
}) => {
  const { platformConfig, variant } = useTabContext();
  const { isTouchDevice, isMobile } = usePlatformInfo();
  
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.();
  }, [onClose]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }, [onSelect]);
  
  const IconComponent = typeof tab.icon === 'string' ? getIcon(tab.icon) : tab.icon;
  
  const tabClasses = cn(
    // Base styles
    'relative inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
    
    // Platform-specific sizing
    isMobile ? 'min-h-[44px] px-4 py-3 text-base' : 'min-h-[36px] px-3 py-2 text-sm',
    
    // Variant-specific styles
    variant === 'workspace' && [
      'border-b-2 border-transparent hover:border-gray-300',
      isActive ? 'border-blue-500 text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800'
    ],
    
    variant === 'page' && [
      'rounded-t-lg border border-b-0',
      isActive ? 'border-gray-300 bg-white text-gray-900' : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
    ],
    
    variant === 'form' && [
      'rounded-lg mx-1',
      isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
    ],
    
    // Touch-friendly spacing for mobile
    isTouchDevice && 'space-x-2',
    
    // Disabled state
    tab.disabled && 'opacity-50 cursor-not-allowed',
    
    // Loading state
    tab.loading && 'cursor-wait',
    
    className
  );
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={tab.disabled}
      tabIndex={isActive ? 0 : -1}
      className={tabClasses}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      disabled={tab.disabled}
    >
      {/* Loading indicator */}
      {tab.loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      
      {/* Icon */}
      {!tab.loading && IconComponent && (
        <IconComponent className={cn("flex-shrink-0", isMobile ? "w-5 h-5" : "w-4 h-4", tab.title && "mr-2")} />
      )}
      
      {/* Title */}
      <span className="truncate">{tab.title}</span>
      
      {/* Badge */}
      {tab.badge && (
        <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[18px] flex items-center justify-center">
          {tab.badge}
        </span>
      )}
      
      {/* Close button */}
      {tab.closeable && onClose && (
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            "ml-2 p-1 rounded-full hover:bg-black/10 focus:outline-none focus:bg-black/10",
            isMobile ? "w-6 h-6" : "w-5 h-5"
          )}
          aria-label={`Close ${tab.title} tab`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </button>
  );
};

interface ActionBarProps {
  actions: ActionConfig[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ActionBar: React.FC<ActionBarProps> = ({
  actions,
  maxVisible = 5,
  size = 'md',
  className
}) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const { isMobile } = usePlatformInfo();
  
  const visibleActions = actions.filter(action => action.visible !== false);
  const primaryActions = visibleActions.slice(0, maxVisible);
  const overflowActions = visibleActions.slice(maxVisible);
  
  const handleActionClick = useCallback(async (action: ActionConfig) => {
    if (action.disabled || action.loading) return;
    
    try {
      await action.onClick();
    } catch (error) {
      console.error('Action execution failed:', error);
    }
  }, []);
  
  if (visibleActions.length === 0) return null;
  
  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm', 
    lg: 'px-4 py-3 text-base'
  };
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {primaryActions.map((action) => {
        const IconComponent = typeof action.icon === 'string' ? getIcon(action.icon) : action.icon;
        
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => handleActionClick(action)}
            disabled={action.disabled || action.loading}
            title={action.tooltip || action.label}
            className={cn(
              "inline-flex items-center justify-center rounded-md font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              buttonSizeClasses[size],
              
              // Variant styles
              action.variant === 'primary' && "bg-blue-600 text-white hover:bg-blue-700",
              action.variant === 'danger' && "bg-red-600 text-white hover:bg-red-700",
              action.variant === 'ghost' && "text-gray-600 hover:bg-gray-100",
              (!action.variant || action.variant === 'secondary') && "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
              
              // Disabled state
              (action.disabled || action.loading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {action.loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : IconComponent ? (
              <IconComponent className={cn("w-4 h-4", !isMobile && action.label && "mr-2")} />
            ) : null}
            
            {!isMobile && action.label && (
              <span>{action.label}</span>
            )}
            
            {action.badge && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {action.badge}
              </span>
            )}
          </button>
        );
      })}
      
      {/* Overflow menu */}
      {overflowActions.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOverflow(!showOverflow)}
            className={cn(
              "inline-flex items-center justify-center rounded-md",
              buttonSizeClasses[size],
              "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {showOverflow && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
              <div className="p-2 space-y-1">
                {overflowActions.map((action) => {
                  const IconComponent = typeof action.icon === 'string' ? getIcon(action.icon) : action.icon;
                  
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        handleActionClick(action);
                        setShowOverflow(false);
                      }}
                      disabled={action.disabled || action.loading}
                      className="w-full flex items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
                    >
                      {IconComponent && <IconComponent className="w-4 h-4 mr-3" />}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====

export const AdaptiveTabs: React.FC<AdaptiveTabsProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  onTabClose,
  onTabAdd,
  variant = 'page',
  closeable = false,
  draggable = false,
  persistent = false,
  scrollable = true,
  actions = [],
  showActionBar = true,
  maxVisibleActions = 5,
  size = 'md',
  className,
  tabClassName,
  contentClassName,
  adaptiveLayout = true,
  maxTabs = 20,
  onTabReorder,
  renderTabContent
}) => {
  const platformInfo = usePlatformInfo();
  const platformConfig = getPlatformConfig();
  
  // Internal state for uncontrolled mode
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    controlledActiveTab || tabs[0]?.id || ''
  );
  
  const activeTabId = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const isControlled = controlledActiveTab !== undefined;
  
  // Update internal state when controlled prop changes
  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalActiveTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);
  
  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    if (!isControlled) {
      setInternalActiveTab(tabId);
    }
    onTabChange?.(tabId);
  }, [isControlled, onTabChange]);
  
  // Handle tab close
  const handleTabClose = useCallback((tabId: string) => {
    onTabClose?.(tabId);
    
    // If closing the active tab, switch to adjacent tab
    if (tabId === activeTabId) {
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      const nextTab = tabs[currentIndex + 1] || tabs[currentIndex - 1];
      if (nextTab) {
        handleTabChange(nextTab.id);
      }
    }
  }, [activeTabId, tabs, onTabClose, handleTabChange]);
  
  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !onTabReorder) return;
    
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    
    if (fromIndex !== toIndex) {
      onTabReorder(fromIndex, toIndex);
    }
  }, [onTabReorder]);
  
  // Get active tab
  const activeTabData = useMemo(() => 
    tabs.find(tab => tab.id === activeTabId), [tabs, activeTabId]
  );
  
  // Context value
  const contextValue = useMemo(() => ({
    activeTab: activeTabId,
    setActiveTab: handleTabChange,
    closeTab: handleTabClose,
    tabs,
    actions,
    platformConfig,
    variant
  }), [activeTabId, handleTabChange, handleTabClose, tabs, actions, platformConfig, variant]);
  
  // Render tab bar
  const renderTabBar = () => {
    const TabBarContent = () => (
      <div className={cn(
        "flex items-center",
        scrollable && "overflow-x-auto scrollbar-hide",
        variant === 'workspace' && "border-b border-gray-200",
        variant === 'page' && "border-b border-gray-200 bg-gray-50",
        variant === 'form' && "bg-gray-100 rounded-lg p-1"
      )}>
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => handleTabChange(tab.id)}
            onClose={closeable && tab.closeable !== false ? () => handleTabClose(tab.id) : undefined}
            className={tabClassName}
          />
        ))}
        
        {/* Add tab button */}
        {onTabAdd && tabs.length < maxTabs && (
          <button
            type="button"
            onClick={onTabAdd}
            className={cn(
              "ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100",
              "focus:outline-none focus:ring-2 focus:ring-blue-500"
            )}
            aria-label="Add new tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    );
    
    if (draggable && !platformInfo.isMobile) {
      return (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tabs" direction="horizontal" ignoreContainerClipping={false}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                <div className="flex items-center">
                  {tabs.map((tab, index) => (
                    <Draggable key={tab.id} draggableId={tab.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(snapshot.isDragging && "opacity-75")}
                        >
                          <TabButton
                            tab={tab}
                            isActive={tab.id === activeTabId}
                            onSelect={() => handleTabChange(tab.id)}
                            onClose={closeable && tab.closeable !== false ? () => handleTabClose(tab.id) : undefined}
                            className={tabClassName}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      );
    }
    
    return <TabBarContent />;
  };
  
  // Render tab content
  const renderContent = () => {
    if (!activeTabData) return null;
    
    if (renderTabContent) {
      return renderTabContent(activeTabData);
    }
    
    if (React.isValidElement(activeTabData.content)) {
      return activeTabData.content;
    }
    
    if (typeof activeTabData.content === 'function') {
      const ContentComponent = activeTabData.content;
      return <ContentComponent />;
    }
    
    return activeTabData.content;
  };
  
  return (
    <TabContext.Provider value={contextValue}>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Tab Bar */}
        <div className="flex-shrink-0">
          {renderTabBar()}
        </div>
        
        {/* Action Bar */}
        {showActionBar && actions.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200">
            <ActionBar 
              actions={actions} 
              maxVisible={maxVisibleActions}
              size={size}
            />
          </div>
        )}
        
        {/* Tab Content */}
        <div className={cn(
          "flex-1 overflow-hidden",
          contentClassName
        )}>
          {renderContent()}
        </div>
      </div>
    </TabContext.Provider>
  );
};

export default AdaptiveTabs;