// ABOUTME: Database connection pooling system
// ABOUTME: Manages connection lifecycle, pooling, and resource optimization
import { IDatabaseProvider } from './interfaces';
import { databaseMemoryManager } from './MemoryManager';

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
  testOnBorrow: boolean;
  testOnReturn: boolean;
  testWhileIdle: boolean;
  validationQuery?: string;
  enableMetrics: boolean;
}

export interface PooledConnection {
  id: string;
  provider: IDatabaseProvider;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  isActive: boolean;
  isValid: boolean;
  metadata: {
    providerType: string;
    config: any;
  };
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalAcquired: number;
  totalReleased: number;
  totalCreated: number;
  totalDestroyed: number;
  averageAcquireTime: number;
  averageUsageTime: number;
  poolUtilization: number;
  lastUpdated: Date;
}

/**
 * Database Connection Pool
 * Manages database connections for optimal resource utilization
 */
export class DatabaseConnectionPool {
  private config: ConnectionPoolConfig;
  private connections: Map<string, PooledConnection> = new Map();
  private waitingRequests: Array<{
    id: string;
    requestedAt: Date;
    resolve: (connection: PooledConnection) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }> = [];
  private metrics: ConnectionPoolMetrics;
  private cleanupInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private isDestroyed = false;
  private listeners: ((metrics: ConnectionPoolMetrics) => void)[] = [];

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000,
      maxLifetimeMs: 1800000,
      testOnBorrow: true,
      testOnReturn: false,
      testWhileIdle: true,
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalAcquired: 0,
      totalReleased: 0,
      totalCreated: 0,
      totalDestroyed: 0,
      averageAcquireTime: 0,
      averageUsageTime: 0,
      poolUtilization: 0,
      lastUpdated: new Date(),
    };

    this.startCleanupProcess();
    this.startMetricsCollection();
    console.log('🏊 [ConnectionPool] Initialized with config:', this.config);
  }

  /**
   * Acquire a connection from the pool
   */
  public async acquire(): Promise<PooledConnection> {
    if (this.isDestroyed) {
      throw new Error('Connection pool has been destroyed');
    }

    const startTime = Date.now();
    const requestId = this.generateId();

    // Try to get an idle connection first
    const idleConnection = this.getIdleConnection();
    if (idleConnection) {
      await this.validateConnection(idleConnection);
      idleConnection.isActive = true;
      idleConnection.lastUsed = new Date();
      idleConnection.usageCount++;
      this.updateMetrics();
      this.metrics.totalAcquired++;
      return idleConnection;
    }

    // Create new connection if under max limit
    if (this.connections.size < this.config.maxConnections) {
      try {
        const newConnection = await this.createConnection();
        newConnection.isActive = true;
        newConnection.lastUsed = new Date();
        newConnection.usageCount++;
        this.updateMetrics();
        this.metrics.totalAcquired++;
        return newConnection;
      } catch (error) {
        console.error('❌ [ConnectionPool] Failed to create new connection:', error);
        throw error;
      }
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const request = {
        id: requestId,
        requestedAt: new Date(),
        resolve,
        reject,
      };

      request.timeout = setTimeout(() => {
        this.removeWaitingRequest(requestId);
        reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMs}ms`));
      }, this.config.acquireTimeoutMs);

      this.waitingRequests.push(request);
      this.updateMetrics();
    });
  }

  /**
   * Release a connection back to the pool
   */
  public async release(connection: PooledConnection): Promise<void> {
    if (this.isDestroyed) return;

    const pooledConnection = this.connections.get(connection.id);
    if (!pooledConnection) return;

    if (this.config.testOnReturn) {
      try {
        await this.validateConnection(pooledConnection);
      } catch (error) {
        await this.destroyConnection(pooledConnection);
        return;
      }
    }

    pooledConnection.isActive = false;
    pooledConnection.lastUsed = new Date();
    this.metrics.totalReleased++;
    this.updateMetrics();

    if (this.shouldDestroyConnection(pooledConnection)) {
      await this.destroyConnection(pooledConnection);
      return;
    }

    await this.fulfillWaitingRequests();
  }

  private getIdleConnection(): PooledConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.isActive && connection.isValid) {
        return connection;
      }
    }
    return null;
  }

  private async createConnection(): Promise<PooledConnection> {
    const connectionId = this.generateId();
    
    // Mock provider for now - in real implementation would use factory
    const mockProvider = {
      initialize: async () => {},
      createCollection: async () => null,
      getCollection: async () => null,
      close: async () => {},
    } as IDatabaseProvider;

    const connection: PooledConnection = {
      id: connectionId,
      provider: mockProvider,
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      isActive: false,
      isValid: true,
      metadata: {
        providerType: 'mock',
        config: {},
      },
    };

    this.connections.set(connectionId, connection);
    this.metrics.totalCreated++;
    databaseMemoryManager.registerConnection(connectionId, 'pooled');
    return connection;
  }

  private async destroyConnection(connection: PooledConnection): Promise<void> {
    try {
      if (connection.provider && typeof connection.provider.close === 'function') {
        await connection.provider.close();
      }
      this.connections.delete(connection.id);
      this.metrics.totalDestroyed++;
      databaseMemoryManager.unregisterConnection(connection.id);
    } catch (error) {
      console.error(`❌ [ConnectionPool] Error destroying connection ${connection.id}:`, error);
    }
  }

  private async validateConnection(connection: PooledConnection): Promise<void> {
    if (!connection.isValid) {
      throw new Error('Connection is marked as invalid');
    }
    // Validation logic would go here
  }

  private shouldDestroyConnection(connection: PooledConnection): boolean {
    const now = Date.now();
    const age = now - connection.createdAt.getTime();
    const idleTime = now - connection.lastUsed.getTime();

    if (age > this.config.maxLifetimeMs) return true;
    if (idleTime > this.config.idleTimeoutMs && this.connections.size > this.config.minConnections) return true;
    return false;
  }

  private async fulfillWaitingRequests(): Promise<void> {
    while (this.waitingRequests.length > 0) {
      const idleConnection = this.getIdleConnection();
      if (!idleConnection) break;

      const request = this.waitingRequests.shift();
      if (!request) break;

      if (request.timeout) clearTimeout(request.timeout);

      try {
        await this.validateConnection(idleConnection);
        idleConnection.isActive = true;
        idleConnection.lastUsed = new Date();
        idleConnection.usageCount++;
        this.metrics.totalAcquired++;
        this.updateMetrics();
        request.resolve(idleConnection);
      } catch (error) {
        await this.destroyConnection(idleConnection);
        request.reject(error);
      }
    }
  }

  private removeWaitingRequest(requestId: string): void {
    const index = this.waitingRequests.findIndex(req => req.id === requestId);
    if (index > -1) {
      const request = this.waitingRequests.splice(index, 1)[0];
      if (request.timeout) clearTimeout(request.timeout);
    }
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 60000);
  }

  private startMetricsCollection(): void {
    if (!this.config.enableMetrics) return;
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.notifyListeners();
    }, 30000);
  }

  private async performCleanup(): Promise<void> {
    if (this.isDestroyed) return;

    const connectionsToDestroy: PooledConnection[] = [];
    for (const connection of this.connections.values()) {
      if (!connection.isActive && this.shouldDestroyConnection(connection)) {
        connectionsToDestroy.push(connection);
      }
    }

    for (const connection of connectionsToDestroy) {
      await this.destroyConnection(connection);
    }

    await this.ensureMinimumConnections();
    this.updateMetrics();
  }

  private async ensureMinimumConnections(): Promise<void> {
    const currentConnections = this.connections.size;
    const needed = this.config.minConnections - currentConnections;
    
    if (needed > 0) {
      for (let i = 0; i < needed; i++) {
        try {
          await this.createConnection();
        } catch (error) {
          console.error('❌ [ConnectionPool] Failed to create minimum connection:', error);
          break;
        }
      }
    }
  }

  private updateMetrics(): void {
    const connections = Array.from(this.connections.values());
    this.metrics.totalConnections = connections.length;
    this.metrics.activeConnections = connections.filter(conn => conn.isActive).length;
    this.metrics.idleConnections = connections.filter(conn => !conn.isActive).length;
    this.metrics.waitingRequests = this.waitingRequests.length;
    this.metrics.poolUtilization = this.config.maxConnections > 0 
      ? (this.metrics.activeConnections / this.config.maxConnections) * 100 
      : 0;
    this.metrics.lastUpdated = new Date();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.metrics);
      } catch (error) {
        console.error('❌ [ConnectionPool] Listener error:', error);
      }
    });
  }

  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  public getMetrics(): ConnectionPoolMetrics {
    return { ...this.metrics };
  }

  public getStatus(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (this.metrics.waitingRequests > 5) {
      issues.push(`High number of waiting requests: ${this.metrics.waitingRequests}`);
      recommendations.push('Consider increasing maxConnections');
    }

    if (this.metrics.poolUtilization > 90) {
      issues.push(`High pool utilization: ${this.metrics.poolUtilization.toFixed(1)}%`);
      recommendations.push('Consider increasing pool size');
    }

    return { isHealthy: issues.length === 0, issues, recommendations };
  }

  public addMetricsListener(listener: (metrics: ConnectionPoolMetrics) => void): void {
    this.listeners.push(listener);
  }

  public removeMetricsListener(listener: (metrics: ConnectionPoolMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) this.listeners.splice(index, 1);
  }

  public updateConfig(newConfig: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ConnectionPoolConfig {
    return { ...this.config };
  }

  public async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    for (const request of this.waitingRequests) {
      if (request.timeout) clearTimeout(request.timeout);
      request.reject(new Error('Connection pool is being destroyed'));
    }
    this.waitingRequests = [];

    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      await this.destroyConnection(connection);
    }

    this.listeners = [];
  }
}

// Export singleton instance
export const databaseConnectionPool = new DatabaseConnectionPool();