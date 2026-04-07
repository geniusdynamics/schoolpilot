import { useState, useEffect, useCallback } from 'react';
import type { LessonPlan, LessonPlanSubmission } from './types';

const mockLessonPlans: LessonPlan[] = [
  {
    id: '1',
    title: 'Introduction to Algebra',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'stream-1',
    classStreamName: 'Grade 10A - Science',
    topic: 'Introduction to Algebra',
    objectives: [
      'Understand basic algebraic concepts',
      'Learn to solve linear equations',
      'Practice with simple algebraic expressions'
    ],
    materials: ['Whiteboard', 'Markers', 'Algebra worksheets', 'Graph paper'],
    duration: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockSubmissions: LessonPlanSubmission[] = [
  {
    id: '1',
    lessonPlanId: '1',
    studentId: 'student-1',
    studentName: 'Alice Johnson',
    status: 'Submitted',
    submissionDate: new Date().toISOString(),
    feedback: null,
    maxScore: 100,
  },
];

interface UseLessonPlansDataReturn {
  lessonPlans: LessonPlan[];
  submissions: LessonPlanSubmission[];
  loading: boolean;
  error: string | null;
  createLessonPlan: (data: Partial<LessonPlan>) => Promise<LessonPlan>;
  updateLessonPlan: (id: string, data: Partial<LessonPlan>) => Promise<LessonPlan>;
  deleteLessonPlan: (id: string) => Promise<void>;
  gradeSubmission: (submissionId: string, score: number, feedback?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLessonPlansData(): UseLessonPlansDataReturn {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [submissions, setSubmissions] = useState<LessonPlanSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        setLessonPlans(mockLessonPlans);
        setSubmissions(mockSubmissions);
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
    const newLessonPlan: LessonPlan = {
      id: Date.now().toString(),
      title: data.title || 'New Lesson Plan',
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
      duration: data.duration || 45,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLessonPlans(prev => [...prev, newLessonPlan]);
    return newLessonPlan;
  }, []);

  const updateLessonPlan = useCallback(async (id: string, data: Partial<LessonPlan>): Promise<LessonPlan> => {
    let updated: LessonPlan | null = null;
    setLessonPlans(prev => prev.map(l => {
      if (l.id === id) {
        updated = { ...l, ...data, updated_at: new Date().toISOString() };
        return updated;
      }
      return l;
    }));
    if (!updated) throw new Error('Lesson plan not found');
    return updated;
  }, []);

  const deleteLessonPlan = useCallback(async (id: string): Promise<void> => {
    setLessonPlans(prev => prev.filter(l => l.id !== id));
    setSubmissions(prev => prev.filter(s => s.lessonPlanId !== id));
  }, []);

  const gradeSubmission = useCallback(async (submissionId: string, score: number, feedback?: string): Promise<void> => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          score,
          feedback: feedback || null,
        };
      }
      return s;
    }));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setLessonPlans(mockLessonPlans);
      setSubmissions(mockSubmissions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh lesson plans');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    lessonPlans,
    submissions,
    loading,
    error,
    createLessonPlan,
    updateLessonPlan,
    deleteLessonPlan,
    gradeSubmission,
    refresh,
  };
}

export default useLessonPlansData;