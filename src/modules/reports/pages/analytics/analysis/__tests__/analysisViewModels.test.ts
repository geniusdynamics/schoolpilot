// ABOUTME: Analysis v2 view-model tests: the engine's own numbers reach the subject, group, teacher,
// ABOUTME: trend and heat-map views, a changed mark changes the analysis, a missing period is a gap,
// ABOUTME: and the ranking matrix holds for every tie method and policy switch.

import { describe, expect, it } from 'vitest';

import type { RankingPolicy } from '@/domain/assessment/aggregation';
import { bundledObservationPack } from '@/modules/academics/pages/observations';

import { buildCohort } from '../cohort';
import { buildHeatmap } from '../heatmap';
import { loadRankingPolicy } from '../policy';
import { buildRankingView, metricValue, type RankingLearner } from '../ranking';
import { aggregateValues, buildTrends, groupAnalysis, subjectAnalysis, teacherAnalysis } from '../views';
import { AGGREGATION, DEFAULT_SCORES, IDS, LEARNERS, PERIODS, request, SUBJECT_SCALE, type ScoreTable } from './cohortFixture';

const BANDS = SUBJECT_SCALE.bands.map((band) => ({ code: band.code, label: band.label }));

function eastCohort(scores?: ScoreTable) {
  return buildCohort(request(scores === undefined ? {} : { scores }));
}

function allCohorts(scores?: ScoreTable) {
  return PERIODS.map((period) =>
    buildCohort(request({ periodId: period.id, ...(scores === undefined ? {} : { scores }) }))
  );
}

function packLevels() {
  if (!bundledObservationPack.ok) throw new Error(bundledObservationPack.error);
  return bundledObservationPack.pack.levels.map((level) => ({
    code: level.code,
    label: level.label,
    points: level.points,
    descriptor: level.descriptor,
  }));
}

describe('the cohort the analysis reads', () => {
  it('computes each learner through the results engine', () => {
    const cohort = eastCohort();
    expect(cohort.areas.map((area) => area.code)).toEqual(['ENG', 'MAT']);
    expect(cohort.learners.map((learner) => learner.learnerName)).toEqual([
      'Amani Otieno',
      'Bello Mwangi',
      'Ciku Njeri',
      'Dada Abdi',
      'Fanuel Kiptoo',
    ]);
    const amani = cohort.rows.find((row) => row.enrolmentId === 'enrol-1');
    expect(amani?.aggregate.code).toBe('cbe_mean_percent');
    expect(amani?.aggregate.value).toBe('90');
    expect(amani?.aggregate.grade?.code).toBe('A');
    // Fanuel has no mark in any area, so his aggregate is not a zero: it has no value at all.
    const fanuel = cohort.rows.find((row) => row.enrolmentId === 'enrol-5');
    expect(fanuel?.aggregate.value).toBeNull();
  });

  it('names the teachers the groups declare', () => {
    expect(eastCohort().teacherIds).toEqual([IDS.teacher]);
    expect(buildCohort(request({ classGroupId: IDS.west })).teacherIds).toEqual([IDS.other]);
  });
});

describe('subject analysis', () => {
  it('reports the mean and band distribution of the area results', () => {
    const rows = subjectAnalysis([eastCohort()]);
    const english = rows.find((row) => row.code === 'ENG');
    expect(english?.name).toBe('English');
    expect(english?.group).toBe('languages');
    expect(english?.classes).toBe(1);
    expect(english?.summary.mean).toBe('77');
    expect(english?.summary.withResult).toBe(4);
    expect(english?.summary.missing).toBe(1);
    expect(english?.summary.distribution).toEqual([
      { code: 'A', label: 'A', count: 2 },
      { code: 'B', label: 'B', count: 1 },
      { code: 'C', label: 'C', count: 1 },
      { code: 'D', label: 'D', count: 0 },
      { code: 'E', label: 'E', count: 0 },
      { code: 'F', label: 'F', count: 0 },
    ]);
  });

  it('changes when a mark changes, because the number is the engine’s', () => {
    const scores: ScoreTable = {
      ...DEFAULT_SCORES,
      [IDS.periods.t1]: {
        ...DEFAULT_SCORES[IDS.periods.t1],
        dada: { ENG: '95', MAT: '65' },
      },
    };
    const rows = subjectAnalysis([eastCohort(scores)]);
    const english = rows.find((row) => row.code === 'ENG');
    expect(english?.summary.mean).toBe('84.5');
    expect(english?.summary.distribution.find((band) => band.code === 'A')?.count).toBe(3);
  });

  it('reports no result rather than a zero when nobody has a mark', () => {
    const rows = subjectAnalysis([buildCohort(request({ periodId: IDS.periods.t2 }))]);
    expect(rows.find((row) => row.code === 'ENG')?.summary.mean).toBeNull();
  });
});

