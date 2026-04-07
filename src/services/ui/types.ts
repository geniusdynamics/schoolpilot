/**
 * UI Service Types
 *
 * Type definitions and interfaces for UI-related services.
 * Enables dependency injection and testability.
 */

import type React from 'react';

// ============================================================================
// Tab State Manager Types
// ============================================================================

export interface TabStateConfig {
  maxTabs: number;
  enablePersistence: boolean;
  enableTabGroups: boolean;
  defaultTabBehavior: 'tab' | 'navigate' | 'modal';
  platformAdaptation: boolean;
  moduleDefaults: {
    dashboardCanClose: boolean;
    dashboardPinned: boolean;
    pageCanClose: boolean;
    pagePinned: boolean;
  };
}

export interface NavigationItem {
  module: any;
  child?: any;
}

export interface TabCreationResult {
  tabId: string | null;
  action: 'created' | 'activated' | 'error';
  message?: string;
}

export interface TabStatistics {
  totalTabs: number;
  pinnedTabs: number;
  moduleDashboards: number;
  pages: number;
  closeableTabs: number;
}

export interface TabValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PlatformInfo {
  platform: 'web' | 'desktop' | 'mobile';
  touchDevice: boolean;
}

// ============================================================================
// Action Registry Types
// ============================================================================

export interface ActionDefinition {
  id: string;
  label: string;
  icon: string | React.ComponentType<any>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick?: (context?: ActionContext) => void | Promise<void>;
  execute?: (context?: ActionContext) => void | Promise<void>;
  disabled?: boolean;
  visible?: boolean;
  tooltip?: string;
  shortcut?: string;
  badge?: string | number;
  loading?: boolean;
  group?: string;
  priority?: number;
  module?: string;
  submodule?: string;
  feature?: string;
  category?: string;
  context?: string[];
  permissions?: string[];
  requiredPermissions?: string[];
  requiredRoles?: string[];
  condition?: (context: ActionContext) => boolean;
}

export interface ActionGroup {
  id: string;
  label: string;
  actions: ActionDefinition[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  module: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  priority?: number;
}

export interface ActionContext {
  activeTab?: {
    id: string;
    title: string;
    path: string;
    module: string;
    submodule?: string;
    feature?: string;
    metadata?: Record<string, any>;
  };
  selectedTabs?: string[];
  module: string;
  submodule?: string;
  feature?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    moduleAccess: Record<string, string[]>;
    departmentId?: string;
    classIds?: string[];
  };
  data?: Record<string, any>;
  moduleData?: Record<string, any>;
}

export interface ActionExecutionResult {
  success: boolean;
  actionId: string;
  error?: Error;
  result?: any;
}

// ============================================================================
// Tab Accessibility Types
// ============================================================================

export interface TabAccessibilityConfig {
  tabNavigation: {
    arrowKeyNavigation: boolean;
    homeEndKeys: boolean;
    enterSpaceActivation: boolean;
    deleteKeyClose: boolean;
    escapeKeyExit: boolean;
  };
  tabVisuals: {
    minimumTouchTarget: number;
    focusIndicatorWidth: number;
    colorContrastRatio: number;
    activeTabIndicator: boolean;
    highContrastMode: boolean;
  };
  tabAnnouncements: {
    tabActivation: string;
    tabClosure: string;
    tabAddition: string;
    tabCount: string;
    navigationInstruction: string;
  };
  tabPanelAssociation: {
    useAriaControls: boolean;
    useAriaLabelledBy: boolean;
    hideInactivePanels: boolean;
    announceContentChanges: boolean;
  };
  reducedMotion: {
    respectReducedMotion: boolean;
    disableAnimations: boolean;
    reducedAnimationDuration: number;
  };
}

export interface TabAccessibilityCallbacks {
  selectPreviousTab: () => void;
  selectNextTab: () => void;
  selectFirstTab: () => void;
  selectLastTab: () => void;
  activateTab: () => void;
  closeTab?: () => void;
  focusTabContent: () => void;
}

