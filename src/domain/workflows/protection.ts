// ABOUTME: The system-workflow protections: a seeded workflow cannot be deleted or disabled, and it
// ABOUTME: may only be added to. Removing or renaming one of its states, or dropping one of its
// ABOUTME: transitions, is refused by the engine rather than by the screen that happens to render it.

import { hasPermission } from '@/data/auth';
import type { Permission } from '@/data/auth';

import { WorkflowError } from './errors';
import type {
  WorkflowActor,
  WorkflowDefinition,
  WorkflowStateDefinition,
  WorkflowTransitionDefinition,
} from './types';

/** The permission that owns the workflow catalogue. */
export const WORKFLOW_MANAGE_PERMISSION: Permission = 'workflow.manage';

/** Refuses a caller whose roles do not own the workflow catalogue. */
export function assertMayManageDefinitions(actor: WorkflowActor): void {
  if (hasPermission(actor.roles, WORKFLOW_MANAGE_PERMISSION)) return;
  if (actor.permissions?.includes(WORKFLOW_MANAGE_PERMISSION)) return;
  throw new WorkflowError(
    'not_permitted',
    `The roles [${actor.roles.join(', ')}] do not hold ${WORKFLOW_MANAGE_PERMISSION}.`
  );
}

/** Refuses the removal of a system workflow. A user-defined one may go. */
export function assertDefinitionRemovable(definition: WorkflowDefinition): void {
  if (!definition.system) return;
  throw new WorkflowError(
    'system_protected',
    `The system workflow ${definition.key} cannot be deleted; it may only be added to.`,
    definition.key
  );
}

/** Refuses the disabling of a system workflow. */
export function assertDefinitionDisablable(definition: WorkflowDefinition): void {
  if (!definition.system) return;
  throw new WorkflowError(
    'system_protected',
    `The system workflow ${definition.key} cannot be disabled; it may only be added to.`,
    definition.key
  );
}

/** The two states are the same state: same key, same name, same place in the life of the record. */
function sameState(left: WorkflowStateDefinition, right: WorkflowStateDefinition): boolean {
  return (
    left.key === right.key &&
    left.name === right.name &&
    left.sequence_order === right.sequence_order &&
    Boolean(left.is_initial) === Boolean(right.is_initial) &&
    Boolean(left.is_terminal) === Boolean(right.is_terminal)
  );
}

/** The two transitions are the same move: same key, same edge. */
function sameTransition(
  left: WorkflowTransitionDefinition,
  right: WorkflowTransitionDefinition
): boolean {
  return (
    left.key === right.key &&
    left.to === right.to &&
    left.from.length === right.from.length &&
    left.from.every((from) => right.from.includes(from))
  );
}

/**
 * Refuses an edit of a system workflow that takes something away.
 *
 * A school may add a state, add a transition, or change the workflow's own name and description.
 * It may not remove or rename a state, remove a transition, or change where a transition leads: a
 * record already in one of those states, or an audit trail that names one of those transitions,
 * would be left pointing at something that no longer exists.
 */
export function assertAdditiveEdit(
  current: WorkflowDefinition,
  next: WorkflowDefinition
): void {
  if (!current.system) return;

  for (const state of current.states) {
    const kept = next.states.find((candidate) => candidate.key === state.key);
    if (!kept) {
      throw new WorkflowError(
        'system_protected',
        `The state ${state.key} of the system workflow ${current.key} cannot be removed.`,
        current.key
      );
    }
    if (!sameState(state, kept)) {
      throw new WorkflowError(
        'system_protected',
        `The state ${state.key} of the system workflow ${current.key} cannot be renamed or reordered.`,
        current.key
      );
    }
  }

  for (const transition of current.transitions) {
    const kept = next.transitions.find((candidate) => candidate.key === transition.key);
    if (!kept) {
      throw new WorkflowError(
        'system_protected',
        `The transition ${transition.key} of the system workflow ${current.key} cannot be removed.`,
        current.key
      );
    }
    if (!sameTransition(transition, kept)) {
      throw new WorkflowError(
        'system_protected',
        `The transition ${transition.key} of the system workflow ${current.key} cannot be re-pointed.`,
        current.key
      );
    }
  }
}

/**
 * The key and the system flag of a definition are the engine's, not the caller's.
 *
 * A definition a school writes is never a system workflow: only the seeded catalogue is, so a
 * caller cannot define its way past the protections. An edit keeps the flag the definition had.
 */
export function withEngineFields(
  current: WorkflowDefinition | null,
  next: WorkflowDefinition
): WorkflowDefinition {
  if (current === null) return { ...next, system: false };
  return { ...next, key: current.key, system: current.system };
}
