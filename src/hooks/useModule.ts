import { useState, useEffect, useCallback, useMemo } from 'react';
import { moduleRegistry } from '@/core/moduleRegistry';
import type { ModuleMetadata, ModuleState } from '@/core/types/module';

export interface UseModuleOptions {
  autoEnable?: boolean;
  onError?: (error: Error) => void;
  onEnabled?: () => void;
  onDisabled?: () => void;
}

export interface UseModuleResult {
  metadata: ModuleMetadata | null;
  state: ModuleState | null;
  isRegistered: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  dependencies: string[];
  dependents: string[];
}

/**
 * React hook for accessing and managing a module
 */
export function useModule(moduleId: string, options: UseModuleOptions = {}): UseModuleResult {
  const { autoEnable = false, onError, onEnabled, onDisabled } = options;

  const [state, setState] = useState<ModuleState | null>(
    moduleRegistry.getState(moduleId) || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get metadata
  const metadata = useMemo(() => 
    moduleRegistry.getMetadata(moduleId) || null,
    [moduleId]
  );

  // Get dependencies and dependents
  const dependencies = useMemo(() => 
    moduleRegistry.getDependencies(moduleId),
    [moduleId]
  );

  const dependents = useMemo(() => 
    moduleRegistry.getDependents(moduleId),
    [moduleId]
  );

  // Update state from registry
  const refreshState = useCallback(() => {
    const newState = moduleRegistry.getState(moduleId);
    setState(newState || null);
  }, [moduleId]);

  // Enable module
  const enable = useCallback(async () => {
    if (!moduleRegistry.isRegistered(moduleId)) {
      const err = new Error(`Module "${moduleId}" is not registered`);
      setError(err);
      onError?.(err);
      throw err;
    }

    if (moduleRegistry.isEnabled(moduleId)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await moduleRegistry.enable(moduleId);
      refreshState();
      onEnabled?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, onEnabled, onError, refreshState]);

  // Disable module
  const disable = useCallback(async () => {
    if (!moduleRegistry.isEnabled(moduleId)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await moduleRegistry.disable(moduleId);
      refreshState();
      onDisabled?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, onDisabled, onError, refreshState]);

  // Subscribe to module events
  useEffect(() => {
    const handleEnabled = (e: { moduleId: string }) => {
      if (e.moduleId === moduleId) {
        refreshState();
      }
    };

    const handleDisabled = (e: { moduleId: string }) => {
      if (e.moduleId === moduleId) {
        refreshState();
      }
    };

    moduleRegistry.on('module:enabled', handleEnabled);
    moduleRegistry.on('module:disabled', handleDisabled);

    return () => {
      moduleRegistry.off('module:enabled', handleEnabled);
      moduleRegistry.off('module:disabled', handleDisabled);
    };
  }, [moduleId, refreshState]);

  // Auto-enable on mount if requested
  useEffect(() => {
    if (autoEnable && moduleRegistry.isRegistered(moduleId) && !moduleRegistry.isEnabled(moduleId)) {
      enable();
    }
  }, [autoEnable, moduleId, enable]);

  return {
    metadata,
    state,
    isRegistered: moduleRegistry.isRegistered(moduleId),
    isEnabled: state?.status === 'enabled',
    isLoading,
    error,
    enable,
    disable,
    dependencies,
    dependents
  };
}

export interface UseModulesResult {
  modules: ModuleState[];
  enabledModules: string[];
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * React hook for accessing all modules
 */
export function useModules(): UseModulesResult {
  const [modules, setModules] = useState<ModuleState[]>(moduleRegistry.getAllStates());
  const [isReady, setIsReady] = useState(moduleRegistry.ready);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleReady = () => {
      setIsReady(true);
      setIsLoading(false);
      setModules(moduleRegistry.getAllStates());
    };

    const handleError = ({ error }: { error: Error }) => {
      setError(error);
      setIsLoading(false);
    };

    const handleStateChange = () => {
      setModules(moduleRegistry.getAllStates());
    };

    moduleRegistry.on('registry:ready', handleReady);
    moduleRegistry.on('registry:error', handleError);
    moduleRegistry.on('module:enabled', handleStateChange);
    moduleRegistry.on('module:disabled', handleStateChange);
    moduleRegistry.on('module:registered', handleStateChange);

    // Check if already ready
    if (moduleRegistry.ready) {
      setIsReady(true);
      setModules(moduleRegistry.getAllStates());
    }

    return () => {
      moduleRegistry.off('registry:ready', handleReady);
      moduleRegistry.off('registry:error', handleError);
      moduleRegistry.off('module:enabled', handleStateChange);
      moduleRegistry.off('module:disabled', handleStateChange);
      moduleRegistry.off('module:registered', handleStateChange);
    };
  }, []);

  const enabledModules = useMemo(() => 
    modules.filter(m => m.status === 'enabled').map(m => m.id),
    [modules]
  );

  return {
    modules,
    enabledModules,
    isReady,
    isLoading,
    error
  };
}

/**
 * Hook to check if specific modules are enabled
 */
export function useModulesEnabled(moduleIds: string[]): Record<string, boolean> {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {};
    for (const id of moduleIds) {
      result[id] = moduleRegistry.isEnabled(id);
    }
    return result;
  });

  useEffect(() => {
    const handleEnabled = (e: { moduleId: string }) => {
      if (moduleIds.includes(e.moduleId)) {
        setEnabled(prev => ({ ...prev, [e.moduleId]: true }));
      }
    };

    const handleDisabled = (e: { moduleId: string }) => {
      if (moduleIds.includes(e.moduleId)) {
        setEnabled(prev => ({ ...prev, [e.moduleId]: false }));
      }
    };

    moduleRegistry.on('module:enabled', handleEnabled);
    moduleRegistry.on('module:disabled', handleDisabled);

    return () => {
      moduleRegistry.off('module:enabled', handleEnabled);
      moduleRegistry.off('module:disabled', handleDisabled);
    };
  }, [moduleIds]);

  return enabled;
}
