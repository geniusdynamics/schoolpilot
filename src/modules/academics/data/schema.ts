// ABOUTME: Defines database-agnostic schemas for entities specific to the Academics module.
// ABOUTME: These schemas are used by both RxDB and PouchDB services to create collections.

import { 
  ResultState, 
  SubjectGrouping, 
  ExamSessionStatus, 
  StudentEnrollmentStatus, 
  BreakType 
} from './enums';
import { 
  createDatabaseSchema, 
  SchemaHelpers,
  type DatabaseSchema, 
  type DatabaseProperty, 
} from '@/utils/databaseAgnosticSchema';

export const examScheduleSchema: DatabaseSchema = createDatabaseSchema({
    title: 'exam_schedule',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        exam_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        period_id: SchemaHelpers.ref('timetable_period_definitions', { description: 'Reference to timetable period' }),
        class_stream_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream' }),
        invigilator_id: SchemaHelpers.ref('staff', { description: 'Reference to staff member', maxLength: 100 }),
        room_number: SchemaHelpers.string({ description: 'Room number', maxLength: 50 }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'exam_id', 'period_id', 'class_stream_id', 'invigilator_id'],
    indexes: ['exam_id', 'period_id', 'class_stream_id', 'invigilator_id']
});

export const resultApprovalSchema: DatabaseSchema = createDatabaseSchema({
    title: 'result_approval',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        result_id: SchemaHelpers.ref('student_exam_results', { description: 'Reference to student exam result', maxLength: 100 }),
        state: SchemaHelpers.string({ description: 'Approval state', enum: Object.values(ResultState), maxLength: 50 }),
        created_by: SchemaHelpers.ref('users', { description: 'User who created the approval', maxLength: 100 }),
        updated_by: SchemaHelpers.ref('users', { description: 'User who last updated the approval', maxLength: 100 }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        audit_trail: SchemaHelpers.array(
            SchemaHelpers.object({
                timestamp: SchemaHelpers.timestamp({ description: 'Action timestamp' }),
                user_id: SchemaHelpers.ref('users', { description: 'User who performed the action', maxLength: 100 }),
                action: SchemaHelpers.string({ description: 'Action performed', maxLength: 100 }),
                previous_state: SchemaHelpers.string({ description: 'Previous state', enum: Object.values(ResultState), maxLength: 50 }),
                new_state: SchemaHelpers.string({ description: 'New state', enum: Object.values(ResultState), maxLength: 50 }),
            }),
            { description: 'Audit trail of approval changes' }
        )
    },
    required: ['id', 'result_id', 'state'],
    indexes: ['result_id', 'state']
});

// ABOUTME: Defines the database schema for the SP3 academics module.
// ABOUTME: This file outlines entities, relations, and methods related to the academic data.

export const subjectPaperProperties: Record<string, DatabaseProperty> = {
    id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999, final: true },
    subject_id: { type: 'string', ref: 'subjects' }, 
    name: { type: 'string', maxLength: 150 },
    created_at: { type: 'string', format: 'date-time', maxLength: 50 },
    updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    subject_name: { type: ['string', 'null'], maxLength: 100 },
};
export const subjectSchema: DatabaseSchema = createDatabaseSchema({
    title: 'subject',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.integer({ description: 'Unique identifier', minimum: 1, maximum: 999999999 }),
        subject_code: SchemaHelpers.string({ description: 'Subject code', maxLength: 20 }),
        abbreviation: SchemaHelpers.string({ description: 'Subject abbreviation', maxLength: 10 }),
        name: SchemaHelpers.string({ description: 'Subject name', maxLength: 100 }),
        department_id: SchemaHelpers.ref('departments', { description: 'Reference to department', maxLength: 100 }),
        is_compulsory: SchemaHelpers.boolean({ description: 'Whether subject is compulsory', default: false }),
        grouping: SchemaHelpers.string({ description: 'Subject grouping', enum: Object.values(SubjectGrouping), maxLength: 50 }),
        department_name: SchemaHelpers.string({ description: 'Department name (computed)', maxLength: 100 }),
        papers: SchemaHelpers.array(
            SchemaHelpers.object(subjectPaperProperties),
            { description: 'Subject papers', default: [] }
        ),
    },
    required: ['id', 'subject_code', 'name', 'grouping'],
    indexes: ['subject_code', 'name', 'department_id']
});

export const subjectPaperSchema: DatabaseSchema = createDatabaseSchema({
    title: 'subject_paper',
    primaryKey: 'id',
    properties: subjectPaperProperties,
    required: ['id', 'subject_id', 'name', 'created_at', 'updated_at'],
    indexes: ['subject_id']
});

