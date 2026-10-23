// ABOUTME: The per-entity conflict policies of spec 06 §3.2 as pure functions: append-only events,
// ABOUTME: cell-level merge for marks, and field-level last-write-wins with a conflict record.

import type { EntityName } from '@/domain/schema';

import type { ConflictNote, Envelope, Snapshot } from './envelope';
import { compareHlc, deviceOf, laterHlc } from './hlc';

/** The three policies the phase plan commits to, one per class of entity. */
export type ConflictPolicy = 'append_only' | 'cell_merge' | 'field_lww';

/**
 * Entities whose writes only append.
 *
 * A payment, a receipt or an attendance register is one event with its own id, so two
 * devices posting at the same time produce two rows and never touch one row. The policy's
 * job is therefore narrow: a re-delivered create must not write a second row, and a later
 * state transition on the row is an ordinary field merge. Immutability after posting is the
 * repository's guard, not the merge's business.
 */
const APPEND_ONLY: readonly EntityName[] = [
  'invoice',
  'invoice_line',
  'payment',
  'payment_allocation',
  'receipt',
  'credit_note',
  'refund',
  'attendance_session',
];

/**
 * Entities whose identity is a cell, not a row id.
 *
 * A mark is one cell of learner × assessment × component. Two devices entering the same
 * cell offline cannot have generated the same UUIDv7, so the merge has to find the row by
 * the cell key and fold the second write into it.
 */
const CELL_MERGE: readonly EntityName[] = ['mark'];

/** The columns that name a mark's cell. */
const CELL_KEY_FIELDS: Partial<Record<EntityName, readonly string[]>> = {
  mark: ['assessment_id', 'enrolment_id', 'learning_area_id', 'component_id'],
};

/** The policy an entity is synced under. Everything else merges field by field. */
export function policyFor(entity: EntityName): ConflictPolicy {
  if (APPEND_ONLY.includes(entity)) return 'append_only';
  if (CELL_MERGE.includes(entity)) return 'cell_merge';
  return 'field_lww';
}

/** The cell key of a row, or null when the entity has no cell identity. */
export function cellKey(
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): readonly unknown[] | null {
  const fields = CELL_KEY_FIELDS[entity];
  if (!fields) return null;
  return fields.map((field) => row[field] ?? null);
}

/** What a replica already holds for a row. */
export interface StoredState {
  readonly id: string;
  readonly row: Readonly<Record<string, unknown>>;
  /** The clock of each column the replica has seen. */
  readonly clock: Readonly<Record<string, string>>;
}

