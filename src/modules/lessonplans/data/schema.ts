// ABOUTME: Defines database-agnostic schemas for the Lesson Plans module

import {
  createDatabaseSchema,
  SchemaHelpers,
  type DatabaseSchema,
} from '../../../utils/databaseAgnosticSchema';
import { PlanStatus } from './types';

export const periodPlanProperties: Record<string, any> = {
  id: { type: 'string', maxLength: 100 },
  period_id: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999999 },
  period_name: { type: ['string', 'null'], maxLength: 50 },
  period_start_time: { type: ['string', 'null'], maxLength: 20 },
  period_end_time: { type: ['string', 'null'], maxLength: 20 },
  topic_detail: { type: 'string', maxLength: 1000 },
  teaching_method: { type: 'string', maxLength: 500 },
  duration: { type: 'number', multipleOf: 1, minimum: 1, maximum: 480 },
  resources: { type: 'string', maxLength: 500 },
};

export const dayPlanProperties: Record<string, any> = {
  id: { type: 'string', maxLength: 100 },
  day_of_week: { type: 'string', maxLength: 20 },
  date: { type: 'string', format: 'date', maxLength: 20 },
  topics: { type: 'string', maxLength: 1000 },
  objectives: { type: 'string', maxLength: 1000 },
  activities: { type: 'string', maxLength: 2000 },
  assessment: { type: 'string', maxLength: 1000 },
  homework: { type: 'string', maxLength: 1000 },
  period_plans: SchemaHelpers.array(
    SchemaHelpers.object(periodPlanProperties),
    { description: 'Period-level plans', default: [] },
  ),
};

export const weeklyPlanSchema: DatabaseSchema = createDatabaseSchema({
  title: 'weekly_plan',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    teacher_id: SchemaHelpers.ref('staff', { description: 'Reference to teacher', maxLength: 100 }),
    subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject' }),
    class_stream_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream' }),
    week_start_date: SchemaHelpers.timestamp({ description: 'Week start date' }),
    week_end_date: SchemaHelpers.timestamp({ description: 'Week end date' }),
    status: SchemaHelpers.string({ description: 'Plan status', enum: Object.values(PlanStatus), maxLength: 20 }),
    overall_objectives: SchemaHelpers.string({ description: 'Overall learning objectives', maxLength: 2000 }),
    teaching_aids: SchemaHelpers.string({ description: 'Teaching aids needed', maxLength: 1000 }),
    references: SchemaHelpers.string({ description: 'References and resources', maxLength: 1000 }),
    submitted_at: SchemaHelpers.timestamp({ description: 'Submission timestamp' }),
    reviewed_by: SchemaHelpers.ref('staff', { description: 'Reviewer ID', maxLength: 100 }),
    reviewed_at: SchemaHelpers.timestamp({ description: 'Review timestamp' }),
    review_comments: SchemaHelpers.string({ description: 'Review comments', maxLength: 2000 }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    teacher_name: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
    subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
    class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
    submitted_by_name: SchemaHelpers.string({ description: 'Submitted by name (computed)', maxLength: 200 }),
    reviewed_by_name: SchemaHelpers.string({ description: 'Reviewer name (computed)', maxLength: 200 }),
    day_plans: SchemaHelpers.array(
      SchemaHelpers.object(dayPlanProperties),
      { description: 'Day-level plans', default: [] },
    ),
  },
  required: ['id', 'teacher_id', 'subject_id', 'class_stream_id', 'week_start_date', 'week_end_date', 'status', 'overall_objectives', 'created_at', 'updated_at'],
  indexes: ['teacher_id', 'subject_id', 'class_stream_id', 'status', 'week_start_date'],
});

export const lessonNoteSchema: DatabaseSchema = createDatabaseSchema({
  title: 'lesson_note',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ description: 'Unique identifier', maxLength: 100 }),
    teacher_id: SchemaHelpers.ref('staff', { description: 'Reference to teacher', maxLength: 100 }),
    subject_id: SchemaHelpers.ref('subjects', { description: 'Reference to subject' }),
    class_stream_id: SchemaHelpers.ref('class_streams', { description: 'Reference to class stream' }),
    date: SchemaHelpers.timestamp({ description: 'Lesson date' }),
    period_id: SchemaHelpers.ref('timetable_period_definitions', { description: 'Reference to period definition' }),
    topic: SchemaHelpers.string({ description: 'Lesson topic', maxLength: 200 }),
    sub_topic: SchemaHelpers.string({ description: 'Sub-topic', maxLength: 200 }),
    objectives: SchemaHelpers.string({ description: 'Lesson objectives', maxLength: 1000 }),
    introduction: SchemaHelpers.string({ description: 'Introduction activities', maxLength: 1000 }),
    presentation: SchemaHelpers.string({ description: 'Presentation details', maxLength: 2000 }),
    development: SchemaHelpers.string({ description: 'Development activities', maxLength: 2000 }),
    assessment: SchemaHelpers.string({ description: 'Assessment methods', maxLength: 1000 }),
    conclusion: SchemaHelpers.string({ description: 'Conclusion/summary', maxLength: 1000 }),
    reflection: SchemaHelpers.string({ description: 'Teacher reflection', maxLength: 2000 }),
    challenges: SchemaHelpers.string({ description: 'Challenges encountered', maxLength: 1000 }),
    weekly_plan_id: SchemaHelpers.ref('weekly_plans', { description: 'Reference to weekly plan', maxLength: 100 }),
    created_at: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    updated_at: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    teacher_name: SchemaHelpers.string({ description: 'Teacher name (computed)', maxLength: 200 }),
    subject_name: SchemaHelpers.string({ description: 'Subject name (computed)', maxLength: 100 }),
    class_stream_name: SchemaHelpers.string({ description: 'Class stream name (computed)', maxLength: 150 }),
    period_name: SchemaHelpers.string({ description: 'Period name (computed)', maxLength: 50 }),
    students_present: SchemaHelpers.integer({ description: 'Number of students present', minimum: 0 }),
    students_absent: SchemaHelpers.integer({ description: 'Number of students absent', minimum: 0 }),
  },
  required: ['id', 'teacher_id', 'subject_id', 'class_stream_id', 'date', 'period_id', 'topic', 'objectives', 'introduction', 'presentation', 'development', 'assessment', 'conclusion', 'created_at', 'updated_at'],
  indexes: ['teacher_id', 'subject_id', 'class_stream_id', 'date', 'weekly_plan_id'],
});
