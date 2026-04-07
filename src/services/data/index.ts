/**
 * Unified Data Service
 * 
 * Exports for the unified data layer.
 */

export { UnifiedDataService, uds, createDataService } from './UnifiedDataService';
export { SyncEngine } from './SyncEngine';
export { SQLiteProvider } from './providers/SQLiteProvider';
export { PouchDBProvider } from './providers/PouchDBProvider';
export { createProvider } from './providers';
export type {
  DataProvider,
  ProviderCapabilities,
  Query,
  Filter,
  SortOption,
  PaginationOptions,
  PaginatedResult,
  WriteOptions,
  Operation,
  SyncResult,
  SyncConflict,
  Change,
  DeploymentMode,
  DataServiceConfig,
  BaseEntity,
  DataEvent,
  DataEventType
} from './types';

// Legacy root-level services
export * from './DataContextIntegrationService';
export * from './DataServiceFactory';
export * from './UnifiedCRUDService';
export * from './dataModeManager';
export * from './NetworkStateManager';
