// ABOUTME: Validation and preparation for grading scales: parses the pack's JSON numbers into
// ABOUTME: exact rationals, refuses duplicate, empty, overlapping and gapped bands, and records
// ABOUTME: what the declared band order means before any score is looked up.

import { ONE, compareExact, parseExact, subtractExact, type Exact } from '../engine';
import {
  GRADING_SCALE_KINDS,
  type GradingScaleBandDefinition,
  type GradingScaleDefinition,
  type GradingScaleKind,
  type PreparedScaleBand,
  type ScaleDirection,
  type ScaleIssue,
  type ScaleIssueCode,
  type ScalePreparation,
  type ScaleUpperBound,
} from './types';

export const isGradingScaleKind = (value: unknown): value is GradingScaleKind =>
  GRADING_SCALE_KINDS.some((kind) => kind === value);

const SCALE_UPPER_BOUNDS: readonly ScaleUpperBound[] = ['inclusive', 'exclusive'];

/** Kinds whose bands are meaningless without the points the grade is worth. */
const POINTS_REQUIRED: readonly GradingScaleKind[] = ['rubric', 'gpa'];

/** Kinds whose bands are meaningless without their descriptor. */
const DESCRIPTOR_REQUIRED: readonly GradingScaleKind[] = ['descriptor'];

const isUpperBound = (value: unknown): value is ScaleUpperBound =>
  SCALE_UPPER_BOUNDS.some((upper) => upper === value);

/** A non-empty string, or null when the value cannot be shown in a trace. */
function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * The shortest decimal a JSON number round-trips through (`89.5`, `0.1`, `1e-7` expanded).
 *
 * JavaScript prints a number as the shortest text that parses back to the same value, which is
 * exactly the decimal the pack author wrote. Expanding an exponent by string surgery keeps the
 * conversion exact: no arithmetic happens on the number itself.
 */
function decimalOfNumber(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));
  if (!match) return null;
  const sign = match[1];
  const whole = match[2];
  const fraction = match[3] ?? '';
  const exponent = match[4] === undefined ? 0 : Number(match[4]);
  const digits = `${whole}${fraction}`;
  const point = whole.length + exponent;
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** A JSON number as an exact value, or null when it is not a finite number. */
function exactFromNumber(value: unknown): Exact | null {
  if (typeof value !== 'number') return null;
  const decimal = decimalOfNumber(value);
  return decimal === null ? null : parseExact(decimal);
}

function describeBands(codes: readonly string[]): string {
  return codes.map((code) => `"${code}"`).join(' and ');
}

/**
 * The direction the declared band order runs in, read from where each band sits by `min`.
 *
 * A scale that declares its best band first has `descending` direction: as the score rises the
 * declared index falls. A scale that declares its worst band first has `ascending` direction.
 * A scale whose declared order follows neither is `mixed`, and no monotonicity is claimed for it.
 */
function directionOf(order: readonly PreparedScaleBand[]): ScaleDirection {
  let ascending = true;
  let descending = true;
  for (let index = 1; index < order.length; index += 1) {
    if (order[index].index < order[index - 1].index) ascending = false;
    if (order[index].index > order[index - 1].index) descending = false;
  }
  if (ascending) return 'ascending';
  if (descending) return 'descending';
  return 'mixed';
}

/**
 * Whether two adjacent bands leave a gap the scale cannot grade.
 *
 * An exclusive-upper scale tiles exactly: the next band must start where the previous ends.
 * An inclusive-upper scale names published whole-mark ranges (`75-89`, `90-100`), so up to one
 * whole mark of daylight between adjacent bands is the naming convention, not a gap.
 */
function leavesGap(previous: PreparedScaleBand, next: PreparedScaleBand, upper: ScaleUpperBound): boolean {
  if (upper === 'exclusive') return compareExact(next.min, previous.max) > 0;
  return compareExact(subtractExact(next.min, previous.max), ONE) > 0;
}

function overlapping(previous: PreparedScaleBand, next: PreparedScaleBand, upper: ScaleUpperBound): boolean {
  return upper === 'inclusive'
    ? compareExact(next.min, previous.max) <= 0
    : compareExact(next.min, previous.max) < 0;
}

function issue(code: ScaleIssueCode, path: string, detail: string, bands: readonly string[] = []): ScaleIssue {
  return { code, path, detail, bands };
}