export const examPaperSettingProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100, final: true },
    exam_session_id: { type: 'string', ref: 'exam_sessions', maxLength: 100 },
    subject_paper_id: { type: 'string', ref: 'subject_papers' },
    marks_out_of: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    weight_percentage: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 100 },
    created_at: { type: 'string', format: 'date-time', maxLength: 50 },
    updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    subject_paper_name: { type: ['string', 'null'], maxLength: 150 },
    subject_name: { type: ['string', 'null'], maxLength: 100 },
};

export const examPaperSettingSchema: DatabaseSchema = createDatabaseSchema({
    title: 'exam_paper_setting',
    primaryKey: 'id',
    properties: examPaperSettingProperties,
    required: ['id', 'exam_session_id', 'subject_paper_id', 'marks_out_of', 'weight_percentage', 'created_at', 'updated_at'],
    indexes: ['exam_session_id', 'subject_paper_id']
});


export const examSessionSchema: DatabaseSchema = createDatabaseSchema({
    title: 'exam_session',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        name: SchemaHelpers.string({ description: 'Exam session name', maxLength: 150 }),
        school_period_id: SchemaHelpers.ref('school_periods', { description: 'Reference to school period' }),
        status: SchemaHelpers.string({ description: 'Exam session status', enum: Object.values(ExamSessionStatus), maxLength: 50 }),
        result_publication_date: SchemaHelpers.timestamp({ description: 'Result publication date' }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        school_period_name: SchemaHelpers.string({ description: 'School period name (computed)', maxLength: 100 }),
        education_system_id: SchemaHelpers.ref('education_system_configurations', { description: 'Reference to education system', maxLength: 100 }),
        paper_settings: SchemaHelpers.array(
            SchemaHelpers.object(examPaperSettingProperties),
            { description: 'Exam paper settings', default: [] }
        ),
    },
    required: ['id', 'name', 'school_period_id', 'status', 'created_at', 'updated_at'],
    indexes: ['school_period_id', 'status']
});

export const gradingSchemeLevelProperties: Record<string, DatabaseProperty> = {
    id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999, final: true },
    scheme_id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999 }, 
    grade: { type: 'string', maxLength: 10 },
    min_score: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    max_score: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    points: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    comment: { type: ['string', 'null'], maxLength: 200 },
};
export const gradingSchemeSchema: DatabaseSchema = createDatabaseSchema({
    title: 'grading_scheme',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.integer({ description: 'Unique identifier', minimum: 1, maximum: 999999999 }),
        name: SchemaHelpers.string({ description: 'Grading scheme name', maxLength: 100 }),
        is_default: SchemaHelpers.boolean({ description: 'Whether this is the default scheme', default: false }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        levels: SchemaHelpers.array(
            SchemaHelpers.object(gradingSchemeLevelProperties),
            { description: 'Grading levels' }
        ),
        education_system_id: SchemaHelpers.ref('education_system_configurations', { description: 'Reference to education system', maxLength: 100 })
    },
    required: ['id', 'name', 'is_default', 'created_at', 'updated_at'],
    indexes: ['name', 'is_default']
});

export const studentPaperMarkProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100, final: true }, 
    student_exam_result_id: { type: 'string', ref: 'student_exam_results', maxLength: 100 },
    paper_setting_id: { type: 'string', maxLength: 100 }, 
    score: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    subject_paper_name: { type: ['string', 'null'], maxLength: 150 },
    subject_name: { type: ['string', 'null'], maxLength: 100 },
    marks_out_of: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
};
export const studentExamResultSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_exam_result',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
        exam_session_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        total_marks: SchemaHelpers.number({ description: 'Total marks scored', minimum: 0, maximum: 999999.99 }),
        mean_grade: SchemaHelpers.string({ description: 'Mean grade', maxLength: 10 }),
        class_rank: SchemaHelpers.integer({ description: 'Rank in class', minimum: 1, maximum: 999999999 }),
        stream_rank: SchemaHelpers.integer({ description: 'Rank in stream', minimum: 1, maximum: 999999999 }),
        overall_comment: SchemaHelpers.string({ description: 'Overall comment', maxLength: 1000 }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        marks: SchemaHelpers.array(
            SchemaHelpers.object(studentPaperMarkProperties),
            { description: 'Individual paper marks', default: [] }
        ),
        student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
        admission_no: SchemaHelpers.string({ description: 'Student admission number (computed)', maxLength: 50 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 100 }),
        stream_name: SchemaHelpers.string({ description: 'Stream name (computed)', maxLength: 100 }),
        exam_session_name: SchemaHelpers.string({ description: 'Exam session name (computed)', maxLength: 150 }),
    },
    required: ['id', 'student_id', 'exam_session_id', 'created_at', 'updated_at'],
    indexes: ['student_id', 'exam_session_id']
});

