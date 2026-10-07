import { logger } from '@/utils/logging';

// ABOUTME: Custom hook for SecondarySidebar business logic
// ABOUTME: Extracts navigation logic, module filtering, and state management

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DropResult } from 'react-beautiful-dnd';
import { useDynamicNavigation } from './useDynamicNavigation';
import { useRBAC } from './useRBAC';
import { useAuth } from '@/contexts/AuthContext';
import { useFullWidth } from '@/contexts/FullWidthContext';
import { useTabNavigation } from './useTabNavigation';
import { useToastHelpers } from './useToast';
import { useFavorites } from './useFavorites';
import { getModuleStyle, normalizeModuleId, type ModuleStyle } from '../utils/moduleStyles';

interface UseSecondarySidebarOptions {
  selectedModuleKey: string;
  isOpen: boolean;
  onClose: () => void;
  items?: any[];
  onItemClick?: (item: { path: string; name?: string }) => void;
}

interface UseSecondarySidebarReturn {
  // State
  search: string;
  setSearch: (value: string) => void;
  openGroups: { [key: string]: boolean };
  isMinimized: boolean;
  isMobile: boolean;
  focusedIndex: number;

  // Navigation data
  navigationItems: any[];
  subMenus: any[];
  isLoading: boolean;
  selectedModuleId: string;
  moduleKey: string;
  moduleStyle: ModuleStyle;
  favorites: any[];

  // Actions
  toggleGroup: (key: string) => void;
  toggleMinimized: () => void;
  handleNavigationClick: (item: any, event: React.MouseEvent) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleDragEnd: (result: DropResult) => void;
  filterItems: (items: any[]) => any[];
  setIsMinimized: (value: boolean) => void;
  setFocusedIndex: (index: number) => void;
}

