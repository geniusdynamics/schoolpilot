// ABOUTME: Authentication context for managing user state and authentication
// ABOUTME: Provides login, logout, and user state management across the app

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, AuthUser, LoginCredentials, AuthResult } from '../services/authService';

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
        
        // Check if user is already authenticated
        if (authService.isAuthenticated()) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
        
        // Determine if we're in demo mode
        setIsDemoMode(authService.getCurrentSession()?.isDemo || true);
      } catch (error) {
        console.error('Error initializing auth:', error);
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
        console.warn('Failed to clear route storage on logout:', error);
      }
    } catch (error) {
      console.error('Error during logout:', error);
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
      console.error('Error refreshing user:', error);
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

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasModuleAccess,
    isDemoMode
  };

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