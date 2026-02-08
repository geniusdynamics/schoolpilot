/**
 * ERPNext Integration Types
 * 
 * Types specific to ERPNext integration including DocTypes,
 * sync mappings, and configuration.
 */

import type { BackendConfig, EntitySyncConfig } from '../backend/types';

// ============================================================================
// ERPNext Configuration
// ============================================================================

export interface ERPNextConfig extends BackendConfig {
  type: 'erpnext';
  
  // ERPNext specific
  domain?: string;  // 'education', 'healthcare', etc.
  
  // Entity sync configuration
  entitySync: Record<ERPNextEntity, EntitySyncConfig>;
  
  // Field mappings for custom fields
  fieldMappings?: Record<string, FieldMapping>;
  
  // Webhook settings for real-time sync
  webhooks?: {
    enabled: boolean;
    secret: string;
    endpoint: string;
  };
}

export interface FieldMapping {
  localField: string;
  erpnextField: string;
  transform?: 'date' | 'datetime' | 'number' | 'boolean' | 'json';
}

// ============================================================================
// ERPNext Entities (DocTypes)
// ============================================================================

export type ERPNextEntity = 
  // Education Domain
  | 'Student'
  | 'Student Group'
  | 'Student Category'
  | 'Course'
  | 'Program'
  | 'Academic Year'
  | 'Academic Term'
  | 'Program Enrollment'
  | 'Course Enrollment'
  | 'Student Attendance'
  | 'Course Schedule'
  | 'Assessment Group'
  | 'Assessment Plan'
  | 'Assessment Result'
  | 'Fee Structure'
  | 'Fees'
  | 'Fee Category'
  // HR
  | 'Employee'
  | 'Employee Group'
  | 'Salary Structure'
  | 'Payroll Entry'
  | 'Salary Slip'
  // Accounting
  | 'Account'
  | 'Journal Entry'
  | 'Payment Entry'
  | 'Sales Invoice'
  | 'Purchase Invoice'
  // Stock
  | 'Item'
  | 'Warehouse'
  | 'Stock Entry'
  // Custom
  | string;

// ============================================================================
// ERPNext DocType Definitions
// ============================================================================

export interface ERPNextStudent {
  name: string;  // ID
  naming_series?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  student_email_id?: string;
  student_mobile_number?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  blood_group?: string;
  nationality?: string;
  student_applicant?: string;
  image?: string;
  status?: 'Active' | 'Inactive';
  user?: string;
  guardian?: ERPNextGuardian[];
  siblings?: ERPNextSibling[];
  address?: string;
  pincode?: string;
}

export interface ERPNextGuardian {
  guardian: string;
  guardian_name?: string;
  relation?: string;
  mobile_number?: string;
}

export interface ERPNextSibling {
  sibling_name: string;
  sibling_id?: string;
  program?: string;
  institution?: string;
}

export interface ERPNextEmployee {
  name: string;
  naming_series?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  employee_name?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  date_of_joining?: string;
  designation?: string;
  department?: string;
  employment_type?: string;
  employee_number?: string;
  user_id?: string;
  company_email?: string;
  personal_email?: string;
  cell_number?: string;
  emergency_phone_number?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'Left';
  image?: string;
}

export interface ERPNextCourse {
  name: string;
  course_name: string;
  course_code?: string;
  department?: string;
  course_abbreviation?: string;
  default_grading_scale?: string;
  default_course_group?: string;
  description?: string;
  course_intro?: string;
  course_image?: string;
  default_grading_scale_name?: string;
}

export interface ERPNextStudentGroup {
  name: string;
  naming_series?: string;
  group_based_on: 'Batch' | 'Course' | 'Activity';
  academic_year?: string;
  academic_term?: string;
  program?: string;
  batch?: string;
  course?: string;
  student_group_name: string;
  max_strength?: number;
  students?: ERPNextStudentGroupStudent[];
  instructors?: ERPNextStudentGroupInstructor[];
}

export interface ERPNextStudentGroupStudent {
  student: string;
  student_name?: string;
  active?: 0 | 1;
}

export interface ERPNextStudentGroupInstructor {
  instructor: string;
  instructor_name?: string;
}

