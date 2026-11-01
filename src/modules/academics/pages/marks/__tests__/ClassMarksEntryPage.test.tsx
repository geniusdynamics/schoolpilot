// ABOUTME: Tests the class/student marks page: the class grid, the single-student view, and the save
// ABOUTME: action that writes the dirty cells.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
const saveAll = vi.hoisted(() => vi.fn(async () => ({ saved: 1, failed: 0, firstError: null })));

const rows = [
  { id: 'e1', enrolmentId: 'e1', learnerName: 'Amina Wanjiku', admissionNumber: 'ADM-1', classGroupId: 'c1', classGroupName: 'Form 1 Blue' },
  { id: 'e2', enrolmentId: 'e2', learnerName: 'Brian Otieno', admissionNumber: 'ADM-2', classGroupId: 'c1', classGroupName: 'Form 1 Blue' },
];
const columns = [
  { key: 'area:math', learningAreaId: 'math', learningAreaName: 'Mathematics', assessmentId: 'a1', assessmentName: 'Maths ET', assessmentStatus: 'open', max: 100, label: 'Mathematics', groupsByClassGroup: { c1: 'g1' } },
  { key: 'area:eng', learningAreaId: 'eng', learningAreaName: 'English', assessmentId: 'a2', assessmentName: 'English ET', assessmentStatus: 'open', max: 100, label: 'English', groupsByClassGroup: { c1: 'g2' } },
];

vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('@/components/reports', () => ({ printReport: vi.fn(async () => undefined) }));
vi.mock('../useClassMarkEntry', () => ({
  useClassMarkEntry: () => ({
    isLoading: false,
    grid: {
      columns,
      rows,
      classGroups: [{ id: 'c1', name: 'Form 1 Blue', levelId: 'l1' }],
      examKeys: [{ key: 'ET', label: 'ET' }],
      nonMembership: new Set(['e2|area:eng']),
    },
    scope: { groupIds: new Set(), staffId: null, mode: 'all', canWrite: true, reason: 'All groups' },
    periodName: 'Term 1',
    periodOptions: [{ id: 'p1', name: 'Term 1', status: 'current' }],
    levelOptions: [{ id: 'l1', name: 'Form 1' }],
    classGroupOptions: [{ id: 'c1', name: 'Form 1 Blue', levelId: 'l1', label: 'Form 1 · Blue' }],
    reachableClassGroupIds: new Set(['c1']),
    canWrite: true,
    cellOf: (rowId: string, columnKey: string) => ({
      value: { score: '', status: 'present' },
      stored: false,
      invalid: null,
      nonMember: rowId === 'e2' && columnKey === 'area:eng',
      readOnly: rowId === 'e2' && columnKey === 'area:eng',
      reason: null,
      max: 100,
    }),
    setScore: vi.fn(),
    setStatus: vi.fn(),
    saveAll,
    dirtyCount: 1,
    saving: false,
    summary: { valid: 0, missing: 3, invalid: 0, notMember: 1 },
  }),
}));

import { ClassMarksEntryPageContent } from '../ClassMarksEntryPage';

describe('class marks entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the class grid and saves the dirty cells', async () => {
    render(<ClassMarksEntryPageContent initialMode="class" />);

    expect(screen.getByText('Class marks grid')).toBeInTheDocument();
    expect(screen.getByText('Amina Wanjiku')).toBeInTheDocument();
    expect(screen.getByText('Brian Otieno')).toBeInTheDocument();
    expect(screen.getAllByText(/Not registered/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Save \(1\)/ }));
    await waitFor(() => expect(saveAll).toHaveBeenCalledTimes(1));
    expect(toast.showSuccess).toHaveBeenCalledWith('1 mark(s) saved.');
  });

  it('shows one learner when the student view is chosen', () => {
    render(<ClassMarksEntryPageContent initialMode="student" />);

    expect(screen.getByText('Student marks grid')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a learner above to see every subject of this class in one grid.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Amina Wanjiku')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Student'), { target: { value: 'e1' } });

    expect(screen.getByText('Amina Wanjiku')).toBeInTheDocument();
    expect(screen.queryByText('Brian Otieno')).not.toBeInTheDocument();
  });
});
