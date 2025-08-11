# Dual-Database Architecture: Implementation Guide

## 1. Overview

This guide provides step-by-step instructions for implementing the Dual-Database Architecture with Enhanced Abstraction layer that supports both PouchDB and RxDB with all 88 collections. The system uses IndexedDB as primary storage with SQLite backup (replacing deprecated WebSQL). The implementation follows a modular approach that ensures maintainability, testability, and seamless provider switching.

## 2. Project Structure

```
src/
├── services/
│   ├── database/
│   │   ├── abstractions/
│   │   │   ├── interfaces/
│   │   │   │   ├── IDatabaseProvider.ts
│   │   │   │   ├── ICollection.ts
│   │   │   │   ├── IQueryBuilder.ts
│   │   │   │   └── IMigrationEngine.ts
│   │   │   ├── DatabaseProviderFactory.ts
│   │   │   ├── CollectionManager.ts
│   │   │   ├── QueryBuilder.ts
│   │   │   └── MigrationEngine.ts
│   │   ├── providers/
│   │   │   ├── pouchdb/
│   │   │   │   ├── PouchDBProvider.ts
│   │   │   │   ├── PouchDBCollection.ts
│   │   │   │   └── PouchDBQueryBuilder.ts
│   │   │   ├── rxdb/
│   │   │   │   ├── RxDBProvider.ts
│   │   │   │   ├── RxDBCollection.ts
│   │   │   │   └── RxDBQueryBuilder.ts
│   │   │   └── index.ts
│   │   ├── schemas/
│   │   │   ├── core/
│   │   │   ├── academics/
│   │   │   ├── administration/
│   │   │   ├── finance/
│   │   │   ├── hr/
│   │   │   ├── inventory/
│   │   │   ├── library/
│   │   │   ├── nutrition/
│   │   │   └── index.ts
│   │   ├── config/
│   │   │   ├── DatabaseConfig.ts
│   │   │   └── ProviderConfig.ts
│   │   └── DatabaseService.ts
│   └── rxdbService.ts (legacy - to be migrated)
├── types/
│   └── database.ts
└── utils/
    ├── schemaValidator.ts
    └── migrationUtils.ts
```

## 3. Step 1: Core Interfaces Implementation

### 3.1 Create Base Interfaces

**File:** **`src/services/database/abstractions/interfaces/IDatabaseProvider.ts`**

```typescript
// ABOUTME: Core database provider interface defining the contract for all database implementations
// ABOUTME: Ensures consistent API across PouchDB, RxDB, and future database providers

import { Observable } from 'rxjs';

export interface DatabaseConfig {
  name: string;
  provider: 'pouchdb' | 'rxdb';
  options: Record<string, any>;
  collections: Record<string, CollectionSchema>;
}

export interface CollectionSchema {
  version: number;
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
  indexes?: IndexDefinition[];
  primaryKey?: string;
}

export interface SchemaProperty {
  type: string;
  format?: string;
  enum?: any[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

export interface IndexDefinition {
  name: string;
  fields: string[];
  unique?: boolean;
  sparse?: boolean;
}

export interface IDatabaseProvider {
  readonly name: string;
  readonly version: string;
  
  initialize(config: DatabaseConfig): Promise<void>;
  createCollection<T>(name: string, schema: CollectionSchema): Promise<ICollection<T>>;
  getCollection<T>(name: string): ICollection<T> | null;
  getAllCollections(): Map<string, ICollection<any>>;
  destroy(): Promise<void>;
  isAvailable(): boolean;
  getStatus(): ProviderStatus;
}

export interface ProviderStatus {
  isConnected: boolean;
  isInitialized: boolean;
  collectionCount: number;
  lastError?: Error;
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  avgQueryTime: number;
  totalQueries: number;
  memoryUsage: number;
  lastUpdated: Date;
}
```

**File:** **`src/services/database/abstractions/interfaces/ICollection.ts`**

```typescript
// ABOUTME: Collection interface providing unified CRUD operations across database providers
// ABOUTME: Supports reactive queries, transactions, and real-time subscriptions

import { Observable } from 'rxjs';

export interface QueryOptions {
  selector?: Record<string, any>;
  sort?: Record<string, 1 | -1>[];
  limit?: number;
  skip?: number;
  fields?: string[];
  populate?: string[];
}

export interface InsertResult<T> {
  id: string;
  rev?: string;
  doc: T;
}

export interface UpdateResult<T> {
  id: string;
  rev?: string;
  doc: T;
  previous?: T;
}

export interface DeleteResult {
  id: string;
  rev?: string;
  deleted: boolean;
}

export interface BulkResult<T> {
  success: InsertResult<T>[];
  errors: BulkError[];
}

export interface BulkError {
  id: string;
  error: string;
  reason: string;
}

export interface ICollection<T> {
  readonly name: string;
  readonly schema: CollectionSchema;
  
  // Basic CRUD Operations
  insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>>;
  insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>>;
  findOne(query: QueryOptions): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  find(query?: QueryOptions): Promise<T[]>;
  update(id: string, update: Partial<T>): Promise<UpdateResult<T>>;
  updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]>;
  remove(id: string): Promise<DeleteResult>;
  removeMany(query: QueryOptions): Promise<DeleteResult[]>;
  
  // Aggregation and Counting
  count(query?: QueryOptions): Promise<number>;
  exists(id: string): Promise<boolean>;
  
  // Reactive Operations
  subscribe(query?: QueryOptions): Observable<T[]>;
  subscribeToChanges(): Observable<CollectionChangeEvent<T>>;
  
  // Indexing and Performance
  createIndex(index: IndexDefinition): Promise<void>;
  dropIndex(indexName: string): Promise<void>;
  getIndexes(): Promise<IndexDefinition[]>;
  
  // Validation and Schema
  validate(doc: Partial<T>): ValidationResult;
  getSchema(): CollectionSchema;
  
  // Utilities
  clear(): Promise<void>;
  getStats(): Promise<CollectionStats>;
}

export interface CollectionChangeEvent<T> {
  type: 'insert' | 'update' | 'delete';
  doc: T;
  previous?: T;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface CollectionStats {
  documentCount: number;
  indexCount: number;
  storageSize: number;
  lastModified: Date;
}
```

## 4. Step 2: Database Provider Factory

**File:** **`src/services/database/abstractions/DatabaseProviderFactory.ts`**