describe('class-group analysis', () => {
  it('shows an incomplete cohort rather than averaging it away', () => {
    const rows = groupAnalysis([eastCohort()], BANDS);
    const east = rows.find((row) => row.classGroupId === IDS.east);
    expect(east?.name).toBe('East');
    expect(east?.levelName).toBe('Grade 7');
    expect(east?.aggregateCode).toBe('cbe_mean_percent');
    expect(east?.summary.mean).toBe('77');
    expect(east?.summary.withResult).toBe(4);
    expect(east?.summary.missing).toBe(1);
    expect(east?.summary.total).toBe(5);
    expect(east?.missingLearners.map((learner) => learner.learnerName)).toEqual(['Fanuel Kiptoo']);
    expect(east?.missingLearners[0]?.reason).toContain('no complete result');
  });

  it('reports every learner present when the cohort is complete', () => {
    const scores: ScoreTable = {
      ...DEFAULT_SCORES,
      [IDS.periods.t1]: {
        ...DEFAULT_SCORES[IDS.periods.t1],
        fanuel: { ENG: '55', MAT: '55' },
      },
    };
    const rows = groupAnalysis([eastCohort(scores)], BANDS);
    expect(rows[0]?.summary.missing).toBe(0);
    expect(rows[0]?.missingLearners).toEqual([]);
  });
});

describe('teacher analysis', () => {
  it('summarises the results of the groups each teacher teaches', () => {
    const east = eastCohort();
    const west = buildCohort(request({ classGroupId: IDS.west }));
    const rows = teacherAnalysis(
      [east, west],
      (staffId) => (staffId === IDS.teacher ? 'Grace Wekesa' : 'Peter Otieno'),
      BANDS
    );
    expect(rows.map((row) => row.name)).toEqual(['Grace Wekesa', 'Peter Otieno']);
    expect(rows[0]?.classGroups).toEqual(['East']);
    expect(rows[0]?.summary.mean).toBe('77');
    expect(rows[1]?.classGroups).toEqual(['West']);
    expect(rows[1]?.summary.mean).toBe('95');
  });

  it('never sees a group outside the cohorts it was given', () => {
    const rows = teacherAnalysis([eastCohort()], () => 'Grace Wekesa', BANDS);
    expect(rows.map((row) => row.staffId)).toEqual([IDS.teacher]);
  });
});

describe('trends', () => {
  it('names the periods and shows a missing period as a gap, never as zero', () => {
    const series = buildTrends(allCohorts(), PERIODS, [
      { key: AGGREGATION.code, label: 'Overall', valueOf: aggregateValues },
    ])[0];
    expect(series?.points.map((point) => point.periodName)).toEqual(['Term 1', 'Term 2', 'Term 3']);
    expect(series?.points.map((point) => point.value)).toEqual(['77', null, '60']);
    expect(series?.points[1]?.missing).toBe(5);
    expect(series?.points[1]?.withResult).toBe(0);
  });

  it('reports no value when the period has no learners at all', () => {
    const series = buildTrends([], PERIODS, [
      { key: 'aggregate', label: 'Overall', valueOf: aggregateValues },
    ])[0];
    expect(series?.points.every((point) => point.value === null)).toBe(true);
  });
});

