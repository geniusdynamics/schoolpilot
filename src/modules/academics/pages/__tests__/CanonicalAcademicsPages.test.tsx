// ABOUTME: Page tests for the canonical academics screens: each page renders the rows the
// ABOUTME: repository serves, writes back through it, and chooses every reference with an
// ABOUTME: EntityPicker bound to a lookup.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import SubjectsPage from '../SubjectsPage';
import SubjectPapersManagementPage from '../SubjectPapersManagementPage';
import ClassSubjectAllocationsPage from '../ClassSubjectAllocationsPage';
import TeacherSubjectAssignmentPage from '../TeacherSubjectAssignmentPage';
import StudentSubjectEnrollmentPage from '../StudentSubjectEnrollmentPage';
import { createFakeRepository, type FakeRepository } from './canonicalRepositoryDouble';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

const INSTITUTION = '0192a1b2-0000-7000-8000-000000000001';
const PROGRAMME = '0192a1b2-0000-7000-8000-000000000002';
const CAMPUS = '0192a1b2-0000-7000-8000-000000000003';
const YEAR = '0192a1b2-0000-7000-8000-000000000004';
const LEVEL = '0192a1b2-0000-7000-8000-000000000005';
const CLASS_GROUP = '0192a1b2-0000-7000-8000-000000000006';
const AREA = '0192a1b2-0000-7000-8000-000000000007';
const AREA_TWO = '0192a1b2-0000-7000-8000-000000000008';
const STAFF = '0192a1b2-0000-7000-8000-000000000009';
const LEARNER = '0192a1b2-0000-7000-8000-00000000000a';
const ENROLMENT = '0192a1b2-0000-7000-8000-00000000000b';
const GROUP = '0192a1b2-0000-7000-8000-00000000000c';

const baseRows = () => ({
  institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
  programme: [{ id: PROGRAMME, name: 'CBC', status: 'active' }],
  campus: [{ id: CAMPUS, name: 'Main campus', is_main: true, institution_id: INSTITUTION }],
  academic_year: [{ id: YEAR, name: '2026', is_current: true }],
  level: [{ id: LEVEL, name: 'Grade 7', ordinal: 7, is_terminal: false }],
  class_group: [
    {
      id: CLASS_GROUP,
      name: 'East',
      level_id: LEVEL,
      academic_year_id: YEAR,
      campus_id: CAMPUS,
      programme_id: PROGRAMME,
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
      programme_id: PROGRAMME,
      level_ids: [LEVEL],
      pathway_ids: [],
      institution_id: INSTITUTION,
    },
    {
      id: AREA_TWO,
      code: 'ENG',
      name: 'English',
      kind: 'core',
      programme_id: PROGRAMME,
      level_ids: [],
      pathway_ids: [],
      institution_id: INSTITUTION,
    },
  ],
  staff: [
    {
      id: STAFF,
      given_name: 'Jane',
      family_name: 'Wanjiru',
      employee_number: 'T-01',
      institution_id: INSTITUTION,
      department_ids: [],
    },
  ],
  component: [
    {
      id: '0192a1b2-0000-7000-8000-000000000013',
      learning_area_id: AREA,
      code: 'C1',
      name: 'Coursework',
      kind: 'coursework',
      institution_id: INSTITUTION,
    },
  ],
  teaching_assignment: [
    {
      id: '0192a1b2-0000-7000-8000-000000000014',
      staff_id: STAFF,
      teaching_group_id: GROUP,
      role: 'main',
      valid_from: '2025-01-06',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group_member: [
    {
      id: '0192a1b2-0000-7000-8000-000000000015',
      teaching_group_id: GROUP,
      enrolment_id: ENROLMENT,
      valid_from: '2025-01-06',
      institution_id: INSTITUTION,
    },
  ],
  learner: [
    {
      id: LEARNER,
      given_name: 'Amani',
      family_name: 'Otieno',
      admission_number: 'ADM-001',
      institution_id: INSTITUTION,
      status: 'enrolled',
      name_order: 'given_first',
      gender: 'male',
      residence_status: 'day',
    },
  ],
  enrolment: [
    {
      id: ENROLMENT,
      learner_id: LEARNER,
      academic_year_id: YEAR,
      programme_id: PROGRAMME,
      level_id: LEVEL,
      class_group_id: CLASS_GROUP,
      status: 'active',
      start_date: '2026-01-05',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group: [
    {
      id: GROUP,
      name: 'Grade 7 East Mathematics',
      campus_id: CAMPUS,
      academic_year_id: YEAR,
      learning_area_id: AREA,
      level_ids: [LEVEL],
      class_group_ids: [CLASS_GROUP],
      teacher_ids: [STAFF],
      kind: 'whole_class',
      institution_id: INSTITUTION,
    },
  ],
});

let repository: FakeRepository;

function renderPage(page: React.ReactElement) {
  return render(
    <CanonicalRepositoryProvider repository={repository}>{page}</CanonicalRepositoryProvider>
  );
}

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(label) }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  repository = createFakeRepository(baseRows());
});

describe('learning areas page', () => {
  it('renders the learning areas the repository serves', async () => {
    renderPage(<SubjectsPage />);
    expect(await screen.findByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getAllByText('CBC').length).toBeGreaterThan(0);
  });

  it('creates a learning area through the repository with a programme chosen in a picker', async () => {
    renderPage(<SubjectsPage />);
    expect(await screen.findByText('Mathematics')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add learning area/ }));

    fireEvent.change(screen.getByLabelText(/Code/), { target: { value: 'SCI' } });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Science' } });
    await choose('Programme', 'CBC');
    fireEvent.click(screen.getByRole('button', { name: 'Create learning area' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'learning_area',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            programme_id: PROGRAMME,
            code: 'SCI',
            name: 'Science',
            kind: 'core',
            level_ids: [],
            pathway_ids: [],
          }),
        }),
      ])
    );
    expect(await screen.findByText('Science')).toBeTruthy();
  });
});

