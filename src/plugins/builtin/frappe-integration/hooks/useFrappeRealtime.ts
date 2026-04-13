/**
 * useFrappeRealtime Hook
 * 
 * Subscribe to real-time document updates via Socket.IO.
 */

import { useEffect, useCallback } from 'react';
import { useFrappeProvider } from './useFrappeProvider';

export interface UseFrappeRealtimeOptions {
  doctype: string;
  docname: string;
  onUpdate?: (data: any) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time document updates
 */
export function useFrappeRealtime(options: UseFrappeRealtimeOptions): void {
  const { doctype, docname, onUpdate, enabled = true } = options;
  const { client, isActive } = useFrappeProvider();
  
  const handleUpdate = useCallback((data: any) => {
    if (onUpdate) {
      onUpdate(data);
    }
  }, [onUpdate]);
  
  useEffect(() => {
    if (!client || !isActive || !enabled) return;
    
    const realtime = client.realtime;
    if (!realtime) {
      console.warn('[useFrappeRealtime] Socket.IO not enabled');
      return;
    }
    
    // Subscribe to document updates
    realtime.subscribeToDoc(doctype, docname, handleUpdate);
    
    // Cleanup
    return () => {
      realtime.unsubscribeFromDoc(doctype, docname);
    };
  }, [client, isActive, enabled, doctype, docname, handleUpdate]);
}
