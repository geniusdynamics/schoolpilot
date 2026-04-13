/**
 * useFrappeDocList Hook
 * 
 * Fetch and manage a list of Frappe documents with filtering, sorting, and pagination.
 */

import { useState, useEffect, useCallback } from 'react';
import { useFrappeProvider } from './useFrappeProvider';

export interface UseFrappeDocListOptions {
  doctype: string;
  fields?: string[];
  filters?: any[];
  limit?: number;
  offset?: number;
  orderBy?: { field: string; order: 'asc' | 'desc' };
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseFrappeDocListResult<T = any> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Hook to fetch and manage a list of Frappe documents
 */
export function useFrappeDocList<T = any>(
  options: UseFrappeDocListOptions
): UseFrappeDocListResult<T> {
  const {
    doctype,
    fields = ['*'],
    filters = [],
    limit = 100,
    offset: initialOffset = 0,
    orderBy,
    enabled = true,
    refetchInterval,
  } = options;
  
  const { client, isActive } = useFrappeProvider();
  
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  
  const fetchDocs = useCallback(async (append = false) => {
    if (!client || !isActive || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const docs = await client.db.getDocList(doctype, {
        fields,
        filters,
        limit,
        offset: append ? offset : initialOffset,
        orderBy,
      });
      
      if (append) {
        setData(prev => [...prev, ...(docs as T[])]);
      } else {
        setData(docs as T[]);
      }
      
      setHasMore(docs.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [client, isActive, enabled, doctype, fields, filters, limit, offset, initialOffset, orderBy]);
  
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    
    const newOffset = offset + limit;
    setOffset(newOffset);
    await fetchDocs(true);
  }, [hasMore, isLoading, offset, limit, fetchDocs]);
  
  const refetch = useCallback(async () => {
    setOffset(initialOffset);
    await fetchDocs(false);
  }, [initialOffset, fetchDocs]);
  
  // Initial fetch
  useEffect(() => {
    fetchDocs(false);
  }, [fetchDocs]);
  
  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;
    
    const interval = setInterval(() => fetchDocs(false), refetchInterval);
    return () => clearInterval(interval);
  }, [fetchDocs, refetchInterval]);
  
  return {
    data,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}
