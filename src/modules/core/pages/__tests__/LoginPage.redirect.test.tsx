// ABOUTME: After a successful sign-in the login page sends the visitor on at once, and nothing it scheduled can send them
// ABOUTME: back later: the redirect used to wait a second, and that timer pulled a visitor who had already moved on to the dashboard.

import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import LoginPage from '@/modules/core/pages/LoginPage';

const loginMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: loginMock, isAuthenticated: false, isDemoMode: true }),
}));

// The login page lists demo accounts only when authService reports a demo database.
vi.mock('@/services/auth/authService', () => ({
  MIN_ADMIN_PASSWORD_LENGTH: 10,
  authService: {
    getLoginState: vi.fn(async () => ({ mode: 'demo', status: 'ready' })),
    createInitialAdministrator: vi.fn(),
  },
}));

let where = '';
let goTo: (path: string) => void = () => {};

/** Reports where the router is, and lets the test move the visitor on, as a click on a sidebar entry does. */
const Probe: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  where = `${location.pathname}`;
  useEffect(() => {
    goTo = (path) => navigate(path);
  }, [navigate]);
  return null;
};

const renderLogin = (from?: string) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: from ? { from: { pathname: from } } : undefined }]}>
      <Probe />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>the dashboard</p>} />
        <Route path="/settings" element={<p>the settings</p>} />
        <Route path="/academics/students" element={<p>the students</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('the login page after a successful sign-in', () => {
  beforeEach(() => {
    loginMock.mockResolvedValue({ success: true, message: 'ok' });
    where = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const signInAsTeacher = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /teacher/i }));
    // let the sign-in resolve; no clock is advanced
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it('sends the visitor on at once, without waiting on a timer', async () => {
    renderLogin();
    await screen.findByTestId('login-page');
    vi.useFakeTimers();

    await signInAsTeacher();

    expect(where).toBe('/dashboard');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sends the visitor to the page that sent them to sign in', async () => {
    renderLogin('/academics/students');
    await screen.findByTestId('login-page');
    vi.useFakeTimers();

    await signInAsTeacher();

    expect(where).toBe('/academics/students');
  });

  it('does not pull a visitor who has already moved on back to the dashboard', async () => {
    renderLogin();
    await screen.findByTestId('login-page');
    vi.useFakeTimers();

    await signInAsTeacher();
    act(() => goTo('/settings'));
    expect(where).toBe('/settings');

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(where).toBe('/settings');
  });
});
