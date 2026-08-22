// ABOUTME: Data hook for assignments management
// ABOUTME: Provides CRUD operations and state management for assignments and submissions

import { useState, useEffect, useCallback } from 'react';
import type { Assignment, AssignmentSubmission, GradeSubmissionInput } from './types';
import { AssignmentStatus, SubmissionStatus } from './types';

// Mock data for development
const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Mathematics Chapter 5 Exercises',
    description: 'Complete all exercises from Chapter 5',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    classId: 'class-1',
    className: 'Grade 10A',
    classStreamId: 'stream-1',
    classStreamName: 'Grade 10A - Science',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    assignedDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxScore: 100,
    weightPercentage: 10,
    status: AssignmentStatus.PUBLISHED,
    allowLateSubmission: true,
    latePenaltyPercentage: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockSubmissions: AssignmentSubmission[] = [
  {
    id: '1',
    assignmentId: '1',
    studentId: 'student-1',
    studentName: 'Alice Johnson',
    status: SubmissionStatus.SUBMITTED,
    submissionDate: new Date().toISOString(),
    score: null,
    grade: null,
    feedback: null,
    maxScore: 100,
  },
];

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

export function useAssignmentsData(): UseAssignmentsDataReturn {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        setAssignments(mockAssignments);
        setSubmissions(mockSubmissions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const createAssignment = useCallback(async (data: Partial<Assignment>): Promise<Assignment> => {
    const newAssignment: Assignment = {
      id: Date.now().toString(),
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
      rubric: data.rubric,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  }, []);

  const updateAssignment = useCallback(async (id: string, data: Partial<Assignment>): Promise<Assignment> => {
    let updated: Assignment | null = null;
    setAssignments(prev => prev.map(a => {
      if (a.id === id) {
        updated = { ...a, ...data, updatedAt: new Date().toISOString() };
        return updated;
      }
      return a;
    }));
    if (!updated) throw new Error('Assignment not found');
    return updated;
  }, []);

  const deleteAssignment = useCallback(async (id: string): Promise<void> => {
    setAssignments(prev => prev.filter(a => a.id !== id));
    setSubmissions(prev => prev.filter(s => s.assignmentId !== id));
  }, []);

  const gradeSubmission = useCallback(async (submissionId: string, data: GradeSubmissionInput): Promise<void> => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          score: data.score,
          maxScore: data.maxScore,
          grade: data.grade || (data.score >= 90 ? 'A' : data.score >= 80 ? 'B' : data.score >= 70 ? 'C' : data.score >= 60 ? 'D' : 'F'),
          feedback: data.feedback ?? null,
          gradedBy: data.gradedBy,
          gradedByName: data.gradedByName,
          gradedAt: new Date().toISOString(),
          status: SubmissionStatus.GRADED,
        };
      }
      return s;
    }));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setAssignments(mockAssignments);
      setSubmissions(mockSubmissions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh assignments');
    } finally {
      setLoading(false);
    }
  }, []);

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