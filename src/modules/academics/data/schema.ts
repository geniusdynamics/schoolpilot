// ABOUTME: Defines database-agnostic schemas for entities specific to the Academics module.
// ABOUTME: These schemas are used by both RxDB and PouchDB services to create collections.

import { 
  ResultState, 
  SubjectGrouping, 
  ExamSessionStatus, 
  StudentEnrollmentStatus, 
  BreakType,
  AssignmentStatus,
  SubmissionStatus
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
            { description: 'Subject papers' }
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
            { description: 'Exam paper settings' }
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

export const studentPaperMarksSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_paper_mark',
    primaryKey: 'id',
    properties: {
        ...studentPaperMarkProperties,
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'student_exam_result_id', 'paper_setting_id'],
    indexes: ['student_exam_result_id', 'paper_setting_id']
});
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
            { description: 'Individual paper marks' }
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

// === ASSIGNMENTS DOMAIN ===
// Note: assignment entities use the module-local camelCase field naming consumed by
// pages/assignments/* and data/useAssignmentsData.ts (same convention as houses/pickup modules).

const rubricLevelProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 150 },
    description: { type: ['string', 'null'], maxLength: 500 },
    points: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
};

const rubricCriterionProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string', maxLength: 200 },
    description: { type: ['string', 'null'], maxLength: 1000 },
    maxPoints: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    weightPercentage: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 100 },
    levels: {
        type: 'array',
        description: 'Performance levels for this criterion',
        items: { type: 'object', properties: rubricLevelProperties },
    },
};

export const assignmentSchema: DatabaseSchema = createDatabaseSchema({
    title: 'assignment',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        title: SchemaHelpers.string({ description: 'Assignment title', maxLength: 250 }),
        description: SchemaHelpers.string({ description: 'Assignment description', maxLength: 2000 }),
        subjectId: SchemaHelpers.string({ description: 'Subject identifier', maxLength: 100 }),
        subjectName: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 150 }),
        classId: SchemaHelpers.string({ description: 'Class identifier', maxLength: 100 }),
        className: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        classStreamId: SchemaHelpers.string({ description: 'Class stream identifier', maxLength: 100 }),
        classStreamName: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
        teacherId: SchemaHelpers.string({ description: 'Teacher identifier', maxLength: 100 }),
        teacherName: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
        assignedDate: SchemaHelpers.timestamp({ description: 'Date the assignment was issued' }),
        dueDate: SchemaHelpers.timestamp({ description: 'Submission deadline' }),
        maxScore: SchemaHelpers.number({ description: 'Maximum achievable score', minimum: 0, maximum: 999999.99 }),
        weightPercentage: SchemaHelpers.number({ description: 'Contribution to final grade (%)', minimum: 0, maximum: 100 }),
        status: SchemaHelpers.string({ description: 'Assignment status', enum: Object.values(AssignmentStatus), maxLength: 50 }),
        allowLateSubmission: SchemaHelpers.boolean({ description: 'Whether late submissions are allowed', default: true }),
        latePenaltyPercentage: SchemaHelpers.number({ description: 'Penalty applied to late submissions (%)', minimum: 0, maximum: 100 }),
        instructions: { type: ['string', 'null'], maxLength: 8000 },
        attachments: {
            type: 'array',
            description: 'Attachment references',
            items: { type: 'string', maxLength: 500 },
        },
        rubricId: { type: ['string', 'null'], maxLength: 100 },
        rubric: {
            type: 'array',
            description: 'Rubric criteria used to grade this assignment',
            items: { type: 'object', properties: rubricCriterionProperties },
        },
        submissionCount: { type: ['integer', 'null'], description: 'Expected/recorded submission count (computed)', minimum: 0, maximum: 999999999 },
        createdAt: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updatedAt: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'title', 'status', 'assignedDate', 'dueDate', 'maxScore', 'allowLateSubmission', 'createdAt', 'updatedAt'],
    indexes: ['subjectId', 'classStreamId', 'teacherId', 'status', 'dueDate']
});

