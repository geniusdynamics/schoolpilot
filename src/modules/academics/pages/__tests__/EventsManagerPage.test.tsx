// ABOUTME: Page tests for the school events screen: it renders the canonical calendar's events,
// ABOUTME: offers the school's first calendar when none exists, writes events through the
// ABOUTME: repository, and hides the write controls from a role without reference.write.

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bindSessionAuthority } from '@/data/auth/sessionAuthority';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { eventPhase } from '../../data/calendarEvents';
import EventsManagerPage from '../EventsManagerPage';
import { createFakeRepository, type FakeRepository } from './canonicalRepositoryDouble';

const INSTITUTION = '0192a1b2-0000-7000-8000-000000000001';
const CALENDAR = '0192a1b2-0000-7000-8000-0000000000c1';
const YEAR = '0192a1b2-0000-7000-8000-0000000000e1';
const PAST_EVENT = '0192a1b2-0000-7000-8000-0000000000a1';
const FUTURE_EVENT = '0192a1b2-0000-7000-8000-0000000000a2';

const institutionRow = () => ({ id: INSTITUTION, name: 'Greenfields Academy' });

const calendarRows = () => ({
  institution: [institutionRow()],
  calendar: [
    { id: CALENDAR, institution_id: INSTITUTION, name: 'School calendar', programme_ids: [] },
  ],
  academic_year: [
    {
      id: YEAR,
      institution_id: INSTITUTION,
      calendar_id: CALENDAR,
      name: '2026',
      start_date: '2026-01-05',
      end_date: '2026-12-04',
      status: 'current',
    },
  ],
  // 2001 is unambiguously past and 2099 unambiguously future, whatever day the suite runs.
  calendar_event: [
    {
      id: PAST_EVENT,
      institution_id: INSTITUTION,
      calendar_id: CALENDAR,
      kind: 'holiday',
      start_date: '2001-03-01',
      end_date: '2001-03-02',
      affects_attendance: false,
    },
    {
      id: FUTURE_EVENT,
      institution_id: INSTITUTION,
      calendar_id: CALENDAR,
      kind: 'exam_window',
      start_date: '2099-03-01',
      end_date: '2099-03-05',
      affects_attendance: true,
    },
  ],
});

let repository: FakeRepository;

function renderPage() {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <EventsManagerPage />
    </CanonicalRepositoryProvider>
  );
}

beforeEach(() => {
  repository = createFakeRepository(calendarRows());
});

afterEach(() => {
  // Leave the authority as a writer, so a test that bound a read-only role cannot leak into
  // the tests that run after it in this file.
  bindSessionAuthority({
    actorId: '0192a1b2-0000-7000-8000-0000000000ff',
    roles: ['administrator'],
    scope: { institutionId: INSTITUTION, grants: [] },
    at: '2026-11-03',
  });
});

describe('event phases', () => {
  it('tells a finished event from a running one and one still to come', () => {
    expect(eventPhase('2026-01-01', '2026-01-02', '2026-03-01')).toBe('past');
    // An event that ends today is still running, not past.
    expect(eventPhase('2026-02-25', '2026-03-01', '2026-03-01')).toBe('current');
    expect(eventPhase('2026-03-01', '2026-03-01', '2026-03-01')).toBe('current');
    expect(eventPhase('2026-03-02', '2026-03-04', '2026-03-01')).toBe('upcoming');
  });
});