export const classSubjectAllocationSchema: DatabaseSchema = createDatabaseSchema({
    title: 'class_subject_allocation',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        class_stream_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream' }),
        subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject' }),
        academic_year_id: SchemaHelpers.ref('academic_years', { description: 'Reference to academic year' }),
        class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        academic_year_name: SchemaHelpers.string({ description: 'Academic year name (computed)', maxLength: 100 }),
        is_enrolled: SchemaHelpers.boolean({ description: 'Whether enrollment is active', default: true }),
    },
    required: ['id', 'class_stream_id', 'subject_id', 'academic_year_id', 'is_enrolled'],
    indexes: ['class_stream_id', 'subject_id', 'academic_year_id']
});

export const teacherSubjectAssignmentSchema: DatabaseSchema = createDatabaseSchema({
    title: 'teacher_subject_assignment',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        allocation_id: SchemaHelpers.ref('class_subject_allocations', { description: 'Reference to class subject allocation', maxLength: 100 }),
        teacher_id: SchemaHelpers.ref('staff', { description: 'Reference to teacher', maxLength: 100 }),
        class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        academic_year_name: SchemaHelpers.string({ description: 'Academic year name (computed)', maxLength: 100 }),
        teacher_name: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
    },
    required: ['id', 'allocation_id', 'teacher_id'],
    indexes: ['allocation_id', 'teacher_id']
});

export const studentSubjectEnrollmentSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_subject_enrollment',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
        class_subject_allocation_id: SchemaHelpers.ref('class_subject_allocations', { description: 'Reference to class subject allocation', maxLength: 100 }),
        enrollment_date: SchemaHelpers.string({ description: 'Enrollment date', format: 'date', maxLength: 20 }),
        status: SchemaHelpers.string({ description: 'Enrollment status', enum: Object.values(StudentEnrollmentStatus), maxLength: 50 }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 100 }),
        stream_name: SchemaHelpers.string({ description: 'Stream name (computed)', maxLength: 100 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        academic_year_name: SchemaHelpers.string({ description: 'Academic year name (computed)', maxLength: 100 }),
        enrollment_status_display: SchemaHelpers.string({ description: 'Enrollment status display (computed)', maxLength: 50 }),
    },
    required: ['id', 'student_id', 'class_subject_allocation_id', 'status', 'created_at', 'updated_at'],
    indexes: ['student_id', 'class_subject_allocation_id']
});

export const timetablePeriodDefSchema: DatabaseSchema = createDatabaseSchema({
    title: 'timetable_period_definition',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.integer({ description: 'Unique identifier', minimum: 1, maximum: 999999999 }),
        period_name: SchemaHelpers.string({ description: 'Period name', maxLength: 50 }),
        start_time: SchemaHelpers.string({ description: 'Start time', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', maxLength: 20 }),
        end_time: SchemaHelpers.string({ description: 'End time', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', maxLength: 20 }),
        is_teaching_period: SchemaHelpers.boolean({ description: 'Whether this is a teaching period', default: true }),
    },
    required: ['id', 'period_name', 'start_time', 'end_time'],
    indexes: ['period_name']
});

export const timetableEntrySchema: DatabaseSchema = createDatabaseSchema({
    title: 'timetable_entry',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        class_stream_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream', maxLength: 100 }),
        period_def_id: SchemaHelpers.ref('timetable_period_definitions', { description: 'Reference to period definition', minimum: 1, maximum: 999999999 }),
        day_of_week: SchemaHelpers.number({ description: 'Day of week (1-7)', minimum: 1, maximum: 7 }),
        subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject', maxLength: 100 }),
        teacher_id: SchemaHelpers.ref('staff', { description: 'Reference to teacher', maxLength: 100 }),
        room_id: SchemaHelpers.ref('rooms', { description: 'Reference to room', maxLength: 100 }),
        is_break: SchemaHelpers.boolean({ description: 'Is this a break period', default: false }),
        break_type: SchemaHelpers.string({ description: 'Type of break', enum: [...Object.values(BreakType), null], maxLength: 50 }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 100 }),
        stream_name: SchemaHelpers.string({ description: 'Stream name (computed)', maxLength: 100 }),
        period_name: SchemaHelpers.string({ description: 'Period name (computed)', maxLength: 100 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        teacher_name: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
        room_name: SchemaHelpers.string({ description: 'Room name (computed)', maxLength: 100 }),
        start_time: SchemaHelpers.string({ description: 'Start time (computed)', maxLength: 20 }),
        end_time: SchemaHelpers.string({ description: 'End time (computed)', maxLength: 20 }),
    },
    required: ['id', 'class_stream_id', 'period_def_id', 'day_of_week', 'is_break', 'created_at', 'updated_at'],
    indexes: ['class_stream_id', 'period_def_id', 'day_of_week']
});