export const assignmentSubmissionSchema: DatabaseSchema = createDatabaseSchema({
    title: 'assignment_submission',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        assignmentId: SchemaHelpers.string({ description: 'Owning assignment identifier', maxLength: 100 }),
        studentId: SchemaHelpers.string({ description: 'Student identifier', maxLength: 100 }),
        studentName: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
        status: SchemaHelpers.string({ description: 'Submission status', enum: Object.values(SubmissionStatus), maxLength: 50 }),
        submissionDate: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        score: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        grade: { type: ['string', 'null'], maxLength: 10 },
        feedback: { type: ['string', 'null'], maxLength: 4000 },
        maxScore: SchemaHelpers.number({ description: 'Maximum achievable score', minimum: 0, maximum: 999999.99 }),
        gradedBy: { type: ['string', 'null'], maxLength: 100 },
        gradedByName: { type: ['string', 'null'], maxLength: 200 },
        gradedAt: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        isLate: { type: ['boolean', 'null'], description: 'Whether the submission was late' },
    },
    required: ['id', 'assignmentId', 'studentId', 'studentName', 'status', 'maxScore'],
    indexes: ['assignmentId', 'studentId', 'status']
});

// === LESSON PLANNING DOMAIN ===
// Note: lesson-planning entities use the module-local camelCase field naming consumed by
// pages/lessonplans/* and data/lessonplans/useLessonPlansData.ts.

const weeklyPlanPeriodPlanProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100 },
    periodId: { type: ['string', 'null'], maxLength: 100 },
    periodName: { type: ['string', 'null'], maxLength: 100 },
    periodStartTime: { type: ['string', 'null'], maxLength: 20 },
    periodEndTime: { type: ['string', 'null'], maxLength: 20 },
    duration: { type: ['integer', 'null'], minimum: 0, maximum: 999999 },
    topicDetail: { type: ['string', 'null'], maxLength: 2000 },
    teachingMethod: { type: ['string', 'null'], maxLength: 1000 },
};

const weeklyPlanDayPlanProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100 },
    dayOfWeek: { type: 'string', maxLength: 20 },
    date: { type: 'string', format: 'date', maxLength: 20 },
    topics: { type: ['string', 'null'], maxLength: 2000 },
    objectives: { type: ['string', 'null'], maxLength: 2000 },
    activities: { type: ['string', 'null'], maxLength: 2000 },
    assessment: { type: ['string', 'null'], maxLength: 2000 },
    homework: { type: ['string', 'null'], maxLength: 2000 },
    periodPlans: {
        type: 'array',
        description: 'Per-period breakdown for this day',
        items: { type: 'object', properties: weeklyPlanPeriodPlanProperties },
    },
};

export const weeklyPlanSchema: DatabaseSchema = createDatabaseSchema({
    title: 'weekly_plan',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        title: SchemaHelpers.string({ description: 'Weekly plan title', maxLength: 250 }),
        subjectId: SchemaHelpers.string({ description: 'Subject identifier', maxLength: 100 }),
        subjectName: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 150 }),
        teacherId: SchemaHelpers.string({ description: 'Teacher identifier', maxLength: 100 }),
        teacherName: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
        gradeLevel: SchemaHelpers.string({ description: 'Grade level', maxLength: 50 }),
        classStreamId: SchemaHelpers.string({ description: 'Class stream identifier', maxLength: 100 }),
        classStreamName: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
        topic: SchemaHelpers.string({ description: 'Week topic', maxLength: 250 }),
        objectives: {
            type: 'array',
            description: 'Weekly learning objectives',
            items: { type: 'string', maxLength: 500 },
        },
        materials: {
            type: 'array',
            description: 'Required learning materials',
            items: { type: 'string', maxLength: 500 },
        },
        duration: SchemaHelpers.integer({ description: 'Number of days/sessions covered', minimum: 0, maximum: 366 }),
        status: SchemaHelpers.string({ description: 'Approval workflow status', enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], maxLength: 20 }),
        submittedAt: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        submittedBy: { type: ['string', 'null'], maxLength: 100 },
        submittedByName: { type: ['string', 'null'], maxLength: 200 },
        reviewedAt: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        reviewedBy: { type: ['string', 'null'], maxLength: 100 },
        reviewedByName: { type: ['string', 'null'], maxLength: 200 },
        reviewComments: { type: ['string', 'null'], maxLength: 4000 },
        weekStartDate: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        weekEndDate: { type: ['string', 'null'], format: 'date', maxLength: 20 },
        dayPlans: {
            type: 'array',
            description: 'Day-by-day plan breakdown',
            items: { type: 'object', properties: weeklyPlanDayPlanProperties },
        },
        overallObjectives: { type: ['string', 'null'], maxLength: 4000 },
        teachingAids: { type: ['string', 'null'], maxLength: 2000 },
        references: {
            type: 'array',
            description: 'Reference materials',
            items: { type: 'string', maxLength: 500 },
        },
        createdAt: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updatedAt: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'title', 'subjectId', 'teacherId', 'gradeLevel', 'topic', 'duration', 'status', 'createdAt', 'updatedAt'],
    indexes: ['subjectId', 'teacherId', 'classStreamId', 'status', 'weekStartDate']
});

