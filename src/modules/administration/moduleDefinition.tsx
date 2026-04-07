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
  DocumentAddIcon,
  DocumentSearchIcon,
  CheckBadgeIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentCheckIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  UserPlusIcon,
  StarIcon,
  PlusIcon,
  ChartBarIcon,
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
    { name: 'navigation:administration.applications', path: '/administration/applications', icon: DocumentAddIcon, page: 'ApplicationsPage' },
    { name: 'navigation:administration.preNAsMarks', path: '/administration/prenas-marks', icon: DocumentSearchIcon, page: 'PreNAsMarksPage' },
    { name: 'navigation:administration.students', path: '/administration/students', icon: UsersIcon, page: 'StudentsListPage' },
    { name: 'navigation:administration.studentImport', path: '/administration/student-import', icon: ArrowUpTrayIcon, page: 'StudentDataImportPage' },
    { name: 'navigation:administration.studentClearance', path: '/administration/student-clearance', icon: ClipboardDocumentCheckIcon, page: 'StudentClearancePage' },
    { name: 'navigation:administration.disciplinaryCases', path: '/administration/disciplinary-cases', icon: ShieldExclamationIcon, page: 'DisciplinaryCasesPage' },
    { name: 'navigation:administration.certificates', path: '/administration/certificates', icon: DocumentTextIcon, page: 'CertificatesManagementPage' },
    { name: 'navigation:administration.visitors', path: '/administration/visitors', icon: UserPlusIcon, page: 'VisitorsManagementPage' },
    { name: 'navigation:administration.staff', path: '/administration/staff', icon: UserGroupIcon, page: 'StaffListPage' },
    { name: 'navigation:administration.partners', path: '/administration/partners', icon: UserCircleIcon, page: 'PartnersPage' },
    { name: 'navigation:administration.departments', path: '/administration/departments', icon: BuildingOffice2Icon, page: 'DepartmentsPage' },
    { name: 'navigation:administration.designations', path: '/administration/designations', icon: IdentificationIcon, page: 'DesignationsPage' },
    { name: 'navigation:administration.studentCategories', path: '/administration/student-categories', icon: ListBulletIcon, page: 'StudentCategoriesPage' },
    { name: 'navigation:administration.dormitories', path: '/administration/dormitories', icon: BuildingLibraryIcon, page: 'DormitoriesPage' },
    { name: 'navigation:administration.clubs', path: '/administration/clubs', icon: UserGroupIcon, page: 'ClubsPage' },
    { name: 'navigation:administration.customers', path: '/administration/customers', icon: UsersIcon, page: 'CustomersPage' },
    { name: 'navigation:administration.classes', path: '/administration/classes', icon: UserGroupIcon, page: 'ClassesPage' },
    { name: 'navigation:administration.studentHealth', path: '/administration/student-health', icon: ClipboardDocumentListIcon, page: 'StudentHealthRecordsPage' },
    { name: 'navigation:administration.studentAttendance', path: '/administration/student-attendance', icon: CalendarDaysIcon, page: 'StudentAttendancePage' },
    { name: 'navigation:administration.commTemplates', path: '/administration/communication-templates', icon: EnvelopeIcon, page: 'CommunicationTemplatesPage' },
    { name: 'navigation:administration.messageCampaigns', path: '/administration/message-campaigns', icon: MegaphoneIcon, page: 'MessageCampaignsPage' },
    { name: 'navigation:administration.academicStructures', path: '/administration/academic-structures', icon: PuzzlePieceIcon, page: 'AcademicStructurePage' },
    { name: 'navigation:administration.academicYears', path: '/administration/academic-years', icon: CalendarDaysIcon, page: 'AcademicYearsPage' },
    { name: 'navigation:administration.academicPeriodDefinitions', path: '/administration/academic-period-definitions', icon: DocumentDuplicateIcon, page: 'AcademicPeriodDefinitionsPage' },
    { name: 'navigation:administration.schoolPeriods', path: '/administration/school-periods', icon: ClockIcon, page: 'SchoolPeriodsPage' },
    // Houses sub-feature (merged from houses module)
    { name: 'navigation:houses.title', path: '/administration/houses', icon: StarIcon, page: 'houses/HousesPage', feature: 'house-management' },
    { name: 'navigation:houses.categories', path: '/administration/houses/categories', icon: ListBulletIcon, page: 'houses/CategoriesPage', feature: 'house-management' },
    { name: 'navigation:houses.award', path: '/administration/houses/award', icon: PlusIcon, page: 'houses/AwardPointsPage', feature: 'house-management' },
    { name: 'navigation:houses.leaderboard', path: '/administration/houses/leaderboard', icon: ChartBarIcon, page: 'houses/LeaderboardPage', feature: 'house-management' },
    { name: 'navigation:houses.studentPoints', path: '/administration/houses/student-points', icon: UserGroupIcon, page: 'houses/StudentPointsPage', feature: 'house-management' },
    { name: 'navigation:houses.classStandings', path: '/administration/houses/class-standings', icon: UsersIcon, page: 'houses/ClassStandingsPage', feature: 'house-management' },
  ],
  features: ['student-management', 'staff-management', 'academic-structure', 'communication', 'attendance', 'admissions-management', 'house-management', 'point-transactions', 'merits', 'demerits', 'leaderboard'],
  dependencies: [],
  optionalDependencies: [
    {
      moduleId: 'finance',
      version: '^1.0.0',
      required: false
    },
    {
      moduleId: 'hr',
      version: '^1.0.0',
      required: false
    }
  ],
  routes: [
    { path: '/administration/applications', page: 'ApplicationsPage' },
    { path: '/administration/prenas-marks', page: 'PreNAsMarksPage' },
    { path: '/administration/students', page: 'StudentsListPage' },
    { path: '/administration/students/add', page: 'AddStudentPage' },
    { path: '/administration/students/:studentId', page: 'StudentDetailPage' },
    { path: '/administration/students/:studentId/financial', page: 'StudentFinancialDetailPage' },
    { path: '/administration/student-import', page: 'StudentDataImportPage' },
    { path: '/administration/student-clearance', page: 'StudentClearancePage' },
    { path: '/administration/disciplinary-cases', page: 'DisciplinaryCasesPage' },
    { path: '/administration/certificates', page: 'CertificatesManagementPage' },
    { path: '/administration/visitors', page: 'VisitorsManagementPage' }
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
      },
      {
        key: 'enableAdmissionsManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'admissionsRequireApproval',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableHouseSystem',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'requireApprovalForMerits',
        type: 'boolean',
        defaultValue: false
      },
      {
        key: 'requireApprovalForDemerits',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'maxDailyAwards',
        type: 'number',
        defaultValue: 5
      },
      {
        key: 'enablePickupManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableQrVerification',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableParentNotifications',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'pickupCodeExpiryMinutes',
        type: 'number',
        defaultValue: 30
      },
      {
        key: 'maxAuthorizedPickupPersons',
        type: 'number',
        defaultValue: 5
      }
    ]
  }
};

export default administrationModule;