import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import {
  initialMockAnnouncements,
  initialMockAttendanceRecords,
  initialMockResults,
  initialMockFeeSummaries,
} from './mockData';
import type {
  PortalAnnouncement,
  PortalAttendanceRecord,
  PortalResultSummary,
  PortalFeeSummary,
} from './types';

export const usePortalData = () => {
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<PortalAttendanceRecord[]>([]);
  const [results, setResults] = useState<PortalResultSummary[]>([]);
  const [feeSummaries, setFeeSummaries] = useState<PortalFeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    setAnnouncements(initialMockAnnouncements);
    setAttendanceRecords(initialMockAttendanceRecords);
    setResults(initialMockResults);
    setFeeSummaries(initialMockFeeSummaries);
  }, []);

  // Load announcements
  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['announcements'];
      const docs = await collection.find().exec();
      setAnnouncements(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for announcements:', err.message);
      setAnnouncements(initialMockAnnouncements);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load attendance records
  const loadAttendanceRecords = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['student_attendance'];
      const docs = await collection.find().where('student_id').eq(studentId).exec();
      setAttendanceRecords(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for attendance:', err.message);
      setAttendanceRecords(initialMockAttendanceRecords);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load results
  const loadResults = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['student_exam_results'];
      const docs = await collection.find().where('student_id').eq(studentId).exec();
      setResults(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for results:', err.message);
      setResults(initialMockResults);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load fee summaries
  const loadFeeSummaries = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['student_invoices'];
      const docs = await collection.find().where('student_id').eq(studentId).exec();
      setFeeSummaries(initialMockFeeSummaries);
    } catch (err: any) {
      console.warn('Using mock data for fees:', err.message);
      setFeeSummaries(initialMockFeeSummaries);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter announcements by audience
  const getAnnouncementsForUser = useCallback((userRole: string): PortalAnnouncement[] => {
    return announcements.filter(a => {
      if (!a.isPublished) return false;
      if (a.audience === 'all') return true;
      if (a.audience === userRole) return true;
      return false;
    });
  }, [announcements]);

  // Get attendance summary
  const getAttendanceSummary = useCallback(() => {
    const total = attendanceRecords.length;
    if (total === 0) return null;

    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
    const late = attendanceRecords.filter(r => r.status === 'Late').length;
    const excused = attendanceRecords.filter(r => r.status === 'Excused').length;

    return {
      totalDays: total,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      excusedDays: excused,
      attendancePercentage: Math.round((present / total) * 100),
    };
  }, [attendanceRecords]);

  return {
    announcements,
    attendanceRecords,
    results,
    feeSummaries,
    loading,
    error,
    loadAnnouncements,
    loadAttendanceRecords,
    loadResults,
    loadFeeSummaries,
    getAnnouncementsForUser,
    getAttendanceSummary,
  };
};
