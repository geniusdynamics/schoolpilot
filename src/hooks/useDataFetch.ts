
/**
 * useDataFetch - Proper data fetching hook with stable dependencies
 * 
 * This hook provides a clean abstraction for data fetching that prevents
 * infinite loops by properly managing dependencies and cleanup.
 * 
 * Features:
 * - Automatic cleanup on unmount
 * - Stable dependency management
 * - Loading and error states
 * - Refetch capability
 * - TypeScript support
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseDataFetchOptions<T> extends RequestInit {
  /** Initial data to use before fetch completes */
  initialData?: T;
  /** Skip the fetch (useful for conditional fetching) */
  skip?: boolean;
  /** Transform the response before setting data */
  transform?: (data: any) => T;
  /** Called when fetch succeeds */
  onSuccess?: (data: T) => void;
  /** Called when fetch fails */
  onError?: (error: Error) => void;
}

export interface UseDataFetchResult<T> {
  /** The fetched data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for fetching data with proper dependency management
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { data, loading, error } = useDataFetch<User[]>('/api/users');
 * 
 * // With options
 * const { data, loading, error, refetch } = useDataFetch<Student[]>(
 *   '/api/students',
 *   {
 *     method: 'POST',
 *     body: JSON.stringify({ classId: '123' }),
 *     onSuccess: (students) => logger.info('Loaded', students.length),
 *     transform: (raw) => raw.map(s => ({ ...s, fullName: `${s.firstName} ${s.lastName}` }))
 *   }
 * );
 * 
 * // Conditional fetching
 * const { data } = useDataFetch<User>(`/api/users/${userId}`, {
 *   skip: !userId // Only fetch when userId is available
 * });
 * ```
 */
export function useDataFetch<T>(
  endpoint: string,
  options?: UseDataFetchOptions<T>
): UseDataFetchResult<T> {
  const [data, setData] = useState<T | null>(options?.initialData ?? null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs to store latest callbacks to avoid re-fetching when they change
  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);
  const transformRef = useRef(options?.transform);
  
  // Update refs when callbacks change (doesn't trigger re-fetch)
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
    onErrorRef.current = options?.onError;
    transformRef.current = options?.transform;
  }, [options?.onSuccess, options?.onError, options?.transform]);
  
  // Stable fetch options - only recreate when actual fetch options change
  const fetchOptionsRef = useRef<RequestInit>({});
  useEffect(() => {
    if (options) {
      const { initialData, skip, transform, onSuccess, onError, ...fetchOptions } = options;
      // Only update if fetch options actually changed
      const optionsString = JSON.stringify(fetchOptions);
      const currentString = JSON.stringify(fetchOptionsRef.current);
      if (optionsString !== currentString) {
        fetchOptionsRef.current = fetchOptions;
      }
    }
  }, [options]);
  
  // Main fetch function
  const fetchData = useCallback(async () => {
    if (options?.skip) {
      return;
    }
    
    let cancelled = false;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(endpoint, fetchOptionsRef.current);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const json = await response.json();
      
      if (!cancelled) {
        // Apply transform if provided
        const transformedData = transformRef.current ? transformRef.current(json) : json;
        setData(transformedData);
        setError(null);
        
        // Call success callback if provided
        if (onSuccessRef.current) {
          onSuccessRef.current(transformedData);
        }
      }
    } catch (err) {
      if (!cancelled) {
        const error = err instanceof Error ? err : new Error('Fetch failed');
        setError(error);
        
        // Call error callback if provided
        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
    
    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [endpoint, options?.skip]);
  
  // Fetch on mount and when endpoint or skip changes
  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(fn => fn?.());
      }
    };
  }, [fetchData]);
  
  // Refetch function
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);
  
  // Reset function
  const reset = useCallback(() => {
    setData(options?.initialData ?? null);
    setLoading(false);
    setError(null);
  }, [options?.initialData]);
  
  return {
    data,
    loading,
    error,
    refetch,
    reset,
  };
}

/**
 * Hook for fetching data with query parameters
 * 
 * @example
 * ```tsx
 * const { data, loading } = useDataFetchWithParams<Student[]>(
 *   '/api/students',
 *   { classId: '123', active: true }
 * );
 * // Fetches: /api/students?classId=123&active=true
 * ```
 */
export function useDataFetchWithParams<T>(
  baseEndpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: UseDataFetchOptions<T>
): UseDataFetchResult<T> {
  // Build query string from params
  const queryString = params
    ? '?' + Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    : '';
  
  const endpoint = baseEndpoint + queryString;
  
  return useDataFetch<T>(endpoint, options);
}

/**
 * Hook for posting data and getting a response
 * 
 * @example
 * ```tsx
 * const { mutate, loading, error } = useDataMutation<Student, CreateStudentDto>(
 *   '/api/students'
 * );
 * 
 * const handleSubmit = async (formData: CreateStudentDto) => {
 *   const newStudent = await mutate(formData);
 *   logger.info('Created:', newStudent);
 * };
 * ```
 */
export function useDataMutation<TResponse, TPayload = any>(
  endpoint: string,
  options?: Omit<UseDataFetchOptions<TResponse>, 'skip'>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);
  const transformRef = useRef(options?.transform);
  
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
    onErrorRef.current = options?.onError;
    transformRef.current = options?.transform;
  }, [options?.onSuccess, options?.onError, options?.transform]);
  
  const mutate = useCallback(async (payload: TPayload): Promise<TResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const { initialData, transform, onSuccess, onError, ...fetchOptions } = options || {};
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
        body: JSON.stringify(payload),
        ...fetchOptions,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const json = await response.json();
      const transformedData = transformRef.current ? transformRef.current(json) : json;
      
      if (onSuccessRef.current) {
        onSuccessRef.current(transformedData);
      }
      
      return transformedData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);
  
  return {
    mutate,
    loading,
    error,
  };
}

export default useDataFetch;
