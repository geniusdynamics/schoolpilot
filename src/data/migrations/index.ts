// ABOUTME: Public surface of the migration framework: the runner, the migration and progress
// ABOUTME: types, the backup strategies and the typed errors.

export {
  createMigrationRunner,
  MigrationRunner,
  type MigrationRunnerOptions,
} from './runner';

export {
  compareIdentities,
  identityMismatchMessage,
  migrationIdentity,
  type ChecksumDecision,
  type MigrationIdentity,
} from './checksum';

export {
  createDumpBackupStrategy,
  createMemoryBackupStore,
  type BackupStore,
  type DumpBackupStrategyOptions,
} from './backup';

export { compactSql, dumpDatabase, restoreDatabase, validateDump } from './dump';

export {
  dropStatementFor,
  dropStatementsFor,
  schemaObjectsOf,
  type SchemaObject,
  type SchemaObjectKind,
} from './schemaDdl';

export {
  KNOWN_MIGRATION_VERSIONS,
  LEGACY_DATA_MIGRATION_VERSIONS,
  ledgerSchemaMigration,
  moduleSchemaMigration,
  reconciliationSchemaMigration,
  SCHEMA_MIGRATION_FLOOR,
  SCHEMA_MIGRATION_VERSIONS,
  SCHEMA_MIGRATIONS,
  schemaMigrationFor,
  sequencesSchemaMigration,
  subscriptionsSchemaMigration,
  type ModuleSchemaMigration,
} from './schemaMigrations';

export {
  applySchemaMigrations,
  createSchemaMigrationRunner,
  readSchemaVersion,
  rollbackSchemaMigrations,
  type AppliedSchemaMigration,
  type SchemaApplyResult,
  type SchemaMigrationOptions,
  type SchemaVersion,
} from './schemaStartup';

export {
  ATTEMPTS_TABLE,
  BACKUPS_TABLE,
  MIGRATIONS_TABLE,
} from './ledger';

export {
  errorMessage,
  MigrationError,
  type MigrationErrorCode,
  type MigrationErrorOptions,
} from './errors';

export type {
  AppliedMigration,
  BackupPolicy,
  Migration,
  MigrationAttempt,
  MigrationBackup,
  MigrationBackupStrategy,
  MigrationChecksumKind,
  MigrationContext,
  MigrationDescriptor,
  MigrationEvent,
  MigrationPhase,
  MigrationRollbackResult,
  MigrationRunResult,
  MigrationStatus,
} from './types';
