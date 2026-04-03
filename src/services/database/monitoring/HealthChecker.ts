/**
 * HealthChecker - Health check system for database providers
 *
 * Performs provider health checks, storage quota checks, network connectivity
 * checks, and sync status checks. Provides a health check API endpoint that
 * responds in <1 second.
 *
 * Requirements: 21.1, 21.2, 10.6
 */

import { NetworkMonitor, NetworkStatus } from '../sync';
import { MetricsCollector } from './MetricsCollector';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  responseTime: number; // ms
  checks: {
    provider: ProviderHealthCheck;
    storage: StorageHealthCheck;
    network: NetworkHealthCheck;
    sync?: SyncHealthCheck;
  };
  overall: {
    isHealthy: boolean;
    issues: string[];
    warnings: string[];
  };
}

export interface ProviderHealthCheck {
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'initializing';
  responseTime: number; // ms
  collectionsCount: number;
  lastError?: string;
  isHealthy: boolean;
}

export interface StorageHealthCheck {
  hasQuota: boolean;
  usedBytes: number;
  availableBytes: number;
  totalBytes: number;
  usagePercent: number;
  isHealthy: boolean;
  warningThreshold: number; // percent
  criticalThreshold: number; // percent
}

export interface NetworkHealthCheck {
  status: NetworkStatus;
  isOnline: boolean;
  latency?: number; // ms
  isHealthy: boolean;
}

export interface SyncHealthCheck {
  isActive: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  failedOperations: number;
  isHealthy: boolean;
}

export interface HealthCheckConfig {
  warningThreshold?: number; // Storage usage percent for warning (default: 80)
  criticalThreshold?: number; // Storage usage percent for critical (default: 95)
  timeoutMs?: number; // Health check timeout in ms (default: 1000)
}

const DEFAULT_CONFIG: Required<HealthCheckConfig> = {
  warningThreshold: 80,
  criticalThreshold: 95,
  timeoutMs: 1000,
};

/**
 * HealthChecker - Performs comprehensive health checks
 */
export class HealthChecker {
  private config: Required<HealthCheckConfig>;
  private networkMonitor: NetworkMonitor;
  private metricsCollector: MetricsCollector;

  constructor(
    private providerName: string,
    private providerCheckFn: () => Promise<ProviderHealthCheck>,
    config: HealthCheckConfig = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.networkMonitor = NetworkMonitor.getInstance();
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * Perform comprehensive health check
   */
  async check(options?: { includeSync?: boolean; pendingOps?: number; failedOps?: number }): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const issues: string[] = [];
    const warnings: string[] = [];

    // Run all checks in parallel where possible
    const [providerHealth, storageHealth, networkHealth] = await Promise.all([
      this.checkProvider(),
      this.checkStorage(),
      this.checkNetwork(),
    ]);

    // Collect issues and warnings
    if (!providerHealth.isHealthy) {
      issues.push(`Provider ${providerHealth.name} is ${providerHealth.status}`);
      if (providerHealth.lastError) {
        issues.push(`Provider error: ${providerHealth.lastError}`);
      }
    }

    if (!storageHealth.isHealthy) {
      if (storageHealth.usagePercent >= this.config.criticalThreshold) {
        issues.push(`Storage critically full: ${storageHealth.usagePercent.toFixed(1)}% used`);
      } else if (storageHealth.usagePercent >= this.config.warningThreshold) {
        warnings.push(`Storage running low: ${storageHealth.usagePercent.toFixed(1)}% used`);
      }
    }

    if (!networkHealth.isHealthy) {
      warnings.push(`Network status: ${networkHealth.status}`);
    }

    // Optional sync health check
    let syncHealth: SyncHealthCheck | undefined;
    if (options?.includeSync) {
      syncHealth = this.checkSync(options.pendingOps || 0, options.failedOps || 0);
      if (!syncHealth.isHealthy) {
        if (syncHealth.failedOperations > 0) {
          issues.push(`${syncHealth.failedOperations} sync operations failed`);
        }
      }
    }

    const responseTime = Date.now() - startTime;

    const result: HealthCheckResult = {
      status: this.computeOverallStatus(issues, warnings),
      timestamp: new Date(),
      responseTime,
      checks: {
        provider: providerHealth,
        storage: storageHealth,
        network: networkHealth,
        ...(syncHealth && { sync: syncHealth }),
      },
      overall: {
        isHealthy: issues.length === 0,
        issues,
        warnings,
      },
    };

    return result;
  }

