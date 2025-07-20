// ABOUTME: Performance monitoring service for tracking application performance
// ABOUTME: Collects metrics for startup, module loading, data operations, and user interactions

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  type: 'startup' | 'module' | 'data' | 'interaction' | 'navigation';
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface ModuleLoadingMetric {
  moduleId: string;
  loadTime: number;
  success: boolean;
  timestamp: Date;
  strategy?: string;
  fromCache?: boolean;
}

export interface DataOperationMetric {
  operation: 'create' | 'read' | 'update' | 'delete' | 'sync';
  entity: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  recordCount?: number;
}

export interface UserInteractionMetric {
  action: string;
  component: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  startupTime: number;
  moduleLoadingTime: number;
  averageDataOperationTime: number;
  averageInteractionTime: number;
  memoryUsage: number;
  totalMetrics: number;
  lastUpdated: Date;
}

class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private moduleMetrics: ModuleLoadingMetric[] = [];
  private dataMetrics: DataOperationMetric[] = [];
  private interactionMetrics: UserInteractionMetric[] = [];
  private startTime: number;
  private maxMetrics = 1000; // Keep last 1000 metrics

  constructor() {
    this.startTime = performance.now();
    this.initializePerformanceObserver();
    // Clean up any invalid metrics from previous sessions
    this.cleanupInvalidModuleMetrics();
  }

  private initializePerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Navigation timing
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric({
                id: `nav-${Date.now()}`,
                timestamp: new Date(),
                type: 'startup',
                duration: navEntry.loadEventEnd - navEntry.navigationStart,
                success: true,
                metadata: {
                  domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
                  firstPaint: navEntry.loadEventStart - navEntry.navigationStart
                }
              });
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });

        // Resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name.includes('.js') || entry.name.includes('.tsx')) {
              this.recordMetric({
                id: `resource-${Date.now()}-${Math.random()}`,
                timestamp: new Date(),
                type: 'module',
                duration: entry.duration,
                success: entry.duration > 0,
                metadata: {
                  name: entry.name,
                  size: (entry as PerformanceResourceTiming).transferSize
                }
              });
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    this.cleanupOldMetrics();
  }

  recordModuleLoading(metric: ModuleLoadingMetric) {
    this.moduleMetrics.push(metric);
    this.recordMetric({
      id: `module-${metric.moduleId}-${Date.now()}`,
      timestamp: metric.timestamp,
      type: 'module',
      duration: metric.loadTime,
      success: metric.success,
      metadata: {
        moduleId: metric.moduleId,
        strategy: metric.strategy,
        fromCache: metric.fromCache
      }
    });
    this.cleanupOldMetrics();
  }

  recordDataOperation(metric: DataOperationMetric) {
    this.dataMetrics.push(metric);
    this.recordMetric({
      id: `data-${metric.operation}-${metric.entity}-${Date.now()}`,
      timestamp: metric.timestamp,
      type: 'data',
      duration: metric.duration,
      success: metric.success,
      metadata: {
        operation: metric.operation,
        entity: metric.entity,
        recordCount: metric.recordCount
      }
    });
    this.cleanupOldMetrics();
  }

  recordUserInteraction(metric: UserInteractionMetric) {
    this.interactionMetrics.push(metric);
    this.recordMetric({
      id: `interaction-${metric.action}-${Date.now()}`,
      timestamp: metric.timestamp,
      type: 'interaction',
      duration: metric.duration,
      success: true,
      metadata: {
        action: metric.action,
        component: metric.component,
        ...metric.metadata
      }
    });
    this.cleanupOldMetrics();
  }

  getPerformanceReport(): PerformanceReport {
    const now = performance.now();
    const startupTime = now - this.startTime;

    // Calculate averages
    const moduleLoadTimes = this.moduleMetrics.map(m => m.loadTime);
    const dataOpTimes = this.dataMetrics.map(m => m.duration);
    const interactionTimes = this.interactionMetrics.map(m => m.duration);

    const avgModuleTime = moduleLoadTimes.length > 0 
      ? moduleLoadTimes.reduce((a, b) => a + b, 0) / moduleLoadTimes.length 
      : 0;

    const avgDataTime = dataOpTimes.length > 0 
      ? dataOpTimes.reduce((a, b) => a + b, 0) / dataOpTimes.length 
      : 0;

    const avgInteractionTime = interactionTimes.length > 0 
      ? interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length 
      : 0;

    // Get memory usage if available
    let memoryUsage = 0;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    return {
      startupTime,
      moduleLoadingTime: avgModuleTime,
      averageDataOperationTime: avgDataTime,
      averageInteractionTime: avgInteractionTime,
      memoryUsage,
      totalMetrics: this.metrics.length,
      lastUpdated: new Date()
    };
  }

  getModuleMetrics(): ModuleLoadingMetric[] {
    // Filter out invalid 'core' module metrics (core is not a real module)
    const validMetrics = this.moduleMetrics.filter(metric => metric.moduleId !== 'core');
    return [...validMetrics].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Clean up invalid module metrics
  cleanupInvalidModuleMetrics(): void {
    const initialCount = this.moduleMetrics.length;
    this.moduleMetrics = this.moduleMetrics.filter(metric => metric.moduleId !== 'core');
    const removedCount = initialCount - this.moduleMetrics.length;
    
    if (removedCount > 0) {
      console.log(`[PerformanceMonitor] Cleaned up ${removedCount} invalid 'core' module metrics`);
    }
  }

  getDataMetrics(): DataOperationMetric[] {
    return [...this.dataMetrics].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getInteractionMetrics(): UserInteractionMetric[] {
    return [...this.interactionMetrics].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clearOldMetrics(maxAge: number = 300000) { // 5 minutes default
    const cutoff = new Date(Date.now() - maxAge);
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.moduleMetrics = this.moduleMetrics.filter(m => m.timestamp > cutoff);
    this.dataMetrics = this.dataMetrics.filter(m => m.timestamp > cutoff);
    this.interactionMetrics = this.interactionMetrics.filter(m => m.timestamp > cutoff);
  }

  private cleanupOldMetrics() {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    if (this.moduleMetrics.length > this.maxMetrics) {
      this.moduleMetrics = this.moduleMetrics.slice(-this.maxMetrics);
    }
    if (this.dataMetrics.length > this.maxMetrics) {
      this.dataMetrics = this.dataMetrics.slice(-this.maxMetrics);
    }
    if (this.interactionMetrics.length > this.maxMetrics) {
      this.interactionMetrics = this.interactionMetrics.slice(-this.maxMetrics);
    }
  }

  exportMetrics() {
    return {
      report: this.getPerformanceReport(),
      metrics: this.getAllMetrics(),
      moduleMetrics: this.getModuleMetrics(),
      dataMetrics: this.getDataMetrics(),
      interactionMetrics: this.getInteractionMetrics(),
      exportedAt: new Date().toISOString()
    };
  }

  // Utility methods for common performance tracking
  startTimer(id: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      return duration;
    };
  }

  measureAsync<T>(
    operation: () => Promise<T>,
    type: PerformanceMetric['type'],
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const id = `async-${type}-${Date.now()}`;

    return operation()
      .then(result => {
        this.recordMetric({
          id,
          timestamp: new Date(),
          type,
          duration: performance.now() - startTime,
          success: true,
          metadata
        });
        return result;
      })
      .catch(error => {
        this.recordMetric({
          id,
          timestamp: new Date(),
          type,
          duration: performance.now() - startTime,
          success: false,
          metadata: { ...metadata, error: error.message }
        });
        throw error;
      });
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitorService();
export default performanceMonitor;