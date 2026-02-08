/**
 * Async Hook
 * 
 * Handle async operations with loading and error states.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for async operations
 * 
 * @example
 * ```tsx
 * const { execute, data, loading, error } = useAsync(fetchUser);
 * 
 * useEffect(() => {
 *   execute(userId);
 * }, [userId]);
 * ```
 */
export function useAsync<T, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await asyncFunction(...args);
        
        if (isMounted.current) {
          setState({ data, loading: false, error: null });
          options.onSuccess?.(data);
        }

        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        if (isMounted.current) {
          setState({ data: null, loading: false, error: err });
          options.onError?.(err);
        }

        throw err;
      }
    },
    [asyncFunction, options.onSuccess, options.onError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export default useAsync;
