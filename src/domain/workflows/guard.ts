// ABOUTME: The pure transition guard: given a definition, a record's state and an actor, it decides
// ABOUTME: whether a move is allowed, and why not when it is not. No storage, no clock, no throwing.

import { hasPermission } from '@/data/auth';

import type {
  WorkflowActor,
  WorkflowCondition,
  WorkflowDecision,
  WorkflowDefinition,
  WorkflowDenialCode,
  WorkflowMoveRequest,
  WorkflowStateDefinition,
  WorkflowTransitionDefinition,
} from './types';

/** The state a definition declares for a key, or null. */
export function stateByKey(
  definition: WorkflowDefinition,
  key: string
): WorkflowStateDefinition | null {
  return definition.states.find((state) => state.key === key) ?? null;
}

/** The state a record with no stored state is in. */
export function initialStateOf(definition: WorkflowDefinition): WorkflowStateDefinition {
  const declared = definition.states.find((state) => state.is_initial);
  if (declared) return declared;
  // A definition that names no initial state starts at its lowest state; `validateDefinition`
  // guarantees there is one, so this never throws on a definition the engine accepted.
  return [...definition.states].sort((left, right) => left.sequence_order - right.sequence_order)[0];
}

/** The states in the order a record reaches them. */
export function orderedStates(definition: WorkflowDefinition): readonly WorkflowStateDefinition[] {
  return [...definition.states].sort((left, right) => left.sequence_order - right.sequence_order);
}

/** True when the actor holds one of the transition's roles and one of its permissions. */
function actorMayMove(
  definition: WorkflowDefinition,
  transition: WorkflowTransitionDefinition,
  actor: WorkflowActor
): boolean {
  const roles = transition.allowed_roles ?? [];
  if (roles.length > 0 && !actor.roles.some((role) => roles.includes(role))) return false;

  const permissions = transition.allowed_permissions ?? [];
  const required = permissions.length > 0
    ? permissions
    : definition.default_permission === undefined
      ? []
      : [definition.default_permission];
  if (required.length === 0) return true;

  return required.some(
    (permission) =>
      hasPermission(actor.roles, permission) ||
      (actor.permissions?.includes(permission) ?? false)
  );
}

/** True when the record satisfies the condition, or the condition is absent. */
export function recordSatisfies(
  condition: WorkflowCondition | undefined,
  record: Readonly<Record<string, unknown>> | undefined
): boolean {
  if (condition === undefined) return true;
  switch (condition.kind) {
    case 'field_equals':
      return (record?.[condition.field] ?? null) === condition.value;
    case 'field_present': {
      const value = record?.[condition.field];
      return value !== undefined && value !== null && value !== '';
    }
    case 'any_of':
      return condition.conditions.some((inner) => recordSatisfies(inner, record));
  }
}

/** A synthetic transition for a sequence workflow's forward move. */
function advanceTransition(): WorkflowTransitionDefinition {
  return { key: 'advance', label: 'Advance', from: [], to: '' };
}

/** A synthetic transition for a sequence workflow's backward move; it is an exception, so reasoned. */
function reopenTransition(): WorkflowTransitionDefinition {
  return { key: 'reopen', label: 'Reopen', from: [], to: '', requires_reason: true };
}

/** The transitions an explicit workflow declares from one state to another. */
function explicitMoves(
  definition: WorkflowDefinition,
  from: string,
  to: string
): readonly WorkflowTransitionDefinition[] {
  return definition.transitions.filter(
    (transition) => transition.to === to && transition.from.includes(from)
  );
}

/** A refusal of the guard. */
function deny(
  code: WorkflowDenialCode,
  message: string,
  transition?: string
): WorkflowDecision {
  return transition === undefined
    ? { allowed: false, code, message }
    : { allowed: false, code, message, transition };
}

/**
 * Decides whether a record may move to `to`.
 *
 * The order of the questions is the order a reader asks them: is there such a workflow and such a
 * state, does a transition lead from here to there, may this actor make it, does it need a reason,
 * and does the record satisfy what the move requires.
 */
export function resolveMove(
  definition: WorkflowDefinition,
  request: WorkflowMoveRequest
): WorkflowDecision {
  if (definition.enabled === false) {
    return deny('disabled_workflow', `The workflow ${definition.key} is disabled.`);
  }

  const from = request.from ?? initialStateOf(definition).key;
  const source = stateByKey(definition, from);
  if (!source) {
    return deny('unknown_state', `The workflow ${definition.key} has no state ${from}.`);
  }
  const target = stateByKey(definition, request.to);
  if (!target) {
    return deny('unknown_state', `The workflow ${definition.key} has no state ${request.to}.`);
  }

  let transition: WorkflowTransitionDefinition;
  if (definition.policy === 'sequence') {
    if (target.sequence_order === source.sequence_order) {
      return deny('no_such_transition', `The record is already ${source.name}.`);
    }
    transition = target.sequence_order > source.sequence_order ? advanceTransition() : reopenTransition();
  } else {
    const [first] = explicitMoves(definition, from, request.to);
    if (!first) {
      return deny(
        'no_such_transition',
        `No transition of ${definition.key} leads from ${from} to ${request.to}.`
      );
    }
    transition = first;
  }

  if (!actorMayMove(definition, transition, request.actor)) {
    return deny(
      'forbidden',
      `The roles [${request.actor.roles.join(', ')}] may not ${transition.key} ${definition.key}.`,
      transition.key
    );
  }

  if (transition.requires_reason === true && (request.reason ?? '').trim() === '') {
    return deny(
      'reason_required',
      `The transition ${transition.key} of ${definition.key} needs a reason.`,
      transition.key
    );
  }

  if (!recordSatisfies(transition.condition, request.record)) {
    return deny(
      'condition_failed',
      `The record does not satisfy the condition of ${transition.key} on ${definition.key}.`,
      transition.key
    );
  }

  return {
    allowed: true,
    move: { transition, from, to: request.to, effects: transition.effects ?? [] },
  };
}

/** A move the actor may make: the transition and the state it enters. */
export interface WorkflowAvailableMove {
  readonly transition: WorkflowTransitionDefinition;
  readonly to: string;
}

/** The moves the actor may make from a state, in declaration order. */
export function availableMoves(
  definition: WorkflowDefinition,
  options: {
    readonly from: string | null;
    readonly actor: WorkflowActor;
    readonly record?: Readonly<Record<string, unknown>>;
  }
): readonly WorkflowAvailableMove[] {
  const from = options.from ?? initialStateOf(definition).key;
  const source = stateByKey(definition, from);
  if (!source) return [];

  if (definition.policy === 'sequence') {
    const reachable: WorkflowAvailableMove[] = [];
    for (const state of orderedStates(definition)) {
      if (state.sequence_order === source.sequence_order) continue;
      const transition =
        state.sequence_order > source.sequence_order ? advanceTransition() : reopenTransition();
      if (actorMayMove(definition, transition, options.actor)) {
        reachable.push({ transition, to: state.key });
      }
    }
    return reachable;
  }

  return definition.transitions
    .filter(
      (transition) =>
        transition.from.includes(from) &&
        actorMayMove(definition, transition, options.actor) &&
        recordSatisfies(transition.condition, options.record)
    )
    .map((transition) => ({ transition, to: transition.to }));
}
