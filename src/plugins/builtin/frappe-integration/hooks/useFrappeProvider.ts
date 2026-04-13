/**
 * useFrappeProvider Hook
 * 
 * Access the Frappe provider and SDK client from React components.
 */

import { useMemo } from 'react';
import { useBackendProvider } from '@/hooks/useBackendProvider';
import type { FrappeProvider } from '../FrappeProvider';
import type { FrappeSDKClient } from '../FrappeSDKClient';

export interface UseFrappeProviderResult {
  provider: FrappeProvider | null;
  client: FrappeSDKClient | null;
  isActive: boolean;
  isConnected: boolean;
}

/**
 * Hook to access the Frappe provider and SDK client
 */
export function useFrappeProvider(): UseFrappeProviderResult {
  const { activeProvider, isConnected } = useBackendProvider();
  
  const result = useMemo(() => {
    const isFrappe = activeProvider?.type === 'frappe';
    const provider = isFrappe ? (activeProvider as FrappeProvider) : null;
    const client = provider?.getSDKClient() || null;
    
    return {
      provider,
      client,
      isActive: isFrappe,
      isConnected: isFrappe && isConnected,
    };
  }, [activeProvider, isConnected]);
  
  return result;
}
