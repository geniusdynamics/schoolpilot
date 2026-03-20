/**
 * Enhanced type definitions for hierarchical tab and breadcrumb navigation system
 * Extends existing tab types with hierarchical support, sub-tabs, and breadcrumb navigation
 */

import { Tab } from './tabbedWorkspace';

// Enhanced breadcrumb item interface
export interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  icon?: string;
  permissions?: string[];
}

// Breadcrumb navigation props
export interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
  maxItems?: number;
  showHome?: boolean;
  className?: string;
  separator?: React.ReactNode;
}

// Sub-tab interface for secondary navigation
export interface SubTab {
  id: string;
  label: string;
  isActive: boolean;
  canAdd: boolean;
  icon?: string;
  badge?: string | number;
  contentConfig: {
    type: 'table' | 'kanban' | 'list' | 'form' | 'dashboard';
    dataSource: string;
    filters?: Record<string, any>;
    columns?: TableColumn[];
    permissions?: string[];
  };
  metadata?: Record<string, any>;
}

// Enhanced hierarchical tab interface extending base Tab
export interface HierarchicalTab extends Tab {
  parentId?: string;
  subTabs?: SubTab[];
  activeSubTabId?: string;
  contentType: 'table' | 'form' | 'dashboard' | 'custom' | 'kanban';
  breadcrumbContext: string[];
  dataSource?: string;
  hasSubNavigation: boolean;
}

// Sub-tab navigation component props
export interface SubTabNavigationProps {
  subTabs: SubTab[];
  activeSubTabId: string;
  onSubTabClick: (subTabId: string) => void;
  onAddSubTab?: () => void;
  canAddSubTab?: boolean;
  className?: string;
}

// Enhanced tab bar props with hierarchical support
export interface HierarchicalTabBarProps {
  tabs: HierarchicalTab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
  onTabCreate: (config: Partial<HierarchicalTab>) => void;
  maxTabs?: number;
  className?: string;
}

// Navigation context interface
export interface NavigationContextType {
  currentPath: string[];
  breadcrumbItems: BreadcrumbItem[];
  navigateTo: (path: string) => void;
  goBack: () => void;
  updateContext: (context: string[]) => void;
  updateBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

// Enhanced tab store with hierarchical support
export interface HierarchicalTabStore {
  // Existing tab store properties
  tabs: HierarchicalTab[];
  activeTabId: string;
  breadcrumbContext: string[];
  navigationHistory: string[];
  
  // Core tab actions
  addTab: (tab: Partial<HierarchicalTab>) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<HierarchicalTab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  
  // Breadcrumb actions
  updateBreadcrumb: (context: string[]) => void;
  navigateToPath: (path: string) => void;
  
  // Sub-tab actions
  addSubTab: (parentTabId: string, subTab: Omit<SubTab, 'id'>) => void;
  removeSubTab: (parentTabId: string, subTabId: string) => void;
  setActiveSubTab: (parentTabId: string, subTabId: string) => void;
  updateSubTab: (parentTabId: string, subTabId: string, updates: Partial<SubTab>) => void;
  
  // Hierarchical operations
  getTabHierarchy: (tabId: string) => HierarchicalTab[];
  getChildTabs: (parentId: string) => HierarchicalTab[];
  getTabPath: (tabId: string) => string[];
}

// Table column definition for data tables
export interface TableColumn {
  id: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
  type?: 'text' | 'number' | 'date' | 'status' | 'user' | 'priority';
}

// Data table props
export interface DataTableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  onRowSelect?: (selectedRows: any[]) => void;
  selectable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  filters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  className?: string;
}

// Content renderer props for dynamic content display
export interface ContentRendererProps {
  tab: HierarchicalTab;
  subTab?: SubTab;
  className?: string;
}

// Task data interface for the Tasks table
export interface TaskData {
  id: string;
  name: string;
  status: 'active' | 'to_test' | 'new' | 'closed';
  teams: string[];
  assigned: {
    id: string;
    name: string;
    avatar?: string;
  };
  priority: number;
  approved: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Status badge props
export interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

// User avatar props
export interface UserAvatarProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Action button props
export interface ActionButtonProps {
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// Local storage schema for tab workspace
export interface TabWorkspaceStorage {
  version: string;
  tabs: {
    [tabId: string]: {
      state: HierarchicalTab;
      lastAccessed: number;
      scrollPosition?: number;
      formData?: Record<string, any>;
    };
  };
  activeTabId: string;
  tabOrder: string[];
  breadcrumbHistory: string[][];
  userPreferences: {
    maxTabs: number;
    autoSave: boolean;
    defaultView: string;
    showBreadcrumbs: boolean;
  };
}

// Enhanced tabbed workspace props
export interface HierarchicalTabbedWorkspaceProps {
  children?: React.ReactNode;
  defaultTab?: Partial<HierarchicalTab>;
  maxTabs?: number;
  enableBreadcrumbs?: boolean;
  enableSubTabs?: boolean;
  className?: string;
  onTabChange?: (tabId: string) => void;
  onBreadcrumbNavigate?: (path: string) => void;
}