// ABOUTME: The register follows the teaching group the picker hands it: two groups of the same
// ABOUTME: learning area list their own members, and the id is kept as the opaque string it is.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import StudentExamResultsEntryPage from '../StudentExamResultsEntryPage';
import { createFakeRepository, type FakeRepository } from './canonicalRepositoryDouble';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

const INSTITUTION = '0192a1b2-0000-7000-8000-000000000001';
const PERIOD = '0192a1b2-0000-7000-8000-000000000002';
const YEAR = '0192a1b2-0000-7000-8000-000000000003';
const LEVEL = '0192a1b2-0000-7000-8000-000000000004';
const CLASS_GROUP = '0192a1b2-0000-7000-8000-000000000005';
const AREA = '0192a1b2-0000-7000-8000-000000000006';
const ASSESSMENT = '0192a1b2-0000-7000-8000-000000000007';
const GROUP_EAST = '0192a1b2-0000-7000-8000-000000000008';
const GROUP_WEST = '0192a1b2-0000-7000-8000-000000000009';

const people = [
  { id: '0192a1b2-0000-7000-8000-00000000000a', given: 'Amani', family: 'Otieno', admission: 'ADM-001' },
  { id: '0192a1b2-0000-7000-8000-00000000000b', given: 'Bello', family: 'Mwangi', admission: 'ADM-002' },
];

const rows = () => ({
  institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
  academic_period: [
    {
      id: PERIOD,
      name: 'Term 1',
      academic_year_id: YEAR,
      start_date: '2026-01-05',
      end_date: '2026-04-03',
      kind: 'term',
      is_current: true,
      institution_id: INSTITUTION,
    },
  ],
  level: [
    {
      id: LEVEL,
      name: 'Grade 7',
      ordinal: 7,
      is_terminal: false,
      stage_id: '0192a1b2-0000-7000-8000-00000000000c',
      institution_id: INSTITUTION,
    },
  ],
  class_group: [
    {
      id: CLASS_GROUP,
      name: 'East',
      level_id: LEVEL,
      academic_year_id: YEAR,
      campus_id: '0192a1b2-0000-7000-8000-00000000000d',
      programme_id: '0192a1b2-0000-7000-8000-00000000000e',
      institution_id: INSTITUTION,
      homeroom_teacher_ids: [],
    },
  ],
  learning_area: [
    {
      id: AREA,
      code: 'MAT',
      name: 'Mathematics',
      kind: 'core',
      programme_id: '0192a1b2-0000-7000-8000-00000000000e',
      level_ids: [LEVEL],
      pathway_ids: [],
      institution_id: INSTITUTION,
    },
  ],
  assessment: [
    {
      id: ASSESSMENT,
      name: 'End of Term 1',
      kind: 'end_term',
      academic_period_id: PERIOD,
      learning_area_ids: [AREA],
      class_group_ids: [CLASS_GROUP],
      level_ids: [LEVEL],
      component_ids: [],
      max_score: 100,
      status: 'open',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group: [
    {
      id: GROUP_EAST,
      name: 'Grade 7 East Mathematics',
      campus_id: '0192a1b2-0000-7000-8000-00000000000d',
      academic_year_id: YEAR,
      learning_area_id: AREA,
      level_ids: [LEVEL],
      class_group_ids: [CLASS_GROUP],
      teacher_ids: [],
      kind: 'set',
      institution_id: INSTITUTION,
    },
    {
      id: GROUP_WEST,
      name: 'Grade 7 West Mathematics',
      campus_id: '0192a1b2-0000-7000-8000-00000000000d',
      academic_year_id: YEAR,
      learning_area_id: AREA,
      level_ids: [LEVEL],
      class_group_ids: [CLASS_GROUP],
      teacher_ids: [],
      kind: 'set',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group_member: [
    {
      id: '0192a1b2-0000-7000-8000-00000000000f',
      teaching_group_id: GROUP_EAST,
      enrolment_id: '0192a1b2-0000-7000-8000-000000000010',
      valid_from: '2026-01-05',
      institution_id: INSTITUTION,
    },
    {
      id: '0192a1b2-0000-7000-8000-000000000011',
      teaching_group_id: GROUP_WEST,
      enrolment_id: '0192a1b2-0000-7000-8000-000000000012',
      valid_from: '2026-01-05',
      institution_id: INSTITUTION,
    },
  ],
  learner: people.map((person) => ({
    id: person.id,
    given_name: person.given,
    family_name: person.family,
    admission_number: person.admission,
    institution_id: INSTITUTION,
    status: 'enrolled',
    name_order: 'given_first',
    gender: 'male',
    residence_status: 'day',
  })),
  enrolment: [
    {
      id: '0192a1b2-0000-7000-8000-000000000010',
      learner_id: people[0].id,
      academic_year_id: YEAR,
      programme_id: '0192a1b2-0000-7000-8000-00000000000e',
      level_id: LEVEL,
      class_group_id: CLASS_GROUP,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: INSTITUTION,
    },
    {
      id: '0192a1b2-0000-7000-8000-000000000012',
      learner_id: people[1].id,
      academic_year_id: YEAR,
      programme_id: '0192a1b2-0000-7000-8000-00000000000e',
      level_id: LEVEL,
      class_group_id: CLASS_GROUP,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: INSTITUTION,
    },
  ],
  mark: [],
});

let repository: FakeRepository;

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(label) }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  repository = createFakeRepository(rows());
});

describe('marks entry follows the selected teaching group', () => {
  it('lists the members of the group the picker handed over, and only those', async () => {
    render(
      <CanonicalRepositoryProvider repository={repository}>
        <StudentExamResultsEntryPage />
      </CanonicalRepositoryProvider>
    );
    await choose('Assessment', 'End of Term 1 (end term)');
    await choose('Teaching group', 'Grade 7 East Mathematics');
    expect(await screen.findByText('Amani Otieno')).toBeTruthy();
    expect(screen.queryByText('Bello Mwangi')).toBeNull();

    await choose('Teaching group', 'Grade 7 West Mathematics');
    await waitFor(() => expect(screen.getByText('Bello Mwangi')).toBeTruthy());
    expect(screen.queryByText('Amani Otieno')).toBeNull();
  });
});
