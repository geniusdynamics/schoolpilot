/**
 * Update Notification
 * 
 * Shows a notification when a new version of the app is available.
 * Allows users to update immediately or dismiss.
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/Button';

export interface UpdateNotificationProps {
  position?: 'top' | 'bottom';
}

/**
 * Update Notification Component
 * 
 * @example
 * ```tsx
 * <UpdateNotification position="top" />
 * ```
 */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  position = 'bottom',
}) => {
  const [state, actions] = usePWA();
  const [dismissed, setDismissed] = useState(false);

  // Auto-show when update is available
  useEffect(() => {
    if (state.updateAvailable) {
      setDismissed(false);
    }
  }, [state.updateAvailable]);

  if (!state.updateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = async () => {
    await actions.updateApp();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      className={`fixed left-0 right-0 z-50 flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground shadow-lg ${
        position === 'top' ? 'top-0' : 'bottom-0'
      }`}
    >
      <div className="flex items-center gap-4 max-w-4xl w-full">
        <RefreshCw className="w-5 h-5 animate-spin" />
        
        <div className="flex-1">
          <p className="text-sm font-medium">
            A new version of SchoolPilot is available
          </p>
          <p className="text-xs opacity-90">
            Update now to get the latest features and improvements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpdate}
          >
            Update Now
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:text-primary-foreground/80"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
