// ABOUTME: The public surface of the repository integration harness: the context, the seed,
// ABOUTME: the query helpers, the storage-mock guard and the optional Postgres path.

export {
  closeTestContext,
  createTestContext,
  type TestContext,
  type TestContextOptions,
  type TestDatabase,
  type TestDatabaseKind,
} from './context';

export {
  createSeed,
  fixtureInput,
  referenceColumns,
  rewriteReferences,
  seedRegistry,
  seededId,
  SEED_ORDER,
  stripServerOwned,
  TEST_ACTOR,
  withAncestors,
  type Seed,
} from './seed';

export { createQueries, type TestQueries } from './queries';

export { referenceOrder } from './order';

export {
  collectGuardedFiles,
  dataStorageRoot,
  findMockCalls,
  findStorageMockViolations,
  isStorageModule,
  repositoryRoot,
  resolveSpecifier,
  scanForStorageMocks,
  STORAGE_MOCK_RULE,
  STORAGE_ROOTS,
  type SourceFile,
  type StorageMockViolation,
} from './guard';

export {
  applyCanonicalSchemaForPostgres,
  canonicalSchemaOrder,
  createPostgresHarness,
  newSchemaName,
  numberPlaceholders,
  normaliseError,
  normaliseValue,
  translateSql,
  type PostgresHarness,
  type PostgresHarnessOptions,
} from './postgres';
