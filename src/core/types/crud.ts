// ABOUTME: Standardized CRUD types for all modules
// ABOUTME: Provides consistent type definitions for create, read, update, delete operations


// Base entity interface - all entities should extend this
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

// CRUD operation result
export interface CrudResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// CRUD state for a single entity type
export interface CrudState<T extends BaseEntity> {
  items: T[];
  loading: boolean;
  error: string | null;
  selectedItem: T | null;
}

// Standard CRUD operations interface
export interface CrudOperations<T extends BaseEntity> {
  // Create
  create: (data: Omit<T, 'id' | 'created_at' | 'updated_at'>) => Promise<T>;
  
  // Read
  findById: (id: string) => T | undefined;
  findAll: () => T[];
  findByQuery: (query: Partial<T>) => T[];
  
  // Update
  update: (id: string, data: Partial<Omit<T, 'id' | 'created_at'>>) => Promise<T>;
  
  // Delete
  remove: (id: string) => Promise<void>;
  
  // Batch operations
  createMany: (items: Array<Omit<T, 'id' | 'created_at' | 'updated_at'>>) => Promise<T[]>;
  updateMany: (ids: string[], data: Partial<Omit<T, 'id' | 'created_at'>>) => Promise<T[]>;
  removeMany: (ids: string[]) => Promise<void>;
}

// Hook return type with state and operations
export interface UseCrudReturn<T extends BaseEntity> extends CrudOperations<T> {
  // State
  items: T[];
  loading: boolean;
  error: string | null;
  selectedItem: T | null;
  
  // State setters
  setSelectedItem: (item: T | null) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

// Options for useCrudFactory hook
export interface UseCrudOptions<T extends BaseEntity> {
  collectionName: string;
  entityName: string;
  initialData?: T[];
  enableOptimisticUpdates?: boolean;
  /**
   * When true (default), remove/removeMany call window.confirm internally.
   * Set false when the caller owns confirmation (e.g. useEntityCrud pages
   * using the ConfirmDialog flow).
   */
  confirmBeforeDelete?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (action: 'create' | 'update' | 'delete', item: T) => void;
}

// Pagination options
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Paginated result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query filter operators
export type FilterOperator = 
  | 'eq' | 'neq'           // Equal / Not equal
  | 'gt' | 'gte'           // Greater than / Greater than or equal
  | 'lt' | 'lte'           // Less than / Less than or equal
  | 'contains' | 'startsWith' | 'endsWith'  // String operations
  | 'in' | 'nin'           // In / Not in array
  | 'between';             // Range

// Query filter
export interface QueryFilter<T> {
  field: keyof T;
  operator: FilterOperator;
  value: any;
}

// Advanced query options
export interface QueryOptions<T> {
  filters?: QueryFilter<T>[];
  pagination?: PaginationOptions;
  include?: (keyof T)[];
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Entity validator function type
export type EntityValidator<T> = (data: Partial<T>) => ValidationResult;

// Extended CRUD options with validation
export interface UseCrudOptionsWithValidation<T extends BaseEntity> extends UseCrudOptions<T> {
  validator?: EntityValidator<T>;
}

// Action types for optimistic updates
export type CrudActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_CREATE' | 'BULK_UPDATE' | 'BULK_DELETE';

// Optimistic update record
export interface OptimisticUpdate<T> {
  id: string;
  action: CrudActionType;
  originalData?: T;
  newData?: Partial<T>;
  timestamp: number;
}

// CRUD event for subscriptions
export interface CrudEvent<T extends BaseEntity> {
  type: CrudActionType;
  entity: T;
  previousEntity?: T;
  timestamp: string;
}

// CRUD event subscriber
export type CrudEventSubscriber<T extends BaseEntity> = (event: CrudEvent<T>) => void;

// Metadata for collections
export interface CollectionMetadata {
  name: string;
  primaryKey: string;
  indexes?: string[];
  relationships?: {
    [key: string]: {
      collection: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
      foreignKey: string;
    };
  };
}

// Import/Export options
export interface ImportOptions {
  skipValidation?: boolean;
  updateExisting?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  fields?: string[];
  filters?: QueryFilter<any>[];
}

// Statistics for CRUD operations
export interface CrudStatistics {
  totalCreated: number;
  totalUpdated: number;
  totalDeleted: number;
  lastOperation: string | null;
  lastOperationTime: string | null;
}

// Helper type for generating IDs
export type IdGenerator = () => string;

// Default ID generator using crypto.randomUUID or timestamp fallback
export const generateId: IdGenerator = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Helper to get current timestamp
export const getTimestamp = (): string => new Date().toISOString();

// Empty CRUD state factory
export const createEmptyCrudState = <T extends BaseEntity>(): CrudState<T> => ({
  items: [],
  loading: false,
  error: null,
  selectedItem: null,
});

// Default CRUD result factory
export const createCrudResult = <T>(success: boolean, data?: T, error?: string): CrudResult<T> => ({
  success,
  data,
  error,
});
