import { logger } from '@/utils/logging';

// ABOUTME: Memory management service for tracking and optimizing memory usage
// ABOUTME: Provides memory leak detection, cleanup mechanisms, and optimization strategies

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

class MemoryManagerService {
  private memoryHistory: MemoryUsage[] = [];
  private alerts: MemoryAlert[] = [];
  private componentMetrics: ComponentMemoryInfo[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private evictionCount = 0;
  private lastReportUpdate = 0;
  private reportUpdateThrottle = 5000; // Only update reports every 5 seconds
  
  // Configuration
  private readonly maxHistorySize = 100;
  private readonly maxCacheSize = 50 * 1024 * 1024; // 50MB
  private readonly maxCacheEntries = 1000;
  private readonly warningThreshold = 0.7; // 70% of heap limit
  private readonly criticalThreshold = 0.9; // 90% of heap limit
  private readonly cleanupInterval = 30000; // 30 seconds
  
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor() {
    this.startMonitoring();
    this.startCleanupRoutine();
  }

  // Start memory monitoring
  private startMonitoring() {
    if (typeof window === 'undefined' || !('performance' in window)) {
      logger.warn('Memory monitoring not available in this environment');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      // Only monitor when page is visible to reduce unnecessary work
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.collectMemoryUsage();
        this.checkMemoryThresholds();
      }
    }, 60000); // Check every 60 seconds when visible
  }

  // Start automatic cleanup routine
  private startCleanupRoutine() {
    this.cleanupIntervalId = setInterval(() => {
      this.performAutomaticCleanup();
    }, this.cleanupInterval);
  }

  // Collect current memory usage
  private collectMemoryUsage(): MemoryUsage | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null;
    }

    const memory = (performance as any).memory;
    if (!memory) {
      return null;
    }

    const usage: MemoryUsage = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: new Date()
    };

    this.memoryHistory.push(usage);
    
    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }

    return usage;
  }

  // Check memory thresholds and create alerts
  private checkMemoryThresholds() {
    const currentUsage = this.getCurrentMemoryUsage();
    if (!currentUsage) return;

    const usageRatio = currentUsage.usedJSHeapSize / currentUsage.jsHeapSizeLimit;

    // Check for critical threshold
    if (usageRatio >= this.criticalThreshold) {
      this.createAlert('critical', this.criticalThreshold, usageRatio, 
        `Critical memory usage: ${(usageRatio * 100).toFixed(1)}% of heap limit`);
    }
    // Check for warning threshold
    else if (usageRatio >= this.warningThreshold) {
      this.createAlert('warning', this.warningThreshold, usageRatio,
        `High memory usage: ${(usageRatio * 100).toFixed(1)}% of heap limit`);
    }
  }

  // Create memory alert with better deduplication
  private createAlert(type: 'warning' | 'critical', threshold: number, currentUsage: number, message: string) {
    const alertId = `${type}-${Date.now()}`;
    
    // Don't create duplicate alerts - more aggressive deduplication
    const existingAlert = this.alerts.find(alert => 
      alert.type === type && !alert.resolved && 
      Date.now() - alert.timestamp.getTime() < 300000 // Within last 5 minutes
    );
    
    if (existingAlert) return;
    
    // Don't create alerts too frequently
    const recentAlerts = this.alerts.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 60000 // Last minute
    );
    
    if (recentAlerts.length > 2) return; // Max 2 alerts per minute

    const alert: MemoryAlert = {
      id: alertId,
      type,
      threshold,
      currentUsage,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    
    // Trigger automatic cleanup for critical alerts
    if (type === 'critical') {
      this.performEmergencyCleanup();
    }

    // Emit alert event
    this.emitAlert(alert);
  }

  // Emit alert to listeners
  private emitAlert(alert: MemoryAlert) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memoryAlert', { detail: alert }));
    }
    
    logger.warn(`Memory Alert [${alert.type.toUpperCase()}]: ${alert.message}`);
  }

  // Perform automatic cleanup
  private performAutomaticCleanup() {
    const currentUsage = this.getCurrentMemoryUsage();
    if (!currentUsage) return;

    const usageRatio = currentUsage.usedJSHeapSize / currentUsage.jsHeapSizeLimit;
    
    if (usageRatio > this.warningThreshold) {
      // Clean up old cache entries
      this.cleanupCache();
      
      // Clean up old component metrics
      this.cleanupComponentMetrics();
      
      // Clean up old alerts
      this.cleanupAlerts();
      
      // Suggest garbage collection (if available)
      this.suggestGarbageCollection();
    }
  }

  // Perform emergency cleanup for critical memory situations
  private performEmergencyCleanup() {
    logger.warn('Performing emergency memory cleanup');
    
    // Aggressive cache cleanup
    this.clearCache();
    
    // Clear old metrics
    this.componentMetrics = this.componentMetrics.slice(-10);
    this.memoryHistory = this.memoryHistory.slice(-20);
    
    // Clear resolved alerts
    this.alerts = this.alerts.filter(alert => !alert.resolved);
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  // Clean up cache based on LRU and size
  private cleanupCache() {
    const entries = Array.from(this.cache.entries());
    const now = new Date();
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (entry.ttl && now.getTime() - entry.created.getTime() > entry.ttl) {
        this.cache.delete(key);
        this.evictionCount++;
      }
    });
    
    // If still over limits, remove least recently used
    if (this.cache.size > this.maxCacheEntries || this.getCacheSize() > this.maxCacheSize) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key)) // Still exists after TTL cleanup
        .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
      
      const toRemove = Math.max(
        this.cache.size - this.maxCacheEntries,
        Math.ceil(sortedEntries.length * 0.2) // Remove 20% of entries
      );
      
      for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i][0]);
        this.evictionCount++;
      }
    }
  }

  // Clean up old component metrics
  private cleanupComponentMetrics() {
    const cutoff = new Date(Date.now() - 300000); // 5 minutes ago
    this.componentMetrics = this.componentMetrics.filter(metric => 
      metric.mountTime > cutoff || (metric.unmountTime && metric.unmountTime > cutoff)
    );
  }

  // Clean up old alerts
  private cleanupAlerts() {
    const cutoff = new Date(Date.now() - 600000); // 10 minutes ago
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp > cutoff || !alert.resolved
    );
  }

  // Suggest garbage collection
  private suggestGarbageCollection() {
    if (typeof window !== 'undefined' && (window as any).gc) {
      logger.info('Suggesting garbage collection');
      setTimeout(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      }, 100);
    }
  }

  // Public API methods

  // Get current memory usage
  getCurrentMemoryUsage(): MemoryUsage | null {
    if (this.memoryHistory.length === 0) {
      return this.collectMemoryUsage();
    }
    return this.memoryHistory[this.memoryHistory.length - 1];
  }

  // Get memory history
  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  // Get active alerts
  getActiveAlerts(): MemoryAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Get all alerts
  getAllAlerts(): MemoryAlert[] {
    return [...this.alerts];
  }

  // Resolve alert
  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  // Track component mount
  trackComponentMount(componentName: string): string {
    const currentUsage = this.getCurrentMemoryUsage();
    const componentId = `${componentName}-${Date.now()}-${Math.random()}`;
    
    const info: ComponentMemoryInfo = {
      componentName,
      mountTime: new Date(),
      memoryAtMount: currentUsage?.usedJSHeapSize || 0
    };
    
    this.componentMetrics.push(info);
    return componentId;
  }

  // Track component unmount
  trackComponentUnmount(componentName: string) {
    const currentUsage = this.getCurrentMemoryUsage();
    const now = new Date();
    
    // Find the most recent mount for this component
    const componentInfo = [...this.componentMetrics]
      .reverse()
      .find(info => info.componentName === componentName && !info.unmountTime);
    
    if (componentInfo && currentUsage) {
      componentInfo.unmountTime = now;
      componentInfo.memoryAtUnmount = currentUsage.usedJSHeapSize;
      componentInfo.memoryDelta = componentInfo.memoryAtUnmount - componentInfo.memoryAtMount;
      componentInfo.lifespan = now.getTime() - componentInfo.mountTime.getTime();
    }
  }

  // Cache management
  setCache<T>(key: string, data: T, ttl?: number): void {
    const size = this.estimateSize(data);
    const entry: CacheEntry<T> = {
      key,
      data,
      size,
      accessCount: 1,
      lastAccessed: new Date(),
      created: new Date(),
      ttl
    };
    
    this.cache.set(key, entry);
    
    // Trigger cleanup if needed
    if (this.cache.size > this.maxCacheEntries || this.getCacheSize() > this.maxCacheSize) {
      this.cleanupCache();
    }
  }

  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.cacheMisses++;
      return null;
    }
    
    // Check TTL
    if (entry.ttl && Date.now() - entry.created.getTime() > entry.ttl) {
      this.cache.delete(key);
      this.cacheMisses++;
      return null;
    }
    
    // Update access info
    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    this.cacheHits++;
    return entry.data as T;
  }

  clearCache(): void {
    this.cache.clear();
    this.evictionCount += this.cache.size;
  }

  // Get cache size in bytes (estimated)
  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce((total, entry) => total + entry.size, 0);
  }

  // Estimate object size in bytes
  private estimateSize(obj: any): number {
    try {
      const jsonString = JSON.stringify(obj);
      return new Blob([jsonString]).size;
    } catch (error) {
      // Fallback estimation
      return JSON.stringify(obj).length * 2; // Rough estimate: 2 bytes per character
    }
  }

  // Get comprehensive memory report with throttling
  getMemoryReport(): MemoryReport {
    // Throttle report generation to prevent excessive re-renders
    const now = Date.now();
    if (now - this.lastReportUpdate < this.reportUpdateThrottle && this.lastReportUpdate > 0) {
      // Return cached report if called too frequently
      return this.cachedReport || this.generateReport();
    }
    
    this.lastReportUpdate = now;
    this.cachedReport = this.generateReport();
    return this.cachedReport;
  }

  private cachedReport: MemoryReport | null = null;

  private generateReport(): MemoryReport {
    const currentUsage = this.getCurrentMemoryUsage();
    const cacheSize = this.getCacheSize();
    const totalRequests = this.cacheHits + this.cacheMisses;
    
    const recommendations: string[] = [];
    
    if (currentUsage) {
      const usageRatio = currentUsage.usedJSHeapSize / currentUsage.jsHeapSizeLimit;
      if (usageRatio > 0.8) {
        recommendations.push('Consider reducing data cache size');
        recommendations.push('Clear unused component references');
      }
      if (usageRatio > 0.6) {
        recommendations.push('Monitor component lifecycle for memory leaks');
      }
    }
    
    if (this.cache.size > this.maxCacheEntries * 0.8) {
      recommendations.push('Cache is approaching capacity - consider cleanup');
    }
    
    if (totalRequests > 0 && this.cacheHits / totalRequests < 0.5) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }

    return {
      currentUsage: currentUsage || {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        timestamp: new Date()
      },
      alerts: this.getActiveAlerts(),
      componentMetrics: [...this.componentMetrics],
      cacheMetrics: {
        totalEntries: this.cache.size,
        totalSize: cacheSize,
        hitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
        evictionCount: this.evictionCount
      },
      recommendations,
      lastUpdated: new Date()
    };
  }

  // Cleanup and destroy
  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    this.clearCache();
    this.memoryHistory = [];
    this.alerts = [];
    this.componentMetrics = [];
  }
}

// Create and export singleton instance
export const memoryManager = new MemoryManagerService();
export default memoryManager;