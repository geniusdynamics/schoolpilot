// ABOUTME: Unit tests for period-to-annual aggregation: every operator of spec 03 section 4.1, every
// ABOUTME: declared missing policy, the reweighting and ignored-period facts the trace must record,
// ABOUTME: the per-area series and band lookup, and the replay that audits the result.

import { describe, expect, it } from 'vitest';

import { TraceMismatchError } from '@/domain/assessment/engine';

import { evaluateAnnual, replayAnnual, replayAnnualResult } from '..';
import type {
  AnnualAreaResult,
  AnnualContext,
  AnnualDefinition,
  AnnualPeriodInput,
  AnnualResult,
  AnnualTraceStep,
} from '..';
import { TEST_SCALE, annualIssueCodes, annualOf, periods, type DeepMutable } from './fixtures';

const WEIGHTED: AnnualDefinition = {
  op: 'weighted_mean',
  of: { T1: 0.3, T2: 0.3, T3: 0.4 },
  missing: 'renormalise',
};

function stepOf<K extends AnnualTraceStep['kind']>(
  trace: AnnualResult['trace'],
  kind: K
): Extract<AnnualTraceStep, { kind: K }> {
  const found = trace.steps.find((step) => step.kind === kind);
  if (found === undefined) throw new Error(`the trace has no ${kind} step`);
  return found as Extract<AnnualTraceStep, { kind: K }>;
}

const FULL = { T1: '60', T2: '70', T3: '80' } as const;

describe('weighted_mean', () => {
  it('weights the periods exactly and keeps the declared weights in the trace', () => {
    const result = annualOf(WEIGHTED, FULL);
    expect(result.status).toBe('complete');
    expect(result.value).toBe('71');
    expect(result.exact_value).toBe('71');
    expect(result.flags).toEqual([]);
    expect(result.average.consumed).toEqual([
      { code: 'T1', value: '60', weight: '0.3', source: 'declared' },
      { code: 'T2', value: '70', weight: '0.3', source: 'declared' },
      { code: 'T3', value: '80', weight: '0.4', source: 'declared' },
    ]);
    expect(stepOf(result.trace, 'missing')).toMatchObject({
      policy: 'renormalise',
      entries: [],
      ignored: [],
      renormalised: false,
      declared_weights_total: '1',
      effective_weights_total: '1',
    });
  });

  it('renormalises the remaining periods when one is missing, and says so', () => {
    const result = annualOf(WEIGHTED, { T1: '60', T3: '80' });
    expect(result.status).toBe('complete');
    expect(result.value).toBe('500/7');
    expect(result.flags).toEqual([
      { code: 'missing_period', period: 'T2', area: null },
      { code: 'renormalised', period: null, area: null },
    ]);
    const missing = stepOf(result.trace, 'missing');
    expect(missing.entries).toEqual([
      { code: 'T2', reason: 'absent', treatment: 'excluded', value: null, carried_from: null, weight: '0.3' },
    ]);
    expect(missing.renormalised).toBe(true);
    expect(missing.declared_weights_total).toBe('1');
    expect(missing.effective_weights_total).toBe('1');
    expect(missing.weights).toEqual([
      { code: 'T1', declared: '0.3', effective: '3/7' },
      { code: 'T2', declared: '0.3', effective: null },
      { code: 'T3', declared: '0.4', effective: '4/7' },
    ]);
    expect(result.average.consumed).toEqual([
      { code: 'T1', value: '60', weight: '3/7', source: 'declared' },
      { code: 'T3', value: '80', weight: '4/7', source: 'declared' },
    ]);
  });

  it('publishes no value when every period is missing, rather than inventing one', () => {
    const result = annualOf(WEIGHTED, { T1: null, T2: null, T3: null });
    expect(result.status).toBe('empty');
    expect(result.value).toBeNull();
    expect(result.trace.steps).toHaveLength(1);
    expect(result.flags.map((flag) => flag.code)).toEqual(['missing_period', 'missing_period', 'missing_period']);
  });

  it('scores a missing period zero only when the pack declares zero', () => {
    const result = annualOf({ ...WEIGHTED, missing: 'zero' }, { T1: '60', T2: null, T3: '80' });
    expect(result.value).toBe('50');
    expect(result.flags).toEqual([
      { code: 'missing_period', period: 'T2', area: null },
      { code: 'zeroed_period', period: 'T2', area: null },
    ]);
    expect(result.average.consumed.find((entry) => entry.code === 'T2')).toEqual({
      code: 'T2',
      value: '0',
      weight: '0.3',
      source: 'zero',
    });
  });

  it('carries the previous period forward when declared', () => {
    const result = annualOf({ ...WEIGHTED, missing: 'carry_previous' }, { T1: '60', T2: null, T3: '80' });
    expect(result.value).toBe('68');
    expect(result.flags).toEqual([
      { code: 'missing_period', period: 'T2', area: null },
      { code: 'carried_period', period: 'T2', area: null },
    ]);
    expect(stepOf(result.trace, 'missing').entries[0]).toMatchObject({
      code: 'T2',
      treatment: 'carry',
      value: '60',
      carried_from: 'T1',
    });
  });

  it('refuses to carry forward from nothing', () => {
    const result = annualOf({ ...WEIGHTED, missing: 'carry_previous' }, { T1: null, T2: '70', T3: '80' });
    expect(result.status).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.flags).toEqual([
      { code: 'missing_period', period: 'T1', area: null },
      { code: 'no_previous_period', period: 'T1', area: null },
    ]);
  });

  it('publishes no value under the incomplete policy', () => {
    const result = annualOf({ ...WEIGHTED, missing: 'incomplete' }, { T1: '60', T2: null, T3: '80' });
    expect(result.status).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.trace.steps).toHaveLength(1);
    expect(result.flags).toEqual([{ code: 'missing_period', period: 'T2', area: null }]);
  });

  it('refuses weights that do not sum to one', () => {
    expect(
      annualIssueCodes({ op: 'weighted_mean', of: { T1: 0.3, T2: 0.3, T3: 0.3 } }, {})
    ).toEqual(['weights_not_unit']);
  });

  it('refuses a zero usable weight total after a renormalise', () => {
    expect(
      annualIssueCodes(
        { op: 'weighted_mean', of: { T1: 0, T2: 1 }, missing: 'renormalise' },
        { T1: '60', T2: null }
      )
    ).toEqual(['zero_total_weight']);
  });
});

