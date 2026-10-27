// ABOUTME: Static route definitions and lazy-loaded page components for the application
// ABOUTME: All explicit/named routes are declared here to avoid routing bugs (e.g. settings ordering)

import { lazy } from 'react';

// Core pages
export const LoginPage = lazy(() => import('../modules/core/pages/LoginPage'));
export const DashboardPage = lazy(() => import('../modules/dashboard/pages/DashboardPage'));

// Utility pages
export const ErrorTrackingTest = lazy(() => import('../components/ErrorTrackingTest'));
export const PerformanceMonitor = lazy(() => import('../components/PerformanceMonitor'));

// Settings pages — explicitly lazy-loaded to ensure correct routing order
// (prevents settings sub-routes from accidentally matching the audit log page)
export const DataLayerSettingsPage = lazy(() => import('../modules/settings/pages/DataLayerSettingsPage'));
export const AuditLogPage = lazy(() => import('../modules/settings/pages/AuditLogPage'));

/** All static route paths in the application */
export const ROUTE_PATHS = {
  ROOT: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  SETTINGS_UNIFIED: '/settings/unified',
  SETTINGS_FEATURES: '/settings/features',
  SETTINGS_DATA_LAYER: '/settings/data-layer',
  SETTINGS_AUDIT_LOG: '/settings/audit-log',
  TEST_ERROR_TRACKING: '/test/error-tracking',
  SETTINGS_DATA_MANAGEMENT: '/settings/data-management',
} as const;
