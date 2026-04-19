// ABOUTME: Administration module types - single source of truth for all administration entities
// ABOUTME: Consolidated from core/types/administration.ts

// Core administration types (moved from core/types/administration.ts)
export interface AcademicYearStructure {
  id: string;
  name: string;
}

export interface AcademicPeriodDefinition {
  id: string;
  structure_id: string;
  name: string;
  sequence_order: number;
  structure_name?: string | null;
}

export interface AcademicYear {
  id: number;
  name: string;
  structure_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  structure_name?: string | null;
}

export interface SchoolPeriod {
  id: number;
  academic_year_id: number;
  period_definition_id: string;
  financial_year_id: number;
  start_date: string;
  end_date: string;
  mid_break_start?: string | null;
  mid_break_end?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  name?: string | null;
  academic_year_name?: string | null;
  period_definition_name?: string | null;
  financial_year_name?: string | null;
}

export interface ExamResultSummary {
  exam_name?: string | null;
  english?: string | null;
  kiswahili?: string | null;
  mathematics?: string | null;
  science?: string | null;
  social_studies_religious_education?: string | null;
  total_marks?: number | null;
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

export interface StudentGuardianRelationship {
  student_id: string;
  guardian_id: string;
  relationship_type: string;
  is_primary_contact: boolean;
}

export interface Student {
  id: string;
  admission_no: string;
  upi_no?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  gender: any; // Will import from core enums
  date_of_birth?: string | null;
  photo_path?: string | null;
  current_class_stream_id?: number | null;
  student_category_id?: number | null;
  dormitory_id?: number | null;
  admission_date?: string | null;
  status: any; // Will import from core enums
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  current_class_name?: string | null;
  current_class_stream_name?: string | null;
  student_category_name?: string | null;
  dormitory_name?: string | null;
  primary_guardian?: ParentsGuardian | null;
  exam_result_summary?: ExamResultSummary | null;
  address?: string | null;
  remarks?: string | null;
  religion?: string | null;
  county?: string | null;
  district?: string | null;
  student_type?: string | null;
  primary_school?: string | null;
  marks_attained_primary?: string | null;
  class_admitted?: string | null;
  stream_admitted?: string | null;
  email?: string | null;
  phone?: string | null;
  display_name?: string | null;
  user_id?: string | null;
}

export interface Staff {
  id: string;
  user_id?: string | null;
  staff_no: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  department_id?: string | null;
  designation_id?: number | null;
  hod_of_department_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  department_name?: string | null;
  designation_title?: string | null;
  hod_of_department_name?: string | null;
  user_username?: string | null;
  email?: string | null;
  display_name?: string | null;
}

export interface Class {
  id: number;
  name: string;
  streams?: ClassStream[];
}

export interface ClassStream {
  id: number;
  class_id: number;
  name: string;
  class_teacher_id?: string | null;
  class_name?: string | null;
  class_teacher_name?: string | null;
}

export interface Department {
  id: string;
  name: string;
  is_academic: boolean;
  created_at: string;
  updated_at: string;
}

export interface Designation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StudentCategory {
  id: number;
  name: string;
}

export interface Dormitory {
  id: number;
  name: string;
  master_id?: string | null;
  master_name?: string | null;
  created_at: string;
  updated_at: string;
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
  student_name?: string | null;
}

export interface TimetablePeriodDef {
  id: number;
  period_name: string;
  start_time: string;
  end_time: string;
}

export interface StudentAttendance {
  id: string | number;
  student_id: string;
  period_id: number;
  date: string;
  status: any; // Will import from core enums
  reason_for_absence?: string;
  created_at?: string;
  updated_at?: string;
  student_name?: string;
  period_name?: string;
}

// Module-specific enums
export enum PartnerType {
    SPONSOR = 'Sponsor',
    BOARD_MEMBER = 'Board Member',
    SERVICE_PROVIDER = 'Service Provider',
    GOVERNMENT_AGENCY = 'Government Agency',
    NGO = 'NGO',
    OTHER = 'Other'
}

export enum ClubType {
    CLUB = 'Club',
    SOCIETY = 'Society',
    SPORTS_TEAM = 'Sports Team'
}

export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    LATE = 'Late',
    EXCUSED = 'Excused'
}

export enum TemplateType {
    SMS = 'SMS',
    EMAIL = 'Email',
    PUSH_NOTIFICATION = 'Push Notification'
}

export enum CampaignAudienceType {
    ALL_STUDENTS = 'All Students',
    ALL_PARENTS = 'All Parents',
    ALL_STAFF = 'All Staff',
    STUDENTS_OF_CLASS = 'Students of Class',
    PARENTS_OF_CLASS = 'Parents of Class'
}

export enum CampaignStatus {
    DRAFT = 'Draft',
    SCHEDULED = 'Scheduled',
    APPROVED = 'Approved',
    SENT = 'Sent',
    CANCELLED = 'Cancelled'
}

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

export interface AdminPreNAsMarksType {
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

// === STUDENT CLASS HISTORY TYPES ===
// Mirrors adm_student_class_history from Akademico DB

export interface StudentClassHistoryEntry {
  id: string;
  student_id: string;
  class_stream_id: string;
  academic_year_id: string;
  start_date: string;
  end_date?: string | null;
  created_at: string;
}

