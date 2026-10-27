// ABOUTME: Route-coverage test: every routes[].path declared by a module definition must render its page
// ABOUTME: Registers the real modules through moduleRegistration and asserts no declared route falls through to 404

import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { DynamicRoutes } from '../moduleRoutes';
import { getRedirectForRoute } from '../redirectMap';
import { initializeAllModules } from '@/core/moduleRegistration';
import { moduleRegistry } from '@/core/moduleRegistry';
import type { ModuleDefinition } from '@/core/types';
import { MODULE_DASHBOARD_ROOTS } from '@/services/tabs/moduleDashboardUrl';

// Navigation-driven routes are disabled so only module `routes` metadata can satisfy a path.
vi.mock('@/hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: vi.fn(() => ({ navigationItems: [] })),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: vi.fn(() => ({ accessibleModules: [] })),
}));

vi.mock('@/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../ModuleRouteLoader', () => ({
  ModuleRouteLoader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../routeConfig', () => ({
  LoginPage: () => <div>Login</div>,
  DashboardPage: () => <div>Dashboard</div>,
  ErrorTrackingTest: () => <div>Error Tracking</div>,
  ROUTE_PATHS: {
    ROOT: '/',
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    SETTINGS: '/settings',
    SETTINGS_UNIFIED: '/settings/unified',
    SETTINGS_FEATURES: '/settings/features',
    SETTINGS_DATA_LAYER: '/settings/data-layer',
    SETTINGS_AUDIT_LOG: '/settings/audit-log',
    TEST_ERROR_TRACKING: '/test/error-tracking',
  },
}));

// Keep the real glob keys (so a missing page file is still caught) but swap each page for a stub
// that reports which file it stands for, avoiding loading every real page and its providers.
vi.mock('../pageLoader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../pageLoader')>();
  const stubFor = (key: string) => () =>
    Promise.resolve({ default: () => <div data-testid="route-page">{key}</div> });
  const pageModules = Object.fromEntries(Object.keys(actual.pageModules).map(key => [key, stubFor(key)]));
  return { ...actual, pageModules, dashboardModules: {} };
});

const definitionModules = import.meta.glob<{ default?: ModuleDefinition }>(
  '../../modules/*/moduleDefinition.tsx',
  { eager: true }
);

interface RouteCase {
  moduleId: string;
  path: string;
  url: string;
  expectedPageKey: string;
  /** Pathname a deprecated route is intentionally redirected to (hub consolidation), if any */
  redirectPathname?: string;
}

let currentPathname = '';
const LocationProbe: React.FC = () => {
  currentPathname = useLocation().pathname;
  return null;
};

/** Replaces each `:param` segment with a sample value so the URL can be visited. */
const toUrl = (routePath: string): string => routePath.replace(/:([A-Za-z0-9_]+)/g, 'sample-$1');

const routeCases: RouteCase[] = Object.values(definitionModules).flatMap(mod => {
  const def = mod.default;
  if (!def?.id) return [];
  return (def.routes || []).map(route => {
    const moduleDir = route.path.split('/').filter(Boolean)[0];
    const deprecatedNav = (def.navigation || []).find(nav => nav.deprecated && nav.path === route.path);
    const redirectTo = deprecatedNav?.redirectTo || getRedirectForRoute(route.path);
    return {
      moduleId: def.id,
      path: route.path,
      url: toUrl(route.path),
      expectedPageKey: `../modules/${moduleDir}/pages/${route.page}.tsx`,
      redirectPathname: redirectTo?.split('?')[0],
    };
  });
});

