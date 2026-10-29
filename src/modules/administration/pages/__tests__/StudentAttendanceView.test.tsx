// ABOUTME: Tests the read-only attendance view: it lists a saved register's marks and says when
// ABOUTME: no register was taken, without offering an edit.
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const list = vi.fn();
  const get = vi.fn();
  return {
    list,
    get,
    repository: { list, get },
    sessions: [] as Array<Record<string, unknown>>,
    marks: [] as Array<Record<string, unknown>>,
  };
});

vi.mock('@/modules/administration/data/useWritableRepository', () => ({
  useWritableRepository: () => mocks.repository,
}));

vi.mock('@/modules/administration/data/useCanonicalClassGroups', () => ({
  useCanonicalClassGroups: () => ({
    classGroups: [{ id: 'class-1', display_name: 'Form 1 · East' }],
    classGroupsLookup: {},
  }),
}));

vi.mock('@/modules/administration/data/useCanonicalLearners', () => ({
  useCanonicalLearners: () => ({
    learners: [{ id: 'learner-1', name: 'Amina Wanjiku', admission_no: 'ADM-001' }],
  }),
}));

import { StudentAttendanceView } from '../StudentAttendanceView';

const SESSION = {
  id: 'session-1',
  class_group_id: 'class-1',
  date: '2026-10-28',
  session: 'day',
  taken_by: 'staff-1',
  taken_at: '2026-10-28T08:00:00.000Z',
  locked: false,
};

const MARK = {
  id: 'mark-1',
  attendance_session_id: 'session-1',
  learner_id: 'learner-1',
  status: 'present',
};

beforeEach(() => {
  mocks.sessions = [SESSION];
  mocks.marks = [MARK];
  mocks.list.mockReset();
  mocks.list.mockImplementation(async (entity: string) => {
    if (entity === 'attendance_session') {
      return { items: mocks.sessions, total: mocks.sessions.length };
    }
    if (entity === 'attendance_mark') {
      return { items: mocks.marks, total: mocks.marks.length };
    }
    return { items: [], total: 0 };
  });
});

describe('StudentAttendanceView', () => {
  it('shows the marks of the register taken for the chosen class', async () => {
    render(<StudentAttendanceView />);

    expect(screen.getByText(/Select a class and a date/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'class-1' } });

    expect(await screen.findByText('Amina Wanjiku')).toBeInTheDocument();
    expect(screen.getByText('ADM-001')).toBeInTheDocument();
    expect(screen.getByText('present')).toBeInTheDocument();
    expect(screen.getByTestId('attendance-view-present')).toHaveTextContent('1');
    expect(screen.getByTestId('attendance-view-absent')).toHaveTextContent('0');
  });

  it('says no register was taken when the class has none for the date', async () => {
    mocks.sessions = [];
    render(<StudentAttendanceView />);

    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'class-1' } });

    expect(
      await screen.findByText(/No register was taken for this class on this date/)
    ).toBeInTheDocument();
  });
});
