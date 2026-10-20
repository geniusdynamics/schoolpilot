// ABOUTME: React hook for audit logging - integrates AuditLoggerService with UserContext
// ABOUTME: Provides user context automatically from the current session

import { useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { AuditLoggerService } from '../services/AuditLoggerService';

/**
 * Return type for the useAuditLogger hook
 */
interface UseAuditLoggerReturn {
  /** Log an INSERT operation */
  logInsert: (
    tableName: string,
    recordPk: string,
    newData: Record<string, unknown>
  ) => ReturnType<AuditLoggerService['logInsert']>;

  /** Log an UPDATE operation */
  logUpdate: (
    tableName: string,
    recordPk: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ) => ReturnType<AuditLoggerService['logUpdate']>;

  /** Log an UPDATE with automatic diff (only logs changed fields) */
  logUpdateDiff: (
    tableName: string,
    recordPk: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    trackedFields?: string[]
  ) => ReturnType<AuditLoggerService['logUpdateDiff']>;

  /** Log a DELETE operation (physical delete) */
  logDelete: (
    tableName: string,
    recordPk: string,
    oldData: Record<string, unknown>
  ) => ReturnType<AuditLoggerService['logDelete']>;

  /** Log a SOFT_DELETE operation (setting deleted_at) */
  logSoftDelete: (
    tableName: string,
    recordPk: string,
    identifyingData: Record<string, unknown>
  ) => ReturnType<AuditLoggerService['logSoftDelete']>;

  /** Get the audit logger service instance for advanced usage */
  getAuditService: () => AuditLoggerService;

  /** Current user ID (from UserContext) */
  currentUserId: string | null;

  /** Current user display name (from UserContext) */
  currentUserName: string | null;
}

/**
 * React hook for audit logging with automatic user context.
 *
 * Automatically provides user_id and user_name from UserContext
 * so callers don't need to pass them manually.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { logUpdate, logSoftDelete } = useAuditLogger();
 *
 *   const handleSave = async () => {
 *     await logUpdate('students', studentId, oldValues, newValues);
 *   };
 *
 *   const handleSoftDelete = async () => {
 *     await logSoftDelete('students', studentId, { admission_no: 'ADM001' });
 *   };
 * }
 * ```
 */
export function useAuditLogger(): UseAuditLoggerReturn {
  const { currentUser } = useUser();
  const auditService = AuditLoggerService.getInstance();

  const userId = currentUser?.id ?? null;
  const userName = currentUser?.display_name ?? currentUser?.username ?? null;

  const logInsert = useCallback(
    (tableName: string, recordPk: string, newData: Record<string, unknown>) =>
      auditService.logInsert(tableName, recordPk, newData, userId, userName),
    [auditService, userId, userName]
  );

  const logUpdate = useCallback(
    (tableName: string, recordPk: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) =>
      auditService.logUpdate(tableName, recordPk, oldData, newData, userId, userName),
    [auditService, userId, userName]
  );

  const logUpdateDiff = useCallback(
    (tableName: string, recordPk: string, oldData: Record<string, unknown>, newData: Record<string, unknown>, trackedFields?: string[]) =>
      auditService.logUpdateDiff(tableName, recordPk, oldData, newData, userId, userName, trackedFields),
    [auditService, userId, userName]
  );

  const logDelete = useCallback(
    (tableName: string, recordPk: string, oldData: Record<string, unknown>) =>
      auditService.logDelete(tableName, recordPk, oldData, userId, userName),
    [auditService, userId, userName]
  );

  const logSoftDelete = useCallback(
    (tableName: string, recordPk: string, identifyingData: Record<string, unknown>) =>
      auditService.logSoftDelete(tableName, recordPk, identifyingData, userId, userName),
    [auditService, userId, userName]
  );

  const getAuditService = useCallback(() => auditService, [auditService]);

  return {
    logInsert,
    logUpdate,
    logUpdateDiff,
    logDelete,
    logSoftDelete,
    getAuditService,
    currentUserId: userId,
    currentUserName: userName
  };
}

export default useAuditLogger;