export const lessonPlanSchema: DatabaseSchema = createDatabaseSchema({
    title: 'lesson_plan',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        title: SchemaHelpers.string({ description: 'Lesson plan title', maxLength: 250 }),
        description: SchemaHelpers.string({ description: 'Lesson plan description', maxLength: 2000 }),
        subjectId: SchemaHelpers.string({ description: 'Subject identifier', maxLength: 100 }),
        subjectName: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 150 }),
        classId: SchemaHelpers.string({ description: 'Class identifier', maxLength: 100 }),
        className: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        teacherId: SchemaHelpers.string({ description: 'Teacher identifier', maxLength: 100 }),
        teacherName: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
        date: SchemaHelpers.string({ description: 'Lesson date', format: 'date', maxLength: 20 }),
        startTime: SchemaHelpers.string({ description: 'Start time', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', maxLength: 20 }),
        endTime: SchemaHelpers.string({ description: 'End time', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', maxLength: 20 }),
        objectives: {
            type: 'array',
            description: 'Lesson objectives',
            items: { type: 'string', maxLength: 500 },
        },
        content: SchemaHelpers.string({ description: 'Lesson content summary', maxLength: 4000 }),
        resources: {
            type: 'array',
            description: 'Lesson resources',
            items: { type: 'string', maxLength: 500 },
        },
        status: SchemaHelpers.string({ description: 'Lesson plan status', enum: ['draft', 'published', 'archived'], maxLength: 20 }),
        createdAt: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updatedAt: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'title', 'subjectId', 'teacherId', 'date', 'startTime', 'endTime', 'status', 'createdAt', 'updatedAt'],
    indexes: ['subjectId', 'teacherId', 'date', 'status']
});

export const lessonNoteSchema: DatabaseSchema = createDatabaseSchema({
    title: 'lesson_note',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        teacherId: SchemaHelpers.string({ description: 'Teacher identifier', maxLength: 100 }),
        teacherName: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
        subjectId: SchemaHelpers.string({ description: 'Subject identifier', maxLength: 100 }),
        subjectName: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 150 }),
        classStreamId: SchemaHelpers.string({ description: 'Class stream identifier', maxLength: 100 }),
        classStreamName: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
        date: SchemaHelpers.string({ description: 'Lesson date', format: 'date', maxLength: 20 }),
        periodId: SchemaHelpers.string({ description: 'Timetable period identifier', maxLength: 100 }),
        periodName: SchemaHelpers.string({ description: 'Period name (computed)', maxLength: 100 }),
        topic: SchemaHelpers.string({ description: 'Lesson topic', maxLength: 250 }),
        subTopic: SchemaHelpers.string({ description: 'Sub-topic', maxLength: 250 }),
        objectives: SchemaHelpers.string({ description: 'Lesson objectives', maxLength: 4000 }),
        introduction: SchemaHelpers.string({ description: 'Introduction notes', maxLength: 4000 }),
        presentation: SchemaHelpers.string({ description: 'Presentation notes', maxLength: 4000 }),
        development: SchemaHelpers.string({ description: 'Development notes', maxLength: 4000 }),
        assessment: SchemaHelpers.string({ description: 'Assessment notes', maxLength: 4000 }),
        conclusion: SchemaHelpers.string({ description: 'Conclusion notes', maxLength: 4000 }),
        reflection: SchemaHelpers.string({ description: 'Teacher reflection', maxLength: 4000 }),
        challenges: SchemaHelpers.string({ description: 'Challenges encountered', maxLength: 4000 }),
        studentsPresent: SchemaHelpers.string({ description: 'Students present count', maxLength: 50 }),
        studentsAbsent: SchemaHelpers.string({ description: 'Students absent count', maxLength: 50 }),
        createdAt: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updatedAt: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'teacherId', 'subjectId', 'classStreamId', 'date', 'topic', 'createdAt', 'updatedAt'],
    indexes: ['teacherId', 'subjectId', 'classStreamId', 'date']
});

