// ABOUTME: Hook for persisting current route across page refreshes
// ABOUTME: Prevents unwanted redirects to dashboard when refreshing on other pages

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTE_STORAGE_KEY = 'currentRoute';
const LAST_VISIT_KEY = 'lastVisitTimestamp';
const ROUTE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export const useRoutePersistence = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Store current route whenever it changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Don't store the root path or login path
    if (currentPath !== '/' && currentPath !== '/login') {
      try {
        sessionStorage.setItem(ROUTE_STORAGE_KEY, currentPath);
        sessionStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
      } catch (error) {
        console.warn('Failed to store route in sessionStorage:', error);
      }
    }
  }, [location.pathname]);

  // Get stored route if it's still valid
  const getStoredRoute = (): string | null => {
    try {
      const storedRoute = sessionStorage.getItem(ROUTE_STORAGE_KEY);
      const lastVisit = sessionStorage.getItem(LAST_VISIT_KEY);
      
      if (!storedRoute || !lastVisit) {
        return null;
      }
      
      const lastVisitTime = parseInt(lastVisit, 10);
      const now = Date.now();
      
      // Check if the stored route is still valid (not expired)
      if (now - lastVisitTime > ROUTE_EXPIRY_MS) {
        // Clean up expired data
        sessionStorage.removeItem(ROUTE_STORAGE_KEY);
        sessionStorage.removeItem(LAST_VISIT_KEY);
        return null;
      }
      
      return storedRoute;
    } catch (error) {
      console.warn('Failed to retrieve stored route:', error);
      return null;
    }
  };

  // Clear stored route (useful for logout)
  const clearStoredRoute = () => {
    try {
      sessionStorage.removeItem(ROUTE_STORAGE_KEY);
      sessionStorage.removeItem(LAST_VISIT_KEY);
    } catch (error) {
      console.warn('Failed to clear stored route:', error);
    }
  };

  // Check if we should restore a route on app initialization
  const shouldRestoreRoute = (): boolean => {
    const currentPath = location.pathname;
    const storedRoute = getStoredRoute();
    
    // Only restore if we're on root path and have a valid stored route
    return currentPath === '/' && storedRoute !== null && storedRoute !== '/';
  };

  // Restore route if appropriate
  const restoreRouteIfNeeded = () => {
    if (shouldRestoreRoute()) {
      const storedRoute = getStoredRoute();
      if (storedRoute) {
        console.log('🔄 Restoring route after refresh:', storedRoute);
        navigate(storedRoute, { replace: true });
        return true;
      }
    }
    return false;
  };

  return {
    getStoredRoute,
    clearStoredRoute,
    shouldRestoreRoute,
    restoreRouteIfNeeded
  };
};