// ABOUTME: AuditLoggerService - Cross-module audit logging service
// ABOUTME: Replaces trg_log_adm_students_after_update trigger from Akademico DB
// ABOUTME: Provides generic audit trail for all entity mutations

import type { AuditAction, AuditLogEntry } from './types';

/**
 * Options for configuring which fields to track for a given entity
 */
export interface AuditConfig {
  /** The collection/table name (e.g., 'students', 'invoices') */
  tableName: string;
  /** Fields to track for changes (others are ignored in old_data/new_data) */
  trackedFields?: string[];
  /** Fields to include in the summary log (for concise audit entries) */
  summaryFields?: string[];
}

/**
 * Minimal interface for database collection operations.
 * Allows the service to work with any database provider.
 */
interface ICollectionAdapter {
  insert(doc: Record<string, unknown>): Promise<unknown>;
}

/**
 * AuditLoggerService - Generic audit logging service for all modules.
 *
 * Replaces the database trigger `trg_log_adm_students_after_update` from the
 * Akademico database. Instead of an automatic trigger, this service is called
 * explicitly after entity mutations, giving the application full control over
 * what gets logged.
 *
 * Usage (direct):
 * ```typescript
 * const auditService = AuditLoggerService.getInstance();
 * await auditService.logUpdate('students', studentId, oldValues, newValues);
 * await auditService.logSoftDelete('students', studentId, { admission_no: 'ADM001' });
 * ```
 *
 * Usage (via hook):
 * ```typescript
 * const { logUpdate, logSoftDelete } = useAuditLogger();
 * await logUpdate('students', studentId, oldValues, newValues);
 * ```
 */
export class AuditLoggerService {
  private static instance: AuditLoggerService;
  private auditCollection: ICollectionAdapter | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): AuditLoggerService {
    if (!AuditLoggerService.instance) {
      AuditLoggerService.instance = new AuditLoggerService();
    }
    return AuditLoggerService.instance;
  }

  /**
   * Set the database collection for audit logs
   */
  public setCollection(collection: ICollectionAdapter): void {
    this.auditCollection = collection;
  }

  /**
   * Log an INSERT operation
   */
  async logInsert(
    tableName: string,
    recordPk: string,
    newData: Record<string, unknown>,
    userId?: string | null,
    userName?: string | null
  ): Promise<AuditLogEntry | null> {
    return this.createLogEntry({
      action: 'INSERT',
      tableName,
      recordPk,
      oldData: null,
      newData,
      userId,
      userName
    });
  }

  /**
   * Log an UPDATE operation
   * Only tracks changed fields if trackedFields is configured
   */
  async logUpdate(
    tableName: string,
    recordPk: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    userId?: string | null,
    userName?: string | null
  ): Promise<AuditLogEntry | null> {
    return this.createLogEntry({
      action: 'UPDATE',
      tableName,
      recordPk,
      oldData,
      newData,
      userId,
      userName
    });
  }

  /**
   * Log a DELETE operation (physical delete)
   */
  async logDelete(
    tableName: string,
    recordPk: string,
    oldData: Record<string, unknown>,
    userId?: string | null,
    userName?: string | null
  ): Promise<AuditLogEntry | null> {
    return this.createLogEntry({
      action: 'DELETE',
      tableName,
      recordPk,
      oldData,
      newData: null,
      userId,
      userName
    });
  }

  /**
   * Log a SOFT_DELETE operation (setting deleted_at)
   * This directly mirrors the original trigger behavior:
   *   IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
   *     INSERT INTO log_audit (..., action, old_data) VALUES ('SOFT_DELETE', ..., JSON_OBJECT('admission_no', OLD.admission_no))
   */
  async logSoftDelete(
    tableName: string,
    recordPk: string,
    identifyingData: Record<string, unknown>,
    userId?: string | null,
    userName?: string | null
  ): Promise<AuditLogEntry | null> {
    return this.createLogEntry({
      action: 'SOFT_DELETE',
      tableName,
      recordPk,
      oldData: identifyingData,
      newData: null,
      userId,
      userName
    });
  }

  /**
   * Compute the diff between old and new data, returning only changed fields
   */
  computeDiff(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    trackedFields?: string[]
  ): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } {
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    const fieldsToCheck = trackedFields || [
      ...new Set([...Object.keys(oldData), ...Object.keys(newData)])
    ];

    for (const field of fieldsToCheck) {
      const oldVal = oldData[field];
      const newVal = newData[field];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        oldValues[field] = oldVal ?? null;
        newValues[field] = newVal ?? null;
      }
    }

    return { oldValues, newValues };
  }

  /**
   * Log an update with automatic diff computation (only logs changed fields)
   */
  async logUpdateDiff(
    tableName: string,
    recordPk: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    userId?: string | null,
    userName?: string | null,
    trackedFields?: string[]
  ): Promise<AuditLogEntry | null> {
    const { oldValues, newValues } = this.computeDiff(oldData, newData, trackedFields);

    // Only log if there are actual changes
    if (Object.keys(oldValues).length === 0) {
      return null;
    }

    return this.createLogEntry({
      action: 'UPDATE',
      tableName,
      recordPk,
      oldData: oldValues,
      newData: newValues,
      userId,
      userName
    });
  }

  /**
   * Internal: Create an audit log entry in the database
   */
  private async createLogEntry(params: {
    action: AuditAction;
    tableName: string;
    recordPk: string;
    oldData: Record<string, unknown> | null;
    newData: Record<string, unknown> | null;
    userId?: string | null;
    userName?: string | null;
  }): Promise<AuditLogEntry | null> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      user_id: params.userId ?? null,
      user_name: params.userName ?? null,
      action: params.action,
      table_name: params.tableName,
      record_pk: params.recordPk,
      old_data: params.oldData,
      new_data: params.newData,
      changed_at: new Date().toISOString(),
      ip_address: null,
      user_agent: null
    };

    try {
      if (this.auditCollection && typeof this.auditCollection.insert === 'function') {
        await this.auditCollection.insert(entry as unknown as Record<string, unknown>);
      }
      return entry;
    } catch (error) {
      console.error('[AuditLoggerService] Failed to write audit log:', error);
      // Don't throw - audit logging should not block the main operation
      return null;
    }
  }

  /**
   * Generate a unique ID for audit entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Audit action type matching the database ENUM
 */
export type { AuditAction } from './types';

// Re-export convenience functions
export const auditLogger = AuditLoggerService.getInstance();