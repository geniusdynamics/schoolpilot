// ABOUTME: The mark entry workflow of one assessment x teaching group (spec 03 §9):
// ABOUTME: open -> submitted -> moderated -> locked -> published, with the reason an override needs
// ABOUTME: and the record of who changed what, when, and what the value was before.

import { MarkEntryError, type ModerationRecord, type WorkflowAuditEntry, type WorkflowRecord, type WorkflowState } from './types';

/** The states, in the order they are reached. */
export const WORKFLOW_STATES: readonly WorkflowState[] = [
  'open',
  'submitted',
  'moderated',
  'locked',
  'published',
];

const RANK: Readonly<Record<WorkflowState, number>> = {
  open: 0,
  submitted: 1,
  moderated: 2,
  locked: 3,
  published: 4,
};

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
 * A moderated mark is already a decision someone made; a locked or published one is part of a
 * released result. Editing either is an override, and an override without a reason is refused.
 */
export function requiresOverrideReason(state: WorkflowState): boolean {
  return state === 'moderated' || state === 'locked' || state === 'published';
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

/** The durable half of the workflow. */
export interface WorkflowStore {
  read(): WorkflowRecord[];
  write(records: readonly WorkflowRecord[]): void;
  readAudit(): WorkflowAuditEntry[];
  writeAudit(entries: readonly WorkflowAuditEntry[]): void;
}

function isWorkflowState(value: unknown): value is WorkflowState {
  return typeof value === 'string' && WORKFLOW_STATES.includes(value as WorkflowState);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflowRecord(value: unknown): value is WorkflowRecord {
  return (
    isRecord(value) &&
    typeof value.assessmentId === 'string' &&
    typeof value.teachingGroupId === 'string' &&
    isWorkflowState(value.state)
  );
}

/** A workflow kept in browser storage. */
export function createStorageWorkflowStore(
  recordsKey: string,
  auditKey: string,
  storage?: Storage | null
): WorkflowStore {
  const resolve = (): Storage | null => {
    if (storage !== undefined) return storage;
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  };

  const readJson = (key: string): unknown => {
    const target = resolve();
    if (!target) return null;
    try {
      const raw = target.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const writeJson = (key: string, value: unknown): void => {
    const target = resolve();
    if (!target) return;
    try {
      target.setItem(key, JSON.stringify(value));
    } catch {
      // A blocked store must not break the page; the session keeps working from memory below.
    }
  };

  return {
    read: () => {
      const parsed = readJson(recordsKey);
      return Array.isArray(parsed) ? parsed.filter(isWorkflowRecord) : [];
    },
    write: (records) => writeJson(recordsKey, records),
    readAudit: () => {
      const parsed = readJson(auditKey);
      return Array.isArray(parsed)
        ? parsed.filter(
            (entry): entry is WorkflowAuditEntry =>
              isRecord(entry) &&
              typeof entry.assessmentId === 'string' &&
              typeof entry.teachingGroupId === 'string' &&
              isWorkflowState(entry.to)
          )
        : [];
    },
    writeAudit: (entries) => writeJson(auditKey, entries),
  };
}

/** A workflow that lives only as long as the page. */
export function createMemoryWorkflowStore(): WorkflowStore {
  let records: WorkflowRecord[] = [];
  let audit: WorkflowAuditEntry[] = [];
  return {
    read: () => [...records],
    write: (next) => {
      records = [...next];
    },
    readAudit: () => [...audit],
    writeAudit: (next) => {
      audit = [...next];
    },
  };
}

/** Where a workflow record is keyed. */
function recordKey(assessmentId: string, teachingGroupId: string): string {
  return `${assessmentId}|${teachingGroupId}`;
}

/**
 * The workflow of the assessment x teaching groups on this screen.
 *
 * The record is per group, which the assessment row cannot express: two groups of the same
 * assessment are submitted, moderated and locked on their own. Every transition and every
 * moderation is appended to an audit list with the actor, the instant and the reason, and a
 * moderation keeps the value the cell held before it.
 */
export class MarkWorkflow {
  private readonly store: WorkflowStore;

  constructor(store: WorkflowStore) {
    this.store = store;
  }

  record(assessmentId: string, teachingGroupId: string): WorkflowRecord | null {
    const key = recordKey(assessmentId, teachingGroupId);
    return (
      this.store.read().find((record) => recordKey(record.assessmentId, record.teachingGroupId) === key) ??
      null
    );
  }

  state(assessmentId: string, teachingGroupId: string, assessmentStatus: string): WorkflowState {
    return effectiveWorkflowState(assessmentStatus, this.record(assessmentId, teachingGroupId)?.state);
  }

  private save(record: WorkflowRecord): void {
    const key = recordKey(record.assessmentId, record.teachingGroupId);
    const current = this.store
      .read()
      .filter((candidate) => recordKey(candidate.assessmentId, candidate.teachingGroupId) !== key);
    this.store.write([...current, record]);
  }

  private appendAudit(entry: Omit<WorkflowAuditEntry, 'id'>): void {
    const audit = this.store.readAudit();
    this.store.writeAudit([
      ...audit,
      { ...entry, id: `${entry.at}-${audit.length + 1}-${entry.to}` },
    ]);
  }

  /**
   * Moves a group's workflow to `to`.
   *
   * Moving forward is the normal path and needs no reason. Moving back (reopening a moderated or
   * locked group) is an exception to a decision, so it needs one.
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

    if (RANK[to] < RANK[from] && (options.reason ?? '').trim() === '') {
      throw new MarkEntryError(
        'reason_required',
        `Reopening marks that are ${from} needs a reason.`
      );
    }

    const record: WorkflowRecord = {
      assessmentId,
      teachingGroupId,
      state: to,
      updatedAt: options.at,
      updatedBy: options.actorId,
      moderations: this.record(assessmentId, teachingGroupId)?.moderations ?? {},
    };
    this.save(record);
    this.appendAudit({
      assessmentId,
      teachingGroupId,
      from,
      to,
      reason: (options.reason ?? '').trim() === '' ? null : (options.reason ?? '').trim(),
      actorId: options.actorId,
      at: options.at,
    });
    return record;
  }

  /** Records a moderation of one cell: the value before it, the value after, and why. */
  moderate(
    assessmentId: string,
    teachingGroupId: string,
    cell: string,
    values: { readonly original: string; readonly moderated: string; readonly reason: string; readonly actorId: string; readonly at: string }
  ): ModerationRecord {
    const current = this.record(assessmentId, teachingGroupId);
    const record: WorkflowRecord = {
      assessmentId,
      teachingGroupId,
      state: current?.state ?? 'moderated',
      updatedAt: values.at,
      updatedBy: values.actorId,
      moderations: {
        ...(current?.moderations ?? {}),
        [cell]: {
          original: values.original,
          moderated: values.moderated,
          reason: values.reason,
          actorId: values.actorId,
          at: values.at,
        },
      },
    };
    this.save(record);
    return record.moderations[cell];
  }

  moderations(assessmentId: string, teachingGroupId: string): Readonly<Record<string, ModerationRecord>> {
    return this.record(assessmentId, teachingGroupId)?.moderations ?? {};
  }

  audit(assessmentId?: string, teachingGroupId?: string): WorkflowAuditEntry[] {
    return this.store.readAudit().filter(
      (entry) =>
        (assessmentId === undefined || entry.assessmentId === assessmentId) &&
        (teachingGroupId === undefined || entry.teachingGroupId === teachingGroupId)
    );
  }

  clear(): void {
    this.store.write([]);
    this.store.writeAudit([]);
  }
}