describe('mean', () => {
  const MEAN: AnnualDefinition = { op: 'mean', of: ['T1', 'T2', 'T3'], missing: 'renormalise' };

  it('averages the periods exactly', () => {
    expect(annualOf(MEAN, FULL).value).toBe('70');
  });

  it('averages the periods that remain and records the renormalisation', () => {
    const result = annualOf(MEAN, { T1: '60', T2: null, T3: '80' });
    expect(result.value).toBe('70');
    expect(stepOf(result.trace, 'missing').renormalised).toBe(true);
    expect(result.flags.map((flag) => flag.code)).toEqual(['missing_period', 'renormalised']);
  });

  it('scores a missing period zero when declared', () => {
    expect(annualOf({ ...MEAN, missing: 'zero' }, { T1: '60', T2: null, T3: '80' }).value).toBe('140/3');
  });

  it('carries the previous mark forward when declared', () => {
    expect(annualOf({ ...MEAN, missing: 'carry_previous' }, { T1: '60', T2: null, T3: '80' }).value).toBe('200/3');
  });
});

describe('final_period_only', () => {
  const FINAL: AnnualDefinition = { op: 'final_period_only', of: ['T1', 'T2', 'T3'], missing: 'incomplete' };

  it('takes the final declared period and names the ones it ignored', () => {
    const result = annualOf(FINAL, FULL);
    expect(result.value).toBe('80');
    expect(stepOf(result.trace, 'value')).toEqual({
      kind: 'value',
      selected: 'T3',
      ignored: ['T1', 'T2'],
      parts: [{ code: 'T3', value: '80' }],
      value: '80',
    });
    expect(result.average.consumed).toEqual([{ code: 'T3', value: '80', weight: null, source: 'declared' }]);
  });

  it('publishes no value when the final period is missing and the policy is renormalise', () => {
    const result = annualOf({ ...FINAL, missing: 'renormalise' }, { T1: '60', T2: '70', T3: null });
    expect(result.status).toBe('empty');
    expect(result.value).toBeNull();
    expect(result.trace.steps.some((step) => step.kind === 'value')).toBe(false);
  });

  it('scores the final period zero when declared', () => {
    expect(annualOf({ ...FINAL, missing: 'zero' }, { T1: '60', T2: '70', T3: null }).value).toBe('0');
  });

  it('carries the nearest earlier period into the final period', () => {
    const result = annualOf({ ...FINAL, missing: 'carry_previous' }, { T1: '60', T2: '70', T3: null });
    expect(result.value).toBe('70');
    expect(stepOf(result.trace, 'value').selected).toBe('T3');
    expect(stepOf(result.trace, 'missing').entries[0]).toMatchObject({
      code: 'T3',
      treatment: 'carry',
      carried_from: 'T2',
    });
  });

  it('carries the nearest earlier period even when the immediate one is also missing', () => {
    const result = annualOf({ ...FINAL, missing: 'carry_previous' }, { T1: '60', T2: null, T3: null });
    expect(result.value).toBe('60');
    expect(stepOf(result.trace, 'missing').entries[0]).toMatchObject({
      code: 'T3',
      carried_from: 'T1',
    });
  });

  it('ignores supplied periods the definition does not cover', () => {
    const result = annualOf({ ...FINAL, of: ['T2'] }, FULL);
    expect(result.value).toBe('70');
    expect(result.average.ignored).toEqual(['T1', 'T3']);
    expect(result.flags.map((flag) => flag.code)).toEqual(['ignored_period', 'ignored_period']);
    expect(stepOf(result.trace, 'value').ignored).toEqual([]);
  });
});

