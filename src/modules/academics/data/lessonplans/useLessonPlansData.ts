// ABOUTME: Data hook for lesson plans management
// ABOUTME: Provides CRUD operations against the 'lesson_plans', 'lesson_notes' and 'weekly_plans' collections

import { useCallback, useMemo } from 'react';
import type { DayPlan } from '../types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

export type { DayPlan, PeriodPlan } from '../types';

// Types for lesson plans
export interface LessonPlan {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  objectives: string[];
  content: string;
  resources: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface LessonNote {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classStreamId: string;
  classStreamName: string;
  date: string;
  periodId: string;
  periodName: string;
  topic: string;
  subTopic: string;
  objectives: string;
  introduction: string;
  presentation: string;
  development: string;
  assessment: string;
  conclusion: string;
  reflection: string;
  challenges: string;
  studentsPresent: string;
  studentsAbsent: string;
  createdAt: string;
  updatedAt: string;
}

export enum PlanStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface WeeklyPlan {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  gradeLevel: string;
  classStreamId: string;
  classStreamName: string;
  topic: string;
  objectives: string[];
  materials: string[];
  duration: number;
  status: PlanStatus;
  submittedAt?: string;
  submittedBy?: string;
  submittedByName?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewComments?: string;
  // Optional week-level scheduling and breakdown fields consumed by the lesson-plan pages.
  weekStartDate?: string;
  weekEndDate?: string;
  dayPlans?: DayPlan[];
  overallObjectives?: string;
  teachingAids?: string;
  references?: string[];
  createdAt: string;
  updatedAt: string;
}

interface UseLessonPlansDataReturn {
  lessonPlans: LessonPlan[];
  lessonNotes: LessonNote[];
  weeklyPlans: WeeklyPlan[];
  loading: boolean;
  error: string | null;
  createLessonPlan: (data: Partial<LessonPlan>) => Promise<LessonPlan>;
  updateLessonPlan: (id: string, data: Partial<LessonPlan>) => Promise<LessonPlan>;
  deleteLessonPlan: (id: string) => Promise<void>;
  createLessonNote: (data: Partial<LessonNote>) => Promise<LessonNote>;
  updateLessonNote: (id: string, data: Partial<LessonNote>) => Promise<LessonNote>;
  deleteLessonNote: (id: string) => Promise<void>;
  reviewPlan: (id: string, approved: boolean, reviewedBy: string, reviewedByName: string, comments?: string) => Promise<WeeklyPlan>;
  getPlansByStatus: (status: PlanStatus) => WeeklyPlan[];
  createWeeklyPlan: (data: Partial<WeeklyPlan>) => Promise<WeeklyPlan>;
  updateWeeklyPlan: (id: string, data: Partial<WeeklyPlan>) => Promise<WeeklyPlan>;
  deleteWeeklyPlan: (id: string) => Promise<void>;
  submitPlan: (id: string, submittedByName?: string) => Promise<WeeklyPlan>;
  refresh: () => Promise<void>;
}

export function useLessonPlansData(): UseLessonPlansDataReturn {
  const lessonPlansCollection = useDatabaseCollection<LessonPlan>('lesson_plans');
  const lessonNotesCollection = useDatabaseCollection<LessonNote>('lesson_notes');
  const weeklyPlansCollection = useDatabaseCollection<WeeklyPlan>('weekly_plans');

  const lessonPlans = lessonPlansCollection.data;
  const lessonNotes = lessonNotesCollection.data;
  const weeklyPlans = weeklyPlansCollection.data;

  const loading = lessonPlansCollection.loading || lessonNotesCollection.loading || weeklyPlansCollection.loading;
  const error = useMemo(
    () =>
      lessonPlansCollection.error?.message ??
      lessonNotesCollection.error?.message ??
      weeklyPlansCollection.error?.message ??
      null,
    [lessonPlansCollection.error, lessonNotesCollection.error, weeklyPlansCollection.error]
  );

  const getPlansByStatus = useCallback(
    (status: PlanStatus): WeeklyPlan[] => weeklyPlans.filter(p => p.status === status),
    [weeklyPlans]
  );

  const createLessonPlan = useCallback(async (data: Partial<LessonPlan>): Promise<LessonPlan> => {
    const now = new Date().toISOString();
    const newPlan: LessonPlan = {
      id: data.id || Date.now().toString(),
      title: data.title || 'New Lesson Plan',
      description: data.description || '',
      subjectId: data.subjectId || '',
      subjectName: data.subjectName || '',
      classId: data.classId || '',
      className: data.className || '',
      teacherId: data.teacherId || '',
      teacherName: data.teacherName || '',
      date: data.date || new Date().toISOString().split('T')[0],
      startTime: data.startTime || '09:00',
      endTime: data.endTime || '10:00',
      objectives: data.objectives || [],
      content: data.content || '',
      resources: data.resources || [],
      status: data.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await lessonPlansCollection.insert(newPlan);
    return inserted ?? newPlan;
  }, [lessonPlansCollection]);

  const updateLessonPlan = useCallback(async (id: string, data: Partial<LessonPlan>): Promise<LessonPlan> => {
    const existing = lessonPlans.find(p => p.id === id);
    if (!existing) throw new Error('Lesson plan not found');
    const updated: LessonPlan = { ...existing, ...data, id: existing.id, updatedAt: new Date().toISOString() };
    const result = await lessonPlansCollection.update(id, updated);
    return result ?? updated;
  }, [lessonPlans, lessonPlansCollection]);

  const deleteLessonPlan = useCallback(async (id: string): Promise<void> => {
    await lessonPlansCollection.remove(id);
  }, [lessonPlansCollection]);

  const createLessonNote = useCallback(async (data: Partial<LessonNote>): Promise<LessonNote> => {
    const now = new Date().toISOString();
    const newNote: LessonNote = {
      id: data.id || Date.now().toString(),
      teacherId: data.teacherId || '',
      teacherName: data.teacherName || '',
      subjectId: data.subjectId || '',
      subjectName: data.subjectName || '',
      classStreamId: data.classStreamId || '',
      classStreamName: data.classStreamName || '',
      date: data.date || new Date().toISOString().split('T')[0],
      periodId: data.periodId || '',
      periodName: data.periodName || '',
      topic: data.topic || '',
      subTopic: data.subTopic || '',
      objectives: data.objectives || '',
      introduction: data.introduction || '',
      presentation: data.presentation || '',
      development: data.development || '',
      assessment: data.assessment || '',
      conclusion: data.conclusion || '',
      reflection: data.reflection || '',
      challenges: data.challenges || '',
      studentsPresent: data.studentsPresent || '',
      studentsAbsent: data.studentsAbsent || '',
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await lessonNotesCollection.insert(newNote);
    return inserted ?? newNote;
  }, [lessonNotesCollection]);

  const updateLessonNote = useCallback(async (id: string, data: Partial<LessonNote>): Promise<LessonNote> => {
    const existing = lessonNotes.find(n => n.id === id);
    if (!existing) throw new Error('Lesson note not found');
    const updated: LessonNote = { ...existing, ...data, id: existing.id, updatedAt: new Date().toISOString() };
    const result = await lessonNotesCollection.update(id, updated);
    return result ?? updated;
  }, [lessonNotes, lessonNotesCollection]);

  const deleteLessonNote = useCallback(async (id: string): Promise<void> => {
    await lessonNotesCollection.remove(id);
  }, [lessonNotesCollection]);

  const reviewPlan = useCallback(
    async (id: string, approved: boolean, reviewedBy: string, reviewedByName: string, comments?: string): Promise<WeeklyPlan> => {
      const existing = weeklyPlans.find(p => p.id === id);
      if (!existing) throw new Error('Weekly plan not found');
      const updated: WeeklyPlan = {
        ...existing,
        status: approved ? PlanStatus.APPROVED : PlanStatus.REJECTED,
        reviewComments: comments,
        reviewedBy,
        reviewedByName,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = await weeklyPlansCollection.update(id, updated);
      return result ?? updated;
    },
    [weeklyPlans, weeklyPlansCollection]
  );

  const createWeeklyPlan = useCallback(async (data: Partial<WeeklyPlan>): Promise<WeeklyPlan> => {
    const now = new Date().toISOString();
    const newPlan: WeeklyPlan = {
      id: data.id || Date.now().toString(),
      title: data.title || 'New Weekly Plan',
      subjectId: data.subjectId || '',
      subjectName: data.subjectName || '',
      teacherId: data.teacherId || '',
      teacherName: data.teacherName || '',
      gradeLevel: data.gradeLevel || '',
      classStreamId: data.classStreamId || '',
      classStreamName: data.classStreamName || '',
      topic: data.topic || '',
      objectives: data.objectives || [],
      materials: data.materials || [],
      duration: data.duration || 0,
      status: data.status || PlanStatus.DRAFT,
      weekStartDate: data.weekStartDate,
      weekEndDate: data.weekEndDate,
      dayPlans: data.dayPlans,
      overallObjectives: data.overallObjectives,
      teachingAids: data.teachingAids,
      references: data.references,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await weeklyPlansCollection.insert(newPlan);
    return inserted ?? newPlan;
  }, [weeklyPlansCollection]);

  const updateWeeklyPlan = useCallback(async (id: string, data: Partial<WeeklyPlan>): Promise<WeeklyPlan> => {
    const existing = weeklyPlans.find(p => p.id === id);
    if (!existing) throw new Error('Weekly plan not found');
    const updated: WeeklyPlan = { ...existing, ...data, id: existing.id, updatedAt: new Date().toISOString() };
    const result = await weeklyPlansCollection.update(id, updated);
    return result ?? updated;
  }, [weeklyPlans, weeklyPlansCollection]);

  const deleteWeeklyPlan = useCallback(async (id: string): Promise<void> => {
    await weeklyPlansCollection.remove(id);
  }, [weeklyPlansCollection]);

  const submitPlan = useCallback(
    async (id: string, submittedByName?: string): Promise<WeeklyPlan> => {
      const existing = weeklyPlans.find(p => p.id === id);
      if (!existing) throw new Error('Weekly plan not found');
      const now = new Date().toISOString();
      const updated: WeeklyPlan = {
        ...existing,
        status: PlanStatus.SUBMITTED,
        submittedAt: now,
        submittedByName: submittedByName ?? existing.submittedByName,
        updatedAt: now,
      };
      const result = await weeklyPlansCollection.update(id, updated);
      return result ?? updated;
    },
    [weeklyPlans, weeklyPlansCollection]
  );

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([
      lessonPlansCollection.refresh(),
      lessonNotesCollection.refresh(),
      weeklyPlansCollection.refresh(),
    ]);
  }, [lessonPlansCollection, lessonNotesCollection, weeklyPlansCollection]);

  return {
    lessonPlans,
    lessonNotes,
    weeklyPlans,
    loading,
    error,
    createLessonPlan,
    updateLessonPlan,
    deleteLessonPlan,
    createLessonNote,
    updateLessonNote,
    deleteLessonNote,
    reviewPlan,
    getPlansByStatus,
    createWeeklyPlan,
    updateWeeklyPlan,
    deleteWeeklyPlan,
    submitPlan,
    refresh,
  };
}

export default useLessonPlansData;
