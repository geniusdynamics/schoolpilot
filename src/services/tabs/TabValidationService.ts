/**
 * TabValidationService - Centralized validation service for tab operations
 * Handles permissions, access control, state integrity, and data sanitization
 * Part of Phase 1.2 of the Tabbed Workspace improvement plan
 */

import { Tab, TabState } from '@/types/tabbedWorkspace';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Result object for validation operations
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Role-based access control configuration
 */
export interface RoleAccessConfig {
  role: string;
  allowedModules: string[];
  deniedModules?: string[];
  maxTabs?: number;
  canBypassPermissions?: boolean;
}

/**
 * Tab creation validation options
 */
export interface TabCreationOptions {
  allowDuplicates?: boolean;
  validatePermissions?: boolean;
  validateState?: boolean;
}

// Default role configurations - frozen to prevent external mutation
const ROLE_CONFIGS: Readonly<Record<string, RoleAccessConfig>> = Object.freeze({
  admin: {
    role: 'admin',
    allowedModules: ['*'],
    canBypassPermissions: true,
    maxTabs: 50,
  },
  teacher: {
    role: 'teacher',
    allowedModules: ['academics', 'students', 'attendance', 'assignments', 'grades'],
    maxTabs: 20,
  },
  finance: {
    role: 'finance',
    allowedModules: ['finance', 'fees', 'payments', 'accounts'],
    maxTabs: 20,
  },
  student: {
    role: 'student',
    allowedModules: ['academics', 'assignments', 'grades', 'attendance'],
    maxTabs: 10,
  },
  parent: {
    role: 'parent',
    allowedModules: ['students', 'academics', 'attendance', 'fees'],
    maxTabs: 10,
  },
});

// Mutable copy for runtime modifications
const mutableRoleConfigs: Record<string, RoleAccessConfig> = { ...ROLE_CONFIGS };

// ============================================================================
// Service Class
// ============================================================================

/**
 * TabValidationService - Singleton service for all tab validation operations
 * Provides centralized validation for permissions, access control, state integrity
 */
export class TabValidationService {
  private static instance: TabValidationService | null = null;

  // --------------------------------------------------------------------------
  // Singleton Pattern
  // --------------------------------------------------------------------------

  /**
   * Get the singleton instance of TabValidationService
   */
  public static getInstance(): TabValidationService {
    if (!TabValidationService.instance) {
      TabValidationService.instance = new TabValidationService();
    }
    return TabValidationService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    console.log('[TabValidation] Service initialized');
  }

  // --------------------------------------------------------------------------
  // Public API Methods
  // --------------------------------------------------------------------------

  /**
   * Validate if a user can access a specific tab
   * Checks role-based access and permissions
   * 
   * @param tab - The tab to validate access for
   * @param userRole - Current user's role
   * @param userPermissions - Array of user's permission strings
   * @returns boolean - true if user can access the tab
   */
  public validateTabAccess(tab: Partial<Tab>, userRole: string, userPermissions: string[]): boolean {
    if (!tab || !tab.id || typeof tab.id !== 'string') {
      console.warn('[TabValidation] Invalid tab provided:', tab);
      return false;
    }

    // Check for admin/bypass permissions
    if (userPermissions.includes('*') || userPermissions.includes('admin')) {
      return true;
    }

    // Get role configuration
    const roleConfig = mutableRoleConfigs[userRole];
    if (!roleConfig) {
      console.warn('[TabValidation] Unknown role:', userRole);
      return false;
    }

    // Check if role can bypass permission checks
    if (roleConfig.canBypassPermissions) {
      return true;
    }

    // Role has access to all modules
    if (roleConfig.allowedModules.includes('*')) {
      return true;
    }

    // Check module-level access if tab has module defined
    if (tab.module) {
      const hasModuleAccess = roleConfig.allowedModules.some((module) => 
        tab.module === module || module === '*'
      );
      
      if (!hasModuleAccess) {
        console.warn(`[TabValidation] User role '${userRole}' does not have access to module '${tab.module}'`);
        return false;
      }

      // Check specific permissions if required
      if (tab.permissions && tab.permissions.length > 0) {
        return this.validatePermissions(tab.permissions, userPermissions);
      }
    }

    return true;
  }

