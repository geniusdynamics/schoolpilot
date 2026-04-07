/**
 * Performance Service Types
 *
 * Type definitions and interfaces for performance monitoring services.
 * Enables dependency injection and testability.
 */

// ============================================================================
// Performance Event Manager Types
// ============================================================================

export type PerformanceEventType =
  | 'navigation'
  | 'data_operation'
  | 'user_interaction'
  | 'manual_refresh'
  | 'tab_switch'
  | 'form_submit'
  | 'diagnostic';

export interface PerformanceEvent {
  type: PerformanceEventType;
  timestamp: number;
  source?: string;
  metadata?: Record<string, any>;
}

export type PerformanceEventListener = (event: PerformanceEvent) => void;

export interface PerformanceEventSubscription {
  unsubscribe: () => void;
}

// ============================================================================
// Performance Monitor Types
// ============================================================================

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

export interface PerformanceThresholds {
  startup: number;
  moduleLoad: number;
  dataOperation: number;
  interaction: number;
  memory: number;
}

// ============================================================================
// Memory Manager Types
// ============================================================================

export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: Date;
}

export interface MemoryAlert {
  id: string;
  type: 'warning' | 'critical';
  threshold: number;
  currentUsage: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface ComponentMemoryInfo {
  componentName: string;
  mountTime: Date;
  unmountTime?: Date;
  memoryAtMount: number;
  memoryAtUnmount?: number;
  memoryDelta?: number;
  lifespan?: number;
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  size: number;
  accessCount: number;
  lastAccessed: Date;
  created: Date;
  ttl?: number;
}

export interface MemoryReport {
  currentUsage: MemoryUsage;
  alerts: MemoryAlert[];
  componentMetrics: ComponentMemoryInfo[];
  cacheMetrics: {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    evictionCount: number;
  };
  recommendations: string[];
  lastUpdated: Date;
}

export interface MemoryConfig {
  maxHistorySize: number;
  maxCacheSize: number;
  maxCacheEntries: number;
  warningThreshold: number;
  criticalThreshold: number;
  cleanupInterval: number;
}

// ============================================================================
// Page Health Monitor Types
// ============================================================================

export interface PageHealthMetrics {
  pageName: string;
  loadTime: number;
  errorCount: number;
  successCount: number;
  lastError?: {
    message: string;
    timestamp: Date;
    stack?: string;
  };
  lastSuccess?: Date;
  averageLoadTime: number;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface PageHealthAlert {
  id: string;
  pageName: string;
  type: 'slow_loading' | 'high_error_rate' | 'repeated_failures' | 'timeout';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
}

export interface PageHealthConfig {
  slowLoadingThreshold: number;
  highErrorRateThreshold: number;
  criticalErrorCountThreshold: number;
  monitoringWindow: number;
  alertCooldown: number;
}

export interface PageHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  pages: PageHealthMetrics[];
  alerts: PageHealthAlert[];
  lastCheck: Date;
}

// ============================================================================
// Performance Benchmark Types
// ============================================================================

export interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  timestamp: Date;
}

export interface BenchmarkSuite {
  name: string;
  benchmarks: BenchmarkResult[];
  totalDuration: number;
  timestamp: Date;
}

// ============================================================================
// Asset Optimizer Types
// ============================================================================

export interface AssetOptimizationResult {
  originalSize: number;
  optimizedSize: number;
  savings: number;
  format: string;
  duration: number;
}

export interface AssetOptimizationConfig {
  imageQuality: number;
  enableLazyLoading: boolean;
  preloadCritical: boolean;
  cacheDuration: number;
}

// ============================================================================
// Bundle Analyzer Types
// ============================================================================

export interface BundleAnalysis {
  totalSize: number;
  gzipSize: number;
  modules: BundleModule[];
  duplicates: DuplicateModule[];
  recommendations: string[];
}

export interface BundleModule {
  name: string;
  size: number;
  gzipSize: number;
  percentage: number;
  dependencies: string[];
}

export interface DuplicateModule {
  name: string;
  instances: number;
  totalSize: number;
  locations: string[];
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Performance Event Manager Interface
 *
 * Coordinates performance data updates across components.
 */
export interface IPerformanceEventManager {
  /**
   * Emit a performance event
   */
  emit(type: PerformanceEventType, source?: string, metadata?: Record<string, any>): void;

  /**
   * Subscribe to performance events
   */
  subscribe(listener: PerformanceEventListener): () => void;

