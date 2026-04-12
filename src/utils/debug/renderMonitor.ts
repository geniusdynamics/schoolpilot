/**
 * Render Monitor - Development Debug Utility
 * 
 * Helps identify components that re-render excessively, which may indicate
 * infinite loops or performance issues.
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useRenderCount('MyComponent');
 *   // ... rest of component
 * }
 * ```
 */

import { useRef, useEffect } from 'react';

interface RenderStats {
  count: number;
  lastRenderTime: number;
  renderTimes: number[];
}

const renderStats = new Map<string, RenderStats>();

/**
 * Hook to monitor component render count
 * Logs a warning if component renders more than threshold times
 * 
 * @param componentName - Name of the component for logging
 * @param threshold - Number of renders before warning (default: 10)
 * @param logEveryRender - Log every render (default: false)
 */
export function useRenderCount(
  componentName: string,
  threshold: number = 10,
  logEveryRender: boolean = false
): void {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') return;
  
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());
  
  renderCount.current++;
  
  // Update stats
  const now = Date.now();
  const stats = renderStats.get(componentName) || {
    count: 0,
    lastRenderTime: now,
    renderTimes: []
  };
  
  stats.count++;
  stats.renderTimes.push(now - stats.lastRenderTime);
  stats.lastRenderTime = now;
  
  // Keep only last 10 render times
  if (stats.renderTimes.length > 10) {
    stats.renderTimes.shift();
  }
  
  renderStats.set(componentName, stats);
  
  // Log every render if requested
  if (logEveryRender) {
    console.log(`[RenderMonitor] ${componentName} rendered (${renderCount.current} times)`);
  }
  
  // Warn if threshold exceeded
  if (renderCount.current === threshold) {
    const timeSinceMount = now - mountTime.current;
    const avgRenderInterval = stats.renderTimes.reduce((a, b) => a + b, 0) / stats.renderTimes.length;
    
    console.warn(
      `[RenderMonitor] ⚠️ ${componentName} has rendered ${renderCount.current} times!\n` +
      `Time since mount: ${timeSinceMount}ms\n` +
      `Average render interval: ${avgRenderInterval.toFixed(2)}ms\n` +
      `This may indicate an infinite loop or performance issue.`
    );
  }
  
  // Log on unmount
  useEffect(() => {
    return () => {
      const finalCount = renderCount.current;
      const totalTime = Date.now() - mountTime.current;
      
      if (finalCount > threshold) {
        console.warn(
          `[RenderMonitor] ${componentName} unmounted after ${finalCount} renders in ${totalTime}ms`
        );
      }
      
      // Clean up stats
      renderStats.delete(componentName);
    };
  }, [componentName, threshold]);
}

/**
 * Hook to log why a component re-rendered
 * Compares previous and current props/state to identify what changed
 * 
 * @param componentName - Name of the component
 * @param props - Props object to monitor
 */
export function useWhyDidYouUpdate(
  componentName: string,
  props: Record<string, any>
): void {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') return;
  
  const previousProps = useRef<Record<string, any>>();
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length > 0) {
        console.log(`[WhyDidYouUpdate] ${componentName} re-rendered because:`, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

/**
 * Get render statistics for all monitored components
 */
export function getRenderStats(): Map<string, RenderStats> {
  return new Map(renderStats);
}

/**
 * Clear all render statistics
 */
export function clearRenderStats(): void {
  renderStats.clear();
}

/**
 * Log render statistics for all components
 */
export function logRenderStats(): void {
  if (renderStats.size === 0) {
    console.log('[RenderMonitor] No components being monitored');
    return;
  }
  
  console.group('[RenderMonitor] Render Statistics');
  
  const sorted = Array.from(renderStats.entries())
    .sort((a, b) => b[1].count - a[1].count);
  
  sorted.forEach(([name, stats]) => {
    const avgInterval = stats.renderTimes.length > 0
      ? stats.renderTimes.reduce((a, b) => a + b, 0) / stats.renderTimes.length
      : 0;
    
    console.log(
      `${name}: ${stats.count} renders, avg interval: ${avgInterval.toFixed(2)}ms`
    );
  });
  
  console.groupEnd();
}

export default {
  useRenderCount,
  useWhyDidYouUpdate,
  getRenderStats,
  clearRenderStats,
  logRenderStats
};
