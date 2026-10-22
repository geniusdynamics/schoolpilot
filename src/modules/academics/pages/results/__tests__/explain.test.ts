// ABOUTME: "Why this grade" tests: the explanation of a best_n, a weighted mean, a capped fail_if and
// ABOUTME: a sum with multipliers, each number taken from the aggregate's own trace.

import { describe, expect, it } from 'vitest';

import { evaluateAggregation } from '@/domain/assessment/aggregation';
import type {
  AggregateResult,
  AggregationDefinition,
  GradingScaleDefinition,
  LearningAreaResult,
} from '@/domain/assessment/aggregation';

import { explainAggregate } from '../explain';

const LABELS = new Map([
  ['ENG', 'English'],
  ['HIS', 'History'],
  ['MAT', 'Mathematics'],
  ['SCI', 'Science'],
]);

const SUBJECT_SCALE: GradingScaleDefinition = {
  code: 'subject_bands',
  kind: 'numeric_bands',
  bands: [
    { code: 'A', label: 'A', min: 80, max: 101, points: 12 },
    { code: 'B', label: 'B', min: 70, max: 80, points: 9 },
    { code: 'C', label: 'C', min: 60, max: 70, points: 7 },
    { code: 'D', label: 'D', min: 50, max: 60, points: 5 },
    { code: 'E', label: 'E', min: 40, max: 50, points: 3 },
    { code: 'F', label: 'F', min: 0, max: 40, points: 1 },
  ],
};

const DIVISION_SCALE: GradingScaleDefinition = {
  code: 'divisions',
  kind: 'division',
  bands: [
    { code: 'I', label: 'Division I', min: 36, max: 49 },
    { code: 'II', label: 'Division II', min: 30, max: 36 },
    { code: 'III', label: 'Division III', min: 24, max: 30 },
    { code: 'IV', label: 'Division IV', min: 0, max: 24 },
  ],
};

function area(
  code: string,
  group: string,
  score: string,
  grade: string,
  points: string
): LearningAreaResult {
  return { code, group, score, grade, points, grade_points: points, complete: true };
}

const BASE_AREAS = [
  area('ENG', 'languages', '88', 'A', '12'),
  area('MAT', 'mathematics', '79', 'B', '9'),
  area('SCI', 'sciences', '65', 'C', '7'),
  area('HIS', 'humanities', '61', 'C', '7'),
];

function evaluate(definition: AggregationDefinition, inputs: readonly LearningAreaResult[]): AggregateResult {
  const evaluation = evaluateAggregation(definition, inputs, {
    scales: [SUBJECT_SCALE, DIVISION_SCALE],
  });
  if (!evaluation.ok) throw new Error(`the aggregation was refused: ${evaluation.issues[0]?.code}`);
  return evaluation.result;
}

function combineOf(result: AggregateResult) {
  const step = result.trace.steps.find(
    (candidate) => candidate.kind === 'mean' || candidate.kind === 'sum' || candidate.kind === 'weighted_mean'
  );
  if (step === undefined || (step.kind !== 'mean' && step.kind !== 'sum' && step.kind !== 'weighted_mean')) {
    throw new Error('the aggregate has no combine step');
  }
  return step;
}

