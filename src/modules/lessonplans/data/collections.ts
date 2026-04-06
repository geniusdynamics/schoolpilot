// ABOUTME: Defines the database collection configurations for the Lesson Plans module
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections

import * as schemas from './schema';

export const lessonplansCollections = {
  weekly_plans: {
    schema: schemas.weeklyPlanSchema,
  },
  lesson_notes: {
    schema: schemas.lessonNoteSchema,
  },
};

export type LessonplansCollections = typeof lessonplansCollections;
