// ABOUTME: Browser harness for the mark entry grid: the real page, over an in-memory repository,
// ABOUTME: so the paste-and-save path runs in Chromium without a database or a login.

import React from 'react';
import { createRoot } from 'react-dom/client';

import { CanonicalRepositoryProvider } from '@/modules/academics/data/canonicalRepository';
import { MarkEntryV2PageContent } from '@/modules/academics/pages/marks';
import { createFakeRepository } from '@/modules/academics/pages/__tests__/canonicalRepositoryDouble';

const INSTITUTION = 'inst-0001';
const PROGRAMME = 'programme-0001';
const YEAR = 'year-0001';
const PERIOD = 'period-0001';
const LEVEL = 'level-0001';
const CLASS = 'class-0001';
const AREA = 'area-english';
const GROUP = 'group-blue';
const STAFF = 'staff-teacher';
const USER = 'user-teacher';

const LEARNERS = [
  { learner: 'learner-1', enrolment: 'enrol-1', member: 'member-1', given: 'Amani', family: 'Otieno', admission: 'ADM-001' },
  { learner: 'learner-2', enrolment: 'enrol-2', member: 'member-2', given: 'Bello', family: 'Mwangi', admission: 'ADM-002' },
  { learner: 'learner-3', enrolment: 'enrol-3', member: 'member-3', given: 'Chiku', family: 'Njeri', admission: 'ADM-003' },
];

const repository = createFakeRepository({
  institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
  programme: [{ id: PROGRAMME, name: 'Junior Secondary', institution_id: INSTITUTION }],
  academic_year: [
    {
      id: YEAR,
      name: '2026',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'current',
      institution_id: INSTITUTION,
    },
  ],
  academic_period: [
    {
      id: PERIOD,
      name: 'Term 1',
      academic_year_id: YEAR,
      kind: 'term',
      sequence: 1,
      start_date: '2026-01-05',
      end_date: '2026-04-03',
      is_reporting: true,
      is_billing: true,
      status: 'current',
      institution_id: INSTITUTION,
    },
  ],
  level: [{ id: LEVEL, name: 'Grade 7', ordinal: 7, is_terminal: false, institution_id: INSTITUTION }],
  class_group: [
    {
      id: CLASS,
      name: 'East',
      level_id: LEVEL,
      academic_year_id: YEAR,
      campus_id: 'campus-0001',
      programme_id: PROGRAMME,
      institution_id: INSTITUTION,
      homeroom_teacher_ids: [],
    },
  ],
  learning_area: [
    {
      id: AREA,
      code: 'ENG',
      name: 'English',
      kind: 'core',
      programme_id: PROGRAMME,
      level_ids: [LEVEL],
      pathway_ids: [],
      institution_id: INSTITUTION,
    },
  ],
  staff: [
    {
      id: STAFF,
      user_id: USER,
      given_name: 'Grace',
      family_name: 'Wekesa',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group: [
    {
      id: GROUP,
      name: 'Grade 7 English Blue',
      campus_id: 'campus-0001',
      academic_year_id: YEAR,
      learning_area_id: AREA,
      level_ids: [LEVEL],
      class_group_ids: [CLASS],
      teacher_ids: [STAFF],
      kind: 'whole_class',
      institution_id: INSTITUTION,
    },
  ],
  teaching_assignment: [
    {
      id: 'assignment-1',
      staff_id: STAFF,
      teaching_group_id: GROUP,
      role: 'main',
      valid_from: '2026-01-05',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group_member: LEARNERS.map((row) => ({
    id: row.member,
    teaching_group_id: GROUP,
    enrolment_id: row.enrolment,
    valid_from: '2026-01-05',
    institution_id: INSTITUTION,
  })),
  learner: LEARNERS.map((row) => ({
    id: row.learner,
    given_name: row.given,
    family_name: row.family,
    admission_number: row.admission,
    status: 'enrolled',
    name_order: 'given_first',
    gender: 'female',
    residence_status: 'day',
    institution_id: INSTITUTION,
  })),
  enrolment: LEARNERS.map((row) => ({
    id: row.enrolment,
    learner_id: row.learner,
    academic_year_id: YEAR,
    programme_id: PROGRAMME,
    level_id: LEVEL,
    class_group_id: CLASS,
    status: 'active',
    start_date: '2026-01-05',
    institution_id: INSTITUTION,
  })),
  assessment: [
    {
      id: 'assessment-cat',
      name: 'CAT 1',
      kind: 'cat',
      scheme_slot: 'CAT',
      academic_period_id: PERIOD,
      learning_area_ids: [AREA],
      class_group_ids: [CLASS],
      level_ids: [LEVEL],
      component_ids: [],
      max_score: 20,
      date_window: { start_date: '2026-02-02', end_date: '2026-02-06' },
      status: 'open',
      institution_id: INSTITUTION,
    },
    {
      id: 'assessment-et',
      name: 'End of Term',
      kind: 'end_term',
      scheme_slot: 'ET',
      academic_period_id: PERIOD,
      learning_area_ids: [AREA],
      class_group_ids: [CLASS],
      level_ids: [LEVEL],
      component_ids: [],
      max_score: 100,
      date_window: { start_date: '2026-03-23', end_date: '2026-03-27' },
      status: 'open',
      institution_id: INSTITUTION,
    },
  ],
  mark: [],
});

declare global {
  interface Window {
    __marks?: {
      writes: () => number;
      scores: () => string[];
    };
  }
}

window.__marks = {
  writes: () => repository.writes.length,
  scores: () =>
    repository.writes.map((write) => String((write.payload as Record<string, unknown> | undefined)?.score ?? '')),
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <CanonicalRepositoryProvider repository={repository}>
    <MarkEntryV2PageContent actorId={USER} role="teacher" debounceMs={0} />
  </CanonicalRepositoryProvider>
);
