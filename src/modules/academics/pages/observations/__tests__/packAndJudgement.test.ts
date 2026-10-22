// ABOUTME: Unit tests for the pack adapter and the term-judgement derivation: the levels are the
// ABOUTME: pack's own, the latest observation wins, and a changed observation changes the judgement.

import { describe, expect, it } from 'vitest';

import {
  cellKeyOf,
  deriveJudgement,
  latestByCell,
  type ObservationRecord,
} from '../data/judgement';
import { bundledObservationPack, type ObservationPack } from '../data/pack';

function loadPack(): ObservationPack {
  if (!bundledObservationPack.ok) throw new Error(bundledObservationPack.error);
  return bundledObservationPack.pack;
}

const pack = loadPack();
const AREA = 'area-mat';

function observation(overrides: Partial<ObservationRecord> & Pick<ObservationRecord, 'id'>): ObservationRecord {
  return {
    enrolment_id: 'enrolment-1',
    learning_area_id: AREA,
    outcome_id: 'outcome-a',
    rubric_level: 'ME',
    observed_on: '2026-02-01',
    ...overrides,
  };
}

describe('the ke-cbe observation pack', () => {
  it('reads the four rubric levels, labels and points from the pack', () => {
    expect(pack.scheme.code).toBe('ke-cbe-formative');
    expect(pack.scheme.observationScale).toBe('cbe_4_level');
    expect(pack.levels.map((level) => level.code)).toEqual(['EE', 'ME', 'AE', 'BE']);
    expect(pack.levels.map((level) => level.label)).toEqual([
      'Exceeding Expectations',
      'Meeting Expectations',
      'Approaching Expectations',
      'Below Expectations',
    ]);
    expect(pack.levelByCode.get('EE')?.points).toBe('4');
    expect(pack.levelByCode.get('BE')?.points).toBe('1');
    expect(pack.levels.some((level) => level.code === '')).toBe(false);
  });

  it('covers the formative scheme levels only and names the pack mean aggregation', () => {
    expect(pack.scheme.levels).toContain('G4');
    expect(pack.scheme.levels).not.toContain('G7');
    expect(pack.scheme.termJudgement).toEqual({
      op: 'teacher_best_fit',
      suggest: 'mode_of_latest_per_outcome',
    });
    expect(pack.meanAggregation?.code).toBe('cbe_primary_mean_level');
  });

  it('carries the pack competencies rather than a vocabulary written in the page', () => {
    expect(pack.competencies.some((entry) => entry.code === 'CC')).toBe(true);
    expect(pack.competencies.find((entry) => entry.code === 'CC')?.name).toBe(
      'Communication and Collaboration'
    );
  });
});

describe('latestByCell', () => {
  it('keeps the observation observed last for each learner and target', () => {
    const latest = latestByCell(
      [
        observation({ id: 'old', outcome_id: 'outcome-a', rubric_level: 'EE', observed_on: '2026-01-01' }),
        observation({ id: 'new', outcome_id: 'outcome-a', rubric_level: 'BE', observed_on: '2026-02-01' }),
        observation({ id: 'other', outcome_id: 'outcome-b', rubric_level: 'ME', observed_on: '2026-01-15' }),
      ],
      'outcome'
    );

    expect(latest.get(cellKeyOf('outcome:outcome-a', 'enrolment-1'))?.id).toBe('new');
    expect(latest.get(cellKeyOf('outcome:outcome-b', 'enrolment-1'))?.id).toBe('other');
    expect(latest.size).toBe(2);
  });

  it('uses the later write for two observations on the same day', () => {
    const latest = latestByCell(
      [
        observation({ id: 'first', created_at: '2026-02-01T08:00:00.000Z', rubric_level: 'ME' }),
        observation({ id: 'correction', created_at: '2026-02-01T09:00:00.000Z', rubric_level: 'AE' }),
      ],
      'outcome'
    );
    expect(latest.get(cellKeyOf('outcome:outcome-a', 'enrolment-1'))?.rubric_level).toBe('AE');
  });
});

