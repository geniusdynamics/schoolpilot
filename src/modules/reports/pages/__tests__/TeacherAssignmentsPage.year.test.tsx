// ABOUTME: Tests that the teacher assignments report filters by the academic year's id, so two years
// ABOUTME: that share a display name never leak each other's assignments into the report.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => {
  const labels: Record<string, string> = {
    'teacherAssignmentsPage.title': 'Teacher Assignments Report',
    'teacherAssignmentsPage.description': 'View teacher subject assignments',
    'teacherAssignmentsPage.selectAcademicYear': 'Select Academic Year',
    'teacherAssignmentsPage.selectTeacher': 'Select Teacher',
    'teacherAssignmentsPage.allYears': 'All Years',
    'teacherAssignmentsPage.allTeachers': 'All Teachers',
    'teacherAssignmentsPage.generateReport': 'Generate Report',
    'teacherAssignmentsPage.loadingData': 'Loading data...',
    'teacherAssignmentsPage.print': 'Print',
    'teacherAssignmentsPage.exportCSV': 'Export CSV',
    'teacherAssignmentsPage.noAssignmentsFound': 'No assignments found',
    'messages.printToBeDeveloped': 'Print to be developed',
    'messages.exportToBeDeveloped': 'Export to be developed',
  };
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) =>
        labels[key] ?? (typeof fallback === 'string' ? fallback : key),
    }),
  };
});

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { createFakeRepository } from '@/modules/hr/data/__tests__/canonicalRepositoryDouble';

import { TeacherAssignmentsPageContent } from '../TeacherAssignmentsPage';

const IDS = {
  yearA: '00000000-0000-7000-8000-000000000024',
  yearB: '00000000-0000-7000-8000-000000000025',
  grade7: '00000000-0000-7000-8000-000000000107',
  classA: '00000000-0000-7000-8000-000000000206',
  classB: '00000000-0000-7000-8000-000000000207',
  jane: '00000000-0000-7000-8000-000000000501',
  john: '00000000-0000-7000-8000-000000000502',
  groupA: '00000000-0000-7000-8000-000000000601',
  groupB: '00000000-0000-7000-8000-000000000602',
  assignmentA: '00000000-0000-7000-8000-000000000701',
  assignmentB: '00000000-0000-7000-8000-000000000702',
  mathematics: '00000000-0000-7000-8000-000000000801',
} as const;

const staff = (id: string, given: string, family: string) => ({
  id,
  given_name: given,
  family_name: family,
  employee_number: id.slice(-3),
  department_ids: [],
  created_at: '2026-01-01T00:00:00.000Z',
});

const repository = createFakeRepository({
  academic_year: [
    // Two years deliberately share a name; only the id can tell them apart.
    { id: IDS.yearA, name: '2025', start_date: '2025-01-01', end_date: '2025-12-31', status: 'closed' },
    { id: IDS.yearB, name: '2025', start_date: '2025-01-01', end_date: '2025-12-31', status: 'current' },
  ],
  level: [{ id: IDS.grade7, name: 'Grade 7', ordinal: 7 }],
  class_group: [
    { id: IDS.classA, academic_year_id: IDS.yearA, level_id: IDS.grade7, name: 'East' },
    { id: IDS.classB, academic_year_id: IDS.yearB, level_id: IDS.grade7, name: 'West' },
  ],
  staff: [staff(IDS.jane, 'Jane', 'Doe'), staff(IDS.john, 'John', 'Roe')],
  learning_area: [{ id: IDS.mathematics, name: 'Mathematics' }],
  teaching_group: [
    {
      id: IDS.groupA,
      academic_year_id: IDS.yearA,
      learning_area_id: IDS.mathematics,
      name: 'Year A Mathematics',
      class_group_ids: [IDS.classA],
      level_ids: [IDS.grade7],
      teacher_ids: [IDS.jane],
      kind: 'whole_class',
    },
    {
      id: IDS.groupB,
      academic_year_id: IDS.yearB,
      learning_area_id: IDS.mathematics,
      name: 'Year B Mathematics',
      class_group_ids: [IDS.classB],
      level_ids: [IDS.grade7],
      teacher_ids: [IDS.john],
      kind: 'whole_class',
    },
  ],
  teaching_assignment: [
    { id: IDS.assignmentA, staff_id: IDS.jane, teaching_group_id: IDS.groupA, role: 'main', valid_from: '2025-01-06' },
    { id: IDS.assignmentB, staff_id: IDS.john, teaching_group_id: IDS.groupB, role: 'main', valid_from: '2025-01-06' },
  ],
});

function renderPage() {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <TeacherAssignmentsPageContent />
    </CanonicalRepositoryProvider>
  );
}

describe('TeacherAssignmentsPage academic year filter', () => {
  it('keeps only the assignments of the chosen year id, not a same-named year', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Select Academic Year').querySelectorAll('option').length).toBe(3)
    );

    fireEvent.change(screen.getByLabelText('Select Academic Year'), {
      target: { value: IDS.yearA },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.queryByText('John Roe')).toBeNull();
  });
});
