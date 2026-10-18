// ABOUTME: Database services index file - exports all database-related services
// ABOUTME: Provides centralized access to database management functionality

// Core database manager
export { UnifiedDatabaseManager, unifiedDatabaseManager } from './UnifiedDatabaseManager';
export type { DeploymentMode, ProviderType, DatabaseStatus, DatabaseHealth } from './UnifiedDatabaseManager';

// Provider selector and factory
export { getDatabaseManager, resetDatabaseManager } from './ProviderSelector';
export { DatabaseProviderFactory, getDatabaseProviderFactory } from './DatabaseProviderFactory';

// Schema converter
export { SchemaConverter } from './SchemaConverter';
export type { ConversionResult, SQLiteTableSchema, SQLiteColumn } from './SchemaConverter';

// Interfaces
export type { 
  IDatabaseProvider, 
  ICollection, 
  DatabaseConfig, 
  CollectionSchema,
  IndexDefinition 
} from './interfaces';

// Providers (if they exist)
export * from './PouchDBProvider';
export * from './HybridProvider';

// Re-export for backward compatibility
export { unifiedDatabaseManager as databaseManager } from './UnifiedDatabaseManager';

// Detection module (Phase 2 - CapabilityDetector)
export * from './detection';

// Sync module (Phase 3 - OfflineQueue, SyncManager, NetworkMonitor)
export * from './sync';

// Monitoring module (Phase 4 - MetricsCollector, HealthChecker)
export * from './monitoring';

// Legacy root-level services
export * from './databaseService';
// RXDB removed - Phase 4: rxdbService no longer exported
// Use databaseService or collections from './collections' instead