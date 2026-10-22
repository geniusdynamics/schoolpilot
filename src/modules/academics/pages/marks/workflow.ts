// ABOUTME: The mark entry workflow of one assessment x teaching group (spec 03 §9):
// ABOUTME: open -> submitted -> moderated -> locked -> published, with the reason an override needs
// ABOUTME: and the record of who changed what, when, and what the value was before.
//
// The life itself is the engine's: `academics.marks_lifecycle` in `src/domain/workflows` declares the
// states, their order and the states an edit is an override in. This file is the thin host around it:
// it maps the assessment's own status onto the workflow, keeps the per-cell moderation payload the
// engine has no business knowing about, and speaks the module's own error vocabulary.

import {
  MARKS_LIFECYCLE_KEY,
  WorkflowEngine,
  createMemoryWorkflowStore as createEngineMemoryStore,
  createStorageWorkflowStore as createEngineStorageStore,
  marksLifecycle,
  stateByKey,
  type WorkflowRecordState,
  type WorkflowStore as EngineWorkflowStore,
  type WorkflowTransitionEntry,
} from '@/domain/workflows';

import { MarkEntryError, type ModerationRecord, type WorkflowAuditEntry, type WorkflowRecord, type WorkflowState } from './types';

/** The states, in the order they are reached. */
export const WORKFLOW_STATES: readonly WorkflowState[] = marksLifecycle.states
  .slice()
  .sort((left, right) => left.sequence_order - right.sequence_order)
  .map((state) => state.key as WorkflowState);

const RANK: Readonly<Record<WorkflowState, number>> = Object.fromEntries(
  marksLifecycle.states.map((state) => [state.key, state.sequence_order])
) as Readonly<Record<WorkflowState, number>>;

/**
 * The state an assessment's own status implies.
 *
 * The canonical assessment carries a status but no per-group workflow, so its status is the floor:
 * a published assessment is published for every group, while a group can be locked by its own
 * record before the assessment itself is.
 */
export function stateFromAssessmentStatus(status: string): WorkflowState {
  switch (status) {
    case 'published':
      return 'published';
    case 'moderated':
      return 'moderated';
    case 'closed':
      return 'submitted';
    default:
      return 'open';
  }
}

/** The stricter of what the assessment says and what the group's own record says. */
export function effectiveWorkflowState(
  assessmentStatus: string,
  recordState: WorkflowState | undefined
): WorkflowState {
  const fromAssessment = stateFromAssessmentStatus(assessmentStatus);
  if (!recordState) return fromAssessment;
  return RANK[recordState] >= RANK[fromAssessment] ? recordState : fromAssessment;
}

/**
 * True when an edit needs a reason.
 *
 * The engine declares it: `moderated`, `locked` and `published` carry `requires_reason_on_leave`,
 * because a moderated mark is already a decision someone made and a locked or published one is part
 * of a released result. This reads that declaration rather than repeating the list.
 */
export function requiresOverrideReason(state: WorkflowState): boolean {
  return stateByKey(marksLifecycle, state)?.requires_reason_on_leave === true;
}

/** Refuses an override that carries no reason. This is the rule the acceptance names. */
export function assertOverrideReason(state: WorkflowState, reason: string | null | undefined): void {
  if (!requiresOverrideReason(state)) return;
  if (reason !== null && reason !== undefined && reason.trim() !== '') return;
  throw new MarkEntryError(
    'reason_required',
    `This group's marks are ${state}. Write a reason to change a mark after they are ${state}.`
  );
}

/** True when the state is read-only without an override. */
export function isReadOnly(state: WorkflowState): boolean {
  return requiresOverrideReason(state);
}

/** The durable half of the workflow: the engine's own store port. */
export type WorkflowStore = EngineWorkflowStore;

/** A workflow kept in browser storage. */
export function createStorageWorkflowStore(
  recordsKey: string,
  auditKey: string,
  storage?: Storage | null
): WorkflowStore {
  return createEngineStorageStore(recordsKey, auditKey, storage);
}

/** A workflow that lives only as long as the page. */
export function createMemoryWorkflowStore(): WorkflowStore {
  return createEngineMemoryStore();
}

