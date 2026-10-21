// ABOUTME: The rules migration M4 applies to the legacy values: an exam session's kind and
// ABOUTME: status, a subject's kind, a paper's code and the value a legacy score column holds.

import type { Mark } from '@/domain/schema';

/** The status a canonical mark carries (spec 02 §8). */
export type MarkStatusCode = Mark['status_code'];

const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/;

/** True when the text is a decimal number the canonical mark can store as a score. */
export function isDecimalText(value: string): boolean {
  return DECIMAL_TEXT.test(value);
}

/**
 * The text a score is compared under.
 *
 * The legacy value is stored as the row holds it (`85`, `85.50`, `085`), so the canonical mark
 * keeps that text and the comparison normalises both sides the same way.
 */
export function normaliseScoreText(value: string): string {
  return isDecimalText(value) ? String(Number(value)) : value;
}

/** How a legacy score column was read. */
export type ExamScoreKind =
  /** A decimal number: the mark's raw score. */
  | 'numeric'
  /** A status code (`ABS`, `EXM`, `INC`): the mark's status, no score. */
  | 'status'
  /** Text that is neither: the mark's rubric level, reported as a warning. */
  | 'level'
  /** No value at all: the mark is incomplete. */
  | 'none';

/** What a legacy score column became. */
export interface InterpretedScore {
  readonly kind: ExamScoreKind;
  /** The decimal text the mark stores; only for `numeric`. */
  readonly score?: string;
  /** The text the mark stores as its rubric level; only for `level`. */
  readonly rubricLevel?: string;
  readonly status: MarkStatusCode;
}

/**
 * The status codes the legacy app writes into a score column.
 *
 * Only the abbreviations spec 03 §9 names, and their full words, are read as a status. A single
 * letter such as `P` is a grade in many scales, so it is left as a level rather than guessed at.
 */
const STATUS_CODES: Readonly<Record<string, MarkStatusCode>> = {
  abs: 'absent',
  absent: 'absent',
  exm: 'exempt',
  exempt: 'exempt',
  exempted: 'exempt',
  inc: 'incomplete',
  incomplete: 'incomplete',
  mal: 'malpractice',
  malpractice: 'malpractice',
  present: 'present',
};

/**
 * The text a school writes into a score column to mean "no mark".
 *
 * These are not levels: the mark was not scored, so it is written with no value at all and
 * reported, rather than keeping a dash as if it were a result.
 */
const NO_SCORE_TEXT = new Set(['-', '--', '—', '–', '/', 'n/a', 'nil']);

/**
 * Reads a legacy score column.
 *
 * A decimal is the mark's raw score. A status abbreviation is the mark's status and carries no
 * score. A dash or `n/a` is the school saying it has no mark. Any other text (`A`) is what the
 * school typed into a numeric column, so it is kept as the mark's rubric level and reported; the
 * migration does not invent a scale to grade it.
 */
export function interpretLegacyScore(raw: string | null): InterpretedScore {
  if (raw === null) return { kind: 'none', status: 'incomplete' };
  if (isDecimalText(raw)) return { kind: 'numeric', score: raw, status: 'present' };
  const trimmed = raw.trim();
  if (NO_SCORE_TEXT.has(trimmed.toLowerCase())) return { kind: 'none', status: 'incomplete' };
  const code = STATUS_CODES[trimmed.toLowerCase()];
  if (code !== undefined) return { kind: 'status', status: code };
  return { kind: 'level', rubricLevel: raw, status: 'present' };
}

/** The assessment kind a session name implies, and whether the name said so. */
export interface AssessmentKindMatch {
  readonly kind: 'formative' | 'cat' | 'opener' | 'mid_term' | 'end_term' | 'mock' | 'project' | 'practical' | 'portfolio' | 'national';
  readonly matched: boolean;
}

/** The kinds a session name names, in the order the first match wins. */
const KIND_PATTERNS: readonly (readonly [AssessmentKindMatch['kind'], RegExp])[] = [
  ['national', /\b(kcse|kcpe|knec|national)\b/i],
  ['mock', /\bmock\b/i],
  ['cat', /\b(cat|continuous assessment)\b/i],
  ['opener', /\bopener\b/i],
  ['mid_term', /\bmid[\s-]?term\b/i],
  ['end_term', /\bend(?:[\s-]of)?[\s-]?term|terminal\b/i],
  ['formative', /\bformative\b/i],
  ['project', /\bproject\b/i],
  ['practical', /\bpractical\b/i],
  ['portfolio', /\bportfolio\b/i],
];

/**
 * The assessment kind a legacy session name implies.
 *
 * The legacy session carries no kind; its name is the only statement of what it was. A name the
 * patterns do not recognise is an end-of-term examination, the kind the legacy app's sessions
 * overwhelmingly are, and the migration records that it decided so.
 */
export function assessmentKindOf(name: string): AssessmentKindMatch {
  for (const [kind, pattern] of KIND_PATTERNS) {
    if (pattern.test(name)) return { kind, matched: true };
  }
  return { kind: 'end_term', matched: false };
}

/** The canonical assessment status a legacy session status means, and whether it was recognised. */
export interface AssessmentStatusMatch {
  readonly status: 'draft' | 'open' | 'closed' | 'moderated' | 'published';
  readonly matched: boolean;
}

const SESSION_STATUSES: Readonly<Record<string, AssessmentStatusMatch['status']>> = {
  planning: 'draft',
  'marks entry open': 'open',
  open: 'open',
  closed: 'closed',
  published: 'published',
  archived: 'published',
};

/**
 * The assessment status a legacy session status means.
 *
 * An archived session is published: the legacy app archives a session once its results are out.
 * A status the map does not name is closed - the marks exist and no claim is made that they were
 * released - and the migration records the value it did not recognise.
 */
export function assessmentStatusOf(status: string | null): AssessmentStatusMatch {
  if (status === null) return { status: 'closed', matched: false };
  const mapped = SESSION_STATUSES[status.trim().toLowerCase()];
  return mapped === undefined ? { status: 'closed', matched: false } : { status: mapped, matched: true };
}

/** The canonical learning-area kind a legacy subject is, and the rule it follows. */
export function learningAreaKindOf(isCompulsory: boolean): 'core' | 'optional' {
  return isCompulsory ? 'core' : 'optional';
}

/** The code a canonical component takes: the paper's legacy order within its subject. */
export function componentCodeOf(ordinal: number): string {
  return `P${ordinal}`;
}

/** The key a mark is unique under: one mark per assessment, enrolment, learning area and component. */
export function markKey(
  assessmentId: string,
  enrolmentId: string,
  learningAreaId: string,
  componentId: string | null
): string {
  return `${assessmentId}\u0000${enrolmentId}\u0000${learningAreaId}\u0000${componentId ?? ''}`;
}

/** The key a period result is unique under: one result per enrolment and academic period. */
export function periodResultKey(enrolmentId: string, academicPeriodId: string): string {
  return `${enrolmentId}\u0000${academicPeriodId}`;
}
