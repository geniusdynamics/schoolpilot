// Import required types from core
import { Student, InvoiceStatus, ParentsGuardian, Subject, SubjectPaper, StudentSubjectEnrollment, TeacherSubjectAssignment, TimetableEntry } from '../../../core/types';
import * as enums from './enums';

// Re-export all enums for use by other files
export { 
  ResultState,
  BreakType,
  EducationSystemType,
  GradingSystemType,
  AcademicPeriodType,
  AssessmentType
} from './enums';

export interface ExamSchedule {
  id: string;
  exam_id: string;
  period_id: number;
  class_stream_id: number;
  invigilator_id: string;
  room_number: string;
  created_at: string;
  updated_at: string;
}


export interface AuditLog {
  timestamp: string;
  user_id: string;
  action: string;
  previous_state: enums.ResultState;
  new_state: enums.ResultState;
}

export interface ResultApprovalEntity {
  id: string;
  result_id: string;
  result?: StudentExamResult;
  state: enums.ResultState;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditLog[];
}

// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Academics module.
// ABOUTME: It ensures all academic-related data structures are managed in one place.

export enum SubjectGrouping {
  GROUP_1_COMPULSORY = "Group 1 (Compulsory)",
  GROUP_2_SCIENCES = "Group 2 (Sciences)",
  GROUP_3_HUMANITIES = "Group 3 (Humanities)",
  GROUP_4_TECHNICALS = "Group 4 (Technicals)",
  GROUP_5_LANGUAGES = "Group 5 (Foreign Languages)",
  OTHER = "Other/Optional"
}

export enum DayOfWeek {
    MONDAY = 'MONDAY', TUESDAY = 'TUESDAY', WEDNESDAY = 'WEDNESDAY', THURSDAY = 'THURSDAY', FRIDAY = 'FRIDAY', SATURDAY = 'SATURDAY', SUNDAY = 'SUNDAY'
}

export enum StudentEnrollmentStatus {
    ENROLLED = 'Enrolled', WITHDRAWN = 'Withdrawn'
}

export enum ExamSessionStatus {
    PLANNING = 'Planning', MARKS_ENTRY_OPEN = 'Marks Entry Open', PUBLISHED = 'Published', CLOSED = 'Closed', ARCHIVED = 'Archived'
}

// Subject and SubjectPaper types moved to core/types to resolve conflicts
// export interface Subject {
//   id: number;
//   subject_code: string;
//   abbreviation: string;
//   name: string;
//   department_id?: string | null;
//   is_compulsory?: boolean | null;
//   grouping: enums.SubjectGrouping;
//   department_name?: string | null;
//   papers?: SubjectPaper[];
// }

// export interface SubjectPaper {
//   id: number;
//   subject_id: number;
//   name: string;
//   created_at: string;
//   updated_at: string;
//   subject_name?: string | null;
// }

export interface ClassSubjectAllocation {
  id: string;
  class_stream_id: number;
  subject_id: number;
  academic_year_id: number;
  class_stream_name?: string | null;
  subject_name?: string | null;
  academic_year_name?: string | null;
  is_enrolled?: boolean | null;
}

// StudentSubjectEnrollment and TeacherSubjectAssignment types moved to core/types to resolve conflicts
// export interface StudentSubjectEnrollment {
//   id: string;
//   student_id: string;
//   class_subject_allocation_id: string;
//   enrollment_date: string;
//   status: enums.StudentEnrollmentStatus;
//   created_at: string;
//   updated_at: string;
//   student_name?: string | null;
//   class_name?: string | null;
//   stream_name?: string | null;
//   subject_name?: string | null;
//   academic_year_name?: string | null;
//   enrollment_status_display?: string | null;
// }

// export interface TeacherSubjectAssignment {
//   id: string;
//   allocation_id: string;
//   teacher_id: string;
//   class_stream_name?: string | null;
//   subject_name?: string | null;
//   academic_year_name?: string | null;
//   teacher_name?: string | null;
// }

export interface GradingSchemeLevel {
  id: number;
  scheme_id: number;
  grade: string;
  min_score: number;
  points?: number | null;
  comment?: string | null;
}

export interface GradingScheme {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  levels?: GradingSchemeLevel[];
}

export interface ExamPaperSetting {
  id: string;
  exam_session_id: string;
  subject_paper_id: number;
  marks_out_of: number;
  weight_percentage: number;
  created_at: string;
  updated_at: string;
  subject_paper_name?: string | null;
  subject_name?: string | null;
}

