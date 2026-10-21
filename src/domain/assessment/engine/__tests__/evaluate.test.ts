// ABOUTME: Unit tests for the scheme evaluator: the normal total, scaling, component and slot
// ABOUTME: combines, every missing policy, rounding boundaries, optional and exempt slots, the
// ABOUTME: trace and its replay, and the validation issues.

import { describe, expect, it } from 'vitest';

import { compareExact, parseExact } from '../exact';
import { TraceMismatchError, evaluateScheme, replaySchemeTrace } from '../index';
import type {
  EngineIssueCode,
  SchemeDefinition,
  SchemeEvaluationInput,
  SchemeMark,
  SchemeResult,
  SchemeSlot,
} from '../index';

function resultOf(input: SchemeEvaluationInput): SchemeResult {
  const evaluation = evaluateScheme(input);
  if (!evaluation.ok) {
    throw new Error(`expected a result, got ${evaluation.issues.map((issue) => issue.code).join(', ')}`);
  }
  return evaluation.result;
}

function issuesOf(input: SchemeEvaluationInput): readonly EngineIssueCode[] {
  const evaluation = evaluateScheme(input);
  if (evaluation.ok) throw new Error('expected the engine to refuse the input');
  return evaluation.issues.map((issue) => issue.code);
}

function present(slot: string, score: string, max: string, assessment = slot): SchemeMark {
  return { slot, assessment, score, max_score: max, status: 'present' };
}

function statusOf(slot: string, status: SchemeMark['status'], max: string, assessment = slot): SchemeMark {
  return { slot, assessment, max_score: max, status };
}

function exactOf(text: string) {
  const value = parseExact(text);
  if (value === null) throw new Error(`not an exact value: ${text}`);
  return value;
}

const scheme = (slots: readonly SchemeSlot[], extra: Partial<SchemeDefinition> = {}): SchemeDefinition => ({
  code: 'test',
  slots,
  learning_area_score: { op: 'sum', of: slots.map((slot) => slot.code) },
  ...extra,
});

const ng: SchemeDefinition = {
  code: 'ng-terminal',
  slots: [
    { code: 'CA1', label: '1st C.A.', max: '20' },
    { code: 'CA2', label: '2nd C.A.', max: '20' },
    { code: 'EXAM', label: 'Exam', max: '60' },
  ],
  learning_area_score: { op: 'sum', of: ['CA1', 'CA2', 'EXAM'], out_of: '100' },
  missing: { CA1: 'zero', CA2: 'zero', EXAM: 'incomplete' },
};

const ngMarks: readonly SchemeMark[] = [present('CA1', '18', '20'), present('CA2', '16', '20'), present('EXAM', '52', '60')];

describe('a normal scheme', () => {
  it('sums the slots into the declared maximum', () => {
    const result = resultOf({ scheme: ng, marks: ngMarks });

    expect(result.status).toBe('complete');
    expect(result.total).toBe('86');
    expect(result.exact_total).toBe('86');
    expect(result.out_of).toBe('100');
    expect(result.percent).toBe('86');
    expect(result.flags).toEqual([]);
  });

  it('explains each slot: raw, fraction, weight and contribution', () => {
    const [ca1, , exam] = resultOf({ scheme: ng, marks: ngMarks }).slots;

    expect(ca1).toMatchObject({ slot: 'CA1', outcome: 'counted', raw: '18', raw_max: '20', weight: '20', contribution: '18' });
    expect(ca1.fraction).toBe('0.9');
    expect(exam).toMatchObject({ slot: 'EXAM', raw: '52', raw_max: '60', weight: '60', contribution: '52' });
  });

  it('records the combine that produced each slot value', () => {
    const trace = resultOf({ scheme: ng, marks: ngMarks }).trace;
    const ca1 = trace.slots[0];

    expect(ca1.combine).toMatchObject({ kind: 'combine', op: 'sum', value: '18', max: '20' });
    expect(ca1.parts).toHaveLength(1);
    expect(ca1.parts[0]).toMatchObject({ assessment: 'CA1', decision: 'counted', score: '18', max: '20' });
    expect(ca1.parts[0].trace).toMatchObject({ kind: 'mark', entered: '18', max: '20', status: 'present' });
    expect(ca1.fraction).toMatchObject({ kind: 'fraction', max: '20', value: '0.9' });
    expect(ca1.contribution).toMatchObject({ kind: 'scale', from: '1', to: '20', value: '18' });
  });

  it('replays the trace into the same numbers', () => {
    const result = resultOf({ scheme: ng, marks: ngMarks });
    const replayed = replaySchemeTrace(result.trace);

    expect(replayed.total).toBe(result.total);
    expect(replayed.percent).toBe(result.percent);
    expect(replayed.slots.get('CA1')).toEqual({ fraction: '0.9', contribution: '18' });
  });

  it('refuses a stored number that its operands do not produce', () => {
    const result = resultOf({ scheme: ng, marks: ngMarks });
    const tampered = structuredClone(result.trace);
    if (tampered.total !== null) Object.assign(tampered.total, { value: '99' });

    expect(() => replaySchemeTrace(tampered)).toThrow(TraceMismatchError);
  });

  it('is deterministic: the same input serialises identically', () => {
    expect(JSON.stringify(resultOf({ scheme: ng, marks: ngMarks }))).toBe(
      JSON.stringify(resultOf({ scheme: ng, marks: ngMarks }))
    );
  });
});

