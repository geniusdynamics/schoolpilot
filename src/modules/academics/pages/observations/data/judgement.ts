// ABOUTME: Derives a learner's term judgement from competency observations: the latest observation
// ABOUTME: per outcome, the pack's suggested mode, and the rubric lookup that names the band.
// ABOUTME: Nothing here knows a CBC level code; every code, label and point comes from the pack.

import { compareExact, parseExact } from '@/domain/assessment/engine';
import { evaluateAggregation } from '@/domain/assessment/aggregation';
import { givenScore, lookupScaleBand, type ScaleBandMatch } from '@/domain/assessment/scales';

import type { ObservationLevel, ObservationPack } from './pack';

export type ObservationMode = 'outcome' | 'competency';

/**
 * The fields of a competency observation the page reads, kept structural so the derivation can be
 * tested with plain rows and used with `RepositoryRow<'competency_observation'>`.
 */
export interface ObservationRecord {
  readonly id: string;
  readonly enrolment_id: string;
  readonly learning_area_id: string;
  readonly outcome_id?: string;
  readonly competency_id?: string;
  readonly rubric_level: string;
  readonly evidence?: string;
  readonly observed_on: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly rowVersion?: number;
}

/** The observation target a row belongs to, or null when it names neither an outcome nor a competency. */
export function targetKeyOf(record: ObservationRecord, mode: ObservationMode): string | null {
  if (mode === 'outcome') return record.outcome_id ? `outcome:${record.outcome_id}` : null;
  return record.competency_id ? `competency:${record.competency_id}` : null;
}

/** The key one learner's cell for one target is held under. */
export function cellKeyOf(targetKey: string, enrolmentId: string): string {
  return `${targetKey}|${enrolmentId}`;
}

function isNewer(candidate: ObservationRecord, current: ObservationRecord): boolean {
  if (candidate.observed_on !== current.observed_on) {
    return candidate.observed_on > current.observed_on;
  }
  const candidateCreated = candidate.created_at ?? '';
  const currentCreated = current.created_at ?? '';
  if (candidateCreated !== currentCreated) return candidateCreated > currentCreated;
  const candidateUpdated = candidate.updated_at ?? '';
  const currentUpdated = current.updated_at ?? '';
  if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated;
  return candidate.id > current.id;
}

/**
 * The latest observation for every learner-and-target cell.
 *
 * An observation is newest by the day it was observed; two rows for the same day are ordered by
 * when they were written, so a correction captured after the original wins. Rows that name neither
 * an outcome nor a competency are dropped rather than guessed at.
 */
export function latestByCell(
  records: readonly ObservationRecord[],
  mode: ObservationMode
): ReadonlyMap<string, ObservationRecord> {
  const latest = new Map<string, ObservationRecord>();
  for (const record of records) {
    const targetKey = targetKeyOf(record, mode);
    if (targetKey === null) continue;
    const key = cellKeyOf(targetKey, record.enrolment_id);
    const current = latest.get(key);
    if (!current || isNewer(record, current)) latest.set(key, record);
  }
  return latest;
}

/** One latest observation with the pack level it names. */
export interface JudgementContribution {
  readonly targetKey: string;
  readonly record: ObservationRecord;
  readonly level: ObservationLevel;
}

/** How many latest observations carry one pack level. */
export interface JudgementCount {
  readonly level: ObservationLevel;
  readonly count: number;
}

/** The pack aggregation's mean level, when the pack declares one. */
export interface JudgementMean {
  readonly band: string;
  readonly label: string;
  readonly value: string;
}

export type Judgement =
  | {
      readonly kind: 'none';
      /** The observed rows whose level is not on the pack scale, if any. */
      readonly unknownLevels: readonly string[];
    }
  | {
      readonly kind: 'derived';
      /** The band the pack's rubric lookup awarded, or null when the lookup found no band. */
      readonly band: ScaleBandMatch | null;
      /** The level the pack's suggested rule chose. */
      readonly level: ObservationLevel;
      readonly counts: readonly JudgementCount[];
      readonly latest: readonly JudgementContribution[];
      readonly unknownLevels: readonly string[];
      readonly mean: JudgementMean | null;
      /** Why no band was awarded; absent when the lookup matched. */
      readonly reason?: string;
    };