  /**
   * Get the last emitted event
   */
  getLastEvent(): PerformanceEvent | null;

  /**
   * Get event history
   */
  getEventHistory(): PerformanceEvent[];

  /**
   * Check if a refresh should be performed based on recent events
   */
  shouldRefresh(lastRefresh: number, minInterval?: number): boolean;

  /**
   * Get recent events within a time window
   */
  getRecentEvents(timeWindow?: number): PerformanceEvent[];

  /**
   * Mark a diagnostic event
   */
  markDiagnostic(source: string, metadata?: Record<string, any>): void;

  /**
   * Get diagnostic snapshot
   */
  getDiagnosticsSnapshot(limit?: number): PerformanceEvent[];
}

/**
 * Performance Monitor Interface
 *
 * Tracks application performance metrics.
 */
export interface IPerformanceMonitor {
  /**
   * Record a generic performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id'>): void;

  /**
   * Record module loading metric
   */
  recordModuleLoad(metric: ModuleLoadingMetric): void;

  /**
   * Record data operation metric
   */
  recordDataOperation(metric: DataOperationMetric): void;

  /**
   * Record user interaction metric
   */
  recordInteraction(metric: UserInteractionMetric): void;

  /**
   * Start timing an operation
   */
  startTiming(id: string, type: PerformanceMetric['type']): void;

  /**
   * End timing an operation
   */
  endTiming(id: string, success?: boolean, metadata?: Record<string, any>): number;

  /**
   * Get performance report
   */
  getReport(): PerformanceReport;

  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[];

  /**
   * Clear all metrics
   */
  clearMetrics(): void;

  /**
   * Set performance thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void;

  /**
   * Check if performance is within thresholds
   */
  checkPerformance(): { passed: boolean; violations: string[] };
}

/**
 * Memory Manager Interface
 *
 * Tracks and optimizes memory usage.
 */
export interface IMemoryManager {
  /**
   * Get current memory usage
   */
  getCurrentUsage(): MemoryUsage | null;

  /**
   * Get memory usage history
   */
  getMemoryHistory(): MemoryUsage[];

  /**
   * Get memory report
   */
  getMemoryReport(): MemoryReport;

  /**
   * Register component mount
   */
  registerComponentMount(componentName: string): void;

  /**
   * Register component unmount
   */
  registerComponentUnmount(componentName: string): void;

  /**
   * Add cache entry
   */
  setCacheEntry<T>(key: string, data: T, size: number, ttl?: number): void;

  /**
   * Get cache entry
   */
  getCacheEntry<T>(key: string): T | null;

  /**
   * Clear cache entry
   */
  clearCacheEntry(key: string): void;

  /**
   * Clear all cache
   */
  clearAllCache(): void;

  /**
   * Force garbage collection hint (if available)
   */
  suggestGarbageCollection(): void;

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number;

  /**
   * Subscribe to memory alerts
   */
  subscribeToAlerts(callback: (alert: MemoryAlert) => void): () => void;
}

/**
 * Page Health Monitor Interface
 *
 * Monitors page performance and reliability.
 */
export interface IPageHealthMonitor {
  /**
   * Record a successful page load
   */
  recordSuccess(pageName: string, loadTime: number): void;

  /**
   * Record a page load error
   */
  recordError(pageName: string, error: Error, loadTime?: number): void;

  /**
   * Get health metrics for a page
   */
  getPageMetrics(pageName: string): PageHealthMetrics | null;

  /**
   * Get all page health metrics
   */
  getAllPageMetrics(): PageHealthMetrics[];

  /**
   * Get page health status
   */
  getHealthStatus(): PageHealthStatus;

  /**
   * Get unacknowledged alerts
   */
  getAlerts(): PageHealthAlert[];

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void;

  /**
   * Clear all alerts
   */
  clearAlerts(): void;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PageHealthConfig>): void;

  /**
   * Reset metrics for a page
   */
  resetPageMetrics(pageName: string): void;

  /**
   * Subscribe to health status changes
   */
  subscribe(callback: (status: PageHealthStatus) => void): () => void;
}

// ============================================================================
// React Hook Types
// ============================================================================

export interface UsePerformanceEventsResult {
  lastEvent: PerformanceEvent | null;
  emitEvent: (type: PerformanceEventType, source?: string, metadata?: Record<string, any>) => void;
  shouldRefresh: (lastRefresh: number, minInterval?: number) => boolean;
  getRecentEvents: (timeWindow?: number) => PerformanceEvent[];
}
