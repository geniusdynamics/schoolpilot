// ABOUTME: Unit tests for the aggregation operators: each operator's arithmetic, the data gaps that
// ABOUTME: make a result incomplete, the definition issues that refuse one, and the trace replay that
// ABOUTME: catches a stored number disagreeing with its operands.

import { describe, expect, it } from 'vitest';

import { TraceMismatchError } from '@/domain/assessment/engine';

import { evaluateAggregation, rankLearners, replayAggregate } from '..';
import type { AggregateTrace, AggregationDefinition, GradingScaleDefinition, LearningAreaResult } from '..';

const SCALE: GradingScaleDefinition = {
  code: 'test_bands',
  kind: 'numeric_bands',
  upper: 'inclusive',
  bands: [
    { code: 'HIGH', label: 'High', min: 15, max: 20, points: 2 },
    { code: 'MID', label: 'Mid', min: 10, max: 14, points: 1 },
    { code: 'LOW', label: 'Low', min: 0, max: 9, points: 0 },
  ],
};

const CONTEXT = { scales: [SCALE] };

function resultOf(
  definition: AggregationDefinition,
  inputs: readonly LearningAreaResult[],
  context = CONTEXT
) {
  const evaluation = evaluateAggregation(definition, inputs, context);
  if (!evaluation.ok) {
    throw new Error(`expected a result, got ${evaluation.issues.map((entry) => entry.code).join(', ')}`);
  }
  return evaluation.result;
}

function issueCodesOf(definition: AggregationDefinition, inputs: readonly LearningAreaResult[] = [], context = CONTEXT) {
  const evaluation = evaluateAggregation(definition, inputs, context);
  if (evaluation.ok) throw new Error('expected the engine to refuse the definition');
  return evaluation.issues.map((entry) => entry.code);
}

const areas = (...entries: readonly LearningAreaResult[]): readonly LearningAreaResult[] => entries;

describe('sum', () => {
  it('adds the areas and rounds once at the declared precision', () => {
    const result = resultOf(
      { code: 'total', op: 'sum', value: 'points', precision: 1 },
      areas({ code: 'A', points: '10.25' }, { code: 'B', points: '5.5' })
    );
    expect(result.value).toBe('15.8');
    expect(result.exact_value).toBe('15.75');
    expect(result.subtotal).toBe('15.75');
    expect(result.rounding?.mode).toBe('half_up');
  });

  it('sums only the areas over names, in the order they are named', () => {
    const result = resultOf(
      { code: 'core', op: 'sum', value: 'points', over: ['B', 'A'] },
      areas({ code: 'A', points: '10' }, { code: 'B', points: '4' }, { code: 'C', points: '99' })
    );
    expect(result.value).toBe('14');
    expect(result.consumed.map((entry) => entry.code)).toEqual(['B', 'A']);
  });

  it('is order-independent', () => {
    const definition: AggregationDefinition = { code: 'total', op: 'sum', value: 'points' };
    const forward = resultOf(definition, areas({ code: 'A', points: '1' }, { code: 'B', points: '2' }, { code: 'C', points: '3' }));
    const backward = resultOf(definition, areas({ code: 'C', points: '3' }, { code: 'B', points: '2' }, { code: 'A', points: '1' }));
    expect(backward.value).toBe(forward.value);
  });

  it('reports an area over names but the learner has no result for', () => {
    const result = resultOf(
      { code: 'ple', op: 'sum', value: 'points', over: ['A', 'B'] },
      areas({ code: 'A', points: '10' })
    );
    expect(result.status).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.flags).toEqual([{ code: 'missing_value', area: 'B' }]);
  });

  it('reports an area that simply has no value for the field', () => {
    const result = resultOf(
      { code: 'total', op: 'sum', value: 'points' },
      areas({ code: 'A', points: '10' }, { code: 'B', score: '80' })
    );
    expect(result.status).toBe('incomplete');
    expect(result.flags).toEqual([{ code: 'missing_value', area: 'B' }]);
  });

  it('excludes an exempt area from the total and says so', () => {
    const result = resultOf(
      { code: 'total', op: 'sum', value: 'points' },
      areas({ code: 'A', points: '10' }, { code: 'B', points: '40', exempt: true })
    );
    expect(result.status).toBe('complete');
    expect(result.value).toBe('10');
    expect(result.flags).toEqual([{ code: 'exempt_area', area: 'B' }]);
  });
});

