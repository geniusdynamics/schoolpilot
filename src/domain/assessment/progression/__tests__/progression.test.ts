// ABOUTME: Unit tests for the progression evaluator: the four promotion rule forms, graduation, the
// ABOUTME: threshold boundary on each side of every condition, missing metrics and requirements,
// ABOUTME: the annual and supplied metric resolution, and the replay round-trip.

import { describe, expect, it } from 'vitest';

import { TraceMismatchError } from '@/domain/assessment/engine';

import {
  evaluateAnnual,
  evaluatePromotion,
  evaluateProgression,
  prepareProgression,
  replayProgression,
  resolveMetric,
} from '..';
import type {
  AnnualPeriodInput,
  AnnualResult,
  PreparedPromotionRule,
  ProgressionContext,
  ProgressionDefinition,
  ProgressionSuggestion,
} from '..';
import { STRUCTURE, TEST_SCALE, justBelow, learnerAt, suggestionFor, suggestionOf, type DeepMutable } from './fixtures';

// --------------------------------------------------------------- fixtures

const AUTO: ProgressionDefinition = { progression: [{ levels: ['L1'], rule: 'automatic' }] };

const THRESHOLD: ProgressionDefinition = {
  progression: [
    {
      levels: ['L3'],
      rule: 'threshold',
      conditions: [
        { metric: 'annual.average', gte: 40 },
        { metric: 'annual.ENG', gte: 40 },
        { metric: 'annual.MAT', gte: 40 },
      ],
      else: 'repeat_or_council',
    },
  ],
};

const COUNCIL: ProgressionDefinition = {
  progression: [{ levels: ['L1'], rule: 'class_council', suggest: { metric: 'annual.average', gte: 50 } }],
};

const STAGE: ProgressionDefinition = {
  progression: [
    {
      levels: ['L2'],
      rule: 'stage_transition',
      to_stage: 'STAGE_TWO',
      requires: ['national_assessment_recorded', 'pathway_placement'],
    },
  ],
};

const GRADUATION: ProgressionDefinition = {
  progression: [{ levels: ['L1'], rule: 'automatic' }],
  graduation: [{ levels: ['L4'], rule: 'graduate' }],
};

/** Three identical periods, so the annual average and every area equal the values given. */
function annualWith(average: string, ENG: string, MAT: string): AnnualResult {
  const periods: readonly AnnualPeriodInput[] = ['T1', 'T2', 'T3'].map((code) => ({
    code,
    value: average,
    areas: [
      { code: 'ENG', group: 'languages', coefficient: '2', score: ENG },
      { code: 'MAT', group: 'mathematics', coefficient: '3', score: MAT },
    ],
  }));
  const evaluation = evaluateAnnual({ op: 'mean', of: ['T1', 'T2', 'T3'] }, periods, {
    scales: [TEST_SCALE],
    grading_scale: 'test_percent',
  });
  if (!evaluation.ok) throw new Error(evaluation.issues.map((entry) => entry.code).join(', '));
  return evaluation.result;
}

/** The same year with T2 missing, so annual.average and the areas are incomplete. */
function incompleteAnnual(): AnnualResult {
  const periods: readonly AnnualPeriodInput[] = [
    { code: 'T1', value: '60', areas: [{ code: 'ENG', score: '60' }, { code: 'MAT', score: '60' }] },
    { code: 'T3', value: '60', areas: [{ code: 'ENG', score: '60' }, { code: 'MAT', score: '60' }] },
  ];
  const evaluation = evaluateAnnual(
    { op: 'mean', of: ['T1', 'T2', 'T3'], missing: 'incomplete' },
    periods,
    { scales: [TEST_SCALE], grading_scale: 'test_percent' }
  );
  if (!evaluation.ok) throw new Error(evaluation.issues.map((entry) => entry.code).join(', '));
  return evaluation.result;
}

const READY = annualWith('60', '60', '60');

