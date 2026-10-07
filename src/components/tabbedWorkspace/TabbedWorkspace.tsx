import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { TabWorkspaceErrorBoundary } from './TabWorkspaceErrorBoundary';
import { TabBar } from './TabBar';
import { ActionBar } from './ActionBar';
import { BreadcrumbNavigation } from '../BreadcrumbNavigation';
import { useTabStore } from '../../stores/tabStore';
import { useActionRegistry } from '../../services/ui/actionRegistry';
import type { TabbedWorkspaceProps, Tab } from '../../types/tabbedWorkspace';
import type { HierarchicalTab, BreadcrumbItem } from '../../types/hierarchical';
import { resolveTabContent } from './resolveTabContent';
import DynamicPageComponent from '../DynamicPageComponent';
import { isEqual } from 'lodash';
import { logger } from '@/utils/logging';

export const TabbedWorkspace: React.FC<TabbedWorkspaceProps> = ({
  className = '',
  showActionBar = true,
  showSettings = true,
  onTabContentRender,
  onSettingsClick,
  maxTabs = 20,
  enableTabGroups = false,
  enableTabPersistence = true,
  theme = 'default',
  userRole = 'guest',
  userPermissions = [],
  moduleContext = 'dashboard',
  onTabChange,
  onTabClose,
  onTabCreate,
  onError,
  // Hierarchical features
  enableHierarchicalMode = false,
  showBreadcrumbs = true,
  tabStyle = 'legacy',
  showCloseButton = true,
  onBreadcrumbClick,
  onSubTabChange
}) => {
  // Remove excessive console logging to prevent performance issues
  // Only log in development mode with a flag
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_TABS) {
    logger.info('TabbedWorkspace: Rendering');
  }
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    activateTab,
    reorderTabs,
    pinTab,
    unpinTab,
    duplicateTab,
    setUserRole,
    updateUserPermissions,
    validateTabAccess,
    initializeStore,
    initialize,
    clearCorruptedData
  } = useTabStore();

  const { registerAction, getActionsByContext } = useActionRegistry();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const prevUserRoleRef = useRef(userRole);
  const prevUserPermissionsRef = useRef(userPermissions);
  const isInitializedRef = useRef(false);
  const onTabChangeRef = useRef(onTabChange);
  const prevActiveTabIdRef = useRef<string | null>(null);
  const permissionsHashRef = useRef<string>('');
  
  // Memoize store configuration to prevent unnecessary reinitializations
  const storeConfig = useMemo(() => ({
    maxTabs,
    enablePersistence: enableTabPersistence,
    enableTabGroups
  }), [maxTabs, enableTabPersistence, enableTabGroups]);

  // Keep onTabChange ref up to date without triggering effects
  useEffect(() => {
    onTabChangeRef.current = onTabChange;
    
    // Clear onTabChange ref on unmount
    return () => {
      onTabChangeRef.current = undefined;
    };
  }, [onTabChange]);
  
  // Memoized onTabChange wrapper with proper dependencies
  const handleTabChange = useCallback((tab: Tab) => {
    // Only call onTabChange when activeTab actually changes
    if (tab && tab.id !== prevActiveTabIdRef.current) {
      prevActiveTabIdRef.current = tab.id;
      onTabChangeRef.current?.(tab);
    }
  }, []);

  // Use ref for onSettingsClick to avoid dependency
  const onSettingsClickRef = useRef(onSettingsClick);
  useEffect(() => {
    onSettingsClickRef.current = onSettingsClick;
  }, [onSettingsClick]);

  // Initialize workspace on mount with cleanup flag
  useEffect(() => {
    let isMounted = true;
    
    const initializeWorkspace = async () => {
      if (!isMounted) return;
      if (isInitializedRef.current) {
        logger.info('⏭️ [TabbedWorkspace] Already initialized, skipping');
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Use Promise.all for parallel initialization where possible
        await Promise.all([
          initialize(),
          new Promise<void>(resolve => {
            initializeStore(storeConfig);
            resolve();
          })
        ]);

        // Clear corrupted data after initialization - only run once
        if (!isInitializedRef.current) {
          clearCorruptedData();
        }

        // Register default workspace actions only once
        if (isMounted) {
          registerAction({
            id: 'workspace.refresh',
            label: 'Refresh Workspace',
            icon: ArrowPathIcon,
            category: 'workspace',
            context: ['workspace'],
            permissions: ['workspace.refresh'],
            execute: async () => {
              setIsLoading(true);
              try {
                await initialize();
                clearCorruptedData();
              } finally {
                setIsLoading(false);
              }
            }
          });

          registerAction({
            id: 'workspace.settings',
            label: 'Workspace Cog6ToothIcon',
            icon: Cog6ToothIcon,
            category: 'workspace',
            context: ['workspace'],
            permissions: ['workspace.settings'],
            execute: async () => {
              onSettingsClickRef.current?.();
            }
          });

          isInitializedRef.current = true;
          setError(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize workspace';
        logger.error('TabbedWorkspace: Initialization failed:', err);
        if (isMounted) {
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeWorkspace();
    
    return () => {
      isMounted = false;
      // Cleanup actions on unmount
      setError(null);
      setIsLoading(false);
      isInitializedRef.current = false;
      
      // Clear any stored tab states
      tabs.forEach(tab => {
        if (tab.state) {
          clearTabState(tab.id);
        }
      });
    };
  }, [storeConfig, registerAction, initialize, initializeStore, onError]); // Include stable dependencies

  // Handle user role changes with primitive comparison
  useEffect(() => {
    // Use primitive comparison instead of object reference
    if (userRole && userRole !== prevUserRoleRef.current) {
      prevUserRoleRef.current = userRole;
      setUserRole(userRole);
    }
  }, [userRole, setUserRole]);

  // Abort controller for async operations
  const abortControllerRef = useRef<AbortController>();

  // Initialize abort controller
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handle user permissions changes with hash comparison for efficiency
  useEffect(() => {
    // Create a hash of permissions for faster comparison
    const createPermissionsHash = (perms: string[]): string => {
      if (!perms || perms.length === 0) return '';
      // Sort to ensure consistent hash regardless of order
      return perms.slice().sort().join('|');
    };
    
    const currentHash = createPermissionsHash(userPermissions);
    
    // Only update if hash has changed
    if (currentHash && currentHash !== permissionsHashRef.current) {
      permissionsHashRef.current = currentHash;
      prevUserPermissionsRef.current = userPermissions;
      updateUserPermissions(userPermissions);
    }
  }, [userPermissions, updateUserPermissions]);

  // Memoized breadcrumb generation logic
  const generateBreadcrumbs = useCallback((tab: Tab): BreadcrumbItem[] => {
    if (!enableHierarchicalMode || !tab.path) return [];
    
    const pathSegments = tab.path.split('/').filter(Boolean);
    return pathSegments.map((segment, index) => ({
      id: `breadcrumb-${index}`,
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      path: '/' + pathSegments.slice(0, index + 1).join('/'),
      isActive: index === pathSegments.length - 1
    }));
  }, [enableHierarchicalMode]);

// Handle tab changes and update breadcrumbs with proper change detection
  useEffect(() => {
    if (activeTabId) {
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      if (activeTab) {
        // Use the memoized handler that checks for actual changes
        handleTabChange(activeTab);
        
        // Update breadcrumbs for hierarchical tabs
        if (enableHierarchicalMode && activeTab.path) {
          const newBreadcrumbs = generateBreadcrumbs(activeTab);
          setBreadcrumbs(prevBreadcrumbs => {
            // Only update if breadcrumbs actually changed
            if (isEqual(prevBreadcrumbs, newBreadcrumbs)) {
              return prevBreadcrumbs;
            }
            return newBreadcrumbs;
          });
        }
      }
    }
  }, [activeTabId, tabs, enableHierarchicalMode, handleTabChange, generateBreadcrumbs]);

  // Handle drag and drop for tab reordering
  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex !== destinationIndex) {
      reorderTabs(sourceIndex, destinationIndex);
    }
  }, [reorderTabs]);

  // Memoized tab creation handler
  const handleTabCreate = useCallback((tabData?: Partial<Tab>) => {
    try {
      const newTab = createTab({
        title: tabData?.title || 'New Tab',
        content: tabData?.content || { type: 'empty' },
        module: tabData?.module || moduleContext,
        permissions: tabData?.permissions || [],
        path: tabData?.path || `/${tabData?.module || moduleContext}/${Date.now()}`,
        pinned: tabData?.pinned || false,
        isDirty: tabData?.isDirty || false,
        canClose: tabData?.canClose !== undefined ? tabData.canClose : true,
        metadata: tabData?.metadata || {},
        ...(tabData || {})
      });
      
      onTabCreate?.(newTab);
      return newTab;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tab';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [createTab, moduleContext, onTabCreate, onError]);

  // Memoized tab closing handler
  const handleTabClose = useCallback((tabId: string) => {
    try {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        closeTab(tabId);
        onTabClose?.(tab);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close tab';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [tabs, closeTab, onTabClose, onError]);

  // Memoized breadcrumb click handler
  const handleBreadcrumbClick = useCallback((breadcrumb: BreadcrumbItem) => {
    onBreadcrumbClick?.(breadcrumb);
    // Optionally navigate to the breadcrumb path
    // This could involve creating a new tab or updating the current tab
  }, [onBreadcrumbClick]);

  // Memoized sub-tab change handler
  const handleSubTabChange = useCallback((tabId: string, subTabId: string) => {
    onSubTabChange?.(tabId, subTabId);
    // Update the tab's active sub-tab in the store if needed
  }, [onSubTabChange]);

  // Memoized tab content renderer
  const renderTabContent = useCallback(() => {
    if (!activeTabId) {
      return (
        <div className="flex-1 flex items-center justify-center bg-surface-muted text-surface-muted-fg">
          <div className="text-center px-4">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg font-medium mb-2">No tabs open</p>
            <p className="text-sm">Create a new tab to get started</p>
          </div>
        </div>
      );
    }

    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) {
      return (
        <div className="flex-1 flex items-center justify-center bg-red-50 text-red-600">
          <div className="text-center px-4">
            <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Tab not found</p>
            <p className="text-sm">The requested tab could not be loaded</p>
          </div>
        </div>
      );
    }

    // Check tab access permissions
    if (!validateTabAccess(activeTab.id)) {
      return (
        <div className="flex-1 flex items-center justify-center bg-yellow-50 text-yellow-700">
          <div className="text-center px-4">
            <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Access Denied</p>
            <p className="text-sm">You don't have permission to view this tab</p>
          </div>
        </div>
      );
    }

    // Render custom content or default content
    if (onTabContentRender) {
      return (
        <div className="flex-1 overflow-hidden">
          {onTabContentRender(activeTab)}
        </div>
      );
    }

    // Default content rendering based on tab type with responsive design
      // For route-based tabs, we render the actual route content
      return (
        <div className="flex-1 px-2 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 overflow-auto bg-surface-card">
          <div className="w-full">
            <h1 className="text-xl sm:text-2xl font-bold text-surface-foreground mb-3 sm:mb-4">{activeTab.title}</h1>
            {/* For route-based tabs, we render the actual route content */}
            {activeTab.content.type === 'component' && activeTab.content.component === 'DynamicPageComponent' ? (
              <DynamicPageComponent path={activeTab.path} />
            ) : (
              resolveTabContent(activeTab)
            )}
          </div>
        </div>
      );
  }, [activeTabId, tabs, validateTabAccess, onTabContentRender]);
  
  // Memoize the active tab to prevent unnecessary lookups
  const activeTab = useMemo(() => {
    return tabs.find(tab => tab.id === activeTabId);
  }, [activeTabId, tabs]);

  // Memoize filtered and sorted tabs for better performance
  const sortedTabs = useMemo(() => {
    // Sort pinned tabs first, then by last accessed time
    const pinned = tabs.filter(tab => tab.pinned).sort((a, b) => a.order - b.order);
    const unpinned = tabs.filter(tab => !tab.pinned).sort((a, b) => a.order - b.order);
    return [...pinned, ...unpinned];
  }, [tabs]);

  // Memoize module style calculations
  const moduleStyles = useMemo(() => {
    const baseStyles = 'flex flex-col h-full bg-surface-muted w-full tabbed-workspace-mobile';
    const themeStyles = `theme-${theme}`;
    const modeStyles = enableHierarchicalMode ? 'hierarchical-mode' : 'legacy-mode';
    return `${baseStyles} ${themeStyles} ${modeStyles}`;
  }, [theme, enableHierarchicalMode]);

  // Memoize action bar props to prevent unnecessary re-renders
  const actionBarProps = useMemo(() => ({
    moduleContext,
    userRole,
    userPermissions,
    onSettingsClick: showSettings ? onSettingsClick : undefined
  }), [moduleContext, userRole, userPermissions, showSettings, onSettingsClick]);

  // Memoize tab bar props to prevent unnecessary re-renders
  const tabBarProps = useMemo(() => ({
    tabs: sortedTabs,
    activeTabId,
    onTabClick: activateTab,
    onTabClose: handleTabClose,
    onTabReorder: reorderTabs,
    onTabPin: pinTab,
    onTabUnpin: unpinTab,
    onTabDuplicate: duplicateTab,
    onNewTab: handleTabCreate,
    maxTabs,
    enableTabGroups,
    theme,
    userRole,
    userPermissions,
    enableHierarchicalMode,
    tabStyle,
    showCloseButton,
    onSubTabChange: handleSubTabChange
  }), [
    sortedTabs,
    activeTabId,
    activateTab,
    handleTabClose,
    reorderTabs,
    pinTab,
    unpinTab,
    duplicateTab,
    handleTabCreate,
    maxTabs,
    enableTabGroups,
    theme,
    userRole,
    userPermissions,
    enableHierarchicalMode,
    tabStyle,
    showCloseButton,
    handleSubTabChange
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-muted">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-surface-muted-fg">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50">
        <div className="text-center">
          <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-800 font-medium mb-2">Workspace Error</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Reload Workspace
          </button>
        </div>
      </div>
    );
  }

  // Remove excessive console logging
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_TABS) {
    logger.info('TabbedWorkspace: Rendering JSX with tabs:', tabs.length);
  }
  
  return (
    <TabWorkspaceErrorBoundary onError={(error, errorInfo) => onError?.(error.message)}>
      <div className={moduleStyles} data-testid="tabbed-workspace">
        {/* Breadcrumb Navigation */}
        {enableHierarchicalMode && showBreadcrumbs && breadcrumbs.length > 0 && (
          <BreadcrumbNavigation
            items={breadcrumbs}
            onItemClick={handleBreadcrumbClick}
            className="border-b border-surface-border bg-surface-card flex-shrink-0"
          />
        )}
        
        {/* Tab Bar */}
        <div className="flex-shrink-0">
          <TabBar {...tabBarProps} />
        </div>
        
        {/* Action Bar */}
        {showActionBar && (
          <div className="flex-shrink-0">
            <ActionBar {...actionBarProps} />
          </div>
        )}
        
        {/* Tab Content - Responsive container */}
        <div className="flex-1 overflow-hidden w-full min-h-0">
          {renderTabContent()}
        </div>
      </div>
    </TabWorkspaceErrorBoundary>
   );
};

export default TabbedWorkspace;
