/**
 * Comprehensive Tab and TabState interfaces with RBAC support
 * Based on the Comprehensive Tabbed Workspace System documentation
 */

// Tab content types for different rendering strategies
export type TabContentType = 'component' | 'url' | 'html' | 'text' | 'empty';

// Tab content interface for storing content configuration
export interface TabContent {
  type: TabContentType;
  component?: React.ComponentType<any> | string;
  props?: Record<string, any>;
  url?: string;
  html?: string;
  text?: string;
}

// Core tab interface with comprehensive metadata and RBAC support
export interface Tab {
  id: string;
  title: string;
  path: string;
  module: string;
  icon?: string;
  badge?: string | number;
  pinned: boolean;
  isDirty: boolean;
  canClose: boolean;
  lastAccessed: number;
  isLoading?: boolean;
  metadata: Record<string, any>;
  state?: TabState;
  permissions?: string[]; // Required permissions for this tab
  userRole?: string; // User role when tab was created
  content?: TabContent; // Content configuration for the tab
}

// Comprehensive tab state preservation
export interface TabState {
  scrollPosition: number;
  formData?: Record<string, any>;
  filters?: Record<string, any>;
  selectedItems?: string[];
  viewMode?: 'list' | 'grid' | 'kanban';
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Tab group interface for organizing tabs
export interface TabGroup {
  id: string;
  name: string;
  color?: string;
  tabIds: string[];
  collapsed?: boolean;
}

// Complete tab store interface with RBAC integration
export interface TabStore {
  // Core state
  tabs: Tab[];
  activeTabId: string | null;
  pinnedTabs: string[];
  recentlyClosedTabs: Tab[];
  maxTabs: number;
  tabGroups: Record<string, string[]>;
  currentUserRole: string;
  userPermissions: string[];
  
  // Core operations with RBAC validation
  createTab: (tab: Omit<Tab, 'id' | 'lastAccessed'>) => Promise<string>;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => Promise<void>;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  
  // Advanced operations
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  duplicateTab: (tabId: string) => Promise<string>;
  restoreClosedTab: () => Tab | null;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  
  // Bulk operations
  closeAllTabs: () => void;
  closeAllExceptPinned: () => void;
  closeTabsToRight: (tabId: string) => void;
  closeTabsToLeft: (tabId: string) => void;
  
  // Search and organization
  searchTabs: (query: string) => Tab[];
  getTabsByModule: (module: string) => Tab[];
  getRecentTabs: (limit?: number) => Tab[];
  getAccessibleTabs: () => Tab[]; // Filter by user permissions
  
  // RBAC operations
  validateTabAccess: (tabId: string) => boolean;
  updateUserPermissions: (permissions: string[]) => void;
  setUserRole: (role: string) => void;
  
  // State management
  saveTabState: (tabId: string, state: Partial<TabState>) => void;
  getTabState: (tabId: string) => TabState | null;
  clearTabState: (tabId: string) => void;
}

// Comprehensive action definition with RBAC support
export interface ActionDefinition {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  visible?: boolean;
  tooltip?: string;
  shortcut?: string;
  badge?: string | number;
  loading?: boolean;
  group?: string;
  priority?: number;
  requiredPermissions?: string[]; // Required permissions to see/use this action
  requiredRoles?: string[]; // Required roles to access this action
  module?: string; // Module this action belongs to
}

// Action grouping for organization with RBAC
export interface ActionGroup {
  id: string;
  label: string;
  actions: ActionDefinition[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  requiredPermissions?: string[]; // Required permissions to see this group
  requiredRoles?: string[]; // Required roles to access this group
}

// Complete action registry interface with RBAC integration
export interface ActionRegistry {
  registerActions: (module: string, page: string, actions: ActionDefinition[]) => void;
  registerActionGroup: (module: string, page: string, group: ActionGroup) => void;
  getActionsForContext: (module: string, page: string, userRole: string, userPermissions: string[]) => ActionDefinition[];
  getActionGroupsForContext: (module: string, page: string, userRole: string, userPermissions: string[]) => ActionGroup[];
  updateAction: (actionId: string, updates: Partial<ActionDefinition>) => void;
  executeAction: (actionId: string, userRole: string, userPermissions: string[]) => Promise<void>;
  validateActionAccess: (actionId: string, userRole: string, userPermissions: string[]) => boolean;
  filterActionsByPermissions: (actions: ActionDefinition[], userRole: string, userPermissions: string[]) => ActionDefinition[];
}

// Tab component props
export interface TabComponentProps {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onPin: () => void;
  onDuplicate: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  draggable?: boolean;
}

// Tab bar component props
export interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
  onTabPin: (tabId: string) => void;
  onTabUnpin: (tabId: string) => void;
  onTabDuplicate: (tabId: string) => void;
  onNewTab: (tabData?: any) => void;
  maxTabs?: number;
  enableTabGroups?: boolean;
  theme?: string;
  userRole?: string;
  userPermissions?: string[];
  // Hierarchical features
  enableHierarchicalMode?: boolean;
  tabStyle?: 'legacy' | 'modern';
  showCloseButton?: boolean;
  onSubTabChange?: (tabId: string, subTabId: string) => void;
}

// Action bar component props
export interface ActionBarProps {
  module: string;
  page: string;
  userRole: string;
  userPermissions: string[];
  className?: string;
}

// Tabbed workspace component props
export interface TabbedWorkspaceProps {
  className?: string;
  showActionBar?: boolean;
  showSettings?: boolean;
  onTabContentRender?: (tab: Tab) => React.ReactNode;
  onSettingsClick?: () => void;
  maxTabs?: number;
  enableTabGroups?: boolean;
  enableTabPersistence?: boolean;
  theme?: string;
  userRole?: string;
  userPermissions?: string[];
  moduleContext?: string;
  onTabChange?: (tab: Tab) => void;
  onTabClose?: (tab: Tab) => void;
  onTabCreate?: (tab: Tab) => void;
  onError?: (error: string) => void;
  // Hierarchical features
  enableHierarchicalMode?: boolean;
  showBreadcrumbs?: boolean;
  tabStyle?: 'legacy' | 'modern';
  showCloseButton?: boolean;
  onBreadcrumbClick?: (breadcrumb: any) => void;
  onSubTabChange?: (tabId: string, subTabId: string) => void;
}