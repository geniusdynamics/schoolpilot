// ABOUTME: The workflow engine: it resolves a workflow by key, guards a move, writes the record's
// ABOUTME: state, appends the audit entry, and owns the catalogue a school may add to.

import { generateUuidv7 } from '@/domain/ids';

import { validateDefinition } from './definition';
import { WorkflowError } from './errors';
import {
  availableMoves,
  initialStateOf,
  resolveMove,
  type WorkflowAvailableMove,
} from './guard';
import {
  assertAdditiveEdit,
  assertDefinitionDisablable,
  assertDefinitionRemovable,
  assertMayManageDefinitions,
  withEngineFields,
} from './protection';
import { SYSTEM_WORKFLOWS } from './catalogue';
import type {
  WorkflowActor,
  WorkflowApplyRequest,
  WorkflowApplyResult,
  WorkflowDefinition,
  WorkflowDefinitionStore,
  WorkflowDecision,
  WorkflowMoveRequest,
  WorkflowRecordState,
  WorkflowStore,
  WorkflowTransitionEntry,
} from './types';

/** What the engine is built with. */
export interface WorkflowEngineOptions {
  /** Where the record state and the audit trail live. */
  readonly store: WorkflowStore;
  /** The seeded workflows the engine knows. Defaults to the system catalogue. */
  readonly definitions?: readonly WorkflowDefinition[];
  /** The workflows a school added, layered over the seeded ones. */
  readonly definitionStore?: WorkflowDefinitionStore;
  /** The clock the engine stamps an entry with. Defaults to the system clock. */
  readonly now?: () => string;
  /** A new entry id. Defaults to a UUIDv7. */
  readonly newId?: () => string;
}

/** The engine: one workflow catalogue over one store. */
export class WorkflowEngine {
  private readonly store: WorkflowStore;
  private readonly seeded: readonly WorkflowDefinition[];
  private readonly definitionStore: WorkflowDefinitionStore | null;
  private readonly now: () => string;
  private readonly newId: () => string;

  constructor(options: WorkflowEngineOptions) {
    this.store = options.store;
    this.seeded = options.definitions ?? SYSTEM_WORKFLOWS;
    this.definitionStore = options.definitionStore ?? null;
    this.now = options.now ?? (() => new Date().toISOString());
    this.newId = options.newId ?? generateUuidv7;
  }

  // ------------------------------------------------------------- definitions

  /** Every definition the engine knows: the seeded catalogue and the school's own. */
  definitions(): readonly WorkflowDefinition[] {
    const own = this.definitionStore?.readAll() ?? [];
    const seen = new Set(own.map((definition) => definition.key));
    return [...own, ...this.seeded.filter((definition) => !seen.has(definition.key))];
  }

  /** The definition a key names. Throws when no definition answers to it. */
  definition(key: string): WorkflowDefinition {
    const own = this.definitionStore?.read(key) ?? null;
    if (own) return own;
    const seeded = this.seeded.find((definition) => definition.key === key);
    if (seeded) return seeded;
    throw new WorkflowError('unknown_workflow', `No workflow answers to the key ${key}.`, key);
  }

  /** True when a definition answers to the key. */
  has(key: string): boolean {
    if (this.definitionStore?.read(key)) return true;
    return this.seeded.some((definition) => definition.key === key);
  }

  /**
   * Adds a workflow a school wrote itself.
   *
   * A definition that names a seeded key is refused: the seeded catalogue may only be added to,
   * never replaced. Use {@link update} for that.
   */
  define(definition: WorkflowDefinition, actor: WorkflowActor): WorkflowDefinition {
    assertMayManageDefinitions(actor);
    if (this.has(definition.key)) {
      throw new WorkflowError(
        'system_protected',
        `The workflow ${definition.key} already exists; edit it instead of defining it again.`,
        definition.key
      );
    }
    const defined = withEngineFields(null, definition);
    validateDefinition(defined);
    this.definitionStore?.write(defined);
    return defined;
  }

  /**
   * Edits a workflow.
   *
   * A user-defined workflow may be edited freely. A system workflow may only be added to: a state
   * or a transition may be added, but none may be removed, renamed or re-pointed.
   */
  update(key: string, next: WorkflowDefinition, actor: WorkflowActor): WorkflowDefinition {
    assertMayManageDefinitions(actor);
    const current = this.definition(key);
    assertAdditiveEdit(current, next);
    const edited = withEngineFields(current, next);
    validateDefinition(edited);
    this.definitionStore?.write(edited);
    return edited;
  }

