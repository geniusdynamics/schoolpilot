// ABOUTME: Tests the database-backed app data hook compatibility helpers for timetable and attendance flows.
// ABOUTME: Verifies seeded fallback collections still power sync getters used by existing pages.

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDatabaseData } from '../useDatabaseData';

vi.mock('../../services/databaseService', () => ({
  databaseService: {
    initializeDatabase: vi.fn().mockResolvedValue(undefined),
    seedDatabaseWithMockData: vi.fn().mockResolvedValue(undefined),
    clearDatabase: vi.fn().mockResolvedValue(undefined),
    generateId: vi.fn().mockReturnValue('generated-id'),
    getDatabase: vi.fn().mockResolvedValue({
      student_attendance: {
        insert: vi.fn(),
      },
      timetable_entries: {
        insert: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      },
      timetable_period_defs: {
        remove: vi.fn(),
      },
    }),
  },
}));

const createSeedData = () => ({
  students: [
    { id: 'student-1', current_class_stream_id: 7 },
    { id: 'student-2', current_class_stream_id: 8 },
  ],
  studentAttendance: [
    { id: 'attendance-1', student_id: 'student-1', date: '2026-01-10', period_id: 1, status: 'present' },
    { id: 'attendance-2', student_id: 'student-2', date: '2026-01-10', period_id: 1, status: 'present' },
  ],
  timetablePeriodDefs: [
    { id: 1, period_name: 'Period 1', start_time: '08:00', end_time: '08:40' },
  ],
  timetableEntries: [
    { id: 'entry-1', class_stream_id: 7, day_of_week: 'Monday', period_id: 1, subject_id: 101, teacher_id: 'teacher-1' },
    { id: 'entry-2', class_stream_id: 8, day_of_week: 'Monday', period_id: 1, subject_id: 202, teacher_id: 'teacher-2' },
  ],
});

describe('useDatabaseData compatibility helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns seeded timetable and attendance data through sync compatibility getters', async () => {
    const seedData = createSeedData();
    const { result } = renderHook(() => useDatabaseData(seedData as any));

    await waitFor(() => {
      expect(result.current.loading.all).toBe(false);
    });

    expect(result.current.getTimetablePeriodDefs()).toEqual(seedData.timetablePeriodDefs);
    expect(result.current.getTimetableEntries(7)).toEqual([seedData.timetableEntries[0]]);
    expect(result.current.getStudentAttendanceByFilters('2026-01-10', 7, 1)).toEqual([seedData.studentAttendance[0]]);
    expect(result.current.getStudentAttendanceByFilters({ selector: { date: '2026-01-10' } } as any)).toEqual(seedData.studentAttendance);
  });
});
