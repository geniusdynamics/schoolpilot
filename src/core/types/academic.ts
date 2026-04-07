// src/core/types/academic.ts
// ABOUTME: Cross-module academic types used by 2+ modules (Subject, Exam, Grade, Timetable, etc.)

import type { HRPayrollPeriodStatusEnum, SubjectGrouping, StudentEnrollmentStatus, DayOfWeek, ExamSessionStatus } from './enums';

// HR Payroll period (cross-module: finance + HR)
export interface HRPayrollPeriodType {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  financial_year_id: number;
  school_period_id?: number;
  status: HRPayrollPeriodStatusEnum;
  financial_year_name?: string;
  school_period_name?: string;
}

export interface ClassSubjectAllocation {
    id: string;
    class_stream_id: number;
    subject_id: number;
    academic_year_id: number;
    // Denormalized
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
    // Denormalized
    subject_paper_name?: string | null;
    subject_name?: string | null;
}

// --- Subject Types (used across multiple modules) ---

export interface SubjectPaper {
    id: number;
    subject_id: number;
    name: string;
    created_at: string;
    updated_at: string;
    // Denormalized
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
    // Denormalized
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
    // Denormalized
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
    // Denormalized
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
    // Denormalized
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
    // Denormalized
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
