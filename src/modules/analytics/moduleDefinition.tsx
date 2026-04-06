// ABOUTME: Analytics module definition
// ABOUTME: Self-contained module definition for teacher and academic analytics
// ABOUTME: This module does NOT create new collections - it computes from existing ones

import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  ChartBarIcon,
  AcademicCapIcon,
  UserGroupIcon,
  DocumentReportIcon,
} from '../../components/ui/icons';
import { analyticsPermissions, analyticsDefaultRoles } from './rbac';

export const analyticsModule: ModuleDefinition = {
  id: 'analytics',
  name: 'navigation:analytics.title',
  description: 'navigation:analytics.description',
  icon: ChartBarIcon,
  path: '/analytics',
  isActive: true,
  version: '1.0.0',
  navigation: [
    {
      name: 'navigation:teacherDashboard',
      path: '/analytics/dashboard',
      icon: AcademicCapIcon,
      page: 'TeacherDashboardPage',
    },
    {
      name: 'navigation:subjectAnalytics',
      path: '/analytics/subjects',
      icon: ChartBarIcon,
      page: 'SubjectAnalyticsPage',
    },
    {
      name: 'navigation:classAnalytics',
      path: '/analytics/classes',
      icon: UserGroupIcon,
      page: 'ClassAnalyticsPage',
    },
    {
      name: 'navigation:exportReports',
      path: '/analytics/export',
      icon: DocumentReportIcon,
      page: 'ExportReportsPage',
    },
  ],
  features: [
    'teacher-dashboard',
    'subject-analytics',
    'class-analytics',
    'report-export',
  ],
  dependencies: [
    {
      moduleId: 'academics',
      version: '^1.0.0',
      required: true,
    },
    {
      moduleId: 'hr',
      version: '^1.0.0',
      required: true,
    },
  ],
  settings: {
    category: 'analytics',
    items: [
      {
        key: 'enableTeacherDashboard',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableSubjectAnalytics',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableClassAnalytics',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'defaultExportFormat',
        type: 'string',
        defaultValue: 'pdf',
      },
    ],
  },
  rbacPermissions: analyticsPermissions,
  defaultRoles: analyticsDefaultRoles,
};

export default analyticsModule;
