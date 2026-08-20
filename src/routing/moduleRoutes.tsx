// ABOUTME: Dynamic module route generation â€” reads moduleRegistry and creates React Router <Route> elements
// ABOUTME: Handles module dashboard routes, module custom routes, and nav-driven dynamic routes

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { moduleRegistry } from '../core/moduleRegistry';

import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { logger } from '../utils/logging';
import Spinner from '../components/ui/Spinner';
import ProtectedRoute from '../components/ProtectedRoute';
import { LoginPage, DashboardPage, ErrorTrackingTest, ROUTE_PATHS } from './routeConfig';

// Settings hub pages â€” explicitly imported to prevent routing order bugs
import ConfigurationPage from '../modules/settings/pages/ConfigurationPage';
import SystemManagementPage from '../modules/settings/pages/SystemManagementPage';
import SchoolOperationsPage from '../modules/settings/pages/SchoolOperationsPage';
import { pageModules, dashboardModules, getPageComponent } from './pageLoader';
import { ModuleRouteLoader } from './ModuleRouteLoader';
import { DEPRECATED_ROUTE_REDIRECTS, getRedirectForRoute } from './redirectMap';

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
  const enabledModuleIds = moduleRegistry.getEnabledModules();
  const coveredPaths = new Set<string>();

  enabledModuleIds.forEach(moduleId => {
    if (!moduleId) return;
    const metadata = moduleRegistry.getMetadata(moduleId);
    if (metadata?.navigation) {
      metadata.navigation.forEach((navItem: any) => {
        if (navItem?.deprecated && navItem?.path) {
          const redirectTo = navItem.redirectTo || getRedirectForRoute(navItem.path);
          if (redirectTo) {
            coveredPaths.add(navItem.path);
            deprecatedRoutes.push(
              <Route
                key={navItem.path}
                path={navItem.path}
                element={<Navigate to={redirectTo} replace />}
              />
            );
          }
        }
      });
    }
  });

  // Also register cross-module redirects from redirectMap
  Object.entries(DEPRECATED_ROUTE_REDIRECTS).forEach(([path, redirectTo]) => {
    if (!coveredPaths.has(path)) {
      deprecatedRoutes.push(
        <Route
          key={path}
          path={path}
          element={<Navigate to={redirectTo} replace />}
        />
      );
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
 * DynamicRoutes â€” full route tree for the application.
 * Combines static routes, module dashboard routes, module custom routes,
 * and navigation-driven dynamic routes.
 */
export const DynamicRoutes: React.FC<DynamicRoutesProps> = ({
  modulesInitialized,
  userId,
  userRole,
}) => {
  logger.debug('ðŸ” [DynamicRoutes] Component is rendering! modulesInitialized:', modulesInitialized);

  const { navigationItems } = useDynamicNavigation(true);
  const { accessibleModules } = useRBAC(userId, userRole);
  const { t } = useTranslation();

  useEffect(() => {
    if (modulesInitialized && navigationItems.length > 0) {
      logger.debug('âœ… [DynamicRoutes] Navigation loaded:', navigationItems.length, 'items');
    }
  }, [modulesInitialized, navigationItems.length]);

  // Always start on dashboard â€” tab sync engine handles restoring other tabs
  const startupRoute = ROUTE_PATHS.DASHBOARD;

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

      {/* Explicit Settings Hub Routes â€” order matters to prevent routing bugs */}
      <Route
        path="/settings/configuration"
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <ConfigurationPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system"
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <SystemManagementPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/school"
        element={
          <ProtectedRoute requiredModule="settings" requiredPermission="settings.view">
            <Suspense fallback={<PageSpinner />}>
              <SchoolOperationsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Legacy Settings Routes â€” redirect to hub pages */}
      <Route path={ROUTE_PATHS.SETTINGS} element={<Navigate to="/settings/configuration?tab=settings" replace />} />
      <Route path={ROUTE_PATHS.SETTINGS_UNIFIED} element={<Navigate to="/settings/configuration?tab=unified" replace />} />
      <Route path={ROUTE_PATHS.SETTINGS_FEATURES} element={<Navigate to="/settings/configuration?tab=features" replace />} />
      <Route path={ROUTE_PATHS.SETTINGS_DATA_LAYER} element={<Navigate to="/settings/system?tab=data-layer" replace />} />
      <Route path={ROUTE_PATHS.SETTINGS_AUDIT_LOG} element={<Navigate to="/settings/school?tab=audit" replace />} />

      {/* Portal: /portal â†’ /portal/dashboard â€” the portal's "hub" page has been
          removed; the dashboard is now an independent page at /portal/dashboard. */}
      <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />

      {/* Dynamic Deprecated Routes -> Redirect to Data Management */}
      {generateDeprecatedRouteRedirects()}

      {/* Dynamic Module Dashboard Routes */}
      {moduleRegistry.getEnabledModules().filter(Boolean).map(moduleId => {
        const metadata = moduleRegistry.getMetadata(moduleId);
        if (!metadata || moduleId === 'dashboard') return null;

        const dashboardPath = `/${moduleId}/dashboard`;
        const dashboardKey = `../modules/${moduleId}/pages/${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}DashboardPage.tsx`;

        const dashboardExport = dashboardModules[dashboardKey];
        if (!dashboardExport) return null;

        const DashboardComponent = lazy(dashboardExport as () => Promise<{ default: React.ComponentType<any> }>);

        return (
          <Route
            key={moduleId}
            path={dashboardPath}
            element={
              <ProtectedRoute requiredModule={moduleId} requiredPermission={`${moduleId}.view`}>
                <ModuleRouteLoader moduleId={moduleId}>
                  <Suspense fallback={<PageSpinner label={`Loading ${t(metadata.name)} dashboard...`} />}>
                    <DashboardComponent />
                  </Suspense>
                </ModuleRouteLoader>
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* Register custom/dynamic routes from all enabled modules */}
      {moduleRegistry.getEnabledModules().filter(Boolean).flatMap(moduleId => {
        const metadata = moduleRegistry.getMetadata(moduleId);
        if (!metadata || moduleId === 'dashboard') return [];

        // Get routes from module metadata (provided by module definition)
        const routes = (metadata as any).routes || [];

        return routes.map(route => {
          if (!route || !route.path || typeof route.path !== 'string') return null;
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

          const moduleName = moduleDir || moduleId;
          const requiredPermission = moduleName ? `${moduleName}.view` : undefined;

          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute requiredModule={moduleName} requiredPermission={requiredPermission}>
                  <ModuleRouteLoader moduleId={moduleName}>
                    <Suspense fallback={<PageSpinner label="Loading page..." />}>
                      <PageComponent />
                    </Suspense>
                  </ModuleRouteLoader>
                </ProtectedRoute>
              }
            />
          );
        });
      })}

      {/* Dynamic Navigation Routes */}
      {navigationItems
        .filter(item => item && (!item.modulePath || accessibleModules.includes(item.modulePath.replace('/', ''))))
        .flatMap(module => {
          return (module.children || []).filter(nav => nav && nav.path && !nav.deprecated).map(nav => {
            const PageComponent = getPageComponent(nav);
            if (!PageComponent) return null;

            const modulePath = nav.modulePath?.replace('/', '') || '';
            const moduleName = modulePath || (nav.path ? nav.path.split('/')[1] : '') || '';
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

      {/* Loading gate — don't mask missing routes before modules ready */}
      {!modulesInitialized && (
        <Route path="*" element={<PageSpinner label="Loading application..." />} />
      )}
      {/* Catch-all — only active after modules loaded; show 404 instead of silent redirect */}
      {modulesInitialized && (
        <Route
          path="*"
          element={
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
              <h1 className="text-3xl font-bold text-gray-700">Page not found</h1>
              <p className="text-gray-500 mt-2">The page you requested does not exist.</p>
              <button
                onClick={() => (window.location.hash = '#/dashboard')}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          }
        />
      )}
    </Routes>
  );
};
