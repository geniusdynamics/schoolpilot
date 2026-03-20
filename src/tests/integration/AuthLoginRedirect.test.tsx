// ABOUTME: Regression test for authenticated routing behavior around the /login route.
// ABOUTME: Verifies authenticated app flow redirects /login to /dashboard and does not render login page.

import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import App from '../../App';
import { initializeI18n } from '../../i18n/i18n';

vi.mock('../../contexts/AuthContext', async () => {
  const ReactModule = await import('react');
  return {
    AuthContext: ReactModule.createContext({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockResolvedValue(true),
      hasModuleAccess: vi.fn().mockResolvedValue(true),
      user: { id: 'test-user', role: 'Admin' },
    }),
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockResolvedValue(true),
      hasModuleAccess: vi.fn().mockResolvedValue(true),
      user: { id: 'test-user', role: 'Admin' },
      isDemoMode: false,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  } as any;
});

vi.mock('/src/contexts/AuthContext', async () => {
  const ReactModule = await import('react');
  return {
    AuthContext: ReactModule.createContext({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockResolvedValue(true),
      hasModuleAccess: vi.fn().mockResolvedValue(true),
      user: { id: 'test-user', role: 'Admin' },
    }),
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockResolvedValue(true),
      hasModuleAccess: vi.fn().mockResolvedValue(true),
      user: { id: 'test-user', role: 'Admin' },
      isDemoMode: false,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  } as any;
});

vi.mock('../../core/moduleLoader', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('../../core/moduleLoader')>();
  return {
    ...originalModule,
    initializeModules: vi.fn().mockResolvedValue(void 0),
  };
});

vi.mock('/src/core/moduleLoader', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('/src/core/moduleLoader')>();
  return {
    ...originalModule,
    initializeModules: vi.fn().mockResolvedValue(void 0),
  };
});

vi.mock('../../contexts/AppDataContext', async () => {
  const ReactModule = await import('react');
  return {
    AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AppDataContext: ReactModule.createContext({}),
  } as any;
});

vi.mock('/src/contexts/AppDataContext', async () => {
  const ReactModule = await import('react');
  return {
    AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AppDataContext: ReactModule.createContext({}),
  } as any;
});

vi.mock('/src/modules/core/pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login page</div>,
}));

vi.mock('/src/modules/dashboard/pages/DashboardPage', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard page</div>,
}));

const setInitialHash = (path: string) => {
  const normalizedPath = path.startsWith('#') ? path : `#${path}`;
  window.location.hash = normalizedPath;
};

beforeAll(async () => {
  await initializeI18n();
});

beforeEach(() => {
  window.location.hash = '#/';
});

describe('App auth route regression', () => {
  it('redirects authenticated /login route requests to /dashboard without rendering login page', async () => {
    setInitialHash('/login');

    render(<App />);

    await waitFor(() => {
      expect(window.location.hash).toBe('#/dashboard');
    }, { timeout: 15000 });

    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  }, 20000);
});
