/**
 * useDocument Hook
 * 
 * React hook for working with a single document.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { uds } from '../UnifiedDataService';

interface UseDocumentOptions<T> {
  /** Enable real-time updates */
  realtime?: boolean;
  
  /** Initial data */
  initialData?: T;
}

interface UseDocumentReturn<T> {
  /** Document data */
  data: T | null;
  
  /** Loading state */
  loading: boolean;
  
  /** Error if any */
  error: Error | null;
  
  /** Update the document */
  update: (changes: Partial<T>) => Promise<T | null>;
  
  /** Delete the document */
  remove: () => Promise<void>;
  
  /** Refresh data */
  refresh: () => Promise<void>;
  
  /** Whether document exists */
  exists: boolean;
}

export function useDocument<T>(
  collection: string,
  id: string | undefined,
  options: UseDocumentOptions<T> = {}
): UseDocumentReturn<T> {
  const { realtime = false } = options;
  
  const [data, setData] = useState<T | null>(options.initialData || null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);
  
  const subscriptionRef = useRef<any>(null);
  
  // Fetch document
  const fetch = useCallback(async () => {
    if (!id || !uds.isReady) {
      setData(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await uds.findOne<T>(collection, id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [collection, id]);
  
  // Initial fetch and subscription
  useEffect(() => {
    fetch();
    
    if (id && realtime && uds.isReady) {
      subscriptionRef.current = uds.subscribeOne<T>(collection, id).subscribe({
        next: (doc) => setData(doc),
        error: (err) => setError(err)
      });
    }
    
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [collection, id, realtime, fetch]);
  
  // Update document
  const update = useCallback(async (changes: Partial<T>): Promise<T | null> => {
    if (!id) throw new Error('Cannot update without ID');
    
    try {
      const updated = await uds.update<T>(collection, id, changes);
      setData(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [collection, id]);
  
  // Delete document
  const remove = useCallback(async (): Promise<void> => {
    if (!id) throw new Error('Cannot delete without ID');
    
    try {
      await uds.delete(collection, id);
      setData(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [collection, id]);
  
  return {
    data,
    loading,
    error,
    update,
    remove,
    refresh: fetch,
    exists: !!data
  };
}

export default useDocument;
