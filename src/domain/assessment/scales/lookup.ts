// ABOUTME: The pure grading-scale lookup: applies an exact score to prepared bands, records every
// ABOUTME: boundary decision in a replayable trace, and maps a scheme result's named number onto
// ABOUTME: the scale so the caller never grades a value by accident.

import { compareExact, formatExact, parseExact, type Exact } from '../engine';
import { prepareGradingScale } from './prepare';
import type {
  EngineScaleValueSource,
  GradeScore,
  GradingScaleDefinition,
  PreparedGradingScale,
  PreparedScaleBand,
  ScaleBandMatch,
  ScaleBoundary,
  ScaleCheckTrace,
  ScaleLookup,
  ScaleLookupTrace,
  ScaleOutcome,
  ScaleUpperBound,
  SchemeScoreFields,
} from './types';

/** A trace whose recorded boundary decisions disagree with the score it stores. */
export class ScaleTraceMismatchError extends Error {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;

  constructor(path: string, expected: string, actual: string) {
    super(`scale trace mismatch at ${path}: recorded ${expected}, recomputed ${actual}`);
    this.name = 'ScaleTraceMismatchError';
    this.path = path;
    this.expected = expected;
    this.actual = actual;
  }
}

function readExact(path: string, text: string): Exact {
  const value = parseExact(text);
  if (value === null) {
    throw new ScaleTraceMismatchError(path, 'an exact decimal or fraction', text);
  }
  return value;
}

function lowerHolds(score: Exact, band: PreparedScaleBand): boolean {
  return compareExact(score, band.min) >= 0;
}

function upperHolds(score: Exact, band: PreparedScaleBand, upper: ScaleUpperBound): boolean {
  return upper === 'inclusive' ? compareExact(score, band.max) <= 0 : compareExact(score, band.max) < 0;
}

function boundaryOf(score: Exact, min: Exact, max: Exact): ScaleBoundary {
  if (compareExact(score, min) === 0) return 'lower';
  if (compareExact(score, max) === 0) return 'upper';
  return 'inside';
}

function matchOf(band: PreparedScaleBand): ScaleBandMatch {
  return {
    code: band.code,
    label: band.label,
    points: band.points === null ? null : formatExact(band.points),
    descriptor: band.descriptor,
  };
}

interface BandDecision {
  readonly band: PreparedScaleBand;
  readonly lowerOk: boolean;
  readonly upperOk: boolean;
  readonly matched: boolean;
}

/**
 * Applies an exact score to a prepared scale.
 *
 * The first band whose lower bound holds and whose upper bound holds under the scale's declared
 * convention is the answer; `prepareGradingScale` guarantees at most one band can match. Every
 * band's decision is recorded, including the bands that did not match, so the trace shows the
 * boundary that chose the result.
 */
export function lookupScaleBand(scale: PreparedGradingScale, score: GradeScore): ScaleLookup {
  const decisions: readonly BandDecision[] = scale.bands.map((band) => {
    const lowerOk = lowerHolds(score.value, band);
    const upperOk = upperHolds(score.value, band, scale.upper);
    return { band, lowerOk, upperOk, matched: lowerOk && upperOk };
  });
  const chosen = decisions.find((decision) => decision.matched) ?? null;

  const checks: readonly ScaleCheckTrace[] = decisions.map((decision) => ({
    band: decision.band.code,
    index: decision.band.index,
    min: formatExact(decision.band.min),
    max: formatExact(decision.band.max),
    lower_ok: decision.lowerOk,
    upper_ok: decision.upperOk,
    matched: decision.matched,
  }));

  const trace: ScaleLookupTrace = {
    scale: scale.code,
    kind: scale.kind,
    input: scale.input,
    upper: scale.upper,
    source: score.source,
    score: formatExact(score.value),
    checks,
    band: chosen === null ? null : chosen.band.code,
    boundary: chosen === null ? 'none' : boundaryOf(score.value, chosen.band.min, chosen.band.max),
  };

  if (chosen === null) return { matched: false, band: null, trace };
  return { matched: true, band: matchOf(chosen.band), trace };
}

/** Prepares a definition and looks the score up in one call, for a caller that has no cache. */
export function evaluateGradingScale(definition: GradingScaleDefinition, score: GradeScore): ScaleOutcome {
  const preparation = prepareGradingScale(definition);
  if (!preparation.ok) return { ok: false, issues: preparation.issues };
  return { ok: true, ...lookupScaleBand(preparation.scale, score) };
}

/**
 * Reads one of a scheme result's numbers and parses it exactly.
 *
 * The source is named by the caller: `exact_total` is the pre-rounding total, `total` is the
 * rounded result and `percent` is the total as a percentage of its maximum. A null field (a
 * result with nothing counted) yields null rather than a made-up zero.
 *
 * This maps a number, it does not gate publication: the scheme's `status` still decides whether
 * a result may be graded at all (only `complete` may be).
 */
export function gradeScoreOf(
  fields: SchemeScoreFields,
  source: EngineScaleValueSource
): GradeScore | null {
  const text = fields[source];
  if (text === null) return null;
  const value = parseExact(text);
  if (value === null) return null;
  return { source, value };
}

/** A caller-supplied exact score, marked as such so a trace never implies it came from a result. */
export function givenScore(value: Exact): GradeScore {
  return { source: 'given', value };
}

/**
 * Recomputes a lookup from its trace alone.
 *
 * Every recorded boundary decision is checked against the stored score and bounds, exactly one
 * band must match, and the returned band and boundary must equal the recorded ones. A trace that
 * fails any of those checks throws `ScaleTraceMismatchError` instead of being trusted.
 */
export function replayScaleLookup(trace: ScaleLookupTrace): {
  readonly band: string | null;
  readonly boundary: ScaleBoundary;
} {
  const score = readExact('score', trace.score);
  let matched: ScaleCheckTrace | null = null;
  let matches = 0;

  for (let index = 0; index < trace.checks.length; index += 1) {
    const check = trace.checks[index];
    const path = `checks[${index}]`;
    const min = readExact(`${path}.min`, check.min);
    const max = readExact(`${path}.max`, check.max);
    const lowerOk = compareExact(score, min) >= 0;
    const upperOk =
      trace.upper === 'inclusive' ? compareExact(score, max) <= 0 : compareExact(score, max) < 0;
    const isMatch = lowerOk && upperOk;

    if (lowerOk !== check.lower_ok) {
      throw new ScaleTraceMismatchError(`${path}.lower_ok`, String(check.lower_ok), String(lowerOk));
    }
    if (upperOk !== check.upper_ok) {
      throw new ScaleTraceMismatchError(`${path}.upper_ok`, String(check.upper_ok), String(upperOk));
    }
    if (isMatch !== check.matched) {
      throw new ScaleTraceMismatchError(`${path}.matched`, String(check.matched), String(isMatch));
    }
    if (isMatch) {
      matches += 1;
      matched = check;
    }
  }

  if (matches > 1) {
    throw new ScaleTraceMismatchError('band', 'at most one matching band', `${matches} matching bands`);
  }

  const band = matched === null ? null : matched.band;
  if (band !== trace.band) {
    throw new ScaleTraceMismatchError('band', String(trace.band), String(band));
  }

  const boundary: ScaleBoundary =
    matched === null ? 'none' : boundaryOf(score, readExact('band.min', matched.min), readExact('band.max', matched.max));
  if (boundary !== trace.boundary) {
    throw new ScaleTraceMismatchError('boundary', trace.boundary, boundary);
  }

  return { band, boundary };
}
