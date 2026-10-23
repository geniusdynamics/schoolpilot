// ABOUTME: The public surface of the sync layer: the clock, the envelope, the per-entity
// ABOUTME: policies, the scoped replica, the two nodes, the HTTP wire and the conflict reader.

export { HlcClock, compareHlc, deviceOf, formatHlc, latestHlc, laterHlc, parseHlc } from './hlc';
export type { HlcParts } from './hlc';

export type { ChangeOp, ConflictKind, ConflictNote, Envelope, Snapshot } from './envelope';

export { cellFieldsFor, cellKey, mergeChange, mergeSnapshot, policyFor } from './policies';
export type { ConflictPolicy, MergeResult, StoredState } from './policies';

export {
  entityInScope,
  referenceRank,
  rowInScope,
  scopeKey,
  scopedEntities,
} from './scope';
export type { ReplicaScope } from './scope';

export { SyncStore } from './store';
export type {
  ApplyResult,
  ApplyStatus,
  OutboxEntry,
  StorageDialect,
  StoredConflict,
  SyncRole,
  SyncStoreOptions,
} from './store';

export { SyncApplier } from './apply';

export { DeviceNode, ServerNode } from './node';
export type {
  LocalWrite,
  PullPage,
  PullSummary,
  PushSummary,
  ReplicaOptions,
  SyncTransport,
} from './node';

export { createHttpSyncTransport } from './httpTransport';
export type { HttpSyncTransportOptions } from './httpTransport';

export { readSyncConflicts, summariseConflicts } from './conflicts';
export type { ConflictSummary, SyncConflict } from './conflicts';
