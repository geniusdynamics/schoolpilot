// ABOUTME: Computed view hook replacing vw_edm_teacher_assignments
// ABOUTME: Joins teacher_subject_assignments with class_subject_allocations, staff, class_streams, classes, subjects, and academic_years
// ABOUTME: Produces a flat table: academic_year, class, stream, subject, teacher_name

import { useMemo, useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

/**
 * Represents a single row of the teacher assignments view.
 * Each row is one teacher-ClassStream-subject assignment for an academic year.
 */
export interface TeacherAssignmentRow {
  /** Academic year name (e.g., "2025") */
  academicYear: string;
  /** Class name (e.g., "Form 1") */
  className: string;
  /** Stream name (e.g., "North", "A") */
  streamName: string;
  /** Subject name (e.g., "Mathematics") */
  subjectName: string;
  /** Teacher full name (first + last) */
  teacherName: string;
  /** Teacher ID for reference */
  teacherId: string;
  /** Class subject allocation ID */
  allocationId: string;
}

/**
 * Computed view hook that replicates `vw_edm_teacher_assignments`.
 *
 * Joins data from:
 * - teacher_subject_assignments (the linking table)
 * - class_subject_allocations (which class_stream gets which subject)
 * - staff (teacher info)
 * - class_streams (stream name + link to class)
 * - classes (class name)
 * - subjects (subject name)
 * - academic_years (year name)
 *
 * Usage:
 * ```tsx
 * const { data: assignments, loading, error, refresh } = useTeacherAssignments();
 * ```
 */
export function useTeacherAssignments() {
  const teacherSubjectAssignmentsCol = useDatabaseCollection<Record<string, any>>('teacher_subject_assignments');
  const classSubjectAllocationsCol = useDatabaseCollection<Record<string, any>>('class_subject_allocations');
  const staffCol = useDatabaseCollection<Record<string, any>>('staff');
  const classStreamsCol = useDatabaseCollection<Record<string, any>>('class_streams');
  const classesCol = useDatabaseCollection<Record<string, any>>('classes');
  const subjectsCol = useDatabaseCollection<Record<string, any>>('subjects');
  const academicYearsCol = useDatabaseCollection<Record<string, any>>('academic_years');

  const data = useMemo<TeacherAssignmentRow[]>(() => {
    if (
      teacherSubjectAssignmentsCol.loading ||
      classSubjectAllocationsCol.loading ||
      staffCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      subjectsCol.loading ||
      academicYearsCol.loading
    ) {
      return [];
    }

    const assignments = teacherSubjectAssignmentsCol.data;
    const allocations = classSubjectAllocationsCol.data;
    const staff = staffCol.data;
    const classStreams = classStreamsCol.data;
    const classes = classesCol.data;
    const subjects = subjectsCol.data;
    const academicYears = academicYearsCol.data;

    // Build lookup maps for O(1) access
    const allocationMap = new Map(allocations.map(a => [String(a.id), a]));
    const staffMap = new Map(staff.map(s => [String(s.id), s]));
    const classStreamMap = new Map(classStreams.map(cs => [String(cs.id), cs]));
    const classMap = new Map(classes.map(c => [String(c.id), c]));
    const subjectMap = new Map(subjects.map(sub => [String(sub.id), sub]));
    const academicYearMap = new Map(academicYears.map(ay => [String(ay.id), ay]));

    // Build the result by joining: assignment → allocation → class_stream, subject, academic_year, staff
    const result: TeacherAssignmentRow[] = [];

    for (const assignment of assignments) {
      const allocationId = String(assignment.allocation_id);
      const teacherId = String(assignment.teacher_id);

      // Resolve allocation to get class_stream_id, subject_id, academic_year_id
      const allocation = allocationMap.get(allocationId);
      if (!allocation) continue;

      // Resolve staff (teacher) info
      const staffMember = staffMap.get(teacherId);
      const teacherFirstName = staffMember ? String(staffMember.first_name ?? '') : '';
      const teacherLastName = staffMember ? String(staffMember.last_name ?? '') : '';
      const teacherName = `${teacherFirstName} ${teacherLastName}`.trim();

      // Resolve class_stream → class
      let className: string = '';
      let streamName: string = '';
      const classStreamId = allocation.class_stream_id;
      if (classStreamId != null) {
        const classStream = classStreamMap.get(String(classStreamId));
        if (classStream) {
          streamName = String(classStream.name ?? '');
          const classId = classStream.class_id;
          if (classId != null) {
            const cls = classMap.get(String(classId));
            if (cls) {
              className = String(cls.name ?? '');
            }
          }
        }
      }

      // Fallback to denormalized fields from the assignment
      if (!className && assignment.class_stream_name) {
        className = String(assignment.class_stream_name);
      }
      if (!streamName && assignment.class_stream_name) {
        // Some denormalized fields just have the combined name
        streamName = String(assignment.class_stream_name);
      }

      // Resolve subject
      let subjectName: string = '';
      const subjectId = allocation.subject_id;
      if (subjectId != null) {
        const subject = subjectMap.get(String(subjectId));
        if (subject) {
          subjectName = String(subject.name ?? '');
        }
      }
      // Fallback to denormalized field
      if (!subjectName && allocation.subject_name) {
        subjectName = String(allocation.subject_name);
      }
      if (!subjectName && assignment.subject_name) {
        subjectName = String(assignment.subject_name);
      }

      // Resolve academic year
      let academicYear: string = '';
      const academicYearId = allocation.academic_year_id;
      if (academicYearId != null) {
        const ay = academicYearMap.get(String(academicYearId));
        if (ay) {
          academicYear = String(ay.name ?? '');
        }
      }
      // Fallback to denormalized field
      if (!academicYear && assignment.academic_year_name) {
        academicYear = String(assignment.academic_year_name);
      }

      result.push({
        academicYear,
        className,
        streamName,
        subjectName,
        teacherName,
        teacherId,
        allocationId,
      });
    }

    return result;
  }, [
    teacherSubjectAssignmentsCol.data, classSubjectAllocationsCol.data,
    staffCol.data, classStreamsCol.data, classesCol.data,
    subjectsCol.data, academicYearsCol.data,
    teacherSubjectAssignmentsCol.loading, classSubjectAllocationsCol.loading,
    staffCol.loading, classStreamsCol.loading, classesCol.loading,
    subjectsCol.loading, academicYearsCol.loading,
  ]);

  const refresh = useCallback(async () => {
    await Promise.all([
      teacherSubjectAssignmentsCol.refresh(),
      classSubjectAllocationsCol.refresh(),
      staffCol.refresh(),
      classStreamsCol.refresh(),
      classesCol.refresh(),
      subjectsCol.refresh(),
      academicYearsCol.refresh(),
    ]);
  }, [
    teacherSubjectAssignmentsCol.refresh, classSubjectAllocationsCol.refresh,
    staffCol.refresh, classStreamsCol.refresh, classesCol.refresh,
    subjectsCol.refresh, academicYearsCol.refresh,
  ]);

  return {
    data,
    loading:
      teacherSubjectAssignmentsCol.loading ||
      classSubjectAllocationsCol.loading ||
      staffCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      subjectsCol.loading ||
      academicYearsCol.loading,
    error:
      teacherSubjectAssignmentsCol.error ||
      classSubjectAllocationsCol.error ||
      staffCol.error ||
      classStreamsCol.error ||
      classesCol.error ||
      subjectsCol.error ||
      academicYearsCol.error,
    refresh,
  };
}

export default useTeacherAssignments;