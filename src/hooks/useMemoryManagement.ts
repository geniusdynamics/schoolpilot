// ABOUTME: React hook for memory management integration
// ABOUTME: Provides component-level memory tracking and optimization

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { memoryManager, MemoryAlert, MemoryReport } from '../services/memoryManager';

interface UseMemoryManagementOptions {
  componentName: string;
  trackLifecycle?: boolean;
  enableAlerts?: boolean;
  cachePrefix?: string;
}

interface MemoryManagementHookReturn {
  memoryReport: MemoryReport | null;
  activeAlerts: MemoryAlert[];
  cacheValue: <T>(key: string, value: T, ttl?: number) => void;
  getCachedValue: <T>(key: string) => T | null;
  clearComponentCache: () => void;
  forceCleanup: () => void;
  isMemoryHigh: boolean;
  memoryUsagePercent: number;
}

export const useMemoryManagement = (
  options: UseMemoryManagementOptions
): MemoryManagementHookReturn => {
  const {
    componentName,
    trackLifecycle = true,
    enableAlerts = true,
    cachePrefix = ''
  } = options;

  const [memoryReport, setMemoryReport] = useState<MemoryReport | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<MemoryAlert[]>([]);
  const componentIdRef = useRef<string | null>(null);
  const cacheKeysRef = useRef<Set<string>>(new Set());

  // Track component lifecycle
  useEffect(() => {
    if (trackLifecycle) {
      componentIdRef.current = memoryManager.trackComponentMount(componentName);
      
      return () => {
        if (componentIdRef.current) {
          memoryManager.trackComponentUnmount(componentName);
        }
      };
    }
  }, [componentName, trackLifecycle]);

  // Listen for memory alerts
  useEffect(() => {
    if (!enableAlerts) return;

    const handleMemoryAlert = (event: CustomEvent<MemoryAlert>) => {
      setActiveAlerts(prev => [...prev, event.detail]);
    };

    window.addEventListener('memoryAlert', handleMemoryAlert as EventListener);
    
    return () => {
      window.removeEventListener('memoryAlert', handleMemoryAlert as EventListener);
    };
  }, [enableAlerts]);

  // Update memory report periodically with smart throttling
  useEffect(() => {
    let isActive = true;
    
    const updateReport = () => {
      if (!isActive) return;
      
      try {
        const report = memoryManager.getMemoryReport();
        setMemoryReport(prevReport => {
          // Only update if there are meaningful changes
          if (!prevReport || 
              Math.abs(report.currentUsage.usedJSHeapSize - prevReport.currentUsage.usedJSHeapSize) > 1024 * 1024 || // 1MB change
              report.alerts.length !== prevReport.alerts.length) {
            return report;
          }
          return prevReport;
        });
        setActiveAlerts(report.alerts);
      } catch (error) {
        console.warn('Error updating memory report:', error);
      }
    };

    updateReport(); // Initial update
    
    // Use longer interval and only update when component is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateReport();
      }
    }, 60000); // Update every 60 seconds when visible

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  // Cache management with component prefix
  const cacheValue = useCallback(<T>(key: string, value: T, ttl?: number) => {
    const fullKey = cachePrefix ? `${cachePrefix}:${key}` : `${componentName}:${key}`;
    cacheKeysRef.current.add(fullKey);
    memoryManager.setCache(fullKey, value, ttl);
  }, [componentName, cachePrefix]);

  const getCachedValue = useCallback(<T>(key: string): T | null => {
    const fullKey = cachePrefix ? `${cachePrefix}:${key}` : `${componentName}:${key}`;
    return memoryManager.getCache<T>(fullKey);
  }, [componentName, cachePrefix]);

  // Clear all cache entries created by this component
  const clearComponentCache = useCallback(() => {
    cacheKeysRef.current.forEach(key => {
      memoryManager.getCache(key); // This will remove expired entries
    });
    cacheKeysRef.current.clear();
  }, []);

  // Force memory cleanup
  const forceCleanup = useCallback(() => {
    clearComponentCache();
    // Trigger global cleanup
    memoryManager.getMemoryReport(); // This triggers internal cleanup checks
  }, [clearComponentCache]);

  // Calculate memory usage metrics
  const currentUsage = memoryReport?.currentUsage;
  const isMemoryHigh = currentUsage ? 
    (currentUsage.usedJSHeapSize / currentUsage.jsHeapSizeLimit) > 0.7 : false;
  const memoryUsagePercent = currentUsage ? 
    (currentUsage.usedJSHeapSize / currentUsage.jsHeapSizeLimit) * 100 : 0;

  return {
    memoryReport,
    activeAlerts,
    cacheValue,
    getCachedValue,
    clearComponentCache,
    forceCleanup,
    isMemoryHigh,
    memoryUsagePercent
  };
};

// Hook for automatic component cleanup
export const useComponentCleanup = (componentName: string) => {
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  const addCleanupFunction = useCallback((cleanupFn: () => void) => {
    cleanupFunctionsRef.current.push(cleanupFn);
  }, []);

  const removeCleanupFunction = useCallback((cleanupFn: () => void) => {
    const index = cleanupFunctionsRef.current.indexOf(cleanupFn);
    if (index > -1) {
      cleanupFunctionsRef.current.splice(index, 1);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`Cleanup function failed for ${componentName}:`, error);
        }
      });
      cleanupFunctionsRef.current = [];
    };
  }, [componentName]);

  return {
    addCleanupFunction,
    removeCleanupFunction
  };
};

// Hook for optimized data caching with memory awareness
export const useMemoryAwareCache = <T>(
  componentName: string,
  maxCacheSize: number = 10
) => {
  const cacheRef = useRef<Map<string, { data: T; timestamp: number; accessCount: number }>>(new Map());
  const { isMemoryHigh } = useMemoryManagement({ componentName, trackLifecycle: false });

  const setCache = useCallback((key: string, data: T) => {
    // If memory is high, be more aggressive about cache cleanup
    const maxSize = isMemoryHigh ? Math.floor(maxCacheSize / 2) : maxCacheSize;
    
    if (cacheRef.current.size >= maxSize) {
      // Remove least recently used item
      let oldestKey = '';
      let oldestTime = Date.now();
      
      cacheRef.current.forEach((value, key) => {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      });
      
      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
      }
    }
    
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }, [isMemoryHigh, maxCacheSize]);

  const getCache = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (entry) {
      entry.accessCount++;
      entry.timestamp = Date.now(); // Update access time
      return entry.data;
    }
    return null;
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      maxSize: isMemoryHigh ? Math.floor(maxCacheSize / 2) : maxCacheSize,
      entries: Array.from(cacheRef.current.entries()).map(([key, value]) => ({
        key,
        accessCount: value.accessCount,
        age: Date.now() - value.timestamp
      }))
    };
  }, [isMemoryHigh, maxCacheSize]);

  // Clear cache when memory is high
  useEffect(() => {
    if (isMemoryHigh && cacheRef.current.size > 0) {
      // Clear half the cache when memory is high
      const entries = Array.from(cacheRef.current.entries());
      const toRemove = Math.ceil(entries.length / 2);
      
      // Sort by access count and timestamp, remove least used
      entries
        .sort((a, b) => a[1].accessCount - b[1].accessCount || a[1].timestamp - b[1].timestamp)
        .slice(0, toRemove)
        .forEach(([key]) => cacheRef.current.delete(key));
    }
  }, [isMemoryHigh]);

  return {
    setCache,
    getCache,
    clearCache,
    getCacheStats,
    isMemoryHigh
  };
};

export default useMemoryManagement;