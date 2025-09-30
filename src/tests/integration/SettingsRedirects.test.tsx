// ABOUTME: Integration tests verifying deprecated settings routes redirect correctly.
// ABOUTME: Ensures legacy /settings/* paths navigate to /settings/data-management using the app's routing.

import { vi, describe, it, beforeAll, beforeEach, afterEach, expect } from 'vitest';

// Mock AuthContext to always be authenticated to pass ProtectedRoute checks
vi.mock('../../contexts/AuthContext', async () => {
  const React = await import('react');
  return {
    AuthContext: React.createContext({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { id: 'test-user', role: 'Admin' },
    }),
    useAuth: () => ({ isAuthenticated: true, user: { id: 'test-user', role: 'Admin' }, isLoading: false }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  } as any;
});
// Also mock using Vite absolute id
vi.mock('/src/contexts/AuthContext', async () => {
  const React = await import('react');
  return {
    AuthContext: React.createContext({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { id: 'test-user', role: 'Admin' },
    }),
    useAuth: () => ({ isAuthenticated: true, user: { id: 'test-user', role: 'Admin' }, isLoading: false }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  } as any;
});

// Make module initialization a fast no-op
vi.mock('../../core/moduleLoader', () => ({
  initializeModules: vi.fn().mockResolvedValue(void 0),
}));
// Absolute id for moduleLoader
vi.mock('/src/core/moduleLoader', () => ({
  initializeModules: vi.fn().mockResolvedValue(void 0),
}));

// Provide a lightweight AppDataProvider to avoid heavy data layer work
vi.mock('../../contexts/AppDataContext', async () => {
  const React = await import('react');
  return {
    AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AppDataContext: React.createContext({}),
  } as any;
});
// Absolute id for AppDataContext (covers lazy import)
vi.mock('/src/contexts/AppDataContext', async () => {
  const React = await import('react');
  return {
    AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AppDataContext: React.createContext({}),
  } as any;
});

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import App from '../../App';
import { initializeI18n } from '../../i18n/i18n';

// Avoid noisy console errors in tests while keeping failures visible
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: any[]) => {
    // Suppress specific verbose debug logs originating from DynamicRoutes/App
    const msg = args?.[0];
    if (typeof msg === 'string' && (msg.includes('[App]') || msg.includes('[DynamicRoutes]'))) return;
    originalError(...args);
  };
});

afterEach(() => {
  console.error = originalError;
  cleanup();
});

beforeAll(async () => {
  await initializeI18n();
});

// Helper to set the initial hash before rendering the App
const setInitialHash = (path: string) => {
  // Ensure leading # for HashRouter
  const normalized = path.startsWith('#') ? path : `#${path}`;
  window.location.hash = normalized;
};

// All deprecated settings paths that should redirect to /settings/data-management
const deprecatedSettingsPaths = [
  '/settings/dashboard',
  '/settings/general',
];


describe('Deprecated settings route redirects', () => {
  beforeEach(() => {
    // Reset hash before each test
    window.location.hash = '#/';
  });

  deprecatedSettingsPaths.forEach((legacyPath) => {
    it(`redirects ${legacyPath} -> /settings/data-management`, async () => {
      setInitialHash(legacyPath);
      render(<App />);

      await waitFor(() => {
        expect(window.location.hash).toBe('#/settings/data-management');
      }, { timeout: 3000 });
    });
  });
});