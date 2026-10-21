// ABOUTME: The acceptance vectors of P2-B03, executed through the real operators: the KCSE best-7 the
// ABOUTME: shipped ke-844 pack itself expects, the PLE division and Francophone moyenne of spec 03
// ABOUTME: section 6, and the tie-break, count, profile, GPA and ranking cases.

import { describe, expect, it } from 'vitest';

import { evaluateAggregation, rankLearners, replayAggregate } from '..';
import {
  KE_844,
  KE_844_VECTORS,
  KE_CBE,
  MENTIONS_FR,
  PLE_DIVISIONS,
  SPEC_AGGREGATIONS,
  SPEC_RANKING,
  aggregationOf,
  kcseAreas,
  pleAreas,
  resultOf,
} from './fixtures';
import type { AggregationDefinition, LearningAreaResult, RankingCandidate } from '..';

const KCSE = { scales: KE_844.grading_scales };

describe('KCSE best-7, from packs/ke-844', () => {
  /**
   * Hand arithmetic for the pack's first vector.
   *
   *   required   ENG B+ 10, KIS B 9, MAT A- 11                  = 30
   *   sciences   BIO B 9, CHE C+ 7, PHY B- 8   -> best two      = 17
   *   humanities HIS A 12, CRE B+ 10           -> best one      = 12
   *              six areas                                       = 59
   *   seventh    CRE B+ 10 beats CHE C+ 7 and BST C 6           = 69
   *   mean       69 / 7 = 9.857142857..., 9.857 to three places
   *   grade      B+ covers 9.01 to 10 on kcse_mean_grade
   */
  it('selects seven areas and grades the mean points', () => {
    const vector = KE_844_VECTORS.vectors[0];
    const expected = vector.expect.kcse_mean_grade;
    const result = resultOf(aggregationOf('kcse_mean_grade'), kcseAreas(vector.input), KCSE);

    expect(result.status).toBe('complete');
    expect(result.selected).toEqual(vector.expect.selected);
    expect(Number(result.subtotal)).toBe(expected?.total_points);
    expect(Number(result.value)).toBe(expected?.points);
    expect(result.grade?.label).toBe(expected?.grade);
    expect(result.grade?.scale).toBe('kcse_mean_grade');
    expect(replayAggregate(result.trace).value).toBe(result.value);
  });

  /**
   *   required   ENG 10, KIS 10, MAT 10                         = 30
   *   sciences   BIO 9, PHY 9                  -> both          = 18
   *   humanities HIS 9, CRE 7                  -> HIS           = 9
   *              six areas                                       = 57
   *   seventh    CRE 7 beats BST 6                               = 64
   *   mean       64 / 7 = 9.142857142..., 9.143; B+ starts at 9.01, so the boundary holds
   */
  it('holds the lower B+ boundary at 64 aggregate points', () => {
    const vector = KE_844_VECTORS.vectors[1];
    const expected = vector.expect.kcse_mean_grade;
    const result = resultOf(aggregationOf('kcse_mean_grade'), kcseAreas(vector.input), KCSE);

    expect(result.selected).toEqual(vector.expect.selected);
    expect(Number(result.subtotal)).toBe(expected?.total_points);
    expect(Number(result.value)).toBe(expected?.points);
    expect(result.grade?.label).toBe(expected?.grade);
  });

  it('traces why each area was chosen or dropped', () => {
    const result = resultOf(aggregationOf('kcse_mean_grade'), kcseAreas(KE_844_VECTORS.vectors[0].input), KCSE);
    const select = result.trace.steps[0];
    if (select.kind !== 'select') throw new Error('the first step must be the selection');

    const reasons = new Map(select.decisions.map((decision) => [decision.code, decision]));
    expect(reasons.get('ENG')?.reason).toBe('required');
    expect(reasons.get('BIO')?.reason).toBe('group_minimum');
    expect(reasons.get('HIS')?.reason).toBe('group_minimum');
    expect(reasons.get('CRE')?.reason).toBe('fill');
    expect(reasons.get('CHE')?.selected).toBe(false);
    expect(reasons.get('CHE')?.reason).toBe('lower_value');
    // the last place went to PHY on 8, so a C+ on 7 is one point short of it
    expect(reasons.get('CHE')?.lost_to).toBe('PHY');
    expect(reasons.get('BST')?.reason).toBe('lower_value');
    expect(reasons.get('BST')?.lost_to).toBe('PHY');
    expect(select.tie_break).toBe('value_desc_code_asc');
  });

  it('keeps the same seven when the inputs arrive in another order', () => {
    const input = KE_844_VECTORS.vectors[0].input;
    const reversed = Object.fromEntries(Object.entries(input).reverse());
    const forward = resultOf(aggregationOf('kcse_mean_grade'), kcseAreas(input), KCSE);
    const backward = resultOf(aggregationOf('kcse_mean_grade'), kcseAreas(reversed), KCSE);

    expect(backward.selected).toEqual(forward.selected);
    expect(backward.value).toBe(forward.value);
  });
});