  /** Removes a workflow. A system workflow cannot be removed. */
  remove(key: string, actor: WorkflowActor): void {
    assertMayManageDefinitions(actor);
    const current = this.definition(key);
    assertDefinitionRemovable(current);
    this.definitionStore?.remove(key);
  }

  /** Switches a workflow on or off. A system workflow cannot be switched off. */
  setEnabled(key: string, enabled: boolean, actor: WorkflowActor): WorkflowDefinition {
    assertMayManageDefinitions(actor);
    const current = this.definition(key);
    if (!enabled) assertDefinitionDisablable(current);
    const next = withEngineFields(current, { ...current, enabled });
    this.definitionStore?.write(next);
    return next;
  }

  // ------------------------------------------------------------------ records

  /** The stored state of a record, or null when it has never moved. */
  record(recordKey: string): WorkflowRecordState | null {
    return this.store.read(recordKey);
  }

  /** The state of a record: the stored one, or the workflow's initial state. */
  state(key: string, recordKey: string): string {
    return this.store.read(recordKey)?.state ?? initialStateOf(this.definition(key)).key;
  }

  /** The state a record is in, read from a value the caller already holds. */
  stateOf(definition: WorkflowDefinition, stored: string | null | undefined): string {
    return stored ?? initialStateOf(definition).key;
  }

  // -------------------------------------------------------------------- guard

  /** Decides whether a move is allowed, without writing anything. */
  evaluate(key: string, request: WorkflowMoveRequest): WorkflowDecision {
    const definition = this.definition(key);
    const from = request.from ?? this.store.read(request.recordKey)?.state ?? null;
    return resolveMove(definition, { ...request, from });
  }

  /** The moves the actor may make from the record's state. */
  available(
    key: string,
    options: {
      readonly recordKey: string;
      readonly actor: WorkflowActor;
      readonly record?: Readonly<Record<string, unknown>>;
      readonly from?: string | null;
    }
  ): readonly WorkflowAvailableMove[] {
    const definition = this.definition(key);
    const from = options.from ?? this.store.read(options.recordKey)?.state ?? null;
    return availableMoves(definition, {
      from,
      actor: options.actor,
      ...(options.record === undefined ? {} : { record: options.record }),
    });
  }

  /**
   * Applies a move: guards it, writes the state and appends the audit entry.
   *
   * A record already in the target state is left alone and leaves no audit entry, so a transition
   * applied twice is not two events. A refused move throws a {@link WorkflowError} whose code says
   * why, and nothing is written.
   */
  apply(key: string, request: WorkflowApplyRequest): WorkflowApplyResult {
    const definition = this.definition(key);
    const stored = this.store.read(request.recordKey);
    const from = request.from ?? stored?.state ?? null;
    const current = this.stateOf(definition, from);

    if (current === request.to) {
      return {
        record:
          stored ?? {
            record_key: request.recordKey,
            workflow_key: key,
            state: request.to,
            updated_at: request.at,
            updated_by: request.actor.id,
          },
        entry: null,
      };
    }

    const decision = resolveMove(definition, { ...request, from: current });
    if (!decision.allowed) {
      throw new WorkflowError(decision.code, decision.message, key);
    }

    const payload = request.payload ?? stored?.payload;
    const record: WorkflowRecordState = {
      record_key: request.recordKey,
      workflow_key: key,
      state: decision.move.to,
      updated_at: request.at,
      updated_by: request.actor.id,
      ...(payload === undefined ? {} : { payload }),
    };
    this.store.write(record, { reason: (request.reason ?? '').trim() === '' ? null : request.reason });

    const entry: WorkflowTransitionEntry = {
      id: this.newId(),
      workflow_key: key,
      record_key: request.recordKey,
      from: decision.move.from,
      to: decision.move.to,
      transition: decision.move.transition.key,
      reason: (request.reason ?? '').trim() === '' ? null : (request.reason ?? '').trim(),
      actor_id: request.actor.id,
      at: request.at,
      effects: decision.move.effects,
    };
    this.store.appendAudit(entry);

    return { record, entry };
  }

  /** The transition entries of one record, or of every record when no key is given. */
  history(recordKey?: string): readonly WorkflowTransitionEntry[] {
    return this.store.readAudit(recordKey);
  }

  /** The instant the engine stamps an entry with. */
  timestamp(): string {
    return this.now();
  }
}
