// ABOUTME: The analysis v2 test fixture: one canonical school with two class groups, two learning
// ABOUTME: areas, three periods, competencies and observations, exposed both as repository seed rows
// ABOUTME: and as a cohort request, so the pure view models and the rendered page read one school.

import type { AggregationDefinition } from '@/domain/assessment/aggregation';
import type { GradingScaleDefinition } from '@/domain/assessment/scales';
import type { TeachingScope } from '@/modules/academics/pages/marks';
import type { FakeRepositoryRows } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';

import type { CohortRequest } from '../cohort';

export const IDS = {
  institution: 'inst-0001',
  programme: 'programme-0001',
  year: 'year-0001',
  level: 'level-0001',
  east: 'class-east',
  west: 'class-west',
  eng: 'area-eng',
  mat: 'area-mat',
  scale: 'scale-subject',
  teacher: 'staff-grace',
  other: 'staff-peter',
  teacherUser: 'user-grace',
  otherUser: 'user-peter',
  periods: { t1: 'period-t1', t2: 'period-t2', t3: 'period-t3' },
  groups: { engEast: 'group-eng-east', matEast: 'group-mat-east', engWest: 'group-eng-west' },
  competencies: { communication: 'comp-1', thinking: 'comp-2' },
} as const;

export const AREA_CODES = ['ENG', 'MAT'] as const;
export type AreaCode = (typeof AREA_CODES)[number];

export const AREA_IDS: Readonly<Record<AreaCode, string>> = { ENG: IDS.eng, MAT: IDS.mat };

export interface FixtureLearner {
  readonly key: string;
  readonly id: string;
  readonly enrolment: string;
  readonly member: string;
  readonly given: string;
  readonly family: string;
  readonly admission: string;
  readonly classGroup: string;
}

export const LEARNERS: readonly FixtureLearner[] = [
  { key: 'amani', id: 'learner-1', enrolment: 'enrol-1', member: 'member-1', given: 'Amani', family: 'Otieno', admission: 'ADM-001', classGroup: IDS.east },
  { key: 'bello', id: 'learner-2', enrolment: 'enrol-2', member: 'member-2', given: 'Bello', family: 'Mwangi', admission: 'ADM-002', classGroup: IDS.east },
  { key: 'ciku', id: 'learner-3', enrolment: 'enrol-3', member: 'member-3', given: 'Ciku', family: 'Njeri', admission: 'ADM-003', classGroup: IDS.east },
  { key: 'dada', id: 'learner-4', enrolment: 'enrol-4', member: 'member-4', given: 'Dada', family: 'Abdi', admission: 'ADM-004', classGroup: IDS.east },
  { key: 'fanuel', id: 'learner-5', enrolment: 'enrol-5', member: 'member-5', given: 'Fanuel', family: 'Kiptoo', admission: 'ADM-005', classGroup: IDS.east },
  { key: 'eve', id: 'learner-6', enrolment: 'enrol-6', member: 'member-6', given: 'Eve', family: 'Wanjiru', admission: 'ADM-006', classGroup: IDS.west },
];

/** A score per learner per area, per period; a null means the learner has no mark there. */
export type ScoreTable = Readonly<Record<string, Readonly<Record<string, Readonly<Record<AreaCode, string | null>>>>>>;

/** Term 1 and Term 3 carry marks; Term 2 has none at all, which is the trend's gap. */
export const DEFAULT_SCORES: ScoreTable = {
  [IDS.periods.t1]: {
    amani: { ENG: '90', MAT: '90' },
    bello: { ENG: '81', MAT: '81' },
    ciku: { ENG: '72', MAT: '72' },
    dada: { ENG: '65', MAT: '65' },
    eve: { ENG: '95', MAT: '95' },
  },
  [IDS.periods.t2]: {},
  [IDS.periods.t3]: {
    amani: { ENG: '60', MAT: '60' },
    bello: { ENG: '60', MAT: '60' },
    ciku: { ENG: '60', MAT: '60' },
    dada: { ENG: '60', MAT: '60' },
    eve: { ENG: '60', MAT: '60' },
  },
};

export const PERIODS: readonly { readonly id: string; readonly name: string; readonly start_date: string; readonly end_date: string }[] = [
  { id: IDS.periods.t1, name: 'Term 1', start_date: '2026-01-01', end_date: '2026-04-30' },
  { id: IDS.periods.t2, name: 'Term 2', start_date: '2026-05-01', end_date: '2026-08-31' },
  { id: IDS.periods.t3, name: 'Term 3', start_date: '2026-09-01', end_date: '2026-12-31' },
];

/** The learning areas each class group is marked on. */
const CLASS_AREAS: Readonly<Record<string, readonly AreaCode[]>> = {
  [IDS.east]: ['ENG', 'MAT'],
  [IDS.west]: ['ENG'],
};

