// ABOUTME: Loading fallback component for dynamic module loading scenarios
// ABOUTME: Prevents hook order violations by providing consistent UI during module initialization

import React from 'react';
import { LoaderIcon } from './ui/icons';

interface ModuleLoadingFallbackProps {
  message?: string;
  showSpinner?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ModuleLoadingFallback: React.FC<ModuleLoadingFallbackProps> = ({
  message = 'Loading modules...',
  showSpinner = true,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const containerClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={`flex items-center justify-center ${containerClasses[size]} ${className}`}>
      <div className="flex items-center space-x-2 text-surface-muted-fg">
        {showSpinner && (
          <LoaderIcon className={`${sizeClasses[size]} animate-spin`} />
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

// Skeleton loader for navigation items
export const NavigationSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex items-center space-x-3 p-2">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded flex-1"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton loader for settings menu
export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton loader for sidebar content
export const SidebarSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <NavigationSkeleton count={5} />
      </div>
    </div>
  );
};

export default ModuleLoadingFallback;