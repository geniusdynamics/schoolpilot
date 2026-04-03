/**
 * MetricsCollector - Collects and exports performance metrics for database providers
 *
 * Tracks query latency (avg, p95, p99), storage usage, operation counts,
 * and error rates. Provides metric export API for external monitoring.
 *
 * Requirements: 10.2-10.10, 21.1-21.12
 */

export interface QueryMetrics {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
}

export interface OperationMetrics {
  totalOperations: number;
  createCount: number;
  readCount: number;
  updateCount: number;
  deleteCount: number;
  errorCount: number;
  errorRate: number;
}

export interface StorageMetrics {
  usedBytes: number;
  collectionCount: number;
  documentCount: number;
  indexCount: number;
}

export interface ProviderMetrics {
  providerName: string;
  queryLatency: QueryMetrics;
  operations: OperationMetrics;
  storage: StorageMetrics;
  uptime: number; // seconds since initialization
  lastUpdated: Date;
}

export interface MetricPoint {
  metric: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

/**
 * MetricsCollector - Tracks and exports performance metrics
 */
export class MetricsCollector {
  private queryLatencies: number[] = [];
  private operationCounts = {
    create: 0,
    read: 0,
    update: 0,
    delete: 0,
    error: 0,
  };
  private startTime: number;
  private metricsHistory: MetricPoint[] = [];
  private readonly MAX_HISTORY = 10_000;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Record a query execution time
   */
  recordQuery(latencyMs: number): void {
    this.queryLatencies.push(latencyMs);

    // Keep only recent queries to avoid memory growth
    if (this.queryLatencies.length > 10_000) {
      this.queryLatencies = this.queryLatencies.slice(-5_000);
    }

    this.recordMetricPoint('query.latency', latencyMs, {});
  }

  /**
   * Record an operation
   */
  recordOperation(type: 'create' | 'read' | 'update' | 'delete'): void {
    this.operationCounts[type]++;
    this.recordMetricPoint(`operation.${type}`, 1, {});
  }

  /**
   * Record an error
   */
  recordError(errorType: string, context?: Record<string, string>): void {
    this.operationCounts.error++;
    this.recordMetricPoint('error.count', 1, { errorType, ...context });
  }

  /**
   * Get query latency metrics
   */
  getQueryMetrics(): QueryMetrics {
    if (this.queryLatencies.length === 0) {
      return { avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...this.queryLatencies].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      avg: sum / count,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count,
    };
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics(): OperationMetrics {
    const total =
      this.operationCounts.create +
      this.operationCounts.read +
      this.operationCounts.update +
      this.operationCounts.delete;

    return {
      totalOperations: total,
      createCount: this.operationCounts.create,
      readCount: this.operationCounts.read,
      updateCount: this.operationCounts.update,
      deleteCount: this.operationCounts.delete,
      errorCount: this.operationCounts.error,
      errorRate: total > 0 ? this.operationCounts.error / total : 0,
    };
  }

  /**
   * Get storage metrics (requires provider callback to update)
   */
  getStorageMetrics(
    collectionCount: number,
    documentCount: number,
    indexCount: number,
    usedBytes: number,
  ): StorageMetrics {
    return {
      usedBytes,
      collectionCount,
      documentCount,
      indexCount,
    };
  }

  /**
   * Get comprehensive provider metrics
   */
  getProviderMetrics(
    providerName: string,
    storageMetrics: StorageMetrics,
  ): ProviderMetrics {
    return {
      providerName,
      queryLatency: this.getQueryMetrics(),
      operations: this.getOperationMetrics(),
      storage: storageMetrics,
      uptime: (Date.now() - this.startTime) / 1000,
      lastUpdated: new Date(),
    };
  }

  /**
   * Export metrics in Prometheus-compatible format
   */
  exportPrometheus(providerName: string): string {
    const queryMetrics = this.getQueryMetrics();
    const opMetrics = this.getOperationMetrics();

    const lines = [
      `# HELP database_query_latency Query latency in milliseconds`,
      `# TYPE database_query_latency summary`,
      `database_query_latency{provider="${providerName}",quantile="0.5"} ${queryMetrics.p50.toFixed(2)}`,
      `database_query_latency{provider="${providerName}",quantile="0.95"} ${queryMetrics.p95.toFixed(2)}`,
      `database_query_latency{provider="${providerName}",quantile="0.99"} ${queryMetrics.p99.toFixed(2)}`,
      `database_query_latency_count{provider="${providerName}"} ${queryMetrics.count}`,
      ``,
      `# HELP database_operations_total Total operation counts by type`,
      `# TYPE database_operations_total counter`,
      `database_operations_total{provider="${providerName}",type="create"} ${opMetrics.createCount}`,
      `database_operations_total{provider="${providerName}",type="read"} ${opMetrics.readCount}`,
      `database_operations_total{provider="${providerName}",type="update"} ${opMetrics.updateCount}`,
      `database_operations_total{provider="${providerName}",type="delete"} ${opMetrics.deleteCount}`,
      `database_operations_total{provider="${providerName}",type="error"} ${opMetrics.errorCount}`,
      ``,
      `# HELP database_error_rate Error rate (errors / total operations)`,
      `# TYPE database_error_rate gauge`,
      `database_error_rate{provider="${providerName}"} ${opMetrics.errorRate.toFixed(6)}`,
      ``,
      `# HELP database_uptime_seconds Provider uptime in seconds`,
      `# TYPE database_uptime_seconds gauge`,
      `database_uptime_seconds{provider="${providerName}"} ${((Date.now() - this.startTime) / 1000).toFixed(1)}`,
    ];

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(providerName: string): ProviderMetrics {
    return this.getProviderMetrics(providerName, {
      usedBytes: 0,
      collectionCount: 0,
      documentCount: 0,
      indexCount: 0,
    });
  }

  /**
   * Get recent metric points (for streaming/export)
   */
  getRecentMetrics(limit = 100): MetricPoint[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.queryLatencies = [];
    this.operationCounts = { create: 0, read: 0, update: 0, delete: 0, error: 0 };
    this.startTime = Date.now();
    this.metricsHistory = [];
  }

  // ==================== Internal Methods ====================

  private recordMetricPoint(metric: string, value: number, tags: Record<string, string>): void {
    const point: MetricPoint = {
      metric,
      value,
      tags,
      timestamp: new Date(),
    };

    this.metricsHistory.push(point);

    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY / 2);
    }
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