export interface DeriveJudgementInput {
  readonly records: readonly ObservationRecord[];
  readonly enrolmentId: string;
  readonly mode: ObservationMode;
  readonly pack: ObservationPack;
}

/**
 * The pack's `mode_of_latest_per_outcome` suggestion, resolved through the pack's rubric lookup.
 *
 * The latest observation of each target contributes one level. The most frequent level wins; a tie
 * goes to the lower level, because two equal counts do not support the stronger claim. The winning
 * level is then looked up in the pack's scale, so the band and label are the pack's own, not a
 * second vocabulary written into the page.
 */
export function deriveJudgement({
  records,
  enrolmentId,
  mode,
  pack,
}: DeriveJudgementInput): Judgement {
  const latestForLearner = [...latestByCell(records, mode).entries()]
    .filter(([, record]) => record.enrolment_id === enrolmentId)
    .map(([key, record]) => ({ key, record }))
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));

  const latest = latestForLearner
    .map(({ record }) => {
      const level = pack.levelByCode.get(record.rubric_level);
      if (!level) return null;
      const targetKey = targetKeyOf(record, mode);
      if (targetKey === null) return null;
      return { targetKey, record, level };
    })
    .filter((entry): entry is JudgementContribution => entry !== null);

  const unknownLevels = [
    ...new Set(
      latestForLearner
        .map(({ record }) => record.rubric_level)
        .filter((code) => !pack.levelByCode.has(code))
    ),
  ].sort();

  if (latest.length === 0) return { kind: 'none', unknownLevels };

  const counts: JudgementCount[] = pack.levels.map((level) => ({
    level,
    count: latest.filter((entry) => entry.level.code === level.code).length,
  }));

  const highest = Math.max(...counts.map((entry) => entry.count));
  const tied = counts.filter((entry) => entry.count === highest);
  const chosen = tied.reduce((lowest, entry) => {
    const left = parseExact(entry.level.points);
    const right = parseExact(lowest.level.points);
    if (left === null || right === null) return lowest;
    return compareExact(left, right) < 0 ? entry : lowest;
  }, tied[0]).level;

  const score = parseExact(chosen.points);
  const lookup = score === null ? null : lookupScaleBand(pack.scale.prepared, givenScore(score));
  const mean = meanOf(pack, latest);

  if (lookup === null || !lookup.matched) {
    return {
      kind: 'derived',
      band: null,
      level: chosen,
      counts,
      latest,
      unknownLevels,
      mean,
      reason: `the pack scale ${pack.scale.code} has no band for level ${chosen.points}`,
    };
  }

  return {
    kind: 'derived',
    band: lookup.band,
    level: chosen,
    counts,
    latest,
    unknownLevels,
    mean,
  };
}

/**
 * The pack's mean-level aggregation over the same latest observations.
 *
 * This is the pack's own `mean` aggregation, run through the aggregation engine, so the summary
 * shows what the pack reports alongside the term judgement the scheme asks for.
 */
function meanOf(
  pack: ObservationPack,
  latest: readonly JudgementContribution[]
): JudgementMean | null {
  if (pack.meanAggregation === null) return null;
  const evaluation = evaluateAggregation(
    pack.meanAggregation,
    latest.map((entry) => ({
      code: entry.targetKey,
      rubric_level: entry.level.points,
      complete: true,
    })),
    { scales: [pack.scale.definition] }
  );
  if (!evaluation.ok) return null;
  const grade = evaluation.result.grade;
  const value = evaluation.result.value;
  if (grade === null || value === null) return null;
  return { band: grade.band, label: grade.label, value };
}
