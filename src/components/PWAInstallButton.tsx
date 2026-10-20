/**
 * PWA Install Button
 * 
 * Button component that prompts users to install the PWA.
 * Only shows when the app is installable.
 */

import React from 'react';
import {
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/Button';

export interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  onInstall?: (success: boolean) => void;
}

/**
 * PWA Install Button Component
 * 
 * @example
 * ```tsx
 * <PWAInstallButton variant="outline" size="sm">
 *   Install App
 * </PWAInstallButton>
 * ```
 */
export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'outline',
  size = 'default',
  className,
  children,
  onInstall,
}) => {
  const [state, actions] = usePWA();

  // Don't show if already installed or not installable
  if (state.isInstalled || !state.isInstallable) {
    return null;
  }

  const handleClick = async () => {
    const success = await actions.promptInstall();
    onInstall?.(success);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      title="Install SchoolPilot as an app"
    >
      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
      {children || 'Install App'}
    </Button>
  );
};

export default PWAInstallButton;
