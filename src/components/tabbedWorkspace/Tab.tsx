import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Pin, Copy, ExternalLink, MoreVertical, AlertCircle, Star } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Tab as TabType } from '@/types/tabbedWorkspace';
import { HierarchicalTab, SubTab } from '@/types/hierarchical';
import { getIcon } from '@/utils/iconMap';
import { useTabStore } from '@/stores/tabStore';
import { SubTabNavigation } from '../SubTabNavigation';
import { useFavorites } from '@/hooks/useFavorites';

// Legacy TabProps for backward compatibility
interface LegacyTabProps {
  tab: TabType;
  isActive: boolean;
  isPinned: boolean;
  isDragging?: boolean;
  className?: string;
  onClick: () => void;
  onClose: (event: React.MouseEvent) => void;
  onPin: () => void;
  onDuplicate: () => void;
  onOpenInNewWindow?: () => void;
  showContextMenu?: boolean;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseTabsToRight?: (tabId: string) => void;
  onCloseTabsToLeft?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  onCloseTab?: () => void;
  onCloseAllExceptPinned?: () => void;
}

// Enhanced TabProps with hierarchical support
interface HierarchicalTabProps {
  tab: HierarchicalTab;
  isActive: boolean;
  isPinned: boolean;
  isDragging?: boolean;
  className?: string;
  onClick: () => void;
  onClose: (event: React.MouseEvent) => void;
  onPin: () => void;
  onDuplicate: () => void;
  onOpenInNewWindow?: () => void;
  showContextMenu?: boolean;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseTabsToRight?: (tabId: string) => void;
  onCloseTabsToLeft?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  onCloseTab?: () => void;
  onCloseAllExceptPinned?: () => void;
  // Hierarchical features
  enableHierarchicalMode?: boolean;
  onSubTabChange?: (tabId: string, subTabId: string) => void;
  showCloseButton?: boolean;
  tabStyle?: 'legacy' | 'modern';
}

// Union type for enhanced compatibility
type TabProps = LegacyTabProps | HierarchicalTabProps;

// Type guard to check if props are hierarchical
function isHierarchicalTabProps(props: TabProps): props is HierarchicalTabProps {
  return 'enableHierarchicalMode' in props;
}

