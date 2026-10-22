// ABOUTME: Academics module definition
// ABOUTME: Self-contained module definition for academic management with hub-and-spoke navigation

import { ModuleDefinition } from '@/core/types';
import { AcademicCapIcon, BookOpenIcon, UserGroupIcon, ClockIcon, DocumentTextIcon, ChartBarIcon, ClipboardDocumentListIcon, CalendarDaysIcon, CalendarIcon, UsersIcon, DocumentDuplicateIcon, PuzzlePieceIcon, ListBulletIcon, ClipboardDocumentCheckIcon, PlusIcon, MegaphoneIcon } from '@/components/ui/icons';
import { academicsPermissions, academicsDefaultRoles } from './rbac';

export const academicsModule: ModuleDefinition = {
  id: 'academics',
  name: 'navigation:academics.title',
  description: 'navigation:academics.description',
  icon: AcademicCapIcon,
  path: '/academics',
  isActive: true,
  version: '1.0.0',
  navigation: [
    // Dashboard (always visible)
    { name: 'navigation:academics.dashboard', path: '/academics/dashboard', icon: AcademicCapIcon, page: 'AcademicsDashboardPage', showInModes: ['standard', 'fullwidth'] },

    // Hub pages (standard mode)
    { name: 'navigation:academics.subjects', path: '/academics/subjects', icon: BookOpenIcon, page: 'SubjectsHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.allocations', path: '/academics/allocations', icon: PuzzlePieceIcon, page: 'CurriculumAllocationsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.examSetup', path: '/academics/exam-setup', icon: CalendarDaysIcon, page: 'ExamSetupPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.marksEntry', path: '/academics/marks-entry', icon: ClipboardDocumentListIcon, page: 'MarksEntryPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.observations', path: '/academics/observations', icon: ClipboardDocumentCheckIcon, page: 'ObservationsCapturePage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.results', path: '/academics/results', icon: ChartBarIcon, page: 'ResultsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.verification', path: '/academics/marks-verification', icon: ClipboardDocumentCheckIcon, page: 'MarksVerificationPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.analysis', path: '/academics/exam-analysis', icon: ChartBarIcon, page: 'ExamAnalysisPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.distribution', path: '/academics/results-distribution', icon: MegaphoneIcon, page: 'ResultsDistributionPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.reportCards', path: '/academics/report-cards', icon: DocumentTextIcon, page: 'ReportCardsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.reportPublishing', path: '/academics/report-publishing', icon: DocumentDuplicateIcon, page: 'ReportsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.grading', path: '/academics/grading-systems', icon: ListBulletIcon, page: 'GradingSystemsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.timetable', path: '/academics/timetable', icon: ClockIcon, page: 'TimetablePage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.assignments', path: '/academics/assignments', icon: ClipboardDocumentListIcon, page: 'AssignmentsHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.lessonPlans', path: '/academics/lesson-plans', icon: CalendarDaysIcon, page: 'LessonPlansHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:academics.eventsManager', path: '/academics/events-manager', icon: CalendarIcon, page: 'EventsManagerPage', showInModes: ['standard', 'fullwidth'] },

    // Deprecated standalone pages (fullwidth mode only)
    { name: 'navigation:academics.classSubjectAllocations', path: '/academics/class-subject-allocations', icon: PuzzlePieceIcon, page: 'ClassSubjectAllocationsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/allocations?tab=class-allocations' },
    { name: 'navigation:academics.teacherSubjectAssignments', path: '/academics/teacher-subject-assignments', icon: UsersIcon, page: 'TeacherSubjectAssignmentPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/allocations?tab=teacher-assignments' },
    { name: 'navigation:academics.studentSubjectEnrollment', path: '/academics/student-subject-enrollment', icon: UserGroupIcon, page: 'StudentSubjectEnrollmentPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/allocations?tab=student-enrollment' },
    { name: 'navigation:academics.examScheduling', path: '/academics/exam-scheduling', icon: CalendarDaysIcon, page: 'ExamSchedulingPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/exam-setup?tab=scheduling' },
    { name: 'navigation:academics.subjectPapers', path: '/academics/subject-papers', icon: DocumentTextIcon, page: 'SubjectPapersManagementPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/subjects?tab=papers' },
    { name: 'navigation:academics.examSessions', path: '/academics/exam-sessions', icon: CalendarDaysIcon, page: 'ExamSessionsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/exam-setup?tab=exam-sessions' },
    { name: 'navigation:academics.examTokens', path: '/academics/exam-tokens', icon: DocumentDuplicateIcon, page: 'ExamTokensPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/marks-entry?tab=entry-by-token' },
    { name: 'navigation:academics.studentExamResultsEntry', path: '/academics/student-exam-results-entry', icon: ClipboardDocumentListIcon, page: 'StudentExamResultsEntryPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/marks-entry?tab=student-results' },
    { name: 'navigation:academics.marksEntryByToken', path: '/academics/marks-entry-by-token', icon: DocumentDuplicateIcon, page: 'MarksEntryByTokenPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/marks-entry?tab=entry-by-token' },
    { name: 'navigation:academics.verifyMarksCrossCheck', path: '/academics/verify-marks-cross-check', icon: DocumentDuplicateIcon, page: 'VerifyMarksCrossCheckPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/marks-verification?tab=cross-check' },
    { name: 'navigation:academics.verifyMarksByStructure', path: '/academics/verify-marks-by-structure', icon: DocumentDuplicateIcon, page: 'VerifyMarksByStructurePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/marks-verification?tab=by-structure' },
    { name: 'navigation:academics.studentExamAnalysis', path: '/academics/student-exam-analysis', icon: UsersIcon, page: 'StudentExamAnalysisPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/exam-analysis?tab=student-analysis' },
    { name: 'navigation:academics.examGazette', path: '/academics/exam-gazette', icon: DocumentTextIcon, page: 'ExamGazettePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/results-distribution?tab=gazette' },
    { name: 'navigation:academics.distributeResults', path: '/academics/distribute-results', icon: MegaphoneIcon, page: 'DistributeResultsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/results-distribution?tab=distribute' },
    { name: 'navigation:academics.boardExamResults', path: '/academics/board-exam-results', icon: DocumentTextIcon, page: 'BoardExamResultsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/results-distribution?tab=board-results' },
    { name: 'navigation:academics.gradingSchemes', path: '/academics/grading-schemes', icon: ListBulletIcon, page: 'GradingSchemesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/grading-systems?tab=grading-schemes' },
    { name: 'navigation:academics.educationSystems', path: '/academics/education-systems', icon: ChartBarIcon, page: 'EducationSystemsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/grading-systems?tab=education-systems' },
    { name: 'navigation:academics.timetablePeriods', path: '/academics/timetable-periods', icon: ClockIcon, page: 'TimetablePeriodsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/timetable?tab=periods' },
    { name: 'navigation:academics.timetableEntries', path: '/academics/timetable-entries', icon: CalendarDaysIcon, page: 'TimetableEntriesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/timetable?tab=entries' },

    // Assignments sub-feature (deprecated - use hub)
    { name: 'navigation:assignments.create', path: '/academics/assignments/create', icon: PlusIcon, page: 'assignments/AssignmentsListPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/assignments?tab=list' },
    { name: 'navigation:assignments.grade', path: '/academics/assignments/grade', icon: ClipboardDocumentCheckIcon, page: 'assignments/AssignmentGradingPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/assignments?tab=grading' },
    // Lesson Plans sub-feature (deprecated - use hub)
    { name: 'navigation:lessonplans.title', path: '/academics/lessonplans', icon: CalendarDaysIcon, page: 'lessonplans/WeeklyPlansPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/lesson-plans?tab=plans' },
    { name: 'navigation:lessonplans.create', path: '/academics/lessonplans/create', icon: PlusIcon, page: 'lessonplans/WeeklyPlansPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/lesson-plans?tab=plans' },
    { name: 'navigation:lessonplans.notes', path: '/academics/lessonplans/notes', icon: DocumentTextIcon, page: 'lessonplans/LessonNotesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/lesson-plans?tab=notes' },
    { name: 'navigation:lessonplans.approval', path: '/academics/lessonplans/approval', icon: ClipboardDocumentCheckIcon, page: 'lessonplans/ApprovalPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/academics/lesson-plans?tab=approval' },
  ],
  features: ['subject-management', 'class-management', 'timetable', 'exam-management', 'grading', 'report-cards', 'assignment-management', 'lesson-planning'],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    }
  ],
  optionalDependencies: [
    {
      moduleId: 'finance',
      version: '^1.0.0',
      required: false
    }
  ],
  settings: {
    category: 'academics',
    items: [
      {
        key: 'enableExamManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableTimetableManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableGradingSchemes',
        type: 'boolean',
        defaultValue: true
      }
    ]
  },
  routes: [
    { path: '/academics/dashboard', page: 'AcademicsDashboardPage' },
    { path: '/academics/subjects', page: 'SubjectsHubPage' },
    { path: '/academics/allocations', page: 'CurriculumAllocationsPage' },
    { path: '/academics/exam-setup', page: 'ExamSetupPage' },
    { path: '/academics/marks-entry', page: 'MarksEntryPage' },
    { path: '/academics/observations', page: 'ObservationsCapturePage' },
    { path: '/academics/results', page: 'ResultsPage' },
    { path: '/academics/marks-verification', page: 'MarksVerificationPage' },
    { path: '/academics/exam-analysis', page: 'ExamAnalysisPage' },
    { path: '/academics/results-distribution', page: 'ResultsDistributionPage' },
    { path: '/academics/report-cards', page: 'ReportCardsPage' },
    { path: '/academics/report-publishing', page: 'ReportsPage' },
    { path: '/academics/grading-systems', page: 'GradingSystemsPage' },
    { path: '/academics/timetable', page: 'TimetablePage' },
    { path: '/academics/assignments', page: 'AssignmentsHubPage' },
    { path: '/academics/lesson-plans', page: 'LessonPlansHubPage' },
    { path: '/academics/events-manager', page: 'EventsManagerPage' },
  ],
  rbacPermissions: academicsPermissions,
  defaultRoles: academicsDefaultRoles,
};

export default academicsModule;
