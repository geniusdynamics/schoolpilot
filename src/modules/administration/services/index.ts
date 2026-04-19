// ABOUTME: Barrel exports for administration services
// ABOUTME: Business logic services for administration module

// Student Management - legacy CRUD service (will be enhanced in future iterations)
export { StudentManagementService } from './StudentManagementService';

// Student Promotion - replaces sp_adm_promoteStudent stored procedure
export { StudentPromotionService } from './StudentPromotionService';
export type { PromotionParams, PromotionResult, ICollectionAdapter } from './StudentPromotionService';
// Re-export StudentClassHistoryEntry from data/types for convenience
export type { StudentClassHistoryEntry } from '../data/types';

// Audit Logger - replaces trg_log_adm_students_after_update trigger
export { AuditLoggerService, auditLogger } from './AuditLoggerService';
export type { AuditConfig } from './AuditLoggerService';

// Shared service types (AuditLogEntry, AuditAction)
export type { AuditAction, AuditLogEntry } from './types';