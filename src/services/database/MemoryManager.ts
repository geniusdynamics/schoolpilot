import { logger } from '@/utils/logging';

// ABOUTME: Database Memory Manager - monitors and optimizes memory usage for database operations
// ABOUTME: Prevents memory leaks, manages garbage collection, and provides memory usage alerts

export interface MemoryUsageMetrics {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: Date;
  percentUsed: number;
}

export interface MemoryAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: MemoryUsageMetrics;
  resolved: boolean;
}

export interface MemoryThresholds {
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
  maxHeapSize: number; // bytes
  gcTriggerThreshold: number; // percentage
}

export interface ConnectionInfo {
  id: string;
  provider: string;
  createdAt: Date;
  lastActivity: Date;
  isStale: boolean;
}

/**
 * Database Memory Manager
 * Monitors and optimizes memory usage for database operations
 */
export class DatabaseMemoryManager {
  private static instance: DatabaseMemoryManager;
  private metrics: MemoryUsageMetrics[] = [];
  private alerts: MemoryAlert[] = [];
  private connections: Map<string, ConnectionInfo> = new Map();
  private thresholds: MemoryThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: ((metrics: MemoryUsageMetrics) => void)[] = [];
  private gcCallbacks: (() => void)[] = [];

  private constructor() {
    this.thresholds = {
      warningThreshold: 70,
      criticalThreshold: 90,
      maxHeapSize: 1024 * 1024 * 1024, // 1GB
      gcTriggerThreshold: 80,
    };
    this.startMonitoring();
  }

  public static getInstance(): DatabaseMemoryManager {
    if (!DatabaseMemoryManager.instance) {
      DatabaseMemoryManager.instance = new DatabaseMemoryManager();
    }
    return DatabaseMemoryManager.instance;
  }

  public startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Collect initial metrics
    this.collectMetrics();
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private collectMetrics(): void {
    const metrics: MemoryUsageMetrics = {
      totalMemory: 0,
      usedMemory: 0,
      freeMemory: 0,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      timestamp: new Date(),
      percentUsed: 0,
    };

    // Try to get memory info if available (Node.js environment)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      metrics.heapUsed = mem.heapUsed;
      metrics.heapTotal = mem.heapTotal;
      metrics.external = mem.external;
      metrics.arrayBuffers = mem.arrayBuffers || 0;
      metrics.usedMemory = mem.heapUsed;
      metrics.totalMemory = mem.heapTotal;
      metrics.freeMemory = mem.heapTotal - mem.heapUsed;
      metrics.percentUsed = (mem.heapUsed / mem.heapTotal) * 100;
    }

    this.metrics.push(metrics);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Check thresholds and create alerts
    this.checkThresholds(metrics);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        logger.error('Memory listener error:', error);
      }
    });
  }

  private checkThresholds(metrics: MemoryUsageMetrics): void {
    if (metrics.percentUsed >= this.thresholds.criticalThreshold) {
      this.createAlert('critical', `Critical memory usage: ${metrics.percentUsed.toFixed(1)}%`, metrics);
      this.forceCleanup();
    } else if (metrics.percentUsed >= this.thresholds.warningThreshold) {
      this.createAlert('warning', `High memory usage: ${metrics.percentUsed.toFixed(1)}%`, metrics);
    }
  }

  private createAlert(level: 'info' | 'warning' | 'critical', message: string, metrics: MemoryUsageMetrics): void {
    const alert: MemoryAlert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      level,
      message,
      timestamp: new Date(),
      metrics,
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  public forceCleanup(): void {
    logger.info('🧹 [MemoryManager] Forcing cleanup...');
    
    // Run GC callbacks
    this.gcCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error('GC callback error:', error);
      }
    });

    // Clean up stale connections
    const now = Date.now();
    for (const [id, conn] of this.connections.entries()) {
      if (now - conn.lastActivity.getTime() > 300000) { // 5 minutes
        this.connections.delete(id);
      }
    }

    // Try to trigger GC if available
    if (typeof global !== 'undefined' && (global as any).gc) {
      try {
        (global as any).gc();
      } catch (error) {
        logger.warn('GC not available');
      }
    }
  }

  public getLatestMemoryMetrics(): MemoryUsageMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getMemoryHistory(): MemoryUsageMetrics[] {
    return [...this.metrics];
  }

  public getAllAlerts(): MemoryAlert[] {
    return [...this.alerts];
  }

  public getActiveAlerts(): MemoryAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  public getThresholds(): MemoryThresholds {
    return { ...this.thresholds };
  }

  public updateThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  public registerConnection(id: string, provider: string): void {
    this.connections.set(id, {
      id,
      provider,
      createdAt: new Date(),
      lastActivity: new Date(),
      isStale: false,
    });
  }

  public updateConnectionActivity(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.lastActivity = new Date();
      conn.isStale = false;
    }
  }

  public unregisterConnection(id: string): void {
    this.connections.delete(id);
  }

  public getConnectionStats(): {
    total: number;
    active: number;
    stale: number;
    byProvider: Record<string, number>;
  } {
    const now = Date.now();
    let active = 0;
    let stale = 0;
    const byProvider: Record<string, number> = {};

    for (const conn of this.connections.values()) {
      const isStale = now - conn.lastActivity.getTime() > 60000; // 1 minute
      if (isStale) {
        stale++;
        conn.isStale = true;
      } else {
        active++;
      }

      byProvider[conn.provider] = (byProvider[conn.provider] || 0) + 1;
    }

    return {
      total: this.connections.size,
      active,
      stale,
      byProvider,
    };
  }

  public getMemorySummary(): {
    current: MemoryUsageMetrics | null;
    trend: 'increasing' | 'decreasing' | 'stable';
    alerts: number;
    connections: {
      active: number;
      stale: number;
    };
    recommendations: string[];
  } {
    const current = this.getLatestMemoryMetrics();
    const activeAlerts = this.getActiveAlerts();
    const stats = this.getConnectionStats();

    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.metrics.length >= 3) {
      const recent = this.metrics.slice(-3);
      const avgRecent = recent.reduce((sum, m) => sum + m.percentUsed, 0) / recent.length;
      const older = this.metrics.slice(-6, -3);
      if (older.length > 0) {
        const avgOlder = older.reduce((sum, m) => sum + m.percentUsed, 0) / older.length;
        if (avgRecent > avgOlder + 5) trend = 'increasing';
        else if (avgRecent < avgOlder - 5) trend = 'decreasing';
      }
    }

    const recommendations: string[] = [];
    if (current && current.percentUsed > 70) {
      recommendations.push('Consider running cleanup to free memory');
    }
    if (stats.stale > 5) {
      recommendations.push('Clean up stale database connections');
    }
    if (trend === 'increasing') {
      recommendations.push('Memory usage is increasing - monitor closely');
    }

    return {
      current,
      trend,
      alerts: activeAlerts.length,
      connections: {
        active: stats.active,
        stale: stats.stale,
      },
      recommendations,
    };
  }

  public addListener(listener: (metrics: MemoryUsageMetrics) => void): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: (metrics: MemoryUsageMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public registerGCCallback(callback: () => void): void {
    this.gcCallbacks.push(callback);
  }

  public unregisterGCCallback(callback: () => void): void {
    const index = this.gcCallbacks.indexOf(callback);
    if (index > -1) {
      this.gcCallbacks.splice(index, 1);
    }
  }

  public destroy(): void {
    this.stopMonitoring();
    this.metrics = [];
    this.alerts = [];
    this.connections.clear();
    this.listeners = [];
    this.gcCallbacks = [];
  }
}

// Export singleton instance
export const databaseMemoryManager = DatabaseMemoryManager.getInstance();