describe('mean', () => {
  it('divides the total by the areas that counted', () => {
    const result = resultOf(
      { code: 'average', op: 'mean', value: 'score', precision: 2 },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '15' }, { code: 'C', score: '20' })
    );
    expect(result.value).toBe('15');
  });

  it('is the value itself when every area carries it', () => {
    const result = resultOf(
      { code: 'average', op: 'mean', value: 'score' },
      areas({ code: 'A', score: '7.5' }, { code: 'B', score: '7.5' }, { code: 'C', score: '7.5' })
    );
    expect(result.value).toBe('7.5');
  });

  it('has no value when nothing counted', () => {
    const result = resultOf({ code: 'average', op: 'mean', value: 'score' }, []);
    expect(result.status).toBe('empty');
    expect(result.value).toBeNull();
    expect(result.trace.steps).toEqual([]);
  });
});

describe('weighted_mean', () => {
  it('weights by an explicit map and divides by the weights it used', () => {
    const result = resultOf(
      { code: 'weighted', op: 'weighted_mean', value: 'score', weights: { A: '1', B: '3' } },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '20' })
    );
    expect(result.value).toBe('17.5');
    expect(result.consumed).toEqual([
      { code: 'A', value: '10', weight: '1', multiplier: '1', multiplied: '10' },
      { code: 'B', value: '20', weight: '3', multiplier: '1', multiplied: '20' },
    ]);
  });

  it('refuses a definition with no weights', () => {
    expect(issueCodesOf({ code: 'weighted', op: 'weighted_mean', value: 'score' })).toEqual(['missing_weights']);
  });

  it('refuses weights that sum to zero', () => {
    expect(
      issueCodesOf({ code: 'weighted', op: 'weighted_mean', value: 'score', weights: { A: '0' } }, [{ code: 'A', score: '10' }])
    ).toEqual(['zero_total_weight']);
  });
});

describe('best_n', () => {
  const definition: AggregationDefinition = {
    code: 'best_two',
    op: 'best_n',
    n: 2,
    value: 'points',
    groups: [{ require_all: ['A'] }, { fill_from: 'any' }],
  };

  it('selects the required area and then the best remaining value', () => {
    const result = resultOf(
      definition,
      areas({ code: 'A', points: '3' }, { code: 'B', points: '9' }, { code: 'C', points: '8' })
    );
    expect(result.selected).toEqual(['A', 'B']);
    expect(result.subtotal).toBe('12');
    expect(result.value).toBe('6');
  });

  it('is incomplete when the required area has no result', () => {
    const result = resultOf(definition, areas({ code: 'B', points: '9' }, { code: 'C', points: '8' }));
    expect(result.status).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.flags.map((flag) => flag.code)).toContain('required_area_missing');
  });

  it('is incomplete when a group minimum cannot be met', () => {
    const result = resultOf(
      { code: 'best_three', op: 'best_n', n: 3, value: 'points', groups: [{ group: 'sci', min: 2 }, { fill_from: 'any' }] },
      areas({ code: 'S1', group: 'sci', points: '10' }, { code: 'A1', group: 'art', points: '9' }, { code: 'A2', group: 'art', points: '8' })
    );
    expect(result.status).toBe('incomplete');
    expect(result.flags.map((flag) => flag.code)).toContain('group_minimum_unmet');
  });

  it('is incomplete when there are fewer results than the selection needs', () => {
    const result = resultOf(definition, areas({ code: 'A', points: '3' }));
    expect(result.status).toBe('incomplete');
    expect(result.flags.map((flag) => flag.code)).toContain('insufficient_candidates');
  });

  it('refuses more compulsory areas than places', () => {
    expect(
      issueCodesOf({
        code: 'impossible',
        op: 'best_n',
        n: 2,
        value: 'points',
        groups: [{ require_all: ['A', 'B', 'C'] }],
      })
    ).toEqual(['constraints_exceed_n']);
  });

  it('accepts a required area that also satisfies a group minimum', () => {
    // one compulsory science plus one more science fills two places, so this is satisfiable
    const result = resultOf(
      { code: 'best', op: 'best_n', n: 2, value: 'points', groups: [{ require_all: ['S1'] }, { group: 'sci', min: 2 }] },
      areas({ code: 'S1', group: 'sci', points: '5' }, { code: 'S2', group: 'sci', points: '4' }, { code: 'A1', group: 'art', points: '9' })
    );
    expect(result.status).toBe('complete');
    expect(result.selected).toEqual(['S1', 'S2']);
  });

  it('never selects more than n', () => {
    const result = resultOf(
      { ...definition, n: 2 },
      areas({ code: 'A', points: '1' }, { code: 'B', points: '2' }, { code: 'C', points: '3' }, { code: 'D', points: '4' })
    );
    expect(result.selected).toHaveLength(2);
    expect(result.selected).toEqual(['A', 'D']);
  });

  it('treats a lookup post-step as the sum the scale then grades', () => {
    const result = resultOf(
      { ...definition, then: { op: 'lookup' }, result_scale: 'test_bands' },
      areas({ code: 'A', points: '9' }, { code: 'B', points: '3' }, { code: 'C', points: '2' })
    );
    expect(result.value).toBe('12');
    expect(result.grade?.band).toBe('MID');
  });
});

