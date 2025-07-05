// ABOUTME: Administration module definition
// ABOUTME: Self-contained module definition for student and staff management

import React from 'react';
import { ModuleDefinition } from '@/core/types';
import {
  AcademicCapIcon,
  UsersIcon, 
  UserGroupIcon, 
  UserCircleIcon, 
  BuildingOffice2Icon, 
  IdentificationIcon, 
  ListBulletIcon,     
  BuildingLibraryIcon, 
  ClipboardDocumentListIcon, 
  CalendarDaysIcon,   
  EnvelopeIcon,       
  MegaphoneIcon,      
  PuzzlePieceIcon, 
  DocumentDuplicateIcon, 
  ClockIcon,
} from '@/components/ui/icons';

export const administrationModule: ModuleDefinition = {
  id: 'administration',
  name: 'navigation:administration.title',
  description: 'navigation:administration.description',
  icon: BuildingOffice2Icon,
  path: '/administration',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:administration.dashboard', path: '/administration/dashboard', icon: AcademicCapIcon, page: 'AdministrationDashboardPage' },
    { name: 'navigation:administration.students', path: '/administration/students', icon: UsersIcon, page: 'StudentsListPage' },
    { name: 'navigation:administration.staff', path: '/administration/staff', icon: UserGroupIcon, page: 'StaffListPage' },
    { name: 'navigation:administration.partners', path: '/administration/partners', icon: UserCircleIcon, page: 'PartnersPage' },
    { name: 'navigation:administration.departments', path: '/administration/departments', icon: BuildingOffice2Icon, page: 'DepartmentsPage' },
    { name: 'navigation:administration.designations', path: '/administration/designations', icon: IdentificationIcon, page: 'DesignationsPage' },
    { name: 'navigation:administration.studentCategories', path: '/administration/student-categories', icon: ListBulletIcon, page: 'StudentCategoriesPage' },
    { name: 'navigation:administration.dormitories', path: '/administration/dormitories', icon: BuildingLibraryIcon, page: 'DormitoriesPage' },
    { name: 'navigation:administration.clubs', path: '/administration/clubs', icon: UserGroupIcon, page: 'ClubsPage' },
    { name: 'navigation:administration.customers', path: '/administration/customers', icon: UsersIcon, page: 'CustomersPage' },
    { name: 'navigation:administration.studentHealth', path: '/administration/student-health', icon: ClipboardDocumentListIcon, page: 'StudentHealthRecordsPage' },
    { name: 'navigation:administration.studentAttendance', path: '/administration/student-attendance', icon: CalendarDaysIcon, page: 'StudentAttendancePage' },
    { name: 'navigation:administration.commTemplates', path: '/administration/communication-templates', icon: EnvelopeIcon, page: 'CommunicationTemplatesPage' },
    { name: 'navigation:administration.messageCampaigns', path: '/administration/message-campaigns', icon: MegaphoneIcon, page: 'MessageCampaignsPage' },
    { name: 'navigation:administration.academicStructures', path: '/administration/academic-structures', icon: PuzzlePieceIcon, page: 'AcademicStructurePage' },
    { name: 'navigation:administration.academicYears', path: '/administration/academic-years', icon: CalendarDaysIcon, page: 'AcademicYearsPage' },
    { name: 'navigation:administration.academicPeriodDefinitions', path: '/administration/academic-period-definitions', icon: DocumentDuplicateIcon, page: 'AcademicPeriodDefinitionsPage' },
    { name: 'navigation:administration.schoolPeriods', path: '/administration/school-periods', icon: ClockIcon, page: 'SchoolPeriodsPage' },
  ],
  features: ['student-management', 'staff-management', 'academic-structure', 'communication', 'attendance'],
  routes: [
    { path: '/administration/students/:studentId', page: 'StudentDetailPage' }
  ],
  settings: {
    category: 'administration',
    items: [
      {
        key: 'enableStudentRegistration',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableStaffManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'attendanceTracking',
        type: 'boolean',
        defaultValue: true
      }
    ]
  }
};

export default administrationModule; 