// ABOUTME: Unified CRUD operations interface that works across all data sources
// ABOUTME: Provides consistent API for mock data, RxDB, and backend operations with caching

import { EntityData } from '../../hooks/useDataHookFactory';
import { DataOperation, DataStrategyManager } from '../consistency/DataStrategyManager';
import { globalDataConsistencyService } from '../consistency/DataConsistencyService';
import { ValidationResult } from '../../utils/dataValidation';

export interface CRUDOptions {
  validate?: boolean;
  cache?: boolean;
  sync?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
}

export interface QueryOptions {
  filters?: Record<string, any>;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  include?: string[];
}

export interface CRUDResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  validation?: ValidationResult;
  cached?: boolean;
  source: 'mock' | 'rxdb' | 'backend' | 'cache' | 'validation' | 'error';
  timestamp: Date;
}

export interface BatchCRUDResult<T> {
  success: boolean;
  results: CRUDResult<T>[];
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  errors: Error[];
}

// Cache interface
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  source: string;
  entityName: string;
  key: string;
}

export class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, entityName: string, source: string, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl: ttl || this.defaultTTL,
      source,
      entityName,
      key
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateEntity(entityName: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.entityName === entityName) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; entities: string[]; oldestEntry: Date | null } {
    const entities = [...new Set([...this.cache.values()].map(e => e.entityName))];
    const timestamps = [...this.cache.values()].map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;

    return {
      size: this.cache.size,
      entities,
      oldestEntry
    };
  }
}

export class UnifiedCRUDService {
  private cache = new DataCache();
  private dataStrategyManager: DataStrategyManager | null = null;
  private mockDataService: any = null;
  private rxdbService: any = null;

  constructor(
    dataStrategyManager?: DataStrategyManager,
    mockDataService?: any,
    rxdbService?: any
  ) {
    this.dataStrategyManager = dataStrategyManager || null;
    this.mockDataService = mockDataService;
    this.rxdbService = rxdbService;
  }

  // Create operation
  async create<T extends EntityData>(
    entityName: string,
    data: Partial<T>,
    options: CRUDOptions = {}
  ): Promise<CRUDResult<T>> {
    const startTime = Date.now();
    const opts = { validate: true, cache: true, sync: true, priority: 'normal', ...options };

    try {
      // Prepare the entity
      const now = new Date().toISOString();
      const entity = {
        ...data,
        id: data.id || this.generateId(),
        created_at: now,
        updated_at: now
      } as T;

      // Validation
      let validation: ValidationResult | undefined;
      if (opts.validate) {
        validation = await globalDataConsistencyService.validateEntity(
          entityName,
          entity,
          'create'
        );

        if (!validation.isValid) {
          return {
            success: false,
            error: new Error(`Validation failed: ${validation.errors.map(e => e.message).join('; ')}`),
            validation,
            source: 'validation',
            timestamp: new Date()
          };
        }
      }

      // Execute the operation
      let result: T;
      let source: CRUDResult<T>['source'] = 'mock';

      if (this.dataStrategyManager) {
        const operation: DataOperation = {
          type: 'write',
          entity: entityName,
          priority: opts.priority!,
          requiresBackend: false,
          allowOffline: true
        };

        result = await this.dataStrategyManager.executeOperation<T>(operation, entity);
        source = 'rxdb'; // DataStrategyManager typically uses RxDB
      } else if (this.mockDataService) {
        // Use mock data service
        const mockResult = await this.mockDataService.create(entityName, entity);
        if (mockResult.success) {
          result = entity;
          source = 'mock';
        } else {
          throw new Error('Mock data service create failed');
        }
      } else {
        throw new Error('No data service available');
      }

      // Cache the result
      if (opts.cache) {
        const cacheKey = `${entityName}:${result.id}`;
        this.cache.set(cacheKey, result, entityName, source);
      }

      return {
        success: true,
        data: result,
        validation,
        cached: opts.cache,
        source,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'error',
        timestamp: new Date()
      };
    }
  }

  // Read operation
  async read<T extends EntityData>(
    entityName: string,
    id: string | number,
    options: CRUDOptions = {}
  ): Promise<CRUDResult<T>> {
    const opts = { cache: true, ...options };
    const cacheKey = `${entityName}:${id}`;

    try {
      // Check cache first
      if (opts.cache) {
        const cached = this.cache.get<T>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true,
            source: 'cache',
            timestamp: new Date()
          };
        }
      }

      // Execute the operation
      let result: T | null = null;
      let source: CRUDResult<T>['source'] = 'mock';

