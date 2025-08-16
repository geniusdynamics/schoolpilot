// ABOUTME: Utility functions for React hooks to prevent common errors
// ABOUTME: Provides safe dependency array handling and error boundaries

import { DependencyList } from 'react';

/**
 * Ensures dependency arrays are always valid arrays to prevent 'prevDeps.join is not a function' errors
 * @param deps - The dependency array that might be undefined or invalid
 * @returns A safe dependency array with stable length
 */
export const safeDeps = (deps: DependencyList | undefined): DependencyList => {
  if (!deps || !Array.isArray(deps)) {
    console.warn('[hookUtils] Invalid dependency array detected, using empty array as fallback');
    return [];
  }
  
  // Replace undefined/null values with stable placeholders instead of filtering
  // This maintains consistent array length to prevent React hook warnings
  return deps.map(dep => {
    if (dep === undefined) return '__UNDEFINED__';
    if (dep === null) return '__NULL__';
    return dep;
  });
};

/**
 * Creates a stable dependency array that prevents unnecessary re-renders
 * @param deps - The dependency array
 * @returns A stable dependency array
 */
export const stableDeps = (deps: DependencyList): DependencyList => {
  return safeDeps(deps).map(dep => {
    // Handle objects and arrays by converting to JSON for comparison
    if (typeof dep === 'object' && dep !== null) {
      try {
        return JSON.stringify(dep);
      } catch (error) {
        console.warn('[hookUtils] Unable to serialize dependency, using string representation');
        return String(dep);
      }
    }
    return dep;
  });
};

/**
 * Validates that all dependencies in an array are defined
 * @param deps - The dependency array to validate
 * @param hookName - Name of the hook for debugging
 * @returns Whether all dependencies are valid
 */
export const validateDeps = (deps: DependencyList | undefined, hookName: string): boolean => {
  if (!deps || !Array.isArray(deps)) {
    console.error(`[${hookName}] Invalid dependency array:`, deps);
    return false;
  }
  
  const invalidDeps = deps.filter((dep, index) => dep === undefined || dep === null);
  if (invalidDeps.length > 0) {
    console.error(`[${hookName}] Found ${invalidDeps.length} undefined/null dependencies`);
    return false;
  }
  
  return true;
};

/**
 * Error boundary for hook-related errors
 */
export class HookErrorHandler {
  static handleError(error: Error, hookName: string, context?: any): void {
    console.error(`[${hookName}] Hook error:`, {
      error: error.message,
      stack: error.stack,
      context
    });
    
    // In development, throw the error to help with debugging
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }
  
  static wrapHook<T>(hookFn: () => T, hookName: string, fallback: T): T {
    try {
      return hookFn();
    } catch (error) {
      this.handleError(error as Error, hookName);
      return fallback;
    }
  }
}

/**
 * Safe useCallback wrapper that ensures dependency arrays are valid
 */
export const safeUseCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList | undefined,
  hookName: string = 'useCallback'
): T => {
  const safeDependencies = safeDeps(deps);
  validateDeps(safeDependencies, hookName);
  
  // Note: This is a utility function, actual useCallback should be used in components
  return callback;
};

/**
 * Safe useMemo wrapper that ensures dependency arrays are valid
 */
export const safeUseMemo = <T>(
  factory: () => T,
  deps: DependencyList | undefined,
  hookName: string = 'useMemo'
): T => {
  const safeDependencies = safeDeps(deps);
  validateDeps(safeDependencies, hookName);
  
  // Note: This is a utility function, actual useMemo should be used in components
  return factory();
};