// ABOUTME: Defines the RxDB collection configurations for the Administration module.
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections.

import * as schemas from './schema';

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
};

// Type helper for consumers of this module's collections (optional)
export type AdministrationCollections = typeof administrationCollections;