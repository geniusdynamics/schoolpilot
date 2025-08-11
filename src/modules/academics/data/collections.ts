// ABOUTME: Defines the RxDB collection configurations for the Academics module.
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections.

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
};

// Type helper for consumers of this module's collections (optional, but good practice)
export type AcademicsCollections = typeof academicsCollections;