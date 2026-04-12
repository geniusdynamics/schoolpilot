/**
 * RBAC Provider
 * 
 * React context provider for role-based access control.
 */

import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { RBACEngine, initRBAC } from './RBACEngine';
import type { RBACConfig, RBACUser, Role } from './types';

interface RBACContextValue {
  engine: RBACEngine;
  currentUser: RBACUser | null;
  setUser: (user: RBACUser | null) => void;
  isLoading: boolean;
}

export const RBACContext = createContext<RBACContextValue | null>(null);

interface RBACProviderProps {
  children: ReactNode;
  config?: RBACConfig;
  getCurrentUser?: () => Promise<RBACUser | null>;
}

/**
 * RBAC Provider Component
 * 
 * @example
 * ```tsx
 * <RBACProvider config={{ superAdminRole: 'admin' }}>
 *   <App />
 * </RBACProvider>
 * ```
 */
export const RBACProvider: React.FC<RBACProviderProps> = ({
  children,
  config,
  getCurrentUser,
}) => {
  const [engine] = useState(() => initRBAC(config));
  const [currentUser, setCurrentUser] = useState<RBACUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (getCurrentUser) {
        try {
          const user = await getCurrentUser();
          setCurrentUser(user);
        } catch (error) {
          console.error('Failed to load user:', error);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [getCurrentUser]);

  const setUser = useCallback((user: RBACUser | null) => {
    setCurrentUser(user);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    engine,
    currentUser,
    setUser,
    isLoading
  }), [engine, currentUser, setUser, isLoading]);

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
};

export default RBACProvider;
