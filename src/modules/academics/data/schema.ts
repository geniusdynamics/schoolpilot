// ABOUTME: Defines RxDB JSON schemas for entities specific to the Academics module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema, toTypedRxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils';

export const examScheduleSchema: RxJsonSchema<types.ExamScheduleEntity> = createEntitySchema<types.ExamScheduleEntity>(
    'exam_schedule',
    {
        id: { type: 'string', maxLength: 100, final: true },
        exam_id: { type: 'string', ref: 'exam_sessions', maxLength: 100 },
        period_id: { type: 'string', ref: 'timetable_period_definitions' },
        class_stream_id: { type: 'string', ref: 'class_streams' },
        invigilator_id: { type: 'string', ref: 'staff', maxLength: 100 },
        room_number: { type: 'string', maxLength: 50 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'exam_id', 'period_id', 'class_stream_id', 'invigilator_id'],
    ['exam_id', 'period_id', 'class_stream_id', 'invigilator_id']
);

export const resultApprovalSchema: RxJsonSchema<types.ResultApprovalEntity> = createEntitySchema<types.ResultApprovalEntity>(
    'result_approval',
    {
        id: { type: 'string', maxLength: 100, final: true },
        result_id: { type: 'string', ref: 'student_exam_results', maxLength: 100 },
        state: { type: 'string', enum: Object.values(types.ResultState), maxLength: 50 },
        created_by: { type: 'string', ref: 'users', maxLength: 100 },
        updated_by: { type: 'string', ref: 'users', maxLength: 100 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        audit_trail: { 
            type: 'array', 
            items: { 
                type: 'object', 
                properties: {
                    timestamp: { type: 'string', format: 'date-time', maxLength: 50 },
                    user_id: { type: 'string', ref: 'users', maxLength: 100 },
                    action: { type: 'string', maxLength: 100 },
                    previous_state: { type: 'string', enum: Object.values(types.ResultState), maxLength: 50 },
                    new_state: { type: 'string', enum: Object.values(types.ResultState), maxLength: 50 },
                }
            }
        }
    },
    { key: 'id', type: 'string' },
    ['id', 'result_id', 'state'],
    ['result_id', 'state']
);

// ABOUTME: Defines the database schema for the SP3 academics module.
// ABOUTME: This file outlines entities, relations, and methods related to the academic data.

export const subjectPaperProperties: RxJsonSchema<types.AcademicsSubjectPaperType>['properties'] = {
    id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999, final: true },
    subject_id: { type: 'string', ref: 'subjects' }, 
    name: { type: 'string', maxLength: 150 },
    created_at: { type: 'string', format: 'date-time', maxLength: 50 },
    updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
    subject_name: { type: ['string', 'null'], maxLength: 100 },
};
export const subjectSchema: RxJsonSchema<types.AcademicsSubjectType> = createEntitySchema<types.AcademicsSubjectType>(
    'subject',
    {
        id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999, final: true },
        subject_code: { type: 'string', maxLength: 20, final: true },
        abbreviation: { type: 'string', maxLength: 10 },
        name: { type: 'string', maxLength: 100 },
        department_id: { type: ['string', 'null'], ref: 'departments' }, 
        is_compulsory: { type: 'boolean', default: false },
        grouping: { type: 'string', enum: Object.values(types.SubjectGrouping), maxLength: 50 },
        department_name: { type: ['string', 'null'], maxLength: 100 },
        papers: { type: ['array', 'null'], default: [], items: { type: 'object', properties: subjectPaperProperties } },
    },
    { key: 'id', type: 'number' },
    ['id', 'subject_code', 'name', 'grouping'],
    ['subject_code', 'name', 'department_id']
);

export const subjectPaperSchema: RxJsonSchema<types.AcademicsSubjectPaperType> = createEntitySchema<types.AcademicsSubjectPaperType>(
    'subject_paper',
    subjectPaperProperties,
    { key: 'id', type: 'number' },
    ['id', 'subject_id', 'name', 'created_at', 'updated_at'],
    ['subject_id']
);

