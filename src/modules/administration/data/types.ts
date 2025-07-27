// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Administration module.
// ABOUTME: It ensures all administration-related data structures are managed in one place.

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

