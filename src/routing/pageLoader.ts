// ABOUTME: Dynamic page loader using Vite's import.meta.glob for module-based page resolution
// ABOUTME: import.meta.glob calls MUST remain at module level for Vite static analysis

import React from 'react';
import { logger } from '@/utils/logging';

type PageLoader = () => Promise<{ default: React.ComponentType<any> }>;

const lazyPages = new WeakMap<PageLoader, React.LazyExoticComponent<React.ComponentType<any>>>();

/**
 * The lazy component for one page loader, made once.
 *
 * A route table that calls React.lazy while it renders gives every page a new component type each time
 * it renders, so React unmounts the page that is showing and mounts it again. A page that redirects
 * (a moved Settings tab) then never gets to run the effect that does the redirect, and a page with a
 * form loses what was typed whenever the navigation reloads.
 */
export const lazyPage = (load: PageLoader): React.LazyExoticComponent<React.ComponentType<any>> => {
  let component = lazyPages.get(load);
  if (!component) {
    component = React.lazy(load);
    lazyPages.set(load, component);
  }
  return component;
};

// Static glob patterns at module level (required by Vite)
const allPageModules = {
  ...import.meta.glob('../modules/*/pages/*.tsx'),
  ...import.meta.glob([
    '../modules/*/pages/**/*.tsx',
    '!../modules/*/pages/**/__tests__/**',
    '!../modules/*/pages/**/*.test.tsx',
  ]),
};

// Cache for module-specific page modules to avoid recreating glob objects
const modulePagesCache = new Map<string, Record<string, () => Promise<any>>>();

/**
 * Get page modules for a specific module only.
 * This enables per-module code splitting - modules are loaded on-demand.
 */
export function getModulePages(moduleId: string): Record<string, () => Promise<any>> {
  // Return cached result if available
  if (modulePagesCache.has(moduleId)) {
    return modulePagesCache.get(moduleId)!;
  }

  // Filter the static glob results for the specific module
  const modulePattern = new RegExp(`../modules/${moduleId}/pages/`);
  const modulePages: Record<string, () => Promise<any>> = {};

  for (const [key, value] of Object.entries(allPageModules)) {
    if (modulePattern.test(key)) {
      modulePages[key] = value;
    }
  }

  // Cache the result
  modulePagesCache.set(moduleId, modulePages);

  logger.debug('📦 [pageLoader] Loaded pages for module:', moduleId, 'count:', Object.keys(modulePages).length);

  return modulePages;
}

// Dashboard modules for dynamic loading (commonly used, keep eager)
export const dashboardModules = {
  ...import.meta.glob('../modules/*/pages/*Dashboard*.tsx'),
};

// Legacy: Keep pageModules for backward compatibility during transition
// This will be removed once all consumers migrate to getModulePages
export const pageModules = {
  ...import.meta.glob('../modules/*/pages/*.tsx'),
  ...import.meta.glob([
    '../modules/*/pages/**/*.tsx',
    '!../modules/*/pages/**/__tests__/**',
    '!../modules/*/pages/**/*.test.tsx',
  ]),
};

/**
 * Resolves a nav item's page component from the glob map.
 * Returns a React.lazy component or null if not found.
 *
 * Uses per-module code splitting - only loads pages for the target module.
 */
export const getPageComponent = (
  navItem: { page?: string; path: string },
  moduleId?: string
): React.LazyExoticComponent<React.ComponentType<any>> | null => {
  logger.debug('🔍 [pageLoader] Looking up page component for:', navItem.page, 'path:', navItem.path, 'moduleId:', moduleId);

  if (!navItem.page) {
    logger.debug('❌ [pageLoader] No page specified for nav item:', navItem);
    return null;
  }

  // Determine target module
  const pathSegments = navItem.path.split('/').filter(Boolean);
  const targetModule = moduleId || pathSegments[0] || 'dashboard';

  // Get pages for specific module only (enables per-module code splitting)
  const modulePages = getModulePages(targetModule);

  // Try multiple key patterns for better compatibility
  const possibleKeys = [
    // Standard pattern
    `../modules/${targetModule}/pages/${navItem.page}.tsx`,
    // Without .tsx extension
    `../modules/${targetModule}/pages/${navItem.page}`,
    // With /index.tsx
    `../modules/${targetModule}/pages/${navItem.page}/index.tsx`,
  ];

  for (const key of possibleKeys) {
    if (modulePages[key]) {
      logger.debug('✅ [pageLoader] Found component via key:', key);
      return lazyPage(modulePages[key] as PageLoader);
    }
  }

  // Fallback: Search for any key that ends with the page name within module pages
  const allKeys = Object.keys(modulePages);
  const matchingKey = allKeys.find(key => {
    const pageNamePattern = new RegExp(`/${targetModule}/pages/${navItem.page}\\.tsx$`);
    return pageNamePattern.test(key) || key.endsWith(`/${navItem.page}.tsx`);
  });

  if (matchingKey) {
    logger.debug('✅ [pageLoader] Found component via fallback search:', matchingKey);
    return lazyPage(modulePages[matchingKey] as PageLoader);
  }

  // Cross-module fallback: a navigation entry can point at a page that lives in ANOTHER module —
  // the reports hub links the finance ledger, and the page name alone never resolves under the
  // path's module. Without this the route is silently omitted and the catch-all renders 404.
  const crossModuleKey = Object.keys(pageModules).find(
    (key) =>
      key.endsWith(`/pages/${navItem.page}.tsx`) ||
      key.endsWith(`/pages/${navItem.page}/index.tsx`) ||
      key.endsWith(`/pages/${navItem.page}`)
  );
  if (crossModuleKey) {
    logger.debug('✅ [pageLoader] Found component in another module:', crossModuleKey);
    return lazyPage(pageModules[crossModuleKey] as PageLoader);
  }

  // Debug: List all available keys for this module
  logger.debug('❌ [pageLoader] Component not found for:', navItem.page);
  logger.debug('❌ [pageLoader] Tried keys:', possibleKeys);
  logger.debug('🔍 [pageLoader] Available keys for', targetModule, ':', allKeys.slice(0, 20));
  return null;
};