describe('scaling', () => {
  it('rescales a mark to the slot maximum when the assessment is out of another maximum', () => {
    const input = {
      scheme: scheme([{ code: 'A', max: '20' }], { learning_area_score: { op: 'sum', of: ['A'], out_of: '20' } }),
      marks: [present('A', '18', '25')],
    };
    const result = resultOf(input);

    expect(result.slots[0]).toMatchObject({ raw: '14.4', raw_max: '20', weight: '20', contribution: '14.4' });
    expect(result.total).toBe('14.4');
    expect(result.slots[0].fraction).toBe('0.72');
  });

  it('renormalises the counted weights onto the declared maximum', () => {
    const input = {
      scheme: scheme([{ code: 'A', max: '20' }, { code: 'B', max: '20' }], {
        learning_area_score: { op: 'sum', of: ['A', 'B'], out_of: '100' },
      }),
      marks: [present('A', '18', '20'), present('B', '16', '20')],
    };

    expect(resultOf(input).total).toBe('85');
    expect(resultOf(input).percent).toBe('85');
  });

  it('uses scale_to as the contribution, not the raw maximum', () => {
    const input = {
      scheme: scheme([{ code: 'CAT', scale_to: '30' }, { code: 'ET', scale_to: '70' }], {
        learning_area_score: { op: 'sum', of: ['CAT', 'ET'], out_of: '100' },
      }),
      marks: [present('CAT', '15', '20'), present('ET', '60', '70')],
    };
    const result = resultOf(input);

    expect(result.slots[0].raw).toBeNull();
    expect(result.slots[0].weight).toBe('30');
    expect(result.slots[0].contribution).toBe('22.5');
    expect(result.total).toBe('82.5');
  });

  it('keeps an exact total when the fraction does not terminate', () => {
    const input = {
      scheme: scheme([{ code: 'ET', scale_to: '70' }], {
        learning_area_score: { op: 'sum', of: ['ET'], out_of: '70' },
      }),
      marks: [present('ET', '60', '70')],
    };
    const result = resultOf(input);

    expect(result.slots[0].fraction).toBe('6/7');
    expect(result.total).toBe('60');
  });
});