export const examPaperSettingProperties: RxJsonSchema<types.AcademicsExamPaperSettingType>['properties'] = {
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

export const examPaperSettingSchema: RxJsonSchema<types.AcademicsExamPaperSettingType> = createEntitySchema<types.AcademicsExamPaperSettingType>(
    'exam_paper_setting', // Schema name, not collection name if it's only nested
    examPaperSettingProperties,
    { key: 'id', type: 'string' },
    ['id', 'exam_session_id', 'subject_paper_id', 'marks_out_of', 'weight_percentage', 'created_at', 'updated_at'],
    ['exam_session_id', 'subject_paper_id']
);


export const examSessionSchema: RxJsonSchema<types.AcademicsExamSessionType> = createEntitySchema<types.AcademicsExamSessionType>(
    'exam_session',
    {
        id: { type: 'string', maxLength: 100, final: true },
        name: { type: 'string', maxLength: 150 },
        school_period_id: { type: 'string', ref: 'school_periods' }, 
        status: { type: 'string', enum: Object.values(types.ExamSessionStatus), maxLength: 50 },
        result_publication_date: { type: ['string', 'null'], format: 'date-time', maxLength: 50 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        school_period_name: { type: ['string', 'null'], maxLength: 100 },
        education_system_id: { type: ['string', 'null'], ref: 'education_system_configurations', maxLength: 100 },
        paper_settings: { type: ['array', 'null'], default: [], items: { type: 'object', properties: examPaperSettingProperties } },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'school_period_id', 'status', 'created_at', 'updated_at'],
    ['school_period_id', 'status']
);

export const gradingSchemeLevelProperties: RxJsonSchema<types.AcademicsGradingSchemeLevelType>['properties'] = {
    id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999, final: true },
    scheme_id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999 }, 
    grade: { type: 'string', maxLength: 10 },
    min_score: { type: 'number', multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    max_score: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    points: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    comment: { type: ['string', 'null'], maxLength: 200 },
};
export const gradingSchemeSchema: RxJsonSchema<types.AcademicsGradingSchemeType> = createEntitySchema<types.AcademicsGradingSchemeType>(
    'grading_scheme',
    {
        id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999, final: true },
        name: { type: 'string', maxLength: 100 },
        is_default: { type: 'boolean', default: false },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        levels: { type: 'array', items: { type: 'object', properties: gradingSchemeLevelProperties } },
        education_system_id: { type: ['string', 'null'], ref: 'education_system_configurations', maxLength: 100 }
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'is_default', 'created_at', 'updated_at'],
    ['name', 'is_default']
);

export const studentPaperMarkProperties: RxJsonSchema<types.AcademicsStudentPaperMarkWithDetailsType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true }, 
    student_exam_result_id: { type: 'string', ref: 'student_exam_results', maxLength: 100 },
    paper_setting_id: { type: 'string', maxLength: 100 }, 
    score: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
    subject_paper_name: { type: ['string', 'null'], maxLength: 150 },
    subject_name: { type: ['string', 'null'], maxLength: 100 },
    marks_out_of: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
};
export const studentExamResultSchema: RxJsonSchema<types.AcademicsStudentExamResultWithDetailsType> = createEntitySchema<types.AcademicsStudentExamResultWithDetailsType>(
    'student_exam_result',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students', maxLength: 100 }, 
        exam_session_id: { type: 'string', ref: 'exam_sessions', maxLength: 100 },
        total_marks: { type: ['number', 'null'], multipleOf: 0.01, minimum: 0, maximum: 999999.99 },
        mean_grade: { type: ['string', 'null'], maxLength: 10 },
        class_rank: { type: ['number', 'null'], multipleOf: 1, minimum: 1, maximum: 999999999 },
        stream_rank: { type: ['number', 'null'], multipleOf: 1, minimum: 1, maximum: 999999999 },
        overall_comment: { type: ['string', 'null'], maxLength: 1000 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        marks: { type: ['array', 'null'], default: [], items: { type: 'object', properties: studentPaperMarkProperties } },
        student_name: { type: ['string', 'null'], maxLength: 200 },
        admission_no: { type: ['string', 'null'], maxLength: 50 },
        class_name: { type: ['string', 'null'], maxLength: 100 },
        stream_name: { type: ['string', 'null'], maxLength: 100 },
        exam_session_name: { type: ['string', 'null'], maxLength: 150 },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'exam_session_id', 'created_at', 'updated_at'],
    ['student_id', 'exam_session_id']
);

