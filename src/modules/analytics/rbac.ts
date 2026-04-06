import { Permission } from '@/core/rbacService';

export const analyticsPermissions: Permission[] = [
  {
    id: 'analytics.dashboard.read',
    name: 'View Dashboard',
    description: 'View teacher analytics dashboard',
    resource: 'analytics.dashboard',
    action: 'read',
    moduleId: 'analytics',
    feature: 'teacher-dashboard',
  },
  {
    id: 'analytics.subject.read',
    name: 'View Subject Analytics',
    description: 'View subject-level analytics',
    resource: 'analytics.subject',
    action: 'read',
    moduleId: 'analytics',
    feature: 'subject-analytics',
  },
  {
    id: 'analytics.class.read',
    name: 'View Class Analytics',
    description: 'View class-level analytics',
    resource: 'analytics.class',
    action: 'read',
    moduleId: 'analytics',
    feature: 'class-analytics',
  },
  {
    id: 'analytics.export.execute',
    name: 'Export Reports',
    description: 'Export analytics reports',
    resource: 'analytics.export',
    action: 'execute',
    moduleId: 'analytics',
    feature: 'report-export',
  },
  {
    id: 'analytics.compare.read',
    name: 'Compare Performance',
    description: 'Compare performance across periods/classes',
    resource: 'analytics.compare',
    action: 'read',
    moduleId: 'analytics',
    feature: 'subject-analytics',
  },
  {
    id: 'analytics.trends.read',
    name: 'View Trends',
    description: 'View performance trends over time',
    resource: 'analytics.trends',
    action: 'read',
    moduleId: 'analytics',
    feature: 'teacher-dashboard',
  },
];

export const analyticsDefaultRoles = ['teacher', 'head_of_department', 'administrator'];
