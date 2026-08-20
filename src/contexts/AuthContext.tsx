import { logger } from '@/utils/logging';

// ABOUTME: Authentication context for managing user state and authentication
// ABOUTME: Provides login, logout, and user state management across the app

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { authService, AuthUser, LoginCredentials, AuthResult } from '../services/auth/authService';

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
  const [isDemoMode, setIsDemoMode] = useState(true);

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
        }
        
        // Determine if we're in demo mode — prefer session flag, fallback to config
        const session = authService.getCurrentSession();
        let demoMode = session?.isDemo;
        if (demoMode === undefined) {
          try {
            const { unifiedConfigManager } = await import('@/config/unifiedConfig');
            const cfg: any = unifiedConfigManager.getConfig();
            demoMode = cfg?.dataMode === 'demo' || cfg?.demo?.active === true;
            // default to true if config not yet loaded (login should show demo hints)
            if (demoMode === undefined) demoMode = true;
          } catch {
            demoMode = true;
          }
        }
        setIsDemoMode(!!demoMode);
      } catch (error) {
        logger.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login method
  const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      setIsLoading(true);
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsDemoMode(result.session?.isDemo || false);
      }
      
      return result;
    } catch (error) {
      logger.error('AuthContext login error:', error);
      return {
        success: false,
        message: 'Login failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout method
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      setIsDemoMode(true);
      
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
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      logger.error('Error refreshing user:', error);
    }
  };

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