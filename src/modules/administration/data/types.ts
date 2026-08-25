// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Administration module.
// ABOUTME: It ensures all administration-related data structures are managed in one place.

// Re-export shared domain entities consumed by administration data provider/pages.
// These live in core/types (used by 3+ modules); re-exported here so `import * as types from './types'` resolves them.
export type { Class, ClassStream, Student, Staff, AcademicYear, SchoolPeriod, StudentGuardianRelationship, ExamResultSummary, AcademicYearStructure, AcademicPeriodDefinition, StudentAttendance, TimetablePeriodDef } from '@/core/types';

// Shared administration enums (single definition in @/core/types/enums; re-exported for module consumers)
import { PartnerType, ClubType, AttendanceStatus, TemplateType, CampaignAudienceType, CampaignStatus } from '@/core/types/enums';
export { PartnerType, ClubType, AttendanceStatus, TemplateType, CampaignAudienceType, CampaignStatus };

export interface AdminPartnerType {
  id: string;
  name: string;
  partner_type: PartnerType;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminClubAndSocietyType {
  id: number;
  name: string;
  type: ClubType;
  patron_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  patron_name?: string;
}

export interface AdminCustomerType {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminStudentHealthRecordType {
  id: string;
  student_id: string;
  blood_type?: string;
  allergies?: string;
  medical_conditions?: string;
  emergency_contact_override?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export interface AdminStudentAttendanceType {
  id: string;
  student_id: string;
  period_id: number;
  date: string;
  status: AttendanceStatus;
  reason_for_absence?: string;
  created_at?: string;
  student_name?: string;
  period_name?: string;
}

export interface AdminTemplateCommType {
  id: number;
  name: string;
  type: TemplateType;
  subject?: string;
  body_template: string;
  created_at: string;
  updated_at: string;
}

export interface AdminCampaignType {
  id: string;
  name: string;
  template_id?: number;
  subject?: string;
  body?: string;
  status: CampaignStatus;
  target_audience_type?: CampaignAudienceType;
  target_id?: string | number;
  scheduled_for?: string;
  sent_at?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  template_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
  target_audience_display?: string;
}

// === ADMISSIONS SYSTEM TYPES ===

export enum ApplicationStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  INTERVIEW_SCHEDULED = 'Interview Scheduled',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  DEFERRED = 'Deferred',
  WAITLISTED = 'Waitlisted'
}

export enum ApplicationType {
  NEW = 'New',
  TRANSFER = 'Transfer',
  READMISSION = 'Readmission'
}

export enum ReviewStage {
  INITIAL = 'Initial',
  ACADEMIC = 'Academic',
  INTERVIEW = 'Interview',
  FINAL = 'Final'
}

export enum ReviewDecision {
  STRONGLY_RECOMMEND = 'Strongly Recommend',
  RECOMMEND = 'Recommend',
  NEUTRAL = 'Neutral',
  NOT_RECOMMEND = 'Not Recommend',
  STRONGLY_NOT_RECOMMEND = 'Strongly Not Recommend'
}

export enum ApprovalDecision {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  DEFERRED = 'Deferred',
  WAITLISTED = 'Waitlisted'
}

export enum DocumentType {
  BIRTH_CERTIFICATE = 'Birth Certificate',
  KCPE_CERTIFICATE = 'KCPE Certificate',
  TRANSFER_LETTER = 'Transfer Letter',
  MEDICAL_REPORT = 'Medical Report',
  PASSPORT_PHOTO = 'Passport Photo',
  FEE_RECEIPT = 'Fee Receipt',
  OTHER = 'Other'
}

export enum InterviewType {
  IN_PERSON = 'In Person',
  VIRTUAL = 'Virtual',
  PHONE = 'Phone'
}

export enum AttendanceType {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  RESCHEDULED = 'Rescheduled'
}

export interface AdminApplicationType {
  id: string;
  application_number: string;
  academic_year_id?: string;
  intended_class_id?: string;
  application_type: ApplicationType;
  
  // Applicant Information
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  nationality?: string;
  religion?: string;
  birth_certificate_number?: string;
  