describe('component combination', () => {
  const papers = (papers: SchemeDefinition['component_policy'], marks: readonly SchemeMark[], slotMax = '100') => ({
    scheme: scheme([{ code: 'EXAM', max: slotMax }], {
      learning_area_score: { op: 'sum', of: ['EXAM'], out_of: slotMax },
      ...(papers === undefined ? {} : { component_policy: papers }),
    }),
    marks,
  });

  const threePapers = [
    { slot: 'EXAM', assessment: 'EXAM', component: 'P1', score: '18', max_score: '20', status: 'present' },
    { slot: 'EXAM', assessment: 'EXAM', component: 'P2', score: '14', max_score: '20', status: 'present' },
    { slot: 'EXAM', assessment: 'EXAM', component: 'P3', score: '32', max_score: '40', status: 'present' },
  ] satisfies readonly SchemeMark[];

  it('sums the papers with their own maxima', () => {
    const result = resultOf(papers({ papers: 'sum', out_of: '100' }, threePapers));
    expect(result.total).toBe('80');
    const part = result.trace.slots[0].parts[0].trace;
    expect(part).toMatchObject({ kind: 'scale', value: '80', from: '80', to: '100' });
    if (part?.kind === 'scale') {
      expect(part.input).toMatchObject({ kind: 'combine', op: 'sum', value: '64', max: '80' });
    }
  });

  it('scales each paper to its declared share and sums them', () => {
    const result = resultOf(
      papers({ papers: 'scale_each_then_sum', out_of: '100', weights: { P1: '30', P2: '30', P3: '40' } }, threePapers)
    );
    expect(result.total).toBe('80');
    expect(result.trace.slots[0].combine).toMatchObject({ kind: 'combine', value: '80', max: '100' });
  });

  it('weights the papers by a coefficient', () => {
    const result = resultOf(
      papers({ papers: 'weighted', out_of: '100', weights: { P1: '0.2', P2: '0.3', P3: '0.5' } }, threePapers)
    );
    expect(result.total).toBe('79');
  });

  it('keeps only the best papers', () => {
    const marks = [
      { slot: 'EXAM', assessment: 'EXAM', component: 'P1', score: '10', max_score: '20', status: 'present' },
      { slot: 'EXAM', assessment: 'EXAM', component: 'P2', score: '16', max_score: '20', status: 'present' },
      { slot: 'EXAM', assessment: 'EXAM', component: 'P3', score: '18', max_score: '20', status: 'present' },
    ] satisfies readonly SchemeMark[];
    const result = resultOf(papers({ papers: 'best_of', best_of: 2, out_of: '40' }, marks, '40'));

    expect(result.total).toBe('34');
    const part = result.trace.slots[0].parts[0].trace;
    expect(part).toMatchObject({ kind: 'scale', value: '34' });
    if (part?.kind === 'scale') {
      expect(part.input).toMatchObject({
        kind: 'combine',
        op: 'best_of',
        best_of: 2,
        selected: ['P2', 'P3'],
        value: '34',
        max: '40',
      });
    }
  });

  it('flags a slot incomplete when one paper is missing but the others count', () => {
    const marks = [
      { slot: 'EXAM', assessment: 'EXAM', component: 'P1', score: '40', max_score: '50', status: 'present' },
      { slot: 'EXAM', assessment: 'EXAM', component: 'P2', max_score: '50', status: 'absent' },
    ] satisfies readonly SchemeMark[];
    const result = resultOf({
      scheme: scheme([{ code: 'EXAM', max: '100' }], {
        learning_area_score: { op: 'sum', of: ['EXAM'], out_of: '100' },
        component_policy: { papers: 'sum', out_of: '100' },
        missing: { EXAM: 'incomplete' },
      }),
      marks,
    });

    expect(result.status).toBe('incomplete');
    expect(result.total).toBe('80');
    expect(result.slots[0].missing[0].applied).toBe('incomplete');
  });

  it('carries the previous value of one paper', () => {
    const marks = [
      { slot: 'EXAM', assessment: 'EXAM', component: 'P1', max_score: '50', status: 'absent' },
      { slot: 'EXAM', assessment: 'EXAM', component: 'P2', score: '40', max_score: '50', status: 'present' },
    ] satisfies readonly SchemeMark[];
    const input = {
      ...papers({ papers: 'sum', out_of: '100' }, marks),
      carry_previous: { EXAM: { raw: '0', max: '100', components: { P1: { score: '30', max_score: '50' } } } },
      scheme: {
        ...papers({ papers: 'sum', out_of: '100' }, marks).scheme,
        missing: { EXAM: 'carry_previous' as const },
      },
    };
    const result = resultOf(input);

    expect(result.total).toBe('70');
    expect(result.slots[0].missing).toEqual([
      { assessment: 'EXAM', component: 'P1', status: 'absent', policy: 'carry_previous', applied: 'carried' },
    ]);
    expect(result.flags).toEqual([{ code: 'carried_previous', slot: 'EXAM', assessment: 'EXAM', component: 'P1' }]);
  });
});

