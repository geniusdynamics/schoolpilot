// ABOUTME: The analysis view models: per learning area, per class group, per teacher and across
// ABOUTME: periods. Every number is read from the cohort's engine results, and a learner with no
// ABOUTME: result is counted and named rather than averaged away or shown as a zero.

import type { DistributionBand } from './metrics';
import { meanOf, summarise } from './metrics';
import type {
  Cohort,
  GroupAnalysisRow,
  MissingLearner,
  SubjectAnalysisRow,
  TeacherAnalysisRow,
  TrendPoint,
  TrendSeries,
} from './types';

/** A cohort a learner has no usable aggregate for, with the reason the engine gave. */
function missingOf(cohort: Cohort): readonly MissingLearner[] {
  return cohort.rows
    .filter((row) => row.aggregate.value === null)
    .map((row) => ({
      enrolmentId: row.enrolmentId,
      learnerName: row.learnerName,
      admissionNumber: row.admissionNumber,
      reason: row.aggregate.reason,
    }));
}

/**
 * Per learning area: the mean and band distribution of its own results.
 *
 * A learning area is summarised from the area outcomes the engine produced for it, so the subject
 * table and the results page cannot disagree.
 */
export function subjectAnalysis(cohorts: readonly Cohort[]): readonly SubjectAnalysisRow[] {
  interface Accumulator {
    readonly code: string;
    readonly name: string;
    readonly group: string | null;
    readonly classes: Set<string>;
    readonly values: (string | null)[];
    readonly codes: (string | null)[];
    readonly order: readonly DistributionBand[];
  }

  const byCode = new Map<string, Accumulator>();
  for (const cohort of cohorts) {
    // A cohort's outcomes are index-aligned with its areas, so an area's results are read by
    // position rather than searched for by code.
    cohort.areas.forEach((area, index) => {
      const entry = byCode.get(area.code) ?? {
        code: area.code,
        name: area.name,
        group: area.group,
        classes: new Set<string>(),
        values: [],
        codes: [],
        order: (area.scale?.bands ?? []).map((band) => ({ code: band.code, label: band.label })),
      };
      entry.classes.add(cohort.classGroupId);
      for (const row of cohort.rows) {
        const outcome = row.areas[index];
        entry.values.push(outcome?.percent ?? null);
        entry.codes.push(outcome?.grade?.code ?? null);
      }
      byCode.set(area.code, entry);
    });
  }

  return [...byCode.values()]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((entry) => ({
      code: entry.code,
      name: entry.name,
      group: entry.group,
      classes: entry.classes.size,
      summary: summarise(entry.values, entry.codes, entry.order),
    }));
}

/** Per class group: the aggregate's mean and distribution, and the learners with no result. */
export function groupAnalysis(
  cohorts: readonly Cohort[],
  aggregateBands: readonly DistributionBand[]
): readonly GroupAnalysisRow[] {
  return [...cohorts]
    .sort((left, right) => left.classGroupName.localeCompare(right.classGroupName))
    .map((cohort) => {
      const values = cohort.rows.map((row) => row.aggregate.value);
      const codes = cohort.rows.map((row) => row.aggregate.grade?.code ?? null);
      return {
        classGroupId: cohort.classGroupId,
        name: cohort.classGroupName,
        levelName: cohort.levelName,
        aggregateCode: cohort.rows[0]?.aggregate.code ?? '',
        summary: summarise(values, codes, aggregateBands),
        missingLearners: missingOf(cohort),
      };
    });
}

/**
 * Per teacher: the results of the groups they teach.
 *
 * A teacher is named by the groups' own `teacher_ids` and the assignments effective in the period.
 * The population is whatever cohorts reached this function, and the hook only builds cohorts inside
 * the actor's scope - so a teacher's own analysis never sees another teacher's groups.
 */
export function teacherAnalysis(
  cohorts: readonly Cohort[],
  staffName: (staffId: string) => string,
  aggregateBands: readonly DistributionBand[]
): readonly TeacherAnalysisRow[] {
  interface Accumulator {
    readonly staffId: string;
    readonly classGroups: Set<string>;
    readonly values: (string | null)[];
    readonly codes: (string | null)[];
  }

  const byStaff = new Map<string, Accumulator>();
  for (const cohort of cohorts) {
    for (const staffId of cohort.teacherIds) {
      const entry = byStaff.get(staffId) ?? {
        staffId,
        classGroups: new Set<string>(),
        values: [],
        codes: [],
      };
      entry.classGroups.add(cohort.classGroupName);
      for (const row of cohort.rows) {
        entry.values.push(row.aggregate.value);
        entry.codes.push(row.aggregate.grade?.code ?? null);
      }
      byStaff.set(staffId, entry);
    }
  }

  return [...byStaff.values()]
    .map((entry) => ({
      staffId: entry.staffId,
      name: staffName(entry.staffId),
      groupCount: entry.classGroups.size,
      classGroups: [...entry.classGroups].sort(),
      summary: summarise(entry.values, entry.codes, aggregateBands),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** One metric a trend series follows, and how to read it off a cohort. */
export interface TrendMetric {
  readonly key: string;
  readonly label: string;
  /** The values of one cohort for this metric; null entries are learners with no result. */
  readonly valueOf: (cohort: Cohort) => readonly (string | null)[];
}

/** The aggregate's value, as the trend and the ranking policy's default metric read it. */
export function aggregateValues(cohort: Cohort): readonly (string | null)[] {
  return cohort.rows.map((row) => row.aggregate.value);
}

/** One learning area's percentage, as its trend series reads it. */
export function areaValues(areaCode: string) {
  return (cohort: Cohort): readonly (string | null)[] => {
    const index = cohort.areas.findIndex((area) => area.code === areaCode);
    if (index < 0) return cohort.rows.map(() => null);
    return cohort.rows.map((row) => row.areas[index]?.percent ?? null);
  };
}

/**
 * The same metric across periods, in period order.
 *
 * A period with no cohort, or with no learner who has a result, is a gap: `value` is null. It is
 * never interpolated from its neighbours and never shown as zero.
 */
export function buildTrends(
  cohorts: readonly Cohort[],
  periods: readonly { readonly id: string; readonly name: string }[],
  metrics: readonly TrendMetric[]
): readonly TrendSeries[] {
  return metrics.map((metric) => {
    const points: TrendPoint[] = periods.map((period) => {
      const inPeriod = cohorts.filter((cohort) => cohort.periodId === period.id);
      const values = inPeriod.flatMap((cohort) => [...metric.valueOf(cohort)]);
      const present = values.filter((value): value is string => value !== null);
      return {
        periodId: period.id,
        periodName: period.name,
        value: meanOf(present),
        learners: values.length,
        withResult: present.length,
        missing: values.length - present.length,
      };
    });
    return { key: metric.key, label: metric.label, points };
  });
}
