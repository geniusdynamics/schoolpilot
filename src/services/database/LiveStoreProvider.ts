// ABOUTME: LiveStore provider for multi-machine synchronization and peer-to-peer data sharing
// ABOUTME: Provides real-time sync, peer discovery, conflict resolution, and distributed database capabilities

import { LiveStore } from '@livestore/livestore';
import { WebAdapter } from '@livestore/adapter-web';
import { Observable, BehaviorSubject, Subject, fromEvent } from 'rxjs';
import { map, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  IDatabaseProvider,
  ICollection,
  DatabaseConfig,
  CollectionSchema,
  QueryOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
  BulkResult,
  CollectionChangeEvent,
  ProviderStatus,
  CollectionStats,
  IndexDefinition,
  DatabaseError,
  CollectionError
} from './interfaces';

// LiveStore specific interfaces
export interface LiveStoreConfig {
  dbName: string;
  version: number;
  peerDiscovery?: {
    enabled: boolean;
    signalServer?: string;
    stunServers?: string[];
    turnServers?: Array<{
      urls: string;
      username?: string;
      credential?: string;
    }>;
  };
  sync?: {
    enabled: boolean;
    autoSync: boolean;
    syncInterval: number;
    conflictResolution: 'client-wins' | 'server-wins' | 'last-write-wins' | 'manual';
  };
  performance?: {
    cacheSize: number;
    maxConnections: number;
    enableIndexing: boolean;
  };
}

export interface PeerInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastSeen: Date;
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';
}

export interface SyncStatus {
  isActive: boolean;
  connectedPeers: number;
  lastSync: Date | null;
  pendingChanges: number;
  conflicts: number;
  errors: string[];
}