export function useSecondarySidebar(options: UseSecondarySidebarOptions): UseSecondarySidebarReturn {
  const { selectedModuleKey, isOpen, onClose, items: propItems, onItemClick } = options;
  
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems, isLoading } = useDynamicNavigation(true);
  const { hasModuleAccess } = useRBAC();
  const { user } = useAuth();
  const { navigateToTab } = useTabNavigation();
  const { showInfo, showError, showWarning } = useToastHelpers();
  const { favorites, reorderFavorites } = useFavorites();

  // State
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Pre-translate error messages
  const errorMessages = useMemo(() => ({
    tabLimit: 'Tab limit reached. Please close some tabs before opening new ones.',
    accessDenied: 'Access denied. You do not have permission to view this section.',
    notInitialized: 'System is still initializing. Please try again in a moment.',
    generalError: 'Failed to open tab. Please try again or contact support.',
    missingPath: 'Missing navigation path. Please report this issue.'
  }), []);

  // Memoize selected module and related data
  const selectedModuleId = useMemo(() => normalizeModuleId(selectedModuleKey), [selectedModuleKey]);

  const selectedModule = useMemo(() => {
    if (!Array.isArray(navigationItems) || !selectedModuleId) {
      return undefined;
    }

    const validItems = navigationItems.filter(item => item != null);

    const directMatch = validItems.find(item =>
      item?.isGroup && normalizeModuleId(item?.modulePath || item?.path || item?.name) === selectedModuleId
    );
    if (directMatch) {
      return directMatch;
    }

    return validItems.find(item =>
      item?.isGroup && (item?.path || '').startsWith(`/${selectedModuleId}`)
    );
  }, [navigationItems, selectedModuleId]);

  // Build submenus
  const { isFullWidth } = useFullWidth();

  const subMenus = useMemo(() => {
    let items = [];
    if (propItems && Array.isArray(propItems) && propItems.length > 0) {
      items = propItems.filter((item: any) => item != null);
    } else if (selectedModule?.children && Array.isArray(selectedModule.children)) {
      items = selectedModule.children.filter((item: any) => item != null);
    }

    // Dashboard is not a module — no secondary sidebar content for it
    if (selectedModuleId === 'dashboard') {
      return [];
    }

    const currentMode = isFullWidth ? 'fullwidth' : 'standard';

    items = items.filter((item: any) => {
      // Always hide deprecated items from sidebar navigation
      if (item.deprecated === true) return false;

      // If no showInModes specified, default to standard-only (not fullwidth)
      const modes = item.showInModes || ['standard'];
      return modes.includes(currentMode);
    });

    // Deduplicate items by path — defensive layer that prevents duplicate
    // nav entries even if a future module forgets the showInModes flag or
    // declares two items with the same path. Keep the first occurrence.
    const seen = new Set<string>();
    items = items.filter((item: any) => {
      if (!item || !item.path) return true; // Keep items without a path
      if (seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    });

    return items;
  }, [selectedModule, propItems, selectedModuleId, favorites, isFullWidth]);

  const moduleKey = useMemo(() => selectedModuleId || 'settings', [selectedModuleId]);
  const moduleStyle = useMemo(() => getModuleStyle(moduleKey), [moduleKey]);

  // Responsive behavior
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setIsMobile(width < 1024);
    
    if (width >= 768 && width < 1200) {
      setIsMinimized(true);
    } else if (width >= 1200) {
      setIsMinimized(false);
    }
    
    if (width < 640 || (width < 900 && height < 600)) {
      setIsMinimized(true);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close on mobile when clicking outside
  useEffect(() => {
    if (isMobile && isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const sidebar = document.getElementById('secondary-sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, isOpen, onClose]);

  // Toggle group
  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(g => ({ ...g, [key]: !g[key] }));
  }, []);

  // Toggle minimized
  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  // Filter items based on search
  const filterItems = useCallback((items: any[]) => {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item != null).filter(item => {
      const itemName = typeof item.name === 'string' ? item.name : '';
      try {
        // Parse namespace from key like "navigation:key.subkey"
        const [namespace, key] = itemName.includes(':') 
          ? itemName.split(':') 
          : ['navigation', itemName];
        const itemLabel = t(key, { ns: namespace });
        const searchLower = search.toLowerCase();
        
        return (typeof itemLabel === 'string' && itemLabel.toLowerCase().includes(searchLower)) ||
          (item.children && Array.isArray(item.children) && item.children.filter((child: any) => child != null).some((child: any) => {
            const childName = typeof child?.name === 'string' ? child.name : '';
            try {
              const [childNs, childKey] = childName.includes(':') 
                ? childName.split(':') 
                : ['navigation', childName];
              const childLabel = t(childKey, { ns: childNs });
              return typeof childLabel === 'string' && childLabel.toLowerCase().includes(searchLower);
            } catch (e) {
              return false;
            }
          }));
      } catch (e) {
        return false;
      }
    });
  }, [search, t]);

  // Handle navigation click
  const handleNavigationClick = useCallback(async (item: any, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (!item.path) {
      showWarning(errorMessages.missingPath);
      return;
    }

    if (onItemClick) {
      onItemClick({ path: item.path, name: item.name });
      return;
    }

    // Parse namespace from key like "navigation:key.subkey"
    const [namespace, key] = item.name.includes(':') 
      ? item.name.split(':') 
      : ['navigation', item.name];
    const itemTitle = t(key, { ns: namespace });

    try {
      const pathSegments = item.path.split('/');
      const pathModule = pathSegments[1] || '';
      const submodule = pathSegments[2] || undefined;

      if (!pathModule) {
        throw new Error('Invalid navigation path structure');
      }

      const canAccessModule = hasModuleAccess(pathModule);
      if (!canAccessModule) {
        throw new Error(`You don't have permission to access ${pathModule}`);
      }

      // Use redirectTo for deprecated items, otherwise use item.path
      const targetPath = item.redirectTo || item.path;

      const result = await navigateToTab(targetPath, {
        title: itemTitle,
        icon: item.icon,
        module: pathModule,
        submodule,
        contentType: 'component',
        component: 'DynamicPageComponent',
        metadata: {
          source: 'secondary-sidebar',
          moduleKey: selectedModuleKey,
          userId: user?.id,
          timestamp: new Date().toISOString()
        },
        forceCreate: false
      });

      logger.info('Tab navigation successful:', {
        path: targetPath,
        originalPath: item.path,
        module: pathModule,
        submodule,
        tabId: result.tabId,
        wasCreated: result.wasCreated
      });
      
      if (isMobile) {
        onClose();
      }
      
      if (result.wasCreated) {
        showInfo(`Opened ${itemTitle} in new tab`, { size: 'compact' });
      }
      
    } catch (error) {
      logger.error('Navigation failed:', error);
      const err = error as Error;

      if (err.message.includes('Maximum tab limit')) {
        showError(errorMessages.tabLimit);
      } else if (err.message.includes('permission')) {
        showError(errorMessages.accessDenied);
      } else if (err.message.includes('not initialized')) {
        showError(errorMessages.notInitialized);
      } else {
        showError(errorMessages.generalError);
      }
    }
  }, [hasModuleAccess, isMobile, navigateToTab, onClose, onItemClick, selectedModuleKey, showError, showInfo, showWarning, t, user?.id, errorMessages]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    const items = filterItems(subMenus);
    const maxIndex = items.length - 1;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => prev < maxIndex ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : maxIndex);
        break;
      case 'Escape':
        e.preventDefault();
        if (isMobile) {
          onClose();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex <= maxIndex) {
          const item = items[focusedIndex];
          if (item.children) {
            toggleGroup(item.name);
          }
        }
        break;
    }
  }, [isOpen, subMenus, isMobile, onClose, toggleGroup, filterItems]);

  // Handle drag end for favorites
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    reorderFavorites(result.source.index, result.destination.index);
  }, [reorderFavorites]);

  return {
    search,
    setSearch,
    openGroups,
    isMinimized,
    isMobile,
    focusedIndex,
    navigationItems,
    subMenus,
    isLoading,
    selectedModuleId,
    moduleKey,
    moduleStyle,
    favorites,
    toggleGroup,
    toggleMinimized,
    handleNavigationClick,
    handleKeyDown,
    handleDragEnd,
    filterItems,
    setIsMinimized,
    setFocusedIndex
  };
}

export default useSecondarySidebar;
