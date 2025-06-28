// ABOUTME: Defines RxDB JSON schemas for entities specific to the Academics module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema, toTypedRxJsonSchema } from 'rxdb';
import * as types from './types'; // Academics specific types
import { createEntitySchema } from '../../../services/rxdbService'; 

// --- Schema Definitions for Academics Module ---

export const subjectPaperProperties: RxJsonSchema<types.AcademicsSubjectPaperType>['properties'] = {
    id: { type: 'number' },
    subject_id: { type: 'number', ref: 'subjects' }, 
    name: { type: 'string', maxLength: 150 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    subject_name: { type: ['string', 'null'] },
};
export const subjectSchema: RxJsonSchema<types.AcademicsSubjectType> = createEntitySchema<types.AcademicsSubjectType>(
    'subject',
    {
        id: { type: 'number' },
        subject_code: { type: 'string', maxLength: 20, final: true },
        abbreviation: { type: 'string', maxLength: 10 },
        name: { type: 'string', maxLength: 100 },
        department_id: { type: ['number', 'null'], ref: 'departments' }, 
        is_compulsory: { type: 'boolean', default: false },
        grouping: { type: 'string', enum: Object.values(types.SubjectGrouping) },
        department_name: { type: ['string', 'null'] },
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
    exam_session_id: { type: 'string', ref: 'exam_sessions' },
    subject_paper_id: { type: 'number', ref: 'subject_papers' },
    marks_out_of: { type: 'number' },
    weight_percentage: { type: 'number' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    subject_paper_name: { type: ['string', 'null'] },
    subject_name: { type: ['string', 'null'] },
};

export const examPaperSettingSchema: RxJsonSchema<types.AcademicsExamPaperSettingType> = createEntitySchema<types.AcademicsExamPaperSettingType>(
    'exam_paper_setting', // Schema name, not collection name if it's only nested
    examPaperSettingProperties,
    { key: 'id', type: 'string'}, // Assuming 'id' is the primary key
    ['id', 'exam_session_id', 'subject_paper_id', 'marks_out_of', 'weight_percentage', 'created_at', 'updated_at'],
    ['exam_session_id', 'subject_paper_id']
);


export const examSessionSchema: RxJsonSchema<types.AcademicsExamSessionType> = createEntitySchema<types.AcademicsExamSessionType>(
    'exam_session',
    {
        id: { type: 'string', maxLength: 100, final: true },
        name: { type: 'string', maxLength: 150 },
        school_period_id: { type: 'number', ref: 'school_periods' }, 
        status: { type: 'string', enum: Object.values(types.ExamSessionStatus) },
        result_publication_date: { type: ['string', 'null'], format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        school_period_name: { type: ['string', 'null'] },
        paper_settings: { type: ['array', 'null'], default: [], items: { type: 'object', properties: examPaperSettingProperties } },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'school_period_id', 'status', 'created_at', 'updated_at'],
    ['school_period_id', 'status']
);

export const gradingSchemeLevelProperties: RxJsonSchema<types.AcademicsGradingSchemeLevelType>['properties'] = {
    id: { type: 'number' },
    scheme_id: { type: 'number' }, 
    grade: { type: 'string', maxLength: 10 },
    min_score: { type: 'number' },
    max_score: { type: ['number', 'null'] },
    points: { type: ['number', 'null'] },
    comment: { type: ['string', 'null'], maxLength: 200 },
};
export const gradingSchemeSchema: RxJsonSchema<types.AcademicsGradingSchemeType> = createEntitySchema<types.AcademicsGradingSchemeType>(
    'grading_scheme',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 100 },
        is_default: { type: 'boolean', default: false },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        levels: { type: 'array', items: { type: 'object', properties: gradingSchemeLevelProperties } },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'is_default', 'created_at', 'updated_at'],
    ['name', 'is_default']
);

export const studentPaperMarkProperties: RxJsonSchema<types.AcademicsStudentPaperMarkWithDetailsType>['properties'] = {
    id: { type: 'string', maxLength: 100, final: true }, 
    student_exam_result_id: { type: 'string', ref: 'student_exam_results' },
    paper_setting_id: { type: 'string'  }, 
    score: { type: ['number', 'null'] },
    subject_paper_name: { type: ['string', 'null'] },
    subject_name: { type: ['string', 'null'] },
    marks_out_of: { type: ['number', 'null'] },
};
export const studentExamResultSchema: RxJsonSchema<types.AcademicsStudentExamResultWithDetailsType> = createEntitySchema<types.AcademicsStudentExamResultWithDetailsType>(
    'student_exam_result',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students' }, 
        exam_session_id: { type: 'string', ref: 'exam_sessions' },
        total_marks: { type: ['number', 'null'] },
        mean_grade: { type: ['string', 'null'], maxLength: 10 },
        class_rank: { type: ['number', 'null'] },
        stream_rank: { type: ['number', 'null'] },
        overall_comment: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        marks: { type: ['array', 'null'], default: [], items: { type: 'object', properties: studentPaperMarkProperties } },
        student_name: { type: ['string', 'null'] },
        admission_no: { type: ['string', 'null'] },
        class_name: { type: ['string', 'null'] },
        stream_name: { type: ['string', 'null'] },
        exam_session_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'exam_session_id', 'created_at', 'updated_at'],
    ['student_id', 'exam_session_id']
);

export const classSubjectAllocationSchema: RxJsonSchema<types.AcademicsClassSubjectAllocationType> = createEntitySchema<types.AcademicsClassSubjectAllocationType>(
    'class_subject_allocation',
    {
        id: { type: 'string', maxLength: 100, final: true },
        class_stream_id: { type: 'number', ref: 'class_streams' }, 
        subject_id: { type: 'number', ref: 'subjects' },
        academic_year_id: { type: 'number', ref: 'academic_years' }, 
        class_stream_name: { type: ['string', 'null'] },
        subject_name: { type: ['string', 'null'] },
        academic_year_name: { type: ['string', 'null'] },
        is_enrolled: { type: 'boolean', default: true }, 
    },
    { key: 'id', type: 'string' },
    ['id', 'class_stream_id', 'subject_id', 'academic_year_id'],
    [['class_stream_id', 'subject_id', 'academic_year_id']] 
);

export const teacherSubjectAssignmentSchema: RxJsonSchema<types.AcademicsTeacherSubjectAssignmentType> = createEntitySchema<types.AcademicsTeacherSubjectAssignmentType>(
    'teacher_subject_assignment',
    {
        id: { type: 'string', maxLength: 100, final: true },
        allocation_id: { type: 'string', ref: 'class_subject_allocations' },
        teacher_id: { type: 'string', ref: 'staff' }, 
        class_stream_name: { type: ['string', 'null'] },
        subject_name: { type: ['string', 'null'] },
        academic_year_name: { type: ['string', 'null'] },
        teacher_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'allocation_id', 'teacher_id'],
    ['allocation_id', 'teacher_id']
);

export const studentSubjectEnrollmentSchema: RxJsonSchema<types.AcademicsStudentSubjectEnrollmentType> = createEntitySchema<types.AcademicsStudentSubjectEnrollmentType>(
    'student_subject_enrollment',
    {
        id: { type: 'string', maxLength: 100, final: true },
        student_id: { type: 'string', ref: 'students' }, 
        class_subject_allocation_id: { type: 'string', ref: 'class_subject_allocations' },
        enrollment_date: { type: 'string', format: 'date' },
        status: { type: 'string', enum: Object.values(types.StudentEnrollmentStatus) },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        student_name: { type: ['string', 'null'] },
        class_name: { type: ['string', 'null'] },
        stream_name: { type: ['string', 'null'] },
        subject_name: { type: ['string', 'null'] },
        academic_year_name: { type: ['string', 'null'] },
        enrollment_status_display: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'student_id', 'class_subject_allocation_id', 'status', 'created_at', 'updated_at'],
    ['student_id', 'class_subject_allocation_id']
);

export const timetablePeriodDefSchema: RxJsonSchema<types.AcademicsTimetablePeriodDefType> = createEntitySchema<types.AcademicsTimetablePeriodDefType>(
    'timetable_period_definition', 
    {
        id: { type: 'number' },
        period_name: { type: 'string', maxLength: 50 },
        start_time: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' }, 
        end_time: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },   
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
        class_stream_id: { type: 'number', ref: 'class_streams' }, 
        day_of_week: { type: 'string', enum: Object.values(types.DayOfWeek) },
        period_id: { type: 'number', ref: 'timetable_period_definitions' },
        subject_id: { type: 'number', ref: 'subjects' },
        teacher_id: { type: 'string', ref: 'staff' }, 
        class_stream_name: { type: ['string', 'null'] },
        period_name: { type: ['string', 'null'] },
        subject_name: { type: ['string', 'null'] },
        teacher_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string' },
    ['id', 'class_stream_id', 'day_of_week', 'period_id'],
    [['class_stream_id', 'day_of_week', 'period_id']] 
);