function isWorkflowState(value: unknown): value is WorkflowState {
  return typeof value === 'string' && WORKFLOW_STATES.includes(value as WorkflowState);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Where a workflow record is keyed. */
function recordKey(assessmentId: string, teachingGroupId: string): string {
  return `${assessmentId}|${teachingGroupId}`;
}

/** The moderation payload a record keeps, read defensively out of what the store holds. */
function readModerations(payload: Readonly<Record<string, unknown>> | undefined): Readonly<Record<string, ModerationRecord>> {
  const value = payload?.moderations;
  return isRecord(value) ? (value as Readonly<Record<string, ModerationRecord>>) : {};
}

/** The two halves of a record key. An assessment id never carries the separator itself. */
function splitRecordKey(key: string): { readonly assessmentId: string; readonly teachingGroupId: string } {
  const at = key.indexOf('|');
  return at < 0
    ? { assessmentId: key, teachingGroupId: '' }
    : { assessmentId: key.slice(0, at), teachingGroupId: key.slice(at + 1) };
}

/**
 * The workflow of the assessment x teaching groups on this screen.
 *
 * The record is per group, which the assessment row cannot express: two groups of the same
 * assessment are submitted, moderated and locked on their own. Every transition is guarded by the
 * engine and appended to the audit list with the actor, the instant and the reason; a moderation
 * keeps the value the cell held before it in the record's own payload.
 */
export class MarkWorkflow {
  private readonly store: WorkflowStore;
  private readonly engine: WorkflowEngine;

  constructor(store: WorkflowStore) {
    this.store = store;
    this.engine = new WorkflowEngine({ store, definitions: [marksLifecycle] });
  }

  record(assessmentId: string, teachingGroupId: string): WorkflowRecord | null {
    const stored = this.store.read(recordKey(assessmentId, teachingGroupId));
    if (!stored || !isWorkflowState(stored.state)) return null;
    return this.toRecord(stored);
  }

  state(assessmentId: string, teachingGroupId: string, assessmentStatus: string): WorkflowState {
    return effectiveWorkflowState(assessmentStatus, this.record(assessmentId, teachingGroupId)?.state);
  }

  private toRecord(stored: WorkflowRecordState): WorkflowRecord {
    const { assessmentId, teachingGroupId } = splitRecordKey(stored.record_key);
    return {
      assessmentId,
      teachingGroupId,
      state: stored.state as WorkflowState,
      updatedAt: stored.updated_at,
      updatedBy: stored.updated_by,
      moderations: readModerations(stored.payload),
    };
  }

  private toAuditEntry(entry: WorkflowTransitionEntry): WorkflowAuditEntry {
    const { assessmentId, teachingGroupId } = splitRecordKey(entry.record_key);
    return {
      id: entry.id,
      assessmentId,
      teachingGroupId,
      from: entry.from === null ? null : (entry.from as WorkflowState),
      to: entry.to as WorkflowState,
      reason: entry.reason,
      actorId: entry.actor_id,
      at: entry.at,
    };
  }

  /**
   * Moves a group's workflow to `to`.
   *
   * Moving forward is the normal path and needs no reason. Moving back (reopening a moderated or
   * locked group) is an exception to a decision, so it needs one. The engine decides both; this
   * method only turns its refusal into the error the grid already speaks.
   */
  advance(
    assessmentId: string,
    teachingGroupId: string,
    assessmentStatus: string,
    to: WorkflowState,
    options: { readonly actorId: string; readonly at: string; readonly reason?: string | null }
  ): WorkflowRecord {
    const from = this.state(assessmentId, teachingGroupId, assessmentStatus);
    if (from === to) {
      return (
        this.record(assessmentId, teachingGroupId) ?? {
          assessmentId,
          teachingGroupId,
          state: to,
          updatedAt: options.at,
          updatedBy: options.actorId,
          moderations: {},
        }
      );
    }

    const key = recordKey(assessmentId, teachingGroupId);
    const actor = { id: options.actorId, roles: [] as const };
    const reason = options.reason ?? null;

    const decision = this.engine.evaluate(MARKS_LIFECYCLE_KEY, {
      recordKey: key,
      from,
      to,
      actor,
      reason,
    });
    if (!decision.allowed) {
      if (decision.code === 'reason_required') {
        throw new MarkEntryError(
          'reason_required',
          `Reopening marks that are ${from} needs a reason.`
        );
      }
      throw new MarkEntryError('not_ready', decision.message);
    }

    const result = this.engine.apply(MARKS_LIFECYCLE_KEY, {
      recordKey: key,
      from,
      to,
      actor,
      reason,
      at: options.at,
    });
    return this.toRecord(result.record);
  }

  /** Records a moderation of one cell: the value before it, the value after, and why. */
  moderate(
    assessmentId: string,
    teachingGroupId: string,
    cell: string,
    values: { readonly original: string; readonly moderated: string; readonly reason: string; readonly actorId: string; readonly at: string }
  ): ModerationRecord {
    const key = recordKey(assessmentId, teachingGroupId);
    const stored = this.store.read(key);
    const moderations: Record<string, ModerationRecord> = {
      ...readModerations(stored?.payload),
      [cell]: {
        original: values.original,
        moderated: values.moderated,
        reason: values.reason,
        actorId: values.actorId,
        at: values.at,
      },
    };
    const state = stored && isWorkflowState(stored.state) ? stored.state : 'moderated';
    this.store.write({
      record_key: key,
      workflow_key: MARKS_LIFECYCLE_KEY,
      state,
      updated_at: values.at,
      updated_by: values.actorId,
      payload: { moderations },
    });
    return moderations[cell];
  }

  moderations(assessmentId: string, teachingGroupId: string): Readonly<Record<string, ModerationRecord>> {
    return this.record(assessmentId, teachingGroupId)?.moderations ?? {};
  }

  audit(assessmentId?: string, teachingGroupId?: string): WorkflowAuditEntry[] {
    const matches = (key: string): boolean => {
      const parts = splitRecordKey(key);
      return (
        (assessmentId === undefined || parts.assessmentId === assessmentId) &&
        (teachingGroupId === undefined || parts.teachingGroupId === teachingGroupId)
      );
    };
    return this.store
      .readAudit()
      .filter((entry) => matches(entry.record_key))
      .map((entry) => this.toAuditEntry(entry));
  }

  clear(): void {
    this.store.clear?.();
  }
}
