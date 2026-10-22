// ABOUTME: Public surface of the workflow engine: the definitions and their guards, the store ports
// ABOUTME: it runs against, the seeded catalogue a module reuses, and the protections on it.

export {
  WorkflowError,
  isWorkflowError,
  type WorkflowErrorCode,
} from './errors';

export type {
  WorkflowActor,
  WorkflowApplyRequest,
  WorkflowApplyResult,
  WorkflowCondition,
  WorkflowDecision,
  WorkflowDefinition,
  WorkflowDefinitionStore,
  WorkflowDenialCode,
  WorkflowMove,
  WorkflowMoveRequest,
  WorkflowPolicy,
  WorkflowRecordState,
  WorkflowStateDefinition,
  WorkflowStore,
  WorkflowTransitionDefinition,
  WorkflowTransitionEntry,
  WorkflowWriteOptions,
} from './types';

export { defineWorkflow, validateDefinition } from './definition';

export {
  availableMoves,
  initialStateOf,
  orderedStates,
  recordSatisfies,
  resolveMove,
  stateByKey,
  type WorkflowAvailableMove,
} from './guard';

export {
  WORKFLOW_MANAGE_PERMISSION,
  assertAdditiveEdit,
  assertDefinitionDisablable,
  assertDefinitionRemovable,
  assertMayManageDefinitions,
  withEngineFields,
} from './protection';

export {
  DOCUMENT_POSTED_KEY,
  FEE_SCHEDULE_APPROVAL_KEY,
  LIFECYCLE_DRAFT_ACTIVE_CLOSED_KEY,
  MARKS_LIFECYCLE_KEY,
  PROMOTION_RUN_KEY,
  REVIEW_VERIFY_KEY,
  SYSTEM_WORKFLOWS,
  TWO_STEP_APPROVAL_KEY,
  documentPosted,
  feeScheduleApproval,
  findSystemWorkflow,
  lifecycleDraftActiveClosed,
  marksLifecycle,
  promotionRun,
  reviewVerify,
  twoStepApproval,
} from './catalogue';

export {
  createMemoryDefinitionStore,
  createMemoryWorkflowStore,
  createStorageDefinitionStore,
  createStorageWorkflowStore,
} from './store';

export { WorkflowEngine, type WorkflowEngineOptions } from './engine';

export {
  createRepositoryWorkflowStore,
  type RepositoryWorkflowHost,
  type RepositoryWorkflowStore,
} from './repositoryStore';
