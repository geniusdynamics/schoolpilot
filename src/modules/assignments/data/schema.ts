// ABOUTME: Defines database-agnostic schemas for the Assignments module

import {
  createDatabaseSchema,
  SchemaHelpers,
  type DatabaseSchema,
} from '../../../utils/databaseAgnosticSchema';
import { AssignmentStatus, SubmissionStatus } from './types';

export const assignmentSchema: DatabaseSchema = createDatabaseSchema({
  title: 'assignment',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    title: SchemaHelpers.string({ description: 'Assignment title', maxLength: 200 }),
    description: SchemaHelpers.string({ description: 'Assignment description', maxLength: 1000 }),
    instructions: SchemaHelpers.string({ description: 'Detailed instructions', maxLength: 5000 }),
    subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject' }),
    class_stream_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream' }),
    teacher_id: SchemaHelpers.ref('staff', { description: 'Reference to teacher', maxLength: 100 }),
    assigned_date: SchemaHelpers.timestamp({ description: 'Date assigned' }),
    due_date: SchemaHelpers.timestamp({ description: 'Due date' }),
    status: SchemaHelpers.string({ description: 'Assignment status', enum: Object.values(AssignmentStatus), maxLength: 20 }),
    max_score: SchemaHelpers.number({ description: 'Maximum score', minimum: 0, maximum: 999999.99 }),
    weight_percentage: SchemaHelpers.number({ description: 'Weight percentage', minimum: 0, maximum: 100 }),
    allow_late_submission: SchemaHelpers.boolean({ description: 'Allow late submissions', default: false }),
    late_penalty_percentage: SchemaHelpers.number({ description: 'Late submission penalty percentage', minimum: 0, maximum: 100 }),
    rubric_id: SchemaHelpers.string({ description: 'Reference to rubric', maxLength: 100 }),
    attachment_urls: SchemaHelpers.array(SchemaHelpers.string({ maxLength: 500 }), { description: 'File attachment URLs', default: [] }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
    class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
    teacher_name: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
    submission_count: SchemaHelpers.integer({ description: 'Number of submissions', minimum: 0 }),
    graded_count: SchemaHelpers.integer({ description: 'Number of graded submissions', minimum: 0 }),
    average_score: SchemaHelpers.number({ description: 'Average score', minimum: 0, maximum: 999999.99 }),
  },
  required: ['id', 'title', 'subject_id', 'class_stream_id', 'teacher_id', 'assigned_date', 'due_date', 'status', 'created_at', 'updated_at'],
  indexes: ['subject_id', 'class_stream_id', 'teacher_id', 'status', 'due_date'],
});

export const assignmentSubmissionSchema: DatabaseSchema = createDatabaseSchema({
  title: 'assignment_submission',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    assignment_id: SchemaHelpers.ref('assignments', { description: 'Reference to assignment', maxLength: 100 }),
    student_id: SchemaHelpers.ref('students', { description: 'Reference to student', maxLength: 100 }),
    submission_date: SchemaHelpers.timestamp({ description: 'Date submitted' }),
    status: SchemaHelpers.string({ description: 'Submission status', enum: Object.values(SubmissionStatus), maxLength: 20 }),
    score: SchemaHelpers.number({ description: 'Score received', minimum: 0, maximum: 999999.99 }),
    max_score: SchemaHelpers.number({ description: 'Maximum score', minimum: 0, maximum: 999999.99 }),
    grade: SchemaHelpers.string({ description: 'Grade', maxLength: 10 }),
    feedback: SchemaHelpers.string({ description: 'Teacher feedback', maxLength: 2000 }),
    graded_by: SchemaHelpers.ref('staff', { description: 'Reference to grader', maxLength: 100 }),
    graded_at: SchemaHelpers.timestamp({ description: 'Grading timestamp' }),
    is_late: SchemaHelpers.boolean({ description: 'Whether submitted late', default: false }),
    student_name: SchemaHelpers.string({ description: 'Student name (computed)', maxLength: 200 }),
    assignment_title: SchemaHelpers.string({ description: 'Assignment title (computed)', maxLength: 200 }),
    assignment_due_date: SchemaHelpers.timestamp({ description: 'Assignment due date (computed)' }),
  },
  required: ['id', 'assignment_id', 'student_id', 'status', 'is_late'],
  indexes: ['assignment_id', 'student_id', 'status'],
});

export const assignmentAttachmentSchema: DatabaseSchema = createDatabaseSchema({
  title: 'assignment_attachment',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    submission_id: SchemaHelpers.ref('assignment_submissions', { description: 'Reference to submission', maxLength: 100 }),
    file_name: SchemaHelpers.string({ description: 'Original file name', maxLength: 255 }),
    file_url: SchemaHelpers.string({ description: 'File URL', maxLength: 500 }),
    file_size: SchemaHelpers.integer({ description: 'File size in bytes', minimum: 0 }),
    file_type: SchemaHelpers.string({ description: 'MIME type', maxLength: 100 }),
    uploaded_at: SchemaHelpers.timestamp({ description: 'Upload timestamp' }),
  },
  required: ['id', 'submission_id', 'file_name', 'file_url', 'file_size', 'file_type', 'uploaded_at'],
  indexes: ['submission_id'],
});

export const rubricCriterionSchema: DatabaseSchema = createDatabaseSchema({
  title: 'rubric_criterion',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    assignment_id: SchemaHelpers.ref('assignments', { description: 'Reference to assignment', maxLength: 100 }),
    name: SchemaHelpers.string({ description: 'Criterion name', maxLength: 100 }),
    description: SchemaHelpers.string({ description: 'Criterion description', maxLength: 500 }),
    max_points: SchemaHelpers.number({ description: 'Maximum points', minimum: 0, maximum: 999999.99 }),
    weight_percentage: SchemaHelpers.number({ description: 'Weight percentage', minimum: 0, maximum: 100 }),
    levels: SchemaHelpers.array(
      SchemaHelpers.object({
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string', maxLength: 50 },
        description: { type: 'string', maxLength: 500 },
        min_points: { type: 'number', minimum: 0, maximum: 999999.99 },
        max_points: { type: 'number', minimum: 0, maximum: 999999.99 },
      }),
      { description: 'Rubric levels', default: [] },
    ),
  },
  required: ['id', 'assignment_id', 'name', 'max_points'],
  indexes: ['assignment_id'],
});

export const rubricScoreSchema: DatabaseSchema = createDatabaseSchema({
  title: 'rubric_score',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    submission_id: SchemaHelpers.ref('assignment_submissions', { description: 'Reference to submission', maxLength: 100 }),
    criterion_id: SchemaHelpers.string({ description: 'Criterion ID', maxLength: 100 }),
    score: SchemaHelpers.number({ description: 'Score awarded', minimum: 0, maximum: 999999.99 }),
    max_score: SchemaHelpers.number({ description: 'Maximum score', minimum: 0, maximum: 999999.99 }),
    feedback: SchemaHelpers.string({ description: 'Feedback for this criterion', maxLength: 500 }),
    criterion_name: SchemaHelpers.string({ description: 'Criterion name (computed)', maxLength: 100 }),
  },
  required: ['id', 'submission_id', 'criterion_id', 'score', 'max_score'],
  indexes: ['submission_id', 'criterion_id'],
});
