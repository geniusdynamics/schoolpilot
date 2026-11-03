// ABOUTME: Page test for the exam sessions screen: a session is a canonical assessment, created,
// ABOUTME: edited and deleted through the repository, and it is the same row marks are entered against.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import ExamSessionsPage from '../ExamSessionsPage';
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
const AREA_TWO = '0192a1b2-0000-7000-8000-000000000007';
const ASSESSMENT = '0192a1b2-0000-7000-8000-000000000008';

const seed = () => ({
  institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
  academic_year: [{ id: YEAR, name: '2026', is_current: true }],
  academic_period: [
    {
      id: PERIOD,
      name: 'Term 1',
      academic_year_id: YEAR,
      start_date: '2026-01-05',
      end_date: '2026-04-03',
      status: 'current',
    },
  ],
  level: [{ id: LEVEL, name: 'Grade 7', ordinal: 7 }],
  class_group: [
    {
      id: CLASS_GROUP,
      name: 'East',
      level_id: LEVEL,
      academic_year_id: YEAR,
      institution_id: INSTITUTION,
      homeroom_teacher_ids: [],
    },
  ],
  learning_area: [
    { id: AREA, name: 'Mathematics', code: 'MAT', institution_id: INSTITUTION },
    { id: AREA_TWO, name: 'English', code: 'ENG', institution_id: INSTITUTION },
  ],
  assessment: [
    {
      id: ASSESSMENT,
      institution_id: INSTITUTION,
      academic_period_id: PERIOD,
      kind: 'mid_term',
      name: 'Mid term',
      level_ids: [LEVEL],
      class_group_ids: [CLASS_GROUP],
      learning_area_ids: [AREA],
      component_ids: [],
      status: 'open',
    },
  ],
});

let repository: FakeRepository;

const renderPage = () =>
  render(
    <CanonicalRepositoryProvider repository={repository}>
      <ExamSessionsPage />
    </CanonicalRepositoryProvider>
  );

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(label) }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  repository = createFakeRepository(seed());
});

describe('exam sessions page', () => {
  it('lists the assessments the repository serves and drops the legacy notice', async () => {
    renderPage();

    expect(await screen.findByText('Mid term')).toBeTruthy();
    expect(screen.getByText('Term 1 · 2026')).toBeTruthy();
    expect(screen.queryByTestId('legacy-data-notice')).toBeNull();
    expect(screen.queryByText(/Not connected to your school/i)).toBeNull();
  });

  it('creates a session as an assessment that marks entry will offer', async () => {
    renderPage();
    expect(await screen.findByText('Mid term')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add exam session/i }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'End term' } });
    await choose('Academic period', 'Term 1 · 2026');
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'end_term' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Grade 7' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Grade 7 · East' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create session' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'assessment',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            academic_period_id: PERIOD,
            kind: 'end_term',
            name: 'End term',
            level_ids: [LEVEL],
            class_group_ids: [CLASS_GROUP],
            learning_area_ids: [AREA_TWO],
            component_ids: [],
            status: 'open',
          }),
        }),
      ])
    );
    expect(await screen.findByText('End term')).toBeTruthy();
  });

  it('changes the status of an assessment through the repository', async () => {
    renderPage();
    expect(await screen.findByText('Mid term')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'closed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save session' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'update',
          entity: 'assessment',
          id: ASSESSMENT,
          payload: expect.objectContaining({ status: 'closed' }),
        }),
      ])
    );
  });

  it('refuses a session without a learning area, because marks entry never offers it', async () => {
    renderPage();
    expect(await screen.findByText('Mid term')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add exam session/i }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'End term' } });
    await choose('Academic period', 'Term 1 · 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Create session' }));

    expect(
      await screen.findByText('Choose at least one learning area: marks entry offers a session per learning area.')
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });
});
