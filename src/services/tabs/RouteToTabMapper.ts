/**
 * RouteToTabMapper Service
 * 
 * Dedicated service for handling all route-to-tab mapping operations.
 * Extracts route handling logic from TabStateManager and TabbedWorkspaceManager.
 * 
 * @module services/tabs/RouteToTabMapper
 */

import { Tab } from '../../types/tabbedWorkspace';
import { NavItem } from '../../core/types';

/**
 * NavigationItem interface for tab navigation
 * Extended from NavItem with additional properties for tab-specific functionality
 */
export interface NavigationItem {
  id?: string;
  name: string;
  path: string;
  module?: string;
  icon?: string;
  page?: string;
  children?: NavigationItem[];
  permissions?: string[];
  isGroup?: boolean;
  modulePath?: string;
  isActive?: boolean;
  deprecated?: boolean;
}

/**
 * Result of route matching operation
 */
export interface RouteMatchResult {
  pattern: string;
  params: Record<string, string>;
}

/**
 * Options for building tabs from routes
 */
export interface BuildTabOptions {
  /** Custom title override */
  title?: string;
  /** Whether the tab should be pinned */
  pinned?: boolean;
  /** Whether the tab can be closed */
  canClose?: boolean;
  /** Additional metadata to include */
  metadata?: Record<string, any>;
}

/**
 * RouteToTabMapper - Service for mapping routes to tab representations
 * 
 * Handles route parsing, parameter extraction, navigation item resolution,
 * and tab creation from route information.
 */
export class RouteToTabMapper {
  
  /**
   * Resolve a navigation item for a given path from navigation configuration
   * 
   * Searches through the navigation config (including nested children) to find
   * a matching navigation item for the given path. Supports both exact matches
   * and parameterized routes.
   * 
   * @param path - The path to resolve
   * @param navigationConfig - Array of navigation items to search
   * @returns The matching NavigationItem or null if not found
   * 
   * @example
   * ```typescript
   * const navItems = [
   *   { name: 'Dashboard', path: '/dashboard', children: [...] },
   *   { name: 'Students', path: '/students' }
   * ];
   * const item = mapper.resolveNavigationItem('/students', navItems);
   * ```
   */
  resolveNavigationItem(path: string, navigationConfig: NavigationItem[]): NavigationItem | null {
    if (!path || !navigationConfig || !Array.isArray(navigationConfig)) {
      console.warn('[RouteToTabMapper] Invalid path or navigationConfig provided');
      return null;
    }

    const normalizedPath = this.normalizePath(path);

    // First, try exact match
    const exactMatch = this.findExactMatch(normalizedPath, navigationConfig);
    if (exactMatch) {
      return exactMatch;
    }

    // Try parameterized route matching
    const parameterizedMatch = this.findParameterizedMatch(normalizedPath, navigationConfig);
    if (parameterizedMatch) {
      return parameterizedMatch;
    }

    // Try prefix matching for parent routes (e.g., /students matches /students/list)
    const prefixMatch = this.findPrefixMatch(normalizedPath, navigationConfig);
    if (prefixMatch) {
      return prefixMatch;
    }

    return null;
  }

  /**
   * Parse route parameters from a path based on a pattern
   * 
   * Extracts dynamic parameters from a path using the pattern syntax.
   * Supports patterns like `/students/:id` or `/students/:id/edit/:tab?`
   * 
   * @param path - The actual path (e.g., '/students/123')
   * @param pattern - The route pattern with params (e.g., '/students/:id')
   * @returns Record of extracted parameter names to values
   * 
   * @example
   * ```typescript
   * const params = mapper.parseRouteParams('/students/123/edit/details', '/students/:id/edit/:tab');
   * // Returns: { id: '123', tab: 'details' }
   * ```
   */
  parseRouteParams(path: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};

    if (!path || !pattern) {
      return params;
    }

    const normalizedPath = this.normalizePath(path);
    const normalizedPattern = this.normalizePath(pattern);