function assessmentId(periodId: string, area: AreaCode, classGroupId: string): string {
  return `assess-${periodId}-${area}-${classGroupId}`;
}

function groupId(area: AreaCode, classGroupId: string): string {
  return area === 'ENG'
    ? classGroupId === IDS.east
      ? IDS.groups.engEast
      : IDS.groups.engWest
    : IDS.groups.matEast;
}

export const AGGREGATION: AggregationDefinition = {
  code: 'cbe_mean_percent',
  op: 'mean',
  value: 'score',
  precision: 1,
  result_scale: 'subject_bands',
};

/**
 * The bands the school grades on.
 *
 * They tile under the exclusive upper-bound convention (each band's `max` is the next band's
 * `min`), which is the convention a stored `grading_scale` row implies: the canonical table keeps
 * no `input` or `upper`, so the engine's defaults apply.
 */
export const SUBJECT_SCALE: GradingScaleDefinition = {
  code: 'subject_bands',
  kind: 'numeric_bands',
  input: 'percent',
  upper: 'exclusive',
  bands: [
    { code: 'A', label: 'A', min: 80, max: 101, points: 4 },
    { code: 'B', label: 'B', min: 70, max: 80, points: 3 },
    { code: 'C', label: 'C', min: 60, max: 70, points: 2 },
    { code: 'D', label: 'D', min: 50, max: 60, points: 1 },
    { code: 'E', label: 'E', min: 40, max: 50, points: 0 },
    { code: 'F', label: 'F', min: 0, max: 40, points: 0 },
  ],
};

