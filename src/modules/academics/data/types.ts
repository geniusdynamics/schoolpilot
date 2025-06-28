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

export interface AcademicsSubjectType {
  id: number;
  subject_code: string;
  abbreviation: string;
  name: string;
  department_id?: number;
  is_compulsory: boolean;
  grouping: SubjectGrouping;
  department_name?: string;
  papers?: AcademicsSubjectPaperType[];
}

export interface AcademicsSubjectPaperType {
    id: number;
    subject_id: number;
    name: string;
    created_at: string;
    updated_at: string;
    subject_name?: string;
}

export interface AcademicsClassSubjectAllocationType {
    id: string;
    class_stream_id: number;
    subject_id: number;
    academic_year_id: number;
    class_stream_name?: string;
    subject_name?: string;
    academic_year_name?: string;
    is_enrolled?: boolean; // For UI state, may not be in DB
}

export interface AcademicsTeacherSubjectAssignmentType {
    id: string;
    allocation_id: string; // FK to ClassSubjectAllocation
    teacher_id: string;
    class_stream_name?: string;
    subject_name?: string;
    academic_year_name?: string;
    teacher_name?: string;
}

export interface AcademicsStudentSubjectEnrollmentType {
    id: string;
    student_id: string;
    class_subject_allocation_id: string;
    enrollment_date: string;
    status: StudentEnrollmentStatus;
    created_at: string;
    updated_at: string;
    student_name?: string;
    class_name?: string;
    stream_name?: string;
    subject_name?: string;
    academic_year_name?: string;
    enrollment_status_display?: string;
}

export interface AcademicsExamPaperSettingType {
    id: string;
    exam_session_id: string;
    subject_paper_id: number;
    marks_out_of: number;
    weight_percentage: number;
    created_at: string;
    updated_at: string;
    subject_paper_name?: string;
    subject_name?: string;
}

export interface AcademicsExamSessionType {
    id: string;
    name: string;
    school_period_id: number;
    status: ExamSessionStatus;
    result_publication_date?: string;
    created_at: string;
    updated_at: string;
    school_period_name?: string;
    paper_settings?: AcademicsExamPaperSettingType[];
}

export interface AcademicsGradingSchemeLevelType {
    id: number;
    scheme_id: number;
    grade: string;
    min_score: number;
    max_score?: number;
    points?: number;
    comment?: string;
}

export interface AcademicsGradingSchemeType {
    id: number;
    name: string;
    is_default: boolean;
    levels: AcademicsGradingSchemeLevelType[];
    created_at: string;
    updated_at: string;
}

export interface AcademicsStudentPaperMarkType {
    id: string;
    student_exam_result_id: string;
    paper_setting_id: string;
    score?: number;
}
export interface AcademicsStudentPaperMarkWithDetailsType extends AcademicsStudentPaperMarkType {
    subject_paper_name?: string;
    subject_name?: string;
    marks_out_of?: number;
}

export interface AcademicsStudentExamResultType {
    id: string;
    student_id: string;
    exam_session_id: string;
    total_marks?: number;
    mean_grade?: string;
    class_rank?: number;
    stream_rank?: number;
    overall_comment?: string;
    marks?: AcademicsStudentPaperMarkType[]; // Changed to optional
    created_at: string;
    updated_at: string;
}
export interface AcademicsStudentExamResultWithDetailsType extends AcademicsStudentExamResultType {
    student_name?: string;
    admission_no?: string;
    class_name?: string;
    stream_name?: string;
    exam_session_name?: string;
    marks?: AcademicsStudentPaperMarkWithDetailsType[];
}

export interface AcademicsTimetablePeriodDefType {
    id: number;
    period_name: string;
    start_time: string; // HH:MM format
    end_time: string;   // HH:MM format
    is_teaching_period?: boolean;
}

export interface AcademicsTimetableEntryType {
    id: string;
    class_stream_id: number;
    day_of_week: DayOfWeek;
    period_id: number;
    subject_id: number;
    teacher_id: string;
    class_stream_name?: string;
    period_name?: string;
    subject_name?: string;
    teacher_name?: string;
}

export interface AcademicsExamResultSummaryType {
    exam_name?: string;
    english?: string;
    kiswahili?: string;
    mathematics?: string;
    science?: string;
    social_studies_religious_education?: string;
    total_marks?: number;
}