// === Exam Operations Collections ===

export const examTokenSchema: DatabaseSchema = createDatabaseSchema({
    title: 'exam_token',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        token_code: SchemaHelpers.string({ description: 'Secure token code', maxLength: 50 }),
        exam_session_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        exam_session_name: SchemaHelpers.string({ description: 'Exam session name (computed)', maxLength: 150 }),
        teacher_id: SchemaHelpers.ref('staff', { description: 'Reference to teacher', maxLength: 100 }),
        teacher_name: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
        subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject', maxLength: 100 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        class_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        generated_at: SchemaHelpers.timestamp({ description: 'Generation timestamp' }),
        expires_at: SchemaHelpers.timestamp({ description: 'Expiry timestamp' }),
        status: SchemaHelpers.string({ description: 'Token status', enum: ['Active', 'Used', 'Expired', 'Revoked'], maxLength: 20 }),
        used_at: SchemaHelpers.timestamp({ description: 'Usage timestamp', nullable: true }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'token_code', 'exam_session_id', 'teacher_id', 'generated_at', 'expires_at', 'status'],
    indexes: ['token_code', 'exam_session_id', 'teacher_id', 'status']
});

export const boardExamResultSchema: DatabaseSchema = createDatabaseSchema({
    title: 'board_exam_result',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
        student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
        admission_no: SchemaHelpers.string({ description: 'Admission number (computed)', maxLength: 50 }),
        board_exam_type: SchemaHelpers.string({ description: 'Board exam type', enum: ['IGCSE', 'A-Level', 'IB', 'SAT', 'Other'], maxLength: 50 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name', maxLength: 150 }),
        paper_code: SchemaHelpers.string({ description: 'Paper code', maxLength: 50 }),
        grade: SchemaHelpers.string({ description: 'Grade achieved', maxLength: 10 }),
        marks_obtained: SchemaHelpers.number({ description: 'Marks obtained', minimum: 0, maximum: 999999.99, multipleOf: 0.01 }),
        max_marks: SchemaHelpers.number({ description: 'Maximum possible marks', minimum: 0, maximum: 999999.99, multipleOf: 0.01 }),
        percentage: SchemaHelpers.number({ description: 'Percentage score', minimum: 0, maximum: 100, multipleOf: 0.01 }),
        exam_date: SchemaHelpers.date({ description: 'Exam date' }),
        center_number: SchemaHelpers.string({ description: 'Exam center number', maxLength: 50 }),
        candidate_number: SchemaHelpers.string({ description: 'Candidate number', maxLength: 50 }),
        entered_at: SchemaHelpers.timestamp({ description: 'When the result was entered' }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'student_id', 'board_exam_type', 'subject_name', 'marks_obtained', 'max_marks', 'percentage'],
    indexes: ['student_id', 'board_exam_type', 'subject_name']
});

export const resultDistributionSchema: DatabaseSchema = createDatabaseSchema({
    title: 'result_distribution',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        exam_session_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        exam_session_name: SchemaHelpers.string({ description: 'Exam session name (computed)', maxLength: 150 }),
        class_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        distribution_method: SchemaHelpers.string({ description: 'Distribution channel', enum: ['Portal', 'SMS', 'Email', 'Print'], maxLength: 50 }),
        status: SchemaHelpers.string({ description: 'Distribution status', enum: ['Pending', 'Distributed', 'Failed'], maxLength: 50 }),
        scheduled_date: SchemaHelpers.timestamp({ description: 'Scheduled distribution date' }),
        distributed_at: SchemaHelpers.timestamp({ description: 'Actual distribution date', nullable: true }),
        recipients_count: SchemaHelpers.integer({ description: 'Number of recipients', minimum: 0, maximum: 999999999 }),
        success_count: SchemaHelpers.integer({ description: 'Successful deliveries', minimum: 0, maximum: 999999999 }),
        failure_count: SchemaHelpers.integer({ description: 'Failed deliveries', minimum: 0, maximum: 999999999 }),
        notes: SchemaHelpers.string({ description: 'Distribution notes', maxLength: 500, nullable: true }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'exam_session_id', 'class_id', 'distribution_method', 'status', 'scheduled_date'],
    indexes: ['exam_session_id', 'class_id', 'status', 'distribution_method']
});

export const gazetteStudentProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'string', ref: 'students', maxLength: 100 },
    student_name: { type: ['string', 'null'], maxLength: 200 },
    admission_no: { type: ['string', 'null'], maxLength: 50 },
    rank: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999 },
    total_marks: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    average: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 100 },
    grade: { type: ['string', 'null'], maxLength: 10 },
    position: { type: ['string', 'null'], maxLength: 20 },
    marks: SchemaHelpers.object(
        {},
        { description: 'Per-student marks keyed by subject id', nullable: true }
    ),
};