describe('cumulative_sum', () => {
  const SUM: AnnualDefinition = { op: 'cumulative_sum', of: ['T1', 'T2', 'T3'], missing: 'renormalise' };

  it('adds the periods exactly', () => {
    expect(annualOf(SUM, FULL).value).toBe('210');
  });

  it('excludes a missing period without pretending to reweight a sum', () => {
    const result = annualOf(SUM, { T1: '60', T2: null, T3: '80' });
    expect(result.value).toBe('140');
    expect(stepOf(result.trace, 'missing').renormalised).toBe(false);
    expect(result.flags.map((flag) => flag.code)).toEqual(['missing_period']);
  });
});

describe('best_of', () => {
  const BEST: AnnualDefinition = { op: 'best_of', of: ['T1', 'T2', 'T3'], n: 2, missing: 'renormalise' };

  it('averages the best periods and breaks a tie by code', () => {
    const result = annualOf(BEST, { T1: '70', T2: '80', T3: '70' });
    expect(result.value).toBe('75');
    expect(result.average.consumed.map((entry) => entry.code)).toEqual(['T2', 'T1']);
    const select = stepOf(result.trace, 'aggregate').aggregate.steps.find((step) => step.kind === 'select');
    expect(select?.kind === 'select' ? select.selected : null).toEqual(['T2', 'T1']);
  });

  it('selects the same periods whatever order the inputs arrive in', () => {
    const forward = annualOf(BEST, { T1: '70', T2: '80', T3: '70' });
    const backward = annualOf(BEST, { T3: '70', T2: '80', T1: '70' });
    const shuffledOf = annualOf({ ...BEST, of: ['T3', 'T2', 'T1'] }, { T1: '70', T2: '80', T3: '70' });
    expect(backward.value).toBe(forward.value);
    expect(shuffledOf.value).toBe(forward.value);
    expect(backward.average.consumed.map((entry) => entry.code)).toEqual(['T2', 'T1']);
    expect(shuffledOf.average.consumed.map((entry) => entry.code)).toEqual(['T2', 'T1']);
  });

  it('is incomplete when fewer periods than n remain after a renormalise', () => {
    const result = annualOf({ ...BEST, n: 3 }, { T1: '70', T2: null, T3: '80' });
    expect(result.status).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.flags.map((flag) => flag.code)).toEqual(['missing_period', 'insufficient_periods']);
  });

  it('lets a zeroed period fill the best_of count when the pack declares zero', () => {
    const result = annualOf({ ...BEST, n: 3, missing: 'zero' }, { T1: '70', T2: null, T3: '70' });
    expect(result.value).toBe('140/3');
  });
});