describe('module routes coverage', () => {
  beforeAll(async () => {
    await initializeAllModules();
  });

  it('copies each module definition routes into the registered module metadata', () => {
    for (const mod of Object.values(definitionModules)) {
      const def = mod.default;
      if (!def?.id || !def.routes?.length) continue;
      const metadata = moduleRegistry.getMetadata(def.id) as unknown as { routes?: unknown } | undefined;
      expect(metadata?.routes, `routes of ${def.id}`).toEqual(def.routes);
    }
  });

  it('includes the routes reported unreachable in SO-12', () => {
    expect(routeCases.map(c => c.path)).toEqual(
      expect.arrayContaining([
        '/administration/students/:studentId',
        '/administration/students/add',
        '/administration/students/:studentId/financial',
        '/admissions/applications/:applicationId',
        '/admissions/review/:applicationId',
        '/admissions/track/:applicationId',
        '/admissions/form-builder',
        '/hr/payroll-periods',
        '/library/book-categories',
      ])
    );
  });

  it.each(routeCases.map(c => [`${c.moduleId} ${c.path}`, c] as const))(
    'resolves %s to its page, never the 404 element',
    async (_label, routeCase) => {
      expect(moduleRegistry.getEnabledModules()).toContain(routeCase.moduleId);

      render(
        <MemoryRouter initialEntries={[routeCase.url]}>
          <DynamicRoutes modulesInitialized userId="user-1" userRole="admin" />
          <LocationProbe />
        </MemoryRouter>
      );

      expect(screen.queryByText('Page not found')).toBeNull();
      const page = await screen.findByTestId('route-page');
      if (routeCase.redirectPathname) {
        // Deprecated standalone page: must land on its hub, which itself renders a page.
        expect(currentPathname).toBe(routeCase.redirectPathname);
      } else {
        expect(currentPathname).toBe(routeCase.url);
        expect(page.textContent).toBe(routeCase.expectedPageKey);
      }
      cleanup();
    }
  );
});

describe('module dashboards at the module root', () => {
  beforeAll(async () => {
    await initializeAllModules();
  });

  const definitionOf = (moduleId: string): ModuleDefinition => {
    const def = Object.values(definitionModules)
      .map(mod => mod.default)
      .find(candidate => candidate?.id === moduleId);
    if (!def) throw new Error(`no definition for ${moduleId}`);
    return def;
  };

  it.each(MODULE_DASHBOARD_ROOTS)('declares the %s dashboard at its module root and nowhere else', (moduleId) => {
    const def = definitionOf(moduleId);
    const declared = [...(def.navigation || []), ...(def.routes || [])].map(entry => entry.path);

    // The module's dashboard page is named by an entry at the module root...
    const dashboardEntry = (def.navigation || []).find(entry => entry.path === `/${moduleId}`);
    expect(dashboardEntry, `a navigation entry at /${moduleId}`).toBeDefined();
    expect(dashboardEntry?.page).toMatch(/DashboardPage$/);
    expect(dashboardEntry?.deprecated).toBeFalsy();

    // ...and nothing still declares the old address as a page of its own.
    expect(declared).not.toContain(`/${moduleId}/dashboard`);
  });

  it.each(MODULE_DASHBOARD_ROOTS)('sends the old /%s/dashboard address to the module root', (moduleId) => {
    render(
      <MemoryRouter initialEntries={[`/${moduleId}/dashboard`]}>
        <DynamicRoutes modulesInitialized userId="user-1" userRole="admin" />
        <LocationProbe />
      </MemoryRouter>
    );

    expect(currentPathname).toBe(`/${moduleId}`);
    cleanup();
  });

  it('lists the settings dashboard first among its live entries, as the module root', () => {
    const live = (definitionOf('settings').navigation || []).filter(entry => !entry.deprecated);

    expect(live[0]?.path).toBe('/settings');
    expect(live[0]?.page).toBe('SettingsDashboardPage');
  });

  it('keeps no entry that sends /settings or /settings/dashboard into a hub tab', () => {
    const hubRedirects = (definitionOf('settings').navigation || []).filter(
      entry => entry.deprecated && (entry.path === '/settings' || entry.path === '/settings/dashboard')
    );

    expect(hubRedirects).toEqual([]);
  });

  it('declares the settings dashboard as a route, so the module root renders it', () => {
    expect((definitionOf('settings').routes || []).map(route => route.path)).toContain('/settings');
  });
});
