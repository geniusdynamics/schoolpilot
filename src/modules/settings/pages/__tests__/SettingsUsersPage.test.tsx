// ABOUTME: The Users tab shows the school's first administrator as an active super administrator, not as a blank
// ABOUTME: row, and its two grids render without React warning about columns that share a key.

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const users = [
  // The first administrator, exactly as the setup wizard writes it.
  { id: 'u1', username: 'principal', email: 'principal@school.test', role: 'super_admin', role_id: 'super_admin', is_active: true },
  { id: 'u2', username: 'ann', email: 'ann@school.test', role_id: 'r-teacher', is_active: false },
];
const roles = [{ id: 'r-teacher', name: 'Teacher', description: 'Teaches', created_at: '', updated_at: '' }];

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    users,
    roles,
    loading: { users: false, roles: false },
    addRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    refreshCollection: vi.fn(),
  }),
}));

vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getCollection: vi.fn(() => null) },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

vi.mock('@/data/canonicalRepository', () => ({ openCanonicalRepository: vi.fn() }));
vi.mock('@/data/canonicalIdentity', () => ({ ensureCanonicalUser: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { SettingsUsersContent } from '../SettingsUsersPage';

describe('the Users tab', () => {
  let errors: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errors.mockRestore();
  });

  it('shows the first administrator as an active super administrator', () => {
    render(<SettingsUsersContent />);

    const row = screen.getByText('principal').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Super admin')).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Active')).toBeTruthy();
  });

  it('shows the name of the role a login points at, and a login that cannot sign in as inactive', () => {
    render(<SettingsUsersContent />);

    const row = screen.getByText('ann').closest('tr');
    expect(within(row as HTMLElement).getByText('Teacher')).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Inactive')).toBeTruthy();
  });

  it('renders both grids without a duplicate-key warning', () => {
    render(<SettingsUsersContent />);

    const duplicateKeyWarnings = errors.mock.calls.filter((call) => /same key/i.test(String(call[0])));
    expect(duplicateKeyWarnings).toEqual([]);
  });
});
