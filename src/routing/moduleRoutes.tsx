// ABOUTME: Dynamic module route generation — reads moduleRegistry and creates React Router <Route> elements
// ABOUTME: Handles module dashboard routes, module custom routes, and nav-driven dynamic routes

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { moduleRegistry } from '../core/moduleRegistry';

import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { logger } from '../utils/logging';
import Spinner from '../components/ui/Spinner';
import ProtectedRoute from '../components/ProtectedRoute';
import { LoginPage, DashboardPage, ErrorTrackingTest, ROUTE_PATHS } from './routeConfig';

import { pageModules, dashboardModules, getPageComponent } from './pageLoader';
import { ModuleRouteLoader } from './ModuleRouteLoader';
import { DEPRECATED_ROUTE_REDIRECTS, getRedirectForRoute } from './redirectMap';
import { isModuleDashboardRoot } from '../services/tabs/moduleDashboardUrl';

/** Standard loading spinner fallback for full-page Suspense boundaries */
const PageSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <Spinner size="lg" />
      {label && <p className="mt-4 text-surface-muted-fg">{label}</p>}
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
 * DynamicRoutes — full route tree for the application.
 * Combines static routes, module dashboard routes, module custom routes,
 * and navigation-driven dynamic routes.
 */
export const DynamicRoutes: React.FC<DynamicRoutesProps> = ({
  modulesInitialized,
}) => {
  logger.debug('🔍 [DynamicRoutes] Component is rendering! modulesInitialized:', modulesInitialized);

  const { navigationItems } = useDynamicNavigation(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (modulesInitialized && navigationItems.length > 0) {
      logger.debug('✅ [DynamicRoutes] Navigation loaded:', navigationItems.length, 'items');
    }
  }, [modulesInitialized, navigationItems.length]);

  // Always start on dashboard — tab sync engine handles restoring other tabs
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

      {/* Portal: the "hub" page has been removed; the dashboard is an independent page at /portal,
          and the old /portal/dashboard address redirects there (see redirectMap). */}

      {/* Dynamic Deprecated Routes -> Redirect to Data Management */}
      {generateDeprecatedRouteRedirects()}

      {/* Dynamic Module Dashboard Routes */}
      {moduleRegistry.getEnabledModules().filter(Boolean).map(moduleId => {
        const metadata = moduleRegistry.getMetadata(moduleId);
        if (!metadata || moduleId === 'dashboard') return null;

        // A module's dashboard is its root page, named for the module; the old /module/dashboard address
        // redirects there (see redirectMap).
        const dashboardPath = isModuleDashboardRoot(moduleId) ? `/${moduleId}` : `/${moduleId}/dashboard`;
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

      {/* Dynamic Navigation Routes — registered for every enabled module.
          Access is enforced per route by ProtectedRoute; it must not decide which routes EXIST,
          because a filtered-out route renders 404 instead of the access-denied page. That is what
          made ten navigation paths unreachable while their module was simply not in the RBAC list. */}
      {navigationItems
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
              <h1 className="text-3xl font-bold text-surface-foreground">Page not found</h1>
              <p className="text-surface-muted-fg mt-2">The page you requested does not exist.</p>
              <button
                onClick={() => (window.location.hash = '#/dashboard')}
                className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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
