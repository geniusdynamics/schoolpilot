// ABOUTME: Shared fixtures for the aggregation tests: the shipped ke-844 pack and the spec 03 section 6
// ABOUTME: examples, the PLE and Francophone scales those examples name but no pack ships yet, and the
// ABOUTME: small helpers that turn a vector's grades into learning-area results.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { spec03Examples } from '@/domain/packs/__tests__/spec03Examples';

import { evaluateAggregation } from '..';
import type {
  AggregateResult,
  AggregationContext,
  AggregationDefinition,
  AggregationIssueCode,
  GradingScaleDefinition,
  LearningAreaResult,
} from '..';

export interface AssessmentDocument {
  readonly grading_scales: readonly GradingScaleDefinition[];
  readonly aggregations: readonly AggregationDefinition[];
}

/** The repository's `packs/` directory, found from the working directory a test run starts in. */
function packRoot(): string {
  let current = process.cwd();
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(current, 'packs');
    if (existsSync(join(candidate, 'ke-844', 'assessment.json'))) return candidate;
    current = dirname(current);
  }
  throw new Error('the packs directory is not above the working directory');
}

const PACK_ROOT = packRoot();

export const KE_844 = JSON.parse(readFileSync(join(PACK_ROOT, 'ke-844', 'assessment.json'), 'utf8')) as AssessmentDocument;

export const KE_CBE = JSON.parse(readFileSync(join(PACK_ROOT, 'ke-cbe', 'assessment.json'), 'utf8')) as AssessmentDocument;

export const KE_844_VECTORS = JSON.parse(
  readFileSync(join(PACK_ROOT, 'ke-844', 'tests', 'ke-844.vectors.json'), 'utf8')
) as {
  readonly vectors: readonly {
    readonly name: string;
    readonly input: Readonly<Record<string, string>>;
    readonly expect: {
      readonly selected?: readonly string[];
      readonly kcse_mean_grade?: { readonly total_points: number; readonly points: number; readonly grade: string };
    };
  }[];
};

/** The aggregations exactly as spec 03 section 6 prints them, which the pack schema tests validate. */
export const SPEC_AGGREGATIONS: readonly AggregationDefinition[] = (
  spec03Examples.find((example) => example.title.startsWith('aggregations:'))?.document as {
    readonly aggregations: readonly AggregationDefinition[];
  }
).aggregations;

/** The ranking policy exactly as spec 03 section 6.1 prints it. */
export const SPEC_RANKING = spec03Examples.find((example) => example.title === 'ranking policy')?.document as {
  readonly enabled: boolean;
  readonly scope: 'class_group' | 'level' | 'programme';
  readonly by: string;
  readonly ties: 'competition_1224' | 'dense_1223' | 'shared_average';
  readonly only_complete: boolean;
  readonly show_on_report: boolean;
  readonly show_out_of: boolean;
};

export function scaleOf(code: string, scales: readonly GradingScaleDefinition[] = KE_844.grading_scales): GradingScaleDefinition {
  const scale = scales.find((entry) => entry.code === code);
  if (scale === undefined) throw new Error(`no scale "${code}" in scope`);
  return scale;
}

export function aggregationOf(code: string, aggregations: readonly AggregationDefinition[] = KE_844.aggregations): AggregationDefinition {
  const aggregation = aggregations.find((entry) => entry.code === code);
  if (aggregation === undefined) throw new Error(`no aggregation "${code}" in scope`);
  return aggregation;
}

/** The band a vector names, by its code or by the label printed on a transcript. */
export function bandOf(scale: GradingScaleDefinition, grade: string) {
  const band = scale.bands.find((entry) => entry.code === grade) ?? scale.bands.find((entry) => entry.label === grade);
  if (band === undefined) throw new Error(`scale "${scale.code}" has no band "${grade}"`);
  return band;
}

export function pointsOf(scale: GradingScaleDefinition, grade: string): string {
  const band = bandOf(scale, grade);
  if (band.points === undefined) throw new Error(`band "${band.code}" of scale "${scale.code}" declares no points`);
  return String(band.points);
}