describe('school events', () => {
  it('lists the calendar events ordered by start date, with past and upcoming told apart', async () => {
    renderPage();

    expect(await screen.findByText('holiday')).toBeTruthy();
    expect(screen.getByText('exam window')).toBeTruthy();
    expect(screen.getByText('School calendar')).toBeTruthy();

    const rows = screen.getAllByRole('row');
    const rowFor = (label: string) =>
      rows.findIndex((row) => within(row).queryByText(label) !== null);

    expect(rowFor('holiday')).toBeGreaterThan(0);
    expect(rowFor('holiday')).toBeLessThan(rowFor('exam window'));
    expect(within(rows[rowFor('holiday')]).getByText('Past')).toBeTruthy();
    expect(within(rows[rowFor('exam window')]).getByText('Upcoming')).toBeTruthy();
  });

  it('says plainly that the model records a kind and dates, not a title', async () => {
    renderPage();
    expect(
      await screen.findByText(
        'The calendar records an event by its kind and dates. It has no free-text title.'
      )
    ).toBeTruthy();
  });

  it('creates an event for the calendar with kind, dates and attendance', async () => {
    renderPage();
    expect(await screen.findByText('holiday')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add event/ }));
    fireEvent.change(screen.getByLabelText(/^Kind/), { target: { value: 'staff_day' } });
    fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: '2099-05-01' } });
    fireEvent.change(screen.getByLabelText(/^End date/), { target: { value: '2099-05-02' } });
    fireEvent.click(screen.getByLabelText(/Affects attendance/));
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() =>
      expect(repository.writes).toEqual([
        expect.objectContaining({
          operation: 'create',
          entity: 'calendar_event',
          payload: expect.objectContaining({
            institution_id: INSTITUTION,
            calendar_id: CALENDAR,
            kind: 'staff_day',
            start_date: '2099-05-01',
            end_date: '2099-05-02',
            affects_attendance: true,
          }),
        }),
      ])
    );
    expect(await screen.findByText('staff day')).toBeTruthy();
  });

  it('shows an honest empty state for a calendar with no events', async () => {
    repository = createFakeRepository({ ...calendarRows(), calendar_event: [] });
    renderPage();

    expect(await screen.findByText('No events in this calendar yet.')).toBeTruthy();
  });
});

describe('the school’s first calendar', () => {
  it('offers to create the calendar and the academic year it covers, then writes both', async () => {
    repository = createFakeRepository({ institution: [institutionRow()] });
    renderPage();

    expect(await screen.findByText('This school has no calendar yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Create the school calendar/ }));

    fireEvent.change(screen.getByLabelText(/^Calendar name/), {
      target: { value: 'Main calendar' },
    });
    fireEvent.change(screen.getByLabelText(/^Academic year name/), {
      target: { value: '2026' },
    });
    fireEvent.change(screen.getByLabelText(/^Year starts/), { target: { value: '2026-01-05' } });
    fireEvent.change(screen.getByLabelText(/^Year ends/), { target: { value: '2026-12-04' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create calendar' }));

    await waitFor(() => expect(repository.writes).toHaveLength(2));
    expect(repository.writes[0]).toEqual(
      expect.objectContaining({
        operation: 'create',
        entity: 'calendar',
        payload: expect.objectContaining({
          institution_id: INSTITUTION,
          name: 'Main calendar',
          programme_ids: [],
        }),
      })
    );
    expect(repository.writes[1]).toEqual(
      expect.objectContaining({
        operation: 'create',
        entity: 'academic_year',
        payload: expect.objectContaining({
          institution_id: INSTITUTION,
          calendar_id: 'calendar-1',
          name: '2026',
          start_date: '2026-01-05',
          end_date: '2026-12-04',
          status: 'planned',
        }),
      })
    );
    expect(await screen.findByText('Main calendar')).toBeTruthy();
  });

  it('refuses a year that ends before it starts, before writing anything', async () => {
    repository = createFakeRepository({ institution: [institutionRow()] });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Create the school calendar/ }));
    fireEvent.change(screen.getByLabelText(/^Calendar name/), {
      target: { value: 'Main calendar' },
    });
    fireEvent.change(screen.getByLabelText(/^Academic year name/), {
      target: { value: '2026' },
    });
    fireEvent.change(screen.getByLabelText(/^Year starts/), { target: { value: '2026-12-04' } });
    fireEvent.change(screen.getByLabelText(/^Year ends/), { target: { value: '2026-01-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create calendar' }));

    expect(
      await screen.findByText('The academic year must end on or after it starts.')
    ).toBeTruthy();
    expect(repository.writes).toEqual([]);
  });
});

describe('a role without reference.write', () => {
  const bindReadOnly = () =>
    bindSessionAuthority({
      actorId: '0192a1b2-0000-7000-8000-0000000000ee',
      roles: ['teacher'],
      scope: { institutionId: INSTITUTION, grants: [] },
      at: '2026-11-03',
    });

  it('hides the add, edit and delete controls but still shows the events', async () => {
    bindReadOnly();
    renderPage();

    expect(await screen.findByText('holiday')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add event/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });

  it('hides the offer to create the school calendar', async () => {
    repository = createFakeRepository({ institution: [institutionRow()] });
    bindReadOnly();
    renderPage();

    expect(await screen.findByText('This school has no calendar yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Create the school calendar/ })).toBeNull();
    expect(screen.getByText(/Ask an administrator or a head teacher/)).toBeTruthy();
  });
});