export const gazetteSubjectProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100 },
    subject_id: { type: 'string', ref: 'subjects', maxLength: 100 },
    subject_name: { type: ['string', 'null'], maxLength: 150 },
    marks_obtained: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    max_marks: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    grade: { type: ['string', 'null'], maxLength: 10 },
};

export const examGazetteSchema: DatabaseSchema = createDatabaseSchema({
    title: 'exam_gazette',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        exam_session_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        exam_session_name: SchemaHelpers.string({ description: 'Exam session name (computed)', maxLength: 150 }),
        class_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        generated_at: SchemaHelpers.timestamp({ description: 'Generation timestamp' }),
        total_students: SchemaHelpers.integer({ description: 'Total students in gazette', minimum: 0, maximum: 999999999 }),
        students: SchemaHelpers.array(
            SchemaHelpers.object(gazetteStudentProperties),
            { description: 'Ranked students with per-subject marks' }
        ),
        subjects: SchemaHelpers.array(
            SchemaHelpers.object(gazetteSubjectProperties),
            { description: 'Class-level subject summaries' }
        ),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'exam_session_id', 'class_id', 'generated_at', 'total_students'],
    indexes: ['exam_session_id', 'class_id']
});

export const schoolEventSchema: DatabaseSchema = createDatabaseSchema({
    title: 'school_event',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        title: SchemaHelpers.string({ description: 'Event title', maxLength: 200 }),
        description: SchemaHelpers.string({ description: 'Event description', maxLength: 1000 }),
        event_type: SchemaHelpers.string({ description: 'Event type', enum: ['Exam', 'Holiday', 'Function', 'Meeting', 'Sports', 'Other'], maxLength: 50 }),
        start_date: SchemaHelpers.date({ description: 'Start date' }),
        end_date: SchemaHelpers.date({ description: 'End date' }),
        location: SchemaHelpers.string({ description: 'Event location', maxLength: 200 }),
        status: SchemaHelpers.string({ description: 'Event status', enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'], maxLength: 50 }),
        organizer: SchemaHelpers.string({ description: 'Event organizer', maxLength: 200 }),
        participants: SchemaHelpers.string({ description: 'Participants', maxLength: 300, nullable: true }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'title', 'event_type', 'start_date', 'end_date', 'location', 'status', 'organizer'],
    indexes: ['event_type', 'status', 'start_date']
});

export const studentMarkProperties: Record<string, DatabaseProperty> = {
    id: { type: 'string', maxLength: 100 },
    student_id: { type: 'string', ref: 'students', maxLength: 100 },
    student_name: { type: ['string', 'null'], maxLength: 200 },
    admission_no: { type: ['string', 'null'], maxLength: 50 },
    marks_obtained: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    marks_total: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    grade: { type: ['string', 'null'], maxLength: 10 },
    remarks: { type: ['string', 'null'], maxLength: 300 },
};

export const marksEntrySessionSchema: DatabaseSchema = createDatabaseSchema({
    title: 'marks_entry_session',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        token_code: SchemaHelpers.string({ description: 'Token used for this entry session', maxLength: 50 }),
        exam_session_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        exam_session_name: SchemaHelpers.string({ description: 'Exam session name (computed)', maxLength: 150 }),
        subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject', maxLength: 100 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        class_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        teacher_id: SchemaHelpers.ref('staff', { description: 'Reference to teacher', maxLength: 100 }),
        teacher_name: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
        status: SchemaHelpers.string({ description: 'Session status', enum: ['Pending', 'In Progress', 'Completed'], maxLength: 50 }),
        marks: SchemaHelpers.array(
            SchemaHelpers.object(studentMarkProperties),
            { description: 'Per-student marks captured in this session' }
        ),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'token_code', 'exam_session_id', 'subject_id', 'class_id', 'teacher_id', 'status', 'created_at', 'updated_at'],
    indexes: ['token_code', 'exam_session_id', 'subject_id', 'class_id', 'teacher_id', 'status']
});

export const structureValidationRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'structure_validation_record',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        exam_session_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        exam_session_name: SchemaHelpers.string({ description: 'Exam session name (computed)', maxLength: 150 }),
        subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject', maxLength: 100 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        class_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        structure_component: SchemaHelpers.string({ description: 'Structure component being validated', maxLength: 150 }),
        expected_max_marks: SchemaHelpers.number({ description: 'Expected maximum marks per structure', minimum: 0, maximum: 999999.99, multipleOf: 0.01 }),
        actual_max_marks: SchemaHelpers.number({ description: 'Actual maximum marks entered', minimum: 0, maximum: 999999.99, multipleOf: 0.01 }),
        marks_difference: SchemaHelpers.number({ description: 'Difference between actual and expected', minimum: -999999.99, maximum: 999999.99, multipleOf: 0.01 }),
        status: SchemaHelpers.string({ description: 'Validation outcome', enum: ['Valid', 'Invalid', 'Warning'], maxLength: 50 }),
        notes: SchemaHelpers.string({ description: 'Validation notes', maxLength: 500, nullable: true }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'exam_session_id', 'subject_id', 'class_id', 'structure_component', 'expected_max_marks', 'actual_max_marks', 'marks_difference', 'status'],
    indexes: ['exam_session_id', 'subject_id', 'class_id', 'status']
});

