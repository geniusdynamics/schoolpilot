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
  lessonPlanId: string;
  content: string;
  authorId: string;
  authorName: string;
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

interface UseLessonPlansDataReturn {
  lessonPlans: LessonPlan[];
  loading: boolean;
  error: string | null;
  createLessonPlan: (data: Partial<LessonPlan>) => Promise<LessonPlan>;
  updateLessonPlan: (id: string, data: Partial<LessonPlan>) => Promise<LessonPlan>;
  deleteLessonPlan: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLessonPlansData(): UseLessonPlansDataReturn {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
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

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setLessonPlans(mockLessonPlans);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh lesson plans');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    lessonPlans,
    loading,
    error,
    createLessonPlan,
    updateLessonPlan,
    deleteLessonPlan,
    refresh,
  };
}

export default useLessonPlansData;