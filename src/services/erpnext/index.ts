
/**
 * ERPNext Integration Module
 * 
 * Complete ERPNext integration for SchoolPilot3.
 * 
 * @example
 * ```typescript
 * import { ERPNextProvider, ERPNextClient } from '@/services/erpnext';
 * 
 * const provider = new ERPNextProvider({
 *   erpnext: {
 *     id: 'erpnext-1',
 *     name: 'School ERPNext',
 *     type: 'erpnext',
 *     baseUrl: 'https://erp.school.edu',
 *     auth: {
 *       type: 'apikey',
 *       apiKey: 'your-api-key',
 *       apiSecret: 'your-api-secret'
 *     },
 *     sync: {
 *       enabled: true,
 *       interval: 300,
 *       conflictResolution: 'timestamp-wins',
 *       entities: {
 *         students: { enabled: true, direction: 'bidirectional', priority: 10, batchSize: 100 },
 *         attendance: { enabled: true, direction: 'to-erpnext', priority: 10, batchSize: 500 }
 *       }
 *     }
 *   }
 * });
 * 
 * await uds.initialize('erpnext', provider);
 * 
 * // Monitor sync status
 * provider.onSyncStatusChange = (statuses) => {
 *   logger.info('Sync status:', statuses);
 * };
 * ```
 */

// Types
export type {
  ERPNextConfig,
  ERPNextEntity,
  ERPNextStudent,
  ERPNextEmployee,
  ERPNextCourse,
  ERPNextStudentGroup,
  ERPNextProgram,
  ERPNextProgramEnrollment,
  ERPNextStudentAttendance,
  ERPNextCourseSchedule,
  ERPNextAssessmentResult,
  ERPNextFeeStructure,
  ERPNextFees,
  ERPNextSyncMapping,
  ERPNextSyncState,
  ERPNextEntityStatus,
  FieldMapping,
  ERPNextListResponse,
  ERPNextDocResponse,
  ERPNextWebhookPayload,
} from './types';

// Client & Provider
export { ERPNextClient } from './ERPNextClient';
export { ERPNextProvider, type ERPNextProviderConfig } from './ERPNextProvider';

// Mappings
export {
  studentMapping,
  teacherMapping,
  classMapping,
  subjectMapping,
  attendanceMapping,
  feeStructureMapping,
  feeInvoiceMapping,
  assessmentMapping,
  timetableMapping,
  defaultMappings,
  getMapping,
  getMappingByDocType,
  toERPNext,
  fromERPNext,
  mapStudentGroupStudents,
  mapStudentGroupInstructors,
  mapFeeComponents,
  mapAssessmentDetails,
  getDefaultSyncConfig,
} from './mappings';
