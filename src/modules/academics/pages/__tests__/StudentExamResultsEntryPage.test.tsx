// ABOUTME: Marks entry page tests: the register reads its members from the repository, saves a
// ABOUTME: mark through it, and shows the duplicate, outside-group and stale refusals it raises.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RepositoryConflictError,
  RepositoryInvariantError,
  fieldIssue,
} from '@/data/repository';

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
const GROUP = '0192a1b2-0000-7000-8000-000000000007';
const ASSESSMENT = '0192a1b2-0000-7000-8000-000000000008';
const LEARNER_A = '0192a1b2-0000-7000-8000-000000000009';
const LEARNER_B = '0192a1b2-0000-7000-8000-00000000000a';
const ENROLMENT_A = '0192a1b2-0000-7000-8000-00000000000b';
const ENROLMENT_B = '0192a1b2-0000-7000-8000-00000000000c';
const MEMBER_A = '0192a1b2-0000-7000-8000-00000000000d';
const MEMBER_B = '0192a1b2-0000-7000-8000-00000000000e';
const MARK_A = '0192a1b2-0000-7000-8000-00000000000f';

const learner = (id: string, given: string, family: string, admission: string) => ({
  id,
  given_name: given,
  family_name: family,
  admission_number: admission,
  institution_id: INSTITUTION,
  status: 'enrolled',
  name_order: 'given_first',
  gender: 'male',
  residence_status: 'day',
});

const enrolment = (id: string, learnerId: string) => ({
  id,
  learner_id: learnerId,
  academic_year_id: YEAR,
  programme_id: '0192a1b2-0000-7000-8000-000000000010',
  level_id: LEVEL,
  class_group_id: CLASS_GROUP,
  status: 'active',
  start_date: '2026-01-05',
  institution_id: INSTITUTION,
});

const member = (id: string, enrolmentId: string) => ({
  id,
  teaching_group_id: GROUP,
  enrolment_id: enrolmentId,
  valid_from: '2026-01-05',
  institution_id: INSTITUTION,
});

const seed = (): Parameters<typeof createFakeRepository>[0] => ({
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
  level: [{ id: LEVEL, name: 'Grade 7', ordinal: 7, is_terminal: false, stage_id: '0192a1b2-0000-7000-8000-000000000011', institution_id: INSTITUTION }],
  class_group: [
    {
      id: CLASS_GROUP,
      name: 'East',
      level_id: LEVEL,
      academic_year_id: YEAR,
      campus_id: '0192a1b2-0000-7000-8000-000000000012',
      programme_id: '0192a1b2-0000-7000-8000-000000000010',
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
      programme_id: '0192a1b2-0000-7000-8000-000000000010',
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
      date_window: { start_date: '2026-03-02', end_date: '2026-03-06' },
      status: 'open',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group: [
    {
      id: GROUP,
      name: 'Grade 7 East Mathematics',
      campus_id: '0192a1b2-0000-7000-8000-000000000012',
      academic_year_id: YEAR,
      learning_area_id: AREA,
      level_ids: [LEVEL],
      class_group_ids: [CLASS_GROUP],
      teacher_ids: [],
      kind: 'whole_class',
      institution_id: INSTITUTION,
    },
  ],
  teaching_group_member: [member(MEMBER_A, ENROLMENT_A), member(MEMBER_B, ENROLMENT_B)],
  learner: [
    learner(LEARNER_A, 'Amani', 'Otieno', 'ADM-001'),
    learner(LEARNER_B, 'Bello', 'Mwangi', 'ADM-002'),
  ],
  enrolment: [enrolment(ENROLMENT_A, LEARNER_A), enrolment(ENROLMENT_B, LEARNER_B)],
  mark: [],
});

let repository: FakeRepository;

function renderPage() {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <StudentExamResultsEntryPage />
    </CanonicalRepositoryProvider>
  );
}

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(label) }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

async function openRegister() {
  renderPage();
  await choose('Assessment', 'End of Term 1 (end term)');
  await choose('Teaching group', 'Grade 7 East Mathematics');
  expect(await screen.findByText('Amani Otieno')).toBeTruthy();
}

