import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import ProtectedRoute from '../../components/ProtectedRoute';

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => Promise<boolean>;
  hasModuleAccess: (module: string) => Promise<boolean>;
};

let authState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  hasPermission: async () => false,
  hasModuleAccess: async () => false
};

vi.mock('/src/contexts/AuthContext', () => ({
  useAuth: () => authState
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState
}));

describe('ProtectedRoute stability', () => {
  beforeEach(() => {
    authState = {
      isAuthenticated: false,
      isLoading: false,
      hasPermission: async () => false,
      hasModuleAccess: async () => false
    };
  });

  it('redirects unauthenticated users to login route', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/database']}>
        <Routes>
          <Route
            path="/settings/database"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('renders protected content when permission checks pass', async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      hasPermission: async () => true,
      hasModuleAccess: async () => true
    };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredPermission="dashboard.view" requiredModule="dashboard">
                <div data-testid="protected-content">Protected</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});