export const marksCrossCheckRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'marks_cross_check_record',
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
        student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
        admission_no: SchemaHelpers.string({ description: 'Admission number (computed)', maxLength: 50 }),
        exam_session_id: SchemaHelpers.ref('exam_sessions', { description: 'Reference to exam session', maxLength: 100 }),
        exam_session_name: SchemaHelpers.string({ description: 'Exam session name (computed)', maxLength: 150 }),
        subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject', maxLength: 100 }),
        subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
        class_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (computed)', maxLength: 150 }),
        primary_teacher_id: SchemaHelpers.ref('staff', { description: 'Teacher who entered primary marks', maxLength: 100 }),
        primary_teacher_name: SchemaHelpers.string({ description: 'Primary teacher name (computed)', maxLength: 200 }),
        primary_marks: SchemaHelpers.number({ description: 'Primary marks entered', minimum: 0, maximum: 999999.99, multipleOf: 0.01 }),
        verifying_teacher_id: SchemaHelpers.ref('staff', { description: 'Teacher who verified marks', maxLength: 100 }),
        verifying_teacher_name: SchemaHelpers.string({ description: 'Verifying teacher name (computed)', maxLength: 200 }),
        verified_marks: SchemaHelpers.number({ description: 'Verified marks', minimum: 0, maximum: 999999.99, multipleOf: 0.01, nullable: true }),
        marks_difference: SchemaHelpers.number({ description: 'Difference between verified and primary marks', minimum: -999999.99, maximum: 999999.99, multipleOf: 0.01 }),
        status: SchemaHelpers.string({ description: 'Cross-check status', enum: ['Pending', 'Verified', 'Discrepancy', 'Resolved'], maxLength: 50 }),
        verified_at: SchemaHelpers.timestamp({ description: 'Verification timestamp', nullable: true }),
        notes: SchemaHelpers.string({ description: 'Cross-check notes', maxLength: 500, nullable: true }),
        created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    },
    required: ['id', 'student_id', 'exam_session_id', 'subject_id', 'class_id', 'primary_teacher_id', 'primary_marks', 'marks_difference', 'status'],
    indexes: ['student_id', 'exam_session_id', 'subject_id', 'status']
});
