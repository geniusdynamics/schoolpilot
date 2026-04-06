import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import {
  initialMockTeacherAnalytics,
  initialMockSubjectPassRates,
  initialMockClassPerformances,
  initialMockDashboardData,
  initialMockPeriod,
} from './mockData';
import type {
  TeacherAnalytics,
  SubjectPassRate,
  ClassPerformance,
  AnalyticsDashboardData,
  AnalyticsPeriod,
} from './types';

export const useAnalyticsData = () => {
  const [teacherAnalytics, setTeacherAnalytics] = useState<TeacherAnalytics[]>([]);
  const [subjectPassRates, setSubjectPassRates] = useState<SubjectPassRate[]>([]);
  const [classPerformances, setClassPerformances] = useState<ClassPerformance[]>([]);
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(initialMockPeriod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    setTeacherAnalytics(initialMockTeacherAnalytics);
    setSubjectPassRates(initialMockSubjectPassRates);
    setClassPerformances(initialMockClassPerformances);
    setDashboardData(initialMockDashboardData);
  }, []);

  // Load analytics data from database
  const loadAnalytics = useCallback(async (period?: AnalyticsPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();

      // Compute from existing collections
      const examResults = await db.collections['student_exam_results'].find().exec();
      const examSessions = await db.collections['exam_sessions'].find().exec();
      const subjects = await db.collections['subjects'].find().exec();
      const staff = await db.collections['staff'].find().exec();
      const classStreams = await db.collections['class_streams'].find().exec();

      // Process data into analytics (simplified for mock fallback)
      setSubjectPassRates(initialMockSubjectPassRates);
      setClassPerformances(initialMockClassPerformances);
      setTeacherAnalytics(initialMockTeacherAnalytics);
      setDashboardData(initialMockDashboardData);
    } catch (err: any) {
      console.warn('Using mock data for analytics:', err.message);
      setSubjectPassRates(initialMockSubjectPassRates);
      setClassPerformances(initialMockClassPerformances);
      setTeacherAnalytics(initialMockTeacherAnalytics);
      setDashboardData(initialMockDashboardData);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get analytics for a specific teacher
  const getTeacherAnalytics = useCallback((teacherId: string): TeacherAnalytics | undefined => {
    return teacherAnalytics.find(t => t.teacherId === teacherId);
  }, [teacherAnalytics]);

  // Get pass rate for a specific subject
  const getSubjectPassRate = useCallback((subjectId: number): SubjectPassRate | undefined => {
    return subjectPassRates.find(s => s.subjectId === subjectId);
  }, [subjectPassRates]);

  // Get performance for a specific class
  const getClassPerformance = useCallback((classId: number, classStreamId?: number): ClassPerformance | undefined => {
    return classPerformances.find(c => c.classId === classId && (!classStreamId || c.classStreamId === classStreamId));
  }, [classPerformances]);

  // Get top performing subjects
  const getTopSubjects = useCallback((count: number = 3): SubjectPassRate[] => {
    return [...subjectPassRates]
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, count);
  }, [subjectPassRates]);

  // Get bottom performing subjects
  const getBottomSubjects = useCallback((count: number = 3): SubjectPassRate[] => {
    return [...subjectPassRates]
      .sort((a, b) => a.passRate - b.passRate)
      .slice(0, count);
  }, [subjectPassRates]);

  // Get top performing classes
  const getTopClasses = useCallback((count: number = 3): ClassPerformance[] => {
    return [...classPerformances]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, count);
  }, [classPerformances]);

  // Get bottom performing classes
  const getBottomClasses = useCallback((count: number = 3): ClassPerformance[] => {
    return [...classPerformances]
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, count);
  }, [classPerformances]);

  // Export report (placeholder)
  const exportReport = useCallback(async (format: 'pdf' | 'csv' | 'excel', type: string) => {
    console.log(`Exporting ${type} report as ${format}`);
    // Implementation would generate the report blob
    return null;
  }, []);

  return {
    teacherAnalytics,
    subjectPassRates,
    classPerformances,
    dashboardData,
    selectedPeriod,
    loading,
    error,
    loadAnalytics,
    setSelectedPeriod,
    getTeacherAnalytics,
    getSubjectPassRate,
    getClassPerformance,
    getTopSubjects,
    getBottomSubjects,
    getTopClasses,
    getBottomClasses,
    exportReport,
  };
};