```typescript
// ABOUTME: Factory class for creating and managing database provider instances
// ABOUTME: Handles provider registration, availability checking, and instance creation

import { IDatabaseProvider, DatabaseConfig } from './interfaces/IDatabaseProvider';
import { PouchDBProvider } from '../providers/pouchdb/PouchDBProvider';
import { RxDBProvider } from '../providers/rxdb/RxDBProvider';

type ProviderConstructor = new (config: DatabaseConfig) => IDatabaseProvider;

export class DatabaseProviderFactory {
  private static providers: Map<string, ProviderConstructor> = new Map();
  private static instances: Map<string, IDatabaseProvider> = new Map();
  
  static {
    // Register built-in providers
    this.registerProvider('pouchdb', PouchDBProvider);
    this.registerProvider('rxdb', RxDBProvider);
  }
  
  static registerProvider(name: string, providerClass: ProviderConstructor): void {
    this.providers.set(name, providerClass);
  }
  
  static async createProvider(name: string, config: DatabaseConfig): Promise<IDatabaseProvider> {
    const instanceKey = `${name}_${config.name}`;
    
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey)!;
    }
    
    const ProviderClass = this.providers.get(name);
    if (!ProviderClass) {
      throw new Error(`Database provider '${name}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    
    const provider = new ProviderClass(config);
    
    if (!provider.isAvailable()) {
      throw new Error(`Database provider '${name}' is not available in this environment`);
    }
    
    await provider.initialize(config);
    this.instances.set(instanceKey, provider);
    
    return provider;
  }
  
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(name => {
      try {
        const ProviderClass = this.providers.get(name)!;
        const tempProvider = new ProviderClass({ name: 'test', provider: name as any, options: {}, collections: {} });
        return tempProvider.isAvailable();
      } catch {
        return false;
      }
    });
  }
  
  static getPreferredProvider(): string {
    const available = this.getAvailableProviders();
    
    // Prefer RxDB if license is available
    if (available.includes('rxdb') && this.hasRxDBLicense()) {
      return 'rxdb';
    }
    
    // Fallback to PouchDB
    if (available.includes('pouchdb')) {
      return 'pouchdb';
    }
    
    throw new Error('No database providers available');
  }
  
  private static hasRxDBLicense(): boolean {
    return !!process.env.RXDB_LICENSE_KEY || !!localStorage.getItem('rxdb_license');
  }
  
  static async destroyProvider(name: string, dbName: string): Promise<void> {
    const instanceKey = `${name}_${dbName}`;
    const provider = this.instances.get(instanceKey);
    
    if (provider) {
      await provider.destroy();
      this.instances.delete(instanceKey);
    }
  }
  
  static getProviderInstance(name: string, dbName: string): IDatabaseProvider | null {
    const instanceKey = `${name}_${dbName}`;
    return this.instances.get(instanceKey) || null;
  }
}
```

## 5. Step 3: PouchDB Provider Implementation

**File:** **`src/services/database/providers/pouchdb/PouchDBProvider.ts`**

```typescript
// ABOUTME: PouchDB implementation of the database provider interface
// ABOUTME: Provides immediate database functionality without licensing requirements

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import { IDatabaseProvider, DatabaseConfig, CollectionSchema, ProviderStatus } from '../../abstractions/interfaces/IDatabaseProvider';
import { ICollection } from '../../abstractions/interfaces/ICollection';
import { PouchDBCollection } from './PouchDBCollection';

// Enable PouchDB plugins
PouchDB.plugin(PouchDBFind);

export class PouchDBProvider implements IDatabaseProvider {
  readonly name = 'pouchdb';
  readonly version = '8.0.1';
  
  private db: PouchDB.Database | null = null;
  private collections: Map<string, PouchDBCollection<any>> = new Map();
  private config: DatabaseConfig | null = null;
  private status: ProviderStatus;
  
  constructor(config: DatabaseConfig) {
    this.config = config;
    this.status = {
      isConnected: false,
      isInitialized: false,
      collectionCount: 0,
      performance: {
        avgQueryTime: 0,
        totalQueries: 0,
        memoryUsage: 0,
        lastUpdated: new Date()
      }
    };
  }
  
  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize PouchDB with optimized settings
      this.db = new PouchDB(config.name, {
        adapter: 'idb',
        auto_compaction: config.options.autoCompaction ?? true,
        revs_limit: config.options.revLimit ?? 10,
        ...config.options
      });
      
      // Test connection
      await this.db.info();
      
      // Initialize all collections
      await this.initializeCollections(config.collections);
      
      this.status.isConnected = true;
      this.status.isInitialized = true;
      this.status.collectionCount = this.collections.size;
      
    } catch (error) {
      this.status.lastError = error as Error;
      throw new Error(`Failed to initialize PouchDB: ${(error as Error).message}`);
    }
  }
  
  private async initializeCollections(schemas: Record<string, CollectionSchema>): Promise<void> {
    const initPromises = Object.entries(schemas).map(async ([name, schema]) => {
      try {
        const collection = new PouchDBCollection<any>(this.db!, name, schema);
        await collection.initialize();
        this.collections.set(name, collection);
      } catch (error) {
        console.error(`Failed to initialize collection '${name}':`, error);
        throw error;
      }
    });
    
    await Promise.all(initPromises);
  }
  
  async createCollection<T>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    if (this.collections.has(name)) {
      return this.collections.get(name) as ICollection<T>;
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const collection = new PouchDBCollection<T>(this.db, name, schema);
    await collection.initialize();
    this.collections.set(name, collection);
    
    this.status.collectionCount = this.collections.size;
    
    return collection;
  }
  
  getCollection<T>(name: string): ICollection<T> | null {
    return this.collections.get(name) as ICollection<T> || null;
  }
  
  getAllCollections(): Map<string, ICollection<any>> {
    return new Map(this.collections);
  }
  
  async destroy(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
      this.collections.clear();
      this.status.isConnected = false;
      this.status.isInitialized = false;
      this.status.collectionCount = 0;
    }
  }
  
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }
  
  getStatus(): ProviderStatus {
    return { ...this.status };
  }
}
```

**File:** **`src/services/database/providers/pouchdb/PouchDBCollection.ts`**

```typescript
// ABOUTME: PouchDB-specific collection implementation with CRUD operations and reactive queries
// ABOUTME: Handles document management, indexing, and real-time subscriptions