interface ContextMenuProps {
  tab: TabType;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onPin: () => void;
  onDuplicate: () => void;
  onOpenInNewWindow?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseTabsToRight?: (tabId: string) => void;
  onCloseTabsToLeft?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  onCloseTab?: () => void;
  onCloseAllExceptPinned?: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  tab,
  isVisible,
  position,
  onClose,
  onPin,
  onDuplicate,
  onOpenInNewWindow,
  isFavorite,
  onToggleFavorite,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseTabsToLeft,
  onCloseAllTabs,
  onCloseTab,
  onCloseAllExceptPinned
}) => {
  const tabStore = useTabStore();
  
  const handleAction = (action: string) => {
    switch (action) {
      case 'close':
        if (onCloseTab) onCloseTab();
        break;
      case 'close-others':
        if (onCloseOtherTabs) onCloseOtherTabs(tab.id);
        else tabStore.closeOtherTabs(tab.id);
        break;
      case 'close-to-right':
        if (onCloseTabsToRight) onCloseTabsToRight(tab.id);
        else tabStore.closeTabsToRight(tab.id);
        break;
      case 'close-to-left':
        if (onCloseTabsToLeft) onCloseTabsToLeft(tab.id);
        else tabStore.closeTabsToLeft(tab.id);
        break;
      case 'close-all':
        if (onCloseAllTabs) onCloseAllTabs();
        else tabStore.closeAllTabs();
        break;
      default:
        console.log(`Context menu action: ${action}`);
    }
    onClose();
  };
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onClose]);

  if (!isVisible || typeof document === 'undefined') return null;

  const menuItems = [
    {
      id: 'pin',
      label: tab.pinned ? 'Unpin Tab' : 'Pin Tab',
      icon: Pin,
      onClick: onPin,
      shortcut: 'Ctrl+P'
    },
    {
      id: 'favorite',
      label: isFavorite ? 'Unfavorite Tab' : 'Favorite Tab',
      icon: Star,
      onClick: () => {
        onToggleFavorite?.();
        onClose();
      }
    },
    {
      id: 'duplicate',
      label: 'Duplicate Tab',
      icon: Copy,
      onClick: onDuplicate,
      shortcut: 'Ctrl+D'
    },
    ...(onOpenInNewWindow ? [{
      id: 'newWindow',
      label: 'Open in New Window',
      icon: ExternalLink,
      onClick: onOpenInNewWindow,
      shortcut: 'Ctrl+Shift+N'
    }] : []),
    { id: 'closeTab', label: 'Close Tab', icon: X, onClick: () => handleAction('close'), shortcut: 'Del' },
    { id: 'separator1', type: 'separator' as const },
    {
      id: 'closeOthers',
      label: 'Close Other Tabs',
      icon: X,
      onClick: () => handleAction('close-others'),
      shortcut: 'Ctrl+Alt+W'
    },
    {
      id: 'closeToRight',
      label: 'Close Tabs to Right',
      icon: X,
      onClick: () => handleAction('close-to-right')
    },
    {
      id: 'closeToLeft',
      label: 'Close Tabs to Left',
      icon: X,
      onClick: () => handleAction('close-to-left')
    },
    {
      id: 'closeNonPinned',
      label: 'Close Non-Pinned Tabs',
      icon: X,
      onClick: () => {
        if (onCloseAllExceptPinned) onCloseAllExceptPinned();
        else tabStore.closeAllExceptPinned();
        onClose();
      }
    },
    {
      id: 'closeAll',
      label: 'Close All Tabs',
      icon: X,
      onClick: () => handleAction('close-all'),
      shortcut: 'Ctrl+Shift+W'
    }
  ];

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        'fixed bg-white border border-green-200 rounded-lg shadow-xl z-[9999]',
        'min-w-[180px] py-1 text-sm'
      )}
      style={{
        left: position.x,
        top: position.y
      }}
      role="menu"
      aria-label="Tab context menu"
    >
      {menuItems.map((item) => {
        if (item.type === 'separator') {
          return (
            <div
              key={item.id}
              className="h-px bg-green-200 my-1 mx-2"
              role="separator"
            />
          );
        }

        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'w-full px-3 py-2 text-left hover:bg-green-50 transition-colors',
              'flex items-center gap-3 text-gray-700 hover:text-green-800'
            )}
            role="menuitem"
          >
            <Icon className="w-4 h-4 text-green-600" />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-400">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );
};

