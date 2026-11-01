// ABOUTME: Tests the bulk curriculum assignment grids: a teacher assignment and a learner's subject
// ABOUTME: registration are written through the canonical repository.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFinanceRepositoryDouble } from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';

const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
}));
const repository = vi.hoisted(() => ({ current: null as ReturnType<typeof createFinanceRepositoryDouble> | null }));
const data = vi.hoisted(() => ({
  teachingAssignments: [] as unknown[],
  teachingGroupMembers: [] as unknown[],
}));

const year = { id: 'y1', name: '2027', status: 'current', start_date: '2027-01-01', end_date: '2027-12-31' };
const classGroup = { id: 'c1', name: 'A', level_id: 'l7' };
const level = { id: 'l7', name: 'Grade 7' };
const area = { id: 'math', name: 'Mathematics' };
const group = {
  id: 'g1',
  name: 'Form 1 Mathematics',
  academic_year_id: 'y1',
  class_group_ids: ['c1'],
  learning_area_id: 'math',
  teacher_ids: [],
};
const staff = { id: 's1', given_name: 'Grace', family_name: 'Wanjiku' };
const learner = {
  id: 'l1',
  given_name: 'Amina',
  family_name: 'Wanjiku',
  preferred_name: null,
  admission_number: 'ADM-1',
};
const enrolment = { id: 'e1', learner_id: 'l1', class_group_id: 'c1', status: 'active' };

vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('@/modules/academics/data/useCanonicalAcademics', () => ({
  useCanonicalAcademics: () => ({
    repository: repository.current,
    institutionId: 'inst-1',
    isLoading: false,
    teachingGroups: [group],
    teachingAssignments: data.teachingAssignments,
    teachingGroupMembers: data.teachingGroupMembers,
    staff: [staff],
    staffById: new Map([['s1', staff]]),
    academicYears: [year],
    classGroups: [classGroup],
    levels: [level],
    learningAreas: [area],
    learningAreaById: new Map([['math', area]]),
    enrolments: [enrolment],
    learnerById: new Map([['l1', learner]]),
  }),
  personName: (row: { given_name?: string; family_name?: string }) =>
    [row.given_name, row.family_name].filter(Boolean).join(' '),
}));

import { StudentMatrixInner, TeacherGridInner } from '../BulkSubjectAssignmentsPage';

beforeEach(() => {
  repository.current = createFinanceRepositoryDouble({ teaching_assignment: [], teaching_group_member: [] });
  data.teachingAssignments = [];
  data.teachingGroupMembers = [];
  vi.clearAllMocks();
});

describe('bulk curriculum assignments', () => {
  it('assigns a subject teacher for the class', async () => {
    render(<TeacherGridInner />);

    const select = await screen.findByLabelText('Teacher for Mathematics');
    fireEvent.change(select, { target: { value: 's1' } });
    fireEvent.click(screen.getByRole('button', { name: /Save assignments \(1\)/ }));

    await waitFor(() =>
      expect(repository.current?.rows.teaching_assignment ?? []).toHaveLength(1)
    );
    expect((repository.current?.rows.teaching_assignment ?? [])[0]).toMatchObject({
      staff_id: 's1',
      teaching_group_id: 'g1',
      role: 'main',
    });
  });

  it('names the level beside the stream in the class picker', async () => {
    render(<TeacherGridInner />);

    expect(
      await screen.findByRole('option', { name: 'Grade 7 · A' })
    ).toBeInTheDocument();
  });

  it('removes the assignment when the teacher is cleared', async () => {
    data.teachingAssignments = [
      {
        id: 'ta1',
        staff_id: 's1',
        teaching_group_id: 'g1',
        role: 'main',
        valid_from: '2026-01-01',
        valid_to: null,
        rowVersion: 1,
      },
    ];
    render(<TeacherGridInner />);

    const select = await screen.findByLabelText('Teacher for Mathematics');
    expect((select as HTMLSelectElement).value).toBe('s1');
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save assignments \(1\)/ }));

    await waitFor(() =>
      expect(repository.current?.rows.teaching_assignment ?? []).toHaveLength(0)
    );
  });

  it('registers a learner for a subject', async () => {
    render(<StudentMatrixInner />);

    const checkbox = await screen.findByLabelText('Mathematics for Amina Wanjiku');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /Save registrations \(1\)/ }));

    await waitFor(() =>
      expect(repository.current?.rows.teaching_group_member ?? []).toHaveLength(1)
    );
    expect((repository.current?.rows.teaching_group_member ?? [])[0]).toMatchObject({
      teaching_group_id: 'g1',
      enrolment_id: 'e1',
    });
  });
});
