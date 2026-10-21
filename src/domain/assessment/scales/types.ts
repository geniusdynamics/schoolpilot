// ABOUTME: The grading-scale vocabulary of spec 03 section 5: the eight scale kinds, the
// ABOUTME: pack-shaped definition, the prepared exact bands, and the match, trace and issues a
// ABOUTME: lookup produces.

import type { Exact } from '../engine';

/**
 * The scale kinds of spec 03 section 5.
 *
 * Every kind is the same pure band lookup over an exact numeric score; the kind names the value
 * space and what the band fields mean, so the arithmetic never forks between kinds:
 *
 * - `numeric_bands` - a percent or points value to a band (`cbe_8_level`).
 * - `rubric` - a rubric level to its level code and level points (`cbe_4_level`); points required.
 * - `letter` - a score or points total to a letter (`kcse_subject`); points optional.
 * - `points` - a points total or mean to a grade (`kcse_mean_grade`).
 * - `division` - an aggregate (or a points total) to a division (`ple_divisions`).
 * - `gpa` - a percent to a grade and its grade points; points required.
 * - `out_of_20` - a Francophone mark out of 20 to its mention.
 * - `descriptor` - a score to a qualitative descriptor; a descriptor required on every band.
 */
export const GRADING_SCALE_KINDS = [
  'numeric_bands',
  'rubric',
  'letter',
  'points',
  'division',
  'gpa',
  'out_of_20',
  'descriptor',
] as const;

export type GradingScaleKind = (typeof GRADING_SCALE_KINDS)[number];

/** Whether a band's `max` belongs to the band. The convention is declared once per scale. */
export type ScaleUpperBound = 'inclusive' | 'exclusive';

/**
 * One band as the pack schema states it (spec 03 section 5).
 *
 * `min` is inclusive. `max` is inclusive or exclusive according to the scale's `upper`, which
 * defaults to `exclusive`. Bounds are JSON numbers, so the loader converts each one through its
 * shortest decimal form rather than through binary floating point arithmetic.
 */
export interface GradingScaleBandDefinition {
  readonly code: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly points?: number;
  readonly descriptor?: string;
}

/** A grading scale as a pack states it: schema P2-A01 `grading-scale.schema.json`. */
export interface GradingScaleDefinition {
  readonly code: string;
  readonly kind: GradingScaleKind;
  /** The value space the bands are stated in, such as `percent`, `points` or `aggregate`. */
  readonly input?: string;
  /**
   * Whether a band's `max` is inclusive; defaults to `exclusive` (the pack schema's convention).
   * An inclusive scale names published whole-mark ranges (`75-89`, `90-100`), so it is meant to
   * be applied to a whole-mark value - the caller's rounded total when marks carry fractions.
   */
  readonly upper?: ScaleUpperBound;
  readonly bands: readonly GradingScaleBandDefinition[];
  /** How the scale was established and what still needs checking (spec 03 section 5). */
  readonly verification?: string;
}

/**
 * The numbers of a scheme result a scale may be applied to (spec 03 section 4).
 *
 * `exact_total` is the total before the `learning_area_score` rounding; `total` is after it (and
 * equals the exact total when no rule names the stage); `percent` is `total` over `out_of` times
 * a hundred, so it inherits the rounding the scheme declared.
 */
export type EngineScaleValueSource = 'exact_total' | 'total' | 'percent';

/** Which number a score came from; `given` is a caller-supplied exact value. */
export type ScaleValueSource = EngineScaleValueSource | 'given';

/**
 * A score to grade, with the provenance the caller chose.
 *
 * `source` is required so the scale can never silently grade a different number from the one
 * the caller meant: `exact_total` is the pre-rounding total, `total` is the rounded result and
 * `percent` is the total as a percentage of its maximum.
 */
export interface GradeScore {
  readonly source: ScaleValueSource;
  readonly value: Exact;
}

/** The three text fields of `SchemeResult` that `gradeScoreOf` reads. */
export interface SchemeScoreFields {
  readonly exact_total: string | null;
  readonly total: string | null;
  readonly percent: string | null;
}

