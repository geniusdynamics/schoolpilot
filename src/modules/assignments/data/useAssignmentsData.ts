import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import { initialMockAssignments, initialMockSubmissions } from './mockData';
import type { Assignment, AssignmentSubmission, AssignmentStatus, SubmissionStatus } from './types';

export const useAssignmentsData = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    setAssignments(initialMockAssignments);
    setSubmissions(initialMockSubmissions);
  }, []);

  // Load assignments from database
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['assignments'];
      const docs = await collection.find().exec();
      setAssignments(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for assignments:', err.message);
      setAssignments(initialMockAssignments);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create assignment
  const createAssignment = useCallback(async (data: Partial<Assignment>) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['assignments'];
      const now = new Date().toISOString();
      const newAssignment = {
        id: `ASG${Date.now()}`,
        submissionCount: 0,
        gradedCount: 0,
        averageScore: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as Assignment;
      await collection.insert(newAssignment as any);
      setAssignments(prev => [...prev, newAssignment]);
      return newAssignment;
    } catch (err: any) {
      console.warn('Failed to create assignment in DB, using local state:', err.message);
      const now = new Date().toISOString();
      const newAssignment = {
        id: `ASG${Date.now()}`,
        submissionCount: 0,
        gradedCount: 0,
        averageScore: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as Assignment;
      setAssignments(prev => [...prev, newAssignment]);
      return newAssignment;
    }
  }, []);

  // Update assignment
  const updateAssignment = useCallback(async (id: string, updates: Partial<Assignment>) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['assignments'];
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.update({ $set: { ...updates, updatedAt: new Date().toISOString() } });
      }
    } catch (err: any) {
      console.warn('Failed to update assignment in DB, using local state:', err.message);
    }
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a));
  }, []);

  // Delete assignment
  const deleteAssignment = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['assignments'];
      const doc = await collection.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err: any) {
      console.warn('Failed to delete assignment in DB, using local state:', err.message);
    }
    setAssignments(prev => prev.filter(a => a.id !== id));
  }, []);

  // Load submissions
  const loadSubmissions = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['assignment_submissions'];
      const docs = await collection.find().exec();
      setSubmissions(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for submissions:', err.message);
      setSubmissions(initialMockSubmissions);
    }
  }, []);

  // Create submission
  const createSubmission = useCallback(async (data: Partial<AssignmentSubmission>) => {
    const now = new Date().toISOString();
    const assignment = assignments.find(a => a.id === data.assignmentId);
    const isLate = assignment && data.submissionDate
      ? new Date(data.submissionDate) > new Date(assignment.dueDate)
      : false;

    const newSubmission = {
      id: `SUB${Date.now()}`,
      status: isLate ? 'LATE' as SubmissionStatus : 'SUBMITTED' as SubmissionStatus,
      isLate,
      submissionDate: now,
      assignmentTitle: assignment?.title || null,
      assignmentDueDate: assignment?.dueDate || null,
      ...data,
    } as AssignmentSubmission;

    setSubmissions(prev => [...prev, newSubmission]);
    return newSubmission;
  }, [assignments]);

  // Grade submission
  const gradeSubmission = useCallback(async (id: string, gradeData: { score: number; maxScore: number; grade: string; feedback?: string; gradedBy: string; gradedByName: string }) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['assignment_submissions'];
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.update({
          $set: {
            ...gradeData,
            status: 'GRADED',
            gradedAt: new Date().toISOString(),
          },
        });
      }
    } catch (err: any) {
      console.warn('Failed to grade submission in DB, using local state:', err.message);
    }
    setSubmissions(prev => prev.map(s =>
      s.id === id ? {
        ...s,
        ...gradeData,
        status: 'GRADED' as SubmissionStatus,
        gradedAt: new Date().toISOString(),
      } : s
    ));

    // Update assignment stats
    const submission = submissions.find(s => s.id === id);
    if (submission) {
      const assignmentSubs = submissions.filter(s => s.assignmentId === submission.assignmentId && s.id !== id);
      const newScores = [...assignmentSubs.map(s => s.score).filter((s): s is number => s !== null), gradeData.score];
      const avg = newScores.length > 0 ? newScores.reduce((a, b) => a + b, 0) / newScores.length : null;

      setAssignments(prev => prev.map(a =>
        a.id === submission.assignmentId
          ? { ...a, gradedCount: (a.gradedCount || 0) + 1, averageScore: avg }
          : a
      ));
    }
  }, [submissions]);

  // Get submissions by assignment
  const getSubmissionsByAssignment = useCallback((assignmentId: string) => {
    return submissions.filter(s => s.assignmentId === assignmentId);
  }, [submissions]);

  // Get submissions by student
  const getSubmissionsByStudent = useCallback((studentId: string) => {
    return submissions.filter(s => s.studentId === studentId);
  }, [submissions]);

  // Get submissions needing grading
  const getPendingGrading = useCallback(() => {
    return submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE');
  }, [submissions]);

  // Filter assignments by status
  const getAssignmentsByStatus = useCallback((status: AssignmentStatus) => {
    return assignments.filter(a => a.status === status);
  }, [assignments]);

  return {
    assignments,
    submissions,
    loading,
    error,
    loadAssignments,
    loadSubmissions,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    createSubmission,
    gradeSubmission,
    getSubmissionsByAssignment,
    getSubmissionsByStudent,
    getPendingGrading,
    getAssignmentsByStatus,
  };
};