export interface ERPNextProgram {
  name: string;
  program_name: string;
  program_code?: string;
  department?: string;
  effective_from?: string;
  effective_to?: string;
  courses?: ERPNextProgramCourse[];
}

export interface ERPNextProgramCourse {
  course: string;
  course_name?: string;
  course_code?: string;
  required?: 0 | 1;
}

export interface ERPNextProgramEnrollment {
  name: string;
  student: string;
  student_name?: string;
  program: string;
  academic_year: string;
  academic_term?: string;
  enrollment_date?: string;
  student_batch_name?: string;
  student_category?: string;
  status?: 'Active' | 'Completed' | 'Withdrawn';
  courses?: ERPNextEnrolledCourse[];
}

export interface ERPNextEnrolledCourse {
  course: string;
  course_name?: string;
}

export interface ERPNextStudentAttendance {
  name: string;
  naming_series?: string;
  student: string;
  student_name?: string;
  student_group?: string;
  date: string;
  status: 'Present' | 'Absent' | 'Half Day';
  course_schedule?: string;
  course?: string;
  instructor?: string;
  instructor_name?: string;
  room?: string;
}

export interface ERPNextCourseSchedule {
  name: string;
  naming_series?: string;
  student_group?: string;
  course?: string;
  instructor?: string;
  instructor_name?: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  room?: string;
  title?: string;
}

export interface ERPNextAssessmentResult {
  name: string;
  naming_series?: string;
  student: string;
  student_name?: string;
  course?: string;
  assessment_group?: string;
  assessment_plan?: string;
  total_score?: number;
  maximum_score?: number;
  grade?: string;
  assessment_details?: ERPNextAssessmentDetail[];
}

export interface ERPNextAssessmentDetail {
  assessment_criteria: string;
  maximum_score?: number;
  score?: number;
  grade?: string;
}

export interface ERPNextFeeStructure {
  name: string;
  naming_series?: string;
  program?: string;
  student_category?: string;
  academic_year: string;
  components?: ERPNextFeeComponent[];
  total_amount?: number;
}

export interface ERPNextFeeComponent {
  fees_category: string;
  amount: number;
  description?: string;
}

export interface ERPNextFees {
  name: string;
  naming_series?: string;
  student: string;
  student_name?: string;
  program_enrollment?: string;
  program?: string;
  student_category?: string;
  fee_structure?: string;
  posting_date: string;
  due_date?: string;
  components?: ERPNextFeeComponent[];
  grand_total?: number;
  outstanding_amount?: number;
  status?: 'Draft' | 'Unpaid' | 'Overdue' | 'Paid' | 'Cancelled';
}

// ============================================================================
// Sync Types
// ============================================================================

export interface ERPNextSyncMapping {
  localEntity: string;
  erpnextDocType: ERPNextEntity;
  direction: 'to-erpnext' | 'from-erpnext' | 'bidirectional';
  fieldMappings: Record<string, string>;  // localField -> erpnextField
  transforms?: Record<string, (value: any) => any>;
}

export interface ERPNextSyncState {
  entity: string;
  lastSync: Date;
  lastSyncToken?: string;
  pendingChanges: number;
  errors: ERPNextSyncError[];
}

export interface ERPNextSyncError {
  entity: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  error: string;
  timestamp: Date;
  retryCount: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ERPNextListResponse<T> {
  data: T[];
  message?: string;
}

export interface ERPNextDocResponse<T> {
  data: T;
  message?: string;
}

export interface ERPNextMethodResponse<T> {
  message: T;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface ERPNextWebhookPayload {
  doctype: string;
  docname: string;
  event: 'on_insert' | 'on_update' | 'on_submit' | 'on_cancel' | 'on_trash';
  doc: any;
}

// ============================================================================
// Entity Sync Status
// ============================================================================

export interface ERPNextEntityStatus {
  entity: string;
  enabled: boolean;
  direction: 'to-erpnext' | 'from-erpnext' | 'bidirectional';
  lastSync?: Date;
  pendingLocal: number;
  pendingRemote: number;
  conflicts: number;
  errors: number;
}