import PouchDB from 'pouchdb';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import {
  ICollection,
  QueryOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
  BulkResult,
  CollectionChangeEvent,
  ValidationResult,
  CollectionStats
} from '../../abstractions/interfaces/ICollection';
import { CollectionSchema, IndexDefinition } from '../../abstractions/interfaces/IDatabaseProvider';

export class PouchDBCollection<T> implements ICollection<T> {
  readonly name: string;
  readonly schema: CollectionSchema;
  
  private db: PouchDB.Database;
  private validator: Joi.ObjectSchema | null = null;
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private queryCache = new Map<string, BehaviorSubject<T[]>>();
  
  constructor(db: PouchDB.Database, name: string, schema: CollectionSchema) {
    this.db = db;
    this.name = name;
    this.schema = schema;
    this.setupValidator();
  }
  
  async initialize(): Promise<void> {
    // Create indexes defined in schema
    if (this.schema.indexes) {
      for (const index of this.schema.indexes) {
        await this.createIndex(index);
      }
    }
    
    // Set up change listener
    this.db.changes({
      since: 'now',
      live: true,
      include_docs: true,
      filter: (doc) => doc._id.startsWith(`${this.name}:`)
    }).on('change', (change) => {
      this.handleChange(change);
    });
  }
  
  private setupValidator(): void {
    try {
      this.validator = this.convertSchemaToJoi(this.schema);
    } catch (error) {
      console.warn(`Failed to create validator for collection '${this.name}':`, error);
    }
  }
  
  private convertSchemaToJoi(schema: CollectionSchema): Joi.ObjectSchema {
    const joiSchema: Record<string, any> = {};
    
    for (const [key, prop] of Object.entries(schema.properties)) {
      joiSchema[key] = this.convertPropertyToJoi(prop);
    }
    
    let validator = Joi.object(joiSchema);
    
    if (schema.required) {
      validator = validator.required();
    }
    
    return validator;
  }
  
  private convertPropertyToJoi(prop: any): Joi.Schema {
    switch (prop.type) {
      case 'string':
        return Joi.string();
      case 'number':
        return Joi.number();
      case 'boolean':
        return Joi.boolean();
      case 'array':
        return Joi.array();
      case 'object':
        return Joi.object();
      default:
        return Joi.any();
    }
  }
  
  private generateDocId(doc?: Partial<T>): string {
    return `${this.name}:${uuidv4()}`;
  }
  
  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    const validation = this.validate(doc);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    const docWithId = {
      _id: this.generateDocId(),
      ...doc
    } as any;
    
    const result = await this.db.put(docWithId);
    
    const insertedDoc = {
      id: result.id,
      ...doc
    } as T;
    
    this.notifyChange('insert', insertedDoc);
    
    return {
      id: result.id,
      rev: result.rev,
      doc: insertedDoc
    };
  }
  
  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    const docsWithIds = docs.map(doc => ({
      _id: this.generateDocId(),
      ...doc
    }));
    
    const results = await this.db.bulkDocs(docsWithIds);
    
    const success: InsertResult<T>[] = [];
    const errors: any[] = [];
    
    results.forEach((result, index) => {
      if ('error' in result) {
        errors.push({
          id: docsWithIds[index]._id,
          error: result.error,
          reason: result.reason
        });
      } else {
        const doc = { id: result.id, ...docs[index] } as T;
        success.push({
          id: result.id,
          rev: result.rev,
          doc
        });
        this.notifyChange('insert', doc);
      }
    });
    
    return { success, errors };
  }
  
  async findOne(query: QueryOptions): Promise<T | null> {
    const results = await this.find({ ...query, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }
  
  async findById(id: string): Promise<T | null> {
    try {
      const docId = id.startsWith(`${this.name}:`) ? id : `${this.name}:${id}`;
      const doc = await this.db.get(docId);
      return this.transformDoc(doc);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }
  
  async find(query: QueryOptions = {}): Promise<T[]> {
    const findQuery: any = {
      selector: {
        _id: { $regex: `^${this.name}:` },
        ...query.selector
      }
    };
    
    if (query.sort) {
      findQuery.sort = query.sort;
    }
    
    if (query.limit) {
      findQuery.limit = query.limit;
    }
    
    if (query.skip) {
      findQuery.skip = query.skip;
    }
    
    if (query.fields) {
      findQuery.fields = ['_id', '_rev', ...query.fields];
    }
    
    const result = await this.db.find(findQuery);
    return result.docs.map(doc => this.transformDoc(doc));
  }
  
  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    const docId = id.startsWith(`${this.name}:`) ? id : `${this.name}:${id}`;
    const existing = await this.db.get(docId);
    
    const updatedDoc = {
      ...existing,
      ...update,
      _id: existing._id,
      _rev: existing._rev
    };
    
    const validation = this.validate(updatedDoc);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    const result = await this.db.put(updatedDoc);
    
    const transformedDoc = this.transformDoc(updatedDoc);
    const previousDoc = this.transformDoc(existing);
    
    this.notifyChange('update', transformedDoc, previousDoc);
    
    return {
      id: result.id,
      rev: result.rev,
      doc: transformedDoc,
      previous: previousDoc
    };
  }
  
  async updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]> {
    const docs = await this.find(query);
    const updatePromises = docs.map(doc => 
      this.update((doc as any).id || (doc as any)._id, update)
    );
    
    return Promise.all(updatePromises);
  }
  
  async remove(id: string): Promise<DeleteResult> {
    const docId = id.startsWith(`${this.name}:`) ? id : `${this.name}:${id}`;
    const doc = await this.db.get(docId);
    const result = await this.db.remove(doc);
    
    this.notifyChange('delete', this.transformDoc(doc));
    
    return {
      id: result.id,
      rev: result.rev,
      deleted: true
    };
  }
  
  async removeMany(query: QueryOptions): Promise<DeleteResult[]> {
    const docs = await this.find(query);
    const removePromises = docs.map(doc => 
      this.remove((doc as any).id || (doc as any)._id)
    );
    
    return Promise.all(removePromises);
  }
  
  async count(query: QueryOptions = {}): Promise<number> {
    const docs = await this.find(query);
    return docs.length;
  }
  
  async exists(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    return doc !== null;
  }
  
  subscribe(query: QueryOptions = {}): Observable<T[]> {
    const queryKey = JSON.stringify(query);
    
    if (!this.queryCache.has(queryKey)) {
      const subject = new BehaviorSubject<T[]>([]);
      this.queryCache.set(queryKey, subject);
      
      // Initial load
      this.find(query).then(docs => subject.next(docs));
      
      // Update on changes
      this.changeSubject.subscribe(() => {
        this.find(query).then(docs => subject.next(docs));
      });
    }
    
    return this.queryCache.get(queryKey)!.asObservable();
  }
  
  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }
  
  async createIndex(index: IndexDefinition): Promise<void> {
    await this.db.createIndex({
      index: {
        fields: index.fields,
        name: index.name
      }
    });
  }
  
  async dropIndex(indexName: string): Promise<void> {
    const indexes = await this.db.getIndexes();
    const index = indexes.indexes.find(idx => idx.name === indexName);
    
    if (index) {
      await this.db.deleteIndex(index);
    }
  }
  
  async getIndexes(): Promise<IndexDefinition[]> {
    const result = await this.db.getIndexes();
    return result.indexes
      .filter(idx => idx.name !== '_all_docs')
      .map(idx => ({
        name: idx.name!,
        fields: idx.def.fields.map(f => typeof f === 'string' ? f : Object.keys(f)[0]),
        unique: false,
        sparse: false
      }));
  }
  
  validate(doc: Partial<T>): ValidationResult {
    if (!this.validator) {
      return { isValid: true, errors: [] };
    }
    
    const result = this.validator.validate(doc, { abortEarly: false });
    
    if (result.error) {
      return {
        isValid: false,
        errors: result.error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      };
    }
    
    return { isValid: true, errors: [] };
  }
  
  getSchema(): CollectionSchema {
    return this.schema;
  }
  
  async clear(): Promise<void> {
    const docs = await this.find();
    const deletePromises = docs.map(doc => 
      this.remove((doc as any).id || (doc as any)._id)
    );
    
    await Promise.all(deletePromises);
  }
  
  async getStats(): Promise<CollectionStats> {
    const docs = await this.find();
    const indexes = await this.getIndexes();
    
    return {
      documentCount: docs.length,
      indexCount: indexes.length,
      storageSize: 0, // PouchDB doesn't provide this easily
      lastModified: new Date()
    };
  }
  
  private transformDoc(doc: any): T {
    const { _id, _rev, ...rest } = doc;
    return {
      id: _id,
      ...rest
    } as T;
  }
  
  private notifyChange(type: 'insert' | 'update' | 'delete', doc: T, previous?: T): void {
    this.changeSubject.next({
      type,
      doc,
      previous,
      timestamp: new Date()
    });
  }
  
  private handleChange(change: any): void {
    if (change.doc && change.doc._id.startsWith(`${this.name}:`)) {
      const doc = this.transformDoc(change.doc);
      
      if (change.deleted) {
        this.notifyChange('delete', doc);
      } else {
        this.notifyChange('update', doc);
      }
    }
  }
}
```

## 6. Step 4: Collection Schemas Definition

**File:** **`src/services/database/schemas/index.ts`**

```typescript
// ABOUTME: Central registry for all 88 collection schemas across all modules
// ABOUTME: Provides type-safe schema definitions and validation rules