describe('multi-assessment slots', () => {
  const cats = [present('CAT', '15', '20', 'CAT1'), present('CAT', '18', '20', 'CAT2'), present('CAT', '20', '20', 'CAT3')];

  const keScheme: SchemeDefinition = {
    code: 'ke-844-internal',
    slots: [
      { code: 'CAT', multi: true, combine: 'mean', scale_to: '30' },
      { code: 'ET', scale_to: '70' },
    ],
    learning_area_score: { op: 'sum', of: ['CAT', 'ET'], out_of: '100' },
  };

  it('averages the assessments of a mean slot and scales the average', () => {
    const result = resultOf({ scheme: keScheme, marks: [...cats, present('ET', '60', '70')] });

    expect(result.slots[0].fraction).toBe('53/60');
    expect(result.slots[0].contribution).toBe('26.5');
    expect(result.total).toBe('86.5');
    expect(result.trace.slots[0].combine).toMatchObject({ op: 'mean', value: '2.65', max: '3' });
  });

  it('keeps the best assessments of a best_of slot', () => {
    const input = {
      scheme: {
        code: 'cat-best',
        slots: [{ code: 'CAT', multi: true, combine: 'best_of', best_of: 2, scale_to: '20' }],
        learning_area_score: { op: 'sum', of: ['CAT'], out_of: '20' },
      } satisfies SchemeDefinition,
      marks: [present('CAT', '10', '20', 'CAT1'), present('CAT', '16', '20', 'CAT2'), present('CAT', '18', '20', 'CAT3')],
    };
    const result = resultOf(input);

    expect(result.total).toBe('17');
    expect(result.trace.slots[0].combine).toMatchObject({ op: 'best_of', selected: ['CAT2', 'CAT3'], value: '1.7', max: '2' });
  });

  it('sums the assessments of a sum slot', () => {
    const input = {
      scheme: {
        code: 'cat-sum',
        slots: [{ code: 'CAT', multi: true, combine: 'sum', scale_to: '20' }],
        learning_area_score: { op: 'sum', of: ['CAT'], out_of: '20' },
      } satisfies SchemeDefinition,
      marks: [present('CAT', '10', '20', 'CAT1'), present('CAT', '16', '20', 'CAT2')],
    };

    expect(resultOf(input).total).toBe('13');
  });
});