/** The repository rows the page test renders against. */
export function seed(scores: ScoreTable = DEFAULT_SCORES): FakeRepositoryRows {
  const rows: Record<string, Record<string, unknown>[]> = {
    institution: [{ id: IDS.institution, name: 'Greenfields Academy' }],
    programme: [{ id: IDS.programme, name: 'Junior Secondary', institution_id: IDS.institution }],
    academic_year: [
      {
        id: IDS.year,
        name: '2026',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'current',
        institution_id: IDS.institution,
      },
    ],
    academic_period: PERIODS.map((period) => ({
      id: period.id,
      name: period.name,
      academic_year_id: IDS.year,
      kind: 'term',
      sequence: 1,
      start_date: period.start_date,
      end_date: period.end_date,
      is_reporting: true,
      is_billing: false,
      status: 'current',
      institution_id: IDS.institution,
    })),
    level: [{ id: IDS.level, name: 'Grade 7', ordinal: 7, is_terminal: false, institution_id: IDS.institution }],
    class_group: [IDS.east, IDS.west].map((id) => ({
      id,
      name: id === IDS.east ? 'East' : 'West',
      level_id: IDS.level,
      academic_year_id: IDS.year,
      campus_id: 'campus-0001',
      programme_id: IDS.programme,
      institution_id: IDS.institution,
      homeroom_teacher_ids: [],
    })),
    learning_area: AREA_CODES.map((code) => ({
      id: AREA_IDS[code],
      code,
      name: code === 'ENG' ? 'English' : 'Mathematics',
      group: code === 'ENG' ? 'languages' : 'mathematics',
      kind: 'core',
      programme_id: IDS.programme,
      level_ids: [IDS.level],
      pathway_ids: [],
      institution_id: IDS.institution,
    })),
    grading_scale: [
      {
        id: IDS.scale,
        code: 'subject_bands',
        kind: 'numeric_bands',
        bands: SUBJECT_SCALE.bands,
        version: '1',
        programme_id: IDS.programme,
        institution_id: IDS.institution,
      },
    ],
    staff: [
      { id: IDS.teacher, user_id: IDS.teacherUser, given_name: 'Grace', family_name: 'Wekesa', institution_id: IDS.institution },
      { id: IDS.other, user_id: IDS.otherUser, given_name: 'Peter', family_name: 'Otieno', institution_id: IDS.institution },
    ],
    teaching_group: [
      { id: IDS.groups.engEast, name: 'Grade 7 English East', campus_id: 'campus-0001', academic_year_id: IDS.year, learning_area_id: IDS.eng, level_ids: [IDS.level], class_group_ids: [IDS.east], teacher_ids: [IDS.teacher], kind: 'whole_class', institution_id: IDS.institution },
      { id: IDS.groups.matEast, name: 'Grade 7 Mathematics East', campus_id: 'campus-0001', academic_year_id: IDS.year, learning_area_id: IDS.mat, level_ids: [IDS.level], class_group_ids: [IDS.east], teacher_ids: [IDS.teacher], kind: 'whole_class', institution_id: IDS.institution },
      { id: IDS.groups.engWest, name: 'Grade 7 English West', campus_id: 'campus-0001', academic_year_id: IDS.year, learning_area_id: IDS.eng, level_ids: [IDS.level], class_group_ids: [IDS.west], teacher_ids: [IDS.other], kind: 'whole_class', institution_id: IDS.institution },
    ],
    teaching_assignment: [
      { id: 'assignment-eng-east', staff_id: IDS.teacher, teaching_group_id: IDS.groups.engEast, role: 'main', valid_from: '2026-01-01', institution_id: IDS.institution },
      { id: 'assignment-mat-east', staff_id: IDS.teacher, teaching_group_id: IDS.groups.matEast, role: 'main', valid_from: '2026-01-01', institution_id: IDS.institution },
      { id: 'assignment-eng-west', staff_id: IDS.other, teaching_group_id: IDS.groups.engWest, role: 'main', valid_from: '2026-01-01', institution_id: IDS.institution },
    ],
    teaching_group_member: LEARNERS.flatMap((learner) =>
      CLASS_AREAS[learner.classGroup].map((area) => ({
        id: `${learner.member}-${area}`,
        teaching_group_id: groupId(area, learner.classGroup),
        enrolment_id: learner.enrolment,
        valid_from: '2026-01-01',
        institution_id: IDS.institution,
      }))
    ),
    learner: LEARNERS.map((learner) => ({
      id: learner.id,
      given_name: learner.given,
      family_name: learner.family,
      admission_number: learner.admission,
      status: 'enrolled',
      name_order: 'given_first',
      gender: 'female',
      residence_status: 'day',
      institution_id: IDS.institution,
    })),
    enrolment: LEARNERS.map((learner) => ({
      id: learner.enrolment,
      learner_id: learner.id,
      academic_year_id: IDS.year,
      programme_id: IDS.programme,
      level_id: IDS.level,
      class_group_id: learner.classGroup,
      status: 'active',
      start_date: '2026-01-01',
      institution_id: IDS.institution,
    })),
    assessment: PERIODS.flatMap((period) =>
      Object.entries(CLASS_AREAS).flatMap(([classGroupId, areas]) =>
        areas.map((area) => ({
          id: assessmentId(period.id, area, classGroupId),
          name: 'End of Term',
          kind: 'end_term',
          scheme_slot: 'ET',
          academic_period_id: period.id,
          learning_area_ids: [AREA_IDS[area]],
          class_group_ids: [classGroupId],
          level_ids: [IDS.level],
          component_ids: [],
          max_score: 100,
          date_window: { start_date: period.start_date, end_date: period.end_date },
          status: 'open',
          grading_scale_id: IDS.scale,
          institution_id: IDS.institution,
        }))
      )
    ),
    mark: PERIODS.flatMap((period) =>
      LEARNERS.flatMap((learner) =>
        CLASS_AREAS[learner.classGroup].flatMap((area) => {
          const score = scores[period.id]?.[learner.key]?.[area];
          if (score === null || score === undefined) return [];
          return [
            {
              id: `mark-${period.id}-${learner.enrolment}-${area}`,
              assessment_id: assessmentId(period.id, area, learner.classGroup),
              enrolment_id: learner.enrolment,
              learning_area_id: AREA_IDS[area],
              score,
              status_code: 'present',
              version: 1,
              institution_id: IDS.institution,
            },
          ];
        })
      )
    ),
    competency: [
      { id: IDS.competencies.communication, programme_id: IDS.programme, code: 'CC', name: 'Communication & Collaboration', kind: 'core_competency', descriptors: [], institution_id: IDS.institution },
      { id: IDS.competencies.thinking, programme_id: IDS.programme, code: 'CT', name: 'Critical Thinking & Problem Solving', kind: 'core_competency', descriptors: [], institution_id: IDS.institution },
    ],
    competency_observation: [
      { id: 'obs-1', enrolment_id: 'enrol-1', learning_area_id: IDS.eng, competency_id: IDS.competencies.communication, rubric_level: 'EE', observed_on: '2026-02-01', institution_id: IDS.institution },
      { id: 'obs-2', enrolment_id: 'enrol-2', learning_area_id: IDS.eng, competency_id: IDS.competencies.communication, rubric_level: 'ME', observed_on: '2026-02-02', institution_id: IDS.institution },
      { id: 'obs-3', enrolment_id: 'enrol-1', learning_area_id: IDS.eng, competency_id: IDS.competencies.thinking, rubric_level: 'AE', observed_on: '2026-02-03', institution_id: IDS.institution },
    ],
    assessment_scheme: [],
    outcome: [],
  };
  return rows as unknown as FakeRepositoryRows;
}

