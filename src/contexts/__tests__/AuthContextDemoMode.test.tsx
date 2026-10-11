// ABOUTME: Tests that AuthContext.isDemoMode comes from authService, never from a default or config defaults.
// ABOUTME: A live database must report isDemoMode false on start-up and after logout.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const svc = vi.hoisted(() => ({ demo: false }));

vi.mock('@/services/auth/authService', () => ({
  authService: {
    isInitialized: () => true,
    isAuthenticated: vi.fn(async () => false),
    getCurrentUser: vi.fn(async () => null),
    getCurrentSession: vi.fn(() => null),
    isDemoDatabase: vi.fn(() => svc.demo),
    logout: vi.fn(async () => ({ success: true, message: 'ok' })),
    login: vi.fn(),
    hasPermission: vi.fn(async () => false),
    hasModuleAccess: vi.fn(async () => false),
  },
}));

// Default (not-yet-loaded) config says demo.active=true; the context must not trust it.
vi.mock('@/config/unifiedConfig', () => ({
  unifiedConfigManager: { getConfig: () => ({ dataMode: 'production', demo: { active: true } }) },
}));

let ctx: ReturnType<typeof useAuth> | null = null;
const Probe = () => {
  ctx = useAuth();
  return <div data-testid="state">{ctx.isLoading ? 'loading' : `demo=${ctx.isDemoMode}`}</div>;
};

describe('AuthContext demo mode', () => {
  beforeEach(() => { ctx = null; svc.demo = false; });

  it('is false for a live database, even when config defaults say demo', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('demo=false'));
  });

  it('stays false after logout in a live database', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('demo=false'));
    await act(async () => { await ctx!.logout(); });
    expect(screen.getByTestId('state')).toHaveTextContent('demo=false');
  });

  it('is true when authService reports a demo database', async () => {
    svc.demo = true;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('demo=true'));
  });
});
