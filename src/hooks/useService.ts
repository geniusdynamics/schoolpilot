import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { serviceRegistry } from '@/core/ServiceRegistry';
import type { ServiceState } from '@/core/ServiceRegistry';

export interface UseServiceOptions<T> {
  moduleId: string;
  name: string;
  autoInit?: boolean;
  onReady?: (service: T) => void;
  onError?: (error: Error) => void;
}

export interface UseServiceResult<T> {
  service: T | null;
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  state: ServiceState | null;
  init: () => Promise<T>;
}

/**
 * React hook for accessing a service from the registry
 */
export function useService<T>(options: UseServiceOptions<T>): UseServiceResult<T> {
  const { moduleId, name, autoInit = true, onReady, onError } = options;
  
  const [service, setService] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<ServiceState | null>(null);
  const initAttempted = useRef(false);

  // Get initial state
  useEffect(() => {
    setState(serviceRegistry.getState(moduleId, name));
  }, [moduleId, name]);

  // Initialize service
  const init = useCallback(async (): Promise<T> => {
    if (initAttempted.current) {
      const existing = serviceRegistry.getSync<T>(moduleId, name);
      if (existing) return existing;
    }

    setIsLoading(true);
    setError(null);
    initAttempted.current = true;

    try {
      const instance = await serviceRegistry.get<T>(moduleId, name);
      setService(instance);
      setState(serviceRegistry.getState(moduleId, name));
      onReady?.(instance);
      return instance;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setState(serviceRegistry.getState(moduleId, name));
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, name, onReady, onError]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInit && !service && !isLoading && !initAttempted.current) {
      init();
    }
  }, [autoInit, service, isLoading, init]);

  // Subscribe to service events
  useEffect(() => {
    const handleReady = (e: { moduleId: string; name: string; instance: unknown }) => {
      if (e.moduleId === moduleId && e.name === name) {
        setService(e.instance as T);
        setState(serviceRegistry.getState(moduleId, name));
        setIsLoading(false);
      }
    };

    const handleError = (e: { moduleId: string; name: string; error: Error }) => {
      if (e.moduleId === moduleId && e.name === name) {
        setError(e.error);
        setState(serviceRegistry.getState(moduleId, name));
        setIsLoading(false);
      }
    };

    serviceRegistry.on(ServiceRegistry.SERVICE_READY, handleReady);
    serviceRegistry.on(ServiceRegistry.SERVICE_ERROR, handleError);

    return () => {
      serviceRegistry.off(ServiceRegistry.SERVICE_READY, handleReady);
      serviceRegistry.off(ServiceRegistry.SERVICE_ERROR, handleError);
    };
  }, [moduleId, name]);

  const isReady = useMemo(() => state?.status === 'ready', [state]);

  return {
    service,
    isLoading,
    isReady,
    error,
    state,
    init
  };
}

export interface UseServicesResult {
  services: Array<{ moduleId: string; name: string; status: ServiceState['status'] }>;
  readyCount: number;
  totalCount: number;
  allReady: boolean;
  isLoading: boolean;
}

/**
 * Hook for monitoring all services
 */
export function useServices(): UseServicesResult {
  const [services, setServices] = useState<Array<{ moduleId: string; name: string; status: ServiceState['status'] }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateStates = () => {
      const states = serviceRegistry.getAllStates();
      setServices(states.map(s => ({
        moduleId: s.name.includes(':') ? s.name.split(':')[0] : '',
        name: s.name.includes(':') ? s.name.split(':')[1] : s.name,
        status: s.status
      })));
    };

    const handleReady = () => updateStates();
    const handleError = () => updateStates();
    const handleRegistered = () => updateStates();

    serviceRegistry.on(ServiceRegistry.SERVICE_READY, handleReady);
    serviceRegistry.on(ServiceRegistry.SERVICE_ERROR, handleError);
    serviceRegistry.on(ServiceRegistry.SERVICE_REGISTERED, handleRegistered);

    updateStates();

    return () => {
      serviceRegistry.off(ServiceRegistry.SERVICE_READY, handleReady);
      serviceRegistry.off(ServiceRegistry.SERVICE_ERROR, handleError);
      serviceRegistry.off(ServiceRegistry.SERVICE_REGISTERED, handleRegistered);
    };
  }, []);

  const readyCount = useMemo(() => 
    services.filter(s => s.status === 'ready').length,
    [services]
  );

  const totalCount = services.length;
  const allReady = totalCount > 0 && readyCount === totalCount;

  return {
    services,
    readyCount,
    totalCount,
    allReady,
    isLoading
  };
}

export interface UseServiceFinderOptions {
  pattern: string | RegExp;
}

export interface UseServiceFinderResult {
  matches: Array<{ moduleId: string; name: string }>;
  isSearching: boolean;
}

/**
 * Hook for finding services by pattern
 */
export function useServiceFinder(options: UseServiceFinderOptions): UseServiceFinderResult {
  const { pattern } = options;
  
  const [matches, setMatches] = useState<Array<{ moduleId: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const results = serviceRegistry.find(pattern);
    setMatches(results);
    setIsSearching(false);
  }, [pattern]);

  return {
    matches,
    isSearching
  };
}

/**
 * Hook to check if multiple services are ready
 */
export function useServicesReady(serviceIds: Array<{ moduleId: string; name: string }>): boolean {
  const [allReady, setAllReady] = useState(() => 
    serviceIds.every(({ moduleId, name }) => serviceRegistry.isReady(moduleId, name))
  );

  useEffect(() => {
    const checkAllReady = () => {
      const ready = serviceIds.every(({ moduleId, name }) => 
        serviceRegistry.isReady(moduleId, name)
      );
      setAllReady(ready);
    };

    serviceRegistry.on(ServiceRegistry.SERVICE_READY, checkAllReady);
    checkAllReady();

    return () => {
      serviceRegistry.off(ServiceRegistry.SERVICE_READY, checkAllReady);
    };
  }, [serviceIds]);

  return allReady;
}
