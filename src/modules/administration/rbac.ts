import { Permission } from '@/core/rbacService';

export const administrationPermissions: Permission[] = [
  // Dashboard
  {
    id: 'administration.dashboard.read',
    name: 'View Administration Dashboard',
    description: 'View the administration dashboard',
    resource: 'administration.dashboard',
    action: 'read',
    moduleId: 'administration',
    feature: 'dashboard',
  },
  // Students
  {
    id: 'administration.students.read',
    name: 'View Students',
    description: 'View student information',
    resource: 'administration.students',
    action: 'read',
    moduleId: 'administration',
    feature: 'student-management',
  },
  {
    id: 'administration.students.create',
    name: 'Create Students',
    description: 'Register new students',
    resource: 'administration.students',
    action: 'create',
    moduleId: 'administration',
    feature: 'student-management',
  },
  {
    id: 'administration.students.update',
    name: 'Update Students',
    description: 'Update student information',
    resource: 'administration.students',
    action: 'update',
    moduleId: 'administration',
    feature: 'student-management',
  },
  {
    id: 'administration.students.delete',
    name: 'Delete Students',
    description: 'Delete student records',
    resource: 'administration.students',
    action: 'delete',
    moduleId: 'administration',
    feature: 'student-management',
  },
  // Staff
  {
    id: 'administration.staff.read',
    name: 'View Staff',
    description: 'View staff information',
    resource: 'administration.staff',
    action: 'read',
    moduleId: 'administration',
    feature: 'staff-management',
  },
  {
    id: 'administration.staff.create',
    name: 'Create Staff',
    description: 'Register new staff',
    resource: 'administration.staff',
    action: 'create',
    moduleId: 'administration',
    feature: 'staff-management',
  },
  {
    id: 'administration.staff.update',
    name: 'Update Staff',
    description: 'Update staff information',
    resource: 'administration.staff',
    action: 'update',
    moduleId: 'administration',
    feature: 'staff-management',
  },
  {
    id: 'administration.staff.delete',
    name: 'Delete Staff',
    description: 'Delete staff records',
    resource: 'administration.staff',
    action: 'delete',
    moduleId: 'administration',
    feature: 'staff-management',
  },
  // Partners
  {
    id: 'administration.partners.read',
    name: 'View Partners',
    description: 'View partner information',
    resource: 'administration.partners',
    action: 'read',
    moduleId: 'administration',
    feature: 'partner-management',
  },
  // Departments
  {
    id: 'administration.departments.read',
    name: 'View Departments',
    description: 'View department information',
    resource: 'administration.departments',
    action: 'read',
    moduleId: 'administration',
    feature: 'department-management',
  },
  // Designations
  {
    id: 'administration.designations.read',
    name: 'View Designations',
    description: 'View designation information',
    resource: 'administration.designations',
    action: 'read',
    moduleId: 'administration',
    feature: 'designation-management',
  },
  // Student Categories
  {
    id: 'administration.studentCategories.read',
    name: 'View Student Categories',
    description: 'View student categories',
    resource: 'administration.studentCategories',
    action: 'read',
    moduleId: 'administration',
    feature: 'student-management',
  },
  // Dormitories
  {
    id: 'administration.dormitories.read',
    name: 'View Dormitories',
    description: 'View dormitory information',
    resource: 'administration.dormitories',
    action: 'read',
    moduleId: 'administration',
    feature: 'dormitory-management',
  },
  // Clubs
  {
    id: 'administration.clubs.read',
    name: 'View Clubs',
    description: 'View club information',
    resource: 'administration.clubs',
    action: 'read',
    moduleId: 'administration',
    feature: 'club-management',
  },
  // Customers
  {
    id: 'administration.customers.read',
    name: 'View Customers',
    description: 'View customer information',
    resource: 'administration.customers',
    action: 'read',
    moduleId: 'administration',
    feature: 'customer-management',
  },
  // Student Health
  {
    id: 'administration.studentHealth.read',
    name: 'View Student Health',
    description: 'View student health records',
    resource: 'administration.studentHealth',
    action: 'read',
    moduleId: 'administration',
    feature: 'student-health',
  },
  // Student Attendance
  {
    id: 'administration.studentAttendance.read',
    name: 'View Student Attendance',
    description: 'View student attendance records',
    resource: 'administration.studentAttendance',
    action: 'read',
    moduleId: 'administration',
    feature: 'attendance',
  },
  // Communication Templates
  {
    id: 'administration.commTemplates.read',
    name: 'View Communication Templates',
    description: 'View communication templates',
    resource: 'administration.commTemplates',
    action: 'read',
    moduleId: 'administration',
    feature: 'communication',
  },
  // Message Campaigns
  {
    id: 'administration.messageCampaigns.read',
    name: 'View Message Campaigns',
    description: 'View message campaigns',
    resource: 'administration.messageCampaigns',
    action: 'read',
    moduleId: 'administration',
    feature: 'communication',
  },
  // Academic Structures
  {
    id: 'administration.academicStructures.read',
    name: 'View Academic Structures',
    description: 'View academic structure information',
    resource: 'administration.academicStructures',
    action: 'read',
    moduleId: 'administration',
    feature: 'academic-structure',
  },
  // Academic Years
  {
    id: 'administration.academicYears.read',
    name: 'View Academic Years',
    description: 'View academic years',
    resource: 'administration.academicYears',
    action: 'read',
    moduleId: 'administration',
    feature: 'academic-structure',
  },
  // Academic Period Definitions
  {
    id: 'administration.academicPeriodDefinitions.read',
    name: 'View Academic Period Definitions',
    description: 'View academic period definitions',
    resource: 'administration.academicPeriodDefinitions',
    action: 'read',
    moduleId: 'administration',
    feature: 'academic-structure',
  },
  // School Periods
  {
    id: 'administration.schoolPeriods.read',
    name: 'View School Periods',
    description: 'View school periods',
    resource: 'administration.schoolPeriods',
    action: 'read',
    moduleId: 'administration',
    feature: 'academic-structure',
  },
];

export const administrationDefaultRoles = ['admin', 'administrator'];

export default {
  permissions: administrationPermissions,
  defaultRoles: administrationDefaultRoles,
}; 