export const classSubjectAllocationSchema: RxJsonSchema<types.AcademicsClassSubjectAllocationType> = createEntitySchema<types.AcademicsClassSubjectAllocationType>(
    'class_subject_allocation',
    {
        id: { type: 'string', maxLength: 100, final: true },
        class_stream_id: { type: 'string', ref: 'class_streams' }, 
        subject_id: { type: 'string', ref: 'subjects' },
        academic_year_id: { type: 'string', ref: 'academic_years' }, 
        class_stream_name: { type: ['string', 'null'], maxLength: 150 },
        subject_name: { type: ['string', 'null'], maxLength: 100 },
        academic_year_name: { type: ['string', 'null'], maxLength: 100 },
        is_enrolled: { type: 'boolean', default: true }, 
    },
    { key: 'id', type: 'string' },
    ['id', 'class_stream_id', 'subject_id', 'academic_year_id', 'is_enrolled'],
    ['class_stream_id', 'subject_id', 'academic_year_id']
);

export const teacherSubjectAssignmentSchema: RxJsonSchema<types.AcademicsTeacherSubjectAssignmentType> = createEntitySchema<types.AcademicsTeacherSubjectAssignmentType>(
    'teacher_subject_assignment',
    {
        id: { type: 'string', maxLength: 100, final: true },
        allocation_id: { type: 'string', ref: 'class_subject_allocations', maxLength: 100 },
        teacher_id: { type: 'string', ref: 'staff', maxLength: 100 }, 
        class_stream_name: { type: ['string', 'null'], maxLength: 150 },
        subject_name: { type: ['string', 'null'], maxLength: 100 },
        academic_year_name: { type: ['string', 'null'], maxLength: 100 },
        teacher_name: { type: ['string', 'null'], maxLength: 200 },
    },
    { key: 'id', type: 'string' },
    ['id', 'allocation_id', 'teacher_id'],
    ['allocation_id', 'teacher_id']
);

export const studentSubjectEnrollmentSchema: RxJsonSchema<types.AcademicsStudentSubjectEnrollmentType> = createEntitySchema<types.AcademicsStudentSubjectEnrollmentType>(
    'student_subject_enrollment',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students', maxLength: 100 }, 
        class_subject_allocation_id: { type: 'string', ref: 'class_subject_allocations', maxLength: 100 },
        enrollment_date: { type: 'string', format: 'date', maxLength: 20 },
        status: { type: 'string', enum: Object.values(types.StudentEnrollmentStatus), maxLength: 50 },
        created_at: { type: 'string', format: 'date-time', maxLength: 50 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 50 },
        student_name: { type: ['string', 'null'], maxLength: 200 },
        class_name: { type: ['string', 'null'], maxLength: 100 },
        stream_name: { type: ['string', 'null'], maxLength: 100 },
        subject_name: { type: ['string', 'null'], maxLength: 100 },
        academic_year_name: { type: ['string', 'null'], maxLength: 100 },
        enrollment_status_display: { type: ['string', 'null'], maxLength: 50 },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'class_subject_allocation_id', 'status', 'created_at', 'updated_at'],
    ['student_id', 'class_subject_allocation_id']
);

export const timetablePeriodDefSchema: RxJsonSchema<types.AcademicsTimetablePeriodDefType> = createEntitySchema<types.AcademicsTimetablePeriodDefType>(
    'timetable_period_definition', 
    {
        id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999 },
        period_name: { type: 'string', maxLength: 50 },
        start_time: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', maxLength: 20 }, 
        end_time: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', maxLength: 20 },   
        is_teaching_period: { type: 'boolean', default: true },
    },
    { key: 'id', type: 'number' },
    ['id', 'period_name', 'start_time', 'end_time'],
    ['period_name']
);

export const timetableEntrySchema: RxJsonSchema<types.AcademicsTimetableEntryType> = createEntitySchema<types.AcademicsTimetableEntryType>(
    'timetable_entry',
    {
        id: { type: 'string', maxLength: 100, final: true },
        class_stream_id: { type: 'string', ref: 'class_streams' }, 
        day_of_week: { type: 'string', enum: Object.values(types.DayOfWeek), maxLength: 20 },
        period_id: { type: 'string', ref: 'timetable_period_definitions' },
        subject_id: { type: 'string', ref: 'subjects' },
        teacher_id: { type: 'string', ref: 'staff', maxLength: 100 }, 
        class_stream_name: { type: ['string', 'null'], maxLength: 150 },
        period_name: { type: ['string', 'null'], maxLength: 100 },
        subject_name: { type: ['string', 'null'], maxLength: 100 },
        teacher_name: { type: ['string', 'null'], maxLength: 200 },
    },
    { key: 'id', type: 'string' },
    ['id', 'class_stream_id', 'day_of_week', 'period_id'],
    ['class_stream_id', 'day_of_week', 'period_id']
);
