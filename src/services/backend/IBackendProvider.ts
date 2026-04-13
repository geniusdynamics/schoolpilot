/**
 * IBackendProvider Interface
 * 
 * Core abstraction for backend integration providers.
 * All backend plugins must implement this interface.
 */

import type {
  BackendConfig,
  BackendStatus,
  BackendCapabilities,
  AuthCredentials,
  AuthToken,
  ChangeSet,
  SyncOperation,
  SyncResult,
  Conflict,
  ConflictResolution,
  FileUpload,
  FileRecord,
  BackendType,
} from './types';

import type { Record, Query } from '../data/types';

/**
 * Batch operation result
 */
export interface BatchResult {
  success: boolean;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: Record;
    error?: string;
  }>;
}

/**
 * Core backend provider interface
 * 
 * All backend integration plugins must implement this interface
 * to ensure compatibility with the core data layer and sync engine.
 */
export interface IBackendProvider {
  // ============================================================================
  // Metadata
  // ============================================================================
  
  /** Unique provider identifier */
  readonly id: string;
  
  /** Human-readable provider name */
  readonly name: string;
  
  /** Provider version */
  readonly version: string;
  
  /** Backend type */
  readonly type: BackendType;
  
  // ============================================================================
  // Lifecycle Management
  // ============================================================================
  
  /**
   * Initialize the backend provider with configuration
   * @param config Backend configuration including auth, endpoints, etc.
   */
  initialize(config: BackendConfig): Promise<void>;
  
  /**
   * Disconnect from the backend and cleanup resources
   */
  disconnect(): Promise<void>;
  
  /**
   * Check backend health and connectivity
   * @returns Current backend status
   */
  healthCheck(): Promise<BackendStatus>;
  
  // ============================================================================
  // Authentication
  // ============================================================================
  
  /**
   * Authenticate with the backend
   * @param credentials Authentication credentials
   * @returns Authentication token
   */
  authenticate(credentials: AuthCredentials): Promise<AuthToken>;
  
  /**
   * Refresh authentication token
   * @returns New authentication token
   */
  refreshAuth(): Promise<AuthToken>;
  
  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean;
  
  // ============================================================================
  // CRUD Operations
  // ============================================================================
  
  /**
   * Create a new record
   * @param entity Entity/collection name
   * @param data Record data
   * @returns Created record with ID
   */
  create(entity: string, data: Record): Promise<Record>;
  
  /**
   * Read a single record by ID
   * @param entity Entity/collection name
   * @param id Record ID
   * @returns Record or null if not found
   */
  read(entity: string, id: string): Promise<Record | null>;
  
  /**
   * Update an existing record
   * @param entity Entity/collection name
   * @param id Record ID
   * @param data Partial record data to update
   * @returns Updated record
   */
  update(entity: string, id: string, data: Partial<Record>): Promise<Record>;
  
  /**
   * Delete a record
   * @param entity Entity/collection name
   * @param id Record ID
   * @returns True if deleted successfully
   */
  delete(entity: string, id: string): Promise<boolean>;
  
  /**
   * Query records with filters, sorting, pagination
   * @param entity Entity/collection name
   * @param query Query parameters
   * @returns Array of matching records
   */
  query(entity: string, query: Query): Promise<Record[]>;
  
  // ============================================================================
  // Batch Operations
  // ============================================================================
  
  /**
   * Create multiple records in a single operation
   * @param entity Entity/collection name
   * @param records Array of records to create
   * @returns Batch operation result
   */
  batchCreate(entity: string, records: Record[]): Promise<BatchResult>;
  
  /**
   * Update multiple records in a single operation
   * @param entity Entity/collection name
   * @param updates Array of updates with IDs
   * @returns Batch operation result
   */
  batchUpdate(
    entity: string,
    updates: Array<{ id: string; data: Partial<Record> }>
  ): Promise<BatchResult>;
  
  /**
   * Delete multiple records in a single operation
   * @param entity Entity/collection name
   * @param ids Array of record IDs to delete
   * @returns Batch operation result
   */
  batchDelete(entity: string, ids: string[]): Promise<BatchResult>;
  
  // ============================================================================
  // Sync Operations
  // ============================================================================
  
  /**
   * Get changes from backend since a specific timestamp
   * @param entity Entity/collection name
   * @param since Timestamp to get changes from
   * @returns Change set with operations
   */
  getChanges(entity: string, since: Date): Promise<ChangeSet>;
  
  /**
   * Push local changes to backend
   * @param entity Entity/collection name
   * @param operations Array of sync operations
   * @returns Sync result with conflicts and errors
   */
  pushChanges(entity: string, operations: SyncOperation[]): Promise<SyncResult>;
  
  /**
   * Resolve a sync conflict
   * @param conflict Conflict details
   * @param resolution Resolution strategy
   * @returns Resolved record
   */
  resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<Record>;
  
  // ============================================================================
  // File Operations
  // ============================================================================
  
  /**
   * Upload a file to the backend
   * @param file File upload details
   * @returns File record with URL
   */
  uploadFile(file: FileUpload): Promise<FileRecord>;
  
  /**
   * Download a file from the backend
   * @param fileId File ID
   * @returns File blob
   */
  downloadFile(fileId: string): Promise<Blob>;
  
  // ============================================================================
  // Capabilities & Metadata
  // ============================================================================
  
  /**
   * Get backend capabilities
   * @returns Capabilities object
   */
  getCapabilities(): BackendCapabilities;
  
  /**
   * Check if backend supports a specific entity
   * @param entity Entity/collection name
   * @returns True if entity is supported
   */
  supportsEntity(entity: string): boolean;
  
  /**
   * Get list of supported entities
   * @returns Array of entity names
   */
  getSupportedEntities(): string[];
  
  // ============================================================================
  // Entity Mapping
  // ============================================================================
  
  /**
   * Map local record to backend format
   * @param entity Entity/collection name
   * @param localRecord Local record
   * @returns Backend-formatted record
   */
  mapToBackend(entity: string, localRecord: Record): any;
  
  /**
   * Map backend record to local format
   * @param entity Entity/collection name
   * @param backendRecord Backend record
   * @returns Local-formatted record
   */
  mapFromBackend(entity: string, backendRecord: any): Record;
}

/**
 * Conflict resolution strategy
 */
export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  mergedData?: Record;
}

/**
 * Backend provider factory function
 */
export type BackendProviderFactory = (config: BackendConfig) => IBackendProvider;

/**
 * Backend provider metadata for registration
 */
export interface BackendProviderMetadata {
  id: string;
  name: string;
  type: BackendType;
  description: string;
  version: string;
  factory: BackendProviderFactory;
  configSchema?: any; // JSON Schema for configuration
}