describe('the missing policy', () => {
  const schemeWith = (policy: 'zero' | 'exclude' | 'incomplete' | 'carry_previous'): SchemeDefinition =>
    scheme([{ code: 'A', max: '20' }, { code: 'B', max: '30' }, { code: 'C', max: '50' }], {
      learning_area_score: { op: 'sum', of: ['A', 'B', 'C'], out_of: '100' },
      missing: { A: policy },
    });

  const presentMarks = [present('B', '15', '30'), present('C', '40', '50')];

  it('zero counts the slot as zero and keeps its weight', () => {
    const result = resultOf({ scheme: schemeWith('zero'), marks: [statusOf('A', 'absent', '20'), ...presentMarks] });

    expect(result.total).toBe('55');
    expect(result.status).toBe('complete');
    expect(result.slots[0]).toMatchObject({ outcome: 'counted', fraction: '0', contribution: '0', policy: 'zero' });
    expect(result.slots[0].missing).toEqual([
      { assessment: 'A', component: null, status: 'absent', policy: 'zero', applied: 'zero' },
    ]);
    expect(result.flags).toEqual([{ code: 'mark_missing', slot: 'A', assessment: 'A' }]);
  });

  it('exclude drops the slot and renormalises the remaining weights', () => {
    const result = resultOf({ scheme: schemeWith('exclude'), marks: [statusOf('A', 'absent', '20'), ...presentMarks] });

    expect(result.total).toBe('68.75');
    expect(result.status).toBe('complete');
    expect(result.slots[0]).toMatchObject({ outcome: 'excluded', fraction: null, policy: 'exclude' });
    expect(result.trace.counted_weight).toBe('80');
  });

  it('incomplete drops the slot and flags the result', () => {
    const result = resultOf({ scheme: schemeWith('incomplete'), marks: [statusOf('A', 'absent', '20'), ...presentMarks] });

    expect(result.status).toBe('incomplete');
    expect(result.total).toBe('68.75');
    expect(result.slots[0].outcome).toBe('excluded');
    expect(result.slots[0].missing[0].applied).toBe('incomplete');
  });

  it('carry_previous uses the value recorded for the slot', () => {
    const input = {
      scheme: schemeWith('carry_previous'),
      marks: [statusOf('A', 'absent', '20'), ...presentMarks],
      carry_previous: { A: { raw: '12', max: '20' } },
    };
    const result = resultOf(input);

    expect(result.status).toBe('complete');
    expect(result.slots[0]).toMatchObject({ fraction: '0.6', contribution: '12', policy: 'carry_previous' });
    expect(result.total).toBe('67');
    expect(result.slots[0].missing[0].applied).toBe('carried');
  });

  it('carry_previous with no recorded value leaves the result incomplete', () => {
    const result = resultOf({
      scheme: schemeWith('carry_previous'),
      marks: [statusOf('A', 'absent', '20'), ...presentMarks],
    });

    expect(result.status).toBe('incomplete');
    expect(result.slots[0].missing[0].applied).toBe('carry_unavailable');
    expect(result.flags).toContainEqual({ code: 'carry_unavailable', slot: 'A', assessment: 'A' });
  });

  it('carries a whole slot that has no marks at all', () => {
    const input = {
      scheme: scheme([{ code: 'A', max: '20' }, { code: 'B', max: '30' }], {
        learning_area_score: { op: 'sum', of: ['A', 'B'], out_of: '50' },
        missing: { A: 'carry_previous' },
      }),
      marks: [present('B', '30', '30')],
      carry_previous: { A: { raw: '12', max: '20' } },
    };
    const result = resultOf(input);

    expect(result.total).toBe('42');
    expect(result.status).toBe('complete');
    expect(result.trace.slots[0].fraction).toMatchObject({ kind: 'fraction', value: '0.6' });
    expect(result.flags).toEqual([{ code: 'carried_previous', slot: 'A' }]);
  });

  it('treats malpractice under the slot policy and flags it', () => {
    const result = resultOf({ scheme: schemeWith('zero'), marks: [statusOf('A', 'malpractice', '20'), ...presentMarks] });

    expect(result.total).toBe('55');
    expect(result.flags).toContainEqual({ code: 'malpractice', slot: 'A', assessment: 'A' });
  });

  it('excludes an exempt mark from the denominators', () => {
    const result = resultOf({ scheme: schemeWith('zero'), marks: [statusOf('A', 'exempt', '20'), ...presentMarks] });

    expect(result.total).toBe('68.75');
    expect(result.status).toBe('complete');
    expect(result.slots[0].outcome).toBe('exempt');
    expect(result.flags).toEqual([{ code: 'exempt', slot: 'A', assessment: 'A' }]);
  });

  it('reports a fully exempt learner as exempt with no total', () => {
    const result = resultOf({
      scheme: schemeWith('zero'),
      marks: [statusOf('A', 'exempt', '20'), statusOf('B', 'exempt', '30'), statusOf('C', 'exempt', '50')],
    });

    expect(result.status).toBe('exempt');
    expect(result.total).toBeNull();
    expect(result.percent).toBeNull();
  });

  it('defaults a required slot with no mark to incomplete', () => {
    const result = resultOf({ scheme: scheme([{ code: 'A', max: '20' }]), marks: [] });

    expect(result.status).toBe('incomplete');
    expect(result.total).toBeNull();
    expect(result.slots[0]).toMatchObject({ outcome: 'excluded', policy: 'incomplete' });
  });
});

describe('optional slots', () => {
  it('leaves an absent optional slot out of the total', () => {
    const input = {
      scheme: scheme([{ code: 'A', max: '10' }, { code: 'B', max: '10', optional: true }], {
        learning_area_score: { op: 'sum', of: ['A', 'B'], out_of: '20' },
      }),
      marks: [present('A', '10', '10')],
    };
    const result = resultOf(input);

    expect(result.status).toBe('complete');
    expect(result.slots[1].outcome).toBe('optional_absent');
    expect(result.total).toBe('20');
    expect(result.flags).toEqual([{ code: 'optional_slot_absent', slot: 'B' }]);
  });
});

