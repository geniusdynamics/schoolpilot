// ABOUTME: Academics module definition
// ABOUTME: Self-contained module definition for academic management

import React from 'react';
import { ModuleDefinition } from '@/core/types';
import {
  AcademicCapIcon,
  BookOpenIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UsersIcon,
  DocumentDuplicateIcon,
  PuzzlePieceIcon,
  ListBulletIcon,
  ClipboardDocumentCheckIcon,
  InboxIcon,
  PlusIcon,
} from '@/components/ui/icons';
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
    { name: 'navigation:academics.dashboard', path: '/academics/dashboard', icon: AcademicCapIcon, page: 'AcademicsDashboardPage' },
    { name: 'navigation:academics.subjects', path: '/academics/subjects', icon: BookOpenIcon, page: 'SubjectsPage' },
    { name: 'navigation:academics.timetablePeriods', path: '/academics/timetable-periods', icon: ClockIcon, page: 'TimetablePeriodsPage' },
    { name: 'navigation:academics.timetableEntries', path: '/academics/timetable-entries', icon: CalendarDaysIcon, page: 'TimetableEntriesPage' },
    { name: 'navigation:academics.examScheduling', path: '/academics/exam-scheduling', icon: CalendarDaysIcon, page: 'ExamSchedulingPage' },
    { name: 'navigation:academics.subjectPapers', path: '/academics/subject-papers', icon: DocumentTextIcon, page: 'SubjectPapersManagementPage' },
    { name: 'navigation:academics.classSubjectAllocations', path: '/academics/class-subject-allocations', icon: PuzzlePieceIcon, page: 'ClassSubjectAllocationsPage' },
    { name: 'navigation:academics.teacherSubjectAssignments', path: '/academics/teacher-subject-assignments', icon: UsersIcon, page: 'TeacherSubjectAssignmentPage' },
    { name: 'navigation:academics.studentSubjectEnrollment', path: '/academics/student-subject-enrollment', icon: UserGroupIcon, page: 'StudentSubjectEnrollmentPage' },
    { name: 'navigation:academics.examSessions', path: '/academics/exam-sessions', icon: CalendarDaysIcon, page: 'ExamSessionsPage' },
    { name: 'navigation:academics.examAnalysis', path: '/academics/exam-analysis', icon: ChartBarIcon, page: 'ExamAnalysisPage' },
    { name: 'navigation:academics.studentExamResultsEntry', path: '/academics/student-exam-results-entry', icon: ClipboardDocumentListIcon, page: 'StudentExamResultsEntryPage' },
    { name: 'navigation:academics.gradingSchemes', path: '/academics/grading-schemes', icon: ListBulletIcon, page: 'GradingSchemesPage' },
    { name: 'navigation:academics.educationSystems', path: '/academics/education-systems', icon: ChartBarIcon, page: 'EducationSystemsPage' },
    // Assignments sub-feature (merged from assignments module)
    { name: 'navigation:assignments.title', path: '/academics/assignments', icon: ClipboardDocumentListIcon, page: 'assignments/AssignmentsListPage', feature: 'assignment-management' },
    { name: 'navigation:assignments.create', path: '/academics/assignments/create', icon: PlusIcon, page: 'assignments/AssignmentsListPage', feature: 'assignment-management' },
    { name: 'navigation:assignments.grade', path: '/academics/assignments/grade', icon: ClipboardDocumentCheckIcon, page: 'assignments/AssignmentGradingPage', feature: 'assignment-management' },
    // Lesson Plans sub-feature (merged from lessonplans module)
    { name: 'navigation:lessonplans.title', path: '/academics/lessonplans', icon: CalendarDaysIcon, page: 'lessonplans/WeeklyPlansPage', feature: 'lesson-planning' },
    { name: 'navigation:lessonplans.create', path: '/academics/lessonplans/create', icon: PlusIcon, page: 'lessonplans/WeeklyPlansPage', feature: 'lesson-planning' },
    { name: 'navigation:lessonplans.notes', path: '/academics/lessonplans/notes', icon: DocumentTextIcon, page: 'lessonplans/LessonNotesPage', feature: 'lesson-planning' },
    { name: 'navigation:lessonplans.approval', path: '/academics/lessonplans/approval', icon: ClipboardDocumentCheckIcon, page: 'lessonplans/ApprovalPage', feature: 'lesson-planning' },
  ],
  features: ['subject-management', 'class-management', 'timetable', 'exam-management', 'grading', 'assignment-management', 'lesson-planning'],
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
  rbacPermissions: academicsPermissions,
  defaultRoles: academicsDefaultRoles,
};

export default academicsModule;