describe('points_mean and sum_points', () => {
  it('averages points and looks the mean up', () => {
    const result = resultOf(
      { code: 'mean_points', op: 'points_mean', value: 'points', precision: 0, result_scale: 'test_bands' },
      areas({ code: 'A', points: '16' }, { code: 'B', points: '18' })
    );
    expect(result.value).toBe('17');
    expect(result.grade?.band).toBe('HIGH');
  });

  it('adds points and looks the aggregate up', () => {
    const result = resultOf(
      { code: 'sum_points', op: 'sum_points', value: 'points', result_scale: 'test_bands' },
      areas({ code: 'A', points: '6' }, { code: 'B', points: '7' })
    );
    expect(result.value).toBe('13');
    expect(result.grade?.band).toBe('MID');
  });

  it('needs the scale it looks up', () => {
    expect(issueCodesOf({ code: 'sum_points', op: 'sum_points', value: 'points' })).toEqual(['missing_result_scale']);
  });

  it('flags a value no band covers', () => {
    const result = resultOf(
      { code: 'sum_points', op: 'sum_points', value: 'points', result_scale: 'test_bands' },
      areas({ code: 'A', points: '90' })
    );
    expect(result.grade).toBeNull();
    expect(result.flags).toEqual([{ code: 'ungraded', area: null }]);
  });
});

describe('gpa', () => {
  it('treats an area without a credit as one credit', () => {
    const result = resultOf(
      { code: 'gpa', op: 'gpa', value: 'grade_points' },
      areas({ code: 'A', grade_points: '4' }, { code: 'B', grade_points: '2', credit: '1' })
    );
    expect(result.value).toBe('3');
    expect(result.consumed.every((entry) => entry.weight === '1')).toBe(true);
  });
});

describe('count_where and rubric_profile', () => {
  it('refuses a relational predicate on a grade code', () => {
    expect(
      issueCodesOf({ code: 'c', op: 'count_where', value: 'grade', where: { op: 'gte', value: 'ME' } })
    ).toEqual(['relational_predicate_on_code']);
  });

  it('refuses a non-numeric bound against a numeric field', () => {
    expect(
      issueCodesOf({ code: 'c', op: 'count_where', value: 'rubric_level', where: { op: 'gte', value: 'ME' } })
    ).toEqual(['invalid_predicate']);
  });

  it('needs a predicate', () => {
    expect(issueCodesOf({ code: 'c', op: 'count_where', value: 'grade' })).toEqual(['missing_where']);
  });

  it('refuses precision on a profile', () => {
    expect(issueCodesOf({ code: 'p', op: 'rubric_profile', precision: 0 })).toEqual(['unsupported_option']);
  });

  it('counts nothing but still reports every level when no area has one', () => {
    const result = resultOf({ code: 'p', op: 'rubric_profile', result_scale: 'test_bands' }, []);
    expect(result.status).toBe('empty');
    expect(result.distribution?.map((entry) => entry.count)).toEqual([0, 0, 0]);
  });
});

