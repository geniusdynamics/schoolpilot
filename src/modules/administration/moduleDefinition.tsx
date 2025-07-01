// ABOUTME: Administration module definition
// ABOUTME: Self-contained module definition for student and staff management

import React from 'react';
import { ModuleDefinition } from '../../core/types';
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
} from '../../components/ui/icons';

export const administrationModule: ModuleDefinition = {
  id: 'administration',
  name: 'navigation:administration.title',
  description: 'navigation:administration.description',
  icon: <AcademicCapIcon />,
  path: '/administration',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:administration.dashboard', path: '/administration/dashboard', icon: <AcademicCapIcon /> },
    { name: 'navigation:administration.students', path: '/administration/students', icon: <UsersIcon /> },
    { name: 'navigation:administration.staff', path: '/administration/staff', icon: <UserGroupIcon /> },
    { name: 'navigation:administration.partners', path: '/administration/partners', icon: <UserCircleIcon /> },
    { name: 'navigation:administration.departments', path: '/administration/departments', icon: <BuildingOffice2Icon /> },
    { name: 'navigation:administration.designations', path: '/administration/designations', icon: <IdentificationIcon /> },
    { name: 'navigation:administration.studentCategories', path: '/administration/student-categories', icon: <ListBulletIcon /> },
    { name: 'navigation:administration.dormitories', path: '/administration/dormitories', icon: <BuildingLibraryIcon /> },
    { name: 'navigation:administration.clubs', path: '/administration/clubs', icon: <UserGroupIcon /> },
    { name: 'navigation:administration.customers', path: '/administration/customers', icon: <UsersIcon /> },
    { name: 'navigation:administration.studentHealth', path: '/administration/student-health', icon: <ClipboardDocumentListIcon /> },
    { name: 'navigation:administration.studentAttendance', path: '/administration/student-attendance', icon: <CalendarDaysIcon /> },
    { name: 'navigation:administration.commTemplates', path: '/administration/communication-templates', icon: <EnvelopeIcon /> },
    { name: 'navigation:administration.messageCampaigns', path: '/administration/message-campaigns', icon: <MegaphoneIcon /> },
    { name: 'navigation:administration.academicStructures', path: '/administration/academic-structures', icon: <PuzzlePieceIcon /> },
    { name: 'navigation:administration.academicYears', path: '/administration/academic-years', icon: <CalendarDaysIcon /> },
    { name: 'navigation:administration.academicPeriodDefinitions', path: '/administration/academic-period-definitions', icon: <DocumentDuplicateIcon /> },
    { name: 'navigation:administration.schoolPeriods', path: '/administration/school-periods', icon: <ClockIcon /> },
  ],
  features: ['student-management', 'staff-management', 'academic-structure', 'communication', 'attendance'],
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