/** Whether the declared band order runs with the score, against it, or neither. */
export type ScaleDirection = 'ascending' | 'descending' | 'mixed';

/** One band with its bounds and points converted to exact values. */
export interface PreparedScaleBand {
  readonly code: string;
  readonly label: string;
  readonly min: Exact;
  readonly max: Exact;
  readonly points: Exact | null;
  readonly descriptor: string | null;
  /** The band's position in the order the pack declared. */
  readonly index: number;
}

/**
 * A scale whose bands have been parsed, checked and sorted.
 *
 * `bands` keeps the declared order (the order a report shows), while `order` is sorted by
 * ascending `min` (the order a lookup walks). `direction` says how quality moves with the score
 * in the declared order, which is what a monotonicity check reads.
 */
export interface PreparedGradingScale {
  readonly code: string;
  readonly kind: GradingScaleKind;
  readonly input: string | null;
  readonly upper: ScaleUpperBound;
  readonly bands: readonly PreparedScaleBand[];
  readonly order: readonly PreparedScaleBand[];
  readonly direction: ScaleDirection;
  readonly lowest: Exact;
  readonly highest: Exact;
}

export type ScaleIssueCode =
  | 'invalid_scale_code'
  | 'invalid_kind'
  | 'invalid_upper'
  | 'invalid_input'
  | 'empty_bands'
  | 'invalid_band_code'
  | 'invalid_band_label'
  | 'invalid_band_bound'
  | 'invalid_band_range'
  | 'empty_band'
  | 'invalid_band_points'
  | 'missing_band_points'
  | 'invalid_band_descriptor'
  | 'missing_band_descriptor'
  | 'duplicate_band'
  | 'overlapping_bands'
  | 'gap_between_bands';

/** Why a scale was refused at load. `path` names the field at fault; `bands` names the bands. */
export interface ScaleIssue {
  readonly code: ScaleIssueCode;
  readonly path: string;
  /** A developer diagnostic; never composed for display. */
  readonly detail: string;
  /** The band codes at fault, empty when the issue is scale-wide. */
  readonly bands: readonly string[];
}

export type ScalePreparation =
  | { readonly ok: true; readonly scale: PreparedGradingScale }
  | { readonly ok: false; readonly issues: readonly ScaleIssue[] };

/** The band a lookup returned, with the values a result row needs. */
export interface ScaleBandMatch {
  readonly code: string;
  readonly label: string;
  /** The band's points as canonical exact text, or null when it declares none. */
  readonly points: string | null;
  readonly descriptor: string | null;
}

/**
 * Where the score sits on the band it matched.
 *
 * A single-point band (`min` equals `max` under the inclusive convention) reports `lower`; the
 * two boundaries coincide, so there is no separate case.
 */
export type ScaleBoundary = 'lower' | 'upper' | 'inside' | 'none';

/** One band's boundary decisions, enough for replay to recompute the match. */
export interface ScaleCheckTrace {
  readonly band: string;
  /** The band's position in the declared order. */
  readonly index: number;
  readonly min: string;
  readonly max: string;
  readonly lower_ok: boolean;
  readonly upper_ok: boolean;
  readonly matched: boolean;
}

/** The explanation of a scale lookup: the score, every boundary check, and the band it chose. */
export interface ScaleLookupTrace {
  readonly scale: string;
  readonly kind: GradingScaleKind;
  readonly input: string | null;
  readonly upper: ScaleUpperBound;
  readonly source: ScaleValueSource;
  /** The exact score the scale was applied to. */
  readonly score: string;
  /** One check per band, in the declared order. */
  readonly checks: readonly ScaleCheckTrace[];
  readonly band: string | null;
  readonly boundary: ScaleBoundary;
}

export type ScaleLookup =
  | { readonly matched: true; readonly band: ScaleBandMatch; readonly trace: ScaleLookupTrace }
  | { readonly matched: false; readonly band: null; readonly trace: ScaleLookupTrace };

export type ScaleOutcome =
  | { readonly ok: false; readonly issues: readonly ScaleIssue[] }
  | ({ readonly ok: true } & ScaleLookup);
