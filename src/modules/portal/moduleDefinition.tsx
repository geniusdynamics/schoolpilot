// ABOUTME: Portal module definition
// ABOUTME: Self-contained module definition for student/parent portal with hub-and-spoke navigation

import React from 'react';
import { ModuleDefinition } from '@/core/types';
import {
  HomeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  MegaphoneIcon,
  UserCircleIcon,
} from '@/components/ui/icons';
import { portalPermissions, portalDefaultRoles } from './rbac';

export const portalModule: ModuleDefinition = {
  id: 'portal',
  name: 'navigation:portal.title',
  description: 'navigation:portal.description',
  icon: HomeIcon,
  path: '/portal',
  isActive: true,
  version: '1.0.0',
  navigation: [
    // Hub page - shown in standard mode
    {
      name: 'navigation:dashboard',
      path: '/portal',
      icon: HomeIcon,
      page: 'PortalHubPage',
      showInModes: ['standard', 'fullwidth'],
    },
    // Legacy pages - shown in fullwidth mode with redirects to hub tabs
    {
      name: 'navigation:dashboard',
      path: '/portal/dashboard',
      icon: HomeIcon,
      page: 'PortalDashboardPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/portal?tab=dashboard',
    },
    {
      name: 'navigation:attendance',
      path: '/portal/attendance',
      icon: CalendarDaysIcon,
      page: 'PortalAttendancePage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/portal?tab=attendance',
    },
    {
      name: 'navigation:results',
      path: '/portal/results',
      icon: ChartBarIcon,
      page: 'PortalResultsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/portal?tab=results',
    },
    {
      name: 'navigation:fees',
      path: '/portal/fees',
      icon: CurrencyDollarIcon,
      page: 'PortalFeesPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/portal?tab=fees',
    },
    {
      name: 'navigation:announcements',
      path: '/portal/announcements',
      icon: MegaphoneIcon,
      page: 'PortalAnnouncementsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/portal?tab=announcements',
    },
    {
      name: 'navigation:profile',
      path: '/portal/profile',
      icon: UserCircleIcon,
      page: 'PortalProfilePage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/portal?tab=profile',
    },
  ],
  features: [
    'student-dashboard',
    'parent-dashboard',
    'view-attendance',
    'view-results',
    'view-fees',
    'view-announcements',
  ],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true,
    },
    {
      moduleId: 'academics',
      version: '^1.0.0',
      required: true,
    },
    {
      moduleId: 'finance',
      version: '^1.0.0',
      required: false,
    },
  ],
  settings: {
    category: 'portal',
    items: [
      {
        key: 'enableStudentDashboard',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableParentDashboard',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'showAttendanceWidget',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'showResultsWidget',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'showFeesWidget',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  rbacPermissions: portalPermissions,
  defaultRoles: portalDefaultRoles,
  requiresAuthentication: true,
};

export default portalModule;