describe('fail_if', () => {
  const definition: AggregationDefinition = {
    code: 'capped',
    op: 'sum_points',
    value: 'points',
    result_scale: 'test_bands',
    fail_if: { any_grade: 'F', then_max_division: 'LOW' },
  };

  it('caps an awarded band that beats the cap', () => {
    const result = resultOf(definition, areas({ code: 'A', points: '18', grade: 'F' }, { code: 'B', points: '0' }));
    expect(result.grade?.awarded).toBe('HIGH');
    expect(result.grade?.band).toBe('LOW');
    expect(result.grade?.capped_by?.then_max_division).toBe('LOW');
    expect(result.flags.map((flag) => flag.code)).toContain('fail_if_fired');
  });

  it('leaves a band worse than the cap alone', () => {
    const result = resultOf(
      { ...definition, fail_if: { any_grade: 'F', then_max_division: 'HIGH' } },
      areas({ code: 'A', points: '3', grade: 'F' })
    );
    expect(result.grade?.band).toBe('LOW');
    expect(result.grade?.capped_by).toBeNull();
  });

  it('carries the citation of a declared cap into the result', () => {
    const result = resultOf(
      {
        ...definition,
        fail_if: { any_grade: 'F', then_max_division: 'LOW', source: 'UNEB circular 2026/3 paragraph 4' },
      },
      areas({ code: 'A', points: '18', grade: 'F' }, { code: 'B', points: '0' })
    );
    expect(result.grade?.capped_by).toEqual({
      any_grade: 'F',
      then_max_division: 'LOW',
      source: 'UNEB circular 2026/3 paragraph 4',
    });

    const cap = result.trace.steps.find((step) => step.kind === 'fail_if');
    if (cap?.kind !== 'fail_if') throw new Error('the trace must record the cap');
    expect(cap.rule.source).toBe('UNEB circular 2026/3 paragraph 4');
    expect(cap.capped).toBe('LOW');
    expect(replayAggregate(result.trace).value).toBe(result.value);
  });

  it('needs a scale whose band it can name', () => {
    expect(
      issueCodesOf({ code: 'capped', op: 'sum_points', value: 'points', result_scale: 'test_bands', fail_if: { any_grade: 'F', then_max_division: 'NOPE' } })
    ).toEqual(['unknown_cap_band']);
  });

  it('needs a result scale at all', () => {
    expect(
      issueCodesOf({ code: 'capped', op: 'sum', value: 'points', fail_if: { any_grade: 'F', then_max_division: 'LOW' } })
    ).toEqual(['fail_if_without_scale']);
  });
});

describe('rounding and the declared mode', () => {
  it('rounds with the declared mode rather than only the default', () => {
    const halfUp = resultOf({ code: 'm', op: 'sum', value: 'score', precision: 0 }, areas({ code: 'A', score: '2.5' }));
    const halfEven = resultOf(
      { code: 'm', op: 'sum', value: 'score', precision: 0, mode: 'half_even' },
      areas({ code: 'A', score: '2.5' })
    );
    const down = resultOf(
      { code: 'm', op: 'sum', value: 'score', precision: 0, mode: 'down' },
      areas({ code: 'A', score: '2.9' })
    );

    expect(halfUp.value).toBe('3');
    expect(halfEven.value).toBe('2');
    expect(halfEven.rounding).toEqual({ precision: 0, mode: 'half_even', input: '2.5', output: '2' });
    expect(down.value).toBe('2');
    expect(down.trace.steps.find((step) => step.kind === 'round')).toMatchObject({ mode: 'down' });
  });

  it('refuses an unknown rounding mode', () => {
    expect(issueCodesOf({ code: 'm', op: 'sum', value: 'score', mode: 'nearest' as never })).toEqual([
      'invalid_rounding_mode',
    ]);
  });
});

