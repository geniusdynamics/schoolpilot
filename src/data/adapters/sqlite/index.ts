// ABOUTME: Public surface of the SQLite storage adapter: one contract, a Node factory for tests
// ABOUTME: and scripts, and a browser factory over the OPFS worker.

export {
  createSqliteAdapter,
  type SqliteAdapterOptions,
} from './core';
export {
  createNodeSqliteAdapter,
  type NodeSqliteAdapterOptions,
} from './node';
export {
  createWasmSqliteAdapter,
  WASM_REQUEST_TIMEOUT_MS,
  type WasmSqliteAdapterOptions,
} from './browser';
export {
  createWasmDatabaseDriver,
  type WasmDatabase,
} from './wasmDatabase';
export { statementsForSchema, statementsForSchemas } from './ddl';
export { applyCanonicalSchema, canonicalDatabaseSchema } from './canonical';
export {
  SqliteAdapterError,
  constraintKind,
  type SqliteAdapterErrorCode,
  type SqliteAdapterErrorOptions,
  type SqliteConstraintKind,
} from './errors';
export {
  isSqliteValue,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteDriver,
  type SqliteRow,
  type SqliteRunResult,
  type SqliteTransaction,
  type SqliteValue,
} from './driver';
