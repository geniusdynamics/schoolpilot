// ABOUTME: HR module definition
// ABOUTME: Self-contained module definition for human resources management

import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
} from '../../components/ui/icons';
import { hrPermissions, hrDefaultRoles } from './rbac';

export const hrModule: ModuleDefinition = {
  id: 'hr',
  name: 'navigation:hr.title',
  description: 'navigation:hr.description',
  icon: <UserGroupIcon />,
  path: '/hr',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:hr.dashboard', path: '/hr/dashboard', icon: <UserGroupIcon /> },
    { name: 'navigation:hr.payrollItemTypes', path: '/hr/payroll-item-types', icon: <DocumentTextIcon /> },
    { name: 'navigation:hr.payrollPeriods', path: '/hr/payroll-periods', icon: <CalendarDaysIcon /> },
    { name: 'navigation:hr.payslips', path: '/hr/payslips', icon: <ClipboardDocumentListIcon /> },
    { name: 'navigation:hr.staffSalarySettings', path: '/hr/staff-salary-settings', icon: <CurrencyDollarIcon /> },
  ],
  features: ['payroll-management', 'staff-compensation', 'hr-records'],
  dependencies: ['administration'],
  settings: {
    category: 'hr',
    items: [
      {
        key: 'enablePayrollManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableSalarySettings',
        type: 'boolean',
        defaultValue: true
      }
    ]
  },
  rbacPermissions: hrPermissions,
  defaultRoles: hrDefaultRoles,
};

export default hrModule; 