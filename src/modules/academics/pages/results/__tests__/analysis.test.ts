// ABOUTME: Tests the exam analysis arithmetic: subject means from complete results only, pass rate,
// ABOUTME: grade totals and merit order from the aggregate.

import { describe, expect, it } from 'vitest';

import { buildExamAnalysis } from '../analysis';
import type { AreaSource } from '../compute';
import type { LearnerResultRow } from '../types';

const areas = [
  { code: 'MATH', name: 'Mathematics' },
  { code: 'ENG', name: 'English' },
] as unknown as AreaSource[];

const row = (
  enrolmentId: string,
  name: string,
  math: { percent: string | null; status: 'complete' | 'incomplete'; grade: string | null },
  english: { percent: string | null; status: 'complete' | 'incomplete'; grade: string | null },
  aggregate: { value: string | null; status: 'complete' | 'incomplete'; grade: string | null }
): LearnerResultRow =>
  ({
    enrolmentId,
    learnerName: name,
    admissionNumber: name,
    areas: [
      { areaCode: 'MATH', status: math.status, percent: math.percent, total: null, outOf: null, grade: math.grade ? { code: math.grade, label: math.grade, points: null } : null, missing: [], reason: null },
      { areaCode: 'ENG', status: english.status, percent: english.percent, total: null, outOf: null, grade: english.grade ? { code: english.grade, label: english.grade, points: null } : null, missing: [], reason: null },
    ],
    aggregate: {
      code: 'mean',
      status: aggregate.status,
      value: aggregate.value,
      grade: aggregate.grade ? { code: aggregate.grade, label: aggregate.grade, points: null } : null,
      explanation: null,
      reason: null,
    },
  }) as unknown as LearnerResultRow;

describe('buildExamAnalysis', () => {
  it('counts sat only for complete results and ranks complete aggregates', () => {
    const analysis = buildExamAnalysis(
      [
        row('e1', 'Amina', { percent: '80', status: 'complete', grade: 'A' }, { percent: '70', status: 'complete', grade: 'B' }, { value: '75', status: 'complete', grade: 'A' }),
        row('e2', 'Brian', { percent: '40', status: 'complete', grade: 'D' }, { percent: null, status: 'incomplete', grade: null }, { value: null, status: 'incomplete', grade: null }),
        row('e3', 'Cate', { percent: '90', status: 'complete', grade: 'A' }, { percent: '85', status: 'complete', grade: 'A' }, { value: '87.5', status: 'complete', grade: 'A' }),
      ],
      areas
    );

    const math = analysis.subjects.find((subject) => subject.name === 'Mathematics');
    expect(math).toMatchObject({ sat: 3, mean: 70, highest: 90, lowest: 40, passRate: 66.7 });
    const english = analysis.subjects.find((subject) => subject.name === 'English');
    expect(english).toMatchObject({ sat: 2, mean: 77.5, highest: 85, lowest: 70, passRate: 100 });
    expect(analysis.merit.map((entry) => entry.learnerName)).toEqual(['Cate', 'Amina']);
    expect(analysis.merit.map((entry) => entry.rank)).toEqual([1, 2]);
    expect(analysis.gradeTotals).toEqual({ A: 2 });
    expect(analysis.completeLearners).toBe(2);
    expect(analysis.meanAggregate).toBe(81.3);
  });
});
