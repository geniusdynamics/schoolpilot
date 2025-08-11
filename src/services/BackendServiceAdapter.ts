// ABOUTME: Backend service adapter that provides unified interface for data operations across different backend types
// ABOUTME: Handles routing between PouchDB, CouchDB, Frappe Education API, and custom backend APIs

import { backendArchitecture, BackendType, DataSource } from '../config/backendArchitecture';
import { UnifiedCRUDService } from './UnifiedCRUDService';
import { BackendAPIService } from './BackendAPIService';

/**
 * Backend Service Adapter
 * 
 * This adapter provides a unified interface for data operations while intelligently
 * routing requests to the appropriate backend service based on the current configuration
 * and function requirements.
 */

export interface ServiceOperation {
  operation: string;
  entity: string;
  data?: any;
  options?: any;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: DataSource;
  fallbackUsed?: boolean;
}

export class BackendServiceAdapter {
  private unifiedCRUDService: UnifiedCRUDService;
  private backendAPIService: BackendAPIService;
  private fallbackAttempts: Map<string, number> = new Map();

  constructor() {
    this.unifiedCRUDService = new UnifiedCRUDService();
    this.backendAPIService = new BackendAPIService();
  }

  /**
   * Execute a service operation with intelligent backend routing
   */
  async execute<T = any>(operation: ServiceOperation): Promise<ServiceResponse<T>> {
    const functionName = `${operation.entity}.${operation.operation}`;
    const config = backendArchitecture.getConfig();
    const shouldUseAPI = backendArchitecture.shouldUseAPI(functionName);
    
    try {
      if (shouldUseAPI) {
        return await this.executeAPIOperation<T>(operation);
      } else {
        return await this.executeLocalOperation<T>(operation);
      }
    } catch (error) {
      console.error(`Operation ${functionName} failed:`, error);
      
      // Try fallback if configured
      if (config.fallbackStrategy.autoFallback) {
        return await this.executeFallback<T>(operation, error as Error);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: shouldUseAPI ? 'api' : 'pouchdb'
      };
    }
  }

  /**
   * Execute operation using API backend
   */
  private async executeAPIOperation<T>(operation: ServiceOperation): Promise<ServiceResponse<T>> {
    const config = backendArchitecture.getConfig();
    
    // Check if backend is available
    const isAvailable = await backendArchitecture.isBackendAvailable();
    if (!isAvailable) {
      throw new Error('Backend API is not available');
    }

    let result: any;
    
    switch (operation.operation) {
      case 'create':
        result = await this.backendAPIService.create(operation.entity, operation.data);
        break;
      case 'read':
      case 'get':
        result = await this.backendAPIService.read(operation.entity, operation.data?.id || operation.options?.id);
        break;
      case 'update':
        result = await this.backendAPIService.update(operation.entity, operation.data.id, operation.data);
        break;
      case 'delete':
        result = await this.backendAPIService.delete(operation.entity, operation.data?.id || operation.options?.id);
        break;
      case 'list':
      case 'getAll':
        result = await this.backendAPIService.list(operation.entity, operation.options);
        break;
      case 'search':
        result = await this.backendAPIService.search(operation.entity, operation.data?.query, operation.options);
        break;
      default:
        throw new Error(`Unsupported API operation: ${operation.operation}`);
    }

    return {
      success: true,
      data: result,
      source: 'api'
    };
  }

  /**
   * Execute operation using local database (PouchDB/CouchDB)
   */
  private async executeLocalOperation<T>(operation: ServiceOperation): Promise<ServiceResponse<T>> {
    let result: any;
    
    switch (operation.operation) {
      case 'create':
        result = await this.unifiedCRUDService.create(operation.entity, operation.data);
        break;
      case 'read':
      case 'get':
        result = await this.unifiedCRUDService.read(operation.entity, operation.data?.id || operation.options?.id);
        break;
      case 'update':
        result = await this.unifiedCRUDService.update(operation.entity, operation.data.id, operation.data);
        break;
      case 'delete':
        result = await this.unifiedCRUDService.delete(operation.entity, operation.data?.id || operation.options?.id);
        break;
      case 'list':
      case 'getAll':
        result = await this.unifiedCRUDService.getAll(operation.entity, operation.options);
        break;
      case 'search':
        result = await this.unifiedCRUDService.search(operation.entity, operation.data?.query, operation.options);
        break;
      default:
        throw new Error(`Unsupported local operation: ${operation.operation}`);
    }

    return {
      success: true,
      data: result,
      source: 'pouchdb'
    };
  }