describe('KCSE best-7 tie-break', () => {
  const definition: AggregationDefinition = {
    code: 'best_of_two',
    op: 'best_n',
    n: 2,
    value: 'points',
    groups: [{ require_all: ['ENG'] }, { fill_from: 'any' }],
    then: { op: 'mean', precision: 3 },
  };

  /** ENG is compulsory at 12; ART and MUS both hold 10, so the code order decides the second place. */
  const areas: readonly LearningAreaResult[] = [
    { code: 'ENG', group: 'languages', points: '12' },
    { code: 'MUS', group: 'applied', points: '10' },
    { code: 'ART', group: 'applied', points: '10' },
    { code: 'BIO', group: 'sciences', points: '9' },
  ];

  it('breaks a tie by area code and says which area kept the loser out', () => {
    const result = resultOf(definition, areas);
    const select = result.trace.steps[0];
    if (select.kind !== 'select') throw new Error('the first step must be the selection');

    expect(result.selected).toEqual(['ENG', 'ART']);
    expect(result.value).toBe('11');
    const mus = select.decisions.find((decision) => decision.code === 'MUS');
    expect(mus?.selected).toBe(false);
    expect(mus?.reason).toBe('lower_value');
    expect(mus?.lost_to).toBe('ART');
  });

  it('selects the same two whatever order the ties arrive in', () => {
    const reversed = [...areas].reverse();
    expect(resultOf(definition, reversed).selected).toEqual(['ENG', 'ART']);
  });
});

describe('PLE division, from spec 03 section 6', () => {
  const definition = aggregationOf('ple_division', SPEC_AGGREGATIONS);
  const context = { scales: [PLE_DIVISIONS] };

  it('adds four grade points into Division I', () => {
    // D2 2 + C3 3 + D1 1 + C4 4 = 10, and Division I covers 4 to 12
    const result = resultOf(definition, pleAreas({ ENG: 'D2', MTC: 'C3', SCI: 'D1', SST: 'C4' }), context);

    expect(result.status).toBe('complete');
    expect(result.subtotal).toBe('10');
    expect(result.grade?.band).toBe('I');
    expect(result.grade?.awarded).toBe('I');
    expect(result.grade?.capped_by).toBeNull();
    expect(result.flags).toEqual([]);
  });

  it('caps the division at IV when English carries an F9', () => {
    // F9 9 + C3 3 + D1 1 + C4 4 = 17, which is Division II, but the declared fail_if caps it at IV
    const result = resultOf(definition, pleAreas({ ENG: 'F9', MTC: 'C3', SCI: 'D1', SST: 'C4' }), context);

    expect(result.subtotal).toBe('17');
    expect(result.grade?.awarded).toBe('II');
    expect(result.grade?.band).toBe('IV');
    expect(result.grade?.capped_by?.any_grade).toBe('F9');
    expect(result.flags.map((flag) => flag.code)).toContain('fail_if_fired');

    const cap = result.trace.steps.find((step) => step.kind === 'fail_if');
    if (cap?.kind !== 'fail_if') throw new Error('the trace must record the cap');
    expect(cap.fired).toBe(true);
    expect(cap.trigger).toEqual(['ENG']);
    expect(cap.order).toEqual(['I', 'II', 'III', 'IV', 'U']);
    expect(cap.capped).toBe('IV');
    expect(replayAggregate(result.trace).value).toBe('17');
  });

  it('does not cap when the F9 is outside the rule', () => {
    // the rule names ENG and MTC only, so an F9 in Science leaves Division II standing
    const result = resultOf(definition, pleAreas({ ENG: 'D2', MTC: 'C3', SCI: 'F9', SST: 'C4' }), context);

    expect(result.subtotal).toBe('18');
    expect(result.grade?.band).toBe('II');
    expect(result.grade?.capped_by).toBeNull();
    const cap = result.trace.steps.find((step) => step.kind === 'fail_if');
    if (cap?.kind !== 'fail_if') throw new Error('the trace must record the rule');
    expect(cap.fired).toBe(false);
  });
});