export const Tab: React.FC<TabProps> = (props) => {
  const {
    tab,
    isActive,
    isPinned,
    isDragging = false,
    className,
    onClick,
    onClose,
    onPin,
    onDuplicate,
    onOpenInNewWindow,
    showContextMenu = true,
    onCloseOtherTabs,
    onCloseTabsToRight,
    onCloseTabsToLeft,
    onCloseAllTabs,
    onCloseAllExceptPinned
  } = props;
  
  // Extract hierarchical props if available
  const isHierarchical = isHierarchicalTabProps(props);
  const enableHierarchicalMode = isHierarchical ? props.enableHierarchicalMode : false;
  const onSubTabChange = isHierarchical ? props.onSubTabChange : undefined;
  const showCloseButton = isHierarchical ? props.showCloseButton : undefined;
  const tabStyle = isHierarchical ? props.tabStyle || 'legacy' : 'legacy';
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
  }>({ isVisible: false, position: { x: 0, y: 0 } });
  
  const { isFavorite, toggleFavorite } = useFavorites();
  const isTabFavorite = isFavorite(tab.id);
  
  const [isHovered, setIsHovered] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  // Handle close context menu
  const handleCloseTabFromContext = useCallback(() => {
    // Create a minimal mouse event-like object to satisfy onClose signature
    (onClose as any)({ preventDefault: () => {}, stopPropagation: () => {} });
  }, [onClose]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (!showContextMenu) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Adjust position to prevent menu from going off-screen
    let x = event.clientX;
    let y = event.clientY;
    
    // Approximate menu dimensions
    const menuWidth = 220;
    const menuHeight = 300;
    
    if (typeof window !== 'undefined') {
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }
    }
    
    setContextMenu({
      isVisible: true,
      position: { x, y }
    });
  }, [showContextMenu]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onClick();
        break;
      case 'Delete':
      case 'Backspace':
        if (!isPinned) {
          event.preventDefault();
          onClose(event as any);
        }
        break;
      case 'p':
      case 'P':
        if (event.ctrlKey) {
          event.preventDefault();
          onPin();
        }
        break;
      case 'd':
      case 'D':
        if (event.ctrlKey) {
          event.preventDefault();
          onDuplicate();
        }
        break;
    }
  }, [onClick, onClose, onPin, onDuplicate, isPinned]);

  // Calculate tab width based on content
  const getTabWidth = () => {
    if (isPinned) return 'w-14 min-w-[56px] justify-center'; // Compact pinned tabs, centered content
    if (tab.title.length > 20) return 'w-48'; // Long titles
    if (tab.title.length > 10) return 'w-36'; // Medium titles
    return 'w-32'; // Short titles
  };

  // Get status indicator
  const getStatusIndicator = () => {
    if (tab.isLoading) {
      return (
        <div className={cn(
          'w-3 h-3 border-2 rounded-full animate-spin',
          tabStyle === 'modern'
            ? 'border-gray-300 border-t-gray-600'
            : 'border-green-300 border-t-green-600'
        )} />
      );
    }
    
    if ('hasError' in tab && tab.hasError) {
      return (
        <AlertCircle className="w-3 h-3 text-red-500" />
      );
    }
    
    if (tab.isDirty) {
      return (
        <div 
          className="w-2 h-2 bg-orange-400 rounded-full" 
          title="Unsaved changes"
        />
      );
    }
    
    return null;
  };

  // Get tab styling based on style mode
  const getTabStyling = () => {
    if (tabStyle === 'modern') {
      return {
        base: 'bg-white border-gray-200 text-gray-700',
        active: 'bg-white border-blue-500 text-blue-800 shadow-sm',
        inactive: 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-700',
        pinned: 'bg-blue-50 border-blue-200 text-blue-800',
        error: 'bg-red-50 border-red-300',
        loading: 'bg-blue-50 border-blue-300'
      };
    }
    
    // Legacy styling
    return {
      base: 'bg-green-50 border-green-200 text-green-700',
      active: 'bg-white border-green-500 text-green-800 shadow-sm',
      inactive: 'bg-green-50 border-transparent text-gray-600 hover:bg-green-100 hover:text-green-700',
      pinned: 'bg-green-100 border-green-300 text-green-800',
      error: 'bg-red-50 border-red-300',
      loading: 'bg-blue-50 border-blue-300'
    };
  };

  const styling = getTabStyling();

  return (
    <>
      <div
        ref={tabRef}
        className={cn(
          'relative cursor-pointer transition-all duration-200',
          'border-b-2 select-none group',
          isPinned ? 'rounded-lg m-1 border-2' : '',
          getTabWidth(),
          enableHierarchicalMode ? 'flex flex-col' : 'flex items-center',
          {
            // Active state
            [styling.active]: isActive,
            // Inactive state
            [styling.inactive]: !isActive && !isPinned && !('hasError' in tab && tab.hasError) && !tab.isLoading,
            // Pinned state
            [styling.pinned]: isPinned,
            // Dragging state
            'opacity-50 scale-95': isDragging,
            // Error state
            [styling.error]: 'hasError' in tab && tab.hasError,
            // Loading state
            [styling.loading]: tab.isLoading
          },
          className
        )}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onMouseDown={(e) => {
          // Stop propagation for right-click to prevent react-beautiful-dnd from 
          // intercepting the mousedown and cancelling the contextmenu event
          if (e.button === 2) {
            e.stopPropagation();
          }
        }}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={0}
        role="tab"
        aria-selected={isActive}
        aria-label={`${tab.title} tab${isPinned ? ' (pinned)' : ''}${tab.isDirty ? ' (unsaved changes)' : ''}`}
        title={`${tab.title}${tab.path ? ` - ${tab.path}` : ''}${isPinned ? ' (pinned)' : ''}${tab.isDirty ? ' (unsaved changes)' : ''}`}
      >
        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm z-10" />
        )}

        {/* Main tab content */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 min-w-0 flex-1",
          isPinned ? "justify-center px-0" : ""
        )}>
          {/* Icon */}
          {tab.icon && (
            <span className={cn(
              'flex-shrink-0 text-sm',
              isActive 
                ? (tabStyle === 'modern' ? 'text-blue-600' : 'text-green-600')
                : (isPinned ? (tabStyle === 'modern' ? 'text-blue-700' : 'text-green-700') : 'text-gray-500')
            )}>
              {(() => {
                const IconComponent = getIcon(tab.icon);
                return IconComponent ? <IconComponent className={isPinned ? "w-5 h-5" : "w-4 h-4"} /> : null;
              })()}
            </span>
          )}

          {/* Title */}
          {!isPinned && (
            <span className={cn(
              'truncate text-sm font-medium min-w-0',
              isActive 
                ? (tabStyle === 'modern' ? 'text-blue-800' : 'text-green-800')
                : 'text-gray-700'
            )}>
              {tab.title}
            </span>
          )}

          {/* Status indicator */}
          {!isPinned && (
            <div className="flex-shrink-0 flex items-center gap-1">
              {isTabFavorite && (
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
              )}
              {getStatusIndicator()}
            </div>
          )}

          {/* Close button */}
          {!isPinned && (showCloseButton !== false) && (isHovered || isActive) && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClose) onClose(e);
              }}
              className={cn(
                'flex-shrink-0 p-0.5 rounded transition-colors ml-1 relative z-10',
                'text-gray-500 hover:text-red-600',
                tabStyle === 'modern'
                  ? 'hover:bg-gray-200'
                  : 'hover:bg-green-200'
              )}
              aria-label={`Close ${tab.title} tab`}
              tabIndex={-1}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Hierarchical sub-tabs */}
        {enableHierarchicalMode && isHierarchical && isActive && (tab as HierarchicalTab).subTabs && (
          <div className="px-2 pb-2">
            <SubTabNavigation
              subTabs={(tab as HierarchicalTab).subTabs || []}
              activeSubTabId={(tab as HierarchicalTab).activeSubTabId || ''}
              onSubTabClick={(subTabId) => onSubTabChange?.(tab.id, subTabId)}
              canAddSubTab={false}
            />
          </div>
        )}

        {/* Active tab indicator */}
        {isActive && !isPinned && (
          <div className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5',
            tabStyle === 'modern' ? 'bg-blue-500' : 'bg-green-500'
          )} />
        )}

        {/* Keyboard focus indicator */}
        <div className={cn(
          'absolute inset-0 border-2 border-transparent transition-colors pointer-events-none',
          isPinned ? 'rounded-lg' : 'rounded-t',
          tabStyle === 'modern'
            ? 'focus-within:border-blue-400 focus-within:shadow-sm'
            : 'focus-within:border-green-400 focus-within:shadow-sm'
        )} />
      </div>

      {/* Context menu */}
      <ContextMenu
        tab={tab}
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={handleCloseContextMenu}
        onPin={onPin}
        onDuplicate={onDuplicate}
        onOpenInNewWindow={onOpenInNewWindow}
        isFavorite={isTabFavorite}
        onToggleFavorite={() => toggleFavorite({
          id: tab.id,
          title: tab.title,
          url: tab.path || '', // path corresponds to url in TabType
          icon: typeof tab.icon === 'string' ? tab.icon : undefined,
          module: tab.module || 'dashboard'
        })}
        onCloseOtherTabs={onCloseOtherTabs}
          onCloseTabsToRight={onCloseTabsToRight}
          onCloseTabsToLeft={onCloseTabsToLeft}
          onCloseAllTabs={onCloseAllTabs}
          onCloseTab={handleCloseTabFromContext}
          onCloseAllExceptPinned={onCloseAllExceptPinned}
      />
    </>
  );
};

export type { TabProps };


