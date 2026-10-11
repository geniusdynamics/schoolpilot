// ABOUTME: Tests that signing in does not put AuthContext back into its start-up loading state.
// ABOUTME: AppContent swaps the login page for a spinner while isLoading is true, which wiped the "wrong password" error.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

vi.mock('@/services/auth/authService', () => ({
  authService: {
    isInitialized: () => true,
    isAuthenticated: vi.fn(async () => false),
    getCurrentUser: vi.fn(async () => null),
    getCurrentSession: vi.fn(() => null),
    isDemoDatabase: vi.fn(() => false),
    logout: vi.fn(async () => ({ success: true, message: 'ok' })),
    login: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ success: false, message: 'Invalid username or password' }), 20))),
    hasPermission: vi.fn(async () => false),
    hasModuleAccess: vi.fn(async () => false),
  },
}));

vi.mock('@/config/unifiedConfig', () => ({
  unifiedConfigManager: { getConfig: () => ({ dataMode: 'production', demo: { active: false } }) },
}));

let ctx: ReturnType<typeof useAuth> | null = null;
const seen: boolean[] = [];
const Probe = () => {
  ctx = useAuth();
  seen.push(ctx.isLoading);
  return <div data-testid="state">{ctx.isLoading ? 'loading' : 'ready'}</div>;
};

describe('AuthContext login', () => {
  it('keeps isLoading false while a login attempt runs, so the login page is not replaced', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    seen.length = 0;

    let pending!: ReturnType<NonNullable<typeof ctx>['login']>;
    act(() => {
      pending = ctx!.login({ username: 'admin', password: 'wrong-password' });
    });
    // While the attempt is in flight the login page must stay mounted (no start-up spinner).
    expect(screen.getByTestId('state')).toHaveTextContent('ready');

    let result: Awaited<typeof pending> | undefined;
    await act(async () => {
      result = await pending;
    });

    expect(result?.success).toBe(false);
    expect(seen).not.toContain(true);
    expect(screen.getByTestId('state')).toHaveTextContent('ready');
  });
});
