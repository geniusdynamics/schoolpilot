// ABOUTME: Utility functions for module identification and path handling
// ABOUTME: Helps with consistent module identification across the application

/**
 * Extract module ID from a module name or path
 * @param moduleIdentifier - Module name or path
 * @returns Clean module ID
 */
export const extractModuleId = (moduleIdentifier: string): string => {
  if (!moduleIdentifier) return 'dashboard';
  
  // Handle navigation: prefix
  if (moduleIdentifier.startsWith('navigation:')) {
    return moduleIdentifier.replace('navigation:', '');
  }
  
  // Handle module paths like /administration, /academics, etc.
  if (moduleIdentifier.startsWith('/')) {
    return moduleIdentifier.substring(1);
  }
  
  // Handle module: prefix
  if (moduleIdentifier.startsWith('module:')) {
    return moduleIdentifier.replace('module:', '');
  }
  
  return moduleIdentifier;
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
  
  return `/${cleanModuleId}`;
};

export default {
  extractModuleId,
  getModulePath,
  isPathInModule,
  getModuleDashboardPath
};