describe('why this grade: best_n', () => {
  const definition: AggregationDefinition = {
    code: 'best3',
    op: 'best_n',
    n: 3,
    value: 'score',
    groups: [
      { require_all: ['ENG'] },
      { group: 'sciences', min: 1 },
      { fill_from: 'any' },
    ],
    then: { op: 'mean', precision: 2 },
    result_scale: 'subject_bands',
  };

  it('explains the selection, the reasons and the exact divisions', () => {
    const result = evaluate(definition, BASE_AREAS);
    const explanation = explainAggregate(result, LABELS);

    expect(explanation.headline).toContain('Best 3 of 4');
    expect(explanation.headline).toContain('232');
    expect(explanation.headline).toContain('÷ 3');
    expect(explanation.headline).toContain('77.33');
    expect(explanation.headline).toContain('B');
    expect(explanation.bandCode).toBe('B');

    const select = explanation.steps[0];
    expect(select.kind).toBe('select');
    expect(select.title).toBe('Best 3 of 4 learning areas');
    expect(select.table?.headers).toEqual(['Learning area', 'Value', 'Decision', 'Why']);

    const rows = select.table?.rows ?? [];
    const english = rows.find((row) => row[0] === 'English');
    const science = rows.find((row) => row[0] === 'Science');
    const history = rows.find((row) => row[0] === 'History');
    expect(english).toEqual(['English', '88', 'Kept', 'Required area']);
    expect(science).toEqual(['Science', '65', 'Kept', 'Fills a group minimum']);
    expect(history).toEqual(['History', '61', 'Dropped', 'Lower than Science']);

    const combine = explanation.steps[1];
    expect(combine.kind).toBe('mean');
    expect(combine.lines[0]).toBe('232 ÷ 3 = 77.33.');
    expect(combine.lines[1]).toBe('Divided by 3 — the number of learning areas counted.');
  });

  it('prints the trace’s own numbers rather than a fixture', () => {
    const changed = BASE_AREAS.map((entry) =>
      entry.code === 'ENG' ? area('ENG', 'languages', '60', 'C', '7') : entry
    );
    const result = evaluate(definition, changed);
    const explanation = explainAggregate(result, LABELS);

    const combine = combineOf(result);
    if (combine.kind !== 'mean') throw new Error('expected a mean');
    const counted = combine.parts.map((part) => part.multiplied);
    const table = explanation.steps[1].table;
    expect(table?.rows.map((row) => row[3])).toEqual(counted);
    expect(explanation.headline).not.toBe(explainAggregate(evaluate(definition, BASE_AREAS), LABELS).headline);
    expect(explanation.headline).toContain('204');
  });
});

describe('why this grade: weighted mean', () => {
  const definition: AggregationDefinition = {
    code: 'moyenne',
    op: 'weighted_mean',
    value: 'score',
    weights: { ENG: 2, MAT: 1, SCI: 1, HIS: 1 },
    precision: 2,
    result_scale: 'subject_bands',
  };

  it('shows each weight, each product, and the total weight', () => {
    const result = evaluate(definition, BASE_AREAS);
    const explanation = explainAggregate(result, LABELS);

    expect(explanation.headline).toContain('Σ value × weight');
    expect(explanation.headline).toContain('÷ 5');
    expect(explanation.headline).toContain('76.2');

    const combine = explanation.steps[0];
    expect(combine.kind).toBe('weighted_mean');
    expect(combine.table?.headers).toEqual([
      'Learning area',
      'Value',
      '× multiplier',
      'Counted',
      '× weight',
      'Contribution',
    ]);
    expect(combine.table?.rows.find((row) => row[0] === 'English')).toEqual([
      'English',
      '88',
      '× 1',
      '88',
      '× 2',
      '176',
    ]);
    expect(combine.lines[0]).toBe(
      'Each counted value is multiplied by its weight and the products are added: 381 ÷ 5 = 76.2.'
    );
    expect(combine.lines[1]).toBe('The weights add up to 5.');
    expect(combine.lines[2]).toBe('Divided by 5 — the total weight.');
  });
});

