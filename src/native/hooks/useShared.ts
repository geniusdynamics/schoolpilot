/**
 * useShared Hook
 * 
 * Hook for accessing shared functionality in platform-agnostic way.
 */

import { storage } from '../adapters/storage';

interface UseSharedResult {
  storage: typeof storage;
  platform: 'web' | 'native';
  isNative: boolean;
  isWeb: boolean;
}

export function useShared(): UseSharedResult {
  const platform: 'web' | 'native' = typeof navigator !== 'undefined' && 
    (navigator as any).product === 'ReactNative' ? 'native' : 'web';

  return {
    storage,
    platform,
    isNative: platform === 'native',
    isWeb: platform === 'web',
  };
}

export default useShared;