describe('rounding', () => {
  const half = (mode: 'half_up' | 'half_even' | 'half_down' | 'up' | 'down'): SchemeDefinition =>
    scheme([{ code: 'A', max: '10' }], {
      learning_area_score: { op: 'sum', of: ['A'], out_of: '10' },
      rounding: [{ stage: 'learning_area_score', precision: 0, mode }],
    });

  it('rounds the total once, at the learning area stage, and records it', () => {
    const result = resultOf({ scheme: half('half_up'), marks: [present('A', '6.5', '10')] });

    expect(result.exact_total).toBe('6.5');
    expect(result.total).toBe('7');
    expect(result.percent).toBe('70');
    expect(result.rounding).toEqual({
      stage: 'learning_area_score',
      precision: 0,
      mode: 'half_up',
      input: '6.5',
      output: '7',
    });
    expect(result.trace.total).toMatchObject({ kind: 'round', value: '7', applied: true });
  });

  it.each([
    ['half_up', '7'],
    ['half_even', '6'],
    ['half_down', '6'],
    ['up', '7'],
    ['down', '6'],
  ] as const)('rounds a .5 boundary with %s to %s', (mode, expected) => {
    expect(resultOf({ scheme: half(mode), marks: [present('A', '6.5', '10')] }).total).toBe(expected);
  });

  it('leaves the total unrounded when no rule names the stage', () => {
    const result = resultOf({ scheme: scheme([{ code: 'A', max: '10' }]), marks: [present('A', '6.5', '10')] });

    expect(result.total).toBe('6.5');
    expect(result.rounding).toBeNull();
    expect(result.trace.total).toMatchObject({ kind: 'ratio', value: '6.5' });
  });

  it('rounds a slot before scaling it', () => {
    const input = {
      scheme: scheme([{ code: 'EXAM', max: '60' }], {
        learning_area_score: { op: 'sum', of: ['EXAM'], out_of: '60' },
        component_policy: { papers: 'sum', out_of: '60' },
        rounding: [{ stage: 'slot', precision: 0, mode: 'half_up' }],
      }),
      marks: [
        { slot: 'EXAM', assessment: 'EXAM', component: 'P1', score: '14', max_score: '20', status: 'present' },
        { slot: 'EXAM', assessment: 'EXAM', component: 'P2', score: '15', max_score: '20', status: 'present' },
        { slot: 'EXAM', assessment: 'EXAM', component: 'P3', score: '14.5', max_score: '20', status: 'present' },
      ] satisfies readonly SchemeMark[],
    };
    const result = resultOf(input);

    expect(result.slots[0].rounding).toEqual({
      stage: 'slot',
      precision: 0,
      mode: 'half_up',
      input: '43.5',
      output: '44',
    });
    expect(result.slots[0].fraction).toBe('11/15');
    expect(result.total).toBe('44');
  });
});

