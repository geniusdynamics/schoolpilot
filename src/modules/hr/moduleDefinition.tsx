// ABOUTME: HR module definition
// ABOUTME: Self-contained module definition for human resources management with hub-and-spoke navigation

import React from 'react';
import { ModuleDefinition } from '@/core/types';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  UserIcon,
} from '@/components/ui/icons';
import { hrPermissions, hrDefaultRoles } from './rbac';

export const hrModule: ModuleDefinition = {
  id: 'hr',
  name: 'navigation:hr.title',
  description: 'navigation:hr.description',
  icon: UserGroupIcon,
  path: '/hr',
  isActive: true,
  version: '1.0.0',
  navigation: [
    // Dashboard (always visible)
    { name: 'navigation:hr.dashboard', path: '/hr/dashboard', icon: UserGroupIcon, page: 'HRDashboardPage' },

    // Hub pages (standard mode)
    { name: 'navigation:hr.payroll', path: '/hr/payroll', icon: CurrencyDollarIcon, page: 'PayrollHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:hr.staffBioData', path: '/hr/staff-bio-data', icon: UserIcon, page: 'StaffBioDataPage', showInModes: ['standard', 'fullwidth'] },

    // Deprecated standalone pages (fullwidth mode only)
    { name: 'navigation:hr.payrollItemTypes', path: '/hr/payroll-item-types', icon: DocumentTextIcon, page: 'PayrollItemTypesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/hr/payroll?tab=item-types' },
    { name: 'navigation:hr.payrollPeriods', path: '/hr/payroll-periods', icon: CalendarDaysIcon, page: 'PayrollPeriodsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/hr/payroll?tab=periods' },
    { name: 'navigation:hr.payslips', path: '/hr/payslips', icon: ClipboardDocumentListIcon, page: 'PayslipsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/hr/payroll?tab=payslips' },
    { name: 'navigation:hr.staffSalarySettings', path: '/hr/staff-salary-settings', icon: CurrencyDollarIcon, page: 'StaffSalarySettingsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/hr/payroll?tab=salary-settings' },
  ],
  features: ['payroll-management', 'staff-compensation', 'hr-records'],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    }
  ],
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
  routes: [
    { path: '/hr/dashboard', page: 'HRDashboardPage' },
    { path: '/hr/payroll', page: 'PayrollHubPage' },
    { path: '/hr/staff-bio-data', page: 'StaffBioDataPage' },
    { path: '/hr/payroll-item-types', page: 'PayrollItemTypesPage' },
    { path: '/hr/payroll-periods', page: 'PayrollPeriodsPage' },
    { path: '/hr/payslips', page: 'PayslipsPage' },
    { path: '/hr/staff-salary-settings', page: 'StaffSalarySettingsPage' },
  ],
  rbacPermissions: hrPermissions,
  defaultRoles: hrDefaultRoles,
};

export default hrModule;