  // Academic Background
  previous_school?: string;
  previous_class?: string;
  kcpe_index_number?: string;
  kcpe_marks?: any; // JSON object for subject-wise marks
  kcpe_grade?: string;
  
  // Guardian Information
  guardian_type?: 'Father' | 'Mother' | 'Guardian' | 'Other';
  guardian_first_name?: string;
  guardian_last_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_occupation?: string;
  guardian_employer?: string;
  
  // Address Information
  residential_address?: string;
  postal_address?: string;
  county?: string;
  sub_county?: string;
  location?: string;
  sub_location?: string;
  
  // Application Status
  status: ApplicationStatus;
  submission_date?: string;
  review_deadline?: string;
  
  // System Fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Denormalized fields
  intended_class_name?: string;
  academic_year_name?: string;
}

export interface AdminEntryMarksType {
  id: string;
  student_id?: string;
  application_id?: string;
  index_number: string;
  year: number;
  assessment_type: 'KCPE' | 'CBC' | 'Other'; // Support multiple assessment types
  
  // Subject Marks
  english: number;
  kiswahili: number;
  mathematics: number;
  science: number;
  social_studies: number;
  
  // Additional CBC subjects (optional)
  integrated_science?: number;
  pre_technical_studies?: number;
  creative_arts?: number;
  
  // Calculated Fields
  total_marks: number;
  mean_grade: number;
  overall_grade: string;
  
  // Meta
  imported_date?: string;
  verified: boolean;
  verification_date?: string;
  verified_by?: string;
  
  created_at: string;
  updated_at: string;
}

export interface AdminApplicationReviewType {
  id: string;
  application_id: string;
  reviewer_id: string;
  review_stage: ReviewStage;
  
  // Review Criteria
  academic_score?: number; // 1-100
  interview_score?: number; // 1-100
  behavioral_assessment?: string;
  recommendation: ReviewDecision;
  
  // Comments
  academic_comments?: string;
  general_comments?: string;
  internal_notes?: string;
  
  // Status
  review_status: 'Pending' | 'In Progress' | 'Completed';
  review_date?: string;
  
  created_at: string;
  updated_at: string;
  
  // Denormalized
  reviewer_name?: string;
  application_number?: string;
  applicant_name?: string;
}

export interface AdminApplicationDocumentType {
  id: string;
  application_id: string;
  document_type: DocumentType;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  
  // Verification
  verified: boolean;
  verification_date?: string;
  verified_by?: string;
  verification_notes?: string;
  
  uploaded_at: string;
  uploaded_by?: string;
  
  // Denormalized
  application_number?: string;
  applicant_name?: string;
}

export interface AdminApplicationInterviewType {
  id: string;
  application_id: string;
  interviewer_id: string;
  
  // Scheduling
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  location?: string;
  interview_type: InterviewType;
  
  // Results
  conducted: boolean;
  attendance: AttendanceType;
  
  // Scoring
  communication_score?: number; // 1-10
  confidence_score?: number; // 1-10
  academic_readiness_score?: number; // 1-10
  overall_impression?: string;
  
  // Recommendations
  interviewer_recommendation?: ApprovalDecision;
  conditions?: string;
  
  created_at: string;
  updated_at: string;
  
  // Denormalized
  interviewer_name?: string;
  application_number?: string;
  applicant_name?: string;
}

export interface AdminApplicationApprovalType {
  id: string;
  application_id: string;
  review_id?: string;
  approved_by: string;
  approval_date: string;
  final_decision: ApprovalDecision;
  
  // Assignment Details
  assigned_class?: string;
  assigned_stream?: string;
  start_date?: string;
  admission_number?: string;
  
  // Conditions and Comments
  conditions?: string;
  final_comments?: string;
  
  created_at: string;
  updated_at: string;
  
  // Denormalized
  approver_name?: string;
  application_number?: string;
  applicant_name?: string;
}

// SMS Integration Types
export interface AdminSMSCampaignType {
  id: string;
  name: string;
  message: string;
  target_group: 'students' | 'parents' | 'staff' | 'applicants';
  target_filter?: any; // JSON object for filtering criteria
  
  // Scheduling
  scheduled_date?: string;
  sent_date?: string;
  
