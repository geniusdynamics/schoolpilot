import { logger } from '@/utils/logging';

// ABOUTME: Authentication context for managing user state and authentication
// ABOUTME: Provides login, logout, and user state management across the app

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { authService, AuthUser, LoginCredentials, AuthResult } from '../services/auth/authService';
import { bindAuthorityForSession } from '@/data/auth/bindSession';
import { clearSessionAuthority } from '@/data/auth/sessionAuthority';

interface AuthContextType {
  // User state
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Authentication methods
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Permission checks
  hasPermission: (permissionId: string) => Promise<boolean>;
  hasModuleAccess: (moduleId: string) => Promise<boolean>;
  
  // Utility
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Wait for auth service initialization with timeout
        const maxWaitTime = 8000; // 8 seconds max wait
        const startTime = Date.now();
        
        // Wait for initialization with polling
        while (!authService.isInitialized() && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // If still not initialized after timeout, log warning but continue
        if (!authService.isInitialized()) {
          logger.warn('AuthService initialization timed out, proceeding with unauthenticated state');
        }
        
        // Check if user is already authenticated
        const isUserAuth = await authService.isAuthenticated();
        
        if (isUserAuth) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          // The permission authority is bound to the restored login, so a reload keeps the same
          // rules instead of falling back to the unchecked state the app starts in.
          await bindAuthorityForSession(
            currentUser
              ? {
                  actorId: currentUser.id,
                  username: currentUser.username ?? null,
                  role: currentUser.role ?? null,
                  moduleAccess: currentUser.moduleAccess ?? null,
                }
              : null
          );
        }
        
        // Demo mode is decided by authService from the persisted data mode only
        setIsDemoMode(authService.isDemoDatabase());
      } catch (error) {
        logger.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // A sign-out in another tab ends this tab's authority too: the other tabs of the same browser
  // share the database, so leaving one of them acting for the person who has just left would let a
  // page go on writing as them.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key.includes('schoolpilot') && event.newValue === null) {
        clearSessionAuthority();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Login method
  // Login does not touch isLoading: that flag is the start-up state, and AppContent replaces the
  // login page with a spinner while it is true, which would discard the page's error message.
  // The login page shows its own progress indicator.
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsDemoMode(result.session?.isDemo || false);
        await bindAuthorityForSession({
          actorId: result.user.id,
          username: result.user.username ?? null,
          role: result.user.role ?? null,
          moduleAccess: result.user.moduleAccess ?? null,
        });
      }
      
      return result;
    } catch (error) {
      logger.error('AuthContext login error:', error);
      return {
        success: false,
        message: 'Login failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }, []);

  // Logout method
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      clearSessionAuthority();
      setIsDemoMode(authService.isDemoDatabase());
      
      // Clear any stored route information on logout
      try {
        sessionStorage.removeItem('currentRoute');
        sessionStorage.removeItem('lastVisitTimestamp');
      } catch (error) {
        logger.warn('Failed to clear route storage on logout:', error);
      }
    } catch (error) {
      logger.error('Error during logout:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      logger.error('Error refreshing user:', error);
    }
  }, []);

  // Permission check
  const hasPermission = useCallback(async (permissionId: string): Promise<boolean> => {
    return authService.hasPermission(permissionId);
  }, []);

  // Module access check
  const hasModuleAccess = useCallback(async (moduleId: string): Promise<boolean> => {
    return authService.hasModuleAccess(moduleId);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasModuleAccess,
    isDemoMode
  }), [user, isLoading, login, logout, refreshUser, hasPermission, hasModuleAccess, isDemoMode]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * The signed-in user when there is an AuthProvider, null when a screen is mounted on its own.
 *
 * A presentational screen rendered in a test or an embedded host has no provider; it still needs
 * to render, and the caller that wants the user's name supplies one explicitly instead.
 */
export const useOptionalAuth = (): AuthContextType | null => useContext(AuthContext) ?? null;