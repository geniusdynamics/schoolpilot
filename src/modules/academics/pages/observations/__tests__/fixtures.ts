// ABOUTME: Canonical rows for the observation page tests: a Grade 4 CBC class, its learners,
// ABOUTME: learning area, outcomes and the competencies the pack names.

import type { FakeRepositoryRows } from '../../__tests__/canonicalRepositoryDouble';

export const IDS = {
  institution: 'institution-1',
  programme: 'programme-cbc',
  campus: 'campus-main',
  academicYear: 'year-2026',
  level: 'level-g4',
  classGroup: 'class-east',
  area: 'area-mat',
  outcomeOne: 'outcome-mat1',
  outcomeTwo: 'outcome-mat2',
  outcomeThree: 'outcome-mat3',
  competency: 'competency-cc',
  learnerOne: 'learner-amani',
  learnerTwo: 'learner-baraka',
  learnerThree: 'learner-chebet',
  enrolmentOne: 'enrolment-amani',
  enrolmentTwo: 'enrolment-baraka',
  enrolmentThree: 'enrolment-chebet',
} as const;

export const AREA_ROWS: FakeRepositoryRows = {
  institution: [{ id: IDS.institution, name: 'Greenfields Academy' }],
  programme: [{ id: IDS.programme, name: 'CBC', status: 'active' }],
  campus: [{ id: IDS.campus, name: 'Main campus', is_main: true, institution_id: IDS.institution }],
  academic_year: [{ id: IDS.academicYear, name: '2026', is_current: true }],
  level: [
    {
      id: IDS.level,
      code: 'G4',
      name: 'Grade 4',
      ordinal: 4,
      stage_id: 'stage-up',
      is_terminal: false,
      institution_id: IDS.institution,
    },
  ],
  class_group: [
    {
      id: IDS.classGroup,
      name: 'East',
      level_id: IDS.level,
      programme_id: IDS.programme,
      campus_id: IDS.campus,
      academic_year_id: IDS.academicYear,
      institution_id: IDS.institution,
      homeroom_teacher_ids: [],
    },
  ],
  learning_area: [
    {
      id: IDS.area,
      code: 'MAT',
      name: 'Mathematics',
      kind: 'core',
      programme_id: IDS.programme,
      level_ids: [IDS.level],
      pathway_ids: [],
      institution_id: IDS.institution,
    },
  ],
  learner: [
    {
      id: IDS.learnerOne,
      given_name: 'Amani',
      family_name: 'Otieno',
      admission_number: 'ADM-001',
      institution_id: IDS.institution,
      status: 'enrolled',
      name_order: 'given_first',
      gender: 'male',
      residence_status: 'day',
    },
    {
      id: IDS.learnerTwo,
      given_name: 'Baraka',
      family_name: 'Mwangi',
      admission_number: 'ADM-002',
      institution_id: IDS.institution,
      status: 'enrolled',
      name_order: 'given_first',
      gender: 'female',
      residence_status: 'day',
    },
    {
      id: IDS.learnerThree,
      given_name: 'Chebet',
      family_name: 'Kiptoo',
      admission_number: 'ADM-003',
      institution_id: IDS.institution,
      status: 'enrolled',
      name_order: 'given_first',
      gender: 'female',
      residence_status: 'boarder',
    },
  ],
  enrolment: [
    {
      id: IDS.enrolmentOne,
      learner_id: IDS.learnerOne,
      academic_year_id: IDS.academicYear,
      programme_id: IDS.programme,
      level_id: IDS.level,
      class_group_id: IDS.classGroup,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: IDS.institution,
    },
    {
      id: IDS.enrolmentTwo,
      learner_id: IDS.learnerTwo,
      academic_year_id: IDS.academicYear,
      programme_id: IDS.programme,
      level_id: IDS.level,
      class_group_id: IDS.classGroup,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: IDS.institution,
    },
    {
      id: IDS.enrolmentThree,
      learner_id: IDS.learnerThree,
      academic_year_id: IDS.academicYear,
      programme_id: IDS.programme,
      level_id: IDS.level,
      class_group_id: IDS.classGroup,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: IDS.institution,
    },
  ],
  outcome: [
    {
      id: IDS.outcomeOne,
      learning_area_id: IDS.area,
      level_id: IDS.level,
      code: 'MAT1',
      text: 'Counts and represents numbers to 1000',
      kind: 'strand',
      institution_id: IDS.institution,
    },
    {
      id: IDS.outcomeTwo,
      learning_area_id: IDS.area,
      level_id: IDS.level,
      code: 'MAT2',
      text: 'Adds whole numbers with regrouping',
      kind: 'sub_strand',
      institution_id: IDS.institution,
    },
    {
      id: IDS.outcomeThree,
      learning_area_id: IDS.area,
      level_id: IDS.level,
      code: 'MAT3',
      text: 'Solves one-step word problems',
      kind: 'specific_learning_outcome',
      institution_id: IDS.institution,
    },
  ],
  competency: [
    {
      id: IDS.competency,
      programme_id: IDS.programme,
      code: 'CC',
      name: 'Communication and Collaboration',
      kind: 'core_competency',
      descriptors: [],
      institution_id: IDS.institution,
    },
  ],
};

export interface ObservationSeed {
  readonly id: string;
  readonly enrolmentId: string;
  readonly outcomeId: string;
  readonly level: string;
  readonly observedOn?: string;
  readonly evidence?: string;
  readonly createdAt?: string;
}

/** An observation row shaped the way the page reads it. */
export function observationRow(seed: ObservationSeed) {
  return {
    id: seed.id,
    enrolment_id: seed.enrolmentId,
    learning_area_id: IDS.area,
    outcome_id: seed.outcomeId,
    rubric_level: seed.level,
    observed_on: seed.observedOn ?? '2020-02-01',
    ...(seed.evidence === undefined ? {} : { evidence: seed.evidence }),
    created_at: seed.createdAt ?? '2020-02-01T08:00:00.000Z',
    institution_id: IDS.institution,
  };
}

/** The class's rows plus the observations a test starts with. */
export function rowsWith(observations: readonly ObservationSeed[] = []): FakeRepositoryRows {
  return {
    ...AREA_ROWS,
    competency_observation: observations.map(observationRow),
  };
}
