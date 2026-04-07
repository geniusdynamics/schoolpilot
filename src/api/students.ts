// Student data access helpers
// Uses AppDataContext data instead of API calls

import type { Student } from '@/core/types';
import { getStudentsForExamEntry as filterStudentsForExamEntry, getStudentsByClassStream } from '@/utils/api';

/**
 * Get students for exam entry by class stream ID
 * This function should be called with students data from useAppData()
 * @param students - Array of all students from AppDataContext
 * @param classStreamId - The class stream ID to filter by
 * @returns Array of students eligible for exam entry
 */
export const getStudentsForExamEntry = (students: Student[], classStreamId: number): Student[] => {
  try {
    return filterStudentsForExamEntry(students, classStreamId);
  } catch (error) {
    console.error('Error filtering students for exam entry:', error);
    return [];
  }
};

/**
 * Get all students for a specific class stream
 * This function should be called with students data from useAppData()
 * @param students - Array of all students from AppDataContext
 * @param classStreamId - The class stream ID to filter by
 * @returns Array of students in the specified class stream
 */
export const getStudentsForClassStream = (students: Student[], classStreamId: number): Student[] => {
  try {
    return getStudentsByClassStream(students, classStreamId);
  } catch (error) {
    console.error('Error filtering students by class stream:', error);
    return [];
  }
};