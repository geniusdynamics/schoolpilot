// ABOUTME: Fallback UI component for database initialization failures
// ABOUTME: Provides user-friendly interface with recovery options when database fails to initialize

import React, { useState, useEffect } from 'react';

interface DatabaseInitializationFallbackProps {
  error?: Error;
  onRetry?: () => void;
  onReset?: () => void;
  onOfflineMode?: () => void;
  retryCount?: number;
  maxRetries?: number;
  showTechnicalDetails?: boolean;
}

const DatabaseInitializationFallback: React.FC<DatabaseInitializationFallbackProps> = ({
  error,
  onRetry,
  onReset,
  onOfflineMode,
  retryCount = 0,
  maxRetries = 3,
  showTechnicalDetails = false
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [browserInfo, setBrowserInfo] = useState<any>(null);

  useEffect(() => {
    // Collect browser and storage information
    collectSystemInfo();
  }, []);

  const collectSystemInfo = async () => {
    try {
      // Storage information
      const storage: any = {
        indexedDBSupported: 'indexedDB' in window,
        opfsSupported: 'storage' in navigator && 'getDirectory' in navigator.storage,
        webAssemblySupported: 'WebAssembly' in window,
        localStorageAvailable: typeof Storage !== 'undefined'
      };

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          storage.quota = estimate.quota;
          storage.usage = estimate.usage;
          storage.usagePercentage = estimate.quota ? Math.round((estimate.usage! / estimate.quota) * 100) : 0;
        } catch (e) {
          storage.estimateError = e instanceof Error ? e.message : String(e);
        }
      }

      setStorageInfo(storage);

      // Browser information
      setBrowserInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      });
    } catch (e) {
      console.error('Failed to collect system info:', e instanceof Error ? e.message : String(e));
    }
  };

  const handleRetry = async () => {
    if (onRetry && retryCount < maxRetries) {
      setIsRetrying(true);
      try {
        await onRetry();
      } catch (e) {
        console.error('Retry failed:', e);
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleReset = () => {
    if (onReset) {
      if (window.confirm(
        'This will reset all database configuration and may result in data loss. Are you sure you want to continue?'
      )) {
        onReset();
      }
    }
  };

  const handleOfflineMode = () => {
    if (onOfflineMode) {
      onOfflineMode();
    }
  };

  const canRetry = retryCount < maxRetries;
  const isStorageFull = storageInfo?.usagePercentage > 90;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0">
            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="ml-4">
            <h1 className="text-xl font-bold text-gray-900">
              Database Initialization Failed
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              The application database could not be initialized. This may be due to browser compatibility or storage issues.
            </p>
          </div>
        </div>

        {/* Error Information */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
        )}

        {/* Storage Warning */}
        {isStorageFull && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-sm font-medium text-yellow-800">Storage Almost Full</h3>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Your browser storage is {storageInfo?.usagePercentage}% full. This may be preventing database initialization.
            </p>
          </div>
        )}

        {/* System Information */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Browser Support</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>IndexedDB:</span>
                <span className={storageInfo?.indexedDBSupported ? 'text-green-600' : 'text-red-600'}>
                  {storageInfo?.indexedDBSupported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>OPFS:</span>
                <span className={storageInfo?.opfsSupported ? 'text-green-600' : 'text-red-600'}>
                  {storageInfo?.opfsSupported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>WebAssembly:</span>
                <span className={storageInfo?.webAssemblySupported ? 'text-green-600' : 'text-red-600'}>
                  {storageInfo?.webAssemblySupported ? '✓ Supported' : '✗ Not Supported'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Storage Information</h3>
            <div className="space-y-1 text-sm">
              {storageInfo?.quota && (
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span>{storageInfo.usagePercentage}% of available</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Online:</span>
                <span className={browserInfo?.onLine ? 'text-green-600' : 'text-red-600'}>
                  {browserInfo?.onLine ? '✓ Connected' : '✗ Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Actions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Suggested Actions:</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="text-gray-400 mr-2 mt-0.5">1.</span>
              <span>Try refreshing the page or restarting your browser</span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-400 mr-2 mt-0.5">2.</span>
              <span>Clear your browser cache and cookies for this site</span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-400 mr-2 mt-0.5">3.</span>
              <span>Make sure you're using a modern browser (Chrome 90+, Firefox 88+, Safari 14+)</span>
            </div>
            {isStorageFull && (
              <div className="flex items-start">
                <span className="text-gray-400 mr-2 mt-0.5">4.</span>
                <span>Free up browser storage space by clearing data from other websites</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </span>
              ) : (
                `Try Again (${maxRetries - retryCount} left)`
              )}
            </button>
          )}

          {onOfflineMode && (
            <button
              onClick={handleOfflineMode}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Continue in Offline Mode
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            Reset Database
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reload Page
          </button>
        </div>

        {/* Technical Details */}
        {showTechnicalDetails && error && (
          <details className="mt-6">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 mb-2">
              Technical Details
            </summary>
            <div className="p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-40 overflow-y-auto">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              <div className="mb-2">
                <strong>Browser:</strong> {browserInfo?.userAgent}
              </div>
              <div className="mb-2">
                <strong>Platform:</strong> {browserInfo?.platform}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            If this problem persists, please contact technical support with the error details above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseInitializationFallback;