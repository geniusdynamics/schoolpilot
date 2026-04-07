// ABOUTME: Page health monitoring service for tracking page performance and reliability
// ABOUTME: Provides comprehensive monitoring and alerting for page component issues

interface PageHealthMetrics {
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

interface PageHealthAlert {
  id: string;
  pageName: string;
  type: 'slow_loading' | 'high_error_rate' | 'repeated_failures' | 'timeout';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
}

interface PageHealthConfig {
  slowLoadingThreshold: number; // ms
  highErrorRateThreshold: number; // percentage
  criticalErrorCountThreshold: number;
  monitoringWindow: number; // ms
  alertCooldown: number; // ms
}

class PageHealthMonitor {
  private metrics = new Map<string, PageHealthMetrics>();
  private alerts: PageHealthAlert[] = [];
  private config: PageHealthConfig = {
    slowLoadingThreshold: 5000, // 5 seconds
    highErrorRateThreshold: 20, // 20%
    criticalErrorCountThreshold: 5,
    monitoringWindow: 5 * 60 * 1000, // 5 minutes
    alertCooldown: 2 * 60 * 1000 // 2 minutes
  };
  private lastAlertTime = new Map<string, number>();

  // Record a successful page load
  recordSuccess(pageName: string, loadTime: number) {
    const metrics = this.getOrCreateMetrics(pageName);
    
    metrics.successCount++;
    metrics.lastSuccess = new Date();
    
    // Update average load time
    const totalLoads = metrics.successCount + metrics.errorCount;
    metrics.averageLoadTime = ((metrics.averageLoadTime * (totalLoads - 1)) + loadTime) / totalLoads;
    
    // Update status
    this.updatePageStatus(pageName);
    
    // Check for slow loading
    if (loadTime > this.config.slowLoadingThreshold) {
      this.createAlert(pageName, 'slow_loading', 
        `Page ${pageName} loaded slowly (${Math.round(loadTime)}ms)`, 'medium');
    }
  }

  // Record a page load error
  recordError(pageName: string, error: Error, loadTime?: number) {
    const metrics = this.getOrCreateMetrics(pageName);
    
    metrics.errorCount++;
    metrics.lastError = {
      message: error.message,
      timestamp: new Date(),
      stack: error.stack
    };
    
    if (loadTime) {
      const totalLoads = metrics.successCount + metrics.errorCount;
      metrics.averageLoadTime = ((metrics.averageLoadTime * (totalLoads - 1)) + loadTime) / totalLoads;
    }
    
    // Update status
    this.updatePageStatus(pageName);
    
    // Check for critical error count
    if (metrics.errorCount >= this.config.criticalErrorCountThreshold) {
      this.createAlert(pageName, 'repeated_failures',
        `Page ${pageName} has failed ${metrics.errorCount} times`, 'critical');
    }
    
    // Check for high error rate
    const totalLoads = metrics.successCount + metrics.errorCount;
    const errorRate = (metrics.errorCount / totalLoads) * 100;
    if (errorRate >= this.config.highErrorRateThreshold) {
      this.createAlert(pageName, 'high_error_rate',
        `Page ${pageName} has high error rate (${Math.round(errorRate)}%)`, 'high');
    }
  }

  // Record a page load timeout
  recordTimeout(pageName: string, timeoutDuration: number) {
    const timeoutError = new Error(`Page load timeout after ${timeoutDuration}ms`);
    this.recordError(pageName, timeoutError, timeoutDuration);
    
    this.createAlert(pageName, 'timeout',
      `Page ${pageName} timed out after ${Math.round(timeoutDuration)}ms`, 'high');
  }

  // Get metrics for a specific page
  getPageMetrics(pageName: string): PageHealthMetrics | null {
    return this.metrics.get(pageName) || null;
  }

  // Get all page metrics
  getAllMetrics(): PageHealthMetrics[] {
    return Array.from(this.metrics.values());
  }

  // Get pages with issues
  getProblematicPages(): PageHealthMetrics[] {
    return this.getAllMetrics().filter(metrics => 
      metrics.status === 'warning' || metrics.status === 'critical'
    );
  }

