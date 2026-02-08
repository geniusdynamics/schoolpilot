# Data Layer Strategy & Architecture

## Executive Summary

This document outlines the unified data layer strategy that supports all deployment modes while maintaining offline-first capabilities, real-time synchronization, and seamless provider switching.

**Core Principle:** One unified API, multiple storage backends, zero data loss.

---

## Current State Analysis

### Existing Implementations

| Technology | Purpose | Status | Issues |
|------------|---------|--------|--------|
| RxDB | Reactive queries | Active | 16 collection limit in free version |
| PouchDB | Offline-first sync | Active | No collection limits, mature sync |
| SQLite OPFS | Standalone storage | Active | File-based, no native sync |
| LiveStore | Reactive SQLite | Experimental | New technology, limited adoption |
| Mock Data | Development | Active | Not for production |

### Problems with Current Approach

1. **Parallel Implementations**
   - Different APIs for each provider
   - Code duplication across providers
   - Inconsistent error handling

2. **Sync Complexity**
   - RxDB and PouchDB have different sync protocols
   - LiveStore uses different reactive model
   - No unified conflict resolution

3. **Deployment Mode Confusion**
   - Hard to switch between modes
   - Data migration paths unclear
   - Configuration scattered

---

## Target Architecture

### Unified Data Service (UDS)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                            │
│                                                                     │
│   useStudents()    useAttendance()    useFeeTransactions()         │
│        │                  │                    │                    │
│        └──────────────────┼────────────────────┘                    │
│                           ▼                                         │
│              ┌─────────────────────────────┐                        │
│              │    Unified Data Hooks       │                        │
│              │  - Caching                  │                        │
│              │  - Optimistic updates       │                        │
│              │  - Error handling           │                        │
│              └─────────────┬───────────────┘                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED DATA SERVICE (UDS)                       │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │  Core API                                               │      │
│   │   - find(), findOne(), create(), update(), delete()    │      │
│   │   - subscribe() - real-time observable                 │      │
│   │   - transaction() - ACID operations                    │      │
│   │   - sync() - manual sync trigger                       │      │
│   └─────────────────────────────────────────────────────────┘      │
│                             │                                       │
│   ┌─────────────────────────┼─────────────────────────┐             │
│   │                         │                         │             │
│   ▼                         ▼                         ▼             │
│ ┌──────────┐         ┌──────────┐         ┌──────────────────┐     │
│ │  Local   │         │   Sync   │         │     Remote       │     │
│ │ Storage  │◄───────►│  Engine  │◄───────►│     API          │     │
│ └──────────┘         └──────────┘         └──────────────────┘     │
│      │                      │                      │                │
│      ▼                      ▼                      ▼                │
│ ┌──────────┐         ┌──────────┐         ┌──────────────────┐     │
│ │SQLite    │         │PouchDB   │         │REST API          │     │
│ │IndexedDB │         │WebRTC    │         │GraphQL           │     │
│ │OPFS      │         │WebSocket │         │ERPNext API       │     │
│ └──────────┘         └──────────┘         └──────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Interfaces

### Data Provider Interface

