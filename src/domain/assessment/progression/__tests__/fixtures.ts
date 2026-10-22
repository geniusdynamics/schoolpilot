// ABOUTME: Shared fixtures for the progression tests: a small level chain and two stages, a percent
// ABOUTME: grading scale for the annual band lookup, and helpers that turn a period-value map into
// ABOUTME: the exact inputs the annual and progression evaluators read.

import { evaluateAnnual, evaluateProgression } from '..';
import type {
  AnnualContext,
  AnnualDefinition,
  AnnualIssueCode,
  AnnualPeriodInput,
  AnnualResult,
  GradingScaleDefinition,
  ProgressionContext,
  ProgressionDefinition,
  ProgressionLearner,
  ProgressionSuggestion,
} from '..';

export const TEST_SCALE: GradingScaleDefinition = {
  code: 'test_percent',
  kind: 'numeric_bands',
  input: 'percent',
  upper: 'inclusive',
  bands: [
    { code: 'A', label: 'A', min: 80, max: 100, points: 4 },
    { code: 'B', label: 'B', min: 60, max: 79, points: 3 },
    { code: 'C', label: 'C', min: 40, max: 59, points: 2 },
    { code: 'D', label: 'D', min: 0, max: 39, points: 1 },
  ],
};

/** A four-level chain in two stages: L1-L2 in STAGE_ONE, L3-L4 in STAGE_TWO. */
export const LEVELS = [
  { code: 'L1', next: 'L2' },
  { code: 'L2', next: 'L3' },
  { code: 'L3', next: 'L4' },
  { code: 'L4', next: null },
] as const;

export const STAGES = [
  { code: 'STAGE_ONE', levels: ['L1', 'L2'] },
  { code: 'STAGE_TWO', levels: ['L3', 'L4'] },
] as const;

export const STRUCTURE: ProgressionContext = { levels: LEVELS, stages: STAGES };

/** A period-value map as annual inputs; a null value is a period with no result. */
export function periods(values: Readonly<Record<string, string | null>>): readonly AnnualPeriodInput[] {
  return Object.entries(values).map(([code, value]) => ({ code, value }));
}

/** The mutable mirror of a trace, for tests that deliberately corrupt one field. */
export type DeepMutable<T> = T extends readonly (infer U)[]
  ? DeepMutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
    : T;

export function annualOf(
  definition: AnnualDefinition,
  values: Readonly<Record<string, string | null>>,
  context: AnnualContext = {}
): AnnualResult {
  const evaluation = evaluateAnnual(definition, periods(values), context);
  if (!evaluation.ok) {
    throw new Error(`expected an annual result, got ${evaluation.issues.map((entry) => entry.code).join(', ')}`);
  }
  return evaluation.result;
}

export function annualIssueCodes(
  definition: AnnualDefinition,
  values: Readonly<Record<string, string | null>>,
  context: AnnualContext = {}
): readonly AnnualIssueCode[] {
  const evaluation = evaluateAnnual(definition, periods(values), context);
  if (evaluation.ok) throw new Error('expected the annual evaluator to refuse the definition');
  return evaluation.issues.map((entry) => entry.code);
}

/** One learner at one level, with every declared requirement present unless a test removes it. */
export function learnerAt(
  level: string,
  options: { readonly requirements?: Readonly<Record<string, boolean | string | null>>; readonly complete?: boolean } = {}
): ProgressionLearner {
  return {
    learner: 'L-001',
    level,
    ...(options.complete === undefined ? {} : { complete: options.complete }),
    ...(options.requirements === undefined ? {} : { requirements: options.requirements }),
  };
}

export function suggestionOf(
  definition: ProgressionDefinition,
  learner: ProgressionLearner,
  context: ProgressionContext = STRUCTURE
): ProgressionSuggestion {
  const evaluation = evaluateProgression(definition, [learner], context);
  if (!evaluation.ok) {
    throw new Error(`expected a suggestion, got ${evaluation.issues.map((entry) => entry.code).join(', ')}`);
  }
  return evaluation.suggestions[0];
}

export function suggestionFor(
  definition: ProgressionDefinition,
  level: string,
  context: ProgressionContext = STRUCTURE
): ProgressionSuggestion {
  const rule = definition.progression.find((candidate) => candidate.levels.includes(level));
  const requirements: Record<string, boolean> = {};
  for (const requirement of rule?.requires ?? []) requirements[requirement] = true;
  return suggestionOf(definition, learnerAt(level, { requirements }), context);
}

/** The exact text one decimal below a threshold, for a boundary test. */
export function justBelow(gte: string | number): string {
  const text = typeof gte === 'number' ? String(gte) : gte;
  const [whole, fraction = ''] = text.split('.');
  const value = BigInt(`${whole}${fraction}`.replace('-', ''));
  const sign = text.startsWith('-') ? -1n : 1n;
  const below = sign * value - 1n;
  const digits = (below < 0n ? -below : below).toString().padStart(fraction.length + 1, '0');
  const split = digits.length - fraction.length;
  return `${below < 0n ? '-' : ''}${digits.slice(0, split)}${fraction.length === 0 ? '' : `.${digits.slice(split)}`}`;
}