  /**
   * Quick health check (provider only, <1s response)
   */
  async quickCheck(): Promise<{ isHealthy: boolean; status: string; responseTime: number }> {
    const startTime = Date.now();

    try {
      const providerHealth = await this.checkProvider();
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: providerHealth.isHealthy,
        status: providerHealth.status,
        responseTime,
      };
    } catch (error) {
      return {
        isHealthy: false,
        status: 'error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  // ==================== Internal Check Methods ====================

  private async checkProvider(): Promise<ProviderHealthCheck> {
    try {
      const result = await Promise.race([
        this.providerCheckFn(),
        new Promise<ProviderHealthCheck>((_, reject) =>
          setTimeout(() => reject(new Error('Provider health check timeout')), this.config.timeoutMs),
        ),
      ]);

      return result;
    } catch (error) {
      return {
        name: this.providerName,
        status: 'error',
        responseTime: 0,
        collectionsCount: 0,
        lastError: error instanceof Error ? error.message : String(error),
        isHealthy: false,
      };
    }
  }

  private async checkStorage(): Promise<StorageHealthCheck> {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage?.estimate
    ) {
      return {
        hasQuota: false,
        usedBytes: 0,
        availableBytes: 0,
        totalBytes: 0,
        usagePercent: 0,
        isHealthy: true, // Can't determine, assume healthy
        warningThreshold: this.config.warningThreshold,
        criticalThreshold: this.config.criticalThreshold,
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const total = estimate.quota ?? 0;
      const used = estimate.usage ?? 0;
      const available = Math.max(0, total - used);
      const usagePercent = total > 0 ? (used / total) * 100 : 0;

      return {
        hasQuota: true,
        usedBytes: used,
        availableBytes: available,
        totalBytes: total,
        usagePercent,
        isHealthy: usagePercent < this.config.criticalThreshold,
        warningThreshold: this.config.warningThreshold,
        criticalThreshold: this.config.criticalThreshold,
      };
    } catch {
      return {
        hasQuota: false,
        usedBytes: 0,
        availableBytes: 0,
        totalBytes: 0,
        usagePercent: 0,
        isHealthy: true,
        warningThreshold: this.config.warningThreshold,
        criticalThreshold: this.config.criticalThreshold,
      };
    }
  }

  private async checkNetwork(): Promise<NetworkHealthCheck> {
    this.networkMonitor.start();
    const isOnline = this.networkMonitor.isOnline();
    const status = this.networkMonitor.getStatus();

    // Simple latency check
    let latency: number | undefined;
    try {
      const start = performance.now();
      // Try a simple fetch to a reliable endpoint
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      latency = performance.now() - start;
    } catch {
      // Can't measure latency
    }

    return {
      status,
      isOnline,
      latency,
      isHealthy: isOnline, // Network is considered healthy if online
    };
  }

  private checkSync(pendingOps: number, failedOps: number): SyncHealthCheck {
    return {
      isActive: pendingOps > 0,
      lastSync: null, // Would be provided by SyncManager
      pendingOperations: pendingOps,
      failedOperations: failedOps,
      isHealthy: failedOps === 0,
    };
  }

  private computeOverallStatus(issues: string[], warnings: string[]): HealthStatus {
    if (issues.length > 0) return 'unhealthy';
    if (warnings.length > 0) return 'degraded';
    return 'healthy';
  }
}
