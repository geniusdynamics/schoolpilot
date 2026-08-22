// ABOUTME: React hook for student promotion - wraps StudentPromotionService with database collections
// ABOUTME: Integrates with useDatabaseCollection for collection access and useAuditLogger for audit

import { useCallback, useMemo } from 'react';
import { StudentPromotionService } from '../services/StudentPromotionService';
import type { PromotionParams, PromotionResult, ICollectionAdapter } from '../services/StudentPromotionService';
import type { StudentClassHistoryEntry } from '../data/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

/**
 * Return type for the useStudentPromotion hook
 */
interface UseStudentPromotionReturn {
  /** Promote a single student to a new class/stream */
  promoteStudent: (params: Omit<PromotionParams, 'userId' | 'userName'>) => Promise<PromotionResult>;

  /** Bulk promote multiple students */
  promoteStudents: (paramsList: Array<Omit<PromotionParams, 'userId' | 'userName'>>) => Promise<PromotionResult[]>;

  /** Soft-delete a student */
  softDeleteStudent: (
    studentId: string,
    identifyingData: { admission_no: string; [key: string]: unknown }
  ) => Promise<boolean>;

  /** Get the full class history for a student */
  getStudentClassHistory: (studentId: string) => Promise<StudentClassHistoryEntry[]>;

  /** Revert the last promotion */
  revertPromotion: (studentId: string) => Promise<PromotionResult>;

  /** The promotion service instance for advanced usage */
  service: StudentPromotionService;
}

/**
 * React hook for student class promotion.
 *
 * Wraps StudentPromotionService with live database collections
 * and provides convenience methods for React components.
 *
 * Usage:
 * ```tsx
 * function PromoteStudentButton({ studentId, newClassStreamId }) {
 *   const { promoteStudent, getStudentClassHistory } = useStudentPromotion();
 *
 *   const handlePromote = async () => {
 *     const result = await promoteStudent({
 *       studentId,
 *       newClassStreamId,
 *       academicYearId: 'ay_2025',
 *       promotionDate: '2025-01-15'
 *     });
 *
 *     if (result.success) {
 *       toast.showSuccess('Student promoted successfully');
 *     }
 *   };
 * }
 * ```
 */
export function useStudentPromotion(): UseStudentPromotionReturn {
  const studentsCollection = useDatabaseCollection<Record<string, unknown>>('students');
  const historyCollection = useDatabaseCollection<Record<string, unknown>>('student_class_history');
  const classStreamsCollection = useDatabaseCollection<Record<string, unknown>>('class_streams');

  const service = useMemo(
    () => new StudentPromotionService(
      studentsCollection.collection as ICollectionAdapter | null,
      historyCollection.collection as ICollectionAdapter | null,
      classStreamsCollection.collection as ICollectionAdapter | null
    ),
    // Rebuild when collection references change
     
    [studentsCollection.collection, historyCollection.collection, classStreamsCollection.collection]
  );

  const promoteStudent = useCallback(
    async (params: Omit<PromotionParams, 'userId' | 'userName'>): Promise<PromotionResult> => {
      return service.promoteStudent(params);
    },
    [service]
  );

  const promoteStudents = useCallback(
    async (paramsList: Array<Omit<PromotionParams, 'userId' | 'userName'>>): Promise<PromotionResult[]> => {
      return service.promoteStudents(paramsList);
    },
    [service]
  );

  const softDeleteStudent = useCallback(
    async (studentId: string, identifyingData: { admission_no: string; [key: string]: unknown }): Promise<boolean> => {
      return service.softDeleteStudent(studentId, identifyingData);
    },
    [service]
  );

  const getStudentClassHistory = useCallback(
    async (studentId: string): Promise<StudentClassHistoryEntry[]> => service.getStudentClassHistory(studentId),
    [service]
  );

  const revertPromotion = useCallback(
    async (studentId: string): Promise<PromotionResult> => service.revertPromotion(studentId),
    [service]
  );

  return {
    promoteStudent,
    promoteStudents,
    softDeleteStudent,
    getStudentClassHistory,
    revertPromotion,
    service
  };
}

export default useStudentPromotion;