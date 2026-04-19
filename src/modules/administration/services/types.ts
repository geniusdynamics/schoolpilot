// ABOUTME: Shared types for administration module services
// ABOUTME: Audit action types matching the database ENUM log.audit_action

/**
 * Audit action type matching PgSQL ENUM: log.audit_action
 * Values: INSERT, UPDATE, DELETE, SOFT_DELETE
 */
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE';

/**
 * Audit log entry interface matching the audit_logs collection schema
 */
export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: AuditAction;
  table_name: string;
  record_pk: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}