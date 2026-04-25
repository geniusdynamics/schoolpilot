// ABOUTME: Academics module types - single source of truth for all academic entities
// ABOUTME: Consolidated from core/types/academic.ts

// Re-export module-specific enums
export {
  ResultState,
  BreakType,
  EducationSystemType,
  GradingSystemType,
  AcademicPeriodType,
  AssessmentType,
  AssignmentStatus,
  SubmissionStatus
} from './enums';

// Core academic enums (moved from core/types/academic.ts)
export enum SubjectGrouping {
  GROUP_1_COMPULSORY = "Group 1 (Compulsory)",
  GROUP_2_SCIENCES = "Group 2 (Sciences)",
  GROUP_3_HUMANITIES = "Group 3 (Humanities)",
  GROUP_4_TECHNICALS = "Group 4 (Technicals)",
  GROUP_5_LANGUAGES = "Group 5 (Foreign Languages)",
  OTHER = "Other/Optional"
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export enum StudentEnrollmentStatus {
  ENROLLED = 'Enrolled',
  WITHDRAWN = 'Withdrawn'
}

export enum ExamSessionStatus {
  PLANNING = 'Planning',
  MARKS_ENTRY_OPEN = 'Marks Entry Open',
  PUBLISHED = 'Published',
  CLOSED = 'Closed',
  ARCHIVED = 'Archived'
}

// Core academic types (moved from core/types/academic.ts)
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

export interface SubjectPaper {
  id: number;
  subject_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  subject_name?: string | null;
}

export interface Subject {
  id: number;
  subject_code: string;
  abbreviation: string;
  name: string;
  department_id?: string | null;
  is_compulsory?: boolean | null;
  grouping: SubjectGrouping;
  department_name?: string | null;
  papers?: SubjectPaper[];
}

export interface StudentSubjectEnrollment {
  id: string;
  student_id: string;
  class_subject_allocation_id: string;
  enrollment_date: string;
  status: StudentEnrollmentStatus;
  created_at: string;
  updated_at: string;
  student_name?: string | null;
  class_name?: string | null;
  stream_name?: string | null;
  subject_name?: string | null;
  academic_year_name?: string | null;
  enrollment_status_display?: string | null;
}

export interface TeacherSubjectAssignment {
  id: string;
  allocation_id: string;
  teacher_id: string;
  class_stream_name?: string | null;
  subject_name?: string | null;
  academic_year_name?: string | null;
  teacher_name?: string | null;
}

export interface TimetableEntry {
  id: string;
  class_stream_id: number;
  day_of_week: DayOfWeek;
  period_id: number;
  subject_id: number;
  teacher_id: string;
  class_stream_name?: string | null;
  period_name?: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
}

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

export interface ExamSession {
  id: string;
  name: string;
  school_period_id: number;
  status: ExamSessionStatus;
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

export interface ExamResultSummary {
  exam_name?: string | null;
  english?: string | null;
  kiswahili?: string | null;
  mathematics?: string | null;
  science?: string | null;
  social_studies_religious_education?: string | null;
  total_marks?: number | null;
}

// Cross-module types (these should be imported from administration module)
// For now, we'll import them to avoid breaking changes
import type { Student, InvoiceStatus, ParentsGuardian } from '@/core/types';

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

export interface WeeklyPlan {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  gradeLevel: string;
  classStreamId: string;
  classStreamName: string;
  topic: string;
  objectives: string[];
  materials: string[];
  duration: number;
  created_at: string;
  updated_at: string;
}

export enum PlanStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  APPROVED = 'Approved',
  ARCHIVED = 'Archived'
}

// === EDUCATION SYSTEM CONFIGURATION TYPES ===
export interface EducationSystemConfiguration {
  id?: string;
  name: string;
  country_code: string;
  system_type: any; // Will use EducationSystemType from enums
  grading_system_type: any; // Will use GradingSystemType from enums
  min_grade_level?: number;
  max_grade_level?: number;
  academic_period_type: any; // Will use AcademicPeriodType from enums
  periods_per_year: number;
  
  // Grading Configuration
  passing_grade?: number;
  max_grade_value?: number;
  grade_precision?: number;
  
