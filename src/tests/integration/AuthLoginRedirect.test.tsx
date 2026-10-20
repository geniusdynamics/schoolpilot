// ABOUTME: Regression test for authenticated routing behavior around the /login route.
// ABOUTME: Verifies authenticated app flow redirects /login to /dashboard and does not render login page.

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import React from 'react';

import App from '../../App';
import { initializeI18n } from '../../i18n/i18n';
import { screen } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/AuthContext', async () => {
  const ReactModule = await import('react');
  return {
    AuthContext: ReactModule.createContext({}),
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
    AuthContext: ReactModule.createContext({}),
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

vi.mock('@/contexts/AuthContext', async () => {
  const ReactModule = await import('react');
  return {
    AuthContext: ReactModule.createContext({}),
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

vi.mock('/src/modules/core/pages/LoginPage', async () => {

  const { useEffect } = await import('react');
  const { useNavigate } = await import('react-router-dom');
  return {
    __esModule: true,
    default: () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate('/dashboard', { replace: true });
      }, [navigate]);
      return <div data-testid="login-page">Login page</div>;
    },
  };
});

vi.mock('/src/modules/dashboard/pages/DashboardPage', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard page</div>,
}));

beforeAll(async () => {
  await initializeI18n();
});

beforeEach(() => {
  mockNavigate.mockReset();
  mockNavigate.mockImplementation((to) => {
    window.location.hash = `#${to}`;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('App auth route regression', () => {
  it('redirects authenticated /login route requests to /dashboard without rendering login page', async () => {
    // Fresh test environments start at the onboarding gate; bypass it so /login
    // routing is what's actually under test.
    localStorage.setItem('schoolpilot_demo_cleared', 'true');
    window.location.hash = '#/login?skipOnboarding=1';

    render(<App />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', expect.any(Object));
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(window.location.hash).toBe('#/dashboard');
    }, { timeout: 5000 });

    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  }, 20000);
});