describe('the competency heat-map', () => {
  it('renders the pack’s own level codes and labels', () => {
    const view = buildHeatmap({
      mode: 'competency',
      learningAreaName: 'English',
      learners: LEARNERS.filter((learner) => learner.classGroup === IDS.east).map((learner) => ({
        enrolmentId: learner.enrolment,
        learnerName: `${learner.given} ${learner.family}`,
        admissionNumber: learner.admission,
      })),
      columns: [
        { id: IDS.competencies.communication, key: `competency:${IDS.competencies.communication}`, code: 'CC', label: 'Communication & Collaboration' },
        { id: IDS.competencies.thinking, key: `competency:${IDS.competencies.thinking}`, code: 'CT', label: 'Critical Thinking & Problem Solving' },
      ],
      observations: [
        { id: 'obs-1', enrolment_id: 'enrol-1', learning_area_id: IDS.eng, competency_id: IDS.competencies.communication, rubric_level: 'EE', observed_on: '2026-02-01' },
        { id: 'obs-2', enrolment_id: 'enrol-2', learning_area_id: IDS.eng, competency_id: IDS.competencies.communication, rubric_level: 'ME', observed_on: '2026-02-02' },
        { id: 'obs-3', enrolment_id: 'enrol-1', learning_area_id: IDS.eng, competency_id: IDS.competencies.thinking, rubric_level: 'AE', observed_on: '2026-02-03' },
      ],
      levels: packLevels(),
    });

    expect(view.levels.map((level) => level.code)).toEqual(['EE', 'ME', 'AE', 'BE']);
    expect(view.recorded).toBe(3);
    expect(view.total).toBe(10);

    const amani = view.rows.find((row) => row.enrolmentId === 'enrol-1');
    expect(amani?.cells.map((cell) => cell.levelCode)).toEqual(['EE', 'AE']);
    expect(amani?.cells[0]?.levelLabel).toBe('Exceeding Expectations');
    expect(amani?.cells[0]?.points).toBe('4');

    // A learner nobody observed has no level, not a default one.
    const ciku = view.rows.find((row) => row.enrolmentId === 'enrol-3');
    expect(ciku?.cells.every((cell) => cell.levelCode === null)).toBe(true);
  });

  it('keeps the latest observation when a learner was observed twice on one target', () => {
    const view = buildHeatmap({
      mode: 'competency',
      learningAreaName: null,
      learners: [{ enrolmentId: 'enrol-1', learnerName: 'Amani Otieno', admissionNumber: 'ADM-001' }],
      columns: [{ id: IDS.competencies.communication, key: `competency:${IDS.competencies.communication}`, code: 'CC', label: 'Communication' }],
      observations: [
        { id: 'obs-a', enrolment_id: 'enrol-1', learning_area_id: IDS.eng, competency_id: IDS.competencies.communication, rubric_level: 'BE', observed_on: '2026-02-01' },
        { id: 'obs-b', enrolment_id: 'enrol-1', learning_area_id: IDS.eng, competency_id: IDS.competencies.communication, rubric_level: 'EE', observed_on: '2026-03-01' },
      ],
      levels: packLevels(),
    });
    expect(view.rows[0]?.cells[0]?.levelCode).toBe('EE');
  });
});

