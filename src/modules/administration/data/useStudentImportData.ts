// ABOUTME: Hook for student import data management
// ABOUTME: Provides CRUD operations for student import sessions and records using direct database access

import { useState, useCallback } from 'react';
import { databaseService } from '@/services/database/databaseService';
import type { StudentImportSession, StudentImportRecord } from '../data/types';
import type { Student } from '@/types';

export const useStudentImportData = () => {
  const [activeSession, setActiveSession] = useState<StudentImportSession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<StudentImportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const createImportSession = useCallback(async (filename: string, totalRecords: number): Promise<StudentImportSession> => {
    const db = await databaseService.getDatabase();
    const session: StudentImportSession = {
      id: databaseService.generateId(),
      filename,
      total_records: totalRecords,
      valid_records: 0,
      invalid_records: 0,
      imported_records: 0,
      failed_records: 0,
      status: 'Pending',
      started_by: 'current-user',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.student_import_sessions?.insert(session);
    setActiveSession(session);
    return session;
  }, []);

  const updateSessionStatus = useCallback(async (sessionId: string, updates: Partial<StudentImportSession>): Promise<void> => {
    const db = await databaseService.getDatabase();
    const session = await db.student_import_sessions?.get(sessionId);
    if (session) {
      await db.student_import_sessions?.update(sessionId, {
        ...session,
        ...updates,
        updated_at: new Date().toISOString()
      });
    }
  }, []);

  const addImportRecord = useCallback(async (record: Omit<StudentImportRecord, 'id' | 'created_at' | 'updated_at'>): Promise<StudentImportRecord> => {
    const db = await databaseService.getDatabase();
    const newRecord: StudentImportRecord = {
      ...record,
      id: databaseService.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.student_import_records?.insert(newRecord);
    return newRecord;
  }, []);

  const updateImportRecord = useCallback(async (record: StudentImportRecord): Promise<void> => {
    const db = await databaseService.getDatabase();
    await db.student_import_records?.update(record.id, {
      ...record,
      updated_at: new Date().toISOString()
    });
  }, []);

  const addStudentFromImport = useCallback(async (studentData: Omit<Student, 'id'>): Promise<Student | null> => {
    const db = await databaseService.getDatabase();
    const student: Student = {
      ...studentData,
      id: databaseService.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Student;
    
    await db.students?.insert(student);
    return student;
  }, []);

  const deleteImportSession = useCallback(async (id: string): Promise<void> => {
    const db = await databaseService.getDatabase();
    
    // Delete all records for this session
    const records = await db.student_import_records?.find({
      selector: { import_id: id }
    });
    
    if (records?.docs) {
      for (const record of records.docs) {
        await db.student_import_records?.remove(record.id);
      }
    }
    
    // Delete the session
    await db.student_import_sessions?.remove(id);
    
    if (activeSession?.id === id) {
      setActiveSession(null);
      setSessionRecords([]);
    }
  }, [activeSession]);

  const getRecordsBySession = useCallback(async (sessionId: string): Promise<StudentImportRecord[]> => {
    const db = await databaseService.getDatabase();
    const result = await db.student_import_records?.find({
      selector: { import_id: sessionId },
      sort: [{ row_number: 'asc' }]
    });
    
    return (result?.docs || []) as StudentImportRecord[];
  }, []);

  const loadSessionRecords = useCallback(async (sessionId: string): Promise<void> => {
    setLoading(true);
    try {
      const records = await getRecordsBySession(sessionId);
      setSessionRecords(records);
    } catch (error) {
      console.error('Error loading session records:', error);
    } finally {
      setLoading(false);
    }
  }, [getRecordsBySession]);

  return {
    activeSession,
    sessionRecords,
    loading,
    setActiveSession,
    setSessionRecords,
    createImportSession,
    updateSessionStatus,
    addImportRecord,
    updateImportRecord,
    deleteImportSession,
    getRecordsBySession,
    loadSessionRecords
  };
};
