// ABOUTME: The canonical-repository store of the workflow engine: a record's state lives in a state
// ABOUTME: column of its own entity (the ERPNext shape), and the transition audit is the repository's
// ABOUTME: own audit trail, so nothing parallel is invented to hold either.

import { asId } from '@/domain/ids';
import {
  RepositoryNotFoundError,
  type AuditEvent,
  type Repository,
  type RepositoryRow,
  type UpdateInput,
} from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { WorkflowError } from './errors';
import { resolveMove } from './guard';
import type {
  WorkflowApplyRequest,
  WorkflowDefinition,
  WorkflowMove,
  WorkflowRecordState,
  WorkflowTransitionEntry,
  WorkflowWriteOptions,
} from './types';

/** How a canonical entity carries a workflow. */
export interface RepositoryWorkflowHost<E extends EntityName> {
  /** The entity the workflow moves. */
  readonly entity: E;
  /** The column the record's state lives in, e.g. `status`. */
  readonly state_field: string;
  /** The workflow the entity is bound to. */
  readonly workflow_key: string;
  /** The payload a host row keeps for the record; the row's own fields by default. */
  readonly payload_of?: (row: RepositoryRow<E>) => Readonly<Record<string, unknown>>;
}

/** The asynchronous shape of the engine's store, for a repository that reads and writes asynchronously. */
export interface RepositoryWorkflowStore<E extends EntityName> {
  readonly host: RepositoryWorkflowHost<E>;
  read(recordKey: string): Promise<WorkflowRecordState | null>;
  write(record: WorkflowRecordState, options?: WorkflowWriteOptions): Promise<void>;
  /** The transition entries of one record, or of the newest entries when no key is given. */
  readAudit(recordKey?: string): Promise<readonly WorkflowTransitionEntry[]>;
  /** Guards a move, writes the state column, and returns the record and the move that was made. */
  apply(
    definition: WorkflowDefinition,
    request: WorkflowApplyRequest
  ): Promise<{ readonly record: WorkflowRecordState; readonly move: WorkflowMove | null }>;
}

/** The value of one column of a decoded row, without knowing the row's type at compile time. */
function column(row: unknown, field: string): unknown {
  return (row as Record<string, unknown>)[field] ?? null;
}

/** The key of the transition that leads from one state to another, or a plain label. */
function transitionKeyFor(
  definition: WorkflowDefinition,
  from: string | null,
  to: string
): { readonly key: string; readonly effects: readonly string[] } {
  if (definition.policy === 'explicit' && from !== null) {
    const found = definition.transitions.find(
      (transition) => transition.to === to && transition.from.includes(from)
    );
    if (found) return { key: found.key, effects: found.effects ?? [] };
  }
  if (from === null) return { key: 'create', effects: [] };
  const source = definition.states.find((state) => state.key === from);
  const target = definition.states.find((state) => state.key === to);
  if (source && target && target.sequence_order > source.sequence_order) {
    return { key: 'advance', effects: [] };
  }
  return { key: 'reopen', effects: [] };
}

/** Maps a repository audit event of the host entity onto a transition entry. */
function toEntry(
  definition: WorkflowDefinition,
  host: RepositoryWorkflowHost<EntityName>,
  event: AuditEvent
): WorkflowTransitionEntry | null {
  // A create is the record entering the workflow, not a transition of it; the engine's own store
  // records transitions only, and the two shapes have to agree.
  if (event.action === 'create') return null;
  const from = column(event.before, host.state_field);
  const to = column(event.after, host.state_field);
  if (to === null) return null;
  if (from !== null && from === to) return null;
  const fromKey = typeof from === 'string' ? from : null;
  const toKey = String(to);
  const { key, effects } = transitionKeyFor(definition, fromKey, toKey);
  return {
    id: event.id,
    workflow_key: host.workflow_key,
    record_key: event.entityId,
    from: fromKey,
    to: toKey,
    transition: key,
    reason: event.reason,
    actor_id: event.actorId ?? '',
    at: event.createdAt,
    effects,
  };
}

/**
 * Builds the store over a canonical repository.
 *
 * The record's state is a column of the host row, so the state a module already reads is the state
 * the workflow moved: there is no second table to keep in step. The audit is the repository's own
 * `audit_event` trail, written inside the same transaction as the state change, which is what makes
 * "who moved what, when and why" answerable without the engine keeping a log of its own.
 */
export function createRepositoryWorkflowStore<E extends EntityName>(
  repository: Repository,
  host: RepositoryWorkflowHost<E>,
  definition: WorkflowDefinition
): RepositoryWorkflowStore<E> {
  const read = async (recordKey: string): Promise<WorkflowRecordState | null> => {
    const row = await repository.get(host.entity, asId<E>(recordKey));
    if (!row) return null;
    const state = column(row, host.state_field);
    if (typeof state !== 'string') return null;
    const payload = host.payload_of?.(row);
    return {
      record_key: recordKey,
      workflow_key: host.workflow_key,
      state,
      updated_at: String(column(row, 'updated_at') ?? ''),
      updated_by: String(column(row, 'updated_by') ?? ''),
      ...(payload === undefined ? {} : { payload }),
    };
  };

  const write = async (record: WorkflowRecordState, options: WorkflowWriteOptions = {}) => {
    const row = await repository.get(host.entity, asId<E>(record.record_key));
    if (!row) throw new RepositoryNotFoundError(host.entity, record.record_key);
    const patch = { [host.state_field]: record.state } as unknown as UpdateInput<E>;
    await repository.update(host.entity, asId<E>(record.record_key), patch, {
      expectedVersion: row.rowVersion,
      actor: record.updated_by,
      ...(options.reason === undefined || options.reason === null
        ? {}
        : { reason: options.reason }),
    });
  };

  const readAudit = async (recordKey?: string): Promise<readonly WorkflowTransitionEntry[]> => {
    const events =
      recordKey === undefined
        ? await repository.auditLog({ entity: host.entity, limit: 500 })
        : await repository.auditTrail(host.entity, recordKey);
    const entries: WorkflowTransitionEntry[] = [];
    for (const event of events) {
      const entry = toEntry(definition, host as unknown as RepositoryWorkflowHost<EntityName>, event);
      if (entry) entries.push(entry);
    }
    // The repository reads its trail newest first; the engine reads a record's life oldest first, so
    // the two store shapes agree on the order a caller sees.
    return entries.reverse();
  };

  const apply = async (workflow: WorkflowDefinition, request: WorkflowApplyRequest) => {
    const stored = await read(request.recordKey);
    const from = request.from ?? stored?.state ?? null;
    const decision = resolveMove(workflow, { ...request, from });
    if (!decision.allowed) {
      throw new WorkflowError(decision.code, decision.message, workflow.key);
    }
    if (stored !== null && stored.state === decision.move.to) {
      return { record: stored, move: null };
    }
    const record: WorkflowRecordState = {
      record_key: request.recordKey,
      workflow_key: workflow.key,
      state: decision.move.to,
      updated_at: request.at,
      updated_by: request.actor.id,
      ...(stored?.payload === undefined ? {} : { payload: stored.payload }),
    };
    await write(record, { reason: request.reason ?? null });
    return { record, move: decision.move };
  };

  return { host, read, write, readAudit, apply };
}