    // Split both path and pattern into segments
    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const patternSegments = normalizedPattern.split('/').filter(Boolean);

    // If segment counts don't match, try wildcard matching
    if (pathSegments.length !== patternSegments.length) {
      // Try to match with wildcard
      return this.parseRouteParamsWithWildcard(pathSegments, patternSegments);
    }

    // Match each segment
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];
      const pathSegment = pathSegments[i];

      // Check if this is a parameter segment (starts with :)
      if (patternSegment.startsWith(':')) {
        const paramName = patternSegment.substring(1);
        params[paramName] = pathSegment;
      } else if (patternSegment !== pathSegment) {
        // Non-matching static segment - return empty params
        return {};
      }
    }

    return params;
  }

  /**
   * Build a partial Tab object from a route and navigation item
   * 
   * Creates a tab configuration object based on the route path and
   * corresponding navigation item. Extracts module, generates title,
   * and sets default properties.
   * 
   * @param path - The route path
   * @param navigationItem - The resolved navigation item
   * @param options - Optional configuration for tab building
   * @returns Partial Tab object ready for creation
   * 
   * @example
   * ```typescript
   * const navItem = { name: 'Students', path: '/students', module: 'academics' };
   * const tab = mapper.buildTabFromRoute('/students', navItem, { pinned: true });
   * ```
   */
  buildTabFromRoute(path: string, navigationItem: NavigationItem, options?: BuildTabOptions): Partial<Tab> {
    if (!path) {
      console.warn('[RouteToTabMapper] Cannot build tab from empty path');
      return {};
    }

    const normalizedPath = this.normalizePath(path);
    const module = this.extractModuleFromPath(normalizedPath);
    const title = this.generateTabTitle(navigationItem, options?.title);

    const tab: Partial<Tab> = {
      id: this.generateTabId(normalizedPath),
      title,
      path: normalizedPath,
      module,
      pinned: options?.pinned ?? false,
      isDirty: false,
      canClose: options?.canClose ?? true,
      lastAccessed: Date.now(),
      metadata: {
        ...options?.metadata,
        createdFrom: 'route',
        navigationItem: {
          name: navigationItem.name,
          path: navigationItem.path,
          module: navigationItem.module,
          page: navigationItem.page
        }
      }
    };

    // Add icon if present
    if (navigationItem.icon) {
      tab.icon = navigationItem.icon;
    }

    // Add permissions if present
    if (navigationItem.permissions && navigationItem.permissions.length > 0) {
      tab.permissions = navigationItem.permissions;
    }

    return tab;
  }

  /**
   * Match a path against a list of route patterns
   * 
   * Tests the path against multiple patterns and returns the first matching pattern.
   * Supports both exact matches and parameterized patterns.
   * 
   * @param path - The path to match
   * @param patterns - Array of route patterns to match against
   * @returns The matched pattern string or null if no match
   * 
   * @example
   * ```typescript
   * const patterns = ['/dashboard', '/students', '/students/:id', '/settings'];
   * const matched = mapper.matchRoute('/students/123', patterns);
   * // Returns: '/students/:id'
   * ```
   */
  matchRoute(path: string, patterns: string[]): string | null {
    if (!path || !patterns || !Array.isArray(patterns)) {
      return null;
    }

    const normalizedPath = this.normalizePath(path);

    // Try exact match first
    if (patterns.includes(normalizedPath)) {
      return normalizedPath;
    }

    // Try parameterized matching
    for (const pattern of patterns) {
      if (this.doesPathMatchPattern(normalizedPath, pattern)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Extract module name from a path
   * 
   * Analyzes the path to determine which module it belongs to based on
   * the first segment of the path.
   * 
   * @param path - The path to analyze
   * @returns The module identifier extracted from the path
   * 
   * @example
   * ```typescript
   * const module = mapper.extractModuleFromPath('/academics/students');
   * // Returns: 'academics'
   * 
   * const module2 = mapper.extractModuleFromPath('/finance/invoices/123');
   * // Returns: 'finance'
   * ```
   */
  extractModuleFromPath(path: string): string {
    if (!path) {
      return 'unknown';
    }

    const normalizedPath = this.normalizePath(path);
    const segments = normalizedPath.split('/').filter(Boolean);

    if (segments.length === 0) {
      return 'root';
    }

    // First segment is typically the module
    const potentialModule = segments[0];

    // Common module mappings
    const moduleMappings: Record<string, string> = {
      'dashboard': 'dashboard',
      'settings': 'settings',
      'academics': 'academics',
      'finance': 'finance',
      'administration': 'administration',
      'library': 'library',
      'health': 'health',
      'transport': 'transport',
      'dormitory': 'dormitory',
      'communication': 'communication',
      'reports': 'reports',
      'hr': 'hr',
      'payroll': 'payroll',
      'inventory': 'inventory',
      'clubs': 'clubs'
    };

    return moduleMappings[potentialModule] || potentialModule;
  }

  /**
   * Normalize a path to a consistent format
   * 
   * Handles various path formats to ensure consistent matching.
   * Removes trailing slashes, converts backslashes to forward slashes,
   * and handles query strings.
   * 
   * @param path - The path to normalize
   * @returns Normalized path string
   * 
   * @example
   * ```typescript
   * const normalized = mapper.normalizePath('/students//');
   * // Returns: '/students'
   * 
   * const normalized2 = mapper.normalizePath('/students\\edit');
   * // Returns: '/students/edit'
   * ```
   */
  normalizePath(path: string): string {
    if (!path || typeof path !== 'string') {
      return '/';
    }

    // Remove query strings
    let normalized = path.split('?')[0];

    // Remove hash fragment
    normalized = normalized.split('#')[0];

    // Convert backslashes to forward slashes
    normalized = normalized.replace(/\\/g, '/');

    // Remove trailing slashes (except for root)
    normalized = normalized.replace(/\/+$/, '') || '/';

    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, '/');

    // Ensure path starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    return normalized.toLowerCase();
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Find exact path match in navigation items
   */
  private findExactMatch(path: string, items: NavigationItem[]): NavigationItem | null {
    for (const item of items) {
      const normalizedItemPath = this.normalizePath(item.path);
      
      if (normalizedItemPath === path) {
        return item;
      }

      // Check children recursively
      if (item.children && item.children.length > 0) {
        const childMatch = this.findExactMatch(path, item.children);
        if (childMatch) {
          return childMatch;
        }
      }
    }

    return null;
  }

  /**
   * Find parameterized route match in navigation items
   */
  private findParameterizedMatch(path: string, items: NavigationItem[]): NavigationItem | null {
    for (const item of items) {
      const normalizedItemPath = this.normalizePath(item.path);
      
      // Check if pattern has parameters
      if (normalizedItemPath.includes('/:')) {
        if (this.doesPathMatchPattern(path, normalizedItemPath)) {
          return item;
        }
      }

      // Check children recursively
      if (item.children && item.children.length > 0) {
        const childMatch = this.findParameterizedMatch(path, item.children);
        if (childMatch) {
          return childMatch;
        }
      }
    }

    return null;
  }

  /**
   * Find prefix match for parent routes
   */
  private findPrefixMatch(path: string, items: NavigationItem[]): NavigationItem | null {
    // Sort items by path length (longest first) to match most specific
    const sortedItems = [...items].sort((a, b) => {
      const aPath = this.normalizePath(a.path);
      const bPath = this.normalizePath(b.path);
      return bPath.length - aPath.length;
    });

    for (const item of sortedItems) {
      const normalizedItemPath = this.normalizePath(item.path);
      
      // Check if path starts with this item's path
      if (path.startsWith(normalizedItemPath) && normalizedItemPath !== '/') {
        // Make sure it's a proper prefix (next char should be / or path ends)
        const afterPrefix = path.slice(normalizedItemPath.length);
        if (!afterPrefix || afterPrefix.startsWith('/')) {
          return item;
        }
      }

      // Check children
      if (item.children && item.children.length > 0) {
        const childMatch = this.findPrefixMatch(path, item.children);
        if (childMatch) {
          return childMatch;
        }
      }
    }

    return null;
  }

  /**
   * Check if a path matches a pattern (supports :param syntax)
   */
  private doesPathMatchPattern(path: string, pattern: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const normalizedPattern = this.normalizePath(pattern);

    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const patternSegments = normalizedPattern.split('/').filter(Boolean);

    // If pattern has wildcard at end, it matches anything after
    if (normalizedPattern.endsWith('/*')) {
      const basePattern = normalizedPattern.replace(/\/\*$/, '');
      const baseSegments = basePattern.split('/').filter(Boolean);
      
      if (pathSegments.length >= baseSegments.length) {
        // Check base matches
        for (let i = 0; i < baseSegments.length; i++) {
          const patternSeg = baseSegments[i];
          if (!patternSeg.startsWith(':') && patternSeg !== pathSegments[i]) {
            return false;
          }
        }
        return true;
      }
      return false;
    }

    // Segment count must match for non-wildcard patterns
    if (pathSegments.length !== patternSegments.length) {
      return false;
    }

    // Check each segment
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSeg = patternSegments[i];
      const pathSeg = pathSegments[i];

      // Parameter segments always match
      if (patternSeg.startsWith(':')) {
        continue;
      }

      // Static segments must match exactly
      if (patternSeg !== pathSeg) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parse route params with wildcard support
   */
  private parseRouteParamsWithWildcard(
    pathSegments: string[], 
    patternSegments: string[]
  ): Record<string, string> {
    const params: Record<string, string> = {};

    // Handle wildcard patterns
    if (patternSegments.some(s => s === '*' || s.endsWith('/*'))) {
      const wildcardIndex = patternSegments.findIndex(s => s === '*' || s.endsWith('/*'));
      
      // Match segments before wildcard
      for (let i = 0; i < wildcardIndex; i++) {
        const patternSegment = patternSegments[i];
        const pathSegment = pathSegments[i];
        
        if (patternSegment.startsWith(':')) {
          params[patternSegment.substring(1)] = pathSegment;
        } else if (patternSegment !== pathSegment) {
          return {};
        }
      }

      // Capture remaining segments as wildcard
      const wildcardParam = patternSegments[wildcardIndex].replace('/*', '').replace('*', '');
      const remainingSegments = pathSegments.slice(wildcardIndex);
      if (wildcardParam) {
        params[wildcardParam] = remainingSegments.join('/');
      }
      
      return params;
    }

    // Handle case where path has more segments than pattern
    // Try to match as many as possible
    const minLength = Math.min(pathSegments.length, patternSegments.length);
    for (let i = 0; i < minLength; i++) {
      const patternSegment = patternSegments[i];
      const pathSegment = pathSegments[i];

      if (patternSegment.startsWith(':')) {
        params[patternSegment.substring(1)] = pathSegment;
      } else if (patternSegment !== pathSegment) {
        return {};
      }
    }

    return params;
  }

  /**
   * Generate a unique tab ID from path
   */
  private generateTabId(path: string): string {
    const normalized = this.normalizePath(path);
    // Convert path to a safe ID format
    return normalized
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate tab title from navigation item
   */
  private generateTabTitle(navigationItem: NavigationItem, overrideTitle?: string): string {
    if (overrideTitle) {
      return overrideTitle;
    }

    if (!navigationItem) {
      return 'Untitled';
    }

    let name = navigationItem.name || 'Untitled';

    // Clean up translation keys
    if (name.startsWith('navigation:')) {
      name = name
        .replace('navigation:', '')
        .replace(/\./g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim();
    }

    // Capitalize words
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }
}

// Export singleton instance for convenience
export const routeToTabMapper = new RouteToTabMapper();

// Export class for cases where a new instance is needed
export default RouteToTabMapper;
