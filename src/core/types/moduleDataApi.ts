// ABOUTME: Module Data API Types
// ABOUTME: Defines the interface for safe cross-module data access

/**
 * Query interface for filtering collections
 */
export interface Query {
  /** Filter conditions - key is field name, value is the value to match */
  where?: Record<string, any>;
  /** Sorting configuration */
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Result interface for paginated queries
 */
export interface QueryResult<T> {
  /** The data items */
  data: T[];
  /** Total count (for pagination) */
  totalCount: number;
  /** Whether there are more results */
  hasMore: boolean;
}

/**
 * Subscription callback type
 */
export type DataChangeCallback<T> = (data: T[]) => void;

/**
 * Unsubscribe function returned by subscribe methods
 */
export type Unsubscribe = () => void;

/**
 * Metadata about a collection
 */
export interface CollectionMetadata {
  /** Collection name */
  name: string;
  /** Module that owns this collection */
  moduleId: string;
  /** Whether this collection is readable by other modules */
  isPublic: boolean;
  /** Allowed operations for cross-module access */
  allowedOperations: ('read' | 'query' | 'subscribe')[];
  /** Description of the collection */
  description?: string;
}

/**
 * The Module Data API interface
 * Provides safe cross-module data access with enforced read-only semantics
 */
export interface ModuleDataAPI {
  /**
   * Get all items from a collection
   * @param collectionName - Name of the collection
   * @returns Array of items
   */
  getCollection<T>(collectionName: string): Promise<T[]>;

  /**
   * Query a collection with filters
   * @param collectionName - Name of the collection
   * @param query - Query parameters
   * @returns Filtered results with metadata
   */
  queryCollection<T>(collectionName: string, query: Query): Promise<QueryResult<T>>;

  /**
   * Get a single item by ID
   * @param collectionName - Name of the collection
   * @param id - Item ID
   * @returns The item or null if not found
   */
  getById<T>(collectionName: string, id: string): Promise<T | null>;

  /**
   * Subscribe to collection changes
   * @param collectionName - Name of the collection
   * @param callback - Function called when data changes
   * @returns Unsubscribe function
   */
  subscribeToCollection<T>(collectionName: string, callback: DataChangeCallback<T>): Unsubscribe;

  /**
   * Get metadata for all available collections
   * @returns Array of collection metadata
   */
  getAvailableCollections(): CollectionMetadata[];

  /**
   * Check if a collection is accessible
   * @param collectionName - Name of the collection
   * @returns Whether the collection can be accessed
   */
  isCollectionAccessible(collectionName: string): boolean;
}

/**
 * Configuration for the Module Data API
 */
export interface ModuleDataApiConfig {
  /** Enable logging of all cross-module access */
  enableLogging: boolean;
  /** Enable caching of collection data */
  enableCaching: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Maximum cache size (number of collections) */
  maxCacheSize: number;
}

/**
 * Access log entry for debugging cross-module access
 */
export interface AccessLogEntry {
  timestamp: Date;
  sourceModule: string;
  targetCollection: string;
  operation: 'get' | 'query' | 'subscribe';
  query?: Query;
  itemCount?: number;
}
