// ABOUTME: The workflow engine's data model: a definition of ordered states and guarded transitions,
// ABOUTME: the actor a move is made by, the record a workflow moves, and the audit entry every
// ABOUTME: decided transition leaves behind.

import type { Permission, Role } from '@/data/auth';
import type { EntityName } from '@/domain/schema';

/**
 * How the moves of a workflow are declared.
 *
 * `sequence` reads the states as an ordered life: a move to a later state is an advance, a move to
 * an earlier one is a reopen, and no transition has to be written down. `explicit` names every move,
 * which is what an approval needs: a named transition can carry roles, permissions and a reason.
 */
export type WorkflowPolicy = 'sequence' | 'explicit';

/** One state a record can be in. */
export interface WorkflowStateDefinition {
  /** The value stored on the record. It is the state key a transition names. */
  readonly key: string;
  /** The name a reader is shown. */
  readonly name: string;
  /** Position in the life of the record; the sequence policy orders moves by it. */
  readonly sequence_order: number;
  /** The state a record with no stored state is in. Exactly one state declares it. */
  readonly is_initial?: boolean;
  /** A state a record does not leave by the ordinary path. */
  readonly is_terminal?: boolean;
  /**
   * True when changing the record while it is in this state is an exception to a decision already
   * made, so it needs a reason.
   *
   * This is the state half of an override: a moderated or locked mark is a decision someone made,
   * so editing it is an override, and an override without a reason is refused. It is not a property
   * of any one transition, so it is read off the state rather than off the move.
   */
  readonly requires_reason_on_leave?: boolean;
}

/** A predicate over the record a transition is applied to. */
export type WorkflowCondition =
  | {
      readonly kind: 'field_equals';
      readonly field: string;
      readonly value: string | number | boolean | null;
    }
  | { readonly kind: 'field_present'; readonly field: string }
  | { readonly kind: 'any_of'; readonly conditions: readonly WorkflowCondition[] };

/** One named move of an explicit workflow. */
export interface WorkflowTransitionDefinition {
  /** The action name, e.g. `approve`. It names the move in the audit trail. */
  readonly key: string;
  /** The label a reader is shown. */
  readonly label: string;
  /** The states the transition leaves. */
  readonly from: readonly string[];
  /** The state it enters. */
  readonly to: string;
  /** The roles, one of which the actor must hold, when the move is role-guarded. */
  readonly allowed_roles?: readonly Role[];
  /** The permissions, one of which the actor must hold, when the move is permission-guarded. */
  readonly allowed_permissions?: readonly Permission[];
  /** True when the move is an exception to a decision and needs a reason. */
  readonly requires_reason?: boolean;
  /** A predicate the record must satisfy for the move to be allowed. */
  readonly condition?: WorkflowCondition;
  /** Named effects the host applies after the move (a notification, a document, a posting). */
  readonly effects?: readonly string[];
}

/**
 * A workflow: the states a record moves through and the moves between them.
 *
 * This is the `Workflow`/`WorkflowState` model of the shared types grown up: the same ordered state
 * list, plus the transitions, the guards and the system flag a reusable engine needs.
 */
export interface WorkflowDefinition {
  /** The stable key a module names a workflow by, e.g. `academics.marks_lifecycle`. */
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  /** True for a seeded workflow: it cannot be deleted or disabled, and it only ever grows. */
  readonly system: boolean;
  /** False when the workflow is switched off. A disabled workflow moves nothing. */
  readonly enabled?: boolean;
  /** The canonical entity whose records the workflow moves; a permission denial names it. */
  readonly scope_entity?: EntityName;
  readonly policy: WorkflowPolicy;
  readonly states: readonly WorkflowStateDefinition[];
  /** The named moves of an `explicit` workflow. Empty for a `sequence` workflow. */
  readonly transitions: readonly WorkflowTransitionDefinition[];
  /** The permission a caller needs to move a record when the transition names none. */
  readonly default_permission?: Permission;
}

