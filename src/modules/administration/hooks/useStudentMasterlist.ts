// ABOUTME: Computed view hook replacing vw_adm_student_masterlist
// ABOUTME: Denormalizes student data by joining class streams, classes, categories, dormitories, and guardians
// ABOUTME: Filters out soft-deleted students (deleted_at IS NULL)

import { useMemo, useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

/**
 * A single row in the student masterlist view.
 * Mirrors vw_adm_student_masterlist.
 */
export interface StudentMasterlistRow {
  /** Student ID */
  studentId: string;
  /** Admission number */
  admissionNo: string;
  /** UPI number (optional, null for some students) */
  upiNo: string | null;
  /** Full name (first + last) */
  studentName: string;
  /** Gender */
  gender: string;
  /** Student status (Active, Alumni, etc.) */
  status: string;
  /** Class name from join (null if unassigned) */
  className: string | null;
  /** Stream name from join (null if unassigned) */
  streamName: string | null;
  /** Student category name (null if unassigned) */
  studentCategory: string | null;
  /** Dormitory name (null if not a boarder) */
  dormitoryName: string | null;
  /** Primary guardian name (null if no primary guardian) */
  primaryGuardianName: string | null;
  /** Primary guardian phone (null if no primary guardian) */
  primaryGuardianPhone: string | null;
}

/**
 * Computed view hook that replicates `vw_adm_student_masterlist`.
 *
 * Denormalizes data from:
 * - students (primary)
 * - class_streams (via current_class_stream_id)
 * - classes (via class_stream.class_id)
 * - student_categories (via student_category_id)
 * - dormitories (via dormitory_id)
 * - student_guardian_relationships (is_primary_contact = true)
 * - parents_guardians (via guardian_id)
 *
 * Filters out soft-deleted students (where deleted_at IS NOT NULL).
 *
 * Usage:
 * ```tsx
 * const { data: masterlist, loading, error, refresh } = useStudentMasterlist();
 * ```
 */
export function useStudentMasterlist() {
  const studentsCol = useDatabaseCollection<Record<string, any>>('students');
  const classStreamsCol = useDatabaseCollection<Record<string, any>>('class_streams');
  const classesCol = useDatabaseCollection<Record<string, any>>('classes');
  const studentCategoriesCol = useDatabaseCollection<Record<string, any>>('student_categories');
  const dormitoriesCol = useDatabaseCollection<Record<string, any>>('dormitories');
  const studentGuardianRelationshipsCol = useDatabaseCollection<Record<string, any>>('student_guardian_relationships');
  const parentsGuardiansCol = useDatabaseCollection<Record<string, any>>('parents_guardians');

  const data = useMemo<StudentMasterlistRow[]>(() => {
    if (
      studentsCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      studentCategoriesCol.loading ||
      dormitoriesCol.loading ||
      studentGuardianRelationshipsCol.loading ||
      parentsGuardiansCol.loading
    ) {
      return [];
    }

    const students = studentsCol.data;
    const classStreams = classStreamsCol.data;
    const classes = classesCol.data;
    const categories = studentCategoriesCol.data;
    const dormitories = dormitoriesCol.data;
    const guardianRelationships = studentGuardianRelationshipsCol.data;
    const parentsGuardians = parentsGuardiansCol.data;

    // Build lookup maps for O(1) access
    const streamMap = new Map(classStreams.map(cs => [String(cs.id), cs]));
    const classMap = new Map(classes.map(c => [String(c.id), c]));
    const categoryMap = new Map(categories.map(sc => [String(sc.id), sc]));
    const dormitoryMap = new Map(dormitories.map(d => [String(d.id), d]));
    const guardianMap = new Map(parentsGuardians.map(pg => [String(pg.id), pg]));

    // Build a map of student_id → primary guardian for fast lookup
    // Only include relationships where is_primary_contact = true
    // If multiple primary contacts exist, take the first one
    const primaryGuardianByStudent = new Map<string, { name: string; phone: string }>();
    for (const rel of guardianRelationships) {
      if (rel.is_primary_contact === true || rel.is_primary_contact === 'true' || rel.is_primary_contact === 1) {
        const studentId = String(rel.student_id);
        // Only set if not already set (first primary wins)
        if (!primaryGuardianByStudent.has(studentId)) {
          const guardian = guardianMap.get(String(rel.guardian_id));
          if (guardian) {
            primaryGuardianByStudent.set(studentId, {
              name: String(guardian.name ?? ''),
              phone: String(guardian.phone ?? ''),
            });
          }
        }
      }
    }

    const result: StudentMasterlistRow[] = [];

    for (const student of students) {
      // Filter out soft-deleted students
      if (student.deleted_at) continue;

      const studentId = String(student.id);
      const admissionNo = String(student.admission_no ?? '');
      const upiNo = student.upi_no != null ? String(student.upi_no) : null;
      const firstName = String(student.first_name ?? '');
      const lastName = String(student.last_name ?? '');
      const studentName = `${firstName} ${lastName}`.trim();
      const gender = String(student.gender ?? '');
      const status = String(student.status ?? '');

      // Resolve class name and stream name via class_stream join
      let className: string | null = null;
      let streamName: string | null = null;
      const streamId = student.current_class_stream_id;
      if (streamId != null) {
        const stream = streamMap.get(String(streamId));
        if (stream) {
          streamName = String(stream.name ?? '');
          const classId = stream.class_id;
          if (classId != null) {
            const cls = classMap.get(String(classId));
            if (cls) {
              className = String(cls.name ?? '');
            }
          }
        }
      }

      // Fallback to denormalized fields on the student record
      if (!className && student.current_class_name) {
        className = String(student.current_class_name);
      }
      if (!streamName && student.current_class_stream_name) {
        streamName = String(student.current_class_stream_name);
      }

      // Resolve student category name
      let studentCategory: string | null = null;
      const categoryId = student.student_category_id;
      if (categoryId != null) {
        const category = categoryMap.get(String(categoryId));
        if (category) {
          studentCategory = String(category.name ?? '');
        }
      }
      // Fallback to denormalized field
      if (!studentCategory && student.student_category_name) {
        studentCategory = String(student.student_category_name);
      }

      // Resolve dormitory name
      let dormitoryName: string | null = null;
      const dormitoryId = student.dormitory_id;
      if (dormitoryId != null) {
        const dormitory = dormitoryMap.get(String(dormitoryId));
        if (dormitory) {
          dormitoryName = String(dormitory.name ?? '');
        }
      }
      // Fallback to denormalized field
      if (!dormitoryName && student.dormitory_name) {
        dormitoryName = String(student.dormitory_name);
      }

      // Resolve primary guardian
      const primaryGuardian = primaryGuardianByStudent.get(studentId);
      const primaryGuardianName = primaryGuardian?.name ?? null;
      const primaryGuardianPhone = primaryGuardian?.phone ?? null;

      result.push({
        studentId,
        admissionNo,
        upiNo,
        studentName,
        gender,
        status,
        className,
        streamName,
        studentCategory,
        dormitoryName,
        primaryGuardianName,
        primaryGuardianPhone,
      });
    }

    return result;
  }, [
    studentsCol.data, classStreamsCol.data, classesCol.data,
    studentCategoriesCol.data, dormitoriesCol.data,
    studentGuardianRelationshipsCol.data, parentsGuardiansCol.data,
    studentsCol.loading, classStreamsCol.loading, classesCol.loading,
    studentCategoriesCol.loading, dormitoriesCol.loading,
    studentGuardianRelationshipsCol.loading, parentsGuardiansCol.loading,
  ]);

  const refresh = useCallback(async () => {
    await Promise.all([
      studentsCol.refresh(),
      classStreamsCol.refresh(),
      classesCol.refresh(),
      studentCategoriesCol.refresh(),
      dormitoriesCol.refresh(),
      studentGuardianRelationshipsCol.refresh(),
      parentsGuardiansCol.refresh(),
    ]);
  }, [
    studentsCol.refresh, classStreamsCol.refresh, classesCol.refresh,
    studentCategoriesCol.refresh, dormitoriesCol.refresh,
    studentGuardianRelationshipsCol.refresh, parentsGuardiansCol.refresh,
  ]);

  return {
    data,
    loading:
      studentsCol.loading ||
      classStreamsCol.loading ||
      classesCol.loading ||
      studentCategoriesCol.loading ||
      dormitoriesCol.loading ||
      studentGuardianRelationshipsCol.loading ||
      parentsGuardiansCol.loading,
    error:
      studentsCol.error ||
      classStreamsCol.error ||
      classesCol.error ||
      studentCategoriesCol.error ||
      dormitoriesCol.error ||
      studentGuardianRelationshipsCol.error ||
      parentsGuardiansCol.error,
    refresh,
  };
}

export default useStudentMasterlist;