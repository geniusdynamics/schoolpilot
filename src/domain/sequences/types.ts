// ABOUTME: The vocabulary of the named document-number sequences: definitions, scope segments,
// ABOUTME: reset and failure policies, allocations, parsed numbers and offline device blocks.

/**
 * A part of a sequence that keeps a counter of its own.
 *
 * A sequence scoped by `institution` gives each institution its own run of numbers; scoped by
 * `year` it restarts every calendar year. `year` and `month` also drive the reset policy.
 */
export type ScopeSegment =
  | 'institution'
  | 'campus'
  | 'year'
  | 'month'
  | 'term'
  | 'cashier'
  | 'device';

/** When a sequence's counter restarts. */
export type ResetPolicy = 'never' | 'yearly' | 'monthly';

/**
 * What happens to a number that was allocated for work which then failed.
 *
 * - `burn`: the number is consumed the moment it is allocated, so a failed issuance leaves a
 *   gap and the number is never handed out again. A printed receipt number can never reappear.
 * - `reuse`: the allocation joins the caller's transaction, so a rollback returns the number to
 *   the sequence. Nothing was issued, so nothing is reused.
 *
 * Both are defensible; the choice is explicit and the store makes each one possible.
 */
export type FailurePolicy = 'burn' | 'reuse';

/** A named sequence: its number format, the scopes it is partitioned by, and its reset policy. */
export interface SequenceDefinition {
  /** Stable name, e.g. `admission`, `invoice`, `receipt`. */
  readonly name: string;
  /**
   * The number format: literal text and `{TOKEN}` parts, e.g. `ADM/{YYYY}/{SEQ:3}`.
   *
   * Tokens: `{SEQ}` / `{SEQ:n}` (the counter), `{YYYY}`, `{MM}`, `{INST}`, `{CAMPUS}`,
   * `{TERM}`, `{CASHIER}`, `{DEVICE}`. Two tokens may not sit next to each other: a literal
   * separator is what makes the number parseable.
   */
  readonly pattern: string;
  /**
   * The scopes this sequence is partitioned by. Every token in the pattern is a scope, and a
   * scope may also be declared without appearing in the pattern (an admission number is per
   * institution without printing the institution).
   */
  readonly scope: readonly ScopeSegment[];
  /** When the counter restarts. A `yearly` reset needs `{YYYY}` in the pattern. */
  readonly reset: ResetPolicy;
}

/** The values of the scope segments of one allocation. `year` and `month` are numbers. */
export type ScopeValues = Partial<Record<ScopeSegment, string | number>>;

/** A number recognised for a sequence: its counter and the scope the pattern exposes. */
export interface ParsedNumber {
  readonly seq: number;
  /** Only the segments the pattern renders; a scope that is not printed cannot be recovered. */
  readonly scope: ScopeValues;
}

/** One issued number. */
export interface Allocation {
  readonly sequence: string;
  /** The canonical key of the scope the number belongs to. */
  readonly scopeKey: string;
  readonly scope: ScopeValues;
  readonly seq: number;
  readonly number: string;
  /** The device that issued it, when a device block was used. */
  readonly deviceId?: string;
  /** The first number of the block it came from, when a device block was used. */
  readonly blockStart?: number;
}

/** The state of a device's reserved range of numbers. */
export type BlockStatus = 'open' | 'exhausted' | 'released';

/** A range of numbers reserved by a device so it can issue while disconnected. */
export interface BlockReservation {
  readonly sequence: string;
  readonly scopeKey: string;
  readonly deviceId: string;
  readonly startSeq: number;
  readonly endSeq: number;
  readonly size: number;
  readonly status: BlockStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A reserved block plus how much of it has been used. */
export interface BlockSummary extends BlockReservation {
  /** The highest number handed out from the block, or null when none has been. */
  readonly usedUpto: number | null;
  /** How many numbers of the block have been issued. */
  readonly used: number;
  /** How many numbers of the block are still the device's to issue. */
  readonly remaining: number;
}

/** A number recorded in the issued-number ledger. */
export interface IssuedNumber {
  readonly sequence: string;
  readonly scopeKey: string;
  readonly seq: number;
  readonly number: string;
  readonly issuedAt: string;
  readonly deviceId: string | null;
  readonly blockStart: number | null;
}