  /**
   * Validate tab creation request
   * Checks for limits, duplicates, and required fields
   * 
   * @param tabs - Current array of tabs
   * @param newTab - New tab to validate
   * @param maxTabs - Maximum allowed tabs
   * @returns ValidationResult - Validation result with errors/warnings
   */
  public validateTabCreation(tabs: Tab[], newTab: Partial<Tab>, maxTabs: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate max tabs limit
    if (tabs.length >= maxTabs) {
      errors.push(`Maximum tab limit (${maxTabs}) reached. Please close some tabs first.`);
    }

    // Validate required fields
    if (!newTab.title || typeof newTab.title !== 'string' || newTab.title.trim() === '') {
      errors.push('Tab title is required and cannot be empty.');
    }

    if (!newTab.path || typeof newTab.path !== 'string' || newTab.path.trim() === '') {
      errors.push('Tab path is required and cannot be empty.');
    }

    if (!newTab.module || typeof newTab.module !== 'string' || newTab.module.trim() === '') {
      errors.push('Tab module is required and cannot be empty.');
    }

    // Check for duplicate tabs (same path)
    const isDuplicate = tabs.some(
      (tab) => tab.path === newTab.path && !tab.isDirty
    );
    if (isDuplicate) {
      warnings.push('A tab with this path already exists and is not dirty.');
    }

    // Validate path format
    if (newTab.path && typeof newTab.path === 'string') {
      if (!newTab.path.startsWith('/')) {
        warnings.push('Tab path should start with a forward slash (/) for consistency.');
      }
    }

    // Validate metadata if provided
    if (newTab.metadata && typeof newTab.metadata !== 'object') {
      errors.push('Tab metadata must be a valid object.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate tab state integrity
   * Checks for valid state objects and required fields
   * 
   * @param tab - Tab to validate
   * @returns ValidationResult - Validation result with errors/warnings
   */
  public validateTabState(tab: Tab): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate tab ID
    if (!tab.id || typeof tab.id !== 'string') {
      errors.push('Tab must have a valid string ID.');
    }

    // Validate tab has required string fields
    if (!tab.title || typeof tab.title !== 'string') {
      errors.push('Tab must have a valid title string.');
    }

    if (!tab.path || typeof tab.path !== 'string') {
      errors.push('Tab must have a valid path string.');
    }

    if (!tab.module || typeof tab.module !== 'string') {
      errors.push('Tab must have a valid module string.');
    }

    // Validate boolean fields with defaults
    if (typeof tab.pinned !== 'boolean') {
      warnings.push('Tab pinned state should be explicitly set. Defaulting to false.');
    }

    if (typeof tab.isDirty !== 'boolean') {
      warnings.push('Tab dirty state should be explicitly set. Defaulting to false.');
    }

    if (typeof tab.canClose !== 'boolean') {
      warnings.push('Tab canClose should be explicitly set. Defaulting to true.');
    }

    // Validate lastAccessed timestamp
    if (typeof tab.lastAccessed !== 'number' || tab.lastAccessed <= 0) {
      errors.push('Tab must have a valid lastAccessed timestamp (positive number).');
    }

    // Validate metadata
    if (tab.metadata === undefined || tab.metadata === null) {
      warnings.push('Tab metadata should be defined. Defaulting to empty object.');
    } else if (typeof tab.metadata !== 'object') {
      errors.push('Tab metadata must be a valid object.');
    }

    // Validate state if present
    if (tab.state) {
      const stateValidation = this.validateTabStateData(tab.state);
      errors.push(...stateValidation.errors);
      warnings.push(...stateValidation.warnings);
    }

    // Validate permissions array if present
    if (tab.permissions !== undefined) {
      if (!Array.isArray(tab.permissions)) {
        errors.push('Tab permissions must be an array.');
      } else if (!tab.permissions.every((p) => typeof p === 'string')) {
        errors.push('All tab permissions must be strings.');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate permissions array against required permissions
   * 
   * @param requiredPermissions - Array of required permission strings
   * @param userPermissions - Array of user's permission strings
   * @returns boolean - true if user has all required permissions
   */
  public validatePermissions(requiredPermissions: string[], userPermissions: string[]): boolean {
    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // If user has wildcard permission, allow access
    if (userPermissions.includes('*') || userPermissions.includes('admin')) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every((required) => 
      userPermissions.includes(required)
    );
  }

  /**
   * Filter tabs based on user role and permissions
   * Returns only tabs the user can access
   * 
   * @param tabs - Array of tabs to filter
   * @param userRole - Current user's role
   * @param userPermissions - Array of user's permission strings
   * @returns Tab[] - Array of accessible tabs
   */
  public filterAccessibleTabs(
    tabs: Tab[], 
    userRole: string, 
    userPermissions: string[]
  ): Tab[] {
    // If no role provided, return empty
    if (!userRole) {
      console.warn('[TabValidation] No user role provided, returning empty array');
      return [];
    }

    // Get role configuration
    const roleConfig = mutableRoleConfigs[userRole];
    if (!roleConfig) {
      console.warn('[TabValidation] Unknown role:', userRole);
      return [];
    }

    // Admin or wildcard permission gets all tabs
    if (
      userPermissions.includes('*') || 
      userPermissions.includes('admin') ||
      roleConfig.canBypassPermissions ||
      roleConfig.allowedModules.includes('*')
    ) {
      return [...tabs];
    }

    // Filter by allowed modules and permissions
    return tabs.filter((tab) => {
      // Check module access
      const hasModuleAccess = roleConfig.allowedModules.some((module) => 
        tab.module === module || module === '*'
      );
      
      if (!hasModuleAccess) {
        return false;
      }

      // Check specific permissions if required
      if (tab.permissions && tab.permissions.length > 0) {
        return this.validatePermissions(tab.permissions, userPermissions);
      }

      return true;
    });
  }

  /**
   * Sanitize tab data before storage
   * Ensures all required fields have proper defaults and types
   * 
   * @param tab - Partial tab data to sanitize
   * @returns Tab - Sanitized complete tab object
   */
  public sanitizeTabData(tab: Partial<Tab>): Tab {
    // Generate ID if not provided
    const id = tab.id || this.generateTabId();

    // Ensure required string fields
    const title = typeof tab.title === 'string' ? tab.title.trim() : 'Untitled';
    const path = typeof tab.path === 'string' ? tab.path.trim() : `/untitled-${id}`;
    const module = typeof tab.module === 'string' ? tab.module.trim() : 'unknown';

    // Ensure boolean fields with defaults
    const pinned = typeof tab.pinned === 'boolean' ? tab.pinned : false;
    const isDirty = typeof tab.isDirty === 'boolean' ? tab.isDirty : false;
    const canClose = typeof tab.canClose === 'boolean' ? tab.canClose : true;

    // Ensure timestamp
    const lastAccessed = typeof tab.lastAccessed === 'number' && tab.lastAccessed > 0
      ? tab.lastAccessed
      : Date.now();

    // Ensure metadata object
    const metadata = typeof tab.metadata === 'object' && tab.metadata !== null
      ? { ...tab.metadata }
      : {};

    // Ensure permissions array
    const permissions = Array.isArray(tab.permissions)
      ? tab.permissions.filter((p) => typeof p === 'string')
      : [];

    // Ensure user role
    const userRole = typeof tab.userRole === 'string' ? tab.userRole : undefined;

    // Ensure content object if present
    const content = tab.content ? { ...tab.content } : undefined;

    return {
      id,
      title,
      path,
      module,
      icon: typeof tab.icon === 'string' ? tab.icon : undefined,
      badge: tab.badge,
      pinned,
      isDirty,
      canClose,
      lastAccessed,
      isLoading: typeof tab.isLoading === 'boolean' ? tab.isLoading : false,
      metadata,
      state: this.sanitizeTabState(tab.state),
      permissions,
      userRole,
      content,
    };
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Generate a unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Validate TabState data structure
   */
  private validateTabStateData(state: TabState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate scrollPosition
    if (typeof state.scrollPosition !== 'number' || state.scrollPosition < 0) {
      warnings.push('TabState scrollPosition should be a non-negative number.');
    }

    // Validate formData if present
    if (state.formData !== undefined && (typeof state.formData !== 'object' || state.formData === null)) {
      errors.push('TabState formData must be a valid object if provided.');
    }

    // Validate filters if present
    if (state.filters !== undefined && (typeof state.filters !== 'object' || state.filters === null)) {
      errors.push('TabState filters must be a valid object if provided.');
    }

    // Validate selectedItems if present
    if (state.selectedItems !== undefined && !Array.isArray(state.selectedItems)) {
      errors.push('TabState selectedItems must be an array if provided.');
    }

    // Validate viewMode if present
    const validViewModes = ['list', 'grid', 'kanban'];
    if (state.viewMode && !validViewModes.includes(state.viewMode)) {
      warnings.push(`TabState viewMode should be one of: ${validViewModes.join(', ')}.`);
    }

    // Validate sortOrder if present
    const validSortOrders = ['asc', 'desc'];
    if (state.sortOrder && !validSortOrders.includes(state.sortOrder)) {
      warnings.push(`TabState sortOrder should be one of: ${validSortOrders.join(', ')}.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize TabState data
   */
  private sanitizeTabState(state?: Partial<TabState>): TabState | undefined {
    if (!state) {
      return undefined;
    }

    return {
      scrollPosition: typeof state.scrollPosition === 'number' ? state.scrollPosition : 0,
      formData: typeof state.formData === 'object' && state.formData !== null ? state.formData : undefined,
      filters: typeof state.filters === 'object' && state.filters !== null ? state.filters : undefined,
      selectedItems: Array.isArray(state.selectedItems) ? state.selectedItems : undefined,
      viewMode: ['list', 'grid', 'kanban'].includes(state.viewMode || '') ? state.viewMode : undefined,
      searchQuery: typeof state.searchQuery === 'string' ? state.searchQuery : undefined,
      sortBy: typeof state.sortBy === 'string' ? state.sortBy : undefined,
      sortOrder: ['asc', 'desc'].includes(state.sortOrder || '') ? state.sortOrder : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // Configuration Methods
  // --------------------------------------------------------------------------

  /**
   * Add or update a role configuration
   * 
   * @param config - Role access configuration to add/update
   */
  public setRoleConfig(config: RoleAccessConfig): void {
    mutableRoleConfigs[config.role] = config;
    console.log(`[TabValidation] Updated role config for: ${config.role}`);
  }

  /**
   * Get current role configuration
   * 
   * @param role - Role to get configuration for
   * @returns RoleAccessConfig | undefined
   */
  public getRoleConfig(role: string): RoleAccessConfig | undefined {
    return mutableRoleConfigs[role];
  }

  /**
   * Get all role configurations
   * 
   * @returns Record<string, RoleAccessConfig>
   */
  public getAllRoleConfigs(): Record<string, RoleAccessConfig> {
    return { ...mutableRoleConfigs };
  }
}

// ============================================================================
// Export
// ============================================================================

/**
 * Singleton instance of TabValidationService
 */
export const tabValidationService = TabValidationService.getInstance();

// ============================================================================
// Default Export (for DI patterns)
// ============================================================================

export default TabValidationService;