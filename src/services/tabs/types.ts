/**
 * Tab System Types - URL-Driven Architecture
 * 
 * Core type definitions for the new tab system where URL is the single source of truth.
 */

export interface Tab {
  /** Unique identifier - derived from URL pattern */
  id: string;
  
  /** Full URL including query parameters */
  url: string;
  
  /** Display title for the tab */
  title: string;
  
  /** Optional subtitle (e.g., entity name) */
  subtitle?: string;
  
  /** Module context (academics, finance, etc.) */
  module: string;
  
  /** Entity type (students, attendance, etc.) */
  entity?: string;
  
  /** Specific entity ID if viewing a record */
  entityId?: string;
  
  /** View mode (list, detail, edit, etc.) */
  view?: string;
  
  /** Whether tab has unsaved changes */
  isDirty: boolean;
  
  /** Whether tab is pinned (cannot close) */
  pinned: boolean;
  
  /** Icon identifier */
  icon?: string;
  
  /** Additional metadata */
  metadata?: TabMetadata;
}

export interface TabMetadata {
  /** When tab was created */
  createdAt: number;
  
  /** Last access timestamp */
  lastAccessed: number;
  
  /** IDs of related tabs (for workflow grouping) */
  relatedTabs?: string[];
  
  /** Workflow group ID */
  workflow?: string;
  
  /** User who created the tab */
  createdBy?: string;
  
  /** Custom data stored by applications */
  [key: string]: any;
}

export interface ParsedTabState {
  /** Array of open tabs */
  tabs: Tab[];
  
  /** ID of currently active tab */
  activeTabId: string;
}

export interface TabOptions {
  /** Custom title (auto-generated if not provided) */
  title?: string;
  
  /** Whether tab can be closed */
  closable?: boolean;
  
  /** Whether tab is pinned */
  pinned?: boolean;
  
  /** Custom icon */
  icon?: string;
  
  /** Additional metadata */
  metadata?: Partial<TabMetadata>;
}

export interface Workflow {
  /** Unique workflow identifier */
  id: string;
  
  /** Workflow name */
  name: string;
  
  /** Optional description */
  description?: string;
  
  /** Ordered tab IDs in this workflow */
  tabs: string[];
  
  /** Primary/main tab */
  primaryTab: string;
  
  /** When workflow was created */
  createdAt: number;
  
  /** Current status */
  status: 'active' | 'completed' | 'suspended';
}

export interface URLParseResult {
  /** URL pathname */
  pathname: string;
  
  /** Module identifier */
  module: string;
  
  /** Entity type */
  entity?: string;
  
  /** Entity ID */
  entityId?: string;
  
  /** View mode */
  view?: string;
  
  /** Query parameters */
  params: URLSearchParams;
}

export type TabNavigationMethod = 'replace' | 'push' | 'new-tab';

export interface NavigationOptions {
  /** How to navigate */
  method?: TabNavigationMethod;
  
  /** Whether to activate immediately */
  activate?: boolean;
  
  /** Custom tab options */
  tabOptions?: TabOptions;
}

export interface TabStateSnapshot {
  /** Timestamp of snapshot */
  timestamp: number;
  
  /** Tab state */
  state: ParsedTabState;
  
  /** URL at time of snapshot */
  url: string;
}
