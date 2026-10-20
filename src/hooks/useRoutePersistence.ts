import { logger } from '@/utils/logging';

// ABOUTME: Hook for persisting current route across page refreshes
// ABOUTME: Prevents unwanted redirects to dashboard when refreshing on other pages

import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { performanceEventManager } from '../services/performance/performanceEventManager';

const ROUTE_STORAGE_KEY = 'currentRoute';
const LAST_VISIT_KEY = 'lastVisitTimestamp';
const ROUTE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export const getStoredRouteFromSession = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedRoute = sessionStorage.getItem(ROUTE_STORAGE_KEY);
    const lastVisit = sessionStorage.getItem(LAST_VISIT_KEY);
    
    if (!storedRoute || !lastVisit) {
      return null;
    }
    
    const lastVisitTime = parseInt(lastVisit, 10);
    const now = Date.now();
    
    if (Number.isNaN(lastVisitTime) || now - lastVisitTime > ROUTE_EXPIRY_MS) {
      performanceEventManager.markDiagnostic('route_storage_expired', {
        storedRoute
      });
      sessionStorage.removeItem(ROUTE_STORAGE_KEY);
      sessionStorage.removeItem(LAST_VISIT_KEY);
      return null;
    }
    
    return storedRoute;
  } catch (error) {
    performanceEventManager.markDiagnostic('route_storage_read_failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    logger.warn('Failed to retrieve stored route:', error);
    return null;
  }
};

export const useRoutePersistence = (enabled = true) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Store current route whenever it changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Don't store the root path or login path
    if (enabled && currentPath !== '/' && currentPath !== '/login') {
      try {
        sessionStorage.setItem(ROUTE_STORAGE_KEY, currentPath);
        sessionStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
        performanceEventManager.markDiagnostic('route_storage_updated', {
          currentPath
        });
      } catch (error) {
        logger.warn('Failed to store route in sessionStorage:', error);
      }
    }
  }, [location.pathname, enabled]);

  // Get stored route if it's still valid
  const getStoredRoute = useCallback((): string | null => getStoredRouteFromSession(), []);

  // Clear stored route (useful for logout)
  const clearStoredRoute = useCallback(() => {
    try {
      sessionStorage.removeItem(ROUTE_STORAGE_KEY);
      sessionStorage.removeItem(LAST_VISIT_KEY);
    } catch (error) {
      logger.warn('Failed to clear stored route:', error);
    }
  }, []);

  // Check if we should restore a route on app initialization
  const shouldRestoreRoute = useCallback((): boolean => {
    if (!enabled) {
      return false;
    }

    const currentPath = location.pathname;
    const storedRoute = getStoredRoute();
    
    // Only restore if we're on root path and have a valid stored route
    return currentPath === '/' && storedRoute !== null && storedRoute !== '/';
  }, [enabled, location.pathname, getStoredRoute]);

  // Restore route if appropriate
  const restoreRouteIfNeeded = useCallback(() => {
    if (shouldRestoreRoute()) {
      const storedRoute = getStoredRoute();
      if (storedRoute) {
        performanceEventManager.markDiagnostic('route_storage_restored', {
          storedRoute
        });
        logger.info('🔄 Restoring route after refresh:', storedRoute);
        navigate(storedRoute, { replace: true });
        return true;
      }
    }
    return false;
  }, [shouldRestoreRoute, getStoredRoute, navigate]);

  return {
    getStoredRoute,
    clearStoredRoute,
    shouldRestoreRoute,
    restoreRouteIfNeeded
  };
};