describe('rounding', () => {
  it('rounds once at the annual stage and keeps the exact value', () => {
    const result = annualOf({ ...WEIGHTED, precision: 1 }, { T1: '60', T2: null, T3: '80' });
    expect(result.exact_value).toBe('500/7');
    expect(result.value).toBe('71.4');
    expect(result.rounding).toEqual({ precision: 1, mode: 'half_up', input: '500/7', output: '71.4' });
    expect(stepOf(result.trace, 'round')).toEqual({
      kind: 'round',
      input: '500/7',
      precision: 1,
      mode: 'half_up',
      value: '71.4',
    });
  });

  it('honours the declared rounding mode', () => {
    expect(annualOf({ ...WEIGHTED, precision: 2, mode: 'down' }, { T1: '60', T2: null, T3: '80' }).value).toBe('71.42');
  });
});

describe('per-area annual results', () => {
  const AREA_PERIODS: readonly AnnualPeriodInput[] = [
    {
      code: 'T1',
      value: '60',
      areas: [
        { code: 'ENG', group: 'languages', coefficient: '2', score: '50' },
        { code: 'MAT', group: 'mathematics', coefficient: '3', score: '60' },
      ],
    },
    {
      code: 'T2',
      value: '70',
      areas: [
        { code: 'ENG', group: 'languages', coefficient: '2', score: '70' },
        { code: 'MAT', group: 'mathematics', coefficient: '3', score: '40' },
      ],
    },
    {
      code: 'T3',
      value: '80',
      areas: [
        { code: 'ENG', group: 'languages', coefficient: '2', score: '80' },
        { code: 'MAT', group: 'mathematics', coefficient: '3', score: '60' },
      ],
    },
  ];

  function evaluate(context: AnnualContext = {}) {
    const evaluation = evaluateAnnual(WEIGHTED, AREA_PERIODS, context);
    if (!evaluation.ok) throw new Error(evaluation.issues.map((entry) => entry.code).join(', '));
    return evaluation.result;
  }

  const areaOf = (result: AnnualResult, code: string): AnnualAreaResult => {
    const area = result.areas.find((entry) => entry.code === code);
    if (area === undefined) throw new Error(`no area ${code}`);
    return area;
  };

  it('computes the average and one series per learning area', () => {
    const result = evaluate();
    expect(result.value).toBe('71');
    expect(result.areas.map((area) => area.code)).toEqual(['ENG', 'MAT']);
    expect(areaOf(result, 'ENG').value).toBe('68');
    expect(areaOf(result, 'MAT').value).toBe('54');
    expect(areaOf(result, 'ENG').group).toBe('languages');
    expect(areaOf(result, 'ENG').coefficient).toBe('2');
    expect(result.areas.every((area) => area.grade === null)).toBe(true);
  });

  it('renormalises a missing area independently of the average', () => {
    const periodsWithoutEng: readonly AnnualPeriodInput[] = AREA_PERIODS.map((period) =>
      period.code === 'T2'
        ? { ...period, areas: period.areas?.filter((area) => area.code !== 'ENG') }
        : period
    );
    const evaluation = evaluateAnnual(WEIGHTED, periodsWithoutEng);
    if (!evaluation.ok) throw new Error(evaluation.issues.map((entry) => entry.code).join(', '));
    const result = evaluation.result;
    expect(result.value).toBe('71');
    expect(areaOf(result, 'ENG').value).toBe('470/7');
    expect(areaOf(result, 'ENG').flags.map((flag) => flag.code)).toEqual(['missing_period', 'renormalised']);
    expect(areaOf(result, 'MAT').value).toBe('54');
  });

  it('excludes an exempt area from the annual denominators without calling it missing', () => {
    const periodsWithExempt: readonly AnnualPeriodInput[] = AREA_PERIODS.map((period) =>
      period.code === 'T2'
        ? {
            ...period,
            areas: period.areas?.map((area) => (area.code === 'ENG' ? { ...area, exempt: true } : area)),
          }
        : period
    );
    const evaluation = evaluateAnnual(WEIGHTED, periodsWithExempt);
    if (!evaluation.ok) throw new Error(evaluation.issues.map((entry) => entry.code).join(', '));
    const result = evaluation.result;
    expect(areaOf(result, 'ENG').value).toBe('470/7');
    expect(areaOf(result, 'ENG').flags.map((flag) => flag.code)).toEqual(['exempt_period', 'renormalised']);
  });

  it('looks the annual area values up in the declared scale', () => {
    const result = evaluate({ scales: [TEST_SCALE], grading_scale: 'test_percent' });
    const eng = areaOf(result, 'ENG');
    const mat = areaOf(result, 'MAT');
    expect(eng.grade).toBe('B');
    expect(eng.points).toBe('3');
    expect(eng.grade_points).toBe('3');
    expect(eng.scale).toBe('test_percent');
    expect(eng.lookup).not.toBeNull();
    expect(mat.grade).toBe('C');
    expect(mat.points).toBe('2');
    expect(replayAnnualResult(JSON.parse(JSON.stringify(result))).areas).toEqual([
      { code: 'ENG', value: '68', grade: 'B' },
      { code: 'MAT', value: '54', grade: 'C' },
    ]);
  });

  it('refuses a duplicate area in one period', () => {
    const evaluation = evaluateAnnual(WEIGHTED, [
      { code: 'T1', value: '60', areas: [{ code: 'ENG', score: '50' }, { code: 'ENG', score: '60' }] },
    ]);
    expect(evaluation.ok).toBe(false);
    if (!evaluation.ok) expect(evaluation.issues.map((entry) => entry.code)).toContain('duplicate_area');
  });
});

