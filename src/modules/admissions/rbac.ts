import { Permission } from '@/core/rbacService';

export const admissionsPermissions: Permission[] = [
  // Dashboard
  {
    id: 'admissions.dashboard.read',
    name: 'View Admissions Dashboard',
    description: 'View the admissions dashboard with statistics and overview',
    resource: 'admissions.dashboard',
    action: 'read',
    moduleId: 'admissions',
    feature: 'dashboard',
  },
  // Applications
  {
    id: 'admissions.applications.view',
    name: 'View Applications',
    description: 'View admission applications list and details',
    resource: 'admissions.applications',
    action: 'read',
    moduleId: 'admissions',
    feature: 'application-processing',
  },
  {
    id: 'admissions.applications.create',
    name: 'Create Applications',
    description: 'Submit new admission applications',
    resource: 'admissions.applications',
    action: 'create',
    moduleId: 'admissions',
    feature: 'application-processing',
  },
  {
    id: 'admissions.applications.update',
    name: 'Update Applications',
    description: 'Edit existing admission applications',
    resource: 'admissions.applications',
    action: 'update',
    moduleId: 'admissions',
    feature: 'application-processing',
  },
  {
    id: 'admissions.applications.delete',
    name: 'Delete Applications',
    description: 'Delete admission applications',
    resource: 'admissions.applications',
    action: 'delete',
    moduleId: 'admissions',
    feature: 'application-processing',
  },
  // Review & Approval
  {
    id: 'admissions.applications.review',
    name: 'Review Applications',
    description: 'Review and evaluate admission applications',
    resource: 'admissions.applications',
    action: 'execute',
    moduleId: 'admissions',
    feature: 'review-workflow',
  },
  {
    id: 'admissions.applications.approve',
    name: 'Approve Applications',
    description: 'Approve or reject admission applications',
    resource: 'admissions.applications',
    action: 'execute',
    moduleId: 'admissions',
    feature: 'review-workflow',
  },
  // Document Management
  {
    id: 'admissions.documents.view',
    name: 'View Documents',
    description: 'View uploaded application documents',
    resource: 'admissions.documents',
    action: 'read',
    moduleId: 'admissions',
    feature: 'document-management',
  },
  {
    id: 'admissions.documents.upload',
    name: 'Upload Documents',
    description: 'Upload application documents',
    resource: 'admissions.documents',
    action: 'create',
    moduleId: 'admissions',
    feature: 'document-management',
  },
  {
    id: 'admissions.documents.verify',
    name: 'Verify Documents',
    description: 'Verify submitted application documents',
    resource: 'admissions.documents',
    action: 'update',
    moduleId: 'admissions',
    feature: 'document-management',
  },
  // Enrollment
  {
    id: 'admissions.enrollment.execute',
    name: 'Process Enrollment',
    description: 'Process enrollment and create student records',
    resource: 'admissions.enrollment',
    action: 'execute',
    moduleId: 'admissions',
    feature: 'enrollment-automation',
  },
  // Settings
  {
    id: 'admissions.settings.manage',
    name: 'Manage Admissions Settings',
    description: 'Configure admissions module settings',
    resource: 'admissions.settings',
    action: 'update',
    moduleId: 'admissions',
    feature: 'admission-management',
  },
];

export const admissionsDefaultRoles = ['admin', 'admissions_officer', 'principal'];

export default {
  permissions: admissionsPermissions,
  defaultRoles: admissionsDefaultRoles,
};