function contextWith(annual: AnnualResult, extra: Partial<ProgressionContext> = {}): ProgressionContext {
  return { ...STRUCTURE, annual, ...extra };
}

// ---------------------------------------------------------------- automatic

describe('automatic', () => {
  it('promotes to the next level the structure declares', () => {
    const suggestion = suggestionOf(AUTO, learnerAt('L1'), contextWith(READY));
    expect(suggestion.action).toBe('promote');
    expect(suggestion.to_level).toBe('L2');
    expect(suggestion.to_stage).toBeNull();
    expect(suggestion.flags).toEqual([]);
    expect(suggestion.complete).toBe(true);
    expect(suggestion.reasons.map((entry) => entry.code)).toContain('rule_automatic');
  });

  it('carries an incomplete learner record as a flag without blocking an automatic promotion', () => {
    const suggestion = suggestionOf(AUTO, learnerAt('L1', { complete: false }), contextWith(READY));
    expect(suggestion.action).toBe('promote');
    expect(suggestion.flags).toEqual([{ code: 'data_incomplete', metric: null, requirement: null }]);
    expect(suggestion.complete).toBe(false);
  });

  it('refers a level with no rule to the council instead of dropping it', () => {
    const suggestion = suggestionOf(AUTO, learnerAt('L4'), contextWith(READY));
    expect(suggestion.action).toBe('council');
    expect(suggestion.to_level).toBeNull();
    expect(suggestion.flags).toEqual([{ code: 'no_rule', metric: null, requirement: null }]);
    expect(suggestion.complete).toBe(false);
    expect(suggestion.rule).toBeNull();
  });

  it('returns one suggestion through the single-learner entry point', () => {
    const evaluation = evaluatePromotion(AUTO, learnerAt('L1'), contextWith(READY));
    expect(evaluation.ok).toBe(true);
    if (evaluation.ok) expect(evaluation.suggestions[0].action).toBe('promote');
  });

  it('refuses a promotion rule with no next level', () => {
    const preparation = prepareProgression(AUTO, { levels: [{ code: 'L1', next: null }] });
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) expect(preparation.issues.map((entry) => entry.code)).toContain('missing_next_level');
  });

  it('refuses a rule for a level the structure does not declare', () => {
    const preparation = prepareProgression(
      { progression: [{ levels: ['L9'], rule: 'automatic' }] },
      STRUCTURE
    );
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) expect(preparation.issues.map((entry) => entry.code)).toContain('unknown_level');
  });
});

// ---------------------------------------------------------------- threshold

