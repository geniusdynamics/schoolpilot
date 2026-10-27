// ABOUTME: Administration module definition
// ABOUTME: Self-contained module definition for student and staff management
// ABOUTME: Hub-and-spoke navigation: hub pages shown in both modes, standalone pages deprecated and fullwidth-only

import { ModuleDefinition } from '@/core/types';
import {
  AcademicCapIcon,
  UsersIcon, 
  UserGroupIcon, 
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
  DocumentTextIcon,
  CogIcon,
  ShieldCheckIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentCheckIcon,
  DocumentAddIcon,
  DocumentSearchIcon,
  UserCircleIcon,
  SparklesIcon,
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
    // Hub pages (visible in BOTH standard and fullwidth modes)
    { name: 'navigation:administration.dashboard', path: '/administration', icon: AcademicCapIcon, page: 'AdministrationDashboardPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.students', path: '/administration/students', icon: UsersIcon, page: 'StudentDirectoryPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.promotionRun', path: '/administration/promotion', icon: AcademicCapIcon, page: 'PromotionRunPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.staff', path: '/administration/staff', icon: UserGroupIcon, page: 'StaffDirectoryPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.configuration', path: '/administration/configuration', icon: CogIcon, page: 'SchoolConfigurationPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/organization' },
    // M5: Split SchoolConfigurationPage (6 tabs) into two hubs (≤5 tabs each)
    { name: 'navigation:administration.organization', path: '/administration/organization', icon: BuildingOffice2Icon, page: 'SchoolOrganizationPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.studentLife', path: '/administration/student-life', icon: UserGroupIcon, page: 'StudentLifePage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.academicCalendar', path: '/administration/academic-calendar', icon: CalendarDaysIcon, page: 'AcademicCalendarPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.certificates', path: '/administration/certificates', icon: DocumentTextIcon, page: 'CertificatesPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.communication', path: '/administration/communication', icon: EnvelopeIcon, page: 'CommunicationPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.security', path: '/administration/security', icon: ShieldCheckIcon, page: 'SecurityPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.attendance', path: '/administration/attendance', icon: CalendarDaysIcon, page: 'StudentAttendancePage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.staffOperations', path: '/administration/staff/operations', icon: UserGroupIcon, page: 'StaffOperationsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.bulkOperations', path: '/administration/students/bulk-ops', icon: ArrowUpTrayIcon, page: 'StudentBulkOperationsPage', showInModes: ['standard', 'fullwidth'] },

    // Deprecated standalone pages (fullwidth mode only, redirect to hub+tab)
    { name: 'navigation:administration.studentImport', path: '/administration/student-import', icon: ArrowUpTrayIcon, page: 'StudentDataImportPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/students/bulk-ops?tab=data-import' },
    { name: 'navigation:administration.studentClearance', path: '/administration/student-clearance', icon: ClipboardDocumentCheckIcon, page: 'StudentClearancePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/students?tab=clearance' },
    // Standalone pages (visible in both modes - no hub consolidation yet)
    // (Applications moved to the Admissions module — /admissions/applications-hub)
    { name: 'navigation:administration.entryMarks', path: '/administration/entry-marks', icon: DocumentSearchIcon, page: 'EntryMarksPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.disciplinaryCases', path: '/administration/disciplinary-cases', icon: ShieldCheckIcon, page: 'DisciplinaryCasesPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.visitors', path: '/administration/visitors', icon: ShieldCheckIcon, page: 'VisitorsManagementPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.alumni', path: '/administration/alumni', icon: SparklesIcon, page: 'AlumniManagementPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.transferredStudents', path: '/administration/transferred-students', icon: ArrowUpTrayIcon, page: 'TransferredStudentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/students?tab=transferred' },
    // Deprecated pages (fullwidth only, redirect to hub+tab)
    { name: 'navigation:administration.partners', path: '/administration/partners', icon: UserCircleIcon, page: 'PartnersPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/student-life?tab=partners' },
    { name: 'navigation:administration.departments', path: '/administration/departments', icon: BuildingOffice2Icon, page: 'DepartmentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/organization?tab=departments' },
    { name: 'navigation:administration.designations', path: '/administration/designations', icon: IdentificationIcon, page: 'DesignationsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/organization?tab=designations' },
    { name: 'navigation:administration.studentCategories', path: '/administration/student-categories', icon: ListBulletIcon, page: 'StudentCategoriesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/student-life?tab=categories' },
    { name: 'navigation:administration.dormitories', path: '/administration/dormitories', icon: BuildingLibraryIcon, page: 'DormitoriesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/student-life?tab=dormitories' },
    { name: 'navigation:administration.clubs', path: '/administration/clubs', icon: UserGroupIcon, page: 'ClubsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/organization?tab=clubs' },
    { name: 'navigation:administration.customers', path: '/administration/customers', icon: UsersIcon, page: 'CustomersPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/student-life?tab=partners' },
    { name: 'navigation:administration.classes', path: '/administration/classes', icon: UserGroupIcon, page: 'ClassesPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:administration.bulkStreamCreation', path: '/administration/classes/bulk-streams', icon: DocumentAddIcon, page: 'BulkStreamCreationPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/classes?tab=bulk-streams' },
    { name: 'navigation:administration.studentHealth', path: '/administration/student-health', icon: ClipboardDocumentListIcon, page: 'StudentHealthRecordsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/students?tab=health' },
    { name: 'navigation:administration.studentAttendance', path: '/administration/student-attendance', icon: CalendarDaysIcon, page: 'StudentAttendancePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/attendance?tab=student-view' },
    { name: 'navigation:administration.commTemplates', path: '/administration/communication-templates', icon: EnvelopeIcon, page: 'CommunicationTemplatesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/communication?tab=templates' },
    { name: 'navigation:administration.messageCampaigns', path: '/administration/message-campaigns', icon: MegaphoneIcon, page: 'MessageCampaignsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/communication?tab=campaigns' },
    { name: 'navigation:administration.academicStructures', path: '/administration/academic-structures', icon: PuzzlePieceIcon, page: 'AcademicStructurePage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/academic-calendar?tab=structure' },
    { name: 'navigation:administration.academicYears', path: '/administration/academic-years', icon: CalendarDaysIcon, page: 'AcademicYearsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/academic-calendar?tab=academic-years' },
    { name: 'navigation:administration.academicPeriodDefinitions', path: '/administration/academic-period-definitions', icon: DocumentDuplicateIcon, page: 'AcademicPeriodDefinitionsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/academic-calendar?tab=period-definitions' },
    { name: 'navigation:administration.schoolPeriods', path: '/administration/school-periods', icon: ClockIcon, page: 'SchoolPeriodsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/administration/academic-calendar?tab=school-periods' },
  ],
  features: ['student-management', 'staff-management', 'academic-structure', 'communication', 'attendance', 'admissions-management', 'alumni-management'],
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
    // Hub page routes
    { path: '/administration/configuration', page: 'SchoolConfigurationPage' },
    { path: '/administration/organization', page: 'SchoolOrganizationPage' },
    { path: '/administration/student-life', page: 'StudentLifePage' },
    { path: '/administration/academic-calendar', page: 'AcademicCalendarPage' },
    { path: '/administration/communication', page: 'CommunicationPage' },
    { path: '/administration/security', page: 'SecurityPage' },
    { path: '/administration/attendance', page: 'StudentAttendancePage' },
    { path: '/administration/staff/operations', page: 'StaffOperationsPage' },
    { path: '/administration/students/bulk-ops', page: 'StudentBulkOperationsPage' },
    { path: '/administration/students/promotion', page: 'StudentPromotionPage' },
    { path: '/administration/promotion', page: 'PromotionRunPage' },
    // Existing routes
    { path: '/administration/entry-marks', page: 'EntryMarksPage' },
    { path: '/administration/classes', page: 'ClassesPage' },
    { path: '/administration/students', page: 'StudentDirectoryPage' },
    { path: '/administration/staff', page: 'StaffDirectoryPage' },
    { path: '/administration/students/add', page: 'AddStudentPage' },
    { path: '/administration/students/:studentId', page: 'StudentDetailPage' },
    { path: '/administration/students/:studentId/financial', page: 'StudentFinancialDetailPage' },
    { path: '/administration/student-import', page: 'StudentDataImportPage' },
    { path: '/administration/student-clearance', page: 'StudentClearancePage' },
    { path: '/administration/disciplinary-cases', page: 'DisciplinaryCasesPage' },
    { path: '/administration/certificates', page: 'CertificatesPage' },
    { path: '/administration/visitors', page: 'VisitorsManagementPage' },
    { path: '/administration/student-health', page: 'StudentHealthRecordsPage' }
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
      }
    ]
  }
};

export default administrationModule;