export interface ExamSession {
  id: string;
  name: string;
  school_period_id: number;
  status: enums.ExamSessionStatus;
  created_at: string;
  updated_at: string;
  school_period_name?: string | null;
  paper_settings?: ExamPaperSetting[];
}

export interface StudentPaperMark {
  id: string;
  student_exam_result_id: string;
  paper_setting_id: string;
  score?: number | null;
}

export interface StudentExamResult {
  id: string;
  student_id: string;
  exam_session_id: string;
  total_marks?: number | null;
  mean_grade?: string | null;
  class_rank?: number | null;
  stream_rank?: number | null;
  created_at: string;
  updated_at: string;
  marks?: StudentPaperMark[];
}

export interface TimetableEntry {
  id: string;
  class_stream_id: number;
  day_of_week: enums.DayOfWeek;
  period_id: number;
  subject_id: number;
  teacher_id: string;
  class_stream_name?: string | null;
  period_name?: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
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

export interface StudentDetailProfile extends Student {
  primary_guardian?: ParentsGuardian | null;
  financial_summary: StudentFinancialSummary;
  invoices_charges: StudentInvoiceChargeItem[];
  payment_history: StudentPaymentLogItem[];
  enrolled_subjects: StudentEnrolledSubject[];
}

export interface StudentFinancialSummary {
  totalFees: number;
  totalPaid: number;
  totalDiscount: number;
  totalFine: number;
  currentBalance: number;
}

export interface StudentInvoiceChargeItem {
  id: string;
  invoiceId: string;
  feeTypeDescription: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
}

export interface StudentPaymentLogItem {
  id: string;
  transactionId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  description: string;
}

export interface StudentEnrolledSubject {
  courseName: string;
  professorInstructorName: string;
  status: string;
}

export interface StudentPaperMarkWithDetails extends StudentPaperMark {
  subject_paper_name?: string | null;
  subject_name?: string | null;
  marks_out_of?: number | null;
}

export interface StudentExamResultWithDetails extends StudentExamResult {
  student_name?: string | null;
  admission_no?: string | null;
  class_name?: string | null;
  stream_name?: string | null;
  exam_session_name?: string | null;
  marks?: StudentPaperMarkWithDetails[];
}

// === EDUCATION SYSTEM CONFIGURATION TYPES ===
// Note: These enums are already re-exported from './enums' at the top of this file

export interface EducationSystemConfiguration {
  id?: string;
  name: string;
  country_code: string;
  system_type: enums.EducationSystemType;
  grading_system_type: enums.GradingSystemType;
  min_grade_level?: number;
  max_grade_level?: number;
  academic_period_type: enums.AcademicPeriodType;
  periods_per_year: number;
  
  // Grading Configuration
  passing_grade?: number;
  max_grade_value?: number;
  grade_precision?: number;
  
  // Assessment Configuration
  assessment_types: enums.AssessmentType[];
  continuous_assessment_weight?: number;
  final_exam_weight?: number;
  
  // Competency-Based Configuration
  uses_competency_tracking?: boolean;
  competency_levels?: string[];
  
  // Credit Hour Configuration (for universities/colleges)
  uses_credit_hours?: boolean;
  min_credits_per_course?: number;
  max_credits_per_course?: number;
  min_credits_for_graduation?: number;
  
  // System Rules
  allows_grade_modification?: boolean;
  requires_external_moderation?: boolean;
  supports_remedial_exams?: boolean;
  
  created_at?: string;
  updated_at?: string;
}

// Type aliases for schema compatibility
export type ExamScheduleEntity = ExamSchedule;
export type AcademicsSubjectType = Subject;
export type AcademicsSubjectPaperType = SubjectPaper;
export type AcademicsExamPaperSettingType = ExamPaperSetting;
export type AcademicsExamSessionType = ExamSession;
export type AcademicsGradingSchemeLevelType = GradingSchemeLevel;
export type AcademicsGradingSchemeType = GradingScheme;
export type AcademicsStudentPaperMarkWithDetailsType = StudentPaperMarkWithDetails;
export type AcademicsStudentExamResultWithDetailsType = StudentExamResultWithDetails;
export type AcademicsClassSubjectAllocationType = ClassSubjectAllocation;
export type AcademicsTeacherSubjectAssignmentType = TeacherSubjectAssignment;
export type AcademicsStudentSubjectEnrollmentType = StudentSubjectEnrollment;
export type AcademicsTimetablePeriodDefType = any; // Define this if needed
export type AcademicsTimetableEntryType = TimetableEntry;