export interface TabAccessibilityState {
  currentTabIndex: number;
  totalTabs: number;
  tabId: string;
  tabTitle: string;
  canClose: boolean;
  isActive: boolean;
}

export interface AriaAttributes {
  role: string;
  'aria-selected': boolean;
  'aria-controls'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-disabled'?: boolean;
  tabIndex: number;
  id: string;
}

// ============================================================================
// Tab Performance Types
// ============================================================================

export interface TabPerformanceConfig {
  tabMemory: {
    maxActiveTabs: number;
    inactiveTabTimeout: number;
    memoryThreshold: number;
    virtualizeContent: boolean;
    enableGarbageCollection: boolean;
  };
  rendering: {
    lazyLoadTabs: boolean;
    preloadAdjacent: boolean;
    memoizeTabContent: boolean;
    debounceTabSwitch: number;
    enableVirtualization: boolean;
  };
  animations: {
    respectReducedMotion: boolean;
    tabSwitchDuration: number;
    useGPUAcceleration: boolean;
    animationFrameOptimization: boolean;
  };
  monitoring: {
    enablePerformanceLogging: boolean;
    trackMemoryUsage: boolean;
    measureTabSwitchTime: boolean;
    alertSlowOperations: boolean;
    slowOperationThreshold: number;
  };
}

export interface TabContentCache {
  content: React.ReactNode;
  timestamp: number;
  lastAccessed: number;
  memorySize: number;
  isActive: boolean;
}

export interface TabPerformanceMetrics {
  tabSwitchTimes: Map<string, number>;
  memoryUsage: Map<string, number>;
  contentLoadTimes: Map<string, number>;
  totalTabs: number;
  activeTabs: number;
  cachedTabs: number;
  averageSwitchTime: number;
  peakMemoryUsage: number;
}

export interface TabContentInfo {
  id: string;
  title: string;
  module: string;
  path: string;
  isActive: boolean;
  canClose: boolean;
  lastAccessed?: number;
  metadata?: any;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Tab State Manager Interface
 *
 * Manages tab creation, navigation, and lifecycle.
 */
export interface ITabStateManager {
  /**
   * Create a new module tab
   */
  createModuleTab(navigationItem: NavigationItem, location: Location): Promise<TabCreationResult>;

  /**
   * Generate a tab title from module and child info
   */
  generateTabTitle(module: any, child: any, isModuleDashboard: boolean): string;

  /**
   * Perform cleanup of inactive tabs
   */
  performTabCleanup(): Promise<void>;

  /**
   * Get current configuration
   */
  getConfig(): TabStateConfig;

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TabStateConfig>): void;

  /**
   * Get tab statistics
   */
  getTabStatistics(): TabStatistics;

  /**
   * Validate tab configuration
   */
  validateTabConfig(tabConfig: any): TabValidationResult;

  /**
   * Set platform information for adaptive behavior
   */
  setPlatformInfo(platformInfo: PlatformInfo): void;

  /**
   * Adapt configuration for platform
   */
  adaptConfigForPlatform(platform: 'web' | 'desktop' | 'mobile'): void;

  /**
   * Set reference to the tab store
   */
  setStore(store: any): void;
}

/**
 * Action Registry Interface
 *
 * Manages action registration, retrieval, and execution.
 */
export interface IActionRegistry {
  /**
   * Register a single action
   */
  registerAction(action: ActionDefinition): void;

  /**
   * Register multiple actions for a module/page
   */
  registerActions(module: string, page: string, actions: ActionDefinition[]): void;

  /**
   * Register an action group
   */
  registerActionGroup(module: string, page: string, group: ActionGroup): void;

  /**
   * Get actions for a specific context
   */
  getActionsForContext(context: ActionContext): ActionDefinition[];

  /**
   * Get action groups for a context
   */
  getActionGroupsForContext(context: ActionContext): ActionGroup[];

  /**
   * Get actions for a module
   */
  getActionsForModule(module: string, userPermissions: string[], userRole: string): ActionGroup[];

