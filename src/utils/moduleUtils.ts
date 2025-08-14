// ABOUTME: Utility functions for module operations
// ABOUTME: Handles module ID extraction and navigation key processing

/**
 * Extracts the actual module ID from a navigation key
 * @param navigationKey - The navigation key (e.g., 'navigation:finance.title')
 * @returns The module ID (e.g., 'finance')
 */
export function extractModuleId(navigationKey: string): string {
  // Handle special cases
  if (navigationKey === 'navigation:dashboard') {
    return 'dashboard';
  }
  
  // Extract module ID from navigation keys like 'navigation:finance.title'
  const match = navigationKey.match(/^navigation:([^.]+)/);
  if (match) {
    return match[1];
  }
  
  // If it's already a simple module ID, return as is
  return navigationKey;
}

/**
 * Converts a module ID to its corresponding navigation key
 * @param moduleId - The module ID (e.g., 'finance')
 * @returns The navigation key (e.g., 'navigation:finance.title')
 */
export function moduleIdToNavigationKey(moduleId: string): string {
  if (moduleId === 'dashboard') {
    return 'navigation:dashboard';
  }
  
  return `navigation:${moduleId}.title`;
}

/**
 * Checks if a string is a navigation key
 * @param key - The key to check
 * @returns True if it's a navigation key, false otherwise
 */
export function isNavigationKey(key: string): boolean {
  return key.startsWith('navigation:');
}