describe('threshold', () => {
  const EXACT = annualWith('40', '40', '40');

  it('promotes when every condition is met', () => {
    const suggestion = suggestionOf(THRESHOLD, learnerAt('L3'), contextWith(EXACT));
    expect(suggestion.action).toBe('promote');
    expect(suggestion.to_level).toBe('L4');
    expect(suggestion.flags).toEqual([]);
    expect(suggestion.complete).toBe(true);
    expect(suggestion.reasons.map((entry) => entry.code)).toContain('threshold_met');
    expect(suggestion.metrics.map((entry) => entry.metric)).toEqual(['annual.average', 'annual.ENG', 'annual.MAT']);
  });

  it('treats the boundary as inclusive on each condition', () => {
    const met = suggestionOf(THRESHOLD, learnerAt('L3'), contextWith(EXACT));
    expect(met.action).toBe('promote');
  });

  it('fails each condition on the value one step below its bound', () => {
    const values = { average: '40', ENG: '40', MAT: '40' } as const;
    for (const key of ['average', 'ENG', 'MAT'] as const) {
      const below = justBelow('40');
      const annual = annualWith(
        key === 'average' ? below : values.average,
        key === 'ENG' ? below : values.ENG,
        key === 'MAT' ? below : values.MAT
      );
      const suggestion = suggestionOf(THRESHOLD, learnerAt('L3'), contextWith(annual));
      expect(suggestion.action, key).toBe('council');
      expect(suggestion.to_level, key).toBe('L4');
      expect(suggestion.reasons.map((entry) => entry.code), key).toContain('threshold_failed');
      expect(suggestion.reasons.map((entry) => entry.code), key).toContain('else_council');
    }
  });

  it('repeats rather than referring when the pack says repeat', () => {
    const repeat: ProgressionDefinition = {
      progression: [
        {
          levels: ['L3'],
          rule: 'threshold',
          conditions: [{ metric: 'annual.average', gte: 40 }],
          else: 'repeat',
        },
      ],
    };
    const suggestion = suggestionOf(repeat, learnerAt('L3'), contextWith(annualWith('30', '60', '60')));
    expect(suggestion.action).toBe('repeat');
    expect(suggestion.to_level).toBeNull();
    expect(suggestion.reasons.map((entry) => entry.code)).toContain('else_repeat');
  });

  it('decides on a definite failure even when a sibling metric is unknown', () => {
    const mixed: ProgressionDefinition = {
      progression: [
        {
          levels: ['L3'],
          rule: 'threshold',
          conditions: [
            { metric: 'annual.average', gte: 40 },
            { metric: 'annual.MISSING', gte: 40 },
          ],
          else: 'repeat',
        },
      ],
    };
    const suggestion = suggestionOf(mixed, learnerAt('L3'), contextWith(annualWith('30', '60', '60')));
    expect(suggestion.action).toBe('repeat');
    expect(suggestion.flags.map((flag) => flag.code)).toEqual(['metric_unknown']);
    expect(suggestion.complete).toBe(false);
  });

  it('refers to the council when a condition cannot be resolved', () => {
    const suggestion = suggestionOf(THRESHOLD, learnerAt('L3'), contextWith(incompleteAnnual()));
    expect(suggestion.action).toBe('council');
    expect(suggestion.flags.some((flag) => flag.code === 'metric_unknown')).toBe(true);
    expect(suggestion.flags.some((flag) => flag.code === 'data_incomplete')).toBe(true);
    expect(suggestion.complete).toBe(false);
  });

  it('compares an exact decimal bound from the evaluator form', () => {
    const exact: ProgressionDefinition = {
      progression: [
        {
          levels: ['L3'],
          rule: 'threshold',
          conditions: [{ metric: 'annual.average', gte: '40.5' }],
          else: 'repeat_or_council',
        },
      ],
    };
    expect(suggestionOf(exact, learnerAt('L3'), contextWith(annualWith('40.5', '60', '60'))).action).toBe('promote');
    expect(suggestionOf(exact, learnerAt('L3'), contextWith(annualWith('40.4', '60', '60'))).action).toBe('council');
  });

  it('does not let a supplied metric override a resolved annual average', () => {
    const context = contextWith(annualWith('60', '60', '60'), {
      metrics: { 'annual.average': { value: '0', complete: true } },
    });
    const suggestion = suggestionOf(THRESHOLD, learnerAt('L3'), context);
    expect(suggestion.action).toBe('promote');
    expect(suggestion.metrics.find((entry) => entry.metric === 'annual.average')?.source).toBe('annual_average');
  });

  it('uses a supplied metric only to fill a gap', () => {
    const gap: ProgressionDefinition = {
      progression: [
        {
          levels: ['L3'],
          rule: 'threshold',
          conditions: [{ metric: 'annual.MISSING', gte: 40 }],
          else: 'repeat',
        },
      ],
    };
    const suggestion = suggestionOf(
      gap,
      learnerAt('L3'),
      contextWith(READY, { metrics: { 'annual.MISSING': { value: '40', complete: true } } })
    );
    expect(suggestion.action).toBe('promote');
    expect(suggestion.metrics[0].source).toBe('supplied');
  });
});

// ------------------------------------------------------------- class council

