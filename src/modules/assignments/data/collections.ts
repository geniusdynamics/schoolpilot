// ABOUTME: Defines the database collection configurations for the Assignments module
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections

import * as schemas from './schema';

export const assignmentsCollections = {
  assignments: {
    schema: schemas.assignmentSchema,
  },
  assignment_submissions: {
    schema: schemas.assignmentSubmissionSchema,
  },
  assignment_attachments: {
    schema: schemas.assignmentAttachmentSchema,
  },
  rubric_criteria: {
    schema: schemas.rubricCriterionSchema,
  },
  rubric_scores: {
    schema: schemas.rubricScoreSchema,
  },
};

export type AssignmentsCollections = typeof assignmentsCollections;