/** What a merge decided to store. */
export interface MergeResult {
  readonly action: 'insert' | 'update' | 'noop' | 'immutable';
  readonly id: string;
  readonly row: Record<string, unknown>;
  readonly clock: Record<string, string>;
  /** The columns the merge actually changed on the stored row. */
  readonly fields: readonly string[];
  readonly conflicts: readonly ConflictNote[];
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The latest reading of a clock map, or the empty string when it holds none. */
function latest(clock: Readonly<Record<string, string>>): string {
  let best = '';
  for (const value of Object.values(clock)) best = laterHlc(best, value);
  return best;
}

function conflict(
  entity: EntityName,
  entityId: string,
  policy: ConflictPolicy,
  kind: ConflictNote['kind'],
  field: string,
  winner: string,
  winnerHlc: string,
  loser: string,
  loserHlc: string,
  resolved: string
): ConflictNote {
  return { entity, entityId, policy, kind, field, winner, loser, winnerHlc, loserHlc, resolved };
}

/** A clock map covering every column of a freshly inserted row. */
function insertClock(
  payload: Readonly<Record<string, unknown>>,
  hlc: string
): Record<string, string> {
  const clock: Record<string, string> = {};
  for (const field of Object.keys(payload)) {
    if (field === 'id') continue;
    clock[field] = hlc;
  }
  return clock;
}

/**
 * Folds a pushed change into what the replica holds.
 *
 * `existing` is the row the replica found, either by id or - for a cell-merged entity - by
 * cell key. A match by cell key under a different id is the identity conflict the policy has
 * to resolve: the row that landed first keeps its id and takes the second device's values.
 *
 * A column conflict is real only when the writer had not seen the stored write
 * (`base[field] < clock[field]`) and the two values differ. A write that saw the stored
 * value is sequential and simply supersedes it; counting those would inflate the conflict
 * count with ordinary editing.
 */
export function mergeChange(
  policy: ConflictPolicy,
  intent: Envelope,
  existing: StoredState | null
): MergeResult {
  if (!existing) {
    return {
      action: 'insert',
      id: intent.id,
      row: { ...intent.payload },
      clock: insertClock(intent.payload, intent.hlc),
      fields: Object.keys(intent.payload),
      conflicts: [],
    };
  }

  const conflicts: ConflictNote[] = [];

  if (existing.id !== intent.id) {
    conflicts.push(
      conflict(
        intent.entity,
        existing.id,
        policy,
        'cell_identity',
        'id',
        existing.id,
        latest(existing.clock),
        intent.id,
        intent.hlc,
        'the cell landed under an earlier id; the second id folds into it'
      )
    );
  }

  if (policy === 'append_only' && intent.op === 'create') {
    if (sameValue(existing.row, intent.payload)) {
      return {
        action: 'noop',
        id: existing.id,
        row: { ...existing.row },
        clock: { ...existing.clock },
        fields: [],
        conflicts,
      };
    }
    conflicts.push(
      conflict(
        intent.entity,
        existing.id,
        policy,
        'immutable',
        '*',
        'stored',
        latest(existing.clock),
        intent.deviceId,
        intent.hlc,
        'an event id is written once; the second create is refused and kept as a conflict'
      )
    );
    return {
      action: 'immutable',
      id: existing.id,
      row: { ...existing.row },
      clock: { ...existing.clock },
      fields: [],
      conflicts,
    };
  }

  const row: Record<string, unknown> = { ...existing.row };
  const clock: Record<string, string> = { ...existing.clock };
  const changed: string[] = [];

  for (const field of intent.fields) {
    if (field === 'id') continue;

    const incomingValue = intent.payload[field];
    const storedValue = existing.row[field];
    const storedHlc = existing.clock[field];

    if (sameValue(storedValue, incomingValue)) {
      clock[field] = laterHlc(storedHlc, intent.hlc);
      continue;
    }

    const base = intent.base[field] ?? '';
    const unseen = base !== '' && storedHlc !== undefined && compareHlc(base, storedHlc) < 0;

    if (unseen) {
      const incomingWins = compareHlc(intent.hlc, storedHlc) > 0;
      conflicts.push(
        conflict(
          intent.entity,
          existing.id,
          policy,
          'field',
          field,
          incomingWins ? intent.deviceId : deviceOf(storedHlc),
          incomingWins ? intent.hlc : storedHlc,
          incomingWins ? deviceOf(storedHlc) : intent.deviceId,
          incomingWins ? storedHlc : intent.hlc,
          incomingWins
            ? 'last writer wins; the incoming value is stored'
            : 'last writer wins; the stored value stands'
        )
      );
      if (!incomingWins) continue;
    } else if (storedHlc !== undefined && compareHlc(intent.hlc, storedHlc) <= 0) {
      continue;
    }

    row[field] = incomingValue;
    clock[field] = intent.hlc;
    changed.push(field);
  }

  return {
    action: changed.length > 0 ? 'update' : 'noop',
    id: existing.id,
    row,
    clock,
    fields: changed,
    conflicts,
  };
}

/**
 * Folds a server state transfer into what a device holds.
 *
 * The server has already merged, so the device compares per-column clocks rather than
 * bases: a column the server knows later is taken, a column the device knows later is kept
 * and recorded, and the device's own next push resolves it.
 */
export function mergeSnapshot(existing: StoredState | null, snapshot: Snapshot): MergeResult {
  if (!existing) {
    return {
      action: 'insert',
      id: snapshot.id,
      row: { ...snapshot.payload },
      clock: { ...snapshot.clock },
      fields: Object.keys(snapshot.payload),
      conflicts: [],
    };
  }

  const row: Record<string, unknown> = { ...existing.row };
  const clock: Record<string, string> = { ...existing.clock };
  const changed: string[] = [];
  const conflicts: ConflictNote[] = [];

  for (const [field, incomingHlc] of Object.entries(snapshot.clock)) {
    if (field === 'id') continue;
    const storedHlc = clock[field];
    const ordering = storedHlc === undefined ? 1 : compareHlc(incomingHlc, storedHlc);

    if (ordering > 0) {
      if (!sameValue(row[field], snapshot.payload[field])) {
        row[field] = snapshot.payload[field];
        changed.push(field);
      }
      clock[field] = incomingHlc;
      continue;
    }

    if (ordering < 0 && storedHlc !== undefined && !sameValue(row[field], snapshot.payload[field])) {
      conflicts.push(
        conflict(
          snapshot.entity,
          existing.id,
          policyFor(snapshot.entity),
          'field',
          field,
          deviceOf(storedHlc),
          storedHlc,
          snapshot.deviceId,
          incomingHlc,
          'the device holds a later write and keeps it; its next push resolves the field'
        )
      );
    }
  }

  return {
    action: changed.length > 0 ? 'update' : 'noop',
    id: existing.id,
    row,
    clock,
    fields: changed,
    conflicts,
  };
}
