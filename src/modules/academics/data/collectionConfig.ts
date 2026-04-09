// ABOUTME: Academics Module Collection Configuration
import type { ModuleCollectionsConfig } from '@/core/types/moduleCollections';

export const academicsModuleCollections: ModuleCollectionsConfig = {
  moduleName: 'academics',
  aliases: {
    // Core academic entities
    subjects: 'subjects',
    subject_papers: 'subjectPapers',
    
    // Exam & grading
    exam_sessions: 'examSessions',
    exam_paper_settings: 'examPaperSettings',
    grading_schemes: 'gradingSchemes',
    student_exam_results: 'studentExamResults',
    
    // Allocations
    class_subject_allocations: 'classSubjectAllocations',
    teacher_subject_assignments: 'teacherSubjectAssignments',
    student_subject_enrollments: 'studentSubjectEnrollments',
    
    // Timetable
    timetable_entries: 'timetableEntries',
  },
};

export default academicsModuleCollections;
