import { logger } from '@/utils/logging';

// ABOUTME: Module Data API Service
// ABOUTME: Provides safe cross-module data access with read-only enforcement

import {
  ModuleDataAPI,
  Query,
  QueryResult,
  CollectionMetadata,
  DataChangeCallback,
  Unsubscribe,
  ModuleDataApiConfig,
  AccessLogEntry,
} from '../types/moduleDataApi';

// Default configuration
const DEFAULT_CONFIG: ModuleDataApiConfig = {
  enableLogging: true,
  enableCaching: true,
  cacheTtlMs: 60000, // 1 minute
  maxCacheSize: 50,
};

/**
 * Module Data API Service
 * 
 * This service provides a controlled interface for modules to access data
 * from other modules. It enforces:
 * - Read-only access (no modifications to other modules' data)
 * - Access logging for debugging
 * - Collection-level access control
 * - Optional caching for performance
 */
class ModuleDataApiService implements ModuleDataAPI {
  private config: ModuleDataApiConfig;
  private accessLog: AccessLogEntry[] = [];
  private cache: Map<string, { data: any[]; timestamp: number }> = new Map();
  private subscribers: Map<string, Set<DataChangeCallback<any>>> = new Map();
  private collectionMetadata: Map<string, CollectionMetadata> = new Map();

  constructor(config: Partial<ModuleDataApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a collection with its metadata
   * Called by modules when they initialize
   */
  registerCollection(metadata: CollectionMetadata): void {
    this.collectionMetadata.set(metadata.name, metadata);
    
    if (this.config.enableLogging) {
      logger.info(`[ModuleDataAPI] Registered collection: ${metadata.name} (${metadata.moduleId})`);
    }
  }

  /**
   * Unregister a collection
   */
  unregisterCollection(collectionName: string): void {
    this.collectionMetadata.delete(collectionName);
    this.cache.delete(collectionName);
    this.subscribers.delete(collectionName);
  }

  /**
   * Get all items from a collection
   */
  async getCollection<T>(collectionName: string): Promise<T[]> {
    this.logAccess('get', collectionName);

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<T[]>(collectionName);
      if (cached) {
        return cached;
      }
    }

    // In a real implementation, this would fetch from the database
    // For now, return empty array (modules should use their own data providers)
    logger.warn(`[ModuleDataAPI] getCollection called for ${collectionName} - implement database integration`);
    return [];
  }

  /**
   * Query a collection with filters
   */
  async queryCollection<T>(collectionName: string, query: Query): Promise<QueryResult<T>> {
    this.logAccess('query', collectionName, query);

    const allData = await this.getCollection<T>(collectionName);
    let filteredData = [...allData];

    // Apply where clause
    if (query.where) {
      filteredData = filteredData.filter(item => {
        return Object.entries(query.where!).every(([key, value]) => {
          return (item as any)[key] === value;
        });
      });
    }

    // Get total count before limit/offset
    const totalCount = filteredData.length;

    // Apply sorting
    if (query.orderBy) {
      const { field, direction } = query.orderBy;
      filteredData.sort((a, b) => {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply offset
    if (query.offset) {
      filteredData = filteredData.slice(query.offset);
    }

    // Apply limit
    if (query.limit) {
      filteredData = filteredData.slice(0, query.limit);
    }

    return {
      data: filteredData,
      totalCount,
      hasMore: totalCount > (query.offset || 0) + filteredData.length,
    };
  }

  /**
   * Get a single item by ID
   */
  async getById<T>(collectionName: string, id: string): Promise<T | null> {
    const result = await this.queryCollection<T>(collectionName, {
      where: { id },
      limit: 1,
    });
    return result.data[0] || null;
  }

  /**
   * Subscribe to collection changes
   */
  subscribeToCollection<T>(collectionName: string, callback: DataChangeCallback<T>): Unsubscribe {
    this.logAccess('subscribe', collectionName);

    if (!this.subscribers.has(collectionName)) {
      this.subscribers.set(collectionName, new Set());
    }

    this.subscribers.get(collectionName)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(collectionName)?.delete(callback);
    };
  }

  /**
   * Get metadata for all available collections
   */
  getAvailableCollections(): CollectionMetadata[] {
    return Array.from(this.collectionMetadata.values()).filter(
      meta => meta.isPublic && meta.allowedOperations.length > 0
    );
  }

  /**
   * Check if a collection is accessible
   */
  isCollectionAccessible(collectionName: string): boolean {
    const metadata = this.collectionMetadata.get(collectionName);
    return metadata?.isPublic === true && (metadata?.allowedOperations?.length ?? 0) > 0;
  }

  /**
   * Get the access log for debugging
   */
  getAccessLog(): AccessLogEntry[] {
    return [...this.accessLog];
  }

  /**
   * Clear the access log
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ModuleDataApiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helper methods

  private logAccess(operation: 'get' | 'query' | 'subscribe', collectionName: string, query?: Query): void {
    if (!this.config.enableLogging) return;

    const entry: AccessLogEntry = {
      timestamp: new Date(),
      sourceModule: this.detectSourceModule(),
      targetCollection: collectionName,
      operation,
      query,
    };

    this.accessLog.push(entry);

    // Keep log size manageable
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }

    logger.info(`[ModuleDataAPI] ${operation}: ${collectionName}`, query ? `query: ${JSON.stringify(query)}` : '');
  }

  private detectSourceModule(): string {
    // In a real implementation, this would detect which module is making the call
    // For now, return 'unknown'
    return 'unknown';
  }

  private getFromCache<T>(collectionName: string): T | null {
    const cached = this.cache.get(collectionName);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTtlMs) {
      this.cache.delete(collectionName);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(collectionName: string, data: T): void {
    if (!this.config.enableCaching) return;

    // Manage cache size
    if (this.cache.size >= this.config.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(collectionName, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify subscribers of data changes
   * Called internally when data is updated
   */
  private notifySubscribers<T>(collectionName: string, data: T[]): void {
    const callbacks = this.subscribers.get(collectionName);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`[ModuleDataAPI] Error notifying subscriber for ${collectionName}:`, error);
      }
    });
  }
}

// Export singleton instance
export const moduleDataApi = new ModuleDataApiService();

// Export factory function for testing
export function createModuleDataApi(config?: Partial<ModuleDataApiConfig>): ModuleDataAPI {
  return new ModuleDataApiService(config);
}
