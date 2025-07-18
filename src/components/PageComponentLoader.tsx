// ABOUTME: Enhanced page component loader with caching and health monitoring
// ABOUTME: Provides robust loading with fallback strategies and performance tracking

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import PageLoadingIndicator from './PageLoadingIndicator';
import PageErrorBoundary from './PageErrorBoundary';

interface PageComponentCache {
  component: React.ComponentType;
  loadTime: number;
  lastAccessed: Date;
  accessCount: number;
}

interface PageLoadMetrics {
  pageName: string;
  loadTime: number;
  cacheHit: boolean;
  success: boolean;
  error?: string;
  timestamp: Date;
}

class PageComponentManager {
  private cache = new Map<string, PageComponentCache>();
  private loadMetrics: PageLoadMetrics[] = [];
  private maxCacheSize = 20;
  private maxMetricsSize = 100;

  // Cache a loaded component
  cacheComponent(key: string, component: React.ComponentType, loadTime: number) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.findLeastRecentlyUsed();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      component,
      loadTime,
      lastAccessed: new Date(),
      accessCount: 1
    });
  }

  // Get cached component
  getCachedComponent(key: string): React.ComponentType | null {
    const cached = this.cache.get(key);
    if (cached) {
      // Update access info
      cached.lastAccessed = new Date();
      cached.accessCount++;
      return cached.component;
    }
    return null;
  }

  // Record load metrics
  recordMetrics(metrics: PageLoadMetrics) {
    this.loadMetrics.push(metrics);
    
    // Keep metrics array size manageable
    if (this.loadMetrics.length > this.maxMetricsSize) {
      this.loadMetrics = this.loadMetrics.slice(-this.maxMetricsSize);
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const totalLoads = this.loadMetrics.length;
    const successfulLoads = this.loadMetrics.filter(m => m.success).length;
    const cacheHits = this.loadMetrics.filter(m => m.cacheHit).length;
    const averageLoadTime = this.loadMetrics.reduce((sum, m) => sum + m.loadTime, 0) / totalLoads || 0;

    return {
      totalLoads,
      successfulLoads,
      successRate: totalLoads > 0 ? (successfulLoads / totalLoads) * 100 : 0,
      cacheHits,
      cacheHitRate: totalLoads > 0 ? (cacheHits / totalLoads) * 100 : 0,
      averageLoadTime: Math.round(averageLoadTime),
      cacheSize: this.cache.size,
      recentErrors: this.loadMetrics
        .filter(m => !m.success)
        .slice(-5)
        .map(m => ({ pageName: m.pageName, error: m.error, timestamp: m.timestamp }))
    };
  }

  // Find least recently used cache entry
  private findLeastRecentlyUsed(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.lastAccessed.getTime() < oldestTime) {
        oldestTime = cached.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats() {
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      loadTime: cached.loadTime,
      lastAccessed: cached.lastAccessed,
      accessCount: cached.accessCount
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: entries.sort((a, b) => b.accessCount - a.accessCount)
    };
  }
}

// Global page component manager instance
const pageComponentManager = new PageComponentManager();

interface PageComponentLoaderProps {
  pageName: string;
  componentLoader: () => Promise<{ default: React.ComponentType }>;
  fallbackComponent?: React.ComponentType;
  enableCaching?: boolean;
  loadingTimeout?: number;
  retryAttempts?: number;
  onLoadStart?: () => void;
  onLoadComplete?: (loadTime: number, fromCache: boolean) => void;
  onLoadError?: (error: Error) => void;
  className?: string;
}

