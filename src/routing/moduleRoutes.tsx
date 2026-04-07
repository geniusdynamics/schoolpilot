// ABOUTME: Dynamic module route generation — reads moduleRegistry and creates React Router <Route> elements
// ABOUTME: Handles module dashboard routes, module custom routes, and nav-driven dynamic routes

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { moduleRegistry } from '../core/moduleRegistry';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { getStoredRouteFromSession } from '../hooks/useRoutePersistence';
import { logger } from '../utils/logging';
import Spinner from '../components/ui/Spinner';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  LoginPage,
  DashboardPage,
  ErrorTrackingTest,
  SettingsPage,
  UnifiedSettingsPage,
  FeatureSettingsPage,
  DataLayerSettingsPage,
  AuditLogPage,
  ROUTE_PATHS,
} from './routeConfig';
import { pageModules, dashboardModules, getPageComponent } from './pageLoader';

/** Standard loading spinner fallback for full-page Suspense boundaries */
const PageSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <Spinner size="lg" />
      {label && <p className="mt-4 text-gray-600">{label}</p>}
    </div>
  </div>
);

/** Generates deprecated route redirects for all deprecated nav items across enabled modules */
const generateDeprecatedRouteRedirects = (): React.ReactElement[] => {
  const deprecatedRoutes: React.ReactElement[] = [];
  const enabledModules = moduleRegistry.getEnabledModules();

  enabledModules.forEach(module => {
    if (module.navigation) {
      module.navigation.forEach(navItem => {
        if (navItem.deprecated && navItem.path) {
          deprecatedRoutes.push(
            <Route
              key={navItem.path}
              path={navItem.path}
              element={<Navigate to={ROUTE_PATHS.SETTINGS_DATA_MANAGEMENT} replace />}
            />
          );
        }
      });
    }
  });

  return deprecatedRoutes;
};

/** Props for the DynamicRoutes component */
interface DynamicRoutesProps {
  modulesInitialized: boolean;
  userId?: string;
  userRole?: string;
}

/**
 * DynamicRoutes — full route tree for the application.
 * Combines static routes, module dashboard routes, module custom routes,
 * and navigation-driven dynamic routes.
 */