import { CollectionSchema } from '../abstractions/interfaces/IDatabaseProvider';

// Core Collections (16)
import {
  userSchema,
  rbacRoleSchema,
  permissionSchema,
  userRoleSchema,
  academicYearSchema,
  classSchema,
  studentSchema,
  staffSchema,
  subjectSchema,
  timetableEntrySchema,
  studentExamResultSchema,
  appSettingsSchema,
  schoolDetailsSchema,
  auditLogSchema,
  workflowSchema,
  workflowStateSchema
} from './core';

// Extended Collections by Module
import { administrationSchemas } from './administration';
import { academicsSchemas } from './academics';
import { financeSchemas } from './finance';
import { hrSchemas } from './hr';
import { inventorySchemas } from './inventory';
import { librarySchemas } from './library';
import { nutritionSchemas } from './nutrition';

// Core Collections (16)
export const coreCollections: Record<string, CollectionSchema> = {
  // User Management (4)
  users: userSchema,
  rbac_roles: rbacRoleSchema,
  permissions: permissionSchema,
  user_roles: userRoleSchema,
  
  // Academic Structure (4)
  academic_years: academicYearSchema,
  classes: classSchema,
  students: studentSchema,
  staff: staffSchema,
  
  // Academic Operations (3)
  subjects: subjectSchema,
  timetable_entries: timetableEntrySchema,
  student_exam_results: studentExamResultSchema,
  
  // System (5)
  app_settings: appSettingsSchema,
  school_details: schoolDetailsSchema,
  audit_logs: auditLogSchema,
  workflows: workflowSchema,
  workflow_states: workflowStateSchema
};

// All 88 Collections
export const allCollections: Record<string, CollectionSchema> = {
  ...coreCollections,
  ...administrationSchemas,
  ...academicsSchemas,
  ...financeSchemas,
  ...hrSchemas,
  ...inventorySchemas,
  ...librarySchemas,
  ...nutritionSchemas
};

// Collection Categories
export const collectionCategories = {
  core: Object.keys(coreCollections),
  administration: Object.keys(administrationSchemas),
  academics: Object.keys(academicsSchemas),
  finance: Object.keys(financeSchemas),
  hr: Object.keys(hrSchemas),
  inventory: Object.keys(inventorySchemas),
  library: Object.keys(librarySchemas),
  nutrition: Object.keys(nutritionSchemas)
};

// Validation
export function validateCollectionCount(): void {
  const totalCollections = Object.keys(allCollections).length;
  
  if (totalCollections !== 88) {
    throw new Error(`Expected 88 collections, but found ${totalCollections}`);
  }
  
  console.log(`✅ All ${totalCollections} collections validated successfully`);
}

// Get collections by category
export function getCollectionsByCategory(category: keyof typeof collectionCategories): Record<string, CollectionSchema> {
  const collectionNames = collectionCategories[category];
  const result: Record<string, CollectionSchema> = {};
  
  for (const name of collectionNames) {
    result[name] = allCollections[name];
  }
  
  return result;
}

// Get collection schema by name
export function getCollectionSchema(name: string): CollectionSchema | null {
  return allCollections[name] || null;
}

// Check if collection exists
export function hasCollection(name: string): boolean {
  return name in allCollections;
}
```

## 7. Step 5: Enhanced Database Service

**File:** **`src/services/database/DatabaseService.ts`**

```typescript
// ABOUTME: Main database service providing unified access to all collections through Enhanced Abstraction
// ABOUTME: Handles provider switching, configuration management, and service lifecycle

