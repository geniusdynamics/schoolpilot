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

export interface SubjectPaper {
  id: number;
  subject_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  subject_name?: string | null;
}

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
