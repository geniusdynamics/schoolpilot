import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import { initialMockWeeklyPlans, initialMockLessonNotes } from './mockData';
import type { WeeklyPlan, LessonNote, PlanStatus } from './types';

export const useLessonPlansData = () => {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    setWeeklyPlans(initialMockWeeklyPlans);
    setLessonNotes(initialMockLessonNotes);
  }, []);

  // Load weekly plans from database
  const loadWeeklyPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['weekly_plans'];
      const docs = await collection.find().exec();
      setWeeklyPlans(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for weekly plans:', err.message);
      setWeeklyPlans(initialMockWeeklyPlans);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create weekly plan
  const createWeeklyPlan = useCallback(async (data: Partial<WeeklyPlan>) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['weekly_plans'];
      const now = new Date().toISOString();
      const newPlan = {
        id: `WP${Date.now()}`,
        status: 'DRAFT' as PlanStatus,
        dayPlans: [],
        createdAt: now,
        updatedAt: now,
        ...data,
      } as WeeklyPlan;
      await collection.insert(newPlan as any);
      setWeeklyPlans(prev => [...prev, newPlan]);
      return newPlan;
    } catch (err: any) {
      console.warn('Failed to create weekly plan in DB, using local state:', err.message);
      const now = new Date().toISOString();
      const newPlan = {
        id: `WP${Date.now()}`,
        status: 'DRAFT' as PlanStatus,
        dayPlans: [],
        createdAt: now,
        updatedAt: now,
        ...data,
      } as WeeklyPlan;
      setWeeklyPlans(prev => [...prev, newPlan]);
      return newPlan;
    }
  }, []);

  // Update weekly plan
  const updateWeeklyPlan = useCallback(async (id: string, updates: Partial<WeeklyPlan>) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['weekly_plans'];
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.update({ $set: { ...updates, updatedAt: new Date().toISOString() } });
      }
    } catch (err: any) {
      console.warn('Failed to update weekly plan in DB, using local state:', err.message);
    }
    setWeeklyPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, []);

  // Delete weekly plan
  const deleteWeeklyPlan = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['weekly_plans'];
      const doc = await collection.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err: any) {
      console.warn('Failed to delete weekly plan in DB, using local state:', err.message);
    }
    setWeeklyPlans(prev => prev.filter(p => p.id !== id));
  }, []);

  // Submit plan for review
  const submitPlan = useCallback(async (id: string, teacherName: string) => {
    await updateWeeklyPlan(id, {
      status: 'SUBMITTED' as PlanStatus,
      submittedAt: new Date().toISOString(),
      submittedByName: teacherName,
    });
  }, [updateWeeklyPlan]);

  // Review plan (approve/reject)
  const reviewPlan = useCallback(async (id: string, approved: boolean, reviewerId: string, reviewerName: string, comments?: string) => {
    await updateWeeklyPlan(id, {
      status: approved ? 'APPROVED' as PlanStatus : 'REJECTED' as PlanStatus,
      reviewedBy: reviewerId,
      reviewedByName: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewComments: comments,
    });
  }, [updateWeeklyPlan]);

  // Load lesson notes from database
  const loadLessonNotes = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['lesson_notes'];
      const docs = await collection.find().exec();
      setLessonNotes(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for lesson notes:', err.message);
      setLessonNotes(initialMockLessonNotes);
    }
  }, []);

  // Create lesson note
  const createLessonNote = useCallback(async (data: Partial<LessonNote>) => {
    const now = new Date().toISOString();
    const newNote = {
      id: `LN${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      ...data,
    } as LessonNote;
    setLessonNotes(prev => [...prev, newNote]);
    return newNote;
  }, []);

  // Update lesson note
  const updateLessonNote = useCallback(async (id: string, updates: Partial<LessonNote>) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['lesson_notes'];
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.update({ $set: { ...updates, updatedAt: new Date().toISOString() } });
      }
    } catch (err: any) {
      console.warn('Failed to update lesson note in DB, using local state:', err.message);
    }
    setLessonNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  }, []);

  // Delete lesson note
  const deleteLessonNote = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['lesson_notes'];
      const doc = await collection.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err: any) {
      console.warn('Failed to delete lesson note in DB, using local state:', err.message);
    }
    setLessonNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  // Get plans by status
  const getPlansByStatus = useCallback((status: PlanStatus) => {
    return weeklyPlans.filter(p => p.status === status);
  }, [weeklyPlans]);

  // Get plans by teacher
  const getPlansByTeacher = useCallback((teacherId: string) => {
    return weeklyPlans.filter(p => p.teacherId === teacherId);
  }, [weeklyPlans]);

  // Get notes by teacher
  const getNotesByTeacher = useCallback((teacherId: string) => {
    return lessonNotes.filter(n => n.teacherId === teacherId);
  }, [lessonNotes]);

  // Get notes by date range
  const getNotesByDateRange = useCallback((startDate: string, endDate: string) => {
    return lessonNotes.filter(n => n.date >= startDate && n.date <= endDate);
  }, [lessonNotes]);

  return {
    weeklyPlans,
    lessonNotes,
    loading,
    error,
    loadWeeklyPlans,
    loadLessonNotes,
    createWeeklyPlan,
    updateWeeklyPlan,
    deleteWeeklyPlan,
    submitPlan,
    reviewPlan,
    createLessonNote,
    updateLessonNote,
    deleteLessonNote,
    getPlansByStatus,
    getPlansByTeacher,
    getNotesByTeacher,
    getNotesByDateRange,
  };
};
