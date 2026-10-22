// ABOUTME: The errors the workflow engine raises: a definition it refuses, a move the guard denies,
// ABOUTME: and an edit that would break a system workflow.

/** Why the engine refused a call. */
export type WorkflowErrorCode =
  /** A definition does not describe a usable workflow (no states, a duplicate key, a dangling move). */
  | 'invalid_definition'
  /** The definition key names no workflow the engine knows. */
  | 'unknown_workflow'
  /** The workflow is switched off, so it moves nothing. */
  | 'disabled_workflow'
  /** A transition names a state the definition does not declare. */
  | 'unknown_state'
  /** No transition leads from the record's state to the state the caller asked for. */
  | 'no_such_transition'
  /** The move is an exception to a decision already made and carries no reason. */
  | 'reason_required'
  /** The record does not satisfy the transition's condition. */
  | 'condition_failed'
  /** The actor's roles hold neither the transition's roles nor its permissions. */
  | 'forbidden'
  /** The caller tried to remove, rename or disable part of a system workflow. */
  | 'system_protected'
  /** The caller may not manage workflow definitions at all. */
  | 'not_permitted';

/** A refusal that belongs to the engine. */
export class WorkflowError extends Error {
  readonly code: WorkflowErrorCode;
  /** The workflow the refusal is about, when one is known. */
  readonly workflowKey?: string;

  constructor(code: WorkflowErrorCode, message: string, workflowKey?: string) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    if (workflowKey !== undefined) this.workflowKey = workflowKey;
  }
}

/** True when the error is a workflow error, optionally of the given code. */
export function isWorkflowError(error: unknown, code?: WorkflowErrorCode): error is WorkflowError {
  if (!(error instanceof WorkflowError)) return false;
  return code === undefined || error.code === code;
}
