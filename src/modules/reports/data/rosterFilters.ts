// ABOUTME: Pure roster filters shared by the student reports: the chosen year, class and stream, the
// ABOUTME: masterlist's extra status and gender, and the order a printed class list reads in.

import type { PersonGender, StudentStatus } from '@/core/types';

import type { ReportStudent } from './useCanonicalReportData';

/** The ids the scope bar selected plus the masterlist's own two filters. */
export interface MasterlistFilters {
  readonly levelId: string;
  readonly classGroupId: string;
  readonly status: StudentStatus | '';
  readonly gender: PersonGender | '';
}

/** The rows in the chosen year, class and stream, then the extra status and gender filters. */
export function filterMasterlist(
  students: readonly ReportStudent[],
  filters: MasterlistFilters
): ReportStudent[] {
  return students.filter((student) => {
    if (filters.levelId && student.levelId !== filters.levelId) return false;
    if (filters.classGroupId && student.classGroupId !== filters.classGroupId) return false;
    if (filters.status && student.status !== filters.status) return false;
    if (filters.gender && student.gender !== filters.gender) return false;
    return true;
  });
}

/** The placed learners of the selected year, class and stream, ordered for a printed class list. */
export function selectClassRoster(
  students: readonly ReportStudent[],
  levelId: string,
  classGroupId: string
): ReportStudent[] {
  return students
    .filter((student) => {
      // A class list holds the learners placed in a class that year; an unplaced learner has no
      // class list to belong to.
      if (!student.classGroupId) return false;
      if (levelId && student.levelId !== levelId) return false;
      if (classGroupId && student.classGroupId !== classGroupId) return false;
      return true;
    })
    .sort(
      (left, right) =>
        (left.classLabel ?? '').localeCompare(right.classLabel ?? '') ||
        (left.streamName ?? '').localeCompare(right.streamName ?? '') ||
        left.last_name.localeCompare(right.last_name) ||
        left.first_name.localeCompare(right.first_name)
    );
}