/** Who is making a move. The permissions are read from the roles through the repository's RBAC. */
export interface WorkflowActor {
  readonly id: string;
  readonly roles: readonly Role[];
  /** Direct grants on top of the roles, for a caller the role catalogue does not cover. */
  readonly permissions?: readonly Permission[];
}

/** The durable state of one record under one workflow. */
export interface WorkflowRecordState {
  /** The identity of the host record, e.g. `assessment-1|group-1`. */
  readonly record_key: string;
  /** The workflow the record is under. */
  readonly workflow_key: string;
  /** The state key the record is in. */
  readonly state: string;
  readonly updated_at: string;
  readonly updated_by: string;
  /** The host record's own workflow payload (a moderation map, an approval note, ...). */
  readonly payload?: Readonly<Record<string, unknown>>;
}

/** One decided transition: who moved what, from where to where, when, and why. */
export interface WorkflowTransitionEntry {
  readonly id: string;
  readonly workflow_key: string;
  readonly record_key: string;
  /** The state left, or null when the record had no state yet. */
  readonly from: string | null;
  readonly to: string;
  /** The transition's key, or `advance`/`reopen` for a sequence workflow. */
  readonly transition: string;
  readonly reason: string | null;
  readonly actor_id: string;
  readonly at: string;
  /** The effects the move named, so a reader knows what the host was asked to do. */
  readonly effects?: readonly string[];
}

/** Options a store write takes. */
export interface WorkflowWriteOptions {
  /** Why the record moved; a canonical store records it on the audit row. */
  readonly reason?: string | null;
}

/** Where a workflow's record state and its audit trail live. */
export interface WorkflowStore {
  read(recordKey: string): WorkflowRecordState | null;
  write(record: WorkflowRecordState, options?: WorkflowWriteOptions): void;
  /** The transition entries of one record, or of every record when no key is given. */
  readAudit(recordKey?: string): readonly WorkflowTransitionEntry[];
  appendAudit(entry: WorkflowTransitionEntry): void;
  /** Empties the store. Optional: a canonical store has no such operation. */
  clear?(): void;
}

/** Where the definitions themselves live, so a school can add and keep its own workflows. */
export interface WorkflowDefinitionStore {
  readAll(): readonly WorkflowDefinition[];
  read(key: string): WorkflowDefinition | null;
  write(definition: WorkflowDefinition): void;
  remove(key: string): void;
}

/** Why a move was refused. */
export type WorkflowDenialCode =
  | 'unknown_workflow'
  | 'disabled_workflow'
  | 'unknown_state'
  | 'no_such_transition'
  | 'reason_required'
  | 'forbidden'
  | 'condition_failed';

/** A move the guard allowed. */
export interface WorkflowMove {
  readonly transition: WorkflowTransitionDefinition;
  readonly from: string;
  readonly to: string;
  readonly effects: readonly string[];
}

/** The verdict of the guard. */
export type WorkflowDecision =
  | { readonly allowed: true; readonly move: WorkflowMove }
  | {
      readonly allowed: false;
      readonly code: WorkflowDenialCode;
      readonly message: string;
      /** The transition the refusal is about, when one was resolved. */
      readonly transition?: string;
    };

/** A request to move a record. */
export interface WorkflowMoveRequest {
  readonly recordKey: string;
  /** The state the record is in; read from the store when omitted. */
  readonly from?: string | null;
  /** The state the record moves to. */
  readonly to: string;
  readonly actor: WorkflowActor;
  readonly reason?: string | null;
  /** The host record, for a transition's condition. */
  readonly record?: Readonly<Record<string, unknown>>;
}

/** A request to apply a move: the move, the instant, and the payload the record keeps. */
export interface WorkflowApplyRequest extends WorkflowMoveRequest {
  readonly at: string;
  /** The payload the record keeps; the stored payload when omitted. */
  readonly payload?: Readonly<Record<string, unknown>>;
}

/** The result of applying a move. */
export interface WorkflowApplyResult {
  readonly record: WorkflowRecordState;
  /** The audit entry of the move, or null when the record was already in the target state. */
  readonly entry: WorkflowTransitionEntry | null;
}
