// ABOUTME: Portal module definition
// ABOUTME: Self-contained module definition for student/parent portal with independent per-page navigation

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
    // Independent pages — each is a standalone route, not a tab of a hub.
    // The dashboard is decoupled from the other pages so navigating to
    // /portal/<page> renders the actual page instead of redirecting to a
    // tabbed hub that defaults to the dashboard.
    {
      name: 'navigation:portal.dashboard',
      path: '/portal/dashboard',
      icon: HomeIcon,
      page: 'PortalDashboardPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:portal.attendance',
      path: '/portal/attendance',
      icon: CalendarDaysIcon,
      page: 'PortalAttendancePage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:portal.results',
      path: '/portal/results',
      icon: ChartBarIcon,
      page: 'PortalResultsPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:portal.fees',
      path: '/portal/fees',
      icon: CurrencyDollarIcon,
      page: 'PortalFeesPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:portal.announcements',
      path: '/portal/announcements',
      icon: MegaphoneIcon,
      page: 'PortalAnnouncementsPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:portal.profile',
      path: '/portal/profile',
      icon: UserCircleIcon,
      page: 'PortalProfilePage',
      showInModes: ['standard', 'fullwidth'],
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
