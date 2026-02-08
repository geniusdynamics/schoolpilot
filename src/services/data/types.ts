/**
 * Unified Data Service Types
 * 
 * Core type definitions for the unified data layer.
 */

import type { Observable } from 'rxjs';

// Provider Capabilities
export interface ProviderCapabilities {
  /** Supports real-time subscriptions */
  realtime: boolean;
  
  /** Supports remote synchronization */
  sync: boolean;
  
  /** Supports ACID transactions */
  transactions: boolean;
  
  /** Works without network */
  offline: boolean;
  
  /** Supports data encryption */
  encryption: boolean;
  
  /** Supports full-text search */
  fullTextSearch: boolean;
  
  /** Supports relations/foreign keys */
  relations: boolean;
}

// Query Types
export interface Filter {
  [field: string]:
    | { $eq: any }
    | { $ne: any }
    | { $gt: number | Date }
    | { $gte: number | Date }
    | { $lt: number | Date }
    | { $lte: number | Date }
    | { $in: any[] }
    | { $nin: any[] }
    | { $contains: string }
    | { $startsWith: string }
    | { $endsWith: string }
    | { $exists: boolean }
    | { $regex: string }
    | { $and: Filter[] }
    | { $or: Filter[] }
    | { $not: Filter };
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface Query {
  filter?: Filter;
  sort?: SortOption[];
  pagination?: PaginationOptions;
  select?: string[];
  include?: Array<{
    collection: string;
    localField: string;
    foreignField: string;
    as: string;
  }>;
}

// Result Types
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Operation Types
export interface WriteOptions {
  /** Skip optimistic update */
  skipOptimistic?: boolean;
  
  /** Don't trigger subscriptions */
  silent?: boolean;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

export interface Operation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data?: any;
}

// Sync Types
export interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  conflicts: SyncConflict[];
  errors?: Error[];
}

export interface SyncConflict {
  collection: string;
  id: string;
  local: any;
  remote: any;
  resolution?: 'local' | 'remote' | 'merge';
}

export interface Change {
  id: string;
  collection: string;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
  data: any;
  synced?: boolean;
}

// Provider Interface
export interface DataProvider {
  /** Provider name */
  readonly name: string;
  
  /** Provider version */
  readonly version: string;
  
  /** Provider capabilities */
  readonly capabilities: ProviderCapabilities;
  
  /** Initialize the provider */
  initialize(config: Record<string, any>): Promise<void>;
  
  /** Clean up resources */
  destroy(): Promise<void>;
  
  // CRUD Operations
  find<T>(collection: string, query: Query): Promise<PaginatedResult<T>>;
  findOne<T>(collection: string, id: string): Promise<T | null>;
  findByIds<T>(collection: string, ids: string[]): Promise<T[]>;
  create<T>(collection: string, data: Omit<T, 'id'>, options?: WriteOptions): Promise<T>;
  update<T>(collection: string, id: string, data: Partial<T>, options?: WriteOptions): Promise<T>;
  delete(collection: string, id: string, options?: WriteOptions): Promise<void>;
  
  // Real-time
  subscribe<T>(collection: string, query: Query): Observable<T[]>;
  subscribeOne<T>(collection: string, id: string): Observable<T | null>;
  
  // Bulk Operations
  bulkCreate<T>(collection: string, data: T[]): Promise<T[]>;
  bulkUpdate<T>(collection: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]>;
  bulkDelete(collection: string, ids: string[]): Promise<void>;
  
  // Transactions
  transaction<T>(operations: Operation[]): Promise<T>;
  
  // Sync (optional)
  sync?(): Promise<SyncResult>;
  getPendingChanges?(): Promise<Change[]>;
  applyRemoteChanges?(changes: Change[]): Promise<void>;
  
  // Utilities
  count(collection: string, filter?: Filter): Promise<number>;
  exists(collection: string, id: string): Promise<boolean>;
  export?(): Promise<Blob>;
  import?(data: Blob): Promise<void>;
}

// Configuration Types
export type DeploymentMode = 
  | 'standalone' 
  | 'networked' 
  | 'hosted' 
  | 'saas' 
  | 'erpnext' 
  | 'demo';

export interface DataServiceConfig {
  mode: DeploymentMode;
  provider: 'sqlite' | 'pouchdb' | 'backend-api' | 'erpnext' | 'mock';
  options: Record<string, any>;
}

// Entity Types (examples)
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  createdBy?: string;
  updatedBy?: string;
}

// Event Types
export type DataEventType = 
  | 'entity-created'
  | 'entity-updated'
  | 'entity-deleted'
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'conflict-detected';

export interface DataEvent {
  type: DataEventType;
  collection: string;
  entityId?: string;
  timestamp: number;
  data?: any;
}
