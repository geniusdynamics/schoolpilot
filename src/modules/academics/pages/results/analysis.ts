// ABOUTME: The exam analysis arithmetic: subject means, pass rates, grade distribution, aggregate
// ABOUTME: merit order and the overall mean, all read from the results engine's rows.

import type { AreaOutcome, LearnerResultRow } from './types';
import type { AreaSource } from './compute';

export interface SubjectPerformance {
  readonly areaCode: string;
  readonly name: string;
  readonly sat: number;
  readonly mean: number;
  readonly highest: number;
  readonly lowest: number;
  readonly passRate: number;
  readonly grades: Readonly<Record<string, number>>;
}

export interface MeritRow {
  readonly rank: number;
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  readonly value: number;
  readonly grade: string | null;
}

export interface ExamAnalysis {
  readonly subjects: readonly SubjectPerformance[];
  readonly merit: readonly MeritRow[];
  readonly gradeTotals: Readonly<Record<string, number>>;
  readonly meanAggregate: number;
  readonly completeLearners: number;
}

const numeric = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const gradeKey = (outcome: AreaOutcome): string => outcome.grade?.code ?? 'No grade';

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Builds the class analysis.
 *
 * A subject's `sat` counts complete results only; an incomplete result is not a zero. The merit
 * order uses the aggregate's own value, and a learner whose aggregate is incomplete is not ranked
 * rather than being ranked last.
 */
export function buildExamAnalysis(
  rows: readonly LearnerResultRow[],
  areas: readonly AreaSource[]
): ExamAnalysis {
  const subjects: SubjectPerformance[] = areas.map((area, index) => {
    const outcomes = rows.map((row) => row.areas[index]).filter((outcome): outcome is AreaOutcome => outcome !== undefined);
    const values = outcomes
      .filter((outcome) => outcome.status === 'complete')
      .map((outcome) => numeric(outcome.percent))
      .filter((value): value is number => value !== null);
    const grades: Record<string, number> = {};
    for (const outcome of outcomes) {
      if (outcome.status !== 'complete') continue;
      const key = gradeKey(outcome);
      grades[key] = (grades[key] ?? 0) + 1;
    }
    return {
      areaCode: area.code,
      name: area.name,
      sat: values.length,
      mean: round1(mean(values)),
      highest: values.length === 0 ? 0 : round1(Math.max(...values)),
      lowest: values.length === 0 ? 0 : round1(Math.min(...values)),
      passRate: values.length === 0 ? 0 : round1((values.filter((value) => value >= 50).length / values.length) * 100),
      grades,
    };
  });

  const ranked = rows
    .map((row) => {
      const value = numeric(row.aggregate.value);
      return value === null || row.aggregate.status !== 'complete'
        ? null
        : {
            enrolmentId: row.enrolmentId,
            learnerName: row.learnerName,
            admissionNumber: row.admissionNumber,
            value: round1(value),
            grade: row.aggregate.grade?.code ?? null,
          };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => right.value - left.value)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const gradeTotals: Record<string, number> = {};
  for (const row of ranked) {
    const key = row.grade ?? 'No grade';
    gradeTotals[key] = (gradeTotals[key] ?? 0) + 1;
  }

  return {
    subjects,
    merit: ranked,
    gradeTotals,
    meanAggregate: round1(mean(ranked.map((row) => row.value))),
    completeLearners: ranked.length,
  };
}