describe('class_council', () => {
  it('always refers to the council and suggests the metric outcome', () => {
    const suggestion = suggestionOf(COUNCIL, learnerAt('L1'), contextWith(READY));
    expect(suggestion.action).toBe('council');
    expect(suggestion.to_level).toBe('L2');
    expect(suggestion.council).not.toBeNull();
    expect(suggestion.council?.suggested).toBe('promote');
    expect(suggestion.council?.gte).toBe('50');
    expect(suggestion.trace.council_suggested).toBe('promote');
  });

  it('suggests repeat when the metric is below the bound, still without deciding', () => {
    const suggestion = suggestionOf(COUNCIL, learnerAt('L1'), contextWith(annualWith('40', '60', '60')));
    expect(suggestion.action).toBe('council');
    expect(suggestion.council?.suggested).toBe('repeat');
  });

  it('gives the council no suggestion when the metric is unknown', () => {
    const suggestion = suggestionOf(COUNCIL, learnerAt('L1'), contextWith(incompleteAnnual()));
    expect(suggestion.action).toBe('council');
    expect(suggestion.council?.suggested).toBeNull();
    expect(suggestion.flags.map((flag) => flag.code)).toContain('metric_unknown');
    expect(suggestion.complete).toBe(false);
  });
});

// ---------------------------------------------------------- stage transition

describe('stage_transition', () => {
  it('promotes into the first level of the target stage when every record exists', () => {
    const suggestion = suggestionOf(
      STAGE,
      learnerAt('L2', {
        requirements: { national_assessment_recorded: true, pathway_placement: 'STEM' },
      }),
      contextWith(READY)
    );
    expect(suggestion.action).toBe('promote');
    expect(suggestion.to_stage).toBe('STAGE_TWO');
    expect(suggestion.to_level).toBe('L3');
    expect(suggestion.flags).toEqual([]);
    expect(suggestion.complete).toBe(true);
    expect(suggestion.trace.requirements).toEqual({
      national_assessment_recorded: true,
      pathway_placement: true,
    });
  });

  it('blocks the transition and names every missing record', () => {
    const suggestion = suggestionOf(
      STAGE,
      learnerAt('L2', { requirements: { national_assessment_recorded: false, pathway_placement: '' } }),
      contextWith(READY)
    );
    expect(suggestion.action).toBe('blocked');
    expect(suggestion.to_stage).toBe('STAGE_TWO');
    expect(suggestion.to_level).toBe('L3');
    expect(suggestion.flags).toEqual([
      { code: 'requirement_unmet', metric: null, requirement: 'national_assessment_recorded' },
      { code: 'requirement_unmet', metric: null, requirement: 'pathway_placement' },
    ]);
    expect(suggestion.complete).toBe(true);
    expect(suggestion.reasons.filter((entry) => entry.code === 'requirement_unmet')).toHaveLength(2);
  });

  it('names the one missing record when the other exists', () => {
    const suggestion = suggestionOf(
      STAGE,
      learnerAt('L2', { requirements: { national_assessment_recorded: true } }),
      contextWith(READY)
    );
    expect(suggestion.action).toBe('blocked');
    expect(suggestion.flags).toEqual([
      { code: 'requirement_unmet', metric: null, requirement: 'pathway_placement' },
    ]);
  });

  it('transitions without requirements when the pack declares none', () => {
    const plain: ProgressionDefinition = {
      progression: [{ levels: ['L2'], rule: 'stage_transition', to_stage: 'STAGE_TWO' }],
    };
    const suggestion = suggestionOf(plain, learnerAt('L2'), contextWith(READY));
    expect(suggestion.action).toBe('promote');
    expect(suggestion.to_level).toBe('L3');
    expect(suggestion.flags).toEqual([]);
  });

  it('accepts a requirement name the schema does not enumerate and never assumes it is met', () => {
    const extra: ProgressionDefinition = {
      progression: [
        {
          levels: ['L2'],
          rule: 'stage_transition',
          to_stage: 'STAGE_TWO',
          requires: ['work_experience_recorded'],
        },
      ],
    };
    expect(suggestionOf(extra, learnerAt('L2'), contextWith(READY)).action).toBe('blocked');
    expect(
      suggestionOf(
        extra,
        learnerAt('L2', { requirements: { work_experience_recorded: true } }),
        contextWith(READY)
      ).action
    ).toBe('promote');
  });

  it('refuses an unknown target stage', () => {
    const preparation = prepareProgression(
      { progression: [{ levels: ['L2'], rule: 'stage_transition', to_stage: 'STAGE_NINE' }] },
      STRUCTURE
    );
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) expect(preparation.issues.map((entry) => entry.code)).toContain('unknown_stage');
  });
});