describe('the ranking policy', () => {
  const POLICY: RankingPolicy = {
    enabled: true,
    scope: 'class_group',
    by: 'cbe_mean_percent',
    ties: 'competition_1224',
    only_complete: true,
    show_out_of: true,
  };

  function learners(): RankingLearner[] {
    return [
      { enrolmentId: 'enrol-1', learnerName: 'Amani', scope: 'class-east', scopeLabel: 'East', value: '90', complete: true },
      { enrolmentId: 'enrol-2', learnerName: 'Bello', scope: 'class-east', scopeLabel: 'East', value: '80', complete: true },
      { enrolmentId: 'enrol-3', learnerName: 'Ciku', scope: 'class-east', scopeLabel: 'East', value: '80', complete: true },
      { enrolmentId: 'enrol-4', learnerName: 'Dada', scope: 'class-east', scopeLabel: 'East', value: '70', complete: true },
    ];
  }

  it('computes no position at all when the policy is disabled', () => {
    const view = buildRankingView({ ...POLICY, enabled: false }, learners());
    expect(view.enabled).toBe(false);
    expect(view.rows).toEqual([]);
  });

  it('is disabled when the pack declares no policy', () => {
    const view = buildRankingView(loadRankingPolicy({}), learners());
    expect(view.enabled).toBe(false);
    expect(view.rows).toEqual([]);
  });

  it('places ties by competition (1-2-2-4)', () => {
    const view = buildRankingView(POLICY, learners());
    expect(view.rows.map((row) => row.position)).toEqual(['1', '2', '2', '4']);
    expect(view.rows.every((row) => row.out_of === 4)).toBe(true);
    expect(view.rows.every((row) => row.ranked)).toBe(true);
  });

  it('places ties by dense (1-2-2-3)', () => {
    const view = buildRankingView({ ...POLICY, ties: 'dense_1223' }, learners());
    expect(view.rows.map((row) => row.position)).toEqual(['1', '2', '2', '3']);
  });

  it('places ties by shared average (1-2.5-2.5-4)', () => {
    const view = buildRankingView({ ...POLICY, ties: 'shared_average' }, learners());
    expect(view.rows.map((row) => row.position)).toEqual(['1', '2.5', '2.5', '4']);
  });

  it('lists an incomplete learner but does not rank them when only_complete is set', () => {
    const withIncomplete: RankingLearner[] = [
      ...learners(),
      { enrolmentId: 'enrol-5', learnerName: 'Fanuel', scope: 'class-east', scopeLabel: 'East', value: '60', complete: false },
    ];
    const view = buildRankingView(POLICY, withIncomplete);
    const fanuel = view.rows.find((row) => row.enrolmentId === 'enrol-5');
    expect(fanuel?.ranked).toBe(false);
    expect(fanuel?.position).toBeNull();
    expect(fanuel?.reason).toBe('incomplete');
    // The denominator counts the learners who were ranked, so the gap takes no place from them.
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-1')?.out_of).toBe(4);
    expect(view.rows.map((row) => row.position)).toEqual(['1', '2', '2', '4', null]);
  });

  it('ranks an incomplete learner when only_complete is not set', () => {
    const withIncomplete: RankingLearner[] = [
      ...learners(),
      { enrolmentId: 'enrol-5', learnerName: 'Fanuel', scope: 'class-east', scopeLabel: 'East', value: '60', complete: false },
    ];
    const view = buildRankingView({ ...POLICY, only_complete: false }, withIncomplete);
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-5')?.ranked).toBe(true);
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-5')?.position).toBe('5');
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-1')?.out_of).toBe(5);
  });

  it('lists a learner with no value unranked whatever only_complete says', () => {
    const view = buildRankingView({ ...POLICY, only_complete: false }, [
      ...learners(),
      { enrolmentId: 'enrol-5', learnerName: 'Fanuel', scope: 'class-east', scopeLabel: 'East', value: null, complete: false },
    ]);
    const fanuel = view.rows.find((row) => row.enrolmentId === 'enrol-5');
    expect(fanuel?.ranked).toBe(false);
    expect(fanuel?.reason).toBe('no_value');
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-1')?.out_of).toBe(4);
  });

  it('carries show_out_of so the page can hide the denominator', () => {
    expect(buildRankingView({ ...POLICY, show_out_of: false }, learners()).show_out_of).toBe(false);
    expect(buildRankingView(POLICY, learners()).show_out_of).toBe(true);
  });

  it('ranks inside the scope the policy names', () => {
    const twoScopes: RankingLearner[] = [
      { enrolmentId: 'enrol-1', learnerName: 'Amani', scope: 'class-east', scopeLabel: 'East', value: '90', complete: true },
      { enrolmentId: 'enrol-2', learnerName: 'Bello', scope: 'class-east', scopeLabel: 'East', value: '70', complete: true },
      { enrolmentId: 'enrol-6', learnerName: 'Eve', scope: 'class-west', scopeLabel: 'West', value: '95', complete: true },
    ];
    const view = buildRankingView(POLICY, twoScopes);
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-6')?.position).toBe('1');
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-6')?.out_of).toBe(1);
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-1')?.position).toBe('1');
    expect(view.rows.find((row) => row.enrolmentId === 'enrol-1')?.out_of).toBe(2);
  });

  it('refuses a policy the engine cannot run, with no rows and an issue', () => {
    const view = buildRankingView({ ...POLICY, scope: undefined }, learners());
    expect(view.rows).toEqual([]);
    expect(view.issues.length).toBeGreaterThan(0);
  });
});

describe('the metric a policy ranks on', () => {
  it('reads the aggregate value, and the grade points when the policy asks for them', () => {
    const cohort = eastCohort();
    const amani = cohort.rows.find((row) => row.enrolmentId === 'enrol-1');
    if (amani === undefined) throw new Error('Amani is missing from the cohort');
    expect(metricValue('cbe_mean_percent', amani.aggregate)).toBe('90');
    expect(metricValue('cbe_mean_percent.value', amani.aggregate)).toBe('90');
    expect(metricValue('cbe_mean_percent.points', amani.aggregate)).toBe('4');
  });

  it('yields no value for a metric the analysis does not compute', () => {
    const cohort = eastCohort();
    const amani = cohort.rows.find((row) => row.enrolmentId === 'enrol-1');
    if (amani === undefined) throw new Error('Amani is missing from the cohort');
    expect(metricValue('kcse_mean_grade.points', amani.aggregate)).toBeNull();
    expect(metricValue('cbe_mean_percent.grade', amani.aggregate)).toBeNull();
    expect(metricValue(null, amani.aggregate)).toBeNull();
  });
});
