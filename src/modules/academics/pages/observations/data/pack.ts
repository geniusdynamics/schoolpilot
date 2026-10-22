// ABOUTME: Projects the ke-cbe pack's assessment and learning-area documents onto the observation
// ABOUTME: vocabulary the capture page needs: the formative scheme, its rubric scale and its levels.
// ABOUTME: The page never names a level code itself; every code, label and descriptor comes from here.

import { formatExact } from '@/domain/assessment/engine';
import type { AggregationDefinition } from '@/domain/assessment/aggregation';
import {
  prepareGradingScale,
  type GradingScaleDefinition,
  type PreparedGradingScale,
} from '@/domain/assessment/scales';

import { assessmentDocument, learningAreasDocument } from './packDocuments';

/** One level of the pack's observation rubric, in the order the pack declares it. */
export interface ObservationLevel {
  readonly code: string;
  readonly label: string;
  /** The level's numeric value on the pack's scale, as exact text (`4` for EE). */
  readonly points: string;
  readonly descriptor: string | null;
}

export interface ObservationScheme {
  readonly code: string;
  /** The levels the scheme covers; observation capture is disabled outside them. */
  readonly levels: readonly string[];
  readonly observationScale: string;
  readonly termJudgement: {
    readonly op: 'teacher_best_fit';
    /** The pack's suggested derivation, for example `mode_of_latest_per_outcome`. */
    readonly suggest: string | null;
  };
  readonly reportShows: readonly string[];
}

export interface PackCompetency {
  readonly code: string;
  readonly name: string;
  readonly kind: string;
}

export interface PackLearningArea {
  readonly code: string;
  readonly name: string;
  readonly levels: readonly string[];
}

export interface ObservationPack {
  readonly scheme: ObservationScheme;
  readonly scale: {
    readonly code: string;
    readonly definition: GradingScaleDefinition;
    readonly prepared: PreparedGradingScale;
  };
  /** The pack's levels in declared order (best first in ke-cbe). */
  readonly levels: readonly ObservationLevel[];
  readonly levelByCode: ReadonlyMap<string, ObservationLevel>;
  /** The pack aggregation that turns a mean rubric level into a band, when it declares one. */
  readonly meanAggregation: AggregationDefinition | null;
  readonly competencies: readonly PackCompetency[];
  readonly learningAreas: readonly PackLearningArea[];
}