// ---------------------------------------------------------------- graduate

describe('graduation', () => {
  it('graduates a terminal level', () => {
    const suggestion = suggestionOf(GRADUATION, learnerAt('L4'), contextWith(READY));
    expect(suggestion.action).toBe('graduate');
    expect(suggestion.to_level).toBeNull();
    expect(suggestion.to_stage).toBeNull();
    expect(suggestion.flags).toEqual([]);
    expect(suggestion.complete).toBe(true);
    expect(suggestion.reasons.map((entry) => entry.code)).toContain('rule_graduate');
  });

  it('flags an incomplete graduate record', () => {
    const suggestion = suggestionOf(GRADUATION, learnerAt('L4', { complete: false }), contextWith(READY));
    expect(suggestion.action).toBe('graduate');
    expect(suggestion.complete).toBe(false);
    expect(suggestion.flags).toEqual([{ code: 'data_incomplete', metric: null, requirement: null }]);
  });
});

// ---------------------------------------------------------- metric resolution

describe('metric resolution', () => {
  it('resolves the annual average and area values', () => {
    const context = contextWith(READY);
    expect(resolveMetric('annual.average', context)).toMatchObject({
      status: 'resolved',
      value: '60',
      source: 'annual_average',
    });
    expect(resolveMetric('annual.ENG', context)).toMatchObject({
      status: 'resolved',
      value: '60',
      source: 'annual_area',
    });
  });

  it('reports an unknown area without inventing a zero', () => {
    const metric = resolveMetric('annual.NOPE', contextWith(READY));
    expect(metric.status).toBe('unknown');
    expect(metric.value).toBeNull();
    expect(metric.reason).toBe('unknown_metric');
  });

  it('reports an incomplete annual result', () => {
    const metric = resolveMetric('annual.average', contextWith(incompleteAnnual()));
    expect(metric.status).toBe('unknown');
    expect(metric.reason).toBe('annual_incomplete');
  });

  it('reports no annual result when none is in scope', () => {
    const metric = resolveMetric('annual.average', { ...STRUCTURE });
    expect(metric.status).toBe('unknown');
    expect(metric.reason).toBe('no_annual_result');
  });

  it('runs a named aggregation over the annual area results', () => {
    const periods: readonly AnnualPeriodInput[] = ['T1', 'T2', 'T3'].map((code) => ({
      code,
      value: '60',
      areas: [
        { code: 'ENG', coefficient: '2', score: '60' },
        { code: 'MAT', coefficient: '3', score: '70' },
      ],
    }));
    const evaluation = evaluateAnnual({ op: 'mean', of: ['T1', 'T2', 'T3'] }, periods);
    if (!evaluation.ok) throw new Error('annual failed');
    const metric = resolveMetric('annual.moyenne', {
      ...STRUCTURE,
      annual: evaluation.result,
      aggregations: [{ code: 'moyenne', op: 'weighted_mean', value: 'score', weights: 'coefficient' }],
    });
    expect(metric.status).toBe('resolved');
    expect(metric.value).toBe('66');
    expect(metric.source).toBe('annual_aggregation');
    expect(metric.aggregate).not.toBeNull();
  });

  it('reports a named aggregation the engine refuses, and records the issue code', () => {
    const metric = resolveMetric('annual.gcse_points_total', {
      ...STRUCTURE,
      annual: READY,
      aggregations: [{ code: 'gcse_points_total', op: 'sum_points', value: 'grade_points' }],
      scales: [TEST_SCALE],
    });
    expect(metric.status).toBe('unknown');
    expect(metric.reason).toBe('aggregation_rejected');
    expect(metric.issue).toBe('missing_result_scale');
  });

  it('lets a supplied metric fill a rejected aggregation', () => {
    const metric = resolveMetric('annual.gcse_points_total', {
      ...STRUCTURE,
      annual: READY,
      aggregations: [{ code: 'gcse_points_total', op: 'sum_points', value: 'grade_points' }],
      scales: [TEST_SCALE],
      metrics: { 'annual.gcse_points_total': { value: '55', complete: true } },
    });
    expect(metric.status).toBe('resolved');
    expect(metric.value).toBe('55');
    expect(metric.source).toBe('supplied');
  });

  it('reports an unsupported scope unless the caller supplies it', () => {
    expect(resolveMetric('period.T1.average', { ...STRUCTURE }).reason).toBe('unsupported_scope');
    expect(
      resolveMetric('period.T1.average', {
        ...STRUCTURE,
        metrics: { 'period.T1.average': { value: '60', complete: true } },
      }).value
    ).toBe('60');
  });
});

