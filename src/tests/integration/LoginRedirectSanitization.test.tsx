import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/modules/core/pages/LoginPage';

const loginMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    isAuthenticated: false,
    isDemoMode: true
  })
}));

describe('Login redirect sanitization', () => {
  beforeEach(() => {
    loginMock.mockResolvedValue({ success: true, message: 'ok' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders login page when from path is /login (sanitized to /dashboard)', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/login' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /teacher/i }));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('redirects to stored route after successful demo login', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/academics/students' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/academics/students" element={<div data-testid="students-page">Students</div>} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /teacher/i }));

    await waitFor(() => {
      expect(screen.getByTestId('students-page')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