describe('deriveJudgement', () => {
  it('has no judgement when nothing has been observed', () => {
    const judgement = deriveJudgement({
      records: [],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });
    expect(judgement.kind).toBe('none');
  });

  it('uses the mode of the latest observation per outcome and looks the band up in the pack scale', () => {
    const judgement = deriveJudgement({
      records: [
        observation({ id: 'a', outcome_id: 'outcome-a', rubric_level: 'ME', observed_on: '2026-02-01' }),
        observation({ id: 'b', outcome_id: 'outcome-b', rubric_level: 'ME', observed_on: '2026-02-02' }),
        observation({ id: 'c', outcome_id: 'outcome-c', rubric_level: 'EE', observed_on: '2026-02-03' }),
      ],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });

    expect(judgement.kind).toBe('derived');
    if (judgement.kind !== 'derived') return;
    expect(judgement.level.code).toBe('ME');
    expect(judgement.band?.code).toBe('ME');
    expect(judgement.band?.label).toBe('Meeting Expectations');
    expect(judgement.counts.map((entry) => [entry.level.code, entry.count])).toEqual([
      ['EE', 1],
      ['ME', 2],
      ['AE', 0],
      ['BE', 0],
    ]);
  });

  it('changes the judgement when an observation changes', () => {
    const records = [
      observation({ id: 'a', outcome_id: 'outcome-a', rubric_level: 'ME', observed_on: '2026-02-01' }),
      observation({ id: 'b', outcome_id: 'outcome-b', rubric_level: 'ME', observed_on: '2026-02-02' }),
      observation({ id: 'c', outcome_id: 'outcome-c', rubric_level: 'EE', observed_on: '2026-02-03' }),
    ];
    const before = deriveJudgement({ records, enrolmentId: 'enrolment-1', mode: 'outcome', pack });
    const after = deriveJudgement({
      records: [
        ...records,
        observation({ id: 'd', outcome_id: 'outcome-a', rubric_level: 'BE', observed_on: '2026-03-01' }),
      ],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });

    expect(before.kind).toBe('derived');
    expect(after.kind).toBe('derived');
    if (before.kind !== 'derived' || after.kind !== 'derived') return;
    expect(before.band?.code).toBe('ME');
    expect(after.band?.code).toBe('BE');
  });

  it('sends a tie to the lower level', () => {
    const judgement = deriveJudgement({
      records: [
        observation({ id: 'a', outcome_id: 'outcome-a', rubric_level: 'EE', observed_on: '2026-02-01' }),
        observation({ id: 'b', outcome_id: 'outcome-b', rubric_level: 'ME', observed_on: '2026-02-02' }),
      ],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });
    expect(judgement.kind).toBe('derived');
    if (judgement.kind !== 'derived') return;
    expect(judgement.band?.code).toBe('ME');
  });

  it('ignores another learner and another mode', () => {
    const judgement = deriveJudgement({
      records: [
        observation({ id: 'mine', enrolment_id: 'enrolment-1', rubric_level: 'BE' }),
        observation({ id: 'theirs', enrolment_id: 'enrolment-2', rubric_level: 'EE' }),
        observation({ id: 'competency', outcome_id: undefined, competency_id: 'cc', rubric_level: 'EE' }),
      ],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });
    expect(judgement.kind).toBe('derived');
    if (judgement.kind !== 'derived') return;
    expect(judgement.latest).toHaveLength(1);
    expect(judgement.band?.code).toBe('BE');
  });

  it('reports a level the pack scale does not name instead of guessing', () => {
    const judgement = deriveJudgement({
      records: [observation({ id: 'x', rubric_level: 'ZZ' })],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });
    expect(judgement.kind).toBe('none');
    if (judgement.kind !== 'none') return;
    expect(judgement.unknownLevels).toEqual(['ZZ']);
  });

  it('keeps the pack mean available beside the judgement', () => {
    const judgement = deriveJudgement({
      records: [
        observation({ id: 'a', outcome_id: 'outcome-a', rubric_level: 'EE', observed_on: '2026-02-01' }),
        observation({ id: 'b', outcome_id: 'outcome-b', rubric_level: 'EE', observed_on: '2026-02-02' }),
        observation({ id: 'c', outcome_id: 'outcome-c', rubric_level: 'ME', observed_on: '2026-02-03' }),
      ],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });
    expect(judgement.kind).toBe('derived');
    if (judgement.kind !== 'derived') return;
    // 4 + 4 + 3 over 3 is 3.67, rounded at precision 0 to 4: the pack's own cbe_4_level band EE.
    expect(judgement.mean).toEqual({ band: 'EE', label: 'Exceeding Expectations', value: '4' });
  });

  it('carries the latest evidence with the contributing observation', () => {
    const judgement = deriveJudgement({
      records: [
        observation({
          id: 'a',
          outcome_id: 'outcome-a',
          rubric_level: 'ME',
          evidence: 'Reads a Grade 4 passage with fluency.',
        }),
        observation({ id: 'b', outcome_id: 'outcome-b', rubric_level: 'ME', evidence: '  ' }),
      ],
      enrolmentId: 'enrolment-1',
      mode: 'outcome',
      pack,
    });
    expect(judgement.kind).toBe('derived');
    if (judgement.kind !== 'derived') return;
    expect(judgement.latest.map((entry) => entry.record.evidence)).toEqual([
      'Reads a Grade 4 passage with fluency.',
      '  ',
    ]);
  });
});
