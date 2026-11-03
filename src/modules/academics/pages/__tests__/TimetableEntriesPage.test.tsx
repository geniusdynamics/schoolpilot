// ABOUTME: Page test for the timetable entries screen: an entry places a canonical teaching group
// ABOUTME: in a canonical timetable slot, and the screen reads and writes timetable_entry rows only.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import TimetableEntriesPage from '../TimetableEntriesPage';
import { createFakeRepository, type FakeRepository } from './canonicalRepositoryDouble';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

const INSTITUTION = '0192a1b2-0000-7000-8000-000000000001';
const SLOT = '0192a1b2-0000-7000-8000-000000000002';
const SLOT_TWO = '0192a1b2-0000-7000-8000-000000000003';
const GROUP = '0192a1b2-0000-7000-8000-000000000004';
const GROUP_TWO = '0192a1b2-0000-7000-8000-000000000005';
const ENTRY = '0192a1b2-0000-7000-8000-000000000006';

const slot = (id: string, day: string, start: string, end: string) => ({
  id,
  institution_id: INSTITUTION,
  day_of_week: day,
  start_time: start,
  end_time: end,
});

const seed = () => ({
  institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
  timetable_slot: [slot(SLOT, 'monday', '08:00', '08:40'), slot(SLOT_TWO, 'tuesday', '08:00', '08:40')],
  teaching_group: [
    { id: GROUP, name: 'Grade 7 East Mathematics', institution_id: INSTITUTION },
    { id: GROUP_TWO, name: 'Grade 7 East English', institution_id: INSTITUTION },
  ],
  timetable_entry: [
    {
      id: ENTRY,
      institution_id: INSTITUTION,
      slot_id: SLOT,
      teaching_group_id: GROUP,
      room: 'Lab 1',
    },
  ],
});

let repository: FakeRepository;

const renderPage = () =>
  render(
    <CanonicalRepositoryProvider repository={repository}>
      <TimetableEntriesPage />
    </CanonicalRepositoryProvider>
  );

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(label) }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  repository = createFakeRepository(seed());
});

describe('timetable entries page', () => {
  it('lists the entries the repository serves with their slot, group and room', async () => {
    renderPage();

    expect(await screen.findByText('Grade 7 East Mathematics')).toBeTruthy();
    expect(screen.getByText(/Monday 08:00/)).toBeTruthy();
    expect(screen.getByText('Lab 1')).toBeTruthy();
    expect(screen.queryByTestId('legacy-data-notice')).toBeNull();
    expect(screen.queryByText(/Not connected to your school/i)).toBeNull();
  });

  it('places a group in a slot and writes it through the repository', async () => {
    renderPage();
    expect(await screen.findByText('Grade 7 East Mathematics')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add entry/i }));
    await choose('Period', 'Tuesday 08:00');
    await choose('Teaching group', 'Grade 7 East English');
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'Room 12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create entry' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'timetable_entry',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            slot_id: SLOT_TWO,
            teaching_group_id: GROUP_TWO,
            room: 'Room 12',
          }),
        }),
      ])
    );
  });

  it('refuses a second entry for the same group in the same slot', async () => {
    renderPage();
    expect(await screen.findByText('Grade 7 East Mathematics')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add entry/i }));
    await choose('Period', 'Monday 08:00');
    await choose('Teaching group', 'Grade 7 East Mathematics');
    fireEvent.click(screen.getByRole('button', { name: 'Create entry' }));

    expect(
      await screen.findByText('This teaching group is already placed in that period.')
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });

  it('asks for a period before an entry can be placed when the school day is empty', async () => {
    repository = createFakeRepository({
      institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
      timetable_slot: [],
      teaching_group: [],
    });
    renderPage();

    expect(
      await screen.findByText(
        'No timetable entries yet. Define the school-day periods first, then place a teaching group in one.'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add entry/i })).toBeNull();
  });
});