/** A scope that reaches everything, for a head teacher's analysis. */
export const ALL_SCOPE: TeachingScope = {
  groupIds: new Set([IDS.groups.engEast, IDS.groups.matEast, IDS.groups.engWest]),
  staffId: null,
  mode: 'all',
  canWrite: true,
  reason: 'Your role reaches every teaching group.',
};

export interface RequestOptions {
  readonly periodId?: string;
  readonly classGroupId?: string;
  readonly scope?: TeachingScope;
  readonly aggregation?: AggregationDefinition;
  readonly scores?: ScoreTable;
}

/** The same school as a cohort request, so the pure view models read what the page reads. */
export function request(options: RequestOptions = {}): CohortRequest {
  const scores = options.scores ?? DEFAULT_SCORES;
  const periodId = options.periodId ?? IDS.periods.t1;
  const classGroupId = options.classGroupId ?? IDS.east;
  const period = PERIODS.find((candidate) => candidate.id === periodId) ?? PERIODS[0];

  return {
    period: { ...period, academic_year_id: IDS.year },
    classGroup: {
      id: classGroupId,
      name: classGroupId === IDS.east ? 'East' : 'West',
      level_id: IDS.level,
      programme_id: IDS.programme,
      academic_year_id: IDS.year,
    },
    levelName: 'Grade 7',
    scope: options.scope ?? ALL_SCOPE,
    teachingGroups: [
      { id: IDS.groups.engEast, name: 'Grade 7 English East', academic_year_id: IDS.year, learning_area_id: IDS.eng, level_ids: [IDS.level], class_group_ids: [IDS.east], teacher_ids: [IDS.teacher] },
      { id: IDS.groups.matEast, name: 'Grade 7 Mathematics East', academic_year_id: IDS.year, learning_area_id: IDS.mat, level_ids: [IDS.level], class_group_ids: [IDS.east], teacher_ids: [IDS.teacher] },
      { id: IDS.groups.engWest, name: 'Grade 7 English West', academic_year_id: IDS.year, learning_area_id: IDS.eng, level_ids: [IDS.level], class_group_ids: [IDS.west], teacher_ids: [IDS.other] },
    ],
    members: LEARNERS.flatMap((learner) =>
      CLASS_AREAS[learner.classGroup].map((area) => ({
        teaching_group_id: groupId(area, learner.classGroup),
        enrolment_id: learner.enrolment,
        valid_from: '2026-01-01',
        valid_to: null,
      }))
    ),
    assignments: [
      { staff_id: IDS.teacher, teaching_group_id: IDS.groups.engEast, valid_from: '2026-01-01', valid_to: null },
      { staff_id: IDS.teacher, teaching_group_id: IDS.groups.matEast, valid_from: '2026-01-01', valid_to: null },
      { staff_id: IDS.other, teaching_group_id: IDS.groups.engWest, valid_from: '2026-01-01', valid_to: null },
    ],
    assessments: PERIODS.flatMap((candidate) =>
      Object.entries(CLASS_AREAS).flatMap(([classGroup, groupAreas]) =>
        groupAreas.map((area) => ({
          id: assessmentId(candidate.id, area, classGroup),
          name: 'End of Term',
          scheme_slot: 'ET',
          kind: 'end_term',
          max_score: 100,
          status: 'open',
          academic_period_id: candidate.id,
          learning_area_ids: [AREA_IDS[area]],
          class_group_ids: [classGroup],
          level_ids: [IDS.level],
          grading_scale_id: IDS.scale,
        }))
      )
    ),
    learningAreas: AREA_CODES.map((code) => ({
      id: AREA_IDS[code],
      code,
      name: code === 'ENG' ? 'English' : 'Mathematics',
      group: code === 'ENG' ? 'languages' : 'mathematics',
    })),
    schemes: [],
    scalesByRowId: new Map([[IDS.scale, SUBJECT_SCALE]]),
    marks: PERIODS.flatMap((candidate) =>
      LEARNERS.flatMap((learner) =>
        CLASS_AREAS[learner.classGroup].flatMap((area) => {
          const score = scores[candidate.id]?.[learner.key]?.[area];
          if (score === null || score === undefined) return [];
          return [
            {
              assessment_id: assessmentId(candidate.id, area, learner.classGroup),
              enrolment_id: learner.enrolment,
              learning_area_id: AREA_IDS[area],
              score,
              status_code: 'present' as const,
            },
          ];
        })
      )
    ),
    enrolments: LEARNERS.map((learner) => ({ id: learner.enrolment, learner_id: learner.id })),
    learners: LEARNERS.map((learner) => ({
      id: learner.id,
      given_name: learner.given,
      family_name: learner.family,
      admission_number: learner.admission,
    })),
    aggregation: options.aggregation ?? AGGREGATION,
    scales: [SUBJECT_SCALE],
    at: '2026-02-15',
  };
}
