// ABOUTME: The change envelope the replicas exchange: which entity row changed, which fields,
// ABOUTME: the clock of each, what the writer had seen, and the server state a pull carries.

import type { EntityName } from '@/domain/schema';

/** What a write did to a row. */
export type ChangeOp = 'create' | 'update' | 'remove';

/**
 * One change, as it travels.
 *
 * `fields` and `base` are the part a row-level change log cannot express: `fields` names the
 * columns the write touched, and `base[field]` is the clock of the last write the author had
 * seen for that column. Without both, a receiving replica cannot tell "two devices edited
 * different columns" from "two devices edited the same column" - it can only compare whole rows.
 */
export interface Envelope {
  readonly entity: EntityName;
  readonly id: string;
  readonly op: ChangeOp;
  /** The clock of this write. */
  readonly hlc: string;
  readonly deviceId: string;
  /** The columns this write touched. */
  readonly fields: readonly string[];
  /** The clock the author had seen for each touched column, absent when it had seen none. */
  readonly base: Readonly<Record<string, string>>;
  /** The row after the change, in canonical schema shape. */
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * A server-side state transfer: the row plus the clock of each column.
 *
 * A puller does not need `fields`/`base` - the server has already merged - it needs to know
 * which columns are newer than what it holds, and that is the per-column clock.
 */
export interface Snapshot {
  readonly entity: EntityName;
  readonly id: string;
  readonly op: ChangeOp;
  readonly hlc: string;
  readonly deviceId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly clock: Readonly<Record<string, string>>;
  /** The server sequence this state was produced at. */
  readonly serverSeq?: number;
}

/** Why a merge recorded a conflict. */
export type ConflictKind = 'field' | 'cell_identity' | 'immutable' | 'unresolved';

/** A conflict the merge recorded, before it is stored. */
export interface ConflictNote {
  readonly entity: EntityName;
  readonly entityId: string;
  readonly policy: string;
  readonly kind: ConflictKind;
  readonly field: string;
  readonly winner: string;
  readonly loser: string;
  readonly winnerHlc: string;
  readonly loserHlc: string;
  readonly resolved: string;
  /** The refusal a schema, guard, storage or scope check produced, when there is one. */
  readonly detail?: string;
}
