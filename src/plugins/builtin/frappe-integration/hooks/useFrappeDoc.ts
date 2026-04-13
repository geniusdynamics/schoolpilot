/**
 * useFrappeDoc Hook
 * 
 * Fetch and manage a single Frappe document with real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useFrappeProvider } from './useFrappeProvider';

export interface UseFrappeDocOptions {
  doctype: string;
  name: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseFrappeDocResult<T = any> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  update: (data: Partial<T>) => Promise<void>;
  delete: () => Promise<void>;
}

/**
 * Hook to fetch and manage a single Frappe document
 */
export function useFrappeDoc<T = any>(
  options: UseFrappeDocOptions
): UseFrappeDocResult<T> {
  const { doctype, name, enabled = true, refetchInterval } = options;
  const { client, isActive } = useFrappeProvider();
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchDoc = useCallback(async () => {
    if (!client || !isActive || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const doc = await client.db.getDoc(doctype, name);
      setData(doc as T);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [client, isActive, enabled, doctype, name]);
  
  const update = useCallback(async (updateData: Partial<T>) => {
    if (!client || !isActive) {
      throw new Error('Frappe provider not active');
    }
    
    try {
      const updated = await client.db.updateDoc(doctype, name, updateData);
      setData(updated as T);
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, [client, isActive, doctype, name]);
  
  const deleteDoc = useCallback(async () => {
    if (!client || !isActive) {
      throw new Error('Frappe provider not active');
    }
    
    try {
      await client.db.deleteDoc(doctype, name);
      setData(null);
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, [client, isActive, doctype, name]);
  
  // Initial fetch
  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);
  
  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;
    
    const interval = setInterval(fetchDoc, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchDoc, refetchInterval]);
  
  return {
    data,
    isLoading,
    error,
    refetch: fetchDoc,
    update,
    delete: deleteDoc,
  };
}