beforeEach(() => {
  repository = createFakeRepository(seed());
});

describe('marks entry', () => {
  it('lists the members the repository serves and creates a mark for the entered score', async () => {
    await openRegister();

    fireEvent.change(screen.getByLabelText('Score for Amani Otieno'), {
      target: { value: '78' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save marks' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'mark',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            assessment_id: ASSESSMENT,
            enrolment_id: ENROLMENT_A,
            learning_area_id: AREA,
            score: '78',
            status_code: 'present',
            version: 1,
          }),
        }),
      ])
    );
  });

  it('updates a stored mark with the version the row carries', async () => {
    repository = createFakeRepository({
      ...seed(),
      mark: [
        {
          id: MARK_A,
          assessment_id: ASSESSMENT,
          enrolment_id: ENROLMENT_A,
          learning_area_id: AREA,
          score: '70',
          status_code: 'present',
          version: 1,
          institution_id: INSTITUTION,
          rowVersion: 3,
        },
      ],
    });
    await openRegister();

    const input = screen.getByLabelText('Score for Amani Otieno');
    expect((input as HTMLInputElement).value).toBe('70');
    fireEvent.change(input, { target: { value: '82' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save marks' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'update',
          entity: 'mark',
          id: MARK_A,
          payload: expect.objectContaining({ score: '82', version: 2 }),
        }),
      ])
    );
  });

  it('blocks a score above the assessment maximum without writing', async () => {
    await openRegister();
    fireEvent.change(screen.getByLabelText('Score for Amani Otieno'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save marks' }));

    expect(
      await screen.findByText('A score cannot be above the assessment maximum of 100.')
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });

  it('shows the duplicate refusal the repository raises', async () => {
    repository.failNext(
      new RepositoryConflictError('mark', 'unique', 'A mark already holds this key', {
        columns: ['assessment_id', 'enrolment_id', 'learning_area_id'],
      })
    );
    await openRegister();
    fireEvent.change(screen.getByLabelText('Score for Amani Otieno'), {
      target: { value: '78' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save marks' }));

    expect(
      await screen.findByText(
        /A mark already exists for this learner in this assessment and learning area/
      )
    ).toBeTruthy();
  });

  it('shows the outside-group refusal the repository raises', async () => {
    repository.failNext(
      new RepositoryInvariantError('mark', 'mark.teaching_group_membership', [
        fieldIssue(
          'enrolment_id',
          'the enrolment is not a member of a teaching group for this learning area on the assessment date'
        ),
      ])
    );
    await openRegister();
    fireEvent.change(screen.getByLabelText('Score for Amani Otieno'), {
      target: { value: '78' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save marks' }));

    expect(
      await screen.findByText(
        /This learner is not a member of the selected teaching group for this learning area on the assessment date/
      )
    ).toBeTruthy();
  });

  it('shows the stale-write refusal the repository raises', async () => {
    repository.failNext(
      new RepositoryConflictError('mark', 'stale_version', 'The mark moved on', {
        expectedVersion: 1,
        actualVersion: 2,
      })
    );
    await openRegister();
    fireEvent.change(screen.getByLabelText('Score for Amani Otieno'), {
      target: { value: '78' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save marks' }));

    expect(
      await screen.findByText(
        /This mark was changed by someone else after it was loaded. Reload the register/
      )
    ).toBeTruthy();
  });

  it('refuses to clear a stored score, which the mark schema cannot express', async () => {
    repository = createFakeRepository({
      ...seed(),
      mark: [
        {
          id: MARK_A,
          assessment_id: ASSESSMENT,
          enrolment_id: ENROLMENT_A,
          learning_area_id: AREA,
          score: '70',
          status_code: 'present',
          version: 1,
          institution_id: INSTITUTION,
          rowVersion: 1,
        },
      ],
    });
    await openRegister();
    fireEvent.change(screen.getByLabelText('Score for Amani Otieno'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save marks' }));

    expect(await screen.findByText(/The stored score cannot be cleared/)).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });
});