const PageComponentLoader: React.FC<PageComponentLoaderProps> = ({
  pageName,
  componentLoader,
  fallbackComponent,
  enableCaching = true,
  loadingTimeout = 10000,
  retryAttempts = 2,
  onLoadStart,
  onLoadComplete,
  onLoadError,
  className = ''
}) => {
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState<number>(0);

  const cacheKey = `page:${pageName}`;

  // Memoized component loader with caching
  const LazyComponent = useMemo(() => {
    // Check cache first if caching is enabled
    if (enableCaching) {
      const cachedComponent = pageComponentManager.getCachedComponent(cacheKey);
      if (cachedComponent) {
        // Record cache hit
        pageComponentManager.recordMetrics({
          pageName,
          loadTime: 0,
          cacheHit: true,
          success: true,
          timestamp: new Date()
        });
        
        if (onLoadComplete) {
          onLoadComplete(0, true);
        }
        
        return cachedComponent;
      }
    }

    // Create lazy component
    return React.lazy(async () => {
      const startTime = Date.now();
      setLoadStartTime(startTime);
      setLoadingState('loading');
      
      if (onLoadStart) {
        onLoadStart();
      }

      try {
        const module = await componentLoader();
        const loadTime = Date.now() - startTime;
        
        // Cache the component if caching is enabled
        if (enableCaching) {
          pageComponentManager.cacheComponent(cacheKey, module.default, loadTime);
        }

        // Record successful load
        pageComponentManager.recordMetrics({
          pageName,
          loadTime,
          cacheHit: false,
          success: true,
          timestamp: new Date()
        });

        setLoadingState('loaded');
        
        if (onLoadComplete) {
          onLoadComplete(loadTime, false);
        }

        return module;
      } catch (err) {
        const error = err as Error;
        const loadTime = Date.now() - startTime;
        
        // Record failed load
        pageComponentManager.recordMetrics({
          pageName,
          loadTime,
          cacheHit: false,
          success: false,
          error: error.message,
          timestamp: new Date()
        });

        setLoadingState('error');
        setError(error);
        
        if (onLoadError) {
          onLoadError(error);
        }

        throw error;
      }
    });
  }, [pageName, componentLoader, enableCaching, cacheKey, onLoadStart, onLoadComplete, onLoadError]);

  const handleRetry = useCallback(() => {
    if (retryCount < retryAttempts) {
      setRetryCount(prev => prev + 1);
      setError(null);
      setLoadingState('idle');
      
      // Force component to reload by clearing cache for this page
      if (enableCaching) {
        pageComponentManager.clearCache();
      }
    }
  }, [retryCount, retryAttempts, enableCaching]);

  const handleTimeout = useCallback(() => {
    const timeoutError = new Error(`Page load timeout: ${pageName} took longer than ${loadingTimeout}ms to load`);
    setError(timeoutError);
    setLoadingState('error');
    
    if (onLoadError) {
      onLoadError(timeoutError);
    }
  }, [pageName, loadingTimeout, onLoadError]);

  // Custom loading fallback with timeout handling
  const LoadingFallback = useCallback(() => (
    <PageLoadingIndicator
      pageName={pageName}
      timeout={loadingTimeout}
      onTimeout={handleTimeout}
      onRetry={handleRetry}
      className={className}
    />
  ), [pageName, loadingTimeout, handleTimeout, handleRetry, className]);

  // Custom error fallback
  const ErrorFallback = useCallback(({ error: boundaryError, retry }: { error: Error; retry: () => void }) => {
    const displayError = error || boundaryError;
    
    return (
      <div className="flex items-center justify-center min-h-96 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-red-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Page
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            The <strong>{pageName}</strong> page could not be loaded.
          </p>
          
          <p className="text-sm text-red-600 mb-4">
            {displayError.message}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {retryCount < retryAttempts && (
              <button
                onClick={() => {
                  handleRetry();
                  retry();
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again ({retryAttempts - retryCount} left)
              </button>
            )}
            
            <button
              onClick={() => window.location.hash = '#/dashboard'}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-gray-500">
                Error Details (Dev Mode)
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                {displayError.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }, [error, pageName, retryCount, retryAttempts, handleRetry]);

  return (
    <PageErrorBoundary
      pageName={pageName}
      fallbackComponent={ErrorFallback}
      maxRetries={retryAttempts}
    >
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent />
      </Suspense>
    </PageErrorBoundary>
  );
};

// Export the manager for external access to metrics
export { pageComponentManager };
export default PageComponentLoader;