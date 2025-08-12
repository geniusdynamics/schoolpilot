import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { TabBar } from './TabBar';
import { ActionBar } from './ActionBar';
import { BreadcrumbNavigation } from '../BreadcrumbNavigation';
import { useTabStore } from '../../stores/tabStore';
import { useActionRegistry } from '../../services/actionRegistry';
import type { TabbedWorkspaceProps, Tab } from '../../types/tabbedWorkspace';
import type { HierarchicalTab, BreadcrumbItem } from '../../types/hierarchical';

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
  console.log('🔥 TabbedWorkspace: Component rendering with props:', {
    showActionBar,
    showSettings,
    maxTabs,
    enableTabGroups,
    enableTabPersistence,
    theme,
    userRole,
    userPermissions,
    moduleContext
  });
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
    initialize
  } = useTabStore();

  const { registerAction, getActionsByContext } = useActionRegistry();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const initializationRef = useRef({ userRole: null, userPermissions: null });
  const isInitializedRef = useRef(false);

  // Initialize workspace on mount
  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        console.log('TabbedWorkspace: Starting initialization');
        setIsLoading(true);
        
        // Initialize RBAC and tab store only once
        if (!isInitializedRef.current) {
          console.log('TabbedWorkspace: Initializing store');
          await initialize();
          isInitializedRef.current = true;
          console.log('TabbedWorkspace: Store initialized');
        }
        
        // Initialize store with persistence settings
        console.log('TabbedWorkspace: Initializing store settings');
        initializeStore({
          maxTabs,
          enablePersistence: enableTabPersistence,
          enableTabGroups
        });
        console.log('TabbedWorkspace: Store settings initialized');

        // Register default workspace actions
        registerAction({
          id: 'workspace.refresh',
          label: 'Refresh Workspace',
          icon: RefreshCw,
          category: 'workspace',
          context: ['workspace'],
          permissions: ['workspace.refresh'],
          execute: async () => {
            window.location.reload();
          }
        });

        registerAction({
          id: 'workspace.settings',
          label: 'Workspace Settings',
          icon: Settings,
          category: 'workspace',
          context: ['workspace'],
          permissions: ['workspace.settings'],
          execute: async () => {
            onSettingsClick?.();
          }
        });

        console.log('TabbedWorkspace: Initialization completed successfully');
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize workspace';
        console.error('TabbedWorkspace: Initialization failed:', err);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        console.log('TabbedWorkspace: Setting loading to false');
        setIsLoading(false);
      }
    };

    initializeWorkspace();
  }, []);

  // Handle user role changes separately to prevent infinite loops
  useEffect(() => {
    if (userRole && initializationRef.current.userRole !== userRole) {
      setUserRole(userRole);
      initializationRef.current.userRole = userRole;
    }
  }, [userRole]);

  // Handle user permissions changes separately to prevent infinite loops
  useEffect(() => {
    if (userPermissions && userPermissions.length > 0 && 
        JSON.stringify(initializationRef.current.userPermissions) !== JSON.stringify(userPermissions)) {
      updateUserPermissions(userPermissions);
      initializationRef.current.userPermissions = userPermissions;
    }
  }, [userPermissions]);

  // Handle tab changes and update breadcrumbs
  useEffect(() => {
    if (activeTabId) {
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      if (activeTab) {
        onTabChange?.(activeTab);
        
        // Update breadcrumbs for hierarchical tabs
        if (enableHierarchicalMode && activeTab.path) {
          const pathSegments = activeTab.path.split('/').filter(Boolean);
          const newBreadcrumbs: BreadcrumbItem[] = pathSegments.map((segment, index) => ({
            id: `breadcrumb-${index}`,
            label: segment.charAt(0).toUpperCase() + segment.slice(1),
            path: '/' + pathSegments.slice(0, index + 1).join('/'),
            isActive: index === pathSegments.length - 1
          }));
          setBreadcrumbs(newBreadcrumbs);
        }
      }
    }
  }, [activeTabId, tabs, enableHierarchicalMode]); // Removed onTabChange from dependencies to prevent flickering

  // Handle drag and drop for tab reordering
  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex !== destinationIndex) {
      reorderTabs(sourceIndex, destinationIndex);
    }
  }, [reorderTabs]);

  // Handle tab creation
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

  // Handle tab closing
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

  // Handle breadcrumb clicks
  const handleBreadcrumbClick = useCallback((breadcrumb: BreadcrumbItem) => {
    onBreadcrumbClick?.(breadcrumb);
    // Optionally navigate to the breadcrumb path
    // This could involve creating a new tab or updating the current tab
  }, [onBreadcrumbClick]);

  // Handle sub-tab changes
  const handleSubTabChange = useCallback((tabId: string, subTabId: string) => {
    onSubTabChange?.(tabId, subTabId);
    // Update the tab's active sub-tab in the store if needed
  }, [onSubTabChange]);

  // Render tab content
  const renderTabContent = useCallback(() => {
    if (!activeTabId) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
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
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
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
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
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
    return (
      <div className="flex-1 px-2 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 overflow-auto bg-white">
        <div className="w-full">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">{activeTab.title}</h1>
          {activeTab.content.type === 'component' && activeTab.content.component && (
            <div className="w-full">
              <activeTab.content.component {...(activeTab.content.props || {})} />
            </div>
          )}
          {activeTab.content.type === 'url' && activeTab.content.url && (
            <iframe
              src={activeTab.content.url}
              className="w-full h-64 sm:h-80 md:h-96 border border-gray-300 rounded-lg"
              title={activeTab.title}
            />
          )}
          {activeTab.content.type === 'html' && activeTab.content.html && (
            <div className="w-full" dangerouslySetInnerHTML={{ __html: activeTab.content.html }} />
          )}
          {activeTab.content.type === 'text' && activeTab.content.text && (
            <div className="whitespace-pre-wrap text-gray-700 w-full text-sm sm:text-base">{activeTab.content.text}</div>
          )}
          {activeTab.content.type === 'empty' && (
            <div className="text-center text-gray-500 py-8 sm:py-12">
              <p className="text-sm sm:text-base">This tab is empty. Add some content to get started.</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [activeTabId, tabs, validateTabAccess, onTabContentRender]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
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

  console.log('🔥 TabbedWorkspace: About to render JSX with tabs:', tabs.length, 'activeTabId:', activeTabId);
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full bg-gray-50 w-full tabbed-workspace-mobile">
        {/* Breadcrumb Navigation */}
        {enableHierarchicalMode && showBreadcrumbs && breadcrumbs.length > 0 && (
          <BreadcrumbNavigation
            items={breadcrumbs}
            onItemClick={handleBreadcrumbClick}
            className="border-b border-gray-200 bg-white flex-shrink-0"
          />
        )}
        
        {/* Tab Bar */}
        <div className="flex-shrink-0">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={activateTab}
            onTabClose={handleTabClose}
            onTabReorder={reorderTabs}
            onTabPin={pinTab}
            onTabUnpin={unpinTab}
            onTabDuplicate={duplicateTab}
            onNewTab={handleTabCreate}
            maxTabs={maxTabs}
            enableTabGroups={enableTabGroups}
            theme={theme}
            userRole={userRole}
            userPermissions={userPermissions}
            enableHierarchicalMode={enableHierarchicalMode}
            tabStyle={tabStyle}
            showCloseButton={showCloseButton}
            onSubTabChange={handleSubTabChange}
          />
        </div>
        
        {/* Action Bar */}
        {showActionBar && (
          <div className="flex-shrink-0">
            <ActionBar
              moduleContext={moduleContext}
              userRole={userRole}
              userPermissions={userPermissions}
              onSettingsClick={showSettings ? onSettingsClick : undefined}
            />
          </div>
        )}
        
        {/* Tab Content - Responsive container */}
        <div className="flex-1 overflow-hidden w-full min-h-0">
          {renderTabContent()}
        </div>
      </div>
    </DragDropContext>
   );
};

export default TabbedWorkspace;