// ABOUTME: Tests that the login page hides demo accounts in live mode and offers "Create administrator" on a fresh install.
// ABOUTME: authService and AuthContext are mocked; the page reads the live login state from authService.getLoginState().

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/modules/core/pages/LoginPage';

const auth = vi.hoisted(() => ({
  isDemoMode: false,
  login: vi.fn(),
  getLoginState: vi.fn(),
  createInitialAdministrator: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: auth.login, isAuthenticated: false, isDemoMode: auth.isDemoMode }),
}));

vi.mock('@/services/auth/authService', () => ({
  MIN_ADMIN_PASSWORD_LENGTH: 10,
  authService: {
    getLoginState: auth.getLoginState,
    createInitialAdministrator: auth.createInitialAdministrator,
  },
}));

const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

describe('LoginPage fails closed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isDemoMode = false;
    auth.getLoginState.mockResolvedValue({ mode: 'live', status: 'ready' });
  });

  it('never lists demo accounts in live mode', async () => {
    renderPage();

    await waitFor(() => expect(auth.getLoginState).toHaveBeenCalled());
    expect(screen.queryByText(/Demo Mode/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /teacher/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/admin123/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In$/ })).toBeInTheDocument();
  });

  it('offers "Create administrator" (and no demo hint) on a fresh install', async () => {
    auth.getLoginState.mockResolvedValue({ mode: 'live', status: 'needs-administrator' });
    renderPage();

    expect(await screen.findByRole('heading', { name: /Create administrator/i })).toBeInTheDocument();
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();
  });

  it('requires matching passwords of at least 10 characters before creating the administrator', async () => {
    auth.getLoginState.mockResolvedValue({ mode: 'live', status: 'needs-administrator' });
    auth.createInitialAdministrator.mockResolvedValue({ success: true, message: 'ok' });
    renderPage();
    await screen.findByRole('heading', { name: /Create administrator/i });

    fireEvent.change(screen.getByLabelText(/^Username$/i), { target: { value: 'principal' } });
    fireEvent.change(screen.getByLabelText(/Display name/i), { target: { value: 'The Principal' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Create administrator/i }));
    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'a-long-secret' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'a-long-secreT' } });
    fireEvent.click(screen.getByRole('button', { name: /Create administrator/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(auth.createInitialAdministrator).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'a-long-secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Create administrator/i }));

    await waitFor(() => expect(auth.createInitialAdministrator).toHaveBeenCalledWith({
      username: 'principal', displayName: 'The Principal', password: 'a-long-secret',
    }));
    expect(await screen.findByRole('button', { name: /^Sign In$/ })).toBeInTheDocument();
  });

  it('shows an explicit storage error instead of a demo fallback', async () => {
    auth.getLoginState.mockResolvedValue({ mode: 'live', status: 'storage-unavailable' });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/database is not available/i);
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();
  });

  it('switches to the create-administrator path when login reports no administrator', async () => {
    auth.login.mockResolvedValue({ success: false, reason: 'no-administrator', message: 'No administrator account exists yet.' });
    renderPage();
    await waitFor(() => expect(auth.getLoginState).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^Username$/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/ }));

    expect(await screen.findByRole('heading', { name: /Create administrator/i })).toBeInTheDocument();
  });
});