  // Assessment Configuration
  assessment_types: any[]; // Will use AssessmentType[] from enums
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

// Result approval types
export interface AuditLog {
  timestamp: string;
  user_id: string;
  action: string;
  previous_state: any;
  new_state: any;
}

export interface ResultApprovalEntity {
  id: string;
  result_id: string;
  result?: StudentExamResult;
  state: any;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditLog[];
}

// === NEW TYPES FOR ACADEMICS PAGES (from inline mock data migration) ===

export type BoardExamType = 'IGCSE' | 'A-Level' | 'IB' | 'SAT' | 'Other';

export interface BoardExamResult {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  board_exam_type: BoardExamType;
  subject_name: string;
  paper_code: string;
  grade: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  exam_date: string;
  center_number: string;
  candidate_number: string;
  entered_at: string;
}

export type DistributionMethod = 'Portal' | 'SMS' | 'Email' | 'Print';
export type DistributionStatus = 'Pending' | 'Distributed' | 'Failed';

export interface ResultDistribution {
  id: string;
  exam_session_id: string;
  exam_session_name: string;
  class_id: string;
  class_name: string;
  distribution_method: DistributionMethod;
  status: DistributionStatus;
  scheduled_date: string;
  distributed_at?: string | null;
  recipients_count: number;
  success_count: number;
  failure_count: number;
  notes?: string;
}

export type EventType = 'Exam' | 'Holiday' | 'Function' | 'Meeting' | 'Sports' | 'Other';
export type EventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  location: string;
  status: EventStatus;
  organizer: string;
  participants?: string;
  created_at: string;
}

export interface GazetteStudent {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  rank: number;
  total_marks: number;
  average: number;
  grade: string;
  position: string;
}

export interface GazetteSubject {
  id: string;
  subject_id: string;
  subject_name: string;
  marks_obtained: number;
  max_marks: number;
  grade: string;
}

export interface ExamGazette {
  id: string;
  exam_session_id: string;
  exam_session_name: string;
  class_id: string;
  class_name: string;
  generated_at: string;
  total_students: number;
  students: GazetteStudent[];
  subjects: GazetteSubject[];
}

export type ExamTokenStatus = 'Active' | 'Used' | 'Expired' | 'Revoked';

export interface ExamToken {
  id: string;
  token_code: string;
  exam_session_id: string;
  exam_session_name: string;
  teacher_id: string;
  teacher_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  generated_at: string;
  expires_at: string;
  status: ExamTokenStatus;
  used_at?: string | null;
}

export interface StudentMark {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  marks_obtained: number;
  marks_total: number;
  grade: string;
  remarks: string;
}

export type MarksEntrySessionStatus = 'Pending' | 'In Progress' | 'Completed';

export interface MarksEntrySession {
  id: string;
  token_code: string;
  exam_session_id: string;
  exam_session_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  teacher_id: string;
  teacher_name: string;
  status: MarksEntrySessionStatus;
  marks: StudentMark[];
  created_at: string;
  updated_at: string;
}

export type ValidationStatus = 'Valid' | 'Invalid' | 'Warning';

export interface StructureValidationItem {
  id: string;
  exam_session_id: string;
  exam_session_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  structure_component: string;
  expected_max_marks: number;
  actual_max_marks: number;
  marks_difference: number;
  status: ValidationStatus;
  notes?: string;
}

export type CrossCheckStatus = 'Pending' | 'Verified' | 'Discrepancy' | 'Resolved';

export interface CrossCheckRecord {
  id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  exam_session_id: string;
  exam_session_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  primary_teacher_id: string;
  primary_teacher_name: string;
  primary_marks: number;
  verifying_teacher_id: string;
  verifying_teacher_name: string;
  verified_marks: number;
  marks_difference: number;
  status: CrossCheckStatus;
  verified_at?: string | null;
  notes?: string | null;
}

// Chart data types for StudentExamAnalysisPage and ExamAnalysisPage
export interface SubjectPerformanceDataPoint {
  subject: string;
  student: number;
  class: number;
}

export interface PerformanceOverTimeDataPoint {
  exam: string;
  student: number;
  class: number;
}

export interface SubjectBreakdownDataPoint {
  name: string;
  marks: number;
  change: number;
  grade: string;
  rank: number;
}

export interface ExamPerformanceOverTimeDataPoint {
  name: string;
  exam1: number;
  exam2: number;
  exam3: number;
}

export interface StreamPerformanceDataPoint {
  name: string;
  points: number;
}

// Type aliases for schema compatibility
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
export type AcademicsTimetablePeriodDefType = any;
export type AcademicsTimetableEntryType = TimetableEntry;
