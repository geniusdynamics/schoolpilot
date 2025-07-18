// ABOUTME: Academics module definition
// ABOUTME: Self-contained module definition for academic management

import React from 'react';
import { ModuleDefinition } from '../../core/types';
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
} from '../../components/ui/icons';
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
    { name: 'navigation:academics.subjectPapers', path: '/academics/subject-papers', icon: DocumentTextIcon, page: 'SubjectPapersManagementPage' },
    { name: 'navigation:academics.classSubjectAllocations', path: '/academics/class-subject-allocations', icon: PuzzlePieceIcon, page: 'ClassSubjectAllocationsPage' },
    { name: 'navigation:academics.teacherSubjectAssignments', path: '/academics/teacher-subject-assignments', icon: UsersIcon, page: 'TeacherSubjectAssignmentPage' },
    { name: 'navigation:academics.studentSubjectEnrollment', path: '/academics/student-subject-enrollment', icon: UserGroupIcon, page: 'StudentSubjectEnrollmentPage' },
    { name: 'navigation:academics.examSessions', path: '/academics/exam-sessions', icon: CalendarDaysIcon, page: 'ExamSessionsPage' },
    { name: 'navigation:academics.examAnalysis', path: '/academics/exam-analysis', icon: ChartBarIcon, page: 'ExamAnalysisPage' },
    { name: 'navigation:academics.studentExamResultsEntry', path: '/academics/student-exam-results-entry', icon: ClipboardDocumentListIcon, page: 'StudentExamResultsEntryPage' },
    { name: 'navigation:academics.gradingSchemes', path: '/academics/grading-schemes', icon: ListBulletIcon, page: 'GradingSchemesPage' },
  ],
  features: ['subject-management', 'class-management', 'timetable', 'exam-management', 'grading'],
  dependencies: ['administration'],
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