export const DynamicRoutes: React.FC<DynamicRoutesProps> = ({
  modulesInitialized,
  userId,
  userRole,
}) => {
  logger.debug('🔍 [DynamicRoutes] Component is rendering! modulesInitialized:', modulesInitialized);

  const { navigationItems } = useDynamicNavigation(true);
  const { accessibleModules } = useRBAC(userId, userRole);
  const { t } = useTranslation();

  useEffect(() => {
    if (modulesInitialized && navigationItems.length > 0) {
      logger.debug('✅ [DynamicRoutes] Navigation loaded:', navigationItems.length, 'items');
    }
  }, [modulesInitialized, navigationItems.length]);

  const initialRoute = getStoredRouteFromSession();
  const startupRoute =
    initialRoute && initialRoute !== ROUTE_PATHS.ROOT && initialRoute !== ROUTE_PATHS.LOGIN
      ? initialRoute
      : ROUTE_PATHS.DASHBOARD;

  return (
    <Routes>
      <Route path={ROUTE_PATHS.ROOT} element={<Navigate to={startupRoute} replace />} />

      {/* Login Route - public, no auth check needed */}
      <Route
        path={ROUTE_PATHS.LOGIN}
        element={
          <Suspense fallback={<PageSpinner label="Loading..." />}>
            <LoginPage />
          </Suspense>
        }
      />

      {/* Direct Dashboard Route */}
      <Route
        path={ROUTE_PATHS.DASHBOARD}
        element={
          <ProtectedRoute requiredModule="dashboard" requiredPermission="dashboard.view">
            <Suspense fallback={<PageSpinner label="Loading dashboard..." />}>
              <DashboardPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Test Routes */}
      <Route
        path={ROUTE_PATHS.TEST_ERROR_TRACKING}
        element={
          <Suspense fallback={<div>Loading...</div>}>
            <ErrorTrackingTest />
          </Suspense>
        }
      />

      {/* Explicit Settings Routes — order matters to prevent routing bugs */}
      <Route
        path={ROUTE_PATHS.SETTINGS}
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTE_PATHS.SETTINGS_UNIFIED}
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <UnifiedSettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTE_PATHS.SETTINGS_FEATURES}
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <FeatureSettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTE_PATHS.SETTINGS_DATA_LAYER}
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <DataLayerSettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTE_PATHS.SETTINGS_AUDIT_LOG}
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <AuditLogPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Dynamic Deprecated Routes -> Redirect to Data Management */}
      {generateDeprecatedRouteRedirects()}

      {/* Dynamic Module Dashboard Routes */}
      {moduleRegistry.getEnabledModules().map(module => {
        const dashboardPath = `/${module.id}/dashboard`;
        const dashboardKey = `../modules/${module.id}/pages/${module.id.charAt(0).toUpperCase() + module.id.slice(1)}DashboardPage.tsx`;

        const dashboardExport = dashboardModules[dashboardKey];
        if (!dashboardExport) return null;

        const DashboardComponent = lazy(dashboardExport as () => Promise<{ default: React.ComponentType<any> }>);

        return (
          <Route
            key={module.path}
            path={dashboardPath}
            element={
              <ProtectedRoute requiredModule={module.id} requiredPermission={`${module.id}.view`}>
                <Suspense fallback={<PageSpinner label={`Loading ${t(module.name)} dashboard...`} />}>
                  <DashboardComponent />
                </Suspense>
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* Register custom/dynamic routes from all enabled modules */}
      {moduleRegistry.getEnabledModules().flatMap(module =>
        (module.routes || []).map(route => {
          const pathSegments = route.path.split('/').filter(Boolean);
          const moduleDir = pathSegments[0] || '';

          let PageComponent = null;
          if (moduleDir) {
            const modularKey = `../modules/${moduleDir}/pages/${route.page}.tsx`;
            const modularImportFn = pageModules[modularKey];
            if (modularImportFn) {
              PageComponent = lazy(modularImportFn as () => Promise<{ default: React.ComponentType<any> }>);
            }
          }
          if (!PageComponent) return null;

          const moduleName = moduleDir || module.id;
          const requiredPermission = moduleName ? `${moduleName}.view` : undefined;

          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                  <Suspense fallback={<PageSpinner label="Loading page..." />}>
                    <PageComponent />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          );
        })
      )}

      {/* Dynamic Navigation Routes */}
      {navigationItems
        .filter(item => !item.modulePath || accessibleModules.includes(item.modulePath.replace('/', '')))
        .flatMap(module => {
          logger.debug('🗺️ [DynamicRoutes] Processing module:', module.name, 'children:', module.children?.length);
          return (module.children || []).map(nav => {
            logger.debug('🗺️ [DynamicRoutes] Processing nav item:', {
              name: nav.name,
              path: nav.path,
              page: nav.page,
              deprecated: nav.deprecated,
            });

            const PageComponent = getPageComponent(nav);
            if (!PageComponent) {
              logger.warn('⚠️ [DynamicRoutes] No component found for:', nav.path, 'page:', nav.page);
              return null;
            }

            logger.debug('✅ [DynamicRoutes] Creating route for:', nav.path, 'with component:', nav.page);

            const modulePath = nav.modulePath?.replace('/', '') || '';
            const moduleName = modulePath || nav.path.split('/')[1] || '';
            const requiredPermission = moduleName ? `${moduleName}.view` : undefined;

            return (
              <Route
                key={nav.path}
                path={nav.path}
                element={
                  <ProtectedRoute requiredPermission={requiredPermission} requiredModule={moduleName}>
                    <Suspense fallback={<PageSpinner label={`Loading ${nav.page || 'page'}...`} />}>
                      <PageComponent />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            );
          });
        })}

      {/* Catch-all route - redirect to dashboard for unknown paths */}
      <Route path="*" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
    </Routes>
  );
};
