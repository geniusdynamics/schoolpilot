// ABOUTME: The vocabulary of the mark entry grid: the cell status a teacher is shown, the scheme
// ABOUTME: column a mark lands in, the workflow a group is in, and the rows the grid renders.

import type { MarkStatus } from '@/domain/assessment/engine';

/**
 * The status one cell carries.
 *
 * `valid` is a usable mark. `missing` is a cell the engine flagged as a missing mark.
 * `invalid` and `out_of_range` are refused at entry. `incomplete_scheme` means the scheme itself
 * cannot produce a result for the row (no maximum, a slot the score does not name, a broken
 * scheme), so no cell in that row can be graded. `locked` and `moderated` are access states: the
 * cell is read-only without an override reason.
 */
export type CellStatusCode =
  | 'valid'
  | 'missing'
  | 'invalid'
  | 'out_of_range'
  | 'incomplete_scheme'
  | 'locked'
  | 'moderated';

export type CellTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** The status of one cell, with the reason a reader needs and the tone the badge uses. */
export interface CellStatus {
  readonly code: CellStatusCode;
  readonly label: string;
  readonly reason: string | null;
  readonly tone: CellTone;
}

/** One assessment slot the grid has a column for. */
export interface SchemeColumn {
  /** Stable key of the column: the assessment id, or `slot:<code>` for a slot with no assessment. */
  readonly key: string;
  readonly assessmentId: string | null;
  readonly slot: string;
  readonly label: string;
  /** The maximum the cell accepts; null when the scheme declares none, which makes the cell unusable. */
  readonly max: number | null;
  readonly kind: string;
  readonly assessmentStatus: string;
}

/** One learner the grid has a row for. */
export interface GridRow {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
}

/** The value a cell holds in the draft: a score as typed, and the mark's status code. */
export interface CellEntry {
  readonly score: string;
  readonly status: MarkStatus;
}

/** A mark row the grid resolved for a cell. */
export interface StoredMark {
  readonly id: string;
  readonly rowVersion: number;
  readonly score: string | null;
  readonly status: MarkStatus;
}

/** What the grid needs to know about one cell: its entry, the stored row and its status. */
export interface CellView {
  readonly row: GridRow;
  readonly column: SchemeColumn;
  readonly entry: CellEntry;
  readonly stored: StoredMark | null;
  readonly status: CellStatus;
}

/** The scheme-level verdict for one learner's row of cells. */
export interface RowVerdict {
  readonly status: 'complete' | 'incomplete' | 'exempt';
  /** Cells the engine flagged as a missing mark, keyed by `${slot}|${assessment}`. */
  readonly missing: ReadonlySet<string>;
  /** Cells the engine could not evaluate at all, keyed the same way. */
  readonly blocked: ReadonlyMap<string, string>;
  /** The reason the whole row has no usable result, when it has none. */
  readonly reason: string | null;
}

/** The workflow of one assessment x teaching group (spec 03 §9). */
export type WorkflowState = 'open' | 'submitted' | 'moderated' | 'locked' | 'published';

/** A moderation of one cell: the value it held and the value it now holds. */
export interface ModerationRecord {
  readonly original: string;
  readonly moderated: string;
  readonly reason: string;
  readonly actorId: string;
  readonly at: string;
}

/** The durable workflow of one assessment x teaching group. */
export interface WorkflowRecord {
  readonly assessmentId: string;
  readonly teachingGroupId: string;
  readonly state: WorkflowState;
  readonly updatedAt: string;
  readonly updatedBy: string;
  /** Moderated cells, keyed by `${enrolmentId}|${columnKey}`. */
  readonly moderations: Readonly<Record<string, ModerationRecord>>;
}

/** One decided transition of a workflow, kept so a lock can be explained later. */
export interface WorkflowAuditEntry {
  readonly id: string;
  readonly assessmentId: string;
  readonly teachingGroupId: string;
  readonly from: WorkflowState | null;
  readonly to: WorkflowState;
  readonly reason: string | null;
  readonly actorId: string;
  readonly at: string;
}

/** The teacher's reach: the groups they may write, and whether they may write at all. */
export interface TeachingScope {
  readonly groupIds: ReadonlySet<string>;
  readonly staffId: string | null;
  readonly mode: 'all' | 'teaching' | 'class';
  readonly canWrite: boolean;
  readonly reason: string;
}

/** A refused mark write, with the reason a teacher can act on. */
export class MarkEntryError extends Error {
  readonly code: 'reason_required' | 'scope' | 'invalid_score' | 'not_ready' | 'offline';

  constructor(code: MarkEntryError['code'], message: string) {
    super(message);
    this.name = 'MarkEntryError';
    this.code = code;
  }
}
