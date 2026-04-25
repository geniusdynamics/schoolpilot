// ABOUTME: Portal module definition
// ABOUTME: Self-contained module definition for student/parent portal

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
    {
      name: 'navigation:portal.dashboard',
      path: '/portal/dashboard',
      icon: HomeIcon,
      page: 'PortalDashboardPage',
    },
    {
      name: 'navigation:portal.attendance',
      path: '/portal/attendance',
      icon: CalendarDaysIcon,
      page: 'PortalAttendancePage',
    },
    {
      name: 'navigation:portal.results',
      path: '/portal/results',
      icon: ChartBarIcon,
      page: 'PortalResultsPage',
    },
    {
      name: 'navigation:portal.fees',
      path: '/portal/fees',
      icon: CurrencyDollarIcon,
      page: 'PortalFeesPage',
    },
    {
      name: 'navigation:portal.announcements',
      path: '/portal/announcements',
      icon: MegaphoneIcon,
      page: 'PortalAnnouncementsPage',
    },
    {
      name: 'navigation:portal.profile',
      path: '/portal/profile',
      icon: UserCircleIcon,
      page: 'PortalProfilePage',
    },
  ],
  routes: [
    { path: '/portal/dashboard', page: 'PortalDashboardPage' },
    { path: '/portal/attendance', page: 'PortalAttendancePage' },
    { path: '/portal/results', page: 'PortalResultsPage' },
    { path: '/portal/fees', page: 'PortalFeesPage' },
    { path: '/portal/announcements', page: 'PortalAnnouncementsPage' },
    { path: '/portal/profile', page: 'PortalProfilePage' },
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
