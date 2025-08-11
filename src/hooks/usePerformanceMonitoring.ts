// ABOUTME: React hook for performance monitoring integration
// ABOUTME: Provides easy-to-use performance tracking for React components

import { useEffect, useCallback, useRef } from 'react';
import { performanceMonitor, UserInteractionMetric } from '../services/performanceMonitor';

interface UsePerformanceMonitoringOptions {
  componentName: string;
  trackRenders?: boolean;
  trackInteractions?: boolean;
  trackMounts?: boolean;
}

interface PerformanceHookReturn {
  trackUserInteraction: (action: string, metadata?: Record<string, any>) => void;
  trackDataOperation: (operation: string, entity: string, recordCount?: number) => Promise<void>;
  measureAsync: <T>(operation: () => Promise<T>, operationName: string) => Promise<T>;
  startTimer: () => () => number;
}

export const usePerformanceMonitoring = (
  options: UsePerformanceMonitoringOptions
): PerformanceHookReturn => {
  const {
    componentName,
    trackRenders = false,
    trackInteractions = true,
    trackMounts = true
  } = options;

  const mountTimeRef = useRef<number>(performance.now());
  const renderCountRef = useRef<number>(0);

  // Track component mount/unmount
  useEffect(() => {
    if (trackMounts) {
      const mountTime = performance.now() - mountTimeRef.current;
      
      performanceMonitor.recordUserInteraction({
        action: 'component_mount',
        component: componentName,
        duration: mountTime,
        timestamp: new Date(),
        metadata: {
          renderCount: renderCountRef.current
        }
      });

      return () => {
        performanceMonitor.recordUserInteraction({
          action: 'component_unmount',
          component: componentName,
          duration: 0,
          timestamp: new Date(),
          metadata: {
            totalRenders: renderCountRef.current,
            lifespan: performance.now() - mountTimeRef.current
          }
        });
      };
    }
  }, [componentName, trackMounts]);

  // Track renders
  useEffect(() => {
    if (trackRenders) {
      renderCountRef.current += 1;
      
      performanceMonitor.recordUserInteraction({
        action: 'component_render',
        component: componentName,
        duration: 0, // Render time is hard to measure accurately
        timestamp: new Date(),
        metadata: {
          renderNumber: renderCountRef.current
        }
      });
    }
  });

  // Track user interactions
  const trackUserInteraction = useCallback((
    action: string,
    metadata?: Record<string, any>
  ) => {
    if (trackInteractions) {
      performanceMonitor.recordUserInteraction({
        action,
        component: componentName,
        duration: 0, // Will be measured by the caller if needed
        timestamp: new Date(),
        metadata
      });
    }
  }, [componentName, trackInteractions]);

  // Track data operations
  const trackDataOperation = useCallback(async (
    operation: string,
    entity: string,
    recordCount?: number
  ) => {
    const startTime = performance.now();
    
    try {
      // This is a tracking function, so we don't actually perform the operation
      // The caller should perform the operation and then call this to track it
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordDataOperation({
        operation: operation as any,
        entity,
        duration,
        success: true,
        timestamp: new Date(),
        recordCount
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordDataOperation({
        operation: operation as any,
        entity,
        duration,
        success: false,
        timestamp: new Date(),
        recordCount
      });
      
      throw error;
    }
  }, []);

  // Measure async operations
  const measureAsync = useCallback(<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    return performanceMonitor.measureAsync(
      operation,
      'interaction',
      {
        component: componentName,
        operation: operationName
      }
    );
  }, [componentName]);

  // Start a timer for manual duration tracking
  const startTimer = useCallback(() => {
    const startTime = performance.now();
    return () => performance.now() - startTime;
  }, []);

  return {
    trackUserInteraction,
    trackDataOperation,
    measureAsync,
    startTimer
  };
};

// Hook for tracking specific user interactions with automatic timing
export const useInteractionTracking = (componentName: string) => {
  const { trackUserInteraction, startTimer } = usePerformanceMonitoring({
    componentName,
    trackRenders: false,
    trackMounts: false
  });

  const trackClick = useCallback((elementId: string, metadata?: Record<string, any>) => {
    trackUserInteraction('click', { elementId, ...metadata });
  }, [trackUserInteraction]);

  const trackFormSubmit = useCallback((formId: string, metadata?: Record<string, any>) => {
    trackUserInteraction('form_submit', { formId, ...metadata });
  }, [trackUserInteraction]);

  const trackNavigation = useCallback((from: string, to: string, metadata?: Record<string, any>) => {
    trackUserInteraction('navigation', { from, to, ...metadata });
  }, [trackUserInteraction]);

  const trackSearch = useCallback((query: string, resultsCount?: number, metadata?: Record<string, any>) => {
    trackUserInteraction('search', { query, resultsCount, ...metadata });
  }, [trackUserInteraction]);

  const trackTimedAction = useCallback((
    action: string,
    operation: () => void | Promise<void>,
    metadata?: Record<string, any>
  ) => {
    const timer = startTimer();
    
    const finish = () => {
      const duration = timer();
      trackUserInteraction(action, { duration, ...metadata });
    };

    try {
      const result = operation();
      if (result instanceof Promise) {
        return result.then(
          (value) => {
            finish();
            return value;
          },
          (error) => {
            finish();
            throw error;
          }
        );
      } else {
        finish();
        return result;
      }
    } catch (error) {
      finish();
      throw error;
    }
  }, [startTimer, trackUserInteraction]);

  return {
    trackClick,
    trackFormSubmit,
    trackNavigation,
    trackSearch,
    trackTimedAction,
    trackUserInteraction,
    startTimer
  };
};

// Hook for tracking data operations
export const useDataOperationTracking = (componentName: string) => {
  const { trackDataOperation } = usePerformanceMonitoring({
    componentName,
    trackRenders: false,
    trackMounts: false
  });

  const trackCRUDOperation = useCallback(async <T>(
    operation: 'create' | 'read' | 'update' | 'delete',
    entity: string,
    asyncOperation: () => Promise<T>,
    recordCount?: number
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await asyncOperation();
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordDataOperation({
        operation,
        entity,
        duration,
        success: true,
        timestamp: new Date(),
        recordCount
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordDataOperation({
        operation,
        entity,
        duration,
        success: false,
        timestamp: new Date(),
        recordCount
      });
      
      throw error;
    }
  }, []);

  const trackSyncOperation = useCallback(async <T>(
    entity: string,
    asyncOperation: () => Promise<T>,
    recordCount?: number
  ): Promise<T> => {
    return trackCRUDOperation('sync' as any, entity, asyncOperation, recordCount);
  }, [trackCRUDOperation]);

  return {
    trackCRUDOperation,
    trackSyncOperation,
    trackDataOperation
  };
};

export default usePerformanceMonitoring;