// ABOUTME: Enhanced page loading indicator with progress feedback and error recovery
// ABOUTME: Provides visual feedback during page transitions and component loading

import React, { useState, useEffect } from 'react';
import Spinner from './ui/Spinner';
import { RefreshCwIcon, AlertCircleIcon } from './ui/icons';

interface PageLoadingIndicatorProps {
  pageName?: string;
  showProgress?: boolean;
  timeout?: number;
  onTimeout?: () => void;
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPageName?: boolean;
}

const PageLoadingIndicator: React.FC<PageLoadingIndicatorProps> = ({
  pageName,
  showProgress = true,
  timeout = 10000, // 10 seconds default timeout
  onTimeout,
  onRetry,
  className = '',
  size = 'md',
  showPageName = true
}) => {
  const [progress, setProgress] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [startTime] = useState(Date.now());

  // Simulate loading progress
  useEffect(() => {
    if (isTimedOut) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        // Slow down progress as it approaches 100%
        const increment = prev < 50 ? 10 : prev < 80 ? 5 : 2;
        return Math.min(prev + increment, 95); // Never reach 100% until actually loaded
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isTimedOut]);

  // Handle timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isTimedOut) {
        setIsTimedOut(true);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [timeout, onTimeout, isTimedOut]);

  const handleRetry = () => {
    setIsTimedOut(false);
    setProgress(0);
    if (onRetry) {
      onRetry();
    }
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const spinnerSizes = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const
  };

  if (isTimedOut) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className={`bg-surface-card rounded-lg shadow-sm border border-orange-200 text-center ${sizeClasses[size]}`}>
          <div className="text-orange-500 mb-4">
            <AlertCircleIcon className="w-8 h-8 mx-auto" />
          </div>
          
          <h3 className="text-lg font-semibold text-surface-foreground mb-2">
            Loading Timeout
          </h3>
          
          <p className="text-sm text-surface-muted-fg mb-4">
            {showPageName && pageName 
              ? `The ${pageName} page is taking longer than expected to load.`
              : 'The page is taking longer than expected to load.'
            }
          </p>
          
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Try Again
          </button>
          
          <p className="text-xs text-surface-muted-fg mt-3">
            Loading time: {Math.round((Date.now() - startTime) / 1000)}s
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center min-h-96 ${className}`}>
      <div className={`text-center ${sizeClasses[size]}`}>
        <div className="mb-4">
          <Spinner size={spinnerSizes[size]} />
        </div>
        
        {showPageName && pageName && (
          <h3 className="text-lg font-medium text-surface-foreground mb-2">
            Loading {pageName}
          </h3>
        )}
        
        <p className="text-sm text-surface-muted-fg mb-4">
          Please wait while the page loads...
        </p>
        
        {showProgress && (
          <div className="w-full max-w-xs mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-muted-fg">Progress</span>
              <span className="text-xs font-medium text-primary-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 bg-primary-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        <p className="text-xs text-surface-muted-fg mt-3">
          Loading time: {Math.round((Date.now() - startTime) / 1000)}s
        </p>
      </div>
    </div>
  );
};

export default PageLoadingIndicator;