/**
 * useFrappeCall Hook
 * 
 * Call Frappe server-side methods from React components.
 */

import { useState, useCallback } from 'react';
import { useFrappeProvider } from './useFrappeProvider';

export interface UseFrappeCallResult<T = any> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  call: (args?: any) => Promise<T>;
  reset: () => void;
}

/**
 * Hook to call Frappe server-side methods
 */
export function useFrappeCall<T = any>(method: string): UseFrappeCallResult<T> {
  const { client, isActive } = useFrappeProvider();
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const call = useCallback(async (args: any = {}) => {
    if (!client || !isActive) {
      throw new Error('Frappe provider not active');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.call(method, args);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [client, isActive, method]);
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);
  
  return {
    data,
    isLoading,
    error,
    call,
    reset,
  };
}
