// ABOUTME: Defines the RxDB collection configurations for the Academics module.
// ABOUTME: Module collection definitions - used by UnifiedDatabaseManager

import * as schemas from './schema';

export const academicsCollections = {
  subjects: {
    schema: schemas.subjectSchema,
  },
  subject_papers: {
    schema: schemas.subjectPaperSchema,
  },
  exam_sessions: {
    schema: schemas.examSessionSchema,
  },
  exam_schedules: {
    schema: schemas.examScheduleSchema,
  },
  result_approvals: {
    schema: schemas.resultApprovalSchema,
  },
  // exam_paper_settings are nested within exam_sessions and do not need a separate top-level collection.
  // If direct querying of all paper settings across all sessions is needed, a separate collection could be considered,
  // but it would require denormalization or careful data management. For now, access them via exam_sessions.
  grading_schemes: {
    schema: schemas.gradingSchemeSchema,
  },
  // Note: grading_scheme_levels are nested within grading_schemes.
  student_exam_results: {
    schema: schemas.studentExamResultSchema,
  },
  // Note: student_paper_marks are nested within student_exam_results.
  class_subject_allocations: {
    schema: schemas.classSubjectAllocationSchema,
  },
  teacher_subject_assignments: {
    schema: schemas.teacherSubjectAssignmentSchema,
  },
  student_subject_enrollments: {
    schema: schemas.studentSubjectEnrollmentSchema,
  },
  timetable_period_definitions: { 
    schema: schemas.timetablePeriodDefSchema,
  },
  timetable_entries: {
    schema: schemas.timetableEntrySchema,
  },
  exam_tokens: {
    schema: schemas.examTokenSchema,
  },
  board_exam_results: {
    schema: schemas.boardExamResultSchema,
  },
  result_distributions: {
    schema: schemas.resultDistributionSchema,
  },
  exam_gazettes: {
    schema: schemas.examGazetteSchema,
  },
  school_events: {
    schema: schemas.schoolEventSchema,
  },
  marks_entry_sessions: {
    schema: schemas.marksEntrySessionSchema,
  },
  structure_validation_records: {
    schema: schemas.structureValidationRecordSchema,
  },
  marks_cross_check_records: {
    schema: schemas.marksCrossCheckRecordSchema,
  },
  assignments: {
    schema: schemas.assignmentSchema,
  },
  assignment_submissions: {
    schema: schemas.assignmentSubmissionSchema,
  },
  weekly_plans: {
    schema: schemas.weeklyPlanSchema,
  },
  lesson_plans: {
    schema: schemas.lessonPlanSchema,
  },
  lesson_notes: {
    schema: schemas.lessonNoteSchema,
  },
};

// Type helper for consumers of this module's collections (optional, but good practice)
export type AcademicsCollections = typeof academicsCollections;