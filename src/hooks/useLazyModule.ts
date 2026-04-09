import { useState, useEffect, useCallback, useRef } from 'react';
import { moduleLoader, type LoadModuleOptions, type LoadedModuleResult } from '@/core/ModuleLoader';
import { moduleBundler } from '@/core/ModuleBundler';
import type { ModuleLoadState } from '@/core/ModuleLoader';

export interface UseLazyModuleOptions extends LoadModuleOptions {
  preload?: boolean;
  preloadDelay?: number;
  onSuccess?: (result: LoadedModuleResult) => void;
  onError?: (error: Error) => void;
}

export interface UseLazyModuleResult {
  load: () => Promise<LoadedModuleResult>;
  unload: () => Promise<boolean>;
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  error: Error | null;
  progress: number;
  loadState: ModuleLoadState | null;
}

/**
 * React hook for lazy loading a module
 */
export function useLazyModule(
  moduleId: string,
  options: UseLazyModuleOptions = {}
): UseLazyModuleResult {
  const { 
    preload = false, 
    preloadDelay = 2000,
    onSuccess, 
    onError,
    ...loadOptions 
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => moduleLoader.isLoaded(moduleId));
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(() => moduleLoader.getProgress(moduleId));
  const [loadState, setLoadState] = useState<ModuleLoadState | null>(
    () => moduleLoader.getLoadState(moduleId) || null
  );
  
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Update state from loader
  const updateState = useCallback(() => {
    if (!isMounted.current) return;
    
    const state = moduleLoader.getLoadState(moduleId);
    setLoadState(state || null);
    setIsLoaded(moduleLoader.isLoaded(moduleId));
    setProgress(moduleLoader.getProgress(moduleId));
    
    if (state) {
      setIsError(state.status === 'error');
      setError(state.error || null);
    }
  }, [moduleId]);

  // Load module
  const load = useCallback(async (): Promise<LoadedModuleResult> => {
    if (isLoading || isLoaded) {
      return {
        moduleId,
        metadata: moduleLoader.getLoadState(moduleId)?.metadata || {} as any,
        success: isLoaded,
        loadTime: 0
      };
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await moduleLoader.load(moduleId, loadOptions);
      
      if (isMounted.current) {
        updateState();
        if (result.success) {
          onSuccess?.(result);
        } else if (result.error) {
          setIsError(true);
          setError(result.error);
          onError?.(result.error);
        }
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (isMounted.current) {
        setIsError(true);
        setError(error);
        onError?.(error);
      }
      return {
        moduleId,
        metadata: {} as any,
        success: false,
        error,
        loadTime: 0
      };
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [moduleId, isLoading, isLoaded, loadOptions, onSuccess, onError, updateState]);

  // Unload module
  const unload = useCallback(async (): Promise<boolean> => {
    const success = await moduleLoader.unload(moduleId);
    if (isMounted.current) {
      updateState();
    }
    return success;
  }, [moduleId, updateState]);

  // Subscribe to loader events
  useEffect(() => {
    const handleLoading = (e: { moduleId: string }) => {
      if (e.moduleId === moduleId) {
        setIsLoading(true);
        updateState();
      }
    };

    const handleLoaded = (e: { moduleId: string }) => {
      if (e.moduleId === moduleId) {
        setIsLoading(false);
        setIsLoaded(true);
        updateState();
      }
    };

    const handleError = (e: { moduleId: string; error: Error }) => {
      if (e.moduleId === moduleId) {
        setIsLoading(false);
        setIsError(true);
        setError(e.error);
        updateState();
      }
    };

    const handleProgress = (e: { moduleId: string; progress: number }) => {
      if (e.moduleId === moduleId) {
        setProgress(e.progress);
      }
    };

    moduleLoader.on(moduleLoader.constructor.name + ':loading', handleLoading);
    moduleLoader.on('module:loading', handleLoading);
    moduleLoader.on('module:loaded', handleLoaded);
    moduleLoader.on('module:error', handleError);
    moduleLoader.on('module:progress', handleProgress);

    return () => {
      moduleLoader.off('module:loading', handleLoading);
      moduleLoader.off('module:loaded', handleLoaded);
      moduleLoader.off('module:error', handleError);
      moduleLoader.off('module:progress', handleProgress);
    };
  }, [moduleId, updateState]);

  // Preload after delay
  useEffect(() => {
    if (preload && !isLoaded && !isLoading) {
      preloadTimeoutRef.current = setTimeout(() => {
        moduleLoader.preload(moduleId);
      }, preloadDelay);
    }

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [preload, preloadDelay, moduleId, isLoaded, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    load,
    unload,
    isLoading,
    isLoaded,
    isError,
    error,
    progress,
    loadState
  };
}

export interface UseLazyModulesOptions extends LoadModuleOptions {
  parallel?: boolean;
  onAllSuccess?: () => void;
  onAnyError?: (errors: Error[]) => void;
}

export interface UseLazyModulesResult {
  load: () => Promise<LoadedModuleResult[]>;
  unloadAll: () => Promise<void>;
  isLoading: boolean;
  allLoaded: boolean;
  hasErrors: boolean;
  errors: Error[];
  results: LoadedModuleResult[];
  progress: number;
}

/**
 * React hook for lazy loading multiple modules
 */
export function useLazyModules(
  moduleIds: string[],
  options: UseLazyModulesOptions = {}
): UseLazyModulesResult {
  const { parallel = true, onAllSuccess, onAnyError, ...loadOptions } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [errors, setErrors] = useState<Error[]>([]);
  const [results, setResults] = useState<LoadedModuleResult[]>([]);
  const [progress, setProgress] = useState(0);

  // Calculate overall progress
  useEffect(() => {
    if (moduleIds.length === 0) {
      setProgress(100);
      return;
    }

    const totalProgress = moduleIds.reduce(
      (sum, id) => sum + moduleLoader.getProgress(id),
      0
    );
    setProgress(Math.round(totalProgress / moduleIds.length));
  }, [moduleIds, isLoading]);

  // Load all modules
  const load = useCallback(async (): Promise<LoadedModuleResult[]> => {
    if (isLoading) return results;

    setIsLoading(true);
    setAllLoaded(false);
    setHasErrors(false);
    setErrors([]);

    let loadResults: LoadedModuleResult[];

    try {
      if (parallel) {
        loadResults = await moduleLoader.loadBatch(moduleIds, loadOptions);
      } else {
        loadResults = await moduleLoader.loadOrdered(moduleIds, loadOptions);
      }

      setResults(loadResults);

      const failed = loadResults.filter(r => !r.success);
      const errorList = failed.map(r => r.error).filter(Boolean) as Error[];

      if (errorList.length > 0) {
        setHasErrors(true);
        setErrors(errorList);
        onAnyError?.(errorList);
      } else {
        setAllLoaded(true);
        onAllSuccess?.();
      }

      return loadResults;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setHasErrors(true);
      setErrors([error]);
      onAnyError?.([error]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [moduleIds, parallel, loadOptions, isLoading, results, onAllSuccess, onAnyError]);

  // Unload all modules
  const unloadAll = useCallback(async (): Promise<void> => {
    for (const moduleId of moduleIds) {
      await moduleLoader.unload(moduleId);
    }
    setAllLoaded(false);
    setResults([]);
  }, [moduleIds]);

  return {
    load,
    unloadAll,
    isLoading,
    allLoaded,
    hasErrors,
    errors,
    results,
    progress
  };
}

export interface UseModuleChunkOptions {
  autoLoad?: boolean;
}

export interface UseModuleChunkResult {
  isLoaded: boolean;
  progress: number;
  loadChunk: (chunkId: string) => Promise<boolean>;
  loadModuleChunks: () => Promise<boolean>;
}

/**
 * React hook for managing module chunks
 */
export function useModuleChunks(
  moduleId: string,
  options: UseModuleChunkOptions = {}
): UseModuleChunkResult {
  const { autoLoad = false } = options;
  const [isLoaded, setIsLoaded] = useState(() => 
    moduleBundler.isModuleLoaded(moduleId)
  );
  const [progress, setProgress] = useState(() => 
    moduleBundler.getModuleProgress(moduleId)
  );

  // Auto-load chunks
  useEffect(() => {
    if (autoLoad && !isLoaded) {
      moduleBundler.loadModuleChunks(moduleId).then(() => {
        setIsLoaded(true);
      });
    }
  }, [autoLoad, moduleId, isLoaded]);

  // Subscribe to progress updates
  useEffect(() => {
    const handleProgress = () => {
      setProgress(moduleBundler.getModuleProgress(moduleId));
      setIsLoaded(moduleBundler.isModuleLoaded(moduleId));
    };

    moduleBundler.on('chunk:loaded', handleProgress);
    moduleBundler.on('chunk:error', handleProgress);

    return () => {
      moduleBundler.off('chunk:loaded', handleProgress);
      moduleBundler.off('chunk:error', handleProgress);
    };
  }, [moduleId]);

  const loadChunk = useCallback(async (chunkId: string): Promise<boolean> => {
    const result = await moduleBundler.loadChunk(chunkId);
    setIsLoaded(moduleBundler.isModuleLoaded(moduleId));
    return result.success;
  }, [moduleId]);

  const loadModuleChunks = useCallback(async (): Promise<boolean> => {
    const results = await moduleBundler.loadModuleChunks(moduleId);
    const allSuccess = results.every(r => r.success);
    setIsLoaded(allSuccess);
    return allSuccess;
  }, [moduleId]);

  return {
    isLoaded,
    progress,
    loadChunk,
    loadModuleChunks
  };
}