import { Observable, BehaviorSubject } from 'rxjs';
import { IDatabaseProvider, DatabaseConfig } from './abstractions/interfaces/IDatabaseProvider';
import { ICollection } from './abstractions/interfaces/ICollection';
import { DatabaseProviderFactory } from './abstractions/DatabaseProviderFactory';
import { allCollections, validateCollectionCount } from './schemas';
import { ConfigurationManager } from './config/DatabaseConfig';

export interface DatabaseServiceStatus {
  isInitialized: boolean;
  currentProvider: string;
  collectionCount: number;
  availableProviders: string[];
  lastError?: Error;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private provider: IDatabaseProvider | null = null;
  private config: DatabaseConfig | null = null;
  private statusSubject = new BehaviorSubject<DatabaseServiceStatus>({
    isInitialized: false,
    currentProvider: '',
    collectionCount: 0,
    availableProviders: []
  });
  
  private constructor() {
    // Validate collection count on startup
    validateCollectionCount();
  }
  
  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }
  
  async initialize(customConfig?: Partial<DatabaseConfig>): Promise<void> {
    try {
      // Load configuration
      const configManager = ConfigurationManager.getInstance();
      this.config = configManager.loadConfig(customConfig);
      
      // Create and initialize provider
      this.provider = await DatabaseProviderFactory.createProvider(
        this.config.provider,
        this.config
      );
      
      // Update status
      this.updateStatus({
        isInitialized: true,
        currentProvider: this.config.provider,
        collectionCount: Object.keys(allCollections).length,
        availableProviders: DatabaseProviderFactory.getAvailableProviders()
      });
      
      console.log(`✅ Database service initialized with ${this.config.provider} provider`);
      console.log(`📊 ${Object.keys(allCollections).length} collections available`);
      
    } catch (error) {
      this.updateStatus({
        isInitialized: false,
        currentProvider: '',
        collectionCount: 0,
        availableProviders: DatabaseProviderFactory.getAvailableProviders(),
        lastError: error as Error
      });
      
      throw new Error(`Failed to initialize database service: ${(error as Error).message}`);
    }
  }
  
  getCollection<T>(name: string): ICollection<T> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    
    const collection = this.provider.getCollection<T>(name);
    if (!collection) {
      throw new Error(`Collection '${name}' not found. Available collections: ${this.getAvailableCollections().join(', ')}`);
    }
    
    return collection;
  }
  
  getAllCollections(): Map<string, ICollection<any>> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    
    return this.provider.getAllCollections();
  }
  
  getAvailableCollections(): string[] {
    if (!this.provider) {
      return [];
    }
    
    return Array.from(this.provider.getAllCollections().keys());
  }
  
  async switchProvider(newProviderName: string, migrateData: boolean = true): Promise<void> {
    if (!this.config) {
      throw new Error('Database service not initialized');
    }
    
    if (newProviderName === this.config.provider) {
      console.log(`Already using ${newProviderName} provider`);
      return;
    }
    
    console.log(`🔄 Switching from ${this.config.provider} to ${newProviderName}...`);
    
    try {
      // Create new provider
      const newConfig = { ...this.config, provider: newProviderName as any };
      const newProvider = await DatabaseProviderFactory.createProvider(newProviderName, newConfig);
      
      // Migrate data if requested
      if (migrateData && this.provider) {
        await this.migrateData(this.provider, newProvider);
      }
      
      // Destroy old provider
      if (this.provider) {
        await this.provider.destroy();
      }
      
      // Switch to new provider
      this.provider = newProvider;
      this.config = newConfig;
      
      // Update configuration
      const configManager = ConfigurationManager.getInstance();
      configManager.updateConfig({ provider: newProviderName as any });
      
      // Update status
      this.updateStatus({
        isInitialized: true,
        currentProvider: newProviderName,
        collectionCount: Object.keys(allCollections).length,
        availableProviders: DatabaseProviderFactory.getAvailableProviders()
      });
      
      console.log(`✅ Successfully switched to ${newProviderName} provider`);
      
    } catch (error) {
      this.updateStatus({
        isInitialized: false,
        currentProvider: '',
        collectionCount: 0,
        availableProviders: DatabaseProviderFactory.getAvailableProviders(),
        lastError: error as Error
      });
      
      throw new Error(`Failed to switch provider: ${(error as Error).message}`);
    }
  }
  
  private async migrateData(fromProvider: IDatabaseProvider, toProvider: IDatabaseProvider): Promise<void> {
    console.log('🚀 Starting data migration...');
    
    const fromCollections = fromProvider.getAllCollections();
    const migrationPromises: Promise<void>[] = [];
    
    for (const [name, fromCollection] of fromCollections) {
      migrationPromises.push(this.migrateCollection(name, fromCollection, toProvider));
    }
    
    await Promise.all(migrationPromises);
    console.log('✅ Data migration completed');
  }
  
  private async migrateCollection(
    name: string,
    fromCollection: ICollection<any>,
    toProvider: IDatabaseProvider
  ): Promise<void> {
    try {
      // Get all documents from source collection
      const docs = await fromCollection.find();
      
      if (docs.length === 0) {
        console.log(`📝 Collection '${name}' is empty, skipping migration`);
        return;
      }
      
      // Get or create target collection
      const toCollection = toProvider.getCollection(name) || 
        await toProvider.createCollection(name, fromCollection.getSchema());
      
      // Insert documents in batches
      const batchSize = 100;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        await toCollection.insertMany(batch.map(doc => {
          const { id, ...rest } = doc as any;
          return rest;
        }));
      }
      
      console.log(`✅ Migrated ${docs.length} documents from collection '${name}'`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate collection '${name}':`, error);
      throw error;
    }
  }
  
  getStatus(): DatabaseServiceStatus {
    return this.statusSubject.value;
  }
  
  subscribeToStatus(): Observable<DatabaseServiceStatus> {
    return this.statusSubject.asObservable();
  }
  
  private updateStatus(update: Partial<DatabaseServiceStatus>): void {
    const currentStatus = this.statusSubject.value;
    this.statusSubject.next({ ...currentStatus, ...update });
  }
  
  async destroy(): Promise<void> {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
      this.config = null;
      
      this.updateStatus({
        isInitialized: false,
        currentProvider: '',
        collectionCount: 0,
        availableProviders: []
      });
    }
  }
  
  // Convenience methods for common operations
  async backup(): Promise<any> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    
    const backup: Record<string, any[]> = {};
    const collections = this.provider.getAllCollections();
    
    for (const [name, collection] of collections) {
      backup[name] = await collection.find();
    }
    
    return backup;
  }
  
  async restore(backup: Record<string, any[]>): Promise<void> {
    if (!this.provider) {
      throw new Error('Database service not initialized');
    }
    
    for (const [name, docs] of Object.entries(backup)) {
      const collection = this.provider.getCollection(name);
      if (collection) {
        await collection.clear();
        if (docs.length > 0) {
          await collection.insertMany(docs.map(doc => {
            const { id, ...rest } = doc;
            return rest;
          }));
        }
      }
    }
  }
  
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.provider) {
        return false;
      }
      
      const status = this.provider.getStatus();
      return status.isConnected && status.isInitialized;
      
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
```

## 8. Step 6: Integration with Existing Code

**File:** **`src/services/rxdbService.ts`** **(Updated)**

```typescript
// ABOUTME: Legacy RxDB service updated to use Enhanced Abstraction layer
// ABOUTME: Provides backward compatibility while leveraging new dual-database architecture

import { databaseService } from './database/DatabaseService';
import { ICollection } from './database/abstractions/interfaces/ICollection';

// Legacy interface compatibility
export interface LegacyCollection<T> {
  insert: (doc: Omit<T, 'id'>) => Promise<T>;
  find: (query?: any) => Promise<T[]>;
  findOne: (query: any) => Promise<T | null>;
  update: (id: string, update: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<boolean>;
  count: (query?: any) => Promise<number>;
}

class LegacyRxDBService {
  private initialized = false;
  
  async initializeDatabase(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      await databaseService.initialize();
      this.initialized = true;
      console.log('✅ Legacy RxDB service initialized with Enhanced Abstraction');
    } catch (error) {
      console.error('❌ Failed to initialize legacy RxDB service:', error);
      throw error;
    }
  }
  
  getDatabase(): any {
    // Return a proxy object that provides legacy API
    return {
      collections: new Proxy({}, {
        get: (target, prop: string) => {
          return this.getLegacyCollection(prop);
        }
      })
    };
  }
  
  private getLegacyCollection<T>(name: string): LegacyCollection<T> {
    const collection = databaseService.getCollection<T>(name);
    
    return {
      insert: async (doc: Omit<T, 'id'>) => {
        const result = await collection.insert(doc);
        return result.doc;
      },
      
      find: async (query?: any) => {
        return collection.find(query || {});
      },
      
      findOne: async (query: any) => {
        return collection.findOne(query);
      },
      
      update: async (id: string, update: Partial<T>) => {
        const result = await collection.update(id, update);
        return result.doc;
      },
      
      remove: async (id: string) => {
        const result = await collection.remove(id);
        return result.deleted;
      },
      
      count: async (query?: any) => {
        return collection.count(query || {});
      }
    };
  }
  
  isDatabaseAvailable(): boolean {
    return databaseService.getStatus().isInitialized;
  }
  
  getDatabaseError(): Error | null {
    return databaseService.getStatus().lastError || null;
  }
  
  async clearDatabase(): Promise<void> {
    const collections = databaseService.getAllCollections();
    const clearPromises = Array.from(collections.values()).map(collection => 
      collection.clear()
    );
    await Promise.all(clearPromises);
  }
}

// Export singleton instance for backward compatibility
export const rxdbService = new LegacyRxDBService();

// Legacy exports
export const initializeDatabase = () => rxdbService.initializeDatabase();
export const getDatabase = () => rxdbService.getDatabase();
export const isDatabaseAvailable = () => rxdbService.isDatabaseAvailable();
export const getDatabaseError = () => rxdbService.getDatabaseError();
export const clearDatabase = () => rxdbService.clearDatabase();
```

## 9. Step 7: Testing Implementation

**File:** **`src/services/database/__tests__/DatabaseService.test.ts`**

```typescript
// ABOUTME: Comprehensive tests for Enhanced Abstraction layer functionality
// ABOUTME: Covers provider switching, collection operations, and data migration

import { DatabaseService } from '../DatabaseService';
import { DatabaseProviderFactory } from '../abstractions/DatabaseProviderFactory';
import { allCollections } from '../schemas';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  
  beforeEach(() => {
    databaseService = DatabaseService.getInstance();
  });
  
  afterEach(async () => {
    await databaseService.destroy();
  });
  
  describe('Initialization', () => {
    it('should initialize with PouchDB provider by default', async () => {
      await databaseService.initialize();
      
      const status = databaseService.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.currentProvider).toBe('pouchdb');
      expect(status.collectionCount).toBe(88);
    });
    
    it('should initialize all 88 collections', async () => {
      await databaseService.initialize();
      
      const availableCollections = databaseService.getAvailableCollections();
      expect(availableCollections).toHaveLength(88);
      
      // Verify all expected collections are present
      const expectedCollections = Object.keys(allCollections);
      for (const collectionName of expectedCollections) {
        expect(availableCollections).toContain(collectionName);
      }
    });
  });
  
  describe('Collection Operations', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });
    
    it('should perform CRUD operations on collections', async () => {
      const usersCollection = databaseService.getCollection('users');
      
      // Insert
      const insertResult = await usersCollection.insert({
        email: 'test@example.com',
        name: 'Test User',
        role: 'teacher'
      });
      
      expect(insertResult.doc).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: 'teacher'
      });
      
      // Find
      const users = await usersCollection.find();
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        email: 'test@example.com',
        name: 'Test User'
      });
      
      // Update
      const updateResult = await usersCollection.update(insertResult.id, {
        name: 'Updated User'
      });
      
      expect(updateResult.doc.name).toBe('Updated User');
      
      // Delete
      const deleteResult = await usersCollection.remove(insertResult.id);
      expect(deleteResult.deleted).toBe(true);
      
      // Verify deletion
      const usersAfterDelete = await usersCollection.find();
      expect(usersAfterDelete).toHaveLength(0);
    });
    
    it('should support reactive queries', (done) => {
      const studentsCollection = databaseService.getCollection('students');
      
      const subscription = studentsCollection.subscribe().subscribe(students => {
        if (students.length === 1) {
          expect(students[0]).toMatchObject({
            firstName: 'John',
            lastName: 'Doe'
          });
          subscription.unsubscribe();
          done();
        }
      });
      
      // Insert a student to trigger the subscription
      studentsCollection.insert({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2005-01-01',
        gender: 'male',
        classId: 'class-1'
      });
    });
  });
  
  describe('Provider Switching', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });
    
    it('should switch providers while preserving data', async () => {
      // Insert test data
      const usersCollection = databaseService.getCollection('users');
      await usersCollection.insert({
        email: 'test@example.com',
        name: 'Test User',
        role: 'teacher'
      });
      
      // Verify data exists
      let users = await usersCollection.find();
      expect(users).toHaveLength(1);
      
      // Switch provider (if RxDB is available)
      const availableProviders = DatabaseProviderFactory.getAvailableProviders();
      if (availableProviders.includes('rxdb')) {
        await databaseService.switchProvider('rxdb', true);
        
        // Verify provider switched
        const status = databaseService.getStatus();
        expect(status.currentProvider).toBe('rxdb');
        
        // Verify data was migrated
        const usersCollectionAfterSwitch = databaseService.getCollection('users');
        users = await usersCollectionAfterSwitch.find();
        expect(users).toHaveLength(1);
        expect(users[0]).toMatchObject({
          email: 'test@example.com',
          name: 'Test User'
        });
      }
    });
  });
  
  describe('Backup and Restore', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });
    
    it('should backup and restore data', async () => {
      // Insert test data
      const usersCollection = databaseService.getCollection('users');
      const studentsCollection = databaseService.getCollection('students');
      
      await usersCollection.insert({
        email: 'test@example.com',
        name: 'Test User',
        role: 'teacher'
      });
      
      await studentsCollection.insert({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2005-01-01',
        gender: 'male',
        classId: 'class-1'
      });
      
      // Create backup
      const backup = await databaseService.backup();
      expect(backup.users).toHaveLength(1);
      expect(backup.students).toHaveLength(1);
      
      // Clear data
      await databaseService.clearDatabase();
      
      // Verify data is cleared
      let users = await usersCollection.find();
      let students = await studentsCollection.find();
      expect(users).toHaveLength(0);
      expect(students).toHaveLength(0);
      
      // Restore from backup
      await databaseService.restore(backup);
      
      // Verify data is restored
      users = await usersCollection.find();
      students = await studentsCollection.find();
      expect(users).toHaveLength(1);
      expect(students).toHaveLength(1);
    });
  });
  
  describe('Health Check', () => {
    it('should return false when not initialized', async () => {
      const isHealthy = await databaseService.healthCheck();
      expect(isHealthy).toBe(false);
    });
    
    it('should return true when properly initialized', async () => {
      await databaseService.initialize();
      const isHealthy = await databaseService.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });
});
```

## 10. Step 8: Configuration and Deployment

**File:** **`src/services/database/config/DatabaseConfig.ts`**

```typescript
// ABOUTME: Configuration management for database providers and Enhanced Abstraction layer
// ABOUTME: Handles environment-specific settings, provider selection, and runtime configuration

import { DatabaseConfig } from '../abstractions/interfaces/IDatabaseProvider';
import { allCollections } from '../schemas';
import { DatabaseProviderFactory } from '../abstractions/DatabaseProviderFactory';

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: DatabaseConfig | null = null;
  
  static getInstance(): ConfigurationManager {
    if (!this.instance) {
      this.instance = new ConfigurationManager();
    }
    return this.instance;
  }
  
  loadConfig(customConfig?: Partial<DatabaseConfig>): DatabaseConfig {
    const defaultConfig: DatabaseConfig = {
      name: this.getDatabaseName(),
      provider: this.getPreferredProvider(),
      collections: allCollections,
      options: this.getDefaultOptions()
    };
    
    this.config = {
      ...defaultConfig,
      ...this.loadEnvironmentConfig(),
      ...this.loadUserConfig(),
      ...customConfig
    };
    
    this.validateConfig(this.config);
    return this.config;
  }
  
  private getDatabaseName(): string {
    return process.env.DATABASE_NAME || 
           localStorage.getItem('database_name') || 
           'schoolpilot_db';
  }
  
  private getPreferredProvider(): 'pouchdb' | 'rxdb' {
    // Check environment variable first
    const envProvider = process.env.DATABASE_PROVIDER;
    if (envProvider === 'rxdb' || envProvider === 'pouchdb') {
      return envProvider;
    }
    
    // Check user preference
    const userProvider = localStorage.getItem('preferred_database_provider');
    if (userProvider === 'rxdb' || userProvider === 'pouchdb') {
      return userProvider;
    }
    
    // Use factory to determine best available provider
    return DatabaseProviderFactory.getPreferredProvider() as 'pouchdb' | 'rxdb';
  }
  
  private getDefaultOptions(): Record<string, any> {
    return {
      autoCompaction: true,
      revLimit: 10,
      adapter: 'idb',
      multiInstance: false,
      ignoreDuplicate: true
    };
  }
  
  private loadEnvironmentConfig(): Partial<DatabaseConfig> {
    const config: Partial<DatabaseConfig> = {};
    
    if (process.env.DATABASE_AUTO_COMPACTION) {
      config.options = {
        ...config.options,
        autoCompaction: process.env.DATABASE_AUTO_COMPACTION === 'true'
      };
    }
    
    return config;
  }
  
  private loadUserConfig(): Partial<DatabaseConfig> {
    try {
      const userConfigStr = localStorage.getItem('database_config');
      if (userConfigStr) {
        return JSON.parse(userConfigStr);
      }
    } catch (error) {
      console.warn('Failed to load user database config:', error);
    }
    
    return {};
  }
  
  private validateConfig(config: DatabaseConfig): void {
    if (!config.name) {
      throw new Error('Database name is required');
    }
    
    if (!['pouchdb', 'rxdb'].includes(config.provider)) {
      throw new Error(`Invalid provider: ${config.provider}`);
    }
    
    if (!config.collections || Object.keys(config.collections).length === 0) {
      throw new Error('At least one collection must be defined');
    }
    
    // Validate collection schemas
    for (const [name, schema] of Object.entries(config.collections)) {
      if (!schema.version || !schema.properties) {
        throw new Error(`Invalid schema for collection '${name}'`);
      }
    }
  }
  
  updateConfig(updates: Partial<DatabaseConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    
    this.config = { ...this.config, ...updates };
    this.validateConfig(this.config);
    
    // Save user preferences
    if (updates.provider) {
      localStorage.setItem('preferred_database_provider', updates.provider);
    }
    
    if (updates.name) {
      localStorage.setItem('database_name', updates.name);
    }
    
    // Save full config
    localStorage.setItem('database_config', JSON.stringify(this.config));
  }
  
  getConfig(): DatabaseConfig | null {
    return this.config;
  }
  
  resetConfig(): void {
    localStorage.removeItem('database_config');
    localStorage.removeItem('preferred_database_provider');
    localStorage.removeItem('database_name');
    this.config = null;
  }
}

## 11. Step 9: Environment Configuration

**File: `.env.example`**

```bash
# Database Configuration
DATABASE_NAME=schoolpilot_db
DATABASE_PROVIDER=pouchdb
DATABASE_AUTO_COMPACTION=true

# RxDB License (if available)
RXDB_LICENSE_KEY=your_license_key_here

# Development Settings
NODE_ENV=development
VITE_DATABASE_DEBUG=true
```

**File: `vite.config.ts` (Updated)**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@database': resolve(__dirname, 'src/services/database')
    }
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    include: [
      'pouchdb',
      'pouchdb-find',
      'rxjs',
      'joi',
      'uuid'
    ]
  }
});
```

## 12. Step 10: Migration from Legacy System

**File: `src/services/database/migration/LegacyMigration.ts`**

```typescript
// ABOUTME: Migration utilities for transitioning from legacy RxDB service to Enhanced Abstraction
// ABOUTME: Handles data migration, schema updates, and backward compatibility

import { databaseService } from '../DatabaseService';
import { rxdbService as legacyService } from '../../rxdbService';

export class LegacyMigration {
  static async migrateFromLegacy(): Promise<void> {
    console.log('🚀 Starting migration from legacy RxDB service...');
    
    try {
      // Initialize legacy service
      await legacyService.initializeDatabase();
      const legacyDb = legacyService.getDatabase();
      
      // Initialize new service
      await databaseService.initialize();
      
      // Get all legacy collections
      const legacyCollections = Object.keys(legacyDb.collections);
      
      for (const collectionName of legacyCollections) {
        await this.migrateCollection(collectionName, legacyDb, databaseService);
      }
      
      console.log('✅ Legacy migration completed successfully');
      
    } catch (error) {
      console.error('❌ Legacy migration failed:', error);
      throw error;
    }
  }
  
  private static async migrateCollection(
    name: string,
    legacyDb: any,
    newService: typeof databaseService
  ): Promise<void> {
    try {
      const legacyCollection = legacyDb.collections[name];
      const newCollection = newService.getCollection(name);
      
      // Get all documents from legacy collection
      const docs = await legacyCollection.find().exec();
      
      if (docs.length === 0) {
        console.log(`📝 Collection '${name}' is empty, skipping migration`);
        return;
      }
      
      // Transform and insert documents
      const transformedDocs = docs.map((doc: any) => {
        const { _id, _rev, ...data } = doc.toJSON();
        return data;
      });
      
      await newCollection.insertMany(transformedDocs);
      
      console.log(`✅ Migrated ${docs.length} documents from collection '${name}'`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate collection '${name}':`, error);
      throw error;
    }
  }
}
```

## 13. Best Practices and Guidelines

### 13.1 Performance Optimization

1. **Indexing Strategy**
   - Create indexes for frequently queried fields
   - Use compound indexes for multi-field queries
   - Monitor query performance and add indexes as needed

2. **Batch Operations**
   - Use `insertMany()` for bulk inserts
   - Implement pagination for large result sets
   - Use streaming for real-time data

3. **Memory Management**
   - Dispose of subscriptions properly
   - Clear query cache when appropriate
   - Monitor memory usage in development

### 13.2 Error Handling

1. **Graceful Degradation**
   - Implement fallback mechanisms
   - Handle provider unavailability
   - Provide meaningful error messages

2. **Retry Logic**
   - Implement exponential backoff
   - Handle network failures
   - Log errors for debugging

### 13.3 Testing Strategy

1. **Unit Tests**
   - Test each provider implementation
   - Mock external dependencies
   - Test error scenarios

2. **Integration Tests**
   - Test provider switching
   - Test data migration
   - Test real-world scenarios

3. **Performance Tests**
   - Benchmark query performance
   - Test with large datasets
   - Monitor memory usage

## 14. Troubleshooting Guide

### 14.1 Common Issues

**Issue: Provider not available**
```typescript
// Check available providers
const available = DatabaseProviderFactory.getAvailableProviders();
console.log('Available providers:', available);

