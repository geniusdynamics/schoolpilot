import { Permission } from '@/core/rbacService';

export const financePermissions: Permission[] = [
  {
    id: 'finance.payments.read',
    name: 'View Payments',
    description: 'View payment information',
    resource: 'finance.payments',
    action: 'read',
    moduleId: 'finance',
    feature: 'payment-processing',
  },
  {
    id: 'finance.payments.create',
    name: 'Create Payments',
    description: 'Create new payments',
    resource: 'finance.payments',
    action: 'create',
    moduleId: 'finance',
    feature: 'payment-processing',
  },
  {
    id: 'finance.payments.update',
    name: 'Update Payments',
    description: 'Update payment information',
    resource: 'finance.payments',
    action: 'update',
    moduleId: 'finance',
    feature: 'payment-processing',
  },
  {
    id: 'finance.payments.delete',
    name: 'Delete Payments',
    description: 'Delete payments',
    resource: 'finance.payments',
    action: 'delete',
    moduleId: 'finance',
    feature: 'payment-processing',
  },
  {
    id: 'finance.reports.read',
    name: 'View Financial Reports',
    description: 'View financial reports',
    resource: 'finance.reports',
    action: 'read',
    moduleId: 'finance',
    feature: 'reporting',
  },
];

export const financeDefaultRoles = ['finance_officer', 'administrator']; 