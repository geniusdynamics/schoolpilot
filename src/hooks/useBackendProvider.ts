/**
 * useBackendProvider Hook
 * 
 * React hook for accessing and managing backend providers.
 */

import { useState, useEffect, useCallback } from 'react';
import { BackendProviderRegistry } from '@/services/backend/BackendProviderRegistry';
import type { IBackendProvider } from '@/services/backend/IBackendProvider';
import type { BackendStatus, BackendType } from '@/services/backend/types';

export interface UseBackendProviderResult {
  // Active provider
  activeProvider: IBackendProvider | null;
  activeProviderId: string | null;
  
  // All providers
  providers: IBackendProvider[];
  
  // Provider management
  setActiveProvider: (providerId: string) => void;
  getProvider: (providerId: string) => IBackendProvider | undefined;
  getProvidersByType: (type: BackendType) => IBackendProvider[];
  
  // Health status
  healthStatus: BackendStatus | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  
  // Actions
  refreshHealth: () => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for accessing backend providers
 */
export function useBackendProvider(): UseBackendProviderResult {
  const [registry] = useState(() => BackendProviderRegistry.getInstance());
  const [activeProvider, setActiveProviderState] = useState<IBackendProvider | null>(
    registry.getActive()
  );
  const [activeProviderId, setActiveProviderIdState] = useState<string | null>(
    registry.getActiveId()
  );
  const [providers, setProviders] = useState<IBackendProvider[]>(registry.getAll());
  const [healthStatus, setHealthStatus] = useState<BackendStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Subscribe to registry events
  useEffect(() => {
    const unsubscribeRegistered = registry.on('provider:registered', () => {
      setProviders(registry.getAll());
    });
    
    const unsubscribeUnregistered = registry.on('provider:unregistered', () => {
      setProviders(registry.getAll());
    });
    
    const unsubscribeActiveChanged = registry.on('provider:active:changed', (event: any) => {
      setActiveProviderState(event.provider);
      setActiveProviderIdState(event.newProviderId);
    });
    
    const unsubscribeActiveCleared = registry.on('provider:active:cleared', () => {
      setActiveProviderState(null);
      setActiveProviderIdState(null);
    });
    
    return () => {
      unsubscribeRegistered();
      unsubscribeUnregistered();
      unsubscribeActiveChanged();
      unsubscribeActiveCleared();
    };
  }, [registry]);
  
  // Load initial health status
  useEffect(() => {
    if (activeProvider) {
      refreshHealth();
    }
  }, [activeProvider]);
  
  // Set active provider
  const setActiveProvider = useCallback((providerId: string) => {
    try {
      registry.setActive(providerId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [registry]);
  
  // Get provider by ID
  const getProvider = useCallback((providerId: string) => {
    return registry.get(providerId);
  }, [registry]);
  
  // Get providers by type
  const getProvidersByType = useCallback((type: BackendType) => {
    return registry.getByType(type);
  }, [registry]);
  
  // Refresh health status
  const refreshHealth = useCallback(async () => {
    if (!activeProvider) {
      setHealthStatus(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await activeProvider.healthCheck();
      setHealthStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setHealthStatus({
        connected: false,
        authenticated: false,
        pendingChanges: 0,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: err instanceof Error ? err.message : String(err),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider]);
  
  return {
    activeProvider,
    activeProviderId,
    providers,
    setActiveProvider,
    getProvider,
    getProvidersByType,
    healthStatus,
    isConnected: healthStatus?.connected ?? false,
    isAuthenticated: healthStatus?.authenticated ?? false,
    refreshHealth,
    isLoading,
    error,
  };
}

/**
 * Hook for checking if a specific backend type is available
 */
export function useHasBackendType(type: BackendType): boolean {
  const { providers } = useBackendProvider();
  return providers.some(p => p.type === type);
}

/**
 * Hook for checking if active provider supports an entity
 */
export function useSupportsEntity(entity: string): boolean {
  const { activeProvider } = useBackendProvider();
  return activeProvider?.supportsEntity(entity) ?? false;
}