describe('Francophone moyenne, from spec 03 section 6', () => {
  const definition = aggregationOf('moyenne_trimestrielle', SPEC_AGGREGATIONS);
  const context = { scales: [MENTIONS_FR] };

  /**
   * Coefficients FR 4, MATH 3, ANG 2, SVT 2, HG 1; scores out of 20.
   *   14*4 + 10*3 + 12*2 + 15*2 + 9*1 = 56 + 30 + 24 + 30 + 9 = 149
   *   149 / 12 = 12.4166666..., which is 12.42 at two places and Assez Bien (12 to 13.99)
   */
  const areas: readonly LearningAreaResult[] = [
    { code: 'FR', coefficient: '4', score: '14' },
    { code: 'MATH', coefficient: '3', score: '10' },
    { code: 'ANG', coefficient: '2', score: '12' },
    { code: 'SVT', coefficient: '2', score: '15' },
    { code: 'HG', coefficient: '1', score: '9' },
  ];

  it('weights the scores by coefficient and looks up the mention', () => {
    const result = resultOf(definition, areas, context);

    expect(result.status).toBe('complete');
    expect(result.value).toBe('12.42');
    expect(result.exact_value).toBe('149/12');
    expect(result.rounding).toEqual({ precision: 2, mode: 'half_up', input: '149/12', output: '12.42' });
    expect(result.grade?.band).toBe('ASSEZ_BIEN');
    expect(result.grade?.label).toBe('Assez Bien');
    expect(replayAggregate(result.trace).value).toBe('12.42');
  });

  it('reports a missing coefficient as an incomplete average, never as a silent reweight', () => {
    const without = areas.map((area) => (area.code === 'HG' ? { code: 'HG', score: '9' } : area));
    const result = resultOf(definition, without, context);

    expect(result.status).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.flags.map((flag) => flag.code)).toContain('missing_weight');
  });
});

describe('count_where', () => {
  it('counts the areas at or above a rubric level', () => {
    const definition: AggregationDefinition = {
      code: 'me_or_above',
      op: 'count_where',
      value: 'rubric_level',
      where: { op: 'gte', value: '3' },
    };
    const areas: readonly LearningAreaResult[] = [
      { code: 'ENG', rubric_level: '4' },
      { code: 'MAT', rubric_level: '3' },
      { code: 'SCI', rubric_level: '2' },
      { code: 'SST', rubric_level: '3' },
    ];

    const result = resultOf(definition, areas);
    expect(result.value).toBe('3');
    expect(result.consumed.map((entry) => entry.code)).toEqual(['ENG', 'MAT', 'SST']);
    expect(replayAggregate(result.trace).value).toBe('3');
  });

  it('counts grade codes with a declarable in-predicate', () => {
    const definition: AggregationDefinition = {
      code: 'me_or_ee',
      op: 'count_where',
      value: 'grade',
      where: { op: 'in', values: ['ME', 'EE'] },
    };
    const areas: readonly LearningAreaResult[] = [
      { code: 'ENG', grade: 'EE' },
      { code: 'MAT', grade: 'ME' },
      { code: 'SCI', grade: 'AE' },
      { code: 'SST', grade: 'BE' },
    ];

    expect(resultOf(definition, areas).value).toBe('2');
  });
});