// -------------------------------------------------------------------- replay

describe('replay', () => {
  const cases: readonly { readonly name: string; readonly definition: ProgressionDefinition; readonly level: string; readonly annual: AnnualResult; readonly requirements?: Readonly<Record<string, boolean | string>> }[] = [
    { name: 'automatic', definition: AUTO, level: 'L1', annual: READY },
    { name: 'threshold met', definition: THRESHOLD, level: 'L3', annual: annualWith('40', '40', '40') },
    { name: 'threshold failed', definition: THRESHOLD, level: 'L3', annual: annualWith('39', '40', '40') },
    { name: 'council', definition: COUNCIL, level: 'L1', annual: READY },
    {
      name: 'stage met',
      definition: STAGE,
      level: 'L2',
      annual: READY,
      requirements: { national_assessment_recorded: true, pathway_placement: 'STEM' },
    },
    {
      name: 'stage blocked',
      definition: STAGE,
      level: 'L2',
      annual: READY,
      requirements: { national_assessment_recorded: true },
    },
    { name: 'graduate', definition: GRADUATION, level: 'L4', annual: READY },
    { name: 'no rule', definition: AUTO, level: 'L4', annual: READY },
  ];

  for (const scenario of cases) {
    it(`round-trips ${scenario.name}`, () => {
      const suggestion = suggestionOf(
        scenario.definition,
        learnerAt(scenario.level, { requirements: scenario.requirements }),
        contextWith(scenario.annual)
      );
      const trace = JSON.parse(JSON.stringify(suggestion.trace)) as ProgressionSuggestion['trace'];
      const replayed = replayProgression(trace);
      expect(replayed.action).toBe(suggestion.action);
      expect(replayed.to_level).toBe(suggestion.to_level);
      expect(replayed.to_stage).toBe(suggestion.to_stage);
      expect(replayed.council_suggested).toBe(suggestion.trace.council_suggested);
      expect(replayed.complete).toBe(suggestion.complete);
    });
  }

  it('refuses a suggestion whose action does not follow from its metrics', () => {
    const suggestion = suggestionOf(THRESHOLD, learnerAt('L3'), contextWith(annualWith('40', '40', '40')));
    const trace = JSON.parse(JSON.stringify(suggestion.trace)) as DeepMutable<ProgressionSuggestion['trace']>;
    trace.action = 'repeat';
    expect(() => replayProgression(trace)).toThrow(TraceMismatchError);
  });

  it('refuses a metric whose annual trace disagrees with its value', () => {
    const suggestion = suggestionOf(COUNCIL, learnerAt('L1'), contextWith(READY));
    const trace = JSON.parse(JSON.stringify(suggestion.trace)) as DeepMutable<ProgressionSuggestion['trace']>;
    const metric = trace.metrics[0];
    if (metric.annual === null) throw new Error('expected an annual metric');
    metric.annual.value = '99';
    expect(() => replayProgression(trace)).toThrow(TraceMismatchError);
  });

  it('refuses a rewritten requirement', () => {
    const suggestion = suggestionOf(
      STAGE,
      learnerAt('L2', { requirements: { national_assessment_recorded: true } }),
      contextWith(READY)
    );
    const trace = JSON.parse(JSON.stringify(suggestion.trace)) as DeepMutable<ProgressionSuggestion['trace']>;
    trace.requirements.extra_record = true;
    expect(() => replayProgression(trace)).toThrow(TraceMismatchError);
  });
});