      if (this.dataStrategyManager) {
        const operation: DataOperation = {
          type: 'read',
          entity: entityName,
          priority: opts.priority || 'normal',
          requiresBackend: false,
          allowOffline: true
        };

        result = await this.dataStrategyManager.executeOperation<T>(operation, { id });
        source = 'rxdb';
      } else if (this.mockDataService) {
        // Use mock data service
        const mockResult = await this.mockDataService.read(entityName, id);
        if (mockResult.success) {
          result = mockResult.data || null;
          source = 'mock';
        } else {
          result = null;
          source = 'mock';
        }
      }

      if (!result) {
        return {
          success: false,
          error: new Error(`Entity ${entityName} with ID ${id} not found`),
          source,
          timestamp: new Date()
        };
      }

      // Cache the result
      if (opts.cache) {
        this.cache.set(cacheKey, result, entityName, source);
      }

      return {
        success: true,
        data: result,
        cached: false,
        source,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'error',
        timestamp: new Date()
      };
    }
  }

  // Query operation
  async query<T extends EntityData>(
    entityName: string,
    queryOptions: QueryOptions = {},
    options: CRUDOptions = {}
  ): Promise<CRUDResult<T[]>> {
    const opts = { cache: true, ...options };
    const cacheKey = `${entityName}:query:${JSON.stringify(queryOptions)}`;

    try {
      // Check cache first
      if (opts.cache) {
        const cached = this.cache.get<T[]>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true,
            source: 'cache',
            timestamp: new Date()
          };
        }
      }

      // Execute the operation
      let result: T[] = [];
      let source: CRUDResult<T[]>['source'] = 'mock';

      if (this.dataStrategyManager) {
        const operation: DataOperation = {
          type: 'read',
          entity: entityName,
          priority: opts.priority || 'normal',
          requiresBackend: false,
          allowOffline: true
        };

        result = await this.dataStrategyManager.executeOperation<T[]>(operation, { query: queryOptions });
        source = 'rxdb';
      } else if (this.mockDataService) {
        // Use mock data service
        const mockResult = await this.mockDataService.query ? 
          await this.mockDataService.query(entityName, queryOptions) :
          { success: true, data: [] };
        if (mockResult.success) {
          result = mockResult.data || [];
          source = 'mock';
        } else {
          result = [];
          source = 'mock';
        }
      }

      // Cache the result
      if (opts.cache) {
        this.cache.set(cacheKey, result, entityName, source, 2 * 60 * 1000); // 2 minutes for queries
      }

      return {
        success: true,
        data: result,
        cached: false,
        source,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'error',
        timestamp: new Date()
      };
    }
  }

  // Update operation
  async update<T extends EntityData>(
    entityName: string,
    id: string | number,
    updates: Partial<T>,
    options: CRUDOptions = {}
  ): Promise<CRUDResult<T>> {
    const opts = { validate: true, cache: true, sync: true, ...options };

    try {
      // Get existing entity for validation
      const existing = await this.read<T>(entityName, id, { cache: false });
      if (!existing.success || !existing.data) {
        return {
          success: false,
          error: new Error(`Entity ${entityName} with ID ${id} not found`),
          source: 'error',
          timestamp: new Date()
        };
      }

      // Prepare updated entity
      const updatedEntity = {
        ...existing.data,
        ...updates,
        updated_at: new Date().toISOString()
      } as T;

      // Validation
      let validation: ValidationResult | undefined;
      if (opts.validate) {
        validation = await globalDataConsistencyService.validateEntity(
          entityName,
          updatedEntity,
          'update'
        );

        if (!validation.isValid) {
          return {
            success: false,
            error: new Error(`Validation failed: ${validation.errors.map(e => e.message).join('; ')}`),
            validation,
            source: 'validation',
            timestamp: new Date()
          };
        }
      }

      // Execute the operation
      let result: T;
      let source: CRUDResult<T>['source'] = 'mock';

      if (this.dataStrategyManager) {
        const operation: DataOperation = {
          type: 'write',
          entity: entityName,
          priority: opts.priority!,
          requiresBackend: false,
          allowOffline: true
        };

        result = await this.dataStrategyManager.executeOperation<T>(operation, updatedEntity);
        source = 'rxdb';
      } else if (this.mockDataService) {
        const mockResult = await this.mockDataService.update(entityName, id, updatedEntity);
        if (mockResult.success) {
          result = updatedEntity;
          source = 'mock';
        } else {
          throw new Error('Mock data service update failed');
        }
      } else {
        throw new Error('No data service available');
      }

      // Update cache
      if (opts.cache) {
        const cacheKey = `${entityName}:${id}`;
        this.cache.set(cacheKey, result, entityName, source);
        // Invalidate query caches
        this.cache.invalidateEntity(entityName);
      }

      return {
        success: true,
        data: result,
        validation,
        cached: opts.cache,
        source,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'error',
        timestamp: new Date()
      };
    }
  }

  // Delete operation
  async delete<T extends EntityData>(
    entityName: string,
    id: string | number,
    options: CRUDOptions = {}
  ): Promise<CRUDResult<boolean>> {
    const opts = { validate: true, cache: true, sync: true, ...options };

    try {
      // Get existing entity for validation
      const existing = await this.read<T>(entityName, id, { cache: false });
      if (!existing.success || !existing.data) {
        return {
          success: false,
          error: new Error(`Entity ${entityName} with ID ${id} not found`),
          source: 'error',
          timestamp: new Date()
        };
      }

      // Validation
      let validation: ValidationResult | undefined;
      if (opts.validate) {
        validation = await globalDataConsistencyService.validateEntity(
          entityName,
          existing.data,
          'delete'
        );

        if (!validation.isValid) {
          return {
            success: false,
            error: new Error(`Validation failed: ${validation.errors.map(e => e.message).join('; ')}`),
            validation,
            source: 'validation',
            timestamp: new Date()
          };
        }
      }

      // Execute the operation
      let result: boolean;
      let source: CRUDResult<boolean>['source'] = 'mock';

      if (this.dataStrategyManager) {
        const operation: DataOperation = {
          type: 'delete',
          entity: entityName,
          priority: opts.priority!,
          requiresBackend: false,
          allowOffline: true
        };

        result = await this.dataStrategyManager.executeOperation<boolean>(operation, { id });
        source = 'rxdb';
      } else if (this.mockDataService) {
        const mockResult = await this.mockDataService.delete(entityName, id);
        if (mockResult.success) {
          result = true;
          source = 'mock';
        } else {
          throw new Error('Mock data service delete failed');
        }
      } else {
        throw new Error('No data service available');
      }

      // Remove from cache
      if (opts.cache) {
        const cacheKey = `${entityName}:${id}`;
        this.cache.invalidate(cacheKey);
        // Invalidate query caches
        this.cache.invalidateEntity(entityName);
      }

      return {
        success: true,
        data: result,
        validation,
        cached: false,
        source,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'error',
        timestamp: new Date()
      };
    }
  }

  // Batch operations
  async batchCreate<T extends EntityData>(
    entityName: string,
    items: Partial<T>[],
    options: CRUDOptions = {}
  ): Promise<BatchCRUDResult<T>> {
    const results: CRUDResult<T>[] = [];
    const errors: Error[] = [];

    for (const item of items) {
      try {
        const result = await this.create<T>(entityName, item, options);
        results.push(result);
        if (!result.success && result.error) {
          errors.push(result.error);
        }
      } catch (error) {
        const errorResult: CRUDResult<T> = {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          source: 'error',
          timestamp: new Date()
        };
        results.push(errorResult);
        errors.push(errorResult.error!);
      }
    }

    const successful = results.filter(r => r.success).length;

    return {
      success: errors.length === 0,
      results,
      totalProcessed: items.length,
      totalSuccessful: successful,
      totalFailed: items.length - successful,
      errors
    };
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    cacheStats: ReturnType<DataCache['getStats']>;
    operationCounts: Record<string, number>;
    averageResponseTime: number;
  }> {
    return {
      cacheStats: this.cache.getStats(),
      operationCounts: {}, // Would be implemented with actual tracking
      averageResponseTime: 0 // Would be implemented with actual tracking
    };
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  invalidateEntityCache(entityName: string): void {
    this.cache.invalidateEntity(entityName);
  }

  // Connection testing
  async testConnection(): Promise<boolean> {
    try {
      if (this.dataStrategyManager) {
        // Test RxDB connection by attempting a simple operation
        const testOperation: DataOperation = {
          type: 'read',
          entity: 'test',
          priority: 'low',
          requiresBackend: false,
          allowOffline: true
        };
        
        // This will test if the data strategy manager is working
        await this.dataStrategyManager.executeOperation(testOperation, { id: 'test' });
        return true;
      } else if (this.mockDataService) {
        // Test mock data service
        return typeof this.mockDataService.getAll === 'function';
      } else if (this.rxdbService) {
        // Test RxDB service directly
        return this.rxdbService.isReady && this.rxdbService.isReady();
      }
      
      // If no services are available, consider it as working (fallback mode)
      return true;
    } catch (error) {
      console.warn('Connection test failed:', error);
      return false;
    }
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update services
  updateServices(
    dataStrategyManager?: DataStrategyManager,
    mockDataService?: any,
    rxdbService?: any
  ): void {
    if (dataStrategyManager) this.dataStrategyManager = dataStrategyManager;
    if (mockDataService) this.mockDataService = mockDataService;
    if (rxdbService) this.rxdbService = rxdbService;
  }
}

// Global instance
export const globalUnifiedCRUDService = new UnifiedCRUDService();
