// ABOUTME: Page test for the timetable periods screen: the school-day slots are canonical
// ABOUTME: timetable_slot rows, created, edited and deleted through the repository, and the
// ABOUTME: screen carries no legacy-data notice.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import TimetablePeriodsPage from '../TimetablePeriodsPage';
import { createFakeRepository, type FakeRepository } from './canonicalRepositoryDouble';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

const INSTITUTION = '0192a1b2-0000-7000-8000-000000000001';
const SLOT = '0192a1b2-0000-7000-8000-000000000002';

const seed = () => ({
  institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
  timetable_slot: [
    {
      id: SLOT,
      institution_id: INSTITUTION,
      day_of_week: 'monday',
      period_number: 1,
      start_time: '08:00',
      end_time: '08:40',
    },
  ],
});

let repository: FakeRepository;

const renderPage = () =>
  render(
    <CanonicalRepositoryProvider repository={repository}>
      <TimetablePeriodsPage />
    </CanonicalRepositoryProvider>
  );

const choose = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

beforeEach(() => {
  repository = createFakeRepository(seed());
});

describe('timetable periods page', () => {
  it('lists the school-day slots the repository serves and drops the legacy notice', async () => {
    renderPage();

    expect(await screen.findByText('Monday')).toBeTruthy();
    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getByText('08:40')).toBeTruthy();
    expect(screen.queryByTestId('legacy-data-notice')).toBeNull();
    expect(screen.queryByText(/Not connected to your school/i)).toBeNull();
  });

  it('creates a slot for a weekday and writes it through the repository', async () => {
    renderPage();
    expect(await screen.findByText('Monday')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add period/i }));
    choose('Day', 'tuesday');
    fireEvent.change(screen.getByLabelText('Period number'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '09:40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create period' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'timetable_slot',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            day_of_week: 'tuesday',
            period_number: 2,
            start_time: '09:00',
            end_time: '09:40',
          }),
        }),
      ])
    );
    expect(await screen.findByText('Tuesday')).toBeTruthy();
  });

  it('refuses a slot that ends before it starts, before any write', async () => {
    renderPage();
    expect(await screen.findByText('Monday')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add period/i }));
    choose('Day', 'wednesday');
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create period' }));

    expect(await screen.findByText('The end time must be after the start time.')).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });

  it('refuses a second slot starting at the same time on the same day', async () => {
    renderPage();
    expect(await screen.findByText('Monday')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add period/i }));
    choose('Day', 'monday');
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '08:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create period' }));

    expect(
      await screen.findByText('A period already starts at this time on this day.')
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });
});