describe('validation', () => {
  it('refuses an unknown operator', () => {
    expect(annualIssueCodes({ op: 'median' } as unknown as AnnualDefinition, FULL)).toEqual(['unsupported_op']);
  });

  it('refuses a weighted mean without a weight map', () => {
    expect(annualIssueCodes({ op: 'weighted_mean' }, FULL)).toEqual(['missing_periods']);
  });

  it('refuses a list where a weighted mean needs weights', () => {
    expect(annualIssueCodes({ op: 'weighted_mean', of: ['T1', 'T2'] }, FULL)).toEqual(['invalid_weights']);
  });

  it('refuses a malformed weight', () => {
    expect(annualIssueCodes({ op: 'weighted_mean', of: { T1: 'x', T2: 1 } }, FULL)).toContain('invalid_weight');
  });

  it('refuses a best_of whose n exceeds the declared population', () => {
    expect(annualIssueCodes({ op: 'best_of', of: ['T1', 'T2'], n: 3 }, FULL)).toEqual(['invalid_n']);
  });

  it('refuses duplicate and malformed periods', () => {
    expect(annualIssueCodes({ op: 'mean', of: ['T1', 'T1'] }, FULL)).toEqual(['duplicate_period']);
    const evaluation = evaluateAnnual({ op: 'mean' }, [{ code: 'T1', value: 'not-a-number' }]);
    expect(evaluation.ok).toBe(false);
    if (!evaluation.ok) expect(evaluation.issues.map((entry) => entry.code)).toContain('invalid_period_value');
  });

  it('refuses an unknown grading scale', () => {
    const evaluation = evaluateAnnual(WEIGHTED, periods(FULL), { grading_scale: 'missing_scale' });
    expect(evaluation.ok).toBe(false);
    if (!evaluation.ok) expect(evaluation.issues.map((entry) => entry.code)).toEqual(['unknown_grading_scale']);
  });

  it('refuses an unknown missing policy and an out-of-range precision', () => {
    expect(annualIssueCodes({ op: 'mean', missing: 'latest' } as unknown as AnnualDefinition, FULL)).toEqual([
      'invalid_missing_policy',
    ]);
    expect(annualIssueCodes({ op: 'mean', precision: 99 }, FULL)).toEqual(['invalid_precision']);
  });
});