describe('rubric_profile', () => {
  const definition: AggregationDefinition = {
    code: 'term_profile',
    op: 'rubric_profile',
    result_scale: 'cbe_4_level',
  };
  const cbe = { scales: KE_CBE.grading_scales };

  it('counts every level the scale names, including the absent ones', () => {
    const areas: readonly LearningAreaResult[] = [
      { code: 'ENG', rubric_level: '4' },
      { code: 'MAT', rubric_level: '3' },
      { code: 'SCI', rubric_level: '3' },
      { code: 'SST', rubric_level: '2' },
    ];
    const result = resultOf(definition, areas, cbe);

    expect(result.status).toBe('complete');
    expect(result.value).toBeNull();
    expect(result.distribution).toEqual([
      { level: 'EE', label: 'Exceeding Expectations', count: 1 },
      { level: 'ME', label: 'Meeting Expectations', count: 2 },
      { level: 'AE', label: 'Approaching Expectations', count: 1 },
      { level: 'BE', label: 'Below Expectations', count: 0 },
    ]);
    expect(replayAggregate(result.trace).distribution).toHaveLength(4);
  });
});

describe('gpa', () => {
  it('weights grade points by credit', () => {
    // 4.0*3 + 3.0*4 + 3.7*3 + 2.0*2 = 39.1 over 12 credits = 3.25833..., which is 3.26
    const definition: AggregationDefinition = { code: 'gpa', op: 'gpa', value: 'grade_points', precision: 2 };
    const areas: readonly LearningAreaResult[] = [
      { code: 'ALG', grade_points: '4.0', credit: '3' },
      { code: 'CAL', grade_points: '3.0', credit: '4' },
      { code: 'PHY', grade_points: '3.7', credit: '3' },
      { code: 'ENG', grade_points: '2.0', credit: '2' },
    ];
    const result = resultOf(definition, areas);

    expect(result.value).toBe('3.26');
    expect(result.exact_value).toBe('391/120');
    expect(result.consumed.find((entry) => entry.code === 'CAL')?.weight).toBe('4');
  });
});