```typescript
// src/services/data/types.ts

interface DataProvider {
  readonly name: string;
  readonly version: string;
  readonly capabilities: ProviderCapabilities;
  
  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  destroy(): Promise<void>;
  
  // CRUD Operations
  find<T>(
    collection: string, 
    query: Query
  ): Promise<PaginatedResult<T>>;
  
  findOne<T>(
    collection: string, 
    id: string
  ): Promise<T | null>;
  
  create<T>(
    collection: string, 
    data: Omit<T, 'id'>,
    options?: WriteOptions
  ): Promise<T>;
  
  update<T>(
    collection: string, 
    id: string, 
    data: Partial<T>,
    options?: WriteOptions
  ): Promise<T>;
  
  delete(
    collection: string, 
    id: string,
    options?: WriteOptions
  ): Promise<void>;
  
  // Real-time subscriptions
  subscribe<T>(
    collection: string, 
    query: Query
  ): Observable<T[]>;
  
  // Bulk operations
  bulkCreate<T>(collection: string, data: T[]): Promise<T[]>;
  bulkUpdate<T>(collection: string, updates: BulkUpdate<T>[]): Promise<T[]>;
  bulkDelete(collection: string, ids: string[]): Promise<void>;
  
  // Transactions
  transaction<T>(operations: Operation[]): Promise<T>;
  
  // Sync (if supported)
  sync?(): Promise<SyncResult>;
  getPendingChanges?(): Promise<Change[]>;
  
  // Utilities
  count(collection: string, query?: Query): Promise<number>;
  aggregate(collection: string, pipeline: AggregatePipeline): Promise<any>;
  export?(): Promise<Blob>;
  import?(data: Blob): Promise<void>;
}

interface ProviderCapabilities {
  realtime: boolean;        // Supports subscriptions
  sync: boolean;           // Supports remote sync
  transactions: boolean;   // Supports ACID transactions
  offline: boolean;        // Works without network
  encryption: boolean;     // Supports data encryption
  fullTextSearch: boolean; // Supports text search
  relations: boolean;      // Supports foreign keys
}
```

### Query Interface

```typescript
interface Query {
  // Filtering
  filter?: Filter;
  
  // Sorting
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  
  // Pagination
  pagination?: {
    page: number;
    pageSize: number;
  };
  
  // Projection
  select?: string[];
  
  // Relations
  include?: Array<{
    collection: string;
    localField: string;
    foreignField: string;
    as: string;
  }>;
}

interface Filter {
  [field: string]: 
    | { $eq: any }
    | { $ne: any }
    | { $gt: number }
    | { $gte: number }
    | { $lt: number }
    | { $lte: number }
    | { $in: any[] }
    | { $nin: any[] }
    | { $contains: string }  // Text search
    | { $startsWith: string }
    | { $endsWith: string }
    | { $exists: boolean }
    | { $regex: string }
    | { $and: Filter[] }
    | { $or: Filter[] }
    | { $not: Filter };
}
```

---

## Provider Implementations

### 1. SQLite Provider (Standalone)

```typescript
class SQLiteProvider implements DataProvider {
  private db: SQLiteDatabase;
  readonly capabilities: ProviderCapabilities = {
    realtime: false,
    sync: false,
    transactions: true,
    offline: true,
    encryption: true,
    fullTextSearch: true,
    relations: true
  };
  
  async initialize(config: SQLiteConfig): Promise<void> {
    // Initialize SQLite WASM with OPFS
    const sqlite = await initSqlJs({
      locateFile: file => `/sqlite/${file}`
    });
    
    // Open or create database
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(config.filename, { create: true });
    
    this.db = new sqlite.Database(await handle.getFile());
    
    // Run migrations
    await this.runMigrations();
  }
  
  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    const sql = this.buildSelectSQL(collection, query);
    const results = this.db.exec(sql);
    
    return {
      data: this.transformResults(results),
      pagination: {
        page: query.pagination?.page || 1,
        pageSize: query.pagination?.pageSize || 50,
        totalCount: await this.count(collection, query.filter),
        totalPages: 0 // calculated
      }
    };
  }
  
  // Real-time simulation via polling
  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    return new Observable(subscriber => {
      const poll = async () => {
        const result = await this.find<T>(collection, query);
        subscriber.next(result.data);
      };
      
      poll();
      const interval = setInterval(poll, 1000); // 1 second polling
      
      return () => clearInterval(interval);
    });
  }
  
  async export(): Promise<Blob> {
    const data = this.db.export();
    return new Blob([data], { type: 'application/x-sqlite3' });
  }
}
```

### 2. PouchDB Provider (Networked/SaaS)