describe('replay', () => {
  const scenarios: readonly { readonly name: string; readonly definition: AnnualDefinition; readonly values: Readonly<Record<string, string | null>> }[] = [
    { name: 'weighted', definition: WEIGHTED, values: FULL },
    { name: 'weighted missing', definition: WEIGHTED, values: { T1: '60', T2: null, T3: '80' } },
    { name: 'weighted empty', definition: WEIGHTED, values: { T1: null, T2: null, T3: null } },
    { name: 'weighted zero', definition: { ...WEIGHTED, missing: 'zero' }, values: { T1: '60', T2: null, T3: '80' } },
    { name: 'weighted carry', definition: { ...WEIGHTED, missing: 'carry_previous' }, values: { T1: '60', T2: null, T3: '80' } },
    { name: 'weighted incomplete', definition: { ...WEIGHTED, missing: 'incomplete' }, values: { T1: '60', T2: null, T3: '80' } },
    { name: 'mean', definition: { op: 'mean', of: ['T1', 'T2', 'T3'] }, values: FULL },
    { name: 'sum', definition: { op: 'cumulative_sum' }, values: FULL },
    { name: 'final', definition: { op: 'final_period_only', of: ['T1', 'T2', 'T3'] }, values: FULL },
    { name: 'final carry', definition: { op: 'final_period_only', of: ['T1', 'T2', 'T3'], missing: 'carry_previous' }, values: { T1: '60', T2: '70', T3: null } },
    { name: 'best', definition: { op: 'best_of', of: ['T1', 'T2', 'T3'], n: 2 }, values: { T1: '70', T2: '80', T3: '70' } },
    { name: 'best insufficient', definition: { op: 'best_of', of: ['T1', 'T2', 'T3'], n: 3, missing: 'renormalise' }, values: { T1: '70', T2: null, T3: '80' } },
    { name: 'rounded', definition: { ...WEIGHTED, precision: 2, mode: 'half_even' }, values: { T1: '60', T2: null, T3: '80' } },
  ];

  for (const scenario of scenarios) {
    it(`round-trips ${scenario.name}`, () => {
      const result = annualOf(scenario.definition, scenario.values);
      const replayed = replayAnnual(JSON.parse(JSON.stringify(result.trace)) as AnnualResult['trace']);
      expect(replayed.value).toBe(result.value);
      expect(replayed.consumed).toEqual(result.average.consumed);
      expect(replayAnnualResult(JSON.parse(JSON.stringify(result)) as AnnualResult).value).toBe(result.value);
    });
  }

  it('refuses a stored value that disagrees with its period', () => {
    const result = annualOf({ op: 'final_period_only', of: ['T1', 'T2', 'T3'] }, FULL);
    const trace = JSON.parse(JSON.stringify(result.trace)) as DeepMutable<AnnualResult['trace']>;
    const valueStep = trace.steps.find((step) => step.kind === 'value');
    if (valueStep === undefined || valueStep.kind !== 'value') throw new Error('no value step');
    valueStep.parts[0] = { code: 'T3', value: '999' };
    expect(() => replayAnnual(trace)).toThrow(TraceMismatchError);
  });

  it('refuses an aggregate whose recorded part was changed', () => {
    const result = annualOf(WEIGHTED, FULL);
    const trace = JSON.parse(JSON.stringify(result.trace)) as DeepMutable<AnnualResult['trace']>;
    const aggregateStep = trace.steps.find((step) => step.kind === 'aggregate');
    if (aggregateStep === undefined || aggregateStep.kind !== 'aggregate') throw new Error('no aggregate step');
    const weighted = aggregateStep.aggregate.steps.find((step) => step.kind === 'weighted_mean');
    if (weighted === undefined || weighted.kind !== 'weighted_mean') throw new Error('no weighted step');
    weighted.parts[0] = { code: 'T1', value: '999', weight: '0.3' };
    expect(() => replayAnnual(trace)).toThrow(TraceMismatchError);
  });

  it('refuses a missing step that rewrites the reweighting', () => {
    const result = annualOf(WEIGHTED, { T1: '60', T2: null, T3: '80' });
    const trace = JSON.parse(JSON.stringify(result.trace)) as DeepMutable<AnnualResult['trace']>;
    const missing = trace.steps[0];
    if (missing.kind !== 'missing') throw new Error('no missing step');
    missing.renormalised = false;
    expect(() => replayAnnual(trace)).toThrow(TraceMismatchError);
  });
});
