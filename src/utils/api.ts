// ABOUTME: Helper functions that filter and resolve AppDataContext records (students, class streams).
// ABOUTME: Ids are compared as strings so numeric, numeric-string and UUID ids all match without coercion.

import type { Student, ClassStream } from '@/core/types';

/** An entity id as it may arrive from storage or a <select>: strings at runtime, numbers in legacy types. */
export type EntityId = string | number;

/** True when both ids are present and equal as strings; never coerces to numbers. */
const sameId = (a: EntityId | null | undefined, b: EntityId | null | undefined): boolean =>
  a != null && b != null && String(a) !== '' && String(a) === String(b);

/**
 * Filter students by class stream ID
 * @param students - Array of all students from AppDataContext
 * @param classStreamId - The class stream ID to filter by
 * @returns Array of students in the specified class stream
 */
export const getStudentsByClassStream = (students: Student[], classStreamId: EntityId): Student[] => {
  return (students || []).filter(student => sameId(student.current_class_stream_id, classStreamId));
};

/**
 * Get students for exam entry by class stream ID
 * @param students - Array of all students from AppDataContext
 * @param classStreamId - The class stream ID to filter by
 * @returns Array of students eligible for exam entry
 */
export const getStudentsForExamEntry = (students: Student[], classStreamId: EntityId): Student[] => {
  return getStudentsByClassStream(students, classStreamId).filter(student =>
    student.status === 'Active' // Only active students can have exam results entered
  );
};

/**
 * Get class stream name by ID
 * @param classStreams - Array of all class streams from AppDataContext
 * @param classStreamId - The class stream ID to find
 * @returns Class stream name or 'Unknown'
 */
export const getClassStreamName = (classStreams: ClassStream[], classStreamId: EntityId): string => {
  const classStream = (classStreams || []).find(cs => sameId(cs.id, classStreamId));
  return classStream ? `${classStream.class_name} ${classStream.name}` : 'Unknown';
};
