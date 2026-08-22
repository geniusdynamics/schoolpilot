// ABOUTME: Cross-module shared domain entities (Student, Staff, Class, AcademicYear, etc.)
// ABOUTME: These are used by 3+ modules so they live in core/types, not a single module.

import type { PersonGender, StudentStatus, AttendanceStatus } from './enums';

export interface AcademicYearStructure {
    id: string;
    name: string;
}

export interface AcademicPeriodDefinition {
    id: string;
    structure_id: string;
    name: string;
    sequence_order: number;
    // Denormalized
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
  // Denormalized
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
  // Denormalized
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
  gender: PersonGender;
  date_of_birth?: string | null;
  photo_path?: string | null;
  current_class_stream_id?: number | null;
  student_category_id?: number | null;
  dormitory_id?: number | null;
  admission_date?: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Denormalized fields
  current_class_name?: string | null;
  current_class_stream_name?: string | null;
  student_category_name?: string | null;
  dormitory_name?: string | null;
  primary_guardian?: ParentsGuardian | null;
  exam_result_summary?: ExamResultSummary | null;
  // Additional fields from detailed analysis
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
  // Denormalized
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
    // Denormalized
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
    // Denormalized
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
    // Denormalized
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
    status: AttendanceStatus;
    reason_for_absence?: string;
    created_at?: string;
    updated_at?: string;
    // Denormalized
    student_name?: string;
    period_name?: string;
}