describe('multipliers and divisor', () => {
  it('scales a sum before the aggregate is formed and divides by the declared divisor', () => {
    // 10*2 + 8 + 6 = 34, divided by 10
    const result = resultOf(
      {
        code: 'weighted_total',
        op: 'sum',
        value: 'score',
        multipliers: { A: 2 },
        divisor: 10,
      },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '8' }, { code: 'C', score: '6' })
    );

    expect(result.subtotal).toBe('34');
    expect(result.divisor).toBe('10');
    expect(result.value).toBe('3.4');
    expect(result.consumed).toEqual([
      { code: 'A', value: '10', weight: null, multiplier: '2', multiplied: '20' },
      { code: 'B', value: '8', weight: null, multiplier: '1', multiplied: '8' },
      { code: 'C', value: '6', weight: null, multiplier: '1', multiplied: '6' },
    ]);
    expect(result.trace.steps[0]).toMatchObject({
      kind: 'sum',
      divisor: '10',
      divisor_from: 'declared',
      value: '3.4',
    });
  });

  it('divides by the total of the multipliers actually applied', () => {
    // (10*2 + 8 + 6) / (2 + 1 + 1) = 34 / 4
    const result = resultOf(
      {
        code: 'weighted_total',
        op: 'sum',
        value: 'score',
        multipliers: { A: 2 },
        divisor: 'sum_of_multipliers',
      },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '8' }, { code: 'C', score: '6' })
    );

    expect(result.divisor).toBe('4');
    expect(result.value).toBe('8.5');
    expect(result.trace.steps[0]).toMatchObject({ divisor_from: 'sum_of_multipliers' });
  });

  it('falls back to the operator\'s natural divisor only when none is declared', () => {
    // no multipliers and no divisor: a mean divides by the number of results, a sum by one
    const mean = resultOf(
      { code: 'm', op: 'mean', value: 'score' },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '8' })
    );
    const sum = resultOf({ code: 's', op: 'sum', value: 'score' }, areas({ code: 'A', score: '10' }));
    const weighted = resultOf(
      { code: 'w', op: 'weighted_mean', value: 'score', weights: { A: 1, B: 3 } },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '8' })
    );

    expect(mean.value).toBe('9');
    expect(mean.trace.steps[0]).toMatchObject({ divisor: '2', divisor_from: 'count' });
    expect(sum.trace.steps[0]).toMatchObject({ divisor: '1', divisor_from: 'one' });
    expect(weighted.value).toBe('8.5');
    expect(weighted.trace.steps[0]).toMatchObject({ max: '4', divisor: '4', divisor_from: 'weights' });
  });

  it('divides a multiplied weighted mean by whatever the definition declares', () => {
    // (10*2*1 + 8*1*3) / 3 = 44 / 3, because the declaration names the multiplier total
    const byMultipliers = resultOf(
      {
        code: 'w',
        op: 'weighted_mean',
        value: 'score',
        weights: { A: 1, B: 3 },
        multipliers: { A: 2 },
        divisor: 'sum_of_multipliers',
      },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '8' })
    );
    // the same numerator over the weight total, which is the natural divisor
    const byWeight = resultOf(
      {
        code: 'w',
        op: 'weighted_mean',
        value: 'score',
        weights: { A: 1, B: 3 },
        multipliers: { A: 2 },
        divisor: 4,
      },
      areas({ code: 'A', score: '10' }, { code: 'B', score: '8' })
    );

    expect(byMultipliers.value).toBe('44/3');
    expect(byMultipliers.trace.steps[0]).toMatchObject({ kind: 'weighted_mean', max: '4', divisor: '3' });
    expect(byWeight.value).toBe('11');
    expect(byWeight.trace.steps[0]).toMatchObject({ divisor: '4', divisor_from: 'declared' });
  });

  it('requires the divisor when multipliers are declared', () => {
    expect(
      issueCodesOf({ code: 's', op: 'sum', value: 'score', multipliers: { A: 2 } }, [{ code: 'A', score: '10' }])
    ).toEqual(['missing_divisor']);
  });

  it('refuses a multiplier below one and a divisor that is not positive', () => {
    expect(
      issueCodesOf({ code: 's', op: 'sum', value: 'score', multipliers: { A: 0.5 }, divisor: 2 }, [
        { code: 'A', score: '10' },
      ])
    ).toEqual(['invalid_multiplier']);
    expect(
      issueCodesOf({ code: 's', op: 'sum', value: 'score', multipliers: { A: 'two' }, divisor: 2 }, [
        { code: 'A', score: '10' },
      ])
    ).toEqual(['invalid_multiplier']);
    expect(issueCodesOf({ code: 's', op: 'sum', value: 'score', divisor: 0 }, [])).toEqual(['invalid_divisor']);
    expect(issueCodesOf({ code: 's', op: 'sum', value: 'score', divisor: 'ten' }, [])).toEqual(['invalid_divisor']);
  });

  it('refuses both fields on a distribution, as the contract does', () => {
    expect(
      issueCodesOf({ code: 'c', op: 'count_where', value: 'grade', where: { op: 'eq', value: 'EE' }, multipliers: { A: 2 }, divisor: 2 })
    ).toEqual(['unsupported_option', 'unsupported_option']);
    expect(issueCodesOf({ code: 'p', op: 'rubric_profile', divisor: 10 }, [])).toEqual(['unsupported_option']);
  });

  it('refuses a multiplier on an area the run did not count', () => {
    const evaluation = evaluateAggregation(
      {
        code: 'best',
        op: 'best_n',
        n: 2,
        value: 'points',
        groups: [{ require_all: ['A'] }, { fill_from: 'any' }],
        multipliers: { A: 2, C: 2 },
        divisor: 2,
      },
      areas({ code: 'A', points: '10' }, { code: 'B', points: '9' }, { code: 'C', points: '8' })
    );

    expect(evaluation.ok).toBe(false);
    if (evaluation.ok) throw new Error('unreachable');
    expect(evaluation.issues.map((entry) => entry.code)).toEqual(['multiplier_not_consumed']);
    expect(evaluation.issues[0].path).toBe('multipliers.C');
  });

  it('refuses a multiplier naming an area the run does not cover at all', () => {
    expect(
      issueCodesOf(
        { code: 's', op: 'sum', value: 'score', over: ['A'], multipliers: { Z: 2 }, divisor: 2 },
        [{ code: 'A', score: '10' }]
      )
    ).toEqual(['multiplier_not_consumed']);
  });

  it('does not repeat the multiplier complaint when the area simply has no result', () => {
    const result = resultOf(
      { code: 's', op: 'sum', value: 'score', multipliers: { A: 2, B: 2 }, divisor: 4 },
      areas({ code: 'A', score: '10' }, { code: 'B' })
    );
    expect(result.status).toBe('incomplete');
    expect(result.flags).toEqual([{ code: 'missing_value', area: 'B' }]);
  });
});

