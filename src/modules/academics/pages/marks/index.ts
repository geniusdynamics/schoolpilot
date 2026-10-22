// ABOUTME: Public surface of the mark entry v2 page: the page, its grid, the hook behind it and the
// ABOUTME: pure pieces a test drives directly.

export { MarkEntryV2PageContent } from './MarkEntryV2Page';
export { default as MarkEntryV2Page } from './MarkEntryV2Page';
export { MarkEntryGrid } from './MarkEntryGrid';
export { MARK_ENTRY_DEBOUNCE_MS, MARK_ENTRY_PAGE_SIZE, useMarkEntry } from './useMarkEntry';
export type { MarkEntryOptions, MarkEntryState, MarkOverride } from './useMarkEntry';
export { cellAddress, columnAddress, parsePastedGrid, pasteSummary, planPaste } from './paste';
export type { PasteEntry, PastePlan, PasteRejection, PasteTarget } from './paste';
export { nextCell } from './navigation';
export type { CellPosition, GridShape } from './navigation';
export { checkScore, decimalString, readSchemeDefinition, resolveScheme } from './scheme';
export type { AssessmentColumnSource, ResolvedScheme, SchemeDefinitionRecord, ScoreCheck } from './scheme';
export {
  PendingEditQueue,
  createMemoryPendingEditStore,
  createStoragePendingEditStore,
  flushPendingEdits,
} from './pendingEdits';
export type { FlushReport, PendingEdit, PendingEditStore } from './pendingEdits';
export {
  MarkWorkflow,
  assertOverrideReason,
  createMemoryWorkflowStore,
  createStorageWorkflowStore,
  effectiveWorkflowState,
  isReadOnly,
  requiresOverrideReason,
  stateFromAssessmentStatus,
} from './workflow';
export type { WorkflowStore } from './workflow';
export {
  assertCanWrite,
  assertGroupInScope,
  coversGroup,
  resolveTeachingScope,
} from './teachingScope';
export type { TeachingScopeInput } from './teachingScope';
export { MarkEntryError } from './types';
export type {
  CellEntry,
  CellStatus,
  CellStatusCode,
  GridRow,
  ModerationRecord,
  SchemeColumn,
  StoredMark,
  TeachingScope,
  WorkflowAuditEntry,
  WorkflowRecord,
  WorkflowState,
} from './types';
