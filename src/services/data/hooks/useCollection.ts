/**
 * useCollection Hook
 * 
 * React hook for querying collections from the unified data service.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { uds } from '../UnifiedDataService';
import type { Query, PaginatedResult } from '../types';

interface UseCollectionOptions<T> {
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  
  /** Enable real-time updates (if provider supports) */
  realtime?: boolean;
  
  /** Initial data to prevent loading flash */
  initialData?: T[];
}

interface UseCollectionReturn<T> {
  /** Query results */
  data: T[];
  
  /** Loading state */
  loading: boolean;
  
  /** Error if any */
  error: Error | null;
  
  /** Pagination info */
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null;
  
  /** Refresh data manually */
  refresh: () => Promise<void>;
  
  /** Go to next page */
  nextPage: () => void;
  
  /** Go to previous page */
  previousPage: () => void;
  
  /** Go to specific page */
  goToPage: (page: number) => void;
  
  /** Change page size */
  setPageSize: (size: number) => void;
}

export function useCollection<T>(
  collection: string,
  query: Query = {},
  options: UseCollectionOptions<T> = {}
): UseCollectionReturn<T> {
  const { refreshInterval = 0, realtime = false } = options;
  
  const [data, setData] = useState<T[]>(options.initialData || []);
  const [loading, setLoading] = useState(!options.initialData);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<UseCollectionReturn<T>['pagination']>(null);
  const [page, setPage] = useState(query.pagination?.page || 1);
  const [pageSize, setPageSize] = useState(query.pagination?.pageSize || 50);
  
  const subscriptionRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  
  // Fetch data
  const fetch = useCallback(async () => {
    if (!uds.isReady) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const fullQuery: Query = {
        ...query,
        pagination: { page, pageSize }
      };
      
      const result = await uds.find<T>(collection, fullQuery);
      
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [collection, query, page, pageSize]);
  
  // Initial fetch and subscription
  useEffect(() => {
    fetch();
    
    // Set up real-time subscription if enabled
    if (realtime && uds.isReady) {
      const fullQuery: Query = {
        ...query,
        pagination: { page, pageSize }
      };
      
      subscriptionRef.current = uds.subscribe<T>(collection, fullQuery).subscribe({
        next: (records) => setData(records),
        error: (err) => setError(err)
      });
    }
    
    // Set up polling if interval specified
    if (refreshInterval > 0 && !realtime) {
      intervalRef.current = setInterval(fetch, refreshInterval);
    }
    
    return () => {
      subscriptionRef.current?.unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [collection, JSON.stringify(query), page, pageSize, realtime, refreshInterval]);
  
  // Navigation helpers
  const nextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      setPage(p => p + 1);
    }
  }, [pagination?.hasNextPage]);
  
  const previousPage = useCallback(() => {
    if (pagination?.hasPreviousPage) {
      setPage(p => p - 1);
    }
  }, [pagination?.hasPreviousPage]);
  
  const goToPage = useCallback((newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  }, [pagination]);
  
  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
  }, []);
  
  return {
    data,
    loading,
    error,
    pagination,
    refresh: fetch,
    nextPage,
    previousPage,
    goToPage,
    setPageSize: handleSetPageSize
  };
}

export default useCollection;
