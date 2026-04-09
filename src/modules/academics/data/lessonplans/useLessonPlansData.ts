// ABOUTME: Data hook for lesson plans management
// ABOUTME: Provides CRUD operations and state management for lesson plans

import { useState, useEffect, useCallback } from 'react';

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
  reviewedAt?: string;
  reviewComments?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockLessonPlans: LessonPlan[] = [
  {
    id: '1',
    title: 'Introduction to Algebra',
    description: 'Basic algebraic concepts and operations',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    classId: 'class-1',
    className: 'Grade 10A',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    objectives: ['Understand variables', 'Learn basic operations'],
    content: 'Introduction to variables and basic algebraic operations',
    resources: ['Textbook Chapter 1', 'Worksheet A'],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockLessonNotes: LessonNote[] = [];

const mockWeeklyPlans: WeeklyPlan[] = [
  {
    id: '1',
    title: 'Week 1: Introduction to Algebra',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    topic: 'Introduction to Algebra',
    objectives: ['Understand variables', 'Learn basic operations'],
    materials: ['Textbook', 'Worksheets'],
    duration: 5,
    status: PlanStatus.SUBMITTED,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Week 2: Linear Equations',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    topic: 'Linear Equations',
    objectives: ['Solve linear equations', 'Graph linear functions'],
    materials: ['Textbook', 'Graph paper'],
    duration: 5,
    status: PlanStatus.APPROVED,
    reviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Week 3: Quadratic Functions',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    topic: 'Quadratic Functions',
    objectives: ['Understand quadratic equations', 'Solve by factoring'],
    materials: ['Textbook', 'Calculator'],
    duration: 5,
    status: PlanStatus.REJECTED,
    reviewComments: 'Please add more practice problems',
    reviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

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
  reviewPlan: (id: string, status: PlanStatus, comments?: string) => Promise<WeeklyPlan>;
  getPlansByStatus: (status: PlanStatus) => WeeklyPlan[];
  refresh: () => Promise<void>;
}

export function useLessonPlansData(): UseLessonPlansDataReturn {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>(mockLessonNotes);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>(mockWeeklyPlans);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        setLessonPlans(mockLessonPlans);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson plans');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const createLessonPlan = useCallback(async (data: Partial<LessonPlan>): Promise<LessonPlan> => {
    const newPlan: LessonPlan = {
      id: Date.now().toString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLessonPlans(prev => [...prev, newPlan]);
    return newPlan;
  }, []);

  const updateLessonPlan = useCallback(async (id: string, data: Partial<LessonPlan>): Promise<LessonPlan> => {
    let updated: LessonPlan | null = null;
    setLessonPlans(prev => prev.map(p => {
      if (p.id === id) {
        updated = { ...p, ...data, updatedAt: new Date().toISOString() };
        return updated;
      }
      return p;
    }));
    if (!updated) throw new Error('Lesson plan not found');
    return updated;
  }, []);

  const deleteLessonPlan = useCallback(async (id: string): Promise<void> => {
    setLessonPlans(prev => prev.filter(p => p.id !== id));
  }, []);

  const createLessonNote = useCallback(async (data: Partial<LessonNote>): Promise<LessonNote> => {
    const newNote: LessonNote = {
      id: Date.now().toString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLessonNotes(prev => [...prev, newNote]);
    return newNote;
  }, []);

  const updateLessonNote = useCallback(async (id: string, data: Partial<LessonNote>): Promise<LessonNote> => {
    let updated: LessonNote | null = null;
    setLessonNotes(prev => prev.map(n => {
      if (n.id === id) {
        updated = { ...n, ...data, updatedAt: new Date().toISOString() };
        return updated;
      }
      return n;
    }));
    if (!updated) throw new Error('Lesson note not found');
    return updated;
  }, []);

  const deleteLessonNote = useCallback(async (id: string): Promise<void> => {
    setLessonNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const reviewPlan = useCallback(async (id: string, status: PlanStatus, comments?: string): Promise<WeeklyPlan> => {
    let updated: WeeklyPlan | null = null;
    setWeeklyPlans(prev => prev.map(p => {
      if (p.id === id) {
        updated = { 
          ...p, 
          status, 
          reviewComments: comments,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
        return updated;
      }
      return p;
    }));
    if (!updated) throw new Error('Weekly plan not found');
    return updated;
  }, []);

  const getPlansByStatus = useCallback((status: PlanStatus): WeeklyPlan[] => {
    return weeklyPlans.filter(p => p.status === status);
  }, [weeklyPlans]);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setLessonPlans(mockLessonPlans);
      setLessonNotes(mockLessonNotes);
      setWeeklyPlans(mockWeeklyPlans);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh lesson plans');
    } finally {
      setLoading(false);
    }
  }, []);

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
    refresh,
  };
}

export default useLessonPlansData;