export const KE_844_GROUPS: Readonly<Record<string, string>> = {
  ENG: 'languages',
  KIS: 'languages',
  MAT: 'mathematics',
  BIO: 'sciences',
  PHY: 'sciences',
  CHE: 'sciences',
  HIS: 'humanities',
  GEO: 'humanities',
  CRE: 'humanities',
  IRE: 'humanities',
  HRE: 'humanities',
  AGR: 'applied',
  BST: 'applied',
};

/** A KCSE vector's grade codes as learning-area results with the 12-point points each is worth. */
export function kcseAreas(gradeByCode: Readonly<Record<string, string>>): readonly LearningAreaResult[] {
  const scale = scaleOf('kcse_subject');
  return Object.entries(gradeByCode).map(([code, grade]) => ({
    code,
    group: KE_844_GROUPS[code],
    grade: bandOf(scale, grade).code,
    points: pointsOf(scale, grade),
  }));
}

/**
 * The Uganda PLE division table: the four subjects' grade points (D1 = 1 to F9 = 9) are added, and
 * the aggregate falls in one of five divisions. The scale is not yet shipped by a pack, so the
 * fixture is stated here; the pack that ships it must cite the current UNEB circular.
 */
export const PLE_DIVISIONS: GradingScaleDefinition = {
  code: 'ple_divisions',
  kind: 'division',
  input: 'aggregate',
  upper: 'inclusive',
  bands: [
    { code: 'I', label: 'Division I', min: 4, max: 12, points: 1 },
    { code: 'II', label: 'Division II', min: 13, max: 23, points: 2 },
    { code: 'III', label: 'Division III', min: 24, max: 29, points: 3 },
    { code: 'IV', label: 'Division IV', min: 30, max: 34, points: 4 },
    { code: 'U', label: 'Division U', min: 35, max: 36, points: 5 },
  ],
  verification: 'UNEB PLE divisions: I 4-12, II 13-23, III 24-29, IV 30-34, U 35-36.',
};

export const PLE_POINTS: Readonly<Record<string, string>> = {
  D1: '1',
  D2: '2',
  C3: '3',
  C4: '4',
  C5: '5',
  C6: '6',
  P7: '7',
  P8: '8',
  F9: '9',
};

/** A PLE vector's grade codes as learning-area results carrying their grade points. */
export function pleAreas(gradeByCode: Readonly<Record<string, string>>): readonly LearningAreaResult[] {
  return Object.entries(gradeByCode).map(([code, grade]) => ({
    code,
    grade,
    grade_points: PLE_POINTS[grade],
  }));
}

/**
 * The Francophone mention table, on the 20-point moyenne. Cut-offs are the published mentions
 * (18 Excellent, 16 Très Bien, 14 Bien, 12 Assez Bien, 10 Passable); the bands are stated to two
 * decimals so every rounded moyenne lands in exactly one of them.
 */
export const MENTIONS_FR: GradingScaleDefinition = {
  code: 'mentions_fr',
  kind: 'out_of_20',
  input: 'score_20',
  upper: 'inclusive',
  bands: [
    { code: 'EXCELLENT', label: 'Excellent', min: 18, max: 20 },
    { code: 'TRES_BIEN', label: 'Très Bien', min: 16, max: 17.99 },
    { code: 'BIEN', label: 'Bien', min: 14, max: 15.99 },
    { code: 'ASSEZ_BIEN', label: 'Assez Bien', min: 12, max: 13.99 },
    { code: 'PASSABLE', label: 'Passable', min: 10, max: 11.99 },
    { code: 'INSUFFISANT', label: 'Insuffisant', min: 0, max: 9.99 },
  ],
};

export function resultOf(
  definition: AggregationDefinition,
  inputs: readonly LearningAreaResult[],
  context: AggregationContext = {}
): AggregateResult {
  const evaluation = evaluateAggregation(definition, inputs, context);
  if (!evaluation.ok) {
    throw new Error(`expected a result, got ${evaluation.issues.map((entry) => `${entry.code} at ${entry.path}`).join(', ')}`);
  }
  return evaluation.result;
}

export function issueCodesOf(
  definition: AggregationDefinition,
  inputs: readonly LearningAreaResult[] = [],
  context: AggregationContext = {}
): readonly AggregationIssueCode[] {
  const evaluation = evaluateAggregation(definition, inputs, context);
  if (evaluation.ok) throw new Error('expected the engine to refuse the definition');
  return evaluation.issues.map((entry) => entry.code);
}
