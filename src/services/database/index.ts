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

// Re-export for backward compatibility
export { unifiedDatabaseManager as databaseManager };