  // Status
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed';
  total_recipients?: number;
  successful_sends?: number;
  failed_sends?: number;
  
  // System
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Denormalized
  created_by_name?: string;
}

// Bulk Import Types
export interface AdminBulkImportType {
  id: string;
  import_type: 'students' | 'applications' | 'kcpe_marks';
  filename: string;
  file_path: string;
  
  // Status
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  
  // Results
  error_log?: string; // JSON array of errors
  validation_errors?: string; // JSON array of validation errors
  
  // System
  started_by: string;
  started_at: string;
  completed_at?: string;
  
  created_at: string;
  updated_at: string;
  
  // Denormalized
  started_by_name?: string;
}

// MOVED FROM core/types.ts (module-specific):
export interface WorkflowState {
  id: number;
  workflow_id: number;
  name: string;
  sequence_order: number;
}

export interface Workflow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  states?: WorkflowState[];
}

export interface ParentsGuardian {
  id: string;
  user_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  relationship_type?: string | null;
  location?: string | null;
  address?: string | null;
  photo_path?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface StudentHealthRecord {
  id: string;
  student_id: string;
  blood_type?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  emergency_contact_override?: string | null;
  created_at: string;
  updated_at: string;
  // Denormalized
  student_name?: string | null;
}

export interface Dormitory {
  id: number;
  name: string;
  master_id?: string | null;
  // Denormalized
  master_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentCategory {
  id: number;
  name: string;
}

export interface Designation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  is_academic: boolean;
  created_at: string;
  updated_at: string;
}

// === STUDENT DATA IMPORT TYPES ===

export enum ImportStatus {
  PENDING = 'Pending',
  VALIDATING = 'Validating',
  VALIDATED = 'Validated',
  IMPORTING = 'Importing',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  PARTIAL = 'Partial'
}

export enum ImportValidationStatus {
  VALID = 'Valid',
  INVALID = 'Invalid',
  WARNING = 'Warning'
}

export interface StudentImportRecord {
  id: string;
  import_id: string;
  row_number: number;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  grade_level: string;
  class_name?: string;
  stream_name?: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  validation_status: ImportValidationStatus;
  validation_errors?: string[];
  validation_warnings?: string[];
  import_status: 'Pending' | 'Imported' | 'Skipped' | 'Failed';
  student_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentImportSession {
  id: string;
  filename: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  imported_records: number;
  failed_records: number;
  status: ImportStatus;
  started_by: string;
  started_at: string;
  completed_at?: string;
  error_log?: string;
  created_at: string;
  updated_at: string;
  started_by_name?: string;
}

// === STUDENT CLEARANCE TYPES ===

export enum ClearanceStatus {
  PENDING = 'Pending',
  CLEARED = 'Cleared',
  NOT_CLEARED = 'Not Cleared',
  WAIVED = 'Waived'
}

export enum ClearanceType {
  LIBRARY = 'Library',
  FINANCE = 'Finance',
  DORMITORY = 'Dormitory',
  ACADEMICS = 'Academics',
  SPORTS = 'Sports',
  DISCIPLINE = 'Discipline',
  LABORATORY = 'Laboratory',
  ICT = 'ICT',
  GENERAL = 'General'
}

export enum ClearanceRequestStatus {
  DRAFT = 'Draft',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export interface StudentClearance {
  id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  clearance_type: ClearanceType;
  status: ClearanceStatus;
  remarks?: string;
  cleared_by?: string;
  cleared_by_name?: string;
  cleared_at?: string;
  requested_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentClearanceRequest {
  id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  academic_year_id?: string;
  academic_year_name?: string;
  reason: string;
  status: ClearanceRequestStatus;
  total_departments: number;
  cleared_departments: number;
  pending_departments: number;
  rejected_departments: number;
  requested_by: string;
  requested_by_name?: string;
  requested_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// === DISCIPLINARY CASES TYPES ===

export enum DisciplinarySeverity {
  MINOR = 'Minor',
  MODERATE = 'Moderate',
  SERIOUS = 'Serious',
  CRITICAL = 'Critical'
}

export enum DisciplinaryStatus {
  REPORTED = 'Reported',
  UNDER_INVESTIGATION = 'Under Investigation',
  PENDING_REVIEW = 'Pending Review',
  RESOLVED = 'Resolved',
  DISMISSED = 'Dismissed',
  APPEALED = 'Appealed'
}

export enum DisciplinaryAction {
  VERBAL_WARNING = 'Verbal Warning',
  WRITTEN_WARNING = 'Written Warning',
  DETENTION = 'Detention',
  SUSPENSION = 'Suspension',
  EXPULSION = 'Expulsion',
  COMMUNITY_SERVICE = 'Community Service',
  PARENT_MEETING = 'Parent Meeting',
  BEHAVIORAL_CONTRACT = 'Behavioral Contract',
  COUNSELING = 'Counseling'
}

export enum DisciplinaryCategory {
  ATTENDANCE = 'Attendance',
  BEHAVIOR = 'Behavior',
  ACADEMIC_DISHONESTY = 'Academic Dishonesty',
  DRESS_CODE = 'Dress Code',
  SUBSTANCE_ABUSE = 'Substance Abuse',
  BULLYING = 'Bullying',
  VANDALISM = 'Vandalism',
  DISRESPECT = 'Disrespect',
  FIGHTING = 'Fighting',
  THEFT = 'Theft',
  OTHER = 'Other'
}

export interface DisciplinaryCase {
  id: string;
  case_number: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  category: DisciplinaryCategory;
  severity: DisciplinarySeverity;
  status: DisciplinaryStatus;
  title: string;
  description: string;
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  reported_by: string;
  reported_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  witnesses?: string;
  action_taken?: DisciplinaryAction;
  action_details?: string;
  action_date?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  parent_notified: boolean;
  parent_notification_date?: string;
  parent_response?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaryRecord {
  id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  case_id: string;
  category: DisciplinaryCategory;
  action: DisciplinaryAction;
  action_details?: string;
  action_date: string;
  created_at: string;
  updated_at: string;
}

// === CERTIFICATES MANAGEMENT TYPES ===

export enum CertificateType {
  BIRTH_CERTIFICATE = 'Birth Certificate',
  TRANSFER_CERTIFICATE = 'Transfer Certificate',
  CHARACTER_CERTIFICATE = 'Character Certificate',
  ACADEMIC_CERTIFICATE = 'Academic Certificate',
  COMPLETION_CERTIFICATE = 'Completion Certificate',
  ACHIEVEMENT_CERTIFICATE = 'Achievement Certificate',
  CONDUCT_CERTIFICATE = 'Conduct Certificate',
  LEAVING_CERTIFICATE = 'Leaving Certificate',
  BONAFIDE_CERTIFICATE = 'Bonafide Certificate'
}

export enum CertificateStatus {
  REQUESTED = 'Requested',
  IN_PROGRESS = 'In Progress',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  ISSUED = 'Issued',
  CANCELLED = 'Cancelled'
}

export interface CertificateRequest {
  id: string;
  certificate_number: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  certificate_type: CertificateType;
  status: CertificateStatus;
  purpose?: string;
  remarks?: string;
  requested_by: string;
  requested_by_name?: string;
  requested_at: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  issued_by?: string;
  issued_by_name?: string;
  issued_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// === VISITORS MANAGEMENT TYPES ===

export enum VisitorType {
  PARENT = 'Parent',
  GUARDIAN = 'Guardian',
  OFFICIAL = 'Official',
  DELIVERY = 'Delivery',
  INTERVIEW = 'Interview',
  MAINTENANCE = 'Maintenance',
  GUEST = 'Guest',
  OTHER = 'Other'
}

export enum VisitorStatus {
  CHECKED_IN = 'Checked In',
  CHECKED_OUT = 'Checked Out',
  EXPECTED = 'Expected',
  NO_SHOW = 'No Show'
}

export interface VisitorLog {
  id: string;
  visitor_name: string;
  visitor_type: VisitorType;
  phone: string;
  email?: string;
  id_type?: string;
  id_number?: string;
  purpose: string;
  person_to_meet?: string;
  person_to_meet_id?: string;
  status: VisitorStatus;
  check_in_time: string;
  check_out_time?: string;
  expected_arrival?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