describe('ranking policy, from spec 03 section 6.1', () => {
  const candidates: readonly RankingCandidate[] = [
    { learner: 'L-04', scope: 'F4A', value: '70' },
    { learner: 'L-01', scope: 'F4A', value: '80' },
    { learner: 'L-03', scope: 'F4A', value: '75' },
    { learner: 'L-02', scope: 'F4A', value: '75' },
    { learner: 'L-05', scope: 'F4A', value: '60' },
  ];

  it('is off unless the policy enables it, and then computes nothing', () => {
    const ranking = rankLearners(SPEC_RANKING, candidates);
    if (!ranking.ok) throw new Error('the spec policy should be accepted');
    expect(ranking.result.enabled).toBe(false);
    expect(ranking.result.entries).toEqual([]);
  });

  it('ranks 1-2-2-4 under competition', () => {
    const ranking = rankLearners({ ...SPEC_RANKING, enabled: true }, candidates);
    if (!ranking.ok) throw new Error('the policy should be accepted');
    expect(ranking.result.entries.map((entry) => `${entry.learner}:${entry.position}`)).toEqual([
      'L-01:1',
      'L-02:2',
      'L-03:2',
      'L-04:4',
      'L-05:5',
    ]);
    expect(ranking.result.entries.every((entry) => entry.out_of === 5)).toBe(true);
    expect(ranking.result.show_out_of).toBe(true);
    expect(ranking.result.show_on_report).toBe(false);
    expect(ranking.result.by).toBe('kcse_mean_grade.points');
  });

  it('ranks 1-2-2-3 under dense', () => {
    const ranking = rankLearners({ ...SPEC_RANKING, enabled: true, ties: 'dense_1223' }, candidates);
    if (!ranking.ok) throw new Error('the policy should be accepted');
    expect(ranking.result.entries.map((entry) => entry.position)).toEqual(['1', '2', '2', '3', '4']);
  });

  it('shares the average place under shared_average', () => {
    const ranking = rankLearners({ ...SPEC_RANKING, enabled: true, ties: 'shared_average' }, candidates);
    if (!ranking.ok) throw new Error('the policy should be accepted');
    expect(ranking.result.entries.map((entry) => entry.position)).toEqual(['1', '2.5', '2.5', '4', '5']);
  });

  it('averages a three-way tie across the places it spans', () => {
    const tied: readonly RankingCandidate[] = [
      { learner: 'L-01', scope: 'F4A', value: '90' },
      { learner: 'L-02', scope: 'F4A', value: '90' },
      { learner: 'L-03', scope: 'F4A', value: '90' },
      { learner: 'L-04', scope: 'F4A', value: '80' },
    ];
    const ranking = rankLearners({ ...SPEC_RANKING, enabled: true, ties: 'shared_average' }, tied);
    if (!ranking.ok) throw new Error('the policy should be accepted');
    expect(ranking.result.entries.map((entry) => entry.position)).toEqual(['2', '2', '2', '4']);
  });

  it('lists an incomplete learner without ranking it or counting it out of the total', () => {
    const withIncomplete: readonly RankingCandidate[] = [
      ...candidates,
      { learner: 'L-06', scope: 'F4A', value: '65', complete: false },
      { learner: 'L-07', scope: 'F4A', complete: false },
    ];
    const ranking = rankLearners({ ...SPEC_RANKING, enabled: true }, withIncomplete);
    if (!ranking.ok) throw new Error('the policy should be accepted');

    const incomplete = ranking.result.entries.filter((entry) => entry.learner === 'L-06');
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].ranked).toBe(false);
    expect(incomplete[0].reason).toBe('incomplete');
    expect(incomplete[0].position).toBeNull();
    expect(incomplete[0].out_of).toBe(5);
    expect(incomplete[0].value).toBe('65');

    const noValue = ranking.result.entries.find((entry) => entry.learner === 'L-07');
    expect(noValue?.reason).toBe('no_value');
    expect(ranking.result.entries.filter((entry) => entry.ranked)).toHaveLength(5);
  });

  it('ranks an incomplete learner when only_complete is off', () => {
    const ranking = rankLearners({ ...SPEC_RANKING, enabled: true, only_complete: false }, [
      ...candidates,
      { learner: 'L-06', scope: 'F4A', value: '65', complete: false },
    ]);
    if (!ranking.ok) throw new Error('the policy should be accepted');
    const entry = ranking.result.entries.find((candidate) => candidate.learner === 'L-06');
    expect(entry?.ranked).toBe(true);
    expect(entry?.position).toBe('5');
    expect(entry?.out_of).toBe(6);
  });

  it('ranks each scope separately', () => {
    const twoScopes: readonly RankingCandidate[] = [
      ...candidates,
      { learner: 'L-11', scope: 'F4B', value: '50' },
      { learner: 'L-12', scope: 'F4B', value: '60' },
    ];
    const ranking = rankLearners({ ...SPEC_RANKING, enabled: true }, twoScopes);
    if (!ranking.ok) throw new Error('the policy should be accepted');
    const second = ranking.result.entries.filter((entry) => entry.scope === 'F4B');
    expect(second.map((entry) => `${entry.learner}:${entry.position}`)).toEqual(['L-12:1', 'L-11:2']);
    expect(second.every((entry) => entry.out_of === 2)).toBe(true);
  });

  it('needs a scope and a metric once it is enabled', () => {
    const ranking = rankLearners({ enabled: true }, candidates);
    expect(ranking.ok).toBe(false);
    if (ranking.ok) throw new Error('unreachable');
    expect(ranking.issues.map((entry) => entry.path)).toEqual(['scope', 'by']);
  });
});

describe('the spec examples are complete definitions', () => {
  it('accepts every aggregation the spec prints, with its scales in scope', () => {
    const scales = [KE_844.grading_scales[1], PLE_DIVISIONS, MENTIONS_FR];
    for (const definition of SPEC_AGGREGATIONS) {
      const evaluation = evaluateAggregation(definition, [], { scales });
      expect(evaluation.ok).toBe(true);
    }
  });
});
