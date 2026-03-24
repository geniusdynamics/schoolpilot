import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';
import { useTabStore } from '../../stores/tabStore';
import { Tab as TabComponent } from './Tab';
import { cn } from '../../utils/cn';
import { getIcon } from '../../utils/iconMap';
import { HierarchicalTabBarProps, HierarchicalTab } from '../../types/hierarchical';

// Legacy interface for backward compatibility
interface LegacyTabBarProps {
  tabs?: any[];
  activeTabId?: string;
  className?: string;
  showAddButton?: boolean;
  showOverflowMenu?: boolean;
  maxVisibleTabs?: number;
  onTabClick?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabReorder?: (sourceIndex: number, destinationIndex: number) => void;
  onTabPin?: (tabId: string) => void;
  onTabUnpin?: (tabId: string) => void;
  onTabDuplicate?: (tabId: string) => void;
  onNewTab?: (tabData?: any) => void;
  maxTabs?: number;
  enableTabGroups?: boolean;
  theme?: string;
  userRole?: string;
  userPermissions?: string[];
}

// Enhanced props that support both legacy and hierarchical modes
type EnhancedTabBarProps = LegacyTabBarProps & Partial<HierarchicalTabBarProps>;

const TabBarComponent: React.FC<EnhancedTabBarProps> = ({
  tabs: propTabs,
  activeTabId: propActiveTabId,
  className,
  showAddButton = true,
  showOverflowMenu = true,
  maxVisibleTabs = 10,
  onTabClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  onTabUnpin,
  onTabDuplicate,
  onNewTab,
  maxTabs,
  enableTabGroups,
  theme,
  userRole,
  userPermissions,
  // Hierarchical props
  hierarchicalTabs,
  enableHierarchicalMode = false,
  onSubTabChange,
  showCloseButtons = true,
  tabStyle = 'modern',
}) => {
  const {
    tabs: storeTabs,
    activeTabId: storeActiveTabId,
    activateTab,
    closeTab,
    reorderTabs,
    pinnedTabs,
    pinTab,
    unpinTab,
    duplicateTab,
    validateTabAccess
  } = useTabStore();
  
  // Use hierarchical tabs if in hierarchical mode, otherwise use legacy tabs
  const tabs = enableHierarchicalMode ? (hierarchicalTabs || []) : (propTabs || storeTabs || []);
  const activeTabId = propActiveTabId || storeActiveTabId;
  
  // Convert legacy tabs to hierarchical format if needed
  const processedTabs: HierarchicalTab[] = enableHierarchicalMode 
    ? (tabs as HierarchicalTab[])
    : (tabs as any[]).map(tab => ({
        ...tab,
        subTabs: [],
        activeSubTabId: null,
        canClose: tab.canClose !== false,
        hierarchyLevel: 0
      }));

  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [overflowTabs, setOverflowTabs] = useState<string[]>([]);
  void scrollPosition;
  void overflowTabs;
  void setScrollPosition;
  void setOverflowTabs;
  const [showOverflowDropdown, setShowOverflowDropdown] = useState(false);
  
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate visible tabs and overflow
  const visibleTabs = processedTabs.slice(0, maxVisibleTabs);
  const hiddenTabs = processedTabs.slice(maxVisibleTabs);

  // Update scroll indicators
  const updateScrollIndicators = useCallback(() => {
    if (!tabsContainerRef.current) return;
    
    const container = tabsContainerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Handle scroll
  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (!tabsContainerRef.current) return;
    
    const container = tabsContainerRef.current;
    const scrollAmount = 200;
    const newScrollLeft = direction === 'left' 
      ? Math.max(0, container.scrollLeft - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);
    
    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex !== destinationIndex) {
      if (onTabReorder) {
        onTabReorder(sourceIndex, destinationIndex);
      } else {
        reorderTabs(sourceIndex, destinationIndex);
      }
    }
  }, [onTabReorder, reorderTabs]);

  // Handle tab click
  const handleTabClick = useCallback((tabId: string) => {
    if (onTabClick) {
      onTabClick(tabId);
    } else {
      const tab = processedTabs.find(t => t.id === tabId);
      if (tab && validateTabAccess(tab.id)) {
        activateTab(tabId);
      }
    }
  }, [onTabClick, processedTabs, validateTabAccess, activateTab]);
  
  // Handle sub-tab change for hierarchical tabs
  const handleSubTabChange = useCallback((tabId: string, subTabId: string) => {
    if (onSubTabChange) {
      onSubTabChange(tabId, subTabId);
    }
    // Update the active sub-tab in the tab
    const _updatedTabs = processedTabs.map(tab => 
      tab.id === tabId ? { ...tab, activeSubTabId: subTabId } : tab
    );
    void _updatedTabs;
    // Note: In a real implementation, you'd update the store here
  }, [onSubTabChange, processedTabs]);

  // Handle tab close
  const handleTabClose = useCallback((tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onTabClose) {
      onTabClose(tabId);
    } else {
      closeTab(tabId);
    }
  }, [onTabClose, closeTab]);

  // Handle tab pin/unpin
  const handleTabPin = useCallback((tabId: string) => {
    const isPinned = pinnedTabs.includes(tabId);
    if (isPinned) {
      if (onTabUnpin) {
        onTabUnpin(tabId);
      } else {
        unpinTab(tabId);
      }
    } else {
      if (onTabPin) {
        onTabPin(tabId);
      } else {
        pinTab(tabId);
      }
    }
  }, [pinnedTabs, onTabPin, onTabUnpin, pinTab, unpinTab]);

  // Handle tab duplicate
  const handleTabDuplicate = useCallback((tabId: string) => {
    if (onTabDuplicate) {
      onTabDuplicate(tabId);
    } else {
      duplicateTab(tabId);
    }
  }, [onTabDuplicate, duplicateTab]);

  // Handle add tab
  const handleAddTab = useCallback(() => {
    if (onNewTab) {
      onNewTab();
    }
  }, [onNewTab]);

  // Handle overflow tab click
  const handleOverflowTabClick = useCallback((tabId: string) => {
    handleTabClick(tabId);
    setShowOverflowDropdown(false);
  }, [handleTabClick]);

  // Update scroll indicators on mount and resize
  useEffect(() => {
    updateScrollIndicators();
    
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollIndicators);
      return () => container.removeEventListener('scroll', updateScrollIndicators);
    }
  }, [updateScrollIndicators]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => updateScrollIndicators();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScrollIndicators]);

  // Close overflow dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overflowButtonRef.current && !overflowButtonRef.current.contains(event.target as Node)) {
        setShowOverflowDropdown(false);
      }
    };

    if (showOverflowDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showOverflowDropdown]);

  // Get tab bar styling based on style mode
  const getTabBarStyling = () => {
    const baseClasses = 'flex items-center overflow-hidden';
    
    if (tabStyle === 'modern') {
      return cn(
        baseClasses,
        'bg-gradient-to-r from-gray-50 to-white border-b border-gray-200',
        'min-h-[52px] max-h-[52px] shadow-sm backdrop-blur-sm',
        className
      );
    }
    
    // Legacy styling
    return cn(
      baseClasses,
      'bg-white border-b border-green-200 shadow-sm',
      'min-h-[48px] max-h-[48px]',
      className
    );
  };

  return (
    <div 
      ref={tabBarRef}
      className={getTabBarStyling()}
    >
      {/* Left scroll button */}
      {showLeftScroll && (
        <button
          onClick={() => handleScroll('left')}
          className={cn(
            'flex-shrink-0 p-2 transition-colors',
            tabStyle === 'modern'
              ? 'hover:bg-gray-100 border-r border-gray-200 text-gray-600 hover:text-gray-700'
              : 'hover:bg-green-50 border-r border-green-200 text-green-600 hover:text-green-700'
          )}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Tabs container */}
      <div 
        ref={tabsContainerRef}
        className="flex-1 flex overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tabs" direction="horizontal" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'flex min-w-full',
                  snapshot.isDraggingOver && 'bg-green-50'
                )}
              >
                {visibleTabs.map((tab, index) => (
                  <Draggable key={tab.id} draggableId={tab.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(
                          'flex-shrink-0',
                          snapshot.isDragging && 'z-50 rotate-2 shadow-lg'
                        )}
                      >
                        <TabComponent
                          tab={tab}
                          isActive={tab.id === activeTabId}
                          isPinned={pinnedTabs.includes(tab.id)}
                          isDragging={snapshot.isDragging}
                          onClick={() => handleTabClick(tab.id)}
                          onClose={showCloseButtons && tab.canClose !== false ? (e) => handleTabClose(tab.id, e) : undefined}
                          onPin={() => handleTabPin(tab.id)}
                          onDuplicate={() => handleTabDuplicate(tab.id)}
                          onSubTabChange={enableHierarchicalMode ? (subTabId) => handleSubTabChange(tab.id, subTabId) : undefined}
                          showCloseButton={showCloseButtons && tab.canClose !== false}
                          tabStyle={tabStyle}
                          enableHierarchicalMode={enableHierarchicalMode}
                          className={cn(
                            tabStyle === 'modern' 
                              ? 'border-r border-gray-200 last:border-r-0' 
                              : 'border-r border-green-200 last:border-r-0'
                          )}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Right scroll button */}
      {showRightScroll && (
        <button
          onClick={() => handleScroll('right')}
          className={cn(
            'flex-shrink-0 p-2 transition-colors',
            tabStyle === 'modern'
              ? 'hover:bg-gray-100 border-l border-gray-200 text-gray-600 hover:text-gray-700'
              : 'hover:bg-green-50 border-l border-green-200 text-green-600 hover:text-green-700'
          )}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Overflow menu */}
      {showOverflowMenu && hiddenTabs.length > 0 && (
        <div className="relative flex-shrink-0">
          <button
            ref={overflowButtonRef}
            onClick={() => setShowOverflowDropdown(!showOverflowDropdown)}
            className={cn(
              'p-2 transition-colors relative',
              tabStyle === 'modern'
                ? 'hover:bg-gray-100 border-l border-gray-200 text-gray-600 hover:text-gray-700'
                : 'hover:bg-green-50 border-l border-green-200 text-green-600 hover:text-green-700'
            )}
            aria-label={`${hiddenTabs.length} more tabs`}
          >
            <MoreHorizontal className="w-4 h-4" />
            {hiddenTabs.length > 0 && (
              <span className={cn(
                'absolute -top-1 -right-1 bg-green-500 text-white text-xs',
                'rounded-full w-5 h-5 flex items-center justify-center',
                'font-medium min-w-[20px]'
              )}>
                {hiddenTabs.length > 99 ? '99+' : hiddenTabs.length}
              </span>
            )}
          </button>

          {/* Overflow dropdown */}
          {showOverflowDropdown && (
            <div className={cn(
              'absolute top-full right-0 mt-1 bg-white border border-green-200',
              'rounded-lg shadow-lg z-50 min-w-[200px] max-w-[300px]',
              'max-h-[300px] overflow-y-auto'
            )}>
              <div className="p-2">
                <div className="text-xs font-medium text-green-700 mb-2 px-2">
                  Hidden Tabs ({hiddenTabs.length})
                </div>
                {hiddenTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleOverflowTabClick(tab.id)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded hover:bg-green-50',
                      'flex items-center gap-2 text-sm transition-colors',
                      tab.id === activeTabId && 'bg-green-100 text-green-800'
                    )}
                  >
                    {tab.icon && (() => {
                      const IconComponent = getIcon(tab.icon);
                      return IconComponent ? (
                        <span className="text-green-600 flex-shrink-0">
                          <IconComponent className="w-4 h-4" />
                        </span>
                      ) : null;
                    })()}
                    <span className="truncate flex-1">{tab.title}</span>
                    {pinnedTabs.includes(tab.id) && (
                      <span className="text-green-500 text-xs">📌</span>
                    )}
                    {tab.isDirty && (
                      <span className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add tab button */}
      {showAddButton && (
        <button
          onClick={handleAddTab}
          className={cn(
            'flex-shrink-0 p-2 transition-colors',
            tabStyle === 'modern'
              ? 'hover:bg-gray-100 border-l border-gray-200 text-gray-600 hover:text-gray-700'
              : 'hover:bg-green-50 border-l border-green-200 text-green-600 hover:text-green-700'
          )}
          aria-label="Add new tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// CSS for hiding scrollbar (add to global styles)
const scrollbarHideStyles = `
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
`;

// Memoize TabBar to prevent unnecessary re-renders
export const TabBar = React.memo(TabBarComponent, (prevProps, nextProps) => {
  // Custom comparison function for optimization
  return (
    prevProps.activeTabId === nextProps.activeTabId &&
    prevProps.className === nextProps.className &&
    prevProps.showAddButton === nextProps.showAddButton &&
    prevProps.showOverflowMenu === nextProps.showOverflowMenu &&
    prevProps.maxVisibleTabs === nextProps.maxVisibleTabs &&
    prevProps.maxTabs === nextProps.maxTabs &&
    prevProps.enableTabGroups === nextProps.enableTabGroups &&
    prevProps.theme === nextProps.theme &&
    prevProps.userRole === nextProps.userRole &&
    prevProps.enableHierarchicalMode === nextProps.enableHierarchicalMode &&
    prevProps.showCloseButtons === nextProps.showCloseButtons &&
    prevProps.tabStyle === nextProps.tabStyle &&
    JSON.stringify(prevProps.tabs) === JSON.stringify(nextProps.tabs) &&
    JSON.stringify(prevProps.hierarchicalTabs) === JSON.stringify(nextProps.hierarchicalTabs) &&
    JSON.stringify(prevProps.userPermissions) === JSON.stringify(nextProps.userPermissions) &&
    prevProps.onTabClick === nextProps.onTabClick &&
    prevProps.onTabClose === nextProps.onTabClose &&
    prevProps.onTabReorder === nextProps.onTabReorder &&
    prevProps.onTabPin === nextProps.onTabPin &&
    prevProps.onTabUnpin === nextProps.onTabUnpin &&
    prevProps.onTabDuplicate === nextProps.onTabDuplicate &&
    prevProps.onNewTab === nextProps.onNewTab &&
    prevProps.onSubTabChange === nextProps.onSubTabChange
  );
});

TabBar.displayName = 'TabBar';

export { scrollbarHideStyles };