describe('count_where predicate shape', () => {
  it('accepts the declared op, value and values', () => {
    const eq = resultOf(
      { code: 'c', op: 'count_where', value: 'grade', where: { op: 'eq', value: 'EE' } },
      areas({ code: 'A', grade: 'EE' }, { code: 'B', grade: 'ME' })
    );
    const within = resultOf(
      { code: 'c', op: 'count_where', value: 'rubric_level', where: { op: 'gte', value: '3' } },
      areas({ code: 'A', rubric_level: '4' }, { code: 'B', rubric_level: '2' })
    );

    expect(eq.value).toBe('1');
    expect(within.value).toBe('1');
    expect(eq.trace.steps[0]).toMatchObject({ kind: 'count', predicate: { op: 'eq', value: 'EE' } });
  });

  it('still refuses a relational predicate against a grade code', () => {
    expect(
      issueCodesOf({ code: 'c', op: 'count_where', value: 'grade', where: { op: 'lte', value: 'ME' } })
    ).toEqual(['relational_predicate_on_code']);
  });
});

describe('definition validation', () => {
  it('refuses an unknown operator, a missing value field and a bad precision', () => {
    expect(issueCodesOf({ code: 'x', op: 'median' as never })).toEqual(['unsupported_op']);
    expect(issueCodesOf({ code: 'x', op: 'sum' })).toEqual(['missing_value_field']);
    expect(issueCodesOf({ code: 'x', op: 'sum', value: 'score', precision: 13 })).toEqual(['invalid_precision']);
  });

  it('refuses best_n without n, without groups and without a value', () => {
    expect(issueCodesOf({ code: 'x', op: 'best_n', value: 'points', groups: [{ fill_from: 'any' }] })).toEqual(['invalid_n']);
    expect(issueCodesOf({ code: 'x', op: 'best_n', n: 7, value: 'points' })).toEqual(['missing_groups']);
    expect(issueCodesOf({ code: 'x', op: 'best_n', n: 7, groups: [{ fill_from: 'any' }] })).toEqual([
      'missing_value_field',
    ]);
  });

  it('refuses an unknown result scale', () => {
    expect(issueCodesOf({ code: 'x', op: 'sum', value: 'score', result_scale: 'nope' })).toEqual(['unknown_result_scale']);
  });

  it('refuses duplicate area codes and unparseable values', () => {
    expect(
      issueCodesOf({ code: 'x', op: 'sum', value: 'score' }, [{ code: 'A', score: '1' }, { code: 'A', score: '2' }])
    ).toEqual(['duplicate_area']);
    expect(issueCodesOf({ code: 'x', op: 'sum', value: 'score' }, [{ code: 'A', score: 'ten' }])).toEqual([
      'invalid_area_value',
    ]);
  });

  it('refuses a grade value on an arithmetic operator', () => {
    expect(issueCodesOf({ code: 'x', op: 'mean', value: 'grade' })).toEqual(['invalid_value_field']);
  });
});