function readBand(
  raw: GradingScaleBandDefinition,
  index: number,
  kind: GradingScaleKind,
  upper: ScaleUpperBound,
  issues: ScaleIssue[]
): PreparedScaleBand | null {
  const path = `bands[${index}]`;
  const code = textOf(raw.code);
  const label = textOf(raw.label);
  const codeText = code ?? '?';
  const named = code === null ? [] : [code];

  if (code === null) {
    issues.push(issue('invalid_band_code', `${path}.code`, 'a band code must be a non-empty string'));
  }
  if (label === null) {
    issues.push(issue('invalid_band_label', `${path}.label`, `band "${codeText}" must have a non-empty label`, named));
  }

  const min = exactFromNumber(raw.min);
  if (min === null) {
    issues.push(
      issue('invalid_band_bound', `${path}.min`, `band "${codeText}" has a minimum that is not a finite number`, named)
    );
  }
  const max = exactFromNumber(raw.max);
  if (max === null) {
    issues.push(
      issue('invalid_band_bound', `${path}.max`, `band "${codeText}" has a maximum that is not a finite number`, named)
    );
  }

  let points: Exact | null = null;
  if (raw.points !== undefined) {
    points = exactFromNumber(raw.points);
    if (points === null) {
      issues.push(
        issue('invalid_band_points', `${path}.points`, `band "${codeText}" has points that are not a finite number`, named)
      );
    }
  } else if (POINTS_REQUIRED.includes(kind)) {
    issues.push(
      issue('missing_band_points', `${path}.points`, `scale kind "${kind}" requires points on band "${codeText}"`, named)
    );
  }

  let descriptor: string | null = null;
  if (raw.descriptor !== undefined) {
    descriptor = textOf(raw.descriptor);
    if (descriptor === null) {
      issues.push(
        issue('invalid_band_descriptor', `${path}.descriptor`, `band "${codeText}" has an empty descriptor`, named)
      );
    }
  } else if (DESCRIPTOR_REQUIRED.includes(kind)) {
    issues.push(
      issue(
        'missing_band_descriptor',
        `${path}.descriptor`,
        `scale kind "${kind}" requires a descriptor on band "${codeText}"`,
        named
      )
    );
  }

  if (min !== null && max !== null && code !== null) {
    const order = compareExact(min, max);
    if (order > 0) {
      issues.push(
        issue(
          'invalid_band_range',
          path,
          `band "${code}" has min ${String(raw.min)} greater than max ${String(raw.max)}`,
          named
        )
      );
    } else if (order === 0 && upper === 'exclusive') {
      issues.push(
        issue(
          'empty_band',
          path,
          `band "${code}" is empty: min and max are equal and the upper bound is exclusive`,
          named
        )
      );
    }
  }

  return code !== null && label !== null && min !== null && max !== null
    ? { code, label, min, max, points, descriptor, index }
    : null;
}

function findDuplicates(bands: readonly PreparedScaleBand[]): ScaleIssue[] {
  const issues: ScaleIssue[] = [];
  const first = new Map<string, number>();
  for (const band of bands) {
    const seen = first.get(band.code);
    if (seen === undefined) {
      first.set(band.code, band.index);
      continue;
    }
    issues.push(
      issue(
        'duplicate_band',
        `bands[${band.index}].code`,
        `band code "${band.code}" is already used by bands[${seen}]`,
        [band.code]
      )
    );
  }
  return issues;
}

function findCoverageIssues(order: readonly PreparedScaleBand[], upper: ScaleUpperBound): ScaleIssue[] {
  const issues: ScaleIssue[] = [];
  for (let index = 1; index < order.length; index += 1) {
    const previous = order[index - 1];
    const next = order[index];
    const bands = [previous.code, next.code];
    if (overlapping(previous, next, upper)) {
      issues.push(issue('overlapping_bands', 'bands', `bands ${describeBands(bands)} overlap`, bands));
    } else if (leavesGap(previous, next, upper)) {
      issues.push(
        issue('gap_between_bands', 'bands', `bands ${describeBands(bands)} leave a gap between max and min`, bands)
      );
    }
  }
  return issues;
}

/**
 * Validates a scale and prepares it for lookup.
 *
 * Every number is converted to an exact value first, so the boundary checks never depend on a
 * float comparison. The whole scale is refused when any band is malformed, duplicated, empty,
 * overlapping or separated from its neighbour by a gap; `overlapping_bands` and
 * `gap_between_bands` name both offending band codes.
 */
export function prepareGradingScale(definition: GradingScaleDefinition): ScalePreparation {
  const issues: ScaleIssue[] = [];

  if (textOf(definition.code) === null) {
    issues.push(issue('invalid_scale_code', 'code', 'a scale code must be a non-empty string'));
  }
  if (!isGradingScaleKind(definition.kind)) {
    issues.push(issue('invalid_kind', 'kind', `unknown grading-scale kind "${String(definition.kind)}"`));
  }
  if (definition.upper !== undefined && !isUpperBound(definition.upper)) {
    issues.push(issue('invalid_upper', 'upper', `unknown upper-bound convention "${String(definition.upper)}"`));
  }
  if (definition.input !== undefined && textOf(definition.input) === null) {
    issues.push(issue('invalid_input', 'input', 'input must be a non-empty string when declared'));
  }
  if (issues.length > 0) return { ok: false, issues };

  const upper: ScaleUpperBound = definition.upper ?? 'exclusive';
  if (!Array.isArray(definition.bands) || definition.bands.length === 0) {
    return { ok: false, issues: [issue('empty_bands', 'bands', 'a grading scale must declare at least one band')] };
  }

  const bands: PreparedScaleBand[] = [];
  for (let index = 0; index < definition.bands.length; index += 1) {
    const prepared = readBand(definition.bands[index], index, definition.kind, upper, issues);
    if (prepared !== null) bands.push(prepared);
  }

  issues.push(...findDuplicates(bands));
  if (issues.length > 0) return { ok: false, issues };

  const order = [...bands].sort((left, right) => {
    const byMin = compareExact(left.min, right.min);
    if (byMin !== 0) return byMin;
    const byMax = compareExact(left.max, right.max);
    return byMax !== 0 ? byMax : left.index - right.index;
  });

  const coverageIssues = findCoverageIssues(order, upper);
  if (coverageIssues.length > 0) return { ok: false, issues: coverageIssues };

  return {
    ok: true,
    scale: {
      code: definition.code,
      kind: definition.kind,
      input: definition.input === undefined ? null : textOf(definition.input),
      upper,
      bands,
      order,
      direction: directionOf(order),
      lowest: order[0].min,
      highest: order[order.length - 1].max,
    },
  };
}
