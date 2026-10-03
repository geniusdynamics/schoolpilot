// ABOUTME: Data hook for assignments management
// ABOUTME: Provides CRUD operations against the 'assignments' and 'assignment_submissions' collections

import { useCallback, useMemo } from 'react';
import type { Assignment, AssignmentSubmission, GradeSubmissionInput } from './types';
import { AssignmentStatus, SubmissionStatus } from './types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

interface UseAssignmentsDataReturn {
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  loading: boolean;
  error: string | null;
  createAssignment: (data: Partial<Assignment>) => Promise<Assignment>;
  updateAssignment: (id: string, data: Partial<Assignment>) => Promise<Assignment>;
  deleteAssignment: (id: string) => Promise<void>;
  gradeSubmission: (submissionId: string, data: GradeSubmissionInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const deriveLetterGrade = (score: number): string =>
  score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

export function useAssignmentsData(): UseAssignmentsDataReturn {
  const assignmentsCollection = useDatabaseCollection<Assignment>('assignments');
  const submissionsCollection = useDatabaseCollection<AssignmentSubmission>('assignment_submissions');

  const assignments = assignmentsCollection.data;
  const submissions = submissionsCollection.data;

  const loading = assignmentsCollection.loading || submissionsCollection.loading;
  const error = useMemo(
    () => assignmentsCollection.error?.message ?? submissionsCollection.error?.message ?? null,
    [assignmentsCollection.error, submissionsCollection.error]
  );

  const createAssignment = useCallback(async (data: Partial<Assignment>): Promise<Assignment> => {
    const now = new Date().toISOString();
    const newAssignment: Assignment = {
      id: data.id || Date.now().toString(),
      title: data.title || 'New Assignment',
      description: data.description || '',
      subjectId: data.subjectId || '',
      subjectName: data.subjectName || '',
      classId: data.classId || '',
      className: data.className || '',
      classStreamId: data.classStreamId || '',
      classStreamName: data.classStreamName || '',
      teacherId: data.teacherId || '',
      teacherName: data.teacherName || '',
      assignedDate: data.assignedDate || new Date().toISOString(),
      dueDate: data.dueDate || new Date().toISOString(),
      maxScore: data.maxScore || 100,
      weightPercentage: data.weightPercentage || 0,
      status: data.status || AssignmentStatus.DRAFT,
      allowLateSubmission: data.allowLateSubmission ?? true,
      latePenaltyPercentage: data.latePenaltyPercentage || 0,
      instructions: data.instructions,
      attachments: data.attachments,
      rubricId: data.rubricId,
      rubric: data.rubric,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await assignmentsCollection.insert(newAssignment);
    return inserted ?? newAssignment;
  }, [assignmentsCollection]);

  const updateAssignment = useCallback(async (id: string, data: Partial<Assignment>): Promise<Assignment> => {
    const existing = assignments.find(a => a.id === id);
    if (!existing) throw new Error('Assignment not found');
    const updated: Assignment = { ...existing, ...data, id: existing.id, updatedAt: new Date().toISOString() };
    const result = await assignmentsCollection.update(id, updated);
    return result ?? updated;
  }, [assignments, assignmentsCollection]);

  const deleteAssignment = useCallback(async (id: string): Promise<void> => {
    // Remove dependent submissions first so orphaned rows never linger.
    const related = submissions.filter(s => s.assignmentId === id);
    for (const submission of related) {
      await submissionsCollection.remove(submission.id);
    }
    await assignmentsCollection.remove(id);
  }, [assignmentsCollection, submissions, submissionsCollection]);

  const gradeSubmission = useCallback(async (submissionId: string, data: GradeSubmissionInput): Promise<void> => {
    const existing = submissions.find(s => s.id === submissionId);
    if (!existing) throw new Error('Submission not found');
    await submissionsCollection.update(submissionId, {
      ...existing,
      score: data.score,
      maxScore: data.maxScore,
      grade: data.grade || deriveLetterGrade(data.score),
      feedback: data.feedback ?? null,
      gradedBy: data.gradedBy,
      gradedByName: data.gradedByName,
      gradedAt: new Date().toISOString(),
      status: SubmissionStatus.GRADED,
    });
  }, [submissions, submissionsCollection]);

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([
      assignmentsCollection.refresh(),
      submissionsCollection.refresh(),
    ]);
  }, [assignmentsCollection, submissionsCollection]);

  return {
    assignments,
    submissions,
    loading,
    error,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    gradeSubmission,
    refresh,
  };
}

export default useAssignmentsData;
