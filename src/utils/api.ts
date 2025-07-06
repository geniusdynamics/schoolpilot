// Helper functions for data filtering and processing
// Used with AppDataContext instead of API calls

import type { Student, ClassStream } from '../core/types';

/**
 * Filter students by class stream ID
 * @param students - Array of all students from AppDataContext
 * @param classStreamId - The class stream ID to filter by
 * @returns Array of students in the specified class stream
 */
export const getStudentsByClassStream = (students: Student[], classStreamId: number): Student[] => {
  return (students || []).filter(student => student.current_class_stream_id === classStreamId);
};

/**
 * Get students for exam entry by class stream ID
 * @param students - Array of all students from AppDataContext
 * @param classStreamId - The class stream ID to filter by
 * @returns Array of students eligible for exam entry
 */
export const getStudentsForExamEntry = (students: Student[], classStreamId: number): Student[] => {
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
export const getClassStreamName = (classStreams: ClassStream[], classStreamId: number): string => {
  const classStream = (classStreams || []).find(cs => cs.id === classStreamId);
  return classStream ? `${classStream.class_name} ${classStream.name}` : 'Unknown';
};