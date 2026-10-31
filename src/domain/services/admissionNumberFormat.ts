// ABOUTME: The admission-number format a school configures: prefix, year, sequence and suffix.
// ABOUTME: Formatting, strict parsing and the next-number rule live here so the settings and the
// ABOUTME: admission service agree on one definition.
import { sequenceYear } from '@/domain/sequences';

/** How a school writes its admission numbers. */
export interface AdmissionNumberFormat {
  /** The letters or words before the year/sequence; empty for a bare number. */
  readonly prefix: string;
  /** The letters or words after the sequence; empty when there is no suffix. */
  readonly suffix: string;
  /** The literal between the parts; `/` when the caller does not say. May be empty. */
  readonly separator: string;
  /** Whether the calendar year of admission is part of the number. */
  readonly includeYear: boolean;
  /** The minimum digits of the sequence; the number is zero-padded to it. */
  readonly width: number;
}

export const DEFAULT_ADMISSION_NUMBER_FORMAT: AdmissionNumberFormat = {
  prefix: 'ADM',
  suffix: '',
  separator: '/',
  includeYear: true,
  width: 3,
};

/** Clamps a stored or form-supplied format into something the formatter can use. */
export function normaliseAdmissionNumberFormat(
  input?: Partial<AdmissionNumberFormat> | null
): AdmissionNumberFormat {
  const width = Number(input?.width);
  return {
    prefix: String(input?.prefix ?? DEFAULT_ADMISSION_NUMBER_FORMAT.prefix).trim(),
    suffix: String(input?.suffix ?? DEFAULT_ADMISSION_NUMBER_FORMAT.suffix).trim(),
    separator:
      input?.separator === undefined
        ? DEFAULT_ADMISSION_NUMBER_FORMAT.separator
        : String(input.separator),
    includeYear: input?.includeYear ?? DEFAULT_ADMISSION_NUMBER_FORMAT.includeYear,
    width:
      Number.isInteger(width) && width >= 1 && width <= 10
        ? width
        : DEFAULT_ADMISSION_NUMBER_FORMAT.width,
  };
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Formats one sequence value, e.g. `ADM/2027/001` or `PRI/2027/001/JSS`. */
export function formatAdmissionNumber(
  format: AdmissionNumberFormat,
  year: number,
  sequence: number
): string {
  const normal = normaliseAdmissionNumberFormat(format);
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Admission sequence must be a positive integer, got ${sequence}`);
  }
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`Admission year must be a positive integer, got ${year}`);
  }

  const parts: string[] = [];
  if (normal.prefix) parts.push(normal.prefix);
  if (normal.includeYear) parts.push(String(year));
  parts.push(String(sequence).padStart(normal.width, '0'));
  const core = parts.join(normal.separator);
  return normal.suffix ? `${core}${normal.separator}${normal.suffix}` : core;
}

/**
 * Parses a number this format issued; a manually typed or foreign number returns null. When the
 * format carries the year and `year` is given, a number from another year does not match: the
 * counter restarts every year, so last year's 099 must not make this year's next number 100.
 */
export function parseAdmissionNumber(
  format: AdmissionNumberFormat,
  value: string | null | undefined,
  year?: number
): number | null {
  if (typeof value !== 'string') return null;
  const normal = normaliseAdmissionNumberFormat(format);
  const separator = escapeRegExp(normal.separator);
  let pattern = '^';
  if (normal.prefix) pattern += `${escapeRegExp(normal.prefix)}${separator}`;
  if (normal.includeYear) {
    pattern += `${year === undefined ? '\\d{4}' : String(year)}${separator}`;
  }
  pattern += `(\\d{${normal.width},})`;
  if (normal.suffix) pattern += `${separator}${escapeRegExp(normal.suffix)}`;
  pattern += '$';

  const match = new RegExp(pattern).exec(value.trim());
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null;
}

/**
 * The literal that every number of this format and year begins with. The admission service uses
 * it to narrow the read to one sequence; an empty string means the format has no fixed head.
 */
export function admissionNumberStartsWith(
  format: AdmissionNumberFormat,
  date?: string | Date | null
): string {
  const normal = normaliseAdmissionNumberFormat(format);
  const parts: string[] = [];
  if (normal.prefix) parts.push(normal.prefix);
  if (normal.includeYear) parts.push(String(sequenceYear(date)));
  return parts.length > 0 ? `${parts.join(normal.separator)}${normal.separator}` : '';
}

/** The next number: one past the highest matching number already issued, never reused. */
export function nextAdmissionNumber(
  format: AdmissionNumberFormat,
  existing: Iterable<string | null | undefined>,
  date?: string | Date | null
): string {
  const normal = normaliseAdmissionNumberFormat(format);
  const year = sequenceYear(date);
  let highest = 0;
  for (const value of existing) {
    const sequence = parseAdmissionNumber(normal, value, normal.includeYear ? year : undefined);
    if (sequence !== null && sequence > highest) highest = sequence;
  }
  return formatAdmissionNumber(normal, year, highest + 1);
}
