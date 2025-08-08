// Database Abstraction Layer Interfaces
// Based on dual_database_architecture_master_reference.md

import { Observable } from 'rxjs';

// Core database configuration
export interface DatabaseConfig {
  name: string;
  version?: number;
  storage?: string;
  multiInstance?: boolean;
  ignoreDuplicate?: boolean;
  autoCompaction?: boolean;
  debug?: boolean;
}

// Collection schema definition
export interface CollectionSchema {
  version: number;
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
  indexes?: IndexDefinition[];
  primaryKey?: string;
  relationships?: RelationshipDefinition[];
}

export interface SchemaProperty {
  type: string;
  format?: string;
  enum?: any[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  validation?: ValidationRule[];
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  ref?: string;
  default?: any;
}

export interface IndexDefinition {
  name: string;
  fields: string[];
  unique?: boolean;
  sparse?: boolean;
  background?: boolean;
  partialFilterExpression?: Record<string, any>;
}

export interface RelationshipDefinition {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  target: string;
  foreignKey: string;
  localKey?: string;
}

export interface ValidationRule {
  type: string;
  value: any;
  message?: string;
}

// Query options and results
export interface QueryOptions {
  selector?: Record<string, any>;
  sort?: Array<string | Record<string, 'asc' | 'desc'>>;
  limit?: number;
  skip?: number;
  fields?: string[];
  include_docs?: boolean;
  startkey?: any;
  endkey?: any;
  key?: any;
  keys?: any[];
}

export interface InsertResult<T> {
  id: string;
  rev?: string;
  doc: T;
  ok?: boolean;
}

export interface UpdateResult<T> {
  id: string;
  rev?: string;
  doc?: T;
  ok?: boolean;
}

export interface DeleteResult {
  id: string;
  rev?: string;
  ok?: boolean;
  deleted?: boolean;
}

export interface BulkResult<T> {
  docs: InsertResult<T>[];
  errors: Array<{ id: string; error: string; reason: string }>;
}

// Collection change events for reactive operations
export interface CollectionChangeEvent<T> {
  type: 'insert' | 'update' | 'delete';
  doc: T;
  oldDoc?: T;
  id: string;
}

// Provider status and statistics
export interface ProviderStatus {
  name: string;
  version: string;
  isConnected: boolean;
  collectionsCount: number;
  lastError?: Error;
  performance: {
    avgQueryTime: number;
    totalQueries: number;
    memoryUsage: number;
  };
}

export interface CollectionStats {
  name: string;
  documentCount: number;
  indexCount: number;
  storageSize: number;
  lastModified: Date;
}

// Core collection interface
export interface ICollection<T> {
  readonly name: string;
  readonly schema: CollectionSchema;
  
  // CRUD Operations
  insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>>;
  insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>>;
  findOne(query: QueryOptions): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  find(query?: QueryOptions): Promise<T[]>;
  update(id: string, update: Partial<T>): Promise<UpdateResult<T>>;
  updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]>;
  remove(id: string): Promise<DeleteResult>;
  removeMany(query: QueryOptions): Promise<DeleteResult[]>;
  
  // Reactive Operations
  subscribe(query?: QueryOptions): Observable<T[]>;
  subscribeToChanges(): Observable<CollectionChangeEvent<T>>;
  
  // Performance Operations
  count(query?: QueryOptions): Promise<number>;
  exists(id: string): Promise<boolean>;
  createIndex(index: IndexDefinition): Promise<void>;
  
  // Collection management
  getStats(): Promise<CollectionStats>;
  compact(): Promise<void>;
  destroy(): Promise<void>;
}

// Main database provider interface
export interface IDatabaseProvider {
  readonly name: string;
  readonly version: string;
  
  // Lifecycle management
  initialize(config: DatabaseConfig): Promise<void>;
  createCollection<T>(name: string, schema: CollectionSchema): Promise<ICollection<T>>;
  getCollection<T>(name: string): ICollection<T> | null;
  getAllCollections(): Map<string, ICollection<any>>;
  destroy(): Promise<void>;
  
  // Status and health
  isAvailable(): boolean;
  getStatus(): ProviderStatus;
  
  // Backup and restore
  backup(): Promise<string>;
  restore(backupData: string): Promise<void>;
}

// Collection requirements for provider selection
export interface CollectionRequirements {
  collectionsCount: number;
  requiresReactivity: boolean;
  requiresOffline: boolean;
  requiresSync: boolean;
  performanceLevel: 'basic' | 'standard' | 'high';
  storageQuota: number;
}

// Provider factory interface
export interface IDatabaseProviderFactory {
  createProvider(type: string, config: DatabaseConfig): Promise<IDatabaseProvider>;
  registerProvider(name: string, factory: () => IDatabaseProvider): void;
  getAvailableProviders(): string[];
  validateProvider(type: string): boolean;
  selectOptimalProvider(requirements: CollectionRequirements): string;
}

// Error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public collection?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class CollectionError extends DatabaseError {
  constructor(
    message: string,
    public collection: string,
    code: string = 'COLLECTION_ERROR'
  ) {
    super(message, code, undefined, collection);
    this.name = 'CollectionError';
  }
}

export class SchemaValidationError extends DatabaseError {
  constructor(
    message: string,
    public validationErrors: any[],
    collection?: string
  ) {
    super(message, 'SCHEMA_VALIDATION_ERROR', undefined, collection);
    this.name = 'SchemaValidationError';
  }
}