```typescript
class PouchDBProvider implements DataProvider {
  private localDb: PouchDB.Database;
  private remoteDb?: PouchDB.Database;
  private syncHandler?: PouchDB.Replication.Sync<{}>;
  private changeEmitter = new EventEmitter();
  
  readonly capabilities: ProviderCapabilities = {
    realtime: true,
    sync: true,
    transactions: false,  // PouchDB doesn't support ACID
    offline: true,
    encryption: false,
    fullTextSearch: false, // Via plugin
    relations: false
  };
  
  async initialize(config: PouchDBConfig): Promise<void> {
    // Local database
    this.localDb = new PouchDB(config.localName);
    
    // Remote sync (optional)
    if (config.remoteUrl) {
      this.remoteDb = new PouchDB(config.remoteUrl);
      
      // Set up sync
      this.syncHandler = this.localDb.sync(this.remoteDb, {
        live: true,
        retry: true
      });
      
      // Listen for changes
      this.syncHandler.on('change', (change) => {
        this.changeEmitter.emit('change', change);
      });
    }
    
    // Create indexes
    await this.createIndexes();
  }
  
  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    // Use PouchDB-find (Mango queries)
    const selector = this.buildSelector(query.filter);
    
    const result = await this.localDb.find({
      selector: { ...selector, collection },
      sort: query.sort?.map(s => ({ [s.field]: s.direction })),
      skip: (query.pagination?.page || 0) * (query.pagination?.pageSize || 50),
      limit: query.pagination?.pageSize || 50
    });
    
    return {
      data: result.docs as T[],
      pagination: {
        page: query.pagination?.page || 1,
        pageSize: query.pagination?.pageSize || 50,
        totalCount: result.docs.length, // PouchDB doesn't give total easily
        totalPages: 0
      }
    };
  }
  
  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    return new Observable(subscriber => {
      // Initial fetch
      this.find<T>(collection, query).then(r => subscriber.next(r.data));
      
      // Listen for changes
      const handler = () => {
        this.find<T>(collection, query).then(r => subscriber.next(r.data));
      };
      
      this.changeEmitter.on('change', handler);
      
      return () => {
        this.changeEmitter.off('change', handler);
      };
    });
  }
  
  async sync(): Promise<SyncResult> {
    if (!this.remoteDb) {
      throw new Error('No remote database configured');
    }
    
    const result = await this.localDb.sync(this.remoteDb);
    
    return {
      success: true,
      pulled: result.pull?.docs_written || 0,
      pushed: result.push?.docs_written || 0,
      conflicts: [...(result.pull?.errors || []), ...(result.push?.errors || [])]
    };
  }
}
```

### 3. Backend API Provider (Hosted/SaaS)

