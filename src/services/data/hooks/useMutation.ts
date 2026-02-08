/**
 * useMutation Hook
 * 
 * React hook for data mutations (create, update, delete).
 */

import { useState, useCallback } from 'react';
import { uds } from '../UnifiedDataService';
import type { WriteOptions } from '../types';

type MutationType = 'create' | 'update' | 'delete';

interface UseMutationOptions {
  /** Show success/error messages */
  showToast?: boolean;
  
  /** Invalidate cache after mutation */
  invalidateCache?: boolean;
}

interface UseMutationReturn<T, V> {
  /** Execute mutation */
  mutate: (variables: V) => Promise<T | null>;
  
  /** Loading state */
  loading: boolean;
  
  /** Error if any */
  error: Error | null;
  
  /** Reset state */
  reset: () => void;
  
  /** Last successful data */
  data: T | null;
}

// Create mutation
export function useCreate<T>(
  collection: string,
  options: UseMutationOptions = {}
): UseMutationReturn<T, Omit<T, 'id'>> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const mutate = useCallback(async (variables: Omit<T, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await uds.create<T>(collection, variables);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [collection]);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);
  
  return { mutate, loading, error, reset, data };
}

// Update mutation
export function useUpdate<T>(
  collection: string,
  options: UseMutationOptions = {}
): UseMutationReturn<T, { id: string; changes: Partial<T> }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const mutate = useCallback(async (variables: { id: string; changes: Partial<T> }) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await uds.update<T>(collection, variables.id, variables.changes);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [collection]);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);
  
  return { mutate, loading, error, reset, data };
}

// Delete mutation
export function useDelete(
  collection: string,
  options: UseMutationOptions = {}
): UseMutationReturn<void, string> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<void | null>(null);
  
  const mutate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await uds.delete(collection, id);
      setData(undefined);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [collection]);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);
  
  return { mutate, loading, error, reset, data };
}

// Generic mutation hook
export function useMutation<T, V>(
  collection: string,
  operation: MutationType
): UseMutationReturn<T, V> {
  switch (operation) {
    case 'create':
      return useCreate<T>(collection) as UseMutationReturn<T, V>;
    case 'update':
      return useUpdate<T>(collection) as UseMutationReturn<T, V>;
    case 'delete':
      return useDelete(collection) as UseMutationReturn<T, V>;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

export default useMutation;