describe('components page', () => {
  it('creates a component with its learning area chosen in a picker', async () => {
    renderPage(<SubjectPapersManagementPage />);
    expect(await screen.findByText('Mathematics')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add component/ }));

    fireEvent.change(screen.getByLabelText(/Code/), { target: { value: 'P1' } });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Paper 1' } });
    await choose('Learning area', 'Mathematics');
    fireEvent.click(screen.getByRole('button', { name: 'Create component' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'component',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            learning_area_id: AREA,
            code: 'P1',
            name: 'Paper 1',
            kind: 'paper',
          }),
        }),
      ])
    );
  });
});

describe('teaching groups page', () => {
  it('creates a group from a class group and a learning area, keeping the ids as strings', async () => {
    renderPage(<ClassSubjectAllocationsPage />);
    expect(await screen.findByText('Grade 7 East Mathematics')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add teaching group/ }));

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Grade 7 East English' },
    });
    await choose('Class group', 'Grade 7 East');
    await choose('Learning area', 'English');
    fireEvent.click(screen.getByRole('button', { name: 'Create teaching group' }));

    await waitFor(() => {
      const create = repository.writes.find((write) => write.operation === 'create');
      expect(create).toBeTruthy();
      expect(create?.entity).toBe('teaching_group');
      expect(create?.payload).toMatchObject({
        institution_id: INSTITUTION,
        campus_id: CAMPUS,
        academic_year_id: YEAR,
        learning_area_id: AREA_TWO,
        name: 'Grade 7 East English',
        level_ids: [LEVEL],
        class_group_ids: [CLASS_GROUP],
        kind: 'whole_class',
      });
    });
  });

  it('refuses a duplicate group before writing', async () => {
    renderPage(<ClassSubjectAllocationsPage />);
    expect(await screen.findByText('Grade 7 East Mathematics')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add teaching group/ }));

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Grade 7 East Mathematics' },
    });
    await choose('Class group', 'Grade 7 East');
    await choose('Learning area', 'Mathematics');
    fireEvent.click(screen.getByRole('button', { name: 'Create teaching group' }));

    expect(
      await screen.findByText(
        'A teaching group with this name already exists for that learning area and year.'
      )
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });
});

describe('teaching assignments page', () => {
  it('assigns a teacher to a group chosen in pickers and writes through the repository', async () => {
    renderPage(<TeacherSubjectAssignmentPage />);
    expect(await screen.findByText('Jane Wanjiru')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Assign teacher/ }));

    await choose('Teacher', 'Jane Wanjiru');
    await choose('Teaching group', 'Grade 7 East Mathematics · Mathematics');
    fireEvent.click(screen.getByRole('button', { name: 'Create assignment' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'teaching_assignment',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            staff_id: STAFF,
            teaching_group_id: GROUP,
            role: 'main',
          }),
        }),
      ])
    );
  });
});

describe('teaching group membership page', () => {
  it('adds a learner enrolment to a group with both references chosen in pickers', async () => {
    renderPage(<StudentSubjectEnrollmentPage />);
    expect(await screen.findByText('Amani Otieno')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add member/ }));

    await choose('Teaching group', 'Grade 7 East Mathematics · Mathematics');
    await choose('Learner enrolment', 'Amani Otieno · East · active');
    fireEvent.click(screen.getByRole('button', { name: 'Create membership' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'teaching_group_member',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            teaching_group_id: GROUP,
            enrolment_id: ENROLMENT,
          }),
        }),
      ])
    );
  });
});