// --------------------------------------------------------------- structure

describe('the rule document', () => {
  it('refuses duplicate levels across rules and graduation', () => {
    const preparation = prepareProgression(
      {
        progression: [
          { levels: ['L1'], rule: 'automatic' },
          { levels: ['L1'], rule: 'automatic' },
        ],
      },
      STRUCTURE
    );
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) expect(preparation.issues.map((entry) => entry.code)).toContain('duplicate_level');
  });

  it('refuses a threshold without conditions or a fallback', () => {
    const preparation = prepareProgression(
      { progression: [{ levels: ['L3'], rule: 'threshold' }] },
      STRUCTURE
    );
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) {
      expect(preparation.issues.map((entry) => entry.code)).toEqual(
        expect.arrayContaining(['missing_conditions', 'missing_else'])
      );
    }
  });

  it('refuses a council rule without a suggestion metric', () => {
    const preparation = prepareProgression(
      { progression: [{ levels: ['L1'], rule: 'class_council' }] },
      STRUCTURE
    );
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) expect(preparation.issues.map((entry) => entry.code)).toContain('missing_suggest');
  });

  it('refuses a promotion document without the pack structure', () => {
    const preparation = prepareProgression(AUTO);
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) expect(preparation.issues.map((entry) => entry.code)).toContain('missing_structure');
  });

  it('refuses a metric that is not a scoped path', () => {
    const preparation = prepareProgression(
      {
        progression: [
          {
            levels: ['L3'],
            rule: 'threshold',
            conditions: [{ metric: 'average', gte: 40 }],
            else: 'repeat',
          },
        ],
      },
      STRUCTURE
    );
    expect(preparation.ok).toBe(false);
    if (!preparation.ok) expect(preparation.issues.map((entry) => entry.code)).toContain('invalid_metric');
  });

  it('refuses a duplicate learner in one run', () => {
    const evaluation = evaluateProgression(AUTO, [learnerAt('L1'), learnerAt('L1')], contextWith(READY));
    expect(evaluation.ok).toBe(false);
    if (!evaluation.ok) expect(evaluation.issues.map((entry) => entry.code)).toContain('duplicate_learner');
  });

  it('is deterministic for the same inputs', () => {
    const first = suggestionFor(THRESHOLD, 'L3', contextWith(annualWith('40', '40', '40')));
    const second = suggestionFor(THRESHOLD, 'L3', contextWith(annualWith('40', '40', '40')));
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('prepares a rule with its exact bounds and rule kind', () => {
    const preparation = prepareProgression(THRESHOLD, STRUCTURE);
    expect(preparation.ok).toBe(true);
    if (preparation.ok) {
      const rule = preparation.rules[0] as PreparedPromotionRule;
      expect(rule.conditions.map((condition) => condition.gte)).toEqual(['40', '40', '40']);
      expect(rule.else).toBe('repeat_or_council');
    }
  });
});