  /**
   * Get action by ID
   */
  getActionById(actionId: string): ActionDefinition | null;

  /**
   * Execute an action by ID
   */
  executeAction(actionId: string, context?: ActionContext): Promise<ActionExecutionResult>;

  /**
   * Check if user has permission for an action
   */
  hasPermission(action: ActionDefinition, userPermissions: string[], userRole: string): boolean;

  /**
   * Filter actions by role and permissions
   */
  filterActionsByRole(actions: ActionDefinition[], userRole: string, userPermissions: string[]): ActionDefinition[];

  /**
   * Unregister an action
   */
  unregisterAction(actionId: string): void;

  /**
   * Clear all registered actions
   */
  clearActions(): void;
}

/**
 * Tab Accessibility Manager Interface
 *
 * Manages accessibility features for tabs.
 */
export interface ITabAccessibilityManager {
  /**
   * Get ARIA attributes for a tab
   */
  getTabAriaAttributes(tabId: string, state: TabAccessibilityState): AriaAttributes;

  /**
   * Get ARIA attributes for tab panel
   */
  getPanelAriaAttributes(tabId: string): Record<string, string>;

  /**
   * Handle keyboard navigation
   */
  handleKeyNavigation(event: React.KeyboardEvent, callbacks: TabAccessibilityCallbacks): void;

  /**
   * Announce a change to screen readers
   */
  announce(message: string, priority?: 'polite' | 'assertive'): void;

  /**
   * Announce tab activation
   */
  announceTabActivation(tabTitle: string, index: number, total: number): void;

  /**
   * Announce tab closure
   */
  announceTabClosure(tabTitle: string): void;

  /**
   * Get navigation instructions
   */
  getNavigationInstructions(): string;

  /**
   * Check if reduced motion is preferred
   */
  shouldReduceMotion(): boolean;

  /**
   * Get effective animation duration
   */
  getAnimationDuration(defaultDuration: number): number;
}

/**
 * Tab Performance Manager Interface
 *
 * Manages performance optimization for tabs.
 */
export interface ITabPerformanceManager {
  /**
   * Cache tab content
   */
  cacheTabContent(tabId: string, content: React.ReactNode): void;

  /**
   * Get cached tab content
   */
  getCachedContent(tabId: string): React.ReactNode | null;

  /**
   * Clear cache for a tab
   */
  clearTabCache(tabId: string): void;

  /**
   * Start tracking tab switch time
   */
  startTabSwitch(tabId: string): void;

  /**
   * End tracking tab switch time
   */
  endTabSwitch(tabId: string): number;

  /**
   * Get performance metrics
   */
  getMetrics(): TabPerformanceMetrics;

  /**
   * Reset performance metrics
   */
  resetMetrics(): void;

  /**
   * Check if memory threshold is exceeded
   */
  isMemoryThresholdExceeded(): boolean;

  /**
   * Trigger garbage collection for inactive tabs
   */
  cleanupInactiveTabs(activeTabIds: string[]): void;

  /**
   * Preload adjacent tabs
   */
  preloadAdjacentTabs(currentTabId: string, allTabIds: string[]): void;

  /**
   * Optimize rendering for tab switch
   */
  optimizeTabSwitch(fromTabId: string, toTabId: string): Promise<void>;
}

// ============================================================================
// Page Component Resolver Types
// ============================================================================

export interface PageComponentMapping {
  module: string;
  page: string;
  component: React.ComponentType<any>;
  lazy?: boolean;
  preload?: boolean;
}

export interface PageResolutionResult {
  component: React.ComponentType<any> | null;
  loading: boolean;
  error: Error | null;
}

// ============================================================================
// Route Preloader Types
// ============================================================================

export interface PreloadConfig {
  routes: string[];
  priority: 'high' | 'normal' | 'low';
  delay?: number;
  condition?: () => boolean;
}

export interface PreloadResult {
  route: string;
  success: boolean;
  loadTime: number;
  error?: Error;
}