  /**
   * Execute fallback operation when primary backend fails
   */
  private async executeFallback<T>(operation: ServiceOperation, originalError: Error): Promise<ServiceResponse<T>> {
    const config = backendArchitecture.getConfig();
    const functionName = `${operation.entity}.${operation.operation}`;
    
    // Check fallback attempts
    const attempts = this.fallbackAttempts.get(functionName) || 0;
    if (attempts >= config.fallbackStrategy.retryAttempts) {
      this.fallbackAttempts.delete(functionName);
      throw new Error(`Fallback failed after ${attempts} attempts: ${originalError.message}`);
    }
    
    this.fallbackAttempts.set(functionName, attempts + 1);
    
    try {
      // Always fallback to local database
      const result = await this.executeLocalOperation<T>(operation);
      
      // Reset attempts on success
      this.fallbackAttempts.delete(functionName);
      
      return {
        ...result,
        fallbackUsed: true
      };
    } catch (fallbackError) {
      console.error(`Fallback operation failed:`, fallbackError);
      throw fallbackError;
    }
  }

  /**
   * Get backend status and capabilities
   */
  async getBackendStatus() {
    const config = backendArchitecture.getConfig();
    const capabilities = backendArchitecture.getCapabilities();
    const isAPIAvailable = await backendArchitecture.isBackendAvailable();
    
    return {
      type: config.type,
      dataSource: config.dataSource,
      apiAvailable: isAPIAvailable,
      capabilities,
      endpoints: config.endpoints
    };
  }

  /**
   * Test connectivity to all configured backends
   */
  async testConnectivity() {
    const config = backendArchitecture.getConfig();
    const results: any = {
      local: false,
      api: false,
      couchdb: false
    };

    // Test local PouchDB
    try {
      await this.unifiedCRUDService.testConnection();
      results.local = true;
    } catch (error) {
      console.warn('Local database connection failed:', error);
    }

    // Test API if configured
    if (config.endpoints.api) {
      try {
        results.api = await backendArchitecture.isBackendAvailable();
      } catch (error) {
        console.warn('API connection failed:', error);
      }
    }

    // Test CouchDB if configured
    if (config.endpoints.couchdb) {
      try {
        const response = await fetch(`${config.endpoints.couchdb}/_up`);
        results.couchdb = response.ok;
      } catch (error) {
        console.warn('CouchDB connection failed:', error);
      }
    }

    return results;
  }

  /**
   * Switch backend configuration
   */
  switchBackend(backendType: BackendType) {
    backendArchitecture.switchBackend(backendType);
    // Reset fallback attempts when switching backends
    this.fallbackAttempts.clear();
  }

  /**
   * Get recommended backend for a specific function
   */
  getRecommendedBackend(functionName: string): DataSource {
    return backendArchitecture.getDataSource(functionName);
  }

  /**
   * Check if a specific capability is available
   */
  hasCapability(category: string, capability: string): boolean {
    return backendArchitecture.hasCapability(category as any, capability);
  }

  /**
   * Bulk operation with intelligent batching
   */
  async executeBulk<T>(operations: ServiceOperation[]): Promise<ServiceResponse<T[]>> {
    const config = backendArchitecture.getConfig();
    const results: T[] = [];
    const errors: string[] = [];
    
    // Group operations by recommended backend
    const apiOps: ServiceOperation[] = [];
    const localOps: ServiceOperation[] = [];
    
    operations.forEach(op => {
      const functionName = `${op.entity}.${op.operation}`;
      if (backendArchitecture.shouldUseAPI(functionName)) {
        apiOps.push(op);
      } else {
        localOps.push(op);
      }
    });
    
    // Execute API operations
    if (apiOps.length > 0) {
      try {
        for (const op of apiOps) {
          const result = await this.executeAPIOperation<T>(op);
          if (result.success) {
            results.push(result.data!);
          } else {
            errors.push(result.error || 'Unknown API error');
          }
        }
      } catch (error) {
        errors.push(`Bulk API operation failed: ${error}`);
      }
    }
    
    // Execute local operations
    if (localOps.length > 0) {
      try {
        for (const op of localOps) {
          const result = await this.executeLocalOperation<T>(op);
          if (result.success) {
            results.push(result.data!);
          } else {
            errors.push(result.error || 'Unknown local error');
          }
        }
      } catch (error) {
        errors.push(`Bulk local operation failed: ${error}`);
      }
    }
    
    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      source: 'hybrid'
    };
  }
}

// Export singleton instance
export const backendServiceAdapter = new BackendServiceAdapter();

// Export helper functions
export const executeOperation = <T = any>(operation: ServiceOperation): Promise<ServiceResponse<T>> => {
  return backendServiceAdapter.execute<T>(operation);
};

export const getBackendStatus = () => {
  return backendServiceAdapter.getBackendStatus();
};

export const testBackendConnectivity = () => {
  return backendServiceAdapter.testConnectivity();
};