describe('the trace', () => {
  const definition: AggregationDefinition = {
    code: 'kcse_like',
    op: 'best_n',
    n: 3,
    value: 'points',
    groups: [{ require_all: ['MAT'] }, { fill_from: 'any' }],
    then: { op: 'mean', precision: 2 },
    result_scale: 'test_bands',
  };
  const inputs = areas(
    { code: 'MAT', points: '16' },
    { code: 'ENG', points: '14' },
    { code: 'BIO', points: '12' },
    { code: 'HIS', points: '9' }
  );

  it('replays into its own numbers, including through JSON', () => {
    const result = resultOf(definition, inputs);
    const serialised = JSON.parse(JSON.stringify(result.trace)) as AggregateTrace;
    const replayed = replayAggregate(serialised);

    expect(replayed.value).toBe(result.value);
    expect(result.value).toBe('14');
  });

  it('reproduces the same value when its recorded inputs go back through the evaluator', () => {
    const result = resultOf(definition, inputs);
    const again = evaluateAggregation(result.trace.definition, result.trace.inputs, CONTEXT);
    if (!again.ok) throw new Error('the recorded definition must still be valid');
    expect(again.result.value).toBe(result.value);
    expect(again.result.selected).toEqual(result.selected);
  });

  it('refuses a stored number that disagrees with its operands', () => {
    const result = resultOf(definition, inputs);
    const tampered = JSON.parse(JSON.stringify(result.trace)) as Record<string, { value?: string }[] | unknown>;
    (tampered.steps as { value?: string }[])[0].value = '999';
    expect(() => replayAggregate(tampered as unknown as AggregateTrace)).toThrow(TraceMismatchError);
  });

  it('refuses a selection whose recorded decisions were edited', () => {
    const result = resultOf(definition, inputs);
    const tampered = JSON.parse(JSON.stringify(result.trace)) as {
      steps: { decisions?: { code: string; selected: boolean }[] }[];
    };
    const select = tampered.steps[0];
    const his = select.decisions?.find((decision) => decision.code === 'HIS');
    if (his === undefined) throw new Error('expected the dropped area in the trace');
    his.selected = true;
    expect(() => replayAggregate(tampered as unknown as AggregateTrace)).toThrow(TraceMismatchError);
  });
});

describe('ranking validation', () => {
  it('refuses a duplicate learner and an unparseable value', () => {
    const duplicate = rankLearners({ enabled: true, scope: 'class_group', by: 'mean' }, [
      { learner: 'L1', scope: 'A', value: '1' },
      { learner: 'L1', scope: 'A', value: '2' },
    ]);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('unreachable');
    expect(duplicate.issues.map((entry) => entry.code)).toEqual(['duplicate_learner']);

    const bad = rankLearners({ enabled: true, scope: 'class_group', by: 'mean' }, [
      { learner: 'L1', scope: 'A', value: 'ten' },
    ]);
    expect(bad.ok).toBe(false);
    if (bad.ok) throw new Error('unreachable');
    expect(bad.issues.map((entry) => entry.code)).toEqual(['invalid_learner_value']);
  });

  it('refuses an unknown tie method', () => {
    const ranking = rankLearners({ enabled: true, scope: 'class_group', by: 'mean', ties: 'random' as never }, []);
    expect(ranking.ok).toBe(false);
  });
});
