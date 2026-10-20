// ABOUTME: Public surface of the repository layer: the repository itself, the schemas the
// ABOUTME: forms bind to, the typed errors and the page, change-event and audit types.

export {
  Repository,
  createRepository,
  type RepositoryOptions,
} from './repository';

export {
  createSchemaFor,
  entitySchema,
  fieldIssue,
  isServerOwnedField,
  issuesFromZodError,
  toWritableValues,
  updateSchemaFor,
  SERVER_OWNED_FIELDS,
  type ServerOwnedField,
} from './schemas';

export {
  isRepositoryError,
  RepositoryConflictError,
  RepositoryError,
  RepositoryInvariantError,
  RepositoryNotFoundError,
  RepositoryPermissionError,
  RepositoryReferenceError,
  RepositoryStorageError,
  RepositoryValidationError,
  type RepositoryConflictReason,
  type RepositoryErrorCode,
  type RepositoryFieldIssue,
} from './errors';

export {
  CONCURRENCY_COLUMN,
  CONCURRENCY_FALLBACK_COLUMN,
  concurrencyColumnFor,
  ensureConcurrencyColumns,
  hasBusinessVersion,
  INITIAL_VERSION,
} from './concurrency';

export { AUDIT_DDL, AUDIT_TABLE, applyAuditSchema, readAuditEvents, writeAuditEvent } from './audit';

export { ENFORCED_INVARIANTS, guardsFor, type InvariantContext, type InvariantGuard } from './invariants';

export {
  columnsFor,
  decodeRow,
  encodeRow,
  type ColumnKind,
  type ColumnMeta,
  type EntityColumns,
} from './columns';

export { DEFAULT_LIMIT, MAX_LIMIT, type WhereClause } from './query';

export { mapStorageError, mapWriteError } from './storageErrors';

export type {
  AuditEvent,
  AuditQuery,
  AuthorizationRequest,
  Authorizer,
  ChangeEvent,
  ChangeType,
  CreateInput,
  FilterCondition,
  ListQuery,
  OrderSpec,
  Page,
  RepositoryAction,
  RepositoryRow,
  Unsubscribe,
  UpdateInput,
  UpdateOptions,
  WatchListener,
  WriteOptions,
  WritableFields,
} from './types';
