import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import {
  initialMockPickupCodes,
  initialMockAuthorizedPersons,
  initialMockStudentAuthorizations,
  initialMockPickupLogs,
} from './mockData';
import type {
  PickupCode,
  AuthorizedPerson,
  StudentAuthorization,
  PickupLog,
  PickupCodeStatus,
} from './types';

export const usePickupData = () => {
  const [pickupCodes, setPickupCodes] = useState<PickupCode[]>([]);
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>([]);
  const [studentAuthorizations, setStudentAuthorizations] = useState<StudentAuthorization[]>([]);
  const [pickupLogs, setPickupLogs] = useState<PickupLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    setPickupCodes(initialMockPickupCodes);
    setAuthorizedPersons(initialMockAuthorizedPersons);
    setStudentAuthorizations(initialMockStudentAuthorizations);
    setPickupLogs(initialMockPickupLogs);
  }, []);

  // Load pickup codes
  const loadPickupCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['pickup_codes'];
      const docs = await collection.find().exec();
      setPickupCodes(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for pickup codes:', err.message);
      setPickupCodes(initialMockPickupCodes);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate pickup code
  const generatePickupCode = useCallback(async (data: Partial<PickupCode>) => {
    const now = new Date().toISOString();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min default

    const newCode = {
      id: `PC${Date.now()}`,
      code,
      status: 'ACTIVE' as PickupCodeStatus,
      generatedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ...data,
    } as PickupCode;

    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['pickup_codes'];
      await collection.insert(newCode as any);
    } catch (err: any) {
      console.warn('Failed to save pickup code in DB, using local state:', err.message);
    }

    setPickupCodes(prev => [...prev, newCode]);
    return newCode;
  }, []);

  // Revoke pickup code
  const revokePickupCode = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['pickup_codes'];
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.update({ $set: { status: 'REVOKED', updatedAt: now } });
      }
    } catch (err: any) {
      console.warn('Failed to revoke pickup code in DB, using local state:', err.message);
    }
    setPickupCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'REVOKED' as PickupCodeStatus, updatedAt: now } : c));
  }, []);

  // Load authorized persons
  const loadAuthorizedPersons = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['authorized_persons'];
      const docs = await collection.find().exec();
      setAuthorizedPersons(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for authorized persons:', err.message);
      setAuthorizedPersons(initialMockAuthorizedPersons);
    }
  }, []);

  // Add authorized person
  const addAuthorizedPerson = useCallback(async (data: Partial<AuthorizedPerson>) => {
    const now = new Date().toISOString();
    const newPerson = {
      id: `AP${Date.now()}`,
      isActive: true,
      isPrimary: false,
      createdAt: now,
      updatedAt: now,
      ...data,
    } as AuthorizedPerson;

    setAuthorizedPersons(prev => [...prev, newPerson]);
    return newPerson;
  }, []);

  // Update authorized person
  const updateAuthorizedPerson = useCallback(async (id: string, updates: Partial<AuthorizedPerson>) => {
    setAuthorizedPersons(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, []);

  // Remove authorized person
  const removeAuthorizedPerson = useCallback(async (id: string) => {
    setAuthorizedPersons(prev => prev.filter(p => p.id !== id));
  }, []);

  // Load student authorizations
  const loadStudentAuthorizations = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['student_authorizations'];
      const docs = await collection.find().exec();
      setStudentAuthorizations(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for authorizations:', err.message);
      setStudentAuthorizations(initialMockStudentAuthorizations);
    }
  }, []);

  // Create/update student authorization
  const saveStudentAuthorization = useCallback(async (data: Partial<StudentAuthorization>) => {
    const now = new Date().toISOString();
    const newAuth = {
      id: data.id || `SA${Date.now()}`,
      createdAt: data.createdAt || now,
      updatedAt: now,
      ...data,
    } as StudentAuthorization;

    setStudentAuthorizations(prev => {
      const existing = prev.findIndex(a => a.id === newAuth.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAuth;
        return updated;
      }
      return [...prev, newAuth];
    });
    return newAuth;
  }, []);

  // Load pickup logs
  const loadPickupLogs = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['pickup_logs'];
      const docs = await collection.find().sort({ pickup_time: 'desc' }).exec();
      setPickupLogs(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for pickup logs:', err.message);
      setPickupLogs(initialMockPickupLogs);
    }
  }, []);

  // Record pickup
  const recordPickup = useCallback(async (data: Partial<PickupLog>) => {
    const now = new Date().toISOString();
    const newLog = {
      id: `PL${Date.now()}`,
      pickupTime: now,
      pickupDate: new Date().toISOString().split('T')[0],
      createdAt: now,
      ...data,
    } as PickupLog;

    setPickupLogs(prev => [newLog, ...prev]);

    // Mark pickup code as used if applicable
    if (data.pickupCodeId) {
      setPickupCodes(prev => prev.map(c =>
        c.id === data.pickupCodeId
          ? { ...c, status: 'USED' as PickupCodeStatus, usedAt: now, updatedAt: now }
          : c
      ));
    }

    return newLog;
  }, []);

  // Verify pickup code
  const verifyPickupCode = useCallback((code: string): PickupCode | null => {
    return pickupCodes.find(c =>
      c.code === code &&
      c.status === 'ACTIVE' &&
      new Date(c.expiresAt) > new Date()
    ) || null;
  }, [pickupCodes]);

  // Get authorized persons for student
  const getAuthorizedPersonsForStudent = useCallback((studentId: string) => {
    return authorizedPersons.filter(p => p.studentId === studentId && p.isActive);
  }, [authorizedPersons]);

  // Get pickup logs for student
  const getPickupLogsForStudent = useCallback((studentId: string) => {
    return pickupLogs.filter(l => l.studentId === studentId);
  }, [pickupLogs]);

  // Get today's pickup logs
  const getTodaysPickupLogs = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return pickupLogs.filter(l => l.pickupDate === today);
  }, [pickupLogs]);

  return {
    pickupCodes,
    authorizedPersons,
    studentAuthorizations,
    pickupLogs,
    loading,
    error,
    loadPickupCodes,
    loadAuthorizedPersons,
    loadStudentAuthorizations,
    loadPickupLogs,
    generatePickupCode,
    revokePickupCode,
    addAuthorizedPerson,
    updateAuthorizedPerson,
    removeAuthorizedPerson,
    saveStudentAuthorization,
    recordPickup,
    verifyPickupCode,
    getAuthorizedPersonsForStudent,
    getPickupLogsForStudent,
    getTodaysPickupLogs,
  };
};
