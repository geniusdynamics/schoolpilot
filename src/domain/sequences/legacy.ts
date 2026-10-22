// ABOUTME: The original single-file document-number helpers, kept so callers that still import
// ABOUTME: them keep working; new code uses the named sequences in this directory instead.

export const RECEIPT_PREFIX = 'RCT';
export const DEFAULT_SEQUENCE_WIDTH = 6;

export interface SequenceSpec {
  /** Document prefix, e.g. "RCT" for receipts. */
  prefix: string;
  /** Calendar year the sequence belongs to; numbering restarts at 1 every year. */
  year: number;
  /** Minimum number of digits of the sequence part (zero-padded). */
  width?: number;
}

export interface ParsedSequenceNumber {
  year: number;
  seq: number;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Formats `seq` as `<prefix>/<year>/<zero-padded seq>`. */
export function formatSequenceNumber(spec: SequenceSpec, seq: number): string {
  const { prefix, year, width = DEFAULT_SEQUENCE_WIDTH } = spec;
  if (!Number.isInteger(seq) || seq < 1) {
    throw new RangeError(`Sequence must be a positive integer, got ${seq}`);
  }
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`Sequence year must be a positive integer, got ${year}`);
  }
  return `${prefix}/${year}/${String(seq).padStart(width, '0')}`;
}

/** Parses a number issued for `prefix`; returns null for anything else (manual or foreign numbers). */
export function parseSequenceNumber(value: string | null | undefined, prefix: string): ParsedSequenceNumber | null {
  if (typeof value !== 'string') return null;
  const match = new RegExp(`^${escapeRegExp(prefix)}/(\\d{4})/(\\d+)$`).exec(value.trim());
  if (!match) return null;
  const seq = Number(match[2]);
  if (!Number.isSafeInteger(seq) || seq < 1) return null;
  return { year: Number(match[1]), seq };
}

/**
 * Next number for `spec`: one past the highest sequence already issued for that prefix and year.
 * Numbers issued only through this function are therefore unique and contiguous (gap-free).
 *
 * @deprecated Reads the numbers it is given and writes the next one back, so two callers that
 * read at the same time issue the same number, and a caller that sees only a page of rows can
 * miss the highest one. Use `SequenceService.issue`, which takes the number from the store's
 * atomic counter.
 */
export function nextSequenceNumber(existing: Iterable<string | null | undefined>, spec: SequenceSpec): string {
  let highest = 0;
  for (const value of existing) {
    const parsed = parseSequenceNumber(value, spec.prefix);
    if (parsed && parsed.year === spec.year && parsed.seq > highest) highest = parsed.seq;
  }
  return formatSequenceNumber(spec, highest + 1);
}

/** Calendar year of a date (ISO `YYYY-MM-DD…` string or Date); the current year when missing or invalid. */
export function sequenceYear(date?: string | Date | null): number {
  if (date instanceof Date && !Number.isNaN(date.getTime())) return date.getFullYear();
  if (typeof date === 'string') {
    const match = /^(\d{4})-\d{2}-\d{2}/.exec(date.trim());
    if (match) return Number(match[1]);
  }
  return new Date().getFullYear();
}

/**
 * Next receipt number (RCT/<year>/<seq>) for the year of `date`.
 *
 * @deprecated See {@link nextSequenceNumber}; use `SequenceService.issue('receipt', …)`.
 */
export function nextReceiptNumber(existing: Iterable<string | null | undefined>, date?: string | Date | null): string {
  return nextSequenceNumber(existing, { prefix: RECEIPT_PREFIX, year: sequenceYear(date) });
}