```typescript
class BackendAPIProvider implements DataProvider {
  private baseURL: string;
  private token: string;
  private socket?: Socket;
  private cache = new Map<string, any>();
  
  readonly capabilities: ProviderCapabilities = {
    realtime: true,
    sync: false,  // Server handles sync
    transactions: true,
    offline: false,
    encryption: true,
    fullTextSearch: true,
    relations: true
  };
  
  async initialize(config: BackendConfig): Promise<void> {
    this.baseURL = config.baseURL;
    
    // Authenticate
    const auth = await this.authenticate(config.credentials);
    this.token = auth.token;
    
    // WebSocket for real-time
    this.socket = io(this.baseURL, {
      auth: { token: this.token }
    });
  }
  
  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    const cacheKey = this.buildCacheKey(collection, query);
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const response = await fetch(
      `${this.baseURL}/api/${collection}?${qs.stringify(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    
    // Cache result
    this.cache.set(cacheKey, result);
    setTimeout(() => this.cache.delete(cacheKey), 60000); // 1 min TTL
    
    return result;
  }
  
  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    return new Observable(subscriber => {
      // Subscribe to room
      this.socket?.emit('subscribe', { collection, query });
      
      this.socket?.on('data-change', (data) => {
        if (data.collection === collection) {
          subscriber.next(data.records);
        }
      });
      
      return () => {
        this.socket?.emit('unsubscribe', { collection });
      };
    });
  }
  
  async transaction<T>(operations: Operation[]): Promise<T> {
    const response = await fetch(`${this.baseURL}/api/transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operations })
    });
    
    return response.json();
  }
}
```

---

## Unified Data Service Implementation

```typescript
class UnifiedDataService {
  private provider: DataProvider;
  private syncEngine?: SyncEngine;
  private cache = new Map<string, CachedResult>();
  
  async initialize(mode: DeploymentMode, config: ProviderConfig): Promise<void> {
    // Select provider based on mode
    this.provider = ProviderFactory.create(mode, config);
    await this.provider.initialize(config);
    
    // Set up sync if provider supports it
    if (this.provider.capabilities.sync) {
      this.syncEngine = new SyncEngine(this.provider);
    }
  }
  
  // CRUD Operations
  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    return this.provider.find<T>(collection, query);
  }
  
  async findOne<T>(collection: string, id: string): Promise<T | null> {
    return this.provider.findOne<T>(collection, id);
  }
  
  async create<T>(collection: string, data: Omit<T, 'id'>): Promise<T> {
    // Add metadata
    const withMeta = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    
    return this.provider.create<T>(collection, withMeta);
  }
  
  async update<T>(
    collection: string, 
    id: string, 
    data: Partial<T>
  ): Promise<T> {
    const withMeta = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return this.provider.update<T>(collection, id, withMeta);
  }
  
  async delete(collection: string, id: string): Promise<void> {
    return this.provider.delete(collection, id);
  }
  
  // Real-time
  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    return this.provider.subscribe<T>(collection, query);
  }
  
  // Sync
  async sync(): Promise<SyncResult> {
    if (!this.syncEngine) {
      throw new Error('Sync not supported for this provider');
    }
    return this.syncEngine.sync();
  }
  
  // Mode switching
  async migrateTo(newMode: DeploymentMode, newConfig: ProviderConfig): Promise<void> {
    // Export from current provider
    if (!this.provider.export) {
      throw new Error('Current provider does not support export');
    }
    
    const backup = await this.provider.export();
    
    // Initialize new provider
    const newProvider = ProviderFactory.create(newMode, newConfig);
    await newProvider.initialize(newConfig);
    
    // Import to new provider
    if (!newProvider.import) {
      throw new Error('New provider does not support import');
    }
    await newProvider.import(backup);
    
    // Switch providers
    await this.provider.destroy();
    this.provider = newProvider;
  }
}
```

---

## Sync Engine

```typescript
class SyncEngine {
  private localProvider: DataProvider;
  private remoteProvider?: DataProvider;
  private changeQueue: Change[] = [];
  private isOnline = true;
  
  constructor(localProvider: DataProvider, remoteProvider?: DataProvider) {
    this.localProvider = localProvider;
    this.remoteProvider = remoteProvider;
    
    // Monitor network status
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }
  
  async sync(): Promise<SyncResult> {
    if (!this.remoteProvider) {
      return { success: true, pulled: 0, pushed: 0 };
    }
    
    // Push local changes
    const pushed = await this.pushChanges();
    
    // Pull remote changes
    const pulled = await this.pullChanges();
    
    return {
      success: true,
      pushed: pushed.length,
      pulled: pulled.length,
      conflicts: [] // Handle conflicts separately
    };
  }
  
  private async pushChanges(): Promise<Change[]> {
    const pending = this.changeQueue.filter(c => !c.synced);
    
    for (const change of pending) {
      try {
        await this.applyChangeToRemote(change);
        change.synced = true;
      } catch (error) {
        // Retry later
        console.error('Sync failed for change:', change, error);
      }
    }
    
    return pending.filter(c => c.synced);
  }
  
  private async pullChanges(): Promise<Change[]> {
    // Get last sync timestamp
    const lastSync = localStorage.getItem('lastSync') || '0';
    
    // Query remote for changes since last sync
    const remoteChanges = await this.remoteProvider!.find('changes', {
      filter: { timestamp: { $gt: lastSync } }
    });
    
    // Apply to local
    for (const change of remoteChanges.data) {
      await this.applyChangeToLocal(change);
    }
    
    // Update last sync
    localStorage.setItem('lastSync', Date.now().toString());
    
    return remoteChanges.data;
  }
  
  private async handleConflict(
    local: Document, 
    remote: Document
  ): Promise<Document> {
    // Timestamp-based resolution
    if (new Date(local.updatedAt) > new Date(remote.updatedAt)) {
      return local;
    }
    return remote;
  }
}
```

---

## React Hooks API

```typescript
// useCollection - for lists
function useCollection<T>(
  collection: string, 
  query?: Query,
  options?: {
    realtime?: boolean;
    cacheTime?: number;
  }
) {
  const uds = useUDS();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const fetch = async () => {
      try {
        setLoading(true);
        
        if (options?.realtime && uds.provider.capabilities.realtime) {
          // Subscribe to real-time updates
          const observable = uds.subscribe<T>(collection, query || {});
          const subscription = observable.subscribe({
            next: (records) => setData(records),
            error: (err) => setError(err)
          });
          unsubscribe = () => subscription.unsubscribe();
        } else {
          // One-time fetch
          const result = await uds.find<T>(collection, query || {});
          setData(result.data);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetch();
    
    return () => unsubscribe?.();
  }, [collection, JSON.stringify(query)]);
  
  const refresh = useCallback(() => {
    return uds.find<T>(collection, query || {});
  }, [collection, query]);
  
  return { data, loading, error, refresh };
}

// useDocument - for single records
function useDocument<T>(
  collection: string,
  id?: string,
  options?: { realtime?: boolean }
) {
  const uds = useUDS();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);
  
  const update = useCallback(async (changes: Partial<T>) => {
    if (!id) throw new Error('Cannot update without id');
    return uds.update<T>(collection, id, changes);
  }, [collection, id]);
  
  const remove = useCallback(async () => {
    if (!id) throw new Error('Cannot delete without id');
    return uds.delete(collection, id);
  }, [collection, id]);
  
  return { data, loading, error, update, delete: remove };
}

// useMutation - for write operations
function useMutation<T>(
  collection: string,
  operation: 'create' | 'update' | 'delete'
) {
  const uds = useUDS();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const mutate = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    
    try {
      let result;
      switch (operation) {
        case 'create':
          result = await uds.create<T>(collection, args[0]);
          break;
        case 'update':
          result = await uds.update<T>(collection, args[0], args[1]);
          break;
        case 'delete':
          result = await uds.delete(collection, args[0]);
          break;
      }
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [collection, operation]);
  
  return { mutate, loading, error };
}
```

---

## Migration Path from Current Code

### Phase 1: Create UDS (Week 1)
```typescript
// New file: src/services/data/UnifiedDataService.ts
// Implement UDS with SQLite provider
// Keep existing code untouched
```

### Phase 2: Parallel Implementation (Week 2)
```typescript
// Create new hooks using UDS
export function useStudentsNew() {
  return useCollection<Student>('students');
}

// Keep old hook for compatibility
export function useStudents() {
  // Existing implementation
}
```

### Phase 3: Gradual Migration (Weeks 3-4)
```typescript
// Migrate one page at a time
// Settings pages first (low risk)
// Then academics, finance, etc.
```

### Phase 4: Cleanup (Week 5)
```typescript
// Remove old implementations
// Delete rxdbService.ts, old hooks
// Consolidate data layer
```

---

## Performance Considerations

### 1. Query Optimization
```typescript
// Always use pagination
const query = {
  pagination: { page: 1, pageSize: 50 },
  sort: [{ field: 'updatedAt', direction: 'desc' }]
};

// Use indexes
await provider.createIndex('students', ['class', 'section']);

// Select only needed fields
const query = {
  select: ['id', 'name', 'rollNumber'],
  pagination: { pageSize: 20 }
};
```

### 2. Caching Strategy
```typescript
// Three-layer cache
const cache = {
  memory: new LRUCache({ max: 100 }),     // Hot data
  indexedDB: new IDBCache({ ttl: 3600 }), // Warm data
  localStorage: new LSCache()             // Cold data
};
```

### 3. Optimistic Updates
```typescript
const { mutate } = useMutation('students', 'update');

const handleUpdate = async (id: string, changes: Partial<Student>) => {
  // Optimistically update UI
  updateLocalState(id, changes);
  
  try {
    // Actually update
    await mutate(id, changes);
  } catch (error) {
    // Rollback on error
    rollbackLocalState(id);
  }
};
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-08  
**Author:** Architecture Team