describe('validation', () => {
  it('refuses a scheme with no slots', () => {
    expect(issuesOf({ scheme: scheme([]), marks: [] })).toContain('empty_slots');
  });

  it('refuses a slot without a max or a scale_to', () => {
    expect(issuesOf({ scheme: scheme([{ code: 'A' }]), marks: [] })).toContain('slot_without_scale');
  });

  it('refuses a malformed maximum', () => {
    expect(issuesOf({ scheme: scheme([{ code: 'A', max: 'twenty' }]), marks: [] })).toContain('invalid_slot_max');
  });

  it('refuses a duplicate slot and a duplicate score entry', () => {
    expect(issuesOf({ scheme: scheme([{ code: 'A', max: '10' }, { code: 'A', max: '10' }]), marks: [] })).toContain(
      'duplicate_slot'
    );
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }], { learning_area_score: { op: 'sum', of: ['A', 'A'], out_of: '10' } }),
        marks: [],
      })
    ).toContain('duplicate_slot_in_score');
  });

  it('refuses a score outside the assessment maximum', () => {
    expect(issuesOf({ scheme: scheme([{ code: 'A', max: '20' }]), marks: [present('A', '25', '20')] })).toContain(
      'score_out_of_range'
    );
    expect(issuesOf({ scheme: scheme([{ code: 'A', max: '20' }]), marks: [present('A', '-1', '20')] })).toContain(
      'score_out_of_range'
    );
  });

  it('refuses a malformed score and a present mark without a maximum', () => {
    expect(issuesOf({ scheme: scheme([{ code: 'A', max: '20' }]), marks: [present('A', 'eighteen', '20')] })).toContain(
      'invalid_score'
    );
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '20' }]),
        marks: [{ slot: 'A', assessment: 'A', score: '18', status: 'present' }],
      })
    ).toContain('missing_max_score');
  });

  it('refuses a mark for a slot the scheme does not declare or does not score', () => {
    expect(issuesOf({ scheme: scheme([{ code: 'A', max: '10' }]), marks: [present('B', '5', '10')] })).toContain(
      'mark_unknown_slot'
    );
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }, { code: 'B', max: '10' }], {
          learning_area_score: { op: 'sum', of: ['A'], out_of: '10' },
        }),
        marks: [present('B', '5', '10')],
      })
    ).toContain('mark_slot_not_in_score');
  });

  it('refuses two marks for the same assessment and paper', () => {
    expect(
      issuesOf({ scheme: scheme([{ code: 'A', max: '10' }]), marks: [present('A', '5', '10'), present('A', '6', '10')] })
    ).toContain('duplicate_mark');
  });

  it('refuses papers without a component policy and two assessments in a single slot', () => {
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }]),
        marks: [{ slot: 'A', assessment: 'A', component: 'P1', score: '5', max_score: '10', status: 'present' }],
      })
    ).toContain('component_without_policy');
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }]),
        marks: [present('A', '5', '10', 'X'), present('A', '6', '10', 'Y')],
      })
    ).toContain('multiple_assessments_in_single_slot');
  });

  it('refuses an aggregation the scheme model does not own', () => {
    const invalid = {
      ...scheme([{ code: 'A', max: '10' }]),
      learning_area_score: { op: 'mean', of: ['A'], out_of: '10' },
    } as unknown as SchemeDefinition;
    expect(issuesOf({ scheme: invalid, marks: [] })).toContain('unsupported_op');
  });

  it('refuses a second rounding rule for one stage and a precision out of range', () => {
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }], {
          rounding: [
            { stage: 'slot', precision: 0, mode: 'half_up' },
            { stage: 'slot', precision: 1, mode: 'half_up' },
          ],
        }),
        marks: [],
      })
    ).toContain('duplicate_rounding_stage');
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }], {
          rounding: [{ stage: 'learning_area_score', precision: 13, mode: 'half_up' }],
        }),
        marks: [],
      })
    ).toContain('invalid_precision');
  });

  it('refuses a missing policy for an undeclared slot', () => {
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }], { missing: { Z: 'zero' } }),
        marks: [],
      })
    ).toContain('unknown_slot_in_missing');
  });

  it('refuses an unknown mark status', () => {
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '10' }]),
        marks: [{ slot: 'A', assessment: 'A', status: 'not_sat' as unknown as SchemeMark['status'] }],
      })
    ).toContain('invalid_mark_status');
  });

  it('refuses a carried score above its maximum', () => {
    expect(
      issuesOf({
        scheme: scheme([{ code: 'A', max: '20' }], { missing: { A: 'carry_previous' } }),
        marks: [],
        carry_previous: { A: { raw: '25', max: '20' } },
      })
    ).toContain('invalid_carried_value');
  });

  it('reports every problem of a broken input in one pass', () => {
    const issues = issuesOf({
      scheme: scheme([{ code: 'A', max: '10' }]),
      marks: [present('B', '5', '10'), present('B', '6', '10')],
    });

    expect(issues).toContain('mark_unknown_slot');
    expect(issues).toContain('duplicate_mark');
  });
});

describe('exactness', () => {
  it('adds a third three times exactly', () => {
    const third = { slot: 'A', assessment: 'A1', score: '10', max_score: '30', status: 'present' } as const;
    const input = {
      scheme: scheme([{ code: 'A', multi: true, combine: 'sum', max: '30' }], {
        learning_area_score: { op: 'sum', of: ['A'], out_of: '30' },
      }),
      marks: [
        { ...third, assessment: 'A1' },
        { ...third, assessment: 'A2' },
        { ...third, assessment: 'A3' },
      ] satisfies readonly SchemeMark[],
    };
    const result = resultOf(input);

    expect(result.slots[0].fraction).toBe('1/3');
    expect(result.total).toBe('10');
    expect(compareExact(exactOf(result.total ?? '0'), exactOf('10'))).toBe(0);
  });
});
