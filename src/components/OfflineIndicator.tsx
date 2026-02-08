/**
 * Offline Indicator
 * 
 * Shows a banner when the app is offline.
 * Automatically hides when connection is restored.
 */

import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showWhenOnline?: boolean;
}

/**
 * Offline Indicator Component
 * 
 * @example
 * ```tsx
 * <OfflineIndicator position="top" />
 * ```
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'top',
  showWhenOnline = false,
}) => {
  const [state] = usePWA();

  if (!state.isOffline && !showWhenOnline) {
    return null;
  }

  return (
    <div
      className={`fixed left-0 right-0 z-50 flex items-center justify-center px-4 py-2 ${
        state.isOffline 
          ? 'bg-destructive text-destructive-foreground' 
          : 'bg-green-500 text-white'
      } ${position === 'top' ? 'top-0' : 'bottom-0'}`}
    >
      <div className="flex items-center gap-2">
        {state.isOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              You are offline. Changes will sync when connection is restored.
            </span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">
              Back online. Syncing changes...
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
