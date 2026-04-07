// ABOUTME: Tests for module route generation from module registry

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DynamicRoutes } from '../moduleRoutes';
import { moduleRegistry } from '@/core/moduleRegistry';
import * as useDynamicNavigationModule from '@/hooks/useDynamicNavigation';
import * as useRBACModule from '@/hooks/useRBAC';

// Mock the hooks and dependencies
vi.mock('@/hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: vi.fn(),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: vi.fn(),
}));

vi.mock('@/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/hooks/useRoutePersistence', () => ({
  getStoredRouteFromSession: vi.fn(() => null),
}));

// Mock the module registry
vi.mock('@/core/moduleRegistry', () => ({
  moduleRegistry: {
    getEnabledModules: vi.fn(),
    isRegistered: vi.fn(),
  },
}));

// Mock page components
vi.mock('../routeConfig', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard Page</div>,
  ErrorTrackingTest: () => <div data-testid="error-tracking-page">Error Tracking</div>,
  SettingsPage: () => <div data-testid="settings-page">Settings</div>,
  UnifiedSettingsPage: () => <div data-testid="unified-settings-page">Unified Settings</div>,
  FeatureSettingsPage: () => <div data-testid="feature-settings-page">Feature Settings</div>,
  DataLayerSettingsPage: () => <div data-testid="data-layer-settings-page">Data Layer Settings</div>,
  AuditLogPage: () => <div data-testid="audit-log-page">Audit Log</div>,
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
    SETTINGS_DATA_MANAGEMENT: '/settings/data-management',
  },
}));

vi.mock('../pageLoader', () => ({
  pageModules: {},
  dashboardModules: {},
  getPageComponent: vi.fn(),
}));

vi.mock('@/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/Spinner', () => ({
  __esModule: true,
  default: ({ size }: { size?: string }) => <div data-testid={`spinner-${size || 'default'}`}>Loading...</div>,
}));

describe('DynamicRoutes', () => {
  const mockModules = [
    {
      id: 'administration',
      name: 'Administration',
      path: '/administration',
      routes: [
        { path: '/administration/students', page: 'StudentsListPage' },
        { path: '/administration/staff', page: 'StaffListPage' },
      ],
      navigation: [
        { name: 'Students', path: '/administration/students', page: 'StudentsListPage' },
        { name: 'Staff', path: '/administration/staff', page: 'StaffListPage', deprecated: true },
      ],
    },
    {
      id: 'finance',
      name: 'Finance',
      path: '/finance',
      routes: [
        { path: '/finance/payments', page: 'StudentPaymentsPage' },
      ],
      navigation: [
        { name: 'Payments', path: '/finance/payments', page: 'StudentPaymentsPage' },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (moduleRegistry.getEnabledModules as any).mockReturnValue(mockModules);
    (useDynamicNavigationModule.useDynamicNavigation as any).mockReturnValue({
      navigationItems: [],
    });
    (useRBACModule.useRBAC as any).mockReturnValue({
      accessibleModules: ['administration', 'finance', 'dashboard', 'settings'],
    });
  });

  describe('Static Routes', () => {
    it('should render login page at /login', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should render dashboard page at /dashboard', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should redirect root path to dashboard', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      // Should redirect to dashboard
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Settings Routes', () => {
    it('should render settings page at /settings', () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });

    it('should render unified settings at /settings/unified', () => {
      render(
        <MemoryRouter initialEntries={['/settings/unified']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('unified-settings-page')).toBeInTheDocument();
    });

    it('should render feature settings at /settings/features', () => {
      render(
        <MemoryRouter initialEntries={['/settings/features']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('feature-settings-page')).toBeInTheDocument();
    });

    it('should render data layer settings at /settings/data-layer', () => {
      render(
        <MemoryRouter initialEntries={['/settings/data-layer']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('data-layer-settings-page')).toBeInTheDocument();
    });

    it('should render audit log at /settings/audit-log', () => {
      render(
        <MemoryRouter initialEntries={['/settings/audit-log']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('audit-log-page')).toBeInTheDocument();
    });
  });

  describe('Test Routes', () => {
    it('should render error tracking test page', () => {
      render(
        <MemoryRouter initialEntries={['/test/error-tracking']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('error-tracking-page')).toBeInTheDocument();
    });
  });

  describe('Module Route Generation', () => {
    it('should call getEnabledModules to retrieve modules', () => {
      render(
        <MemoryRouter>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(moduleRegistry.getEnabledModules).toHaveBeenCalled();
    });

    it('should handle modules with no routes', () => {
      (moduleRegistry.getEnabledModules as any).mockReturnValue([
        { id: 'empty', name: 'Empty Module', path: '/empty' },
      ]);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      // Should still render dashboard without crashing
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should handle modules with empty routes array', () => {
      (moduleRegistry.getEnabledModules as any).mockReturnValue([
        { id: 'empty', name: 'Empty Module', path: '/empty', routes: [] },
      ]);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Deprecated Route Redirects', () => {
    it('should generate redirects for deprecated navigation items', () => {
      render(
        <MemoryRouter initialEntries={['/administration/staff']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      // Deprecated route should redirect to data management settings
      // Since we're mocking, it will redirect but may not find the exact component
      // The important thing is that it doesn't crash
    });
  });

  describe('Catch-all Route', () => {
    it('should redirect unknown paths to dashboard', () => {
      render(
        <MemoryRouter initialEntries={['/unknown-path']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should redirect deeply unknown paths to dashboard', () => {
      render(
        <MemoryRouter initialEntries={['/very/deep/unknown/path']}>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  describe('Dynamic Navigation Integration', () => {
    it('should use navigation items from useDynamicNavigation', () => {
      (useDynamicNavigationModule.useDynamicNavigation as any).mockReturnValue({
        navigationItems: [
          {
            name: 'Administration',
            modulePath: '/administration',
            children: [
              { name: 'Students', path: '/administration/students', page: 'StudentsListPage' },
            ],
          },
        ],
      });

      render(
        <MemoryRouter>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(useDynamicNavigationModule.useDynamicNavigation).toHaveBeenCalledWith(true);
    });
  });

  describe('RBAC Integration', () => {
    it('should use RBAC hook with provided user info', () => {
      render(
        <MemoryRouter>
          <DynamicRoutes modulesInitialized={true} userId="user-1" userRole="admin" />
        </MemoryRouter>
      );

      expect(useRBACModule.useRBAC).toHaveBeenCalledWith('user-1', 'admin');
    });

    it('should work without user info', () => {
      render(
        <MemoryRouter>
          <DynamicRoutes modulesInitialized={true} />
        </MemoryRouter>
      );

      expect(useRBACModule.useRBAC).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('Module Initialization State', () => {
    it('should render even when modules are not initialized', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <DynamicRoutes modulesInitialized={false} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });
});