describe('why this grade: a capped fail_if', () => {
  const definition: AggregationDefinition = {
    code: 'ple_division',
    op: 'sum',
    value: 'grade_points',
    result_scale: 'divisions',
    fail_if: { any_grade: 'E', in: ['ENG'], then_max_division: 'IV', source: 'Spec 03 §6 example' },
  };

  const failing = [
    area('ENG', 'languages', '45', 'E', '3'),
    area('MAT', 'mathematics', '92', 'A', '12'),
    area('SCI', 'sciences', '88', 'A', '12'),
    area('HIS', 'humanities', '79', 'B', '9'),
  ];

  it('names the trigger, the order and the band that was capped', () => {
    const result = evaluate(definition, failing);
    expect(result.value).toBe('36');
    expect(result.grade?.awarded).toBe('I');
    expect(result.grade?.band).toBe('IV');

    const explanation = explainAggregate(result, LABELS);
    const cap = explanation.steps.find((step) => step.kind === 'fail_if');
    expect(cap).toBeDefined();
    expect(cap?.title).toBe('National rule (fail_if)');
    expect(cap?.summary).toBe('Capped at IV.');
    expect(cap?.lines[1]).toBe('It fired: English carries E. I was capped to IV.');
    expect(cap?.lines[2]).toBe('Band order used for the cap, best first: I > II > III > IV.');
    expect(cap?.lines[3]).toBe('Source: Spec 03 §6 example');
    expect(cap?.table?.rows).toEqual([['English', 'E', 'yes']]);
    expect(explanation.headline).toContain('→ IV');
    expect(explanation.headline).toContain('capped from I to IV');
  });

  it('says the rule did not fire when no watched area carries the grade', () => {
    const passing = BASE_AREAS.map((entry) =>
      entry.code === 'ENG' ? area('ENG', 'languages', '88', 'A', '12') : entry
    );
    const result = evaluate(definition, passing);
    const explanation = explainAggregate(result, LABELS);
    const cap = explanation.steps.find((step) => step.kind === 'fail_if');
    expect(cap?.summary).toBe('Watched, and did not fire.');
    expect(cap?.lines[1]).toBe('It did not fire: none of English carries E, so the award stands.');
    expect(result.grade?.band).toBe(result.grade?.awarded);
  });
});

describe('why this grade: a sum with multipliers', () => {
  const definition: AggregationDefinition = {
    code: 'attainment_8',
    op: 'sum',
    value: 'score',
    multipliers: { ENG: 2, MAT: 2 },
    divisor: 'sum_of_multipliers',
    precision: 2,
    result_scale: 'subject_bands',
  };

  it('shows the multiplier each area carries and where the divisor came from', () => {
    const result = evaluate(definition, BASE_AREAS);
    expect(result.value).toBe('76.67');

    const explanation = explainAggregate(result, LABELS);
    expect(explanation.headline).toBe('Total: 460 ÷ 6 = 76.67 → B');

    const combine = explanation.steps[0];
    expect(combine.kind).toBe('sum');
    expect(combine.table?.rows.find((row) => row[0] === 'English')).toEqual([
      'English',
      '88',
      '× 2',
      '176',
    ]);
    expect(combine.table?.rows.find((row) => row[0] === 'Mathematics')).toEqual([
      'Mathematics',
      '79',
      '× 2',
      '158',
    ]);
    expect(combine.lines[0]).toBe('460 ÷ 6 = 76.67.');
    expect(combine.lines[1]).toBe('Divided by 6 — the total of the multipliers applied.');
  });
});

describe('why this grade: an incomplete aggregate', () => {
  it('never states a grade it does not have', () => {
    const definition: AggregationDefinition = {
      code: 'best3',
      op: 'best_n',
      n: 3,
      value: 'score',
      groups: [{ require_all: ['ENG'] }, { fill_from: 'any' }],
      then: { op: 'mean', precision: 2 },
      result_scale: 'subject_bands',
    };
    const missing: LearningAreaResult[] = BASE_AREAS.map((entry) =>
      entry.code === 'ENG' ? { code: 'ENG', group: 'languages', complete: false } : entry
    );
    const result = evaluate(definition, missing);
    expect(result.status).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.grade).toBeNull();

    const explanation = explainAggregate(result, LABELS);
    expect(explanation.headline).toBe('No grade yet — the aggregate is not complete.');
    expect(explanation.bandCode).toBeNull();
    expect(explanation.steps.some((step) => step.kind === 'select')).toBe(true);
  });
});
