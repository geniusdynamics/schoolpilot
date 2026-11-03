// ABOUTME: Page test for exam scheduling: the window and the learning areas of a canonical
// ABOUTME: assessment are set here, on the same rows the exam sessions screen lists.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import ExamSchedulingPage from '../ExamSchedulingPage';
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
  learning_area: [
    { id: AREA, name: 'Mathematics', code: 'MAT', institution_id: INSTITUTION },
    { id: AREA_TWO, name: 'English', code: 'ENG', institution_id: INSTITUTION },
  ],
  assessment: [
    {
      id: ASSESSMENT,
      institution_id: INSTITUTION,
      academic_period_id: PERIOD,
      kind: 'end_term',
      name: 'End term',
      level_ids: [],
      class_group_ids: [],
      learning_area_ids: [AREA],
      component_ids: [],
      date_window: { start_date: '2026-03-02', end_date: '2026-03-13' },
      status: 'open',
    },
  ],
});

let repository: FakeRepository;

const renderPage = () =>
  render(
    <CanonicalRepositoryProvider repository={repository}>
      <ExamSchedulingPage />
    </CanonicalRepositoryProvider>
  );

beforeEach(() => {
  repository = createFakeRepository(seed());
});

describe('exam scheduling page', () => {
  it('lists the assessments with the window the model holds and drops the legacy notice', async () => {
    renderPage();

    expect(await screen.findByText('End term')).toBeTruthy();
    expect(screen.getByText('2026-03-02 → 2026-03-13')).toBeTruthy();
    expect(screen.queryByTestId('legacy-data-notice')).toBeNull();
    expect(screen.queryByText(/Not connected to your school/i)).toBeNull();
    expect(
      screen.getByText(
        'The model holds one date window for the assessment; per-paper times and rooms are not modelled yet.'
      )
    ).toBeTruthy();
  });

  it('saves the window and the learning areas it covers through the repository', async () => {
    renderPage();
    expect(await screen.findByText('End term')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    fireEvent.change(screen.getByLabelText('Window start'), {
      target: { value: '2026-03-16' },
    });
    fireEvent.change(screen.getByLabelText('Window end'), { target: { value: '2026-03-27' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save window' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'update',
          entity: 'assessment',
          id: ASSESSMENT,
          payload: expect.objectContaining({
            date_window: { start_date: '2026-03-16', end_date: '2026-03-27' },
            learning_area_ids: [AREA, AREA_TWO],
          }),
        }),
      ])
    );
  });

  it('refuses a window that ends before it starts, before any write', async () => {
    renderPage();
    expect(await screen.findByText('End term')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    fireEvent.change(screen.getByLabelText('Window start'), {
      target: { value: '2026-03-16' },
    });
    fireEvent.change(screen.getByLabelText('Window end'), { target: { value: '2026-03-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save window' }));

    expect(
      await screen.findByText('The window must end on or after the day it starts.')
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });

  it('says so honestly when the school has never set an assessment up', async () => {
    repository = createFakeRepository({
      institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
      assessment: [],
    });
    renderPage();

    expect(
      await screen.findByText('No exam sessions yet. Create one on the Exam Sessions tab first.')
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Schedule' })).toBeNull();
  });
});