export type ObservationPackResult =
  | { readonly ok: true; readonly pack: ObservationPack }
  | { readonly ok: false; readonly error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * Reads the pack's formative scheme out of the assessment document.
 *
 * A pack may declare several schemes; the observation scheme is the one that states rubric
 * observations as its evidence. The observation scale is a named scale in the same document, so a
 * scheme that points at a scale the pack does not declare is refused rather than guessed at.
 */
function readScheme(assessment: Record<string, unknown>): ObservationScheme | string {
  const schemes = asArray(assessment.schemes).map(asRecord).filter((entry) => entry !== null);
  const scheme = schemes.find((entry) => entry.evidence === 'rubric_observations');
  if (!scheme) return 'the pack declares no scheme with rubric observations as its evidence';

  const code = asText(scheme.code);
  const scale = asText(scheme.observation_scale);
  if (!code) return 'the rubric-observation scheme has no code';
  if (!scale) return `the rubric-observation scheme ${code} names no observation scale`;

  const levels = asArray(scheme.levels).map(asText).filter((value): value is string => value !== null);
  if (levels.length === 0) return `the rubric-observation scheme ${code} declares no levels`;

  const judgement = asRecord(scheme.term_judgement) ?? {};
  const judgementOp = asText(judgement.op);
  if (judgementOp !== 'teacher_best_fit') {
    return `the rubric-observation scheme ${code} declares term judgement ${judgementOp ?? 'none'}, which this page cannot derive`;
  }
  const suggestion = asText(judgement.suggest);
  if (suggestion !== null && suggestion !== 'mode_of_latest_per_outcome') {
    return `the rubric-observation scheme ${code} suggests ${suggestion}, which this page does not implement`;
  }
  return {
    code,
    levels,
    observationScale: scale,
    termJudgement: {
      op: 'teacher_best_fit',
      suggest: suggestion,
    },
    reportShows: asArray(scheme.report_shows)
      .map(asText)
      .filter((value): value is string => value !== null),
  };
}

function readScale(
  assessment: Record<string, unknown>,
  code: string
): { definition: GradingScaleDefinition; prepared: PreparedGradingScale } | string {
  const scales = asArray(assessment.grading_scales).map(asRecord).filter((entry) => entry !== null);
  const raw = scales.find((entry) => entry.code === code);
  if (!raw) return `the pack declares no grading scale ${code}`;
  if (raw.kind !== 'rubric') return `the observation scale ${code} is not a rubric scale`;

  // The pack's JSON is structurally the scale definition; the loader validates every field below.
  const definition = raw as unknown as GradingScaleDefinition;
  const preparation = prepareGradingScale(definition);
  if (!preparation.ok) {
    const reasons = preparation.issues.map((issue) => `${issue.code} at ${issue.path}`).join(', ');
    return `the observation scale ${code} is invalid: ${reasons}`;
  }
  return { definition, prepared: preparation.scale };
}

function readLevels(prepared: PreparedGradingScale): readonly ObservationLevel[] | string {
  const levels: ObservationLevel[] = [];
  // `prepared.bands` keeps the pack's declared order, which is the order the picker shows.
  for (const band of prepared.bands) {
    if (band.points === null) return `the rubric scale ${prepared.code} has no points on band ${band.code}`;
    levels.push({
      code: band.code,
      label: band.label,
      points: formatExact(band.points),
      descriptor: band.descriptor,
    });
  }
  return levels;
}

function readMeanAggregation(
  assessment: Record<string, unknown>,
  scaleCode: string
): AggregationDefinition | null {
  const aggregations = asArray(assessment.aggregations).map(asRecord).filter((entry) => entry !== null);
  const raw = aggregations.find(
    (entry) =>
      entry.op === 'mean' && entry.value === 'rubric_level' && entry.result_scale === scaleCode
  );
  return raw ? (raw as unknown as AggregationDefinition) : null;
}

function readCompetencies(learningAreas: Record<string, unknown>): readonly PackCompetency[] {
  return asArray(learningAreas.competencies)
    .map(asRecord)
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      code: asText(entry.code) ?? '',
      name: asText(entry.name) ?? '',
      kind: asText(entry.kind) ?? 'core_competency',
    }))
    .filter((entry) => entry.code !== '' && entry.name !== '');
}

function readLearningAreas(learningAreas: Record<string, unknown>): readonly PackLearningArea[] {
  return asArray(learningAreas.learning_areas)
    .map(asRecord)
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      code: asText(entry.code) ?? '',
      name: asText(entry.name) ?? '',
      levels: asArray(entry.levels)
        .map(asText)
        .filter((value): value is string => value !== null),
    }))
    .filter((entry) => entry.code !== '' && entry.name !== '');
}

/**
 * Loads the observation vocabulary from the pack's assessment and learning-area documents.
 *
 * Refusals are returned, never thrown: a page that cannot read the pack shows the reason instead of
 * falling back to a hard-coded CBC vocabulary.
 */
export function loadObservationPack(
  assessment: unknown,
  learningAreas: unknown
): ObservationPackResult {
  const assessmentRecord = asRecord(assessment);
  if (!assessmentRecord) return { ok: false, error: 'the assessment document is not an object' };
  const learningAreaRecord = asRecord(learningAreas);
  if (!learningAreaRecord) return { ok: false, error: 'the learning-area document is not an object' };

  const scheme = readScheme(assessmentRecord);
  if (typeof scheme === 'string') return { ok: false, error: scheme };

  const scale = readScale(assessmentRecord, scheme.observationScale);
  if (typeof scale === 'string') return { ok: false, error: scale };

  const levels = readLevels(scale.prepared);
  if (typeof levels === 'string') return { ok: false, error: levels };

  return {
    ok: true,
    pack: {
      scheme,
      scale: {
        code: scale.prepared.code,
        definition: scale.definition,
        prepared: scale.prepared,
      },
      levels,
      levelByCode: new Map(levels.map((level) => [level.code, level] as const)),
      meanAggregation: readMeanAggregation(assessmentRecord, scheme.observationScale),
      competencies: readCompetencies(learningAreaRecord),
      learningAreas: readLearningAreas(learningAreaRecord),
    },
  };
}

/** The pack bundled with the application. A malformed pack is reported by the page. */
export const bundledObservationPack: ObservationPackResult = loadObservationPack(
  assessmentDocument,
  learningAreasDocument
);