// Use fallback provider
if (!available.includes('rxdb')) {
  console.warn('RxDB not available, falling back to PouchDB');
}
```

**Issue: Collection not found**
```typescript
// Verify collection exists
const collections = databaseService.getAvailableCollections();
if (!collections.includes('users')) {
  console.error('Users collection not found');
}
```

**Issue: Migration failures**
```typescript
// Enable detailed logging
process.env.DATABASE_DEBUG = 'true';

// Check migration status
const status = databaseService.getStatus();
console.log('Migration status:', status);
```

### 14.2 Performance Issues

1. **Slow Queries**
   - Add appropriate indexes
   - Optimize query selectors
   - Use pagination for large results

2. **Memory Leaks**
   - Unsubscribe from observables
   - Clear unused query cache
   - Monitor subscription count

3. **Storage Issues**
   - Implement data archiving
   - Use compression for large documents
   - Monitor storage usage

## 15. Next Steps

1. **Implement Core Interfaces** (Week 1)
   - Create all interface definitions
   - Set up project structure
   - Implement basic factory pattern

2. **PouchDB Provider** (Week 2-3)
   - Complete PouchDB implementation
   - Add comprehensive testing
   - Optimize performance

3. **Enhanced Database Service** (Week 4-5)
   - Implement service layer
   - Add configuration management
   - Create migration utilities

4. **RxDB Provider** (Week 6-7)
   - Implement RxDB provider
   - Add license validation
   - Test provider switching

5. **Integration and Testing** (Week 8-9)
   - Integrate with existing codebase
   - Comprehensive testing
   - Performance optimization

6. **Documentation and Deployment** (Week 10)
   - Complete documentation
   - Deployment configuration
   - Training and handover

This implementation guide provides a comprehensive roadmap for implementing the Enhanced Abstraction layer with dual-database support. Follow the steps sequentially and test thoroughly at each stage to ensure a robust and maintainable solution.
```