// LiveStore Collection Implementation with Multi-Machine Sync
export class LiveStoreCollection<T extends { id?: string }> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;
  private liveStoreConfig: LiveStoreConfig;
  private syncStatus: SyncStatus;
  private connectedPeers = new Map<string, PeerInfo>();
  private conflictQueue: Array<{ local: T; remote: T; timestamp: Date }> = [];

  constructor(
    private liveStore: LiveStore,
    private collectionName: string,
    public readonly name: string,
    public readonly schema: CollectionSchema,
    liveStoreConfig: LiveStoreConfig
  ) {
    this.liveStoreConfig = liveStoreConfig;
    this.syncStatus = {
      isActive: false,
      connectedPeers: 0,
      lastSync: null,
      pendingChanges: 0,
      conflicts: 0,
      errors: []
    };
    
    this.setupChangeListener();
    this.setupPeerDiscovery();
    this.setupSyncMonitoring();
    this.loadInitialData();
  }

  private setupChangeListener(): void {
    // Subscribe to LiveStore changes
    this.liveStore.subscribe(this.collectionName, (changes: any) => {
      if (this.isDestroyed) return;
      
      changes.forEach((change: any) => {
        const eventType = change.type === 'delete' ? 'delete' : 
                         change.type === 'insert' ? 'insert' : 'update';
        
        this.changeSubject.next({
          type: eventType,
          doc: this.transformDoc(change.doc),
          id: change.doc.id || change.id
        });
      });
      
      // Update data subject
      this.refreshDataSubject();
    });
  }

  private setupPeerDiscovery(): void {
    if (!this.liveStoreConfig.peerDiscovery?.enabled) {
      return;
    }

    // Listen for peer connection events
    this.liveStore.on('peer:connected', (peer: any) => {
      console.log(`[LiveStoreCollection] Peer connected: ${peer.id}`);
      
      const peerInfo: PeerInfo = {
        id: peer.id,
        name: peer.name || `Peer-${peer.id.slice(0, 8)}`,
        status: 'connected',
        lastSeen: new Date(),
        syncStatus: 'synced'
      };
      
      this.connectedPeers.set(peer.id, peerInfo);
      this.syncStatus.connectedPeers = this.connectedPeers.size;
      
      // Start sync with new peer
      this.syncWithPeer(peer.id);
    });

    this.liveStore.on('peer:disconnected', (peer: any) => {
      console.log(`[LiveStoreCollection] Peer disconnected: ${peer.id}`);
      
      this.connectedPeers.delete(peer.id);
      this.syncStatus.connectedPeers = this.connectedPeers.size;
    });

    this.liveStore.on('peer:error', (error: any) => {
      console.error(`[LiveStoreCollection] Peer error:`, error);
      this.syncStatus.errors.push(`Peer error: ${error.message}`);
    });
  }

  private setupSyncMonitoring(): void {
    if (!this.liveStoreConfig.sync?.enabled) {
      return;
    }

    // Monitor sync status
    this.liveStore.on('sync:start', () => {
      console.log(`[LiveStoreCollection] Sync started for ${this.name}`);
      this.syncStatus.isActive = true;
    });

    this.liveStore.on('sync:complete', () => {
      console.log(`[LiveStoreCollection] Sync completed for ${this.name}`);
      this.syncStatus.isActive = false;
      this.syncStatus.lastSync = new Date();
    });

    this.liveStore.on('sync:conflict', (conflict: any) => {
      console.warn(`[LiveStoreCollection] Sync conflict detected in ${this.name}:`, conflict);
      this.handleSyncConflict(conflict);
    });

    this.liveStore.on('sync:error', (error: any) => {
      console.error(`[LiveStoreCollection] Sync error in ${this.name}:`, error);
      this.syncStatus.errors.push(`Sync error: ${error.message}`);
      this.syncStatus.isActive = false;
    });

    // Auto-sync if enabled
    if (this.liveStoreConfig.sync?.autoSync) {
      setInterval(() => {
        this.syncAllPeers();
      }, this.liveStoreConfig.sync.syncInterval || 30000);
    }
  }

  private async syncWithPeer(peerId: string): Promise<void> {
    try {
      console.log(`[LiveStoreCollection] Syncing ${this.name} with peer ${peerId}`);
      
      const peer = this.connectedPeers.get(peerId);
      if (peer) {
        peer.syncStatus = 'syncing';
      }
      
      await this.liveStore.sync(peerId, this.collectionName);
      
      if (peer) {
        peer.syncStatus = 'synced';
        peer.lastSeen = new Date();
      }
      
      console.log(`[LiveStoreCollection] Sync completed with peer ${peerId}`);
    } catch (error: any) {
      console.error(`[LiveStoreCollection] Failed to sync with peer ${peerId}:`, error);
      
      const peer = this.connectedPeers.get(peerId);
      if (peer) {
        peer.syncStatus = 'error';
      }
      
      this.syncStatus.errors.push(`Sync failed with peer ${peerId}: ${error.message}`);
    }
  }

  private async syncAllPeers(): Promise<void> {
    if (this.connectedPeers.size === 0) {
      return;
    }

    console.log(`[LiveStoreCollection] Syncing ${this.name} with ${this.connectedPeers.size} peers`);
    
    const syncPromises = Array.from(this.connectedPeers.keys()).map(peerId => 
      this.syncWithPeer(peerId)
    );
    
    try {
      await Promise.allSettled(syncPromises);
      console.log(`[LiveStoreCollection] Bulk sync completed for ${this.name}`);
    } catch (error: any) {
      console.error(`[LiveStoreCollection] Bulk sync failed for ${this.name}:`, error);
    }
  }

  private handleSyncConflict(conflict: any): void {
    this.syncStatus.conflicts++;
    
    const { local, remote } = conflict;
    this.conflictQueue.push({
      local: this.transformDoc(local),
      remote: this.transformDoc(remote),
      timestamp: new Date()
    });

    switch (this.liveStoreConfig.sync?.conflictResolution) {
      case 'client-wins':
        // Keep local version
        console.log(`[LiveStoreCollection] Conflict resolved (client wins) for ${this.name}`);
        break;
        
      case 'server-wins':
        // Accept remote version
        console.log(`[LiveStoreCollection] Conflict resolved (server wins) for ${this.name}`);
        this.liveStore.put(this.collectionName, remote);
        break;
        
      case 'last-write-wins':
        // Use timestamp to determine winner
        const localTime = new Date(local.updatedAt || local.createdAt || 0);
        const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0);
        
        if (remoteTime > localTime) {
          this.liveStore.put(this.collectionName, remote);
          console.log(`[LiveStoreCollection] Conflict resolved (remote newer) for ${this.name}`);
        } else {
          console.log(`[LiveStoreCollection] Conflict resolved (local newer) for ${this.name}`);
        }
        break;
        
      case 'manual':
      default:
        // Manual resolution required
        console.warn(`[LiveStoreCollection] Manual conflict resolution required for ${this.name}`);
        break;
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      const docs = await this.find();
      this.dataSubject.next(docs);
    } catch (error: any) {
      console.error(`Failed to load initial data for ${this.name}:`, error);
    }
  }

  private async refreshDataSubject(): Promise<void> {
    try {
      const docs = await this.find();
      this.dataSubject.next(docs);
    } catch (error: any) {
      console.error(`Failed to refresh data subject for ${this.name}:`, error);
    }
  }

  private transformDoc(doc: any): T {
    if (!doc) return doc;
    
    // Transform LiveStore document to application format
    const transformed = { ...doc };
    return transformed as T;
  }

  // CRUD Operations with Multi-Machine Sync
  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    try {
      const docWithId = {
        ...doc,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await this.liveStore.put(this.collectionName, docWithId);
      
      // Sync with connected peers
      if (this.liveStoreConfig.sync?.enabled && this.connectedPeers.size > 0) {
        this.syncAllPeers();
      }
      
      return {
        id: docWithId.id,
        rev: result.rev || '1-' + Date.now(),
        doc: docWithId as T,
        ok: true
      };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to insert document in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    try {
      const docsWithIds = docs.map(doc => ({
        ...doc,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const results = await Promise.allSettled(
        docsWithIds.map(doc => this.liveStore.put(this.collectionName, doc))
      );
      
      const insertResults: InsertResult<T>[] = [];
      const errors: Array<{ id: string; error: string; reason: string }> = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          insertResults.push({
            id: docsWithIds[index].id,
            rev: result.value.rev || '1-' + Date.now(),
            doc: docsWithIds[index] as T,
            ok: true
          });
        } else {
          errors.push({
            id: docsWithIds[index].id,
            error: 'Insert failed',
            reason: result.reason?.message || String(result.reason)
          });
        }
      });
      
      // Sync with connected peers
      if (this.liveStoreConfig.sync?.enabled && this.connectedPeers.size > 0) {
        this.syncAllPeers();
      }
      
      return { docs: insertResults, errors };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to insert multiple documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.liveStore.get(this.collectionName, id);
      return doc ? this.transformDoc(doc) : null;
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('not found')) {
        return null;
      }
      throw new CollectionError(
        `Failed to find document by ID in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async find(query: QueryOptions = {}): Promise<T[]> {
    try {
      let docs = await this.liveStore.query(this.collectionName, query.selector || {});
      
      // Apply sorting
      if (query.sort) {
        docs = docs.sort((a: any, b: any) => {
          for (const [field, direction] of Object.entries(query.sort!)) {
            const aVal = a[field];
            const bVal = b[field];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            if (comparison !== 0) {
              return direction === 'desc' ? -comparison : comparison;
            }
          }
          return 0;
        });
      }
      
      // Apply pagination
      if (query.skip) {
        docs = docs.slice(query.skip);
      }
      if (query.limit) {
        docs = docs.slice(0, query.limit);
      }
      
      return docs.map((doc: any) => this.transformDoc(doc));
    } catch (error: any) {
      throw new CollectionError(
        `Failed to find documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Document with ID ${id} not found`);
      }
      
      const updatedDoc = {
        ...existing,
        ...update,
        id,
        updatedAt: new Date().toISOString()
      };
      
      const result = await this.liveStore.put(this.collectionName, updatedDoc);
      
      // Sync with connected peers
      if (this.liveStoreConfig.sync?.enabled && this.connectedPeers.size > 0) {
        this.syncAllPeers();
      }
      
      return {
        id,
        rev: result.rev || '2-' + Date.now(),
        doc: updatedDoc as T,
        ok: true
      };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to update document in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]> {
    try {
      const docs = await this.find(query);
      const results: UpdateResult<T>[] = [];
      
      for (const doc of docs) {
        if (doc.id) {
          const result = await this.update(doc.id, update);
          results.push(result);
        }
      }
      
      return results;
    } catch (error: any) {
      throw new CollectionError(
        `Failed to update multiple documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async remove(id: string): Promise<DeleteResult> {
    try {
      await this.liveStore.delete(this.collectionName, id);
      
      // Sync with connected peers
      if (this.liveStoreConfig.sync?.enabled && this.connectedPeers.size > 0) {
        this.syncAllPeers();
      }
      
      return {
        id,
        rev: 'deleted-' + Date.now(),
        ok: true,
        deleted: true
      };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to remove document from ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async removeMany(query: QueryOptions): Promise<DeleteResult[]> {
    try {
      const docs = await this.find(query);
      const results: DeleteResult[] = [];
      
      for (const doc of docs) {
        if (doc.id) {
          const result = await this.remove(doc.id);
          results.push(result);
        }
      }
      
      return results;
    } catch (error: any) {
      throw new CollectionError(
        `Failed to remove multiple documents from ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  // Upsert operation (update or insert)
  async upsert(id: string, doc: Partial<T>): Promise<UpdateResult<T> | InsertResult<T>> {
    try {
      const existing = await this.findById(id);
      if (existing) {
        return await this.update(id, doc);
      } else {
        const docWithId = { ...doc, id } as Omit<T, 'id'>;
        return await this.insert(docWithId);
      }
    } catch (error: any) {
      throw new CollectionError(
        `Failed to upsert document in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  // RxDB Compatibility Aliases
  async delete(id: string): Promise<DeleteResult> {
    return this.remove(id);
  }

  async findOne(idOrQuery: string | QueryOptions): Promise<T | null> {
    if (typeof idOrQuery === 'string') {
      return this.findById(idOrQuery);
    } else {
      try {
        const results = await this.find({ ...idOrQuery, limit: 1 });
        return results.length > 0 ? results[0] : null;
      } catch (error: any) {
        throw new CollectionError(
          `Failed to find document in ${this.name}: ${error?.message || String(error)}`,
          this.name
        );
      }
    }
  }

  // Reactive Operations
  subscribe(query?: QueryOptions): Observable<T[]> {
    if (query) {
      return new Observable(subscriber => {
        const updateData = async () => {
          try {
            const data = await this.find(query);
            subscriber.next(data);
          } catch (error: any) {
            subscriber.error(error);
          }
        };
        
        updateData();
        
        const changeSubscription = this.changeSubject.subscribe(() => {
          updateData();
        });
        
        return () => changeSubscription.unsubscribe();
      });
    } else {
      return this.dataSubject.asObservable();
    }
  }

  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }

  // Performance Operations
  async count(query?: QueryOptions): Promise<number> {
    try {
      const docs = await this.find(query || {});
      return docs.length;
    } catch (error: any) {
      throw new CollectionError(
        `Failed to count documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.findById(id);
      return doc !== null;
    } catch (error: any) {
      return false;
    }
  }

  async createIndex(index: IndexDefinition): Promise<void> {
    try {
      await this.liveStore.createIndex(this.collectionName, {
        fields: index.fields,
        name: index.name
      });
    } catch (error: any) {
      throw new CollectionError(
        `Failed to create index in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  // Collection management
  async getStats(): Promise<CollectionStats> {
    try {
      const count = await this.count();
      
      return {
        name: this.name,
        documentCount: count,
        indexCount: 0, // LiveStore doesn't provide easy access to index count
        storageSize: 0, // LiveStore doesn't provide storage size info
        lastModified: new Date()
      };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to get stats for ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async compact(): Promise<void> {
    try {
      // LiveStore handles compaction automatically
      console.log(`[LiveStoreCollection] Compaction requested for ${this.name} (handled automatically)`);
    } catch (error: any) {
      throw new CollectionError(
        `Failed to compact ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async destroy(): Promise<void> {
    try {
      console.log(`[LiveStoreCollection] Destroying collection ${this.name}...`);
      
      this.isDestroyed = true;
      
      // Disconnect from all peers
      for (const peerId of this.connectedPeers.keys()) {
        try {
          await this.liveStore.disconnect(peerId);
        } catch (error: any) {
          console.error(`Failed to disconnect from peer ${peerId}:`, error);
        }
      }
      
      this.connectedPeers.clear();
      this.conflictQueue = [];
      
      // Complete subjects
      this.changeSubject.complete();
      this.dataSubject.complete();
      
      console.log(`[LiveStoreCollection] Collection ${this.name} destroyed successfully`);
    } catch (error: any) {
      console.error(`[LiveStoreCollection] Failed to destroy ${this.name}:`, error);
      throw new CollectionError(
        `Failed to destroy: ${error instanceof Error ? error.message : String(error)}`,
        this.name
      );
    }
  }

  // LiveStore specific methods

  /**
   * Get connected peers information
   */
  getConnectedPeers(): PeerInfo[] {
    return Array.from(this.connectedPeers.values());
  }

  /**
   * Get sync status information
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Force sync with all connected peers
   */
  async forceSyncAllPeers(): Promise<void> {
    await this.syncAllPeers();
  }

  /**
   * Get pending conflicts that require manual resolution
   */
  getPendingConflicts(): Array<{ local: T; remote: T; timestamp: Date }> {
    return [...this.conflictQueue];
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(conflictIndex: number, resolution: 'local' | 'remote' | T): Promise<void> {
    if (conflictIndex < 0 || conflictIndex >= this.conflictQueue.length) {
      throw new Error('Invalid conflict index');
    }

    const conflict = this.conflictQueue[conflictIndex];
    let resolvedDoc: T;

    if (resolution === 'local') {
      resolvedDoc = conflict.local;
    } else if (resolution === 'remote') {
      resolvedDoc = conflict.remote;
    } else {
      resolvedDoc = resolution;
    }

    // Apply resolution
    if (resolvedDoc.id) {
      await this.update(resolvedDoc.id, resolvedDoc);
    }

    // Remove from conflict queue
    this.conflictQueue.splice(conflictIndex, 1);
    this.syncStatus.conflicts = this.conflictQueue.length;

    console.log(`[LiveStoreCollection] Conflict resolved for ${this.name}`);
  }

  /**
   * Connect to a specific peer
   */
  async connectToPeer(peerId: string): Promise<void> {
    try {
      await this.liveStore.connect(peerId);
      console.log(`[LiveStoreCollection] Connected to peer ${peerId}`);
    } catch (error: any) {
      console.error(`[LiveStoreCollection] Failed to connect to peer ${peerId}:`, error);
      throw new CollectionError(`Failed to connect to peer: ${error.message}`, this.name);
    }
  }

  /**
   * Disconnect from a specific peer
   */
  async disconnectFromPeer(peerId: string): Promise<void> {
    try {
      await this.liveStore.disconnect(peerId);
      this.connectedPeers.delete(peerId);
      this.syncStatus.connectedPeers = this.connectedPeers.size;
      console.log(`[LiveStoreCollection] Disconnected from peer ${peerId}`);
    } catch (error: any) {
      console.error(`[LiveStoreCollection] Failed to disconnect from peer ${peerId}:`, error);
      throw new CollectionError(`Failed to disconnect from peer: ${error.message}`, this.name);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Enhanced LiveStore Provider Implementation with Multi-Machine Sync
export class LiveStoreProvider implements IDatabaseProvider {
  public readonly name = 'LiveStore';
  public readonly version = '1.0.0';
  
  private collections = new Map<string, ICollection<any>>();
  private config: DatabaseConfig | null = null;
  private liveStoreConfig: LiveStoreConfig;
  private liveStore: LiveStore | null = null;
  private isInitialized = false;
  private performanceStats = {
    avgQueryTime: 0,
    totalQueries: 0,
    memoryUsage: 0
  };

  constructor() {
    this.liveStoreConfig = {
      dbName: 'schoolpilot3-livestore',
      version: 1,
      peerDiscovery: {
        enabled: true,
        signalServer: 'wss://signal.livestore.dev',
        stunServers: ['stun:stun.l.google.com:19302']
      },
      sync: {
        enabled: true,
        autoSync: true,
        syncInterval: 30000,
        conflictResolution: 'last-write-wins'
      },
      performance: {
        cacheSize: 50, // MB
        maxConnections: 10,
        enableIndexing: true
      }
    };
  }

  async initialize(config: DatabaseConfig, liveStoreConfig?: Partial<LiveStoreConfig>): Promise<void> {
    try {
      this.config = config;
      
      if (liveStoreConfig) {
        this.liveStoreConfig = { ...this.liveStoreConfig, ...liveStoreConfig };
      }
      
      // Create WebAdapter for LiveStore
      const adapter = new WebAdapter({
        dbName: this.liveStoreConfig.dbName,
        version: this.liveStoreConfig.version
      });

      // Initialize LiveStore with peer discovery and sync
      this.liveStore = new LiveStore({
        adapter,
        schema: {}, // Will be populated as collections are created
        debug: process.env.NODE_ENV === 'development',
        peerDiscovery: this.liveStoreConfig.peerDiscovery,
        sync: this.liveStoreConfig.sync
      });

      // Setup global event listeners
      this.setupGlobalEventListeners();
      
      this.isInitialized = true;
      console.log('[LiveStoreProvider] Provider initialized successfully with multi-machine sync');
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to initialize LiveStore provider: ${error instanceof Error ? error.message : String(error)}`,
        'INITIALIZATION_ERROR',
        this.name
      );
    }
  }

  private setupGlobalEventListeners(): void {
    if (!this.liveStore) return;

    this.liveStore.on('peer:discovered', (peer: any) => {
      console.log(`[LiveStoreProvider] Peer discovered: ${peer.id}`);
    });

    this.liveStore.on('sync:global:start', () => {
      console.log('[LiveStoreProvider] Global sync started');
    });

    this.liveStore.on('sync:global:complete', () => {
      console.log('[LiveStoreProvider] Global sync completed');
    });

    this.liveStore.on('error', (error: any) => {
      console.error('[LiveStoreProvider] Global error:', error);
    });
  }

  async createCollection<T = any>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    try {
      if (!this.isInitialized || !this.liveStore) {
        throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
      }
      
      console.log(`[LiveStoreProvider] Creating collection: ${name}`);
      
      // Register schema with LiveStore
      await this.liveStore.addCollection(name, {
        schema: schema.properties || {},
        indexes: schema.indexes || []
      });
      
      // Create collection wrapper with multi-machine sync
      const collection = new LiveStoreCollection<T & { id?: string }>(
        this.liveStore,
        name,
        name,
        schema,
        this.liveStoreConfig
      );
      
      this.collections.set(name, collection);
      
      console.log(`[LiveStoreProvider] Collection '${name}' created successfully with multi-machine sync`);
      return collection;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create collection '${name}': ${error instanceof Error ? error.message : String(error)}`,
        'COLLECTION_CREATION_ERROR',
        this.name,
        name
      );
    }
  }

  getCollection<T>(name: string): ICollection<T> | null {
    return this.collections.get(name) || null;
  }

  getAllCollections(): Map<string, ICollection<any>> {
    return new Map(this.collections);
  }

  async destroy(): Promise<void> {
    try {
      console.log('[LiveStoreProvider] Destroying provider...');
      
      // Destroy all collections
      for (const [name, collection] of this.collections) {
        try {
          await collection.destroy();
        } catch (error: any) {
          console.error(`Failed to destroy collection '${name}':`, error);
        }
      }
      
      // Disconnect from all peers and cleanup LiveStore
      if (this.liveStore) {
        await this.liveStore.destroy();
      }
      
      this.collections.clear();
      this.isInitialized = false;
      console.log('[LiveStoreProvider] Provider destroyed successfully');
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to destroy LiveStore provider: ${error?.message || String(error)}`,
        'DESTRUCTION_ERROR',
        this.name
      );
    }
  }

  isAvailable(): boolean {
    // Check if the environment supports LiveStore (WebRTC, IndexedDB, etc.)
    return typeof window !== 'undefined' && 
           !!window.indexedDB && 
           !!window.RTCPeerConnection;
  }

  getStatus(): ProviderStatus {
    const totalPeers = Array.from(this.collections.values())
      .reduce((total, collection) => {
        const liveStoreCollection = collection as any;
        return total + (liveStoreCollection.getConnectedPeers?.()?.length || 0);
      }, 0);

    return {
      name: this.name,
      version: this.version,
      isConnected: this.isInitialized,
      collectionsCount: this.collections.size,
      performance: { 
        ...this.performanceStats,
        connectedPeers: totalPeers
      }
    };
  }

  async backup(): Promise<string> {
    try {
      const backupData: Record<string, any[]> = {};
      const peerInfo: Record<string, PeerInfo[]> = {};
      
      for (const [name, collection] of this.collections) {
        const docs = await collection.find();
        backupData[name] = docs;
        
        // Include peer information
        const liveStoreCollection = collection as any;
        if (liveStoreCollection.getConnectedPeers) {
          peerInfo[name] = liveStoreCollection.getConnectedPeers();
        }
      }
      
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        provider: this.name,
        version: this.version,
        liveStoreConfig: this.liveStoreConfig,
        peerInfo,
        collections: backupData
      });
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
        'BACKUP_ERROR',
        this.name
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      if (backup.provider !== this.name) {
        throw new Error(`Backup was created with ${backup.provider}, not ${this.name}`);
      }
      
      for (const [collectionName, docs] of Object.entries(backup.collections)) {
        const collection = this.getCollection(collectionName);
        if (collection && Array.isArray(docs)) {
          // Clear existing data
          const existingDocs = await collection.find();
          for (const doc of existingDocs) {
            if ((doc as any).id) {
              await collection.remove((doc as any).id);
            }
          }
          
          // Insert backup data
          if (docs.length > 0) {
            await collection.insertMany(docs as any[]);
          }
        }
      }
      
      console.log('[LiveStoreProvider] Backup restored successfully');
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to restore backup: ${error?.message || String(error)}`,
        'RESTORE_ERROR',
        this.name
      );
    }
  }

  // LiveStore specific methods

  /**
   * Get global peer statistics
   */
  getGlobalPeerStatistics(): {
    totalPeers: number;
    activeSyncs: number;
    totalConflicts: number;
    collectionsWithPeers: string[];
  } {
    let totalPeers = 0;
    let activeSyncs = 0;
    let totalConflicts = 0;
    const collectionsWithPeers: string[] = [];

    for (const [name, collection] of this.collections) {
      const liveStoreCollection = collection as any;
      
      if (liveStoreCollection.getConnectedPeers) {
        const peers = liveStoreCollection.getConnectedPeers();
        if (peers.length > 0) {
          totalPeers += peers.length;
          collectionsWithPeers.push(name);
        }
      }
      
      if (liveStoreCollection.getSyncStatus) {
        const syncStatus = liveStoreCollection.getSyncStatus();
        if (syncStatus.isActive) activeSyncs++;
        totalConflicts += syncStatus.conflicts;
      }
    }

    return {
      totalPeers,
      activeSyncs,
      totalConflicts,
      collectionsWithPeers
    };
  }

  /**
   * Force sync all collections with all peers
   */
  async syncAllCollections(): Promise<{ [collectionName: string]: { success: boolean; error?: string } }> {
    const results: { [collectionName: string]: { success: boolean; error?: string } } = {};
    
    console.log('[LiveStoreProvider] Syncing all collections with all peers...');
    
    for (const [name, collection] of this.collections) {
      try {
        const liveStoreCollection = collection as any;
        if (liveStoreCollection.forceSyncAllPeers) {
          await liveStoreCollection.forceSyncAllPeers();
        }
        results[name] = { success: true };
        console.log(`[LiveStoreProvider] Successfully synced collection: ${name}`);
      } catch (error: any) {
        results[name] = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
        console.error(`[LiveStoreProvider] Failed to sync collection ${name}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Configure LiveStore settings
   */
  configureLiveStore(config: Partial<LiveStoreConfig>): void {
    this.liveStoreConfig = { ...this.liveStoreConfig, ...config };
    console.log('[LiveStoreProvider] LiveStore configuration updated:', this.liveStoreConfig);
  }
}