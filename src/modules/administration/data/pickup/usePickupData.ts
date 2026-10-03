import { useCallback } from 'react';
import { logger } from '@/utils/logging';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

// ABOUTME: Database-backed hook for the pickup module.
// ABOUTME: Reads/writes the real `pickup_codes`, `authorized_persons`,
// ABOUTME: `student_authorizations` and `pickup_logs` collections via
// ABOUTME: useDatabaseCollection — no local mock state. Empty DB = empty arrays.

import type {
  PickupCode,
  AuthorizedPerson,
  StudentAuthorization,
  PickupLog,
  PickupCodeStatus,
} from './types';

export const usePickupData = () => {
  const codesCollection = useDatabaseCollection<PickupCode>('pickup_codes');
  const personsCollection = useDatabaseCollection<AuthorizedPerson>('authorized_persons');
  const authorizationsCollection =
    useDatabaseCollection<StudentAuthorization>('student_authorizations');
  const logsCollection = useDatabaseCollection<PickupLog>('pickup_logs');

  // Data comes straight from the database — empty until seeded or populated
  const pickupCodes = codesCollection.data;
  const authorizedPersons = personsCollection.data;
  const studentAuthorizations = authorizationsCollection.data;
  const pickupLogs = logsCollection.data;

  const loading =
    codesCollection.loading ||
    personsCollection.loading ||
    authorizationsCollection.loading ||
    logsCollection.loading;
  const error =
    codesCollection.error?.message ||
    personsCollection.error?.message ||
    authorizationsCollection.error?.message ||
    logsCollection.error?.message ||
    null;

  // ── Loaders ──────────────────────────────────────────────────
  const loadPickupCodes = useCallback(async () => {
    await codesCollection.refresh();
  }, [codesCollection]);

  const loadAuthorizedPersons = useCallback(async () => {
    await personsCollection.refresh();
  }, [personsCollection]);

  const loadStudentAuthorizations = useCallback(async () => {
    await authorizationsCollection.refresh();
  }, [authorizationsCollection]);

  const loadPickupLogs = useCallback(async () => {
    await logsCollection.refresh();
  }, [logsCollection]);

  // ── Pickup codes ─────────────────────────────────────────────
  const generatePickupCode = useCallback(
    async (data: Partial<PickupCode>) => {
      const now = new Date().toISOString();
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      return codesCollection.insert({
        studentId: '',
        code,
        qrData: null,
        status: 'ACTIVE' as PickupCodeStatus,
        generatedAt: now,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min default
        usedAt: null,
        usedBy: null,
        verifiedBy: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as Omit<PickupCode, 'id'> & { id?: string });
    },
    [codesCollection]
  );

  const revokePickupCode = useCallback(
    async (id: string) => {
      return codesCollection.update(id, {
        status: 'REVOKED' as PickupCodeStatus,
        updatedAt: new Date().toISOString(),
      });
    },
    [codesCollection]
  );

  // ── Authorized persons ───────────────────────────────────────
  const addAuthorizedPerson = useCallback(
    async (data: Partial<AuthorizedPerson>) => {
      const now = new Date().toISOString();
      return personsCollection.insert({
        studentId: '',
        firstName: '',
        lastName: '',
        relationship: '',
        phone: '',
        email: null,
        photoUrl: null,
        idDocumentType: null,
        idDocumentNumber: null,
        isPrimary: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as Omit<AuthorizedPerson, 'id'> & { id?: string });
    },
    [personsCollection]
  );

  const updateAuthorizedPerson = useCallback(
    async (id: string, updates: Partial<AuthorizedPerson>) => {
      return personsCollection.update(id, { ...updates, updatedAt: new Date().toISOString() });
    },
    [personsCollection]
  );

  const removeAuthorizedPerson = useCallback(
    async (id: string) => {
      return personsCollection.remove(id);
    },
    [personsCollection]
  );

  // ── Student authorizations ───────────────────────────────────
  const saveStudentAuthorization = useCallback(
    async (data: Partial<StudentAuthorization>) => {
      const now = new Date().toISOString();
      const payload = {
        studentId: '',
        authorizedPersonIds: [] as string[],
        specialInstructions: null,
        restrictions: null,
        createdBy: '',
        createdAt: now,
        updatedAt: now,
        ...data,
      } as Omit<StudentAuthorization, 'id'> & { id?: string };

      // Upsert semantics: update when an id is supplied and already exists
      const exists = data.id ? studentAuthorizations.some(a => a.id === data.id) : false;
      if (data.id && exists) {
        return authorizationsCollection.update(data.id, payload);
      }
      return authorizationsCollection.insert(payload);
    },
    [authorizationsCollection, studentAuthorizations]
  );

  // ── Pickup logs ──────────────────────────────────────────────
  const recordPickup = useCallback(
    async (data: Partial<PickupLog>) => {
      const now = new Date().toISOString();

      const newLog = await logsCollection.insert({
        studentId: '',
        pickupCodeId: null,
        authorizedPersonId: '',
        authorizedPersonName: '',
        relationship: '',
        pickupTime: now,
        pickupDate: now.split('T')[0],
        verifiedBy: '',
        verifiedByName: '',
        method: 'manual',
        notes: null,
        createdAt: now,
        ...data,
      } as Omit<PickupLog, 'id'> & { id?: string });

      // Mark pickup code as used if applicable
      if (data.pickupCodeId) {
        try {
          await codesCollection.update(data.pickupCodeId, {
            status: 'USED' as PickupCodeStatus,
            usedAt: now,
            updatedAt: now,
          });
        } catch (err) {
          logger.warn('[usePickupData] Failed to mark pickup code as used:', err);
        }
      }

      return newLog;
    },
    [logsCollection, codesCollection]
  );

  // ── Derived views ────────────────────────────────────────────
  const verifyPickupCode = useCallback(
    (code: string): PickupCode | null => {
      return (
        pickupCodes.find(
          c =>
            c.code === code &&
            c.status === 'ACTIVE' &&
            new Date(c.expiresAt) > new Date()
        ) || null
      );
    },
    [pickupCodes]
  );

  const getAuthorizedPersonsForStudent = useCallback(
    (studentId: string) => {
      return authorizedPersons.filter(p => p.studentId === studentId && p.isActive);
    },
    [authorizedPersons]
  );

  const getPickupLogsForStudent = useCallback(
    (studentId: string) => {
      return pickupLogs.filter(l => l.studentId === studentId);
    },
    [pickupLogs]
  );

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
