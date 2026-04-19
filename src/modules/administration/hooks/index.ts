// ABOUTME: Barrel exports for administration hooks
// ABOUTME: Module-specific hooks for administration

// Main modular hook (new architecture) - USE THIS for all Administration pages
export { useAdministration } from './useAdministration';

// Service hooks (new architecture) - service-backed React hooks
export { useStudentPromotion } from './useStudentPromotion';
export { useAuditLogger } from './useAuditLogger';

// P1 Computed view hooks - replacing PgSQL views
export { useStudentMasterlist } from './useStudentMasterlist';
export type { StudentMasterlistRow } from './useStudentMasterlist';