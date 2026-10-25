// ABOUTME: Utility functions for module identification and path handling
// ABOUTME: Helps with consistent module identification across the application

import { canonicalTabUrl } from '../services/tabs/moduleDashboardUrl';

/**
 * Extract module ID from a module name or path
 * @param moduleIdentifier - Module name or path
 * @returns Clean module ID
 */
export const extractModuleId = (moduleIdentifier: string): string => {
  if (!moduleIdentifier) return 'dashboard';
  
  let cleanId = moduleIdentifier;
  
  // Handle navigation: prefix
  if (cleanId.startsWith('navigation:')) {
    cleanId = cleanId.replace('navigation:', '');
  }
  
  // Handle module: prefix
  if (cleanId.startsWith('module:')) {
    cleanId = cleanId.replace('module:', '');
  }
  
  // Handle .title suffix (from i18n keys)
  if (cleanId.endsWith('.title')) {
    cleanId = cleanId.replace('.title', '');
  }
  
  // Handle module paths like /administration, /academics, etc.
  if (cleanId.startsWith('/')) {
    cleanId = cleanId.substring(1);
  }
  
  return cleanId;
};

/**
 * Get module path from module ID
 * @param moduleId - Module ID
 * @returns Module path
 */
export const getModulePath = (moduleId: string): string => {
  if (!moduleId) return '/dashboard';
  
  // Ensure path starts with /
  if (!moduleId.startsWith('/')) {
    return `/${moduleId}`;
  }
  
  return moduleId;
};

/**
 * Check if a path belongs to a specific module
 * @param path - Path to check
 * @param moduleId - Module ID to check against
 * @returns Boolean indicating if path belongs to module
 */
export const isPathInModule = (path: string, moduleId: string): boolean => {
  if (!path || !moduleId) return false;
  
  const cleanModuleId = extractModuleId(moduleId);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Special case for dashboard
  if (cleanModuleId === 'dashboard') {
    return cleanPath === '/dashboard' || cleanPath === '/';
  }
  
  return cleanPath.startsWith(`/${cleanModuleId}`);
};

/**
 * Get dashboard path for a module
 * @param moduleId - Module ID
 * @returns Dashboard path for the module
 */
export const getModuleDashboardPath = (moduleId: string): string => {
  const cleanModuleId = extractModuleId(moduleId);
  
  // Special case for dashboard
  if (cleanModuleId === 'dashboard') {
    return '/dashboard';
  }
  
  // A module's dashboard is its root page, named for the module; settings keeps its own address.
  return canonicalTabUrl(`/${cleanModuleId}/dashboard`);
};

export default {
  extractModuleId,
  getModulePath,
  isPathInModule,
  getModuleDashboardPath
};