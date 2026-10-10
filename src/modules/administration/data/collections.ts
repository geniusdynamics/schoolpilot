// ABOUTME: Defines the RxDB collection configurations for the Administration module.
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections.

import * as schemas from './schema';
import { createDatabaseSchema, type DatabaseSchema } from '@/utils/databaseAgnosticSchema';

// Immutable record of each class stream a learner has belonged to (written by StudentPromotionService).
// Superseded by enrolments in Phase 1; defined now so promotion history persists (audit SO-24).
const studentClassHistorySchema: DatabaseSchema = createDatabaseSchema({
  title: 'student_class_history',
  properties: {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'ref', ref: 'students', maxLength: 100 },
    class_stream_id: { type: 'ref', ref: 'class_streams', maxLength: 100 },
    academic_year_id: { type: 'ref', ref: 'academic_years', maxLength: 100 },
    start_date: { type: 'string', maxLength: 50 },
    end_date: { type: 'string', nullable: true, maxLength: 50 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'student_id', 'class_stream_id', 'start_date', 'created_at'],
  indexes: ['student_id', 'class_stream_id', 'academic_year_id']
});

// Health incidents reported for a learner (sick bay visits, injuries), distinct from standing health records.
const healthIncidentReportSchema: DatabaseSchema = createDatabaseSchema({
  title: 'health_incident_report',
  properties: {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'ref', ref: 'students', maxLength: 100 },
    incident_date: { type: 'string', maxLength: 50 },
    incident_type: { type: 'string', maxLength: 100 },
    severity: { type: 'string', maxLength: 50 },
    description: { type: 'string', maxLength: 2000 },
    action_taken: { type: 'string', nullable: true, maxLength: 2000 },
    reported_by: { type: 'string', nullable: true, maxLength: 200 },
    guardian_notified: { type: 'boolean' },
    follow_up_required: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  primaryKey: 'id',
  required: ['id', 'student_id', 'incident_date', 'description', 'created_at', 'updated_at'],
  indexes: ['student_id', 'incident_date']
});

export const administrationCollections = {
  partners: {
    schema: schemas.partnerSchema,
  },
  clubs: { // Collection name for ClubAndSociety
    schema: schemas.clubAndSocietySchema,
  },
  customers: {
    schema: schemas.customerSchema,
  },
  student_health_records: {
    schema: schemas.studentHealthRecordSchema,
  },
  student_attendance: {
    schema: schemas.studentAttendanceSchema,
  },
  student_class_history: {
    schema: studentClassHistorySchema,
  },
  health_incident_reports: {
    schema: healthIncidentReportSchema,
  },
  communication_templates: { // Renamed from templateComm for consistency
    schema: schemas.templateCommSchema,
  },
  message_campaigns: { // Renamed from campaign for consistency
    schema: schemas.campaignSchema,
  },
  
  // === ADMISSIONS SYSTEM COLLECTIONS ===
  admissions_applications: {
    schema: schemas.applicationSchema,
  },
  pre_nas_marks: {
    schema: schemas.preNAsMarksSchema,
  },
  application_reviews: {
    schema: schemas.applicationReviewSchema,
  },
  application_documents: {
    schema: schemas.applicationDocumentSchema,
  },
  application_interviews: {
    schema: schemas.applicationInterviewSchema,
  },
  application_approvals: {
    schema: schemas.applicationApprovalSchema,
  },
  application_notes: {
    schema: schemas.applicationNoteSchema,
  },
  admission_enrollments: {
    schema: schemas.admissionEnrollmentSchema,
  },
  application_form_templates: {
    schema: schemas.applicationFormTemplateSchema,
  },
  sms_campaigns: {
    schema: schemas.smsCampaignSchema,
  },
  bulk_imports: {
    schema: schemas.bulkImportSchema,
  },
  
  // === STUDENT DATA IMPORT COLLECTIONS ===
  student_import_sessions: {
    schema: schemas.studentImportSessionSchema,
  },
  student_import_records: {
    schema: schemas.studentImportRecordSchema,
  },
  
  // === STUDENT CLEARANCE COLLECTIONS ===
  student_clearances: {
    schema: schemas.studentClearanceSchema,
  },
  student_clearance_requests: {
    schema: schemas.studentClearanceRequestSchema,
  },
  
  // === DISCIPLINARY CASES COLLECTIONS ===
  disciplinary_cases: {
    schema: schemas.disciplinaryCaseSchema,
  },
  disciplinary_records: {
    schema: schemas.disciplinaryRecordSchema,
  },
  
  // === CERTIFICATES MANAGEMENT COLLECTIONS ===
  certificate_requests: {
    schema: schemas.certificateRequestSchema,
  },
  
  // === VISITORS MANAGEMENT COLLECTIONS ===
  visitor_logs: {
    schema: schemas.visitorLogSchema,
  },

  // === ADMINISTRATION OPERATIONS COLLECTIONS ===
  gate_passes: {
    schema: schemas.gatePassSchema,
  },
  scholarships: {
    schema: schemas.scholarshipSchema,
  },
  sms_reports: {
    schema: schemas.smsReportSchema,
  },
  auto_sms_settings: {
    schema: schemas.autoSmsSettingSchema,
  },
  staff_wallet_transactions: {
    schema: schemas.staffWalletTransactionSchema,
  },
  staff_attendance_records: {
    schema: schemas.staffAttendanceRecordSchema,
  },
  session_attendance: {
    schema: schemas.sessionAttendanceSchema,
  },

  // === ALUMNI ENGAGEMENT/EVENT COLLECTIONS (page-shaped) ===
  alumni_engagements: {
    schema: schemas.alumniEngagementRecordSchema,
  },
  alumni_events: {
    schema: schemas.alumniEventRecordSchema,
  },

  // === DATABASE BACKUP RECORDS ===
  backup_records: {
    schema: schemas.backupRecordSchema,
  },
};

// Type helper for consumers of this module's collections (optional)
export type AdministrationCollections = typeof administrationCollections;