  // Get active alerts
  getActiveAlerts(): PageHealthAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  // Get all alerts
  getAllAlerts(): PageHealthAlert[] {
    return [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Acknowledge an alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Clear old alerts
  clearOldAlerts(olderThan: Date) {
    this.alerts = this.alerts.filter(alert => alert.timestamp > olderThan);
  }

  // Get health summary
  getHealthSummary() {
    const allMetrics = this.getAllMetrics();
    const totalPages = allMetrics.length;
    const healthyPages = allMetrics.filter(m => m.status === 'healthy').length;
    const warningPages = allMetrics.filter(m => m.status === 'warning').length;
    const criticalPages = allMetrics.filter(m => m.status === 'critical').length;
    const unknownPages = allMetrics.filter(m => m.status === 'unknown').length;
    
    const totalLoads = allMetrics.reduce((sum, m) => sum + m.successCount + m.errorCount, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const overallErrorRate = totalLoads > 0 ? (totalErrors / totalLoads) * 100 : 0;
    
    const averageLoadTime = allMetrics.length > 0 
      ? allMetrics.reduce((sum, m) => sum + m.averageLoadTime, 0) / allMetrics.length 
      : 0;

    return {
      totalPages,
      healthyPages,
      warningPages,
      criticalPages,
      unknownPages,
      overallErrorRate: Math.round(overallErrorRate * 100) / 100,
      averageLoadTime: Math.round(averageLoadTime),
      activeAlerts: this.getActiveAlerts().length,
      lastUpdated: new Date()
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<PageHealthConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): PageHealthConfig {
    return { ...this.config };
  }

  // Reset metrics for a page
  resetPageMetrics(pageName: string) {
    this.metrics.delete(pageName);
  }

  // Reset all metrics
  resetAllMetrics() {
    this.metrics.clear();
    this.alerts = [];
    this.lastAlertTime.clear();
  }

  // Private helper methods
  private getOrCreateMetrics(pageName: string): PageHealthMetrics {
    if (!this.metrics.has(pageName)) {
      this.metrics.set(pageName, {
        pageName,
        loadTime: 0,
        errorCount: 0,
        successCount: 0,
        averageLoadTime: 0,
        status: 'unknown'
      });
    }
    return this.metrics.get(pageName)!;
  }

  private updatePageStatus(pageName: string) {
    const metrics = this.metrics.get(pageName);
    if (!metrics) return;

    const totalLoads = metrics.successCount + metrics.errorCount;
    const errorRate = totalLoads > 0 ? (metrics.errorCount / totalLoads) * 100 : 0;

    if (metrics.errorCount >= this.config.criticalErrorCountThreshold) {
      metrics.status = 'critical';
    } else if (errorRate >= this.config.highErrorRateThreshold || 
               metrics.averageLoadTime > this.config.slowLoadingThreshold) {
      metrics.status = 'warning';
    } else if (metrics.successCount > 0) {
      metrics.status = 'healthy';
    } else {
      metrics.status = 'unknown';
    }
  }

  private createAlert(pageName: string, type: PageHealthAlert['type'], message: string, severity: PageHealthAlert['severity']) {
    const alertKey = `${pageName}:${type}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;

    // Check cooldown period
    if (now - lastAlert < this.config.alertCooldown) {
      return;
    }

    const alert: PageHealthAlert = {
      id: `${alertKey}:${now}`,
      pageName,
      type,
      message,
      severity,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(alertKey, now);

    // Keep alerts array manageable
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log critical alerts
    if (severity === 'critical') {
      console.error(`🚨 [PageHealthMonitor] Critical alert: ${message}`);
    } else if (severity === 'high') {
      console.warn(`⚠️ [PageHealthMonitor] High severity alert: ${message}`);
    }
  }
}

// Global instance
export const pageHealthMonitor = new PageHealthMonitor();

// Export types for external use
export type { PageHealthMetrics, PageHealthAlert, PageHealthConfig };
